export type PlayerId = string;

export type Player = {
  id: PlayerId;
  name: string;
  socketId: string;
  connected: boolean;
  ready: boolean;
};

export type Phase = 'LOBBY' | 'ROLE_REVEAL' | 'ROUND_START' | 'PLAYING' | 'VOTING' | 'REVEAL';

export type Settings = {
  turnTimerEnabled: boolean;
  turnTimerSeconds: number;
  voteTimerSeconds: number;
};

export type VoteTally = Record<string, number>;

export type GameResult = {
  hochstaplerId: string;
  hochstaplerName: string;
  secretWord: string;
  voteTally: VoteTally;
  accusedIds: string[];
  hochstaplerCaught: boolean;
  winner: 'PLAYERS' | 'HOCHSTAPLER';
};

export type GameState = {
  secretWord: string;
  hochstaplerId: string;
  turnOrder: string[];
  round: 1 | 2 | 3;
  currentTurnIndex: number;
  completedByRound: string[][];
  acknowledgedIds: Set<string>;
  votes: Map<string, string>;
};

export type Room = {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  phase: Phase;
  settings: Settings;
  game: GameState | null;
};

// Client -> Server events
export interface ClientEvents {
  create_room: { playerName: string };
  join_room: { roomCode: string; playerName: string };
  rejoin_room: { roomCode: string; playerId: string };
  toggle_ready: {};
  start_game: {};
  acknowledge_role: {};
  advance_turn: {};
  submit_vote: { votedPlayerId: string };
  play_again: {};
  kick_player: { playerId: string };
  update_settings: { turnTimerEnabled?: boolean; turnTimerSeconds?: number; voteTimerSeconds?: number };
}

// Server -> Client events
export type PlayerInfo = {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
};

export type RoomUpdatePayload = {
  roomCode: string;
  hostId: string;
  players: PlayerInfo[];
  settings: Settings;
  phase: Phase;
  acknowledgedCount?: number;
  totalConnected?: number;
};

export interface ServerEvents {
  room_update: (payload: RoomUpdatePayload) => void;
  error: (payload: { message: string }) => void;
  role_assigned: (payload: { role: 'PLAYER' | 'HOCHSTAPLER'; word?: string }) => void;
  round_start: (payload: { turnOrder: string[]; startingPlayerName: string }) => void;
  turn_update: (payload: {
    round: 1 | 2 | 3;
    currentPlayerId: string;
    completedThisRound: string[];
  }) => void;
  round_complete: (payload: { round: 1 | 2 | 3; completedThisRound: string[] }) => void;
  voting_start: (payload: { players: { id: string; name: string }[]; timeRemaining?: number }) => void;
  vote_progress: (payload: { votesIn: number; totalPlayers: number }) => void;
  game_result: (payload: GameResult) => void;
  returned_to_lobby: (payload: {}) => void;
}
