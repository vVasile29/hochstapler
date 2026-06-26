import { useState, useEffect, useCallback, useRef } from 'react';
import { connectSocket, getSocket } from './socket';
import type { Phase, PlayerInfo, Settings, GameResult } from './types';
import Home from './screens/Home';
import Lobby from './screens/Lobby';
import RoleReveal from './screens/RoleReveal';
import RoundStart from './screens/RoundStart';
import Playing from './screens/Playing';
import Voting from './screens/Voting';
import Reveal from './screens/Reveal';

type Screen =
  | { name: 'HOME' }
  | { name: 'LOBBY' }
  | { name: 'ROLE_REVEAL' }
  | { name: 'ROUND_START' }
  | { name: 'PLAYING' }
  | { name: 'VOTING' }
  | { name: 'REVEAL' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'HOME' });
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [settings, setSettings] = useState<Settings>({
    turnTimerEnabled: false,
    turnTimerSeconds: 45,
    voteTimerSeconds: 60,
  });

  const [role, setRole] = useState<'PLAYER' | 'HOCHSTAPLER' | null>(null);
  const [secretWord, setSecretWord] = useState<string | undefined>();

  const [startingPlayerName, setStartingPlayerName] = useState('');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [completedThisRound, setCompletedThisRound] = useState<string[]>([]);

  const [votingPlayers, setVotingPlayers] = useState<{ id: string; name: string }[]>([]);
  const [votesIn, setVotesIn] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);

  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [acknowledgedCount, setAcknowledgedCount] = useState(0);
  const [totalConnected, setTotalConnected] = useState(0);

  const hasRejoined = useRef(false);

  useEffect(() => {
    const socket = connectSocket();

    socket.on('room_update', (payload: any) => {
      setRoomCode(payload.roomCode);
      setHostId(payload.hostId);
      setPlayers(payload.players);
      setSettings(payload.settings);
      if (payload.acknowledgedCount !== undefined) setAcknowledgedCount(payload.acknowledgedCount);
      if (payload.totalConnected !== undefined) setTotalConnected(payload.totalConnected);

      switch (payload.phase) {
        case 'LOBBY':
          setScreen({ name: 'LOBBY' });
          setRole(null);
          setSecretWord(undefined);
          setGameResult(null);
          break;
        case 'ROLE_REVEAL':
          setScreen({ name: 'ROLE_REVEAL' });
          break;
        case 'ROUND_START':
          setScreen({ name: 'ROUND_START' });
          break;
        case 'PLAYING':
          setScreen({ name: 'PLAYING' });
          break;
        case 'VOTING':
          setScreen({ name: 'VOTING' });
          break;
        case 'REVEAL':
          setScreen({ name: 'REVEAL' });
          break;
      }
    });

    socket.on('error', (payload: { message: string }) => {
      setError(payload.message);
    });

    socket.on('role_assigned', (payload: any) => {
      setRole(payload.role);
      setSecretWord(payload.word);
    });

    socket.on('round_start', (payload: any) => {
      setTurnOrder(payload.turnOrder);
      setStartingPlayerName(payload.startingPlayerName);
    });

    socket.on('turn_update', (payload: any) => {
      setCurrentRound(payload.round);
      setCurrentPlayerId(payload.currentPlayerId);
      setCompletedThisRound(payload.completedThisRound || []);
    });

    socket.on('round_complete', (payload: any) => {
      setCompletedThisRound(payload.completedThisRound || []);
    });

    socket.on('voting_start', (payload: any) => {
      setVotingPlayers(payload.players);
      setTotalVoters(payload.players.length);
      setVotesIn(0);
    });

    socket.on('vote_progress', (payload: any) => {
      setVotesIn(payload.votesIn);
    });

    socket.on('game_result', (payload: any) => {
      setGameResult(payload);
    });

    socket.on('returned_to_lobby', () => {
      setGameResult(null);
      setRole(null);
      setSecretWord(undefined);
    });

    socket.on('left_room', () => {
      goHome();
    });

    socket.on('room_closed', () => {
      goHome();
    });

    socket.on('connect', () => {
      const stored = localStorage.getItem('hochstapler_session');
      if (stored && !hasRejoined.current) {
        try {
          const { playerId, roomCode: storedCode } = JSON.parse(stored);
          if (playerId && storedCode) {
            hasRejoined.current = true;
            socket.emit('rejoin_room', { roomCode: storedCode, playerId });
          }
        } catch {}
      }
    });

    return () => {
      socket.off('room_update');
      socket.off('error');
      socket.off('role_assigned');
      socket.off('round_start');
      socket.off('turn_update');
      socket.off('round_complete');
      socket.off('voting_start');
      socket.off('vote_progress');
      socket.off('game_result');
      socket.off('returned_to_lobby');
      socket.off('left_room');
      socket.off('room_closed');
    };
  }, []);

  function goHome() {
    setScreen({ name: 'HOME' });
    setMyId(null);
    setHostId('');
    setRoomCode('');
    setPlayers([]);
    setRole(null);
    setSecretWord(undefined);
    setGameResult(null);
    setError(null);
    localStorage.removeItem('hochstapler_session');
  }

  const handleEmit = useCallback((event: string, data?: any) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit(event, data);
    }
  }, []);

  const handleLeaveRoom = useCallback(() => {
    handleEmit('leave_room');
    goHome();
  }, [handleEmit]);

  const handleCreate = useCallback((playerName: string) => {
    setError(null);
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('create_room', { playerName });
    socket.once('room_update', (payload: any) => {
      setMyId(payload.hostId);
      localStorage.setItem('hochstapler_session', JSON.stringify({ playerId: payload.hostId, roomCode: payload.roomCode }));
    });
  }, []);

  const handleJoin = useCallback((roomCode: string, playerName: string) => {
    setError(null);
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('join_room', { roomCode, playerName });
    socket.once('room_update', (payload: any) => {
      const joinedPlayer = payload.players.find((p: PlayerInfo) => p.name === playerName);
      if (joinedPlayer) {
        setMyId(joinedPlayer.id);
        localStorage.setItem('hochstapler_session', JSON.stringify({ playerId: joinedPlayer.id, roomCode: payload.roomCode }));
      }
    });
    socket.once('error', (payload: any) => {
      setError(payload.message);
    });
  }, []);

  if (screen.name === 'HOME') {
    return (
      <div className="app">
        <Home onJoin={handleJoin} onCreate={handleCreate} error={error} />
      </div>
    );
  }

  if (screen.name === 'LOBBY') {
    return (
      <div className="app">
        <Lobby
          roomCode={roomCode}
          hostId={hostId}
          myId={myId || ''}
          players={players}
          settings={settings}
          phase="LOBBY"
          onToggleReady={() => handleEmit('toggle_ready')}
          onStartGame={() => handleEmit('start_game')}
          onKickPlayer={(pid) => handleEmit('kick_player', { playerId: pid })}
          onUpdateSettings={(s) => handleEmit('update_settings', s)}
          onLeaveRoom={handleLeaveRoom}
        />
      </div>
    );
  }

  if (screen.name === 'ROLE_REVEAL') {
    return (
      <div className="app">
        <RoleReveal
          role={role || 'PLAYER'}
          word={secretWord}
          acknowledgedIds={acknowledgedCount}
          totalPlayers={totalConnected}
          onAcknowledge={() => handleEmit('acknowledge_role')}
        />
      </div>
    );
  }

  if (screen.name === 'ROUND_START') {
    return (
      <div className="app">
        <RoundStart startingPlayerName={startingPlayerName} round={currentRound} />
      </div>
    );
  }

  if (screen.name === 'PLAYING') {
    return (
      <div className="app">
        <Playing
          round={currentRound}
          currentPlayerId={currentPlayerId}
          myId={myId || ''}
          turnOrder={turnOrder}
          players={players}
          completedThisRound={completedThisRound}
          onAdvanceTurn={() => handleEmit('advance_turn')}
        />
      </div>
    );
  }

  if (screen.name === 'VOTING') {
    return (
      <div className="app">
        <Voting
          myId={myId || ''}
          players={votingPlayers}
          votesIn={votesIn}
          totalPlayers={totalVoters}
          timeRemaining={undefined}
          onSubmitVote={(votedPlayerId) => handleEmit('submit_vote', { votedPlayerId })}
        />
      </div>
    );
  }

  if (screen.name === 'REVEAL' && gameResult) {
    return (
      <div className="app">
        <Reveal
          result={gameResult}
          myId={myId || ''}
          hostId={hostId}
          players={players}
          onPlayAgain={() => handleEmit('play_again')}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="screen">
        <p className="center-text">Loading...</p>
      </div>
    </div>
  );
}
