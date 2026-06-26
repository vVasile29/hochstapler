import { Server, Socket } from 'socket.io';
import {
  createRoom,
  getRoom,
  getRoomBySocketId,
  addPlayer,
  removePlayer,
  transferHostIfNeeded,
  destroyRoom,
  getRoomUpdatePayload,
  updateSettings,
} from './rooms.js';
import {
  pickRandomWord,
  pickHochstapler,
  determineTurnOrder,
  advanceTurn,
  tallyVotes,
  resetGame,
} from './gameLogic.js';

const voteTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function registerHandlers(io: Server, socket: Socket): void {
  socket.on('create_room', ({ playerName }) => {
    if (!playerName || playerName.trim().length === 0) {
      socket.emit('error', { message: 'Name is required.' });
      return;
    }
    const trimmed = playerName.trim().slice(0, 20);
    const room = createRoom(trimmed, socket.id);
    socket.join(room.code);
    socket.data.playerId = room.hostId;
    socket.data.roomCode = room.code;
    socket.emit('room_update', getRoomUpdatePayload(room));
  });

  socket.on('join_room', ({ roomCode, playerName }) => {
    if (!roomCode || !playerName || playerName.trim().length === 0) {
      socket.emit('error', { message: 'Room code and name are required.' });
      return;
    }
    const code = roomCode.toUpperCase().trim();
    const room = getRoom(code);
    if (!room) {
      socket.emit('error', { message: 'Room not found.' });
      return;
    }
    if (room.phase !== 'LOBBY') {
      socket.emit('error', { message: 'Game already in progress.' });
      return;
    }
    const trimmed = playerName.trim().slice(0, 20);
    const player = addPlayer(room, trimmed, socket.id);
    if (!player) {
      const nameTaken = Array.from(room.players.values()).some(
        (p) => p.name.toLowerCase() === trimmed.toLowerCase() && p.connected
      );
      if (nameTaken) {
        socket.emit('error', { message: 'Name already taken in this room.' });
      } else {
        socket.emit('error', { message: 'Room is full (max 10 players).' });
      }
      return;
    }
    socket.join(room.code);
    socket.data.playerId = player.id;
    socket.data.roomCode = room.code;
    socket.emit('room_update', getRoomUpdatePayload(room));
    socket.to(room.code).emit('room_update', getRoomUpdatePayload(room));
  });

  socket.on('rejoin_room', ({ roomCode, playerId }) => {
    const room = getRoom(roomCode?.toUpperCase().trim());
    if (!room) {
      socket.emit('error', { message: 'Room not found.' });
      return;
    }
    const player = room.players.get(playerId);
    if (!player) {
      socket.emit('error', { message: 'Player not found in this room.' });
      return;
    }
    player.socketId = socket.id;
    player.connected = true;
    socket.join(room.code);
    socket.data.playerId = player.id;
    socket.data.roomCode = room.code;

    socket.emit('room_update', getRoomUpdatePayload(room));
    socket.to(room.code).emit('room_update', getRoomUpdatePayload(room));

    if (room.phase === 'ROLE_REVEAL' && room.game) {
      const isHoch = room.game.hochstaplerId === player.id;
      socket.emit('role_assigned', {
        role: isHoch ? 'HOCHSTAPLER' : 'PLAYER',
        word: isHoch ? undefined : room.game.secretWord,
      });
    }
  });

  socket.on('toggle_ready', () => {
    const ctx = getRoomBySocketId(socket.id);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== 'LOBBY') return;
    player.ready = !player.ready;
    io.to(room.code).emit('room_update', getRoomUpdatePayload(room));
  });

  socket.on('start_game', () => {
    const ctx = getRoomBySocketId(socket.id);
    if (!ctx) return;
    const { room } = ctx;
    if (room.hostId !== socket.data.playerId) {
      socket.emit('error', { message: 'Only the host can start the game.' });
      return;
    }
    if (room.phase !== 'LOBBY') return;

    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.connected);
    if (connectedPlayers.length < 3) {
      socket.emit('error', { message: 'At least 3 players are required to start.' });
      return;
    }
    if (!connectedPlayers.every((p) => p.ready)) {
      socket.emit('error', { message: 'All players must be ready.' });
      return;
    }

    const secretWord = pickRandomWord();
    const hochstaplerId = pickHochstapler(room);
    const turnOrder = determineTurnOrder(room);

    room.phase = 'ROLE_REVEAL';
    room.game = {
      secretWord,
      hochstaplerId,
      turnOrder,
      round: 1,
      currentTurnIndex: 0,
      completedByRound: [[], [], []],
      acknowledgedIds: new Set(),
      votes: new Map(),
    };

    io.to(room.code).emit('room_update', getRoomUpdatePayload(room));

    for (const player of room.players.values()) {
      if (player.connected) {
        const isHoch = player.id === hochstaplerId;
        io.to(player.socketId).emit('role_assigned', {
          role: isHoch ? 'HOCHSTAPLER' : 'PLAYER',
          word: isHoch ? undefined : secretWord,
        });
      }
    }
  });

  socket.on('acknowledge_role', () => {
    const ctx = getRoomBySocketId(socket.id);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== 'ROLE_REVEAL' || !room.game) return;

    room.game.acknowledgedIds.add(player.id);
    io.to(room.code).emit('room_update', getRoomUpdatePayload(room));

    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.connected);
    const allAcknowledged = connectedPlayers.every((p) => room.game!.acknowledgedIds.has(p.id));

    if (allAcknowledged) {
      room.phase = 'ROUND_START';
      io.to(room.code).emit('room_update', getRoomUpdatePayload(room));

      const startingPlayerId = room.game.turnOrder[0];
      const startingPlayer = room.players.get(startingPlayerId);
      io.to(room.code).emit('round_start', {
        turnOrder: room.game.turnOrder,
        startingPlayerName: startingPlayer?.name ?? 'Unknown',
      });

      setTimeout(() => {
        if (room.phase !== 'ROUND_START') return;
        room.phase = 'PLAYING';
        io.to(room.code).emit('room_update', getRoomUpdatePayload(room));
        broadcastTurnUpdate(io, room);
      }, 2500);
    }
  });

  socket.on('advance_turn', () => {
    const ctx = getRoomBySocketId(socket.id);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== 'PLAYING' || !room.game) return;

    const game = room.game;
    const currentPlayerId = game.turnOrder[game.currentTurnIndex];
    if (player.id !== currentPlayerId) {
      socket.emit('error', { message: 'It is not your turn.' });
      return;
    }

    const roundIndex = game.round - 1;
    game.completedByRound[roundIndex].push(player.id);

    broadcastTurnUpdate(io, room);

    const { roundComplete, gameOver } = advanceTurn(room);

    if (gameOver) {
      room.phase = 'VOTING';
      io.to(room.code).emit('room_update', getRoomUpdatePayload(room));
      io.to(room.code).emit('round_complete', {
        round: game.round,
        completedThisRound: game.completedByRound[roundIndex],
      });
      startVoting(io, room);
    } else if (roundComplete) {
      io.to(room.code).emit('round_complete', {
        round: game.round,
        completedThisRound: game.completedByRound[roundIndex],
      });
      room.phase = 'ROUND_START';
      io.to(room.code).emit('room_update', getRoomUpdatePayload(room));

      const startingPlayerId = game.turnOrder[0];
      const startingPlayer = room.players.get(startingPlayerId);
      io.to(room.code).emit('round_start', {
        turnOrder: game.turnOrder,
        startingPlayerName: startingPlayer?.name ?? 'Unknown',
      });

      setTimeout(() => {
        if (room.phase !== 'ROUND_START') return;
        room.phase = 'PLAYING';
        io.to(room.code).emit('room_update', getRoomUpdatePayload(room));
        broadcastTurnUpdate(io, room);
      }, 2500);
    } else {
      broadcastTurnUpdate(io, room);
    }
  });

  socket.on('submit_vote', ({ votedPlayerId }) => {
    const ctx = getRoomBySocketId(socket.id);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== 'VOTING' || !room.game) return;

    if (votedPlayerId === player.id) {
      socket.emit('error', { message: 'You cannot vote for yourself.' });
      return;
    }

    if (!room.players.has(votedPlayerId)) {
      socket.emit('error', { message: 'Invalid player.' });
      return;
    }

    if (room.game.votes.has(player.id)) return;

    room.game.votes.set(player.id, votedPlayerId);

    const totalPlayers = room.players.size;
    const votesIn = room.game.votes.size;
    io.to(room.code).emit('vote_progress', { votesIn, totalPlayers });

    if (votesIn >= totalPlayers) {
      finishVoting(io, room);
    }
  });

  socket.on('play_again', () => {
    const ctx = getRoomBySocketId(socket.id);
    if (!ctx) return;
    const { room } = ctx;
    if (room.hostId !== socket.data.playerId) {
      socket.emit('error', { message: 'Only the host can start a new game.' });
      return;
    }
    if (room.phase !== 'REVEAL') return;

    resetGame(room);
    io.to(room.code).emit('room_update', getRoomUpdatePayload(room));
    io.to(room.code).emit('returned_to_lobby', {});
  });

  socket.on('kick_player', ({ playerId }) => {
    const ctx = getRoomBySocketId(socket.id);
    if (!ctx) return;
    const { room } = ctx;
    if (room.hostId !== socket.data.playerId) {
      socket.emit('error', { message: 'Only the host can kick players.' });
      return;
    }
    if (room.phase !== 'LOBBY') {
      socket.emit('error', { message: 'Can only kick players in the lobby.' });
      return;
    }
    if (playerId === room.hostId) {
      socket.emit('error', { message: 'You cannot kick yourself.' });
      return;
    }

    const kicked = room.players.get(playerId);
    if (!kicked) return;

    removePlayer(room, playerId);
    io.to(room.code).emit('room_update', getRoomUpdatePayload(room));

    const kickedSocket = io.sockets.sockets.get(kicked.socketId);
    if (kickedSocket) {
      kickedSocket.leave(room.code);
      kickedSocket.emit('error', { message: 'You have been kicked from the room.' });
    }
  });

  socket.on('update_settings', (settings) => {
    const ctx = getRoomBySocketId(socket.id);
    if (!ctx) return;
    const { room } = ctx;
    if (room.hostId !== socket.data.playerId) {
      socket.emit('error', { message: 'Only the host can update settings.' });
      return;
    }
    if (room.phase !== 'LOBBY') {
      socket.emit('error', { message: 'Can only change settings in the lobby.' });
      return;
    }
    updateSettings(room, settings);
    io.to(room.code).emit('room_update', getRoomUpdatePayload(room));
  });

  socket.on('disconnect', () => {
    const ctx = getRoomBySocketId(socket.id);
    if (!ctx) return;
    const { room, player } = ctx;

    player.connected = false;
    io.to(room.code).emit('room_update', getRoomUpdatePayload(room));

    transferHostIfNeeded(room);
    io.to(room.code).emit('room_update', getRoomUpdatePayload(room));

    const hasConnected = Array.from(room.players.values()).some((p) => p.connected);
    if (!hasConnected) {
      setTimeout(() => {
        const stillHasConnected = Array.from(room.players.values()).some((p) => p.connected);
        if (!stillHasConnected) {
          destroyRoom(room.code);
        }
      }, 30000);
    }
  });
}

function broadcastTurnUpdate(io: Server, room: any): void {
  if (!room.game) return;
  const game = room.game;
  const roundIndex = game.round - 1;
  const currentPlayerId = game.turnOrder[game.currentTurnIndex];
  io.to(room.code).emit('turn_update', {
    round: game.round,
    currentPlayerId,
    completedThisRound: game.completedByRound[roundIndex],
  });
}

function startVoting(io: Server, room: any): void {
  if (!room.game) return;
  const playerList = Array.from(room.players.values())
    .filter((p: any) => p.connected)
    .map((p: any) => ({ id: p.id, name: p.name }));

  io.to(room.code).emit('voting_start', {
    players: playerList,
    timeRemaining: room.settings.voteTimerSeconds,
  });

  clearVoteTimer(room.code);
  const timer = setTimeout(() => {
    finishVoting(io, room);
  }, (room.settings.voteTimerSeconds || 60) * 1000);
  voteTimers.set(room.code, timer);
}

function clearVoteTimer(roomCode: string): void {
  const timer = voteTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    voteTimers.delete(roomCode);
  }
}

function finishVoting(io: Server, room: any): void {
  if (room.phase !== 'VOTING' || !room.game) return;
  clearVoteTimer(room.code);
  const result = tallyVotes(room);
  room.phase = 'REVEAL';
  io.to(room.code).emit('room_update', getRoomUpdatePayload(room));
  io.to(room.code).emit('game_result', result);
}
