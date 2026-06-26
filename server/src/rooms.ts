import { Room, Player, Settings, Phase } from './types.js';

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function createRoom(playerName: string, socketId: string): Room {
  const code = generateRoomCode();
  const playerId = crypto.randomUUID();
  const player: Player = {
    id: playerId,
    name: playerName,
    socketId,
    connected: true,
    ready: false,
  };
  const room: Room = {
    code,
    hostId: playerId,
    players: new Map([[playerId, player]]),
    phase: 'LOBBY',
    settings: {
      turnTimerEnabled: false,
      turnTimerSeconds: 45,
      voteTimerSeconds: 60,
    },
    game: null,
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

function getRoomBySocketId(socketId: string): { room: Room; player: Player } | null {
  for (const room of rooms.values()) {
    for (const player of room.players.values()) {
      if (player.socketId === socketId) {
        return { room, player };
      }
    }
  }
  return null;
}

function addPlayer(room: Room, playerName: string, socketId: string): Player | null {
  if (room.phase !== 'LOBBY') return null;
  if (room.players.size >= 10) return null;
  for (const p of room.players.values()) {
    if (p.name.toLowerCase() === playerName.toLowerCase() && p.connected) return null;
  }
  const playerId = crypto.randomUUID();
  const player: Player = {
    id: playerId,
    name: playerName,
    socketId,
    connected: true,
    ready: false,
  };
  room.players.set(playerId, player);
  return player;
}

function removePlayer(room: Room, playerId: string): void {
  room.players.delete(playerId);
  if (room.hostId === playerId && room.players.size > 0) {
    const nextHost = room.players.values().next().value;
    if (nextHost) room.hostId = nextHost.id;
  }
}

function transferHostIfNeeded(room: Room): void {
  if (room.hostId && room.players.has(room.hostId)) {
    if (room.players.get(room.hostId)!.connected) return;
  }
  for (const player of room.players.values()) {
    if (player.connected) {
      room.hostId = player.id;
      return;
    }
  }
}

function destroyRoom(code: string): void {
  rooms.delete(code);
}

function getRoomUpdatePayload(room: Room) {
  const connectedPlayers = Array.from(room.players.values()).filter((p) => p.connected);
  return {
    roomCode: room.code,
    hostId: room.hostId,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      connected: p.connected,
    })),
    settings: { ...room.settings },
    phase: room.phase,
    acknowledgedCount: room.game ? room.game.acknowledgedIds.size : 0,
    totalConnected: connectedPlayers.length,
  };
}

function updateSettings(room: Room, partial: Partial<Settings>): void {
  if (partial.turnTimerEnabled !== undefined) room.settings.turnTimerEnabled = partial.turnTimerEnabled;
  if (partial.turnTimerSeconds !== undefined) room.settings.turnTimerSeconds = partial.turnTimerSeconds;
  if (partial.voteTimerSeconds !== undefined) room.settings.voteTimerSeconds = partial.voteTimerSeconds;
}

export {
  rooms,
  createRoom,
  getRoom,
  getRoomBySocketId,
  addPlayer,
  removePlayer,
  transferHostIfNeeded,
  destroyRoom,
  getRoomUpdatePayload,
  updateSettings,
};
