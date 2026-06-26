export type Phase = 'LOBBY' | 'ROLE_REVEAL' | 'ROUND_START' | 'PLAYING' | 'VOTING' | 'REVEAL';

export type PlayerInfo = {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
};

export type Settings = {
  turnTimerEnabled: boolean;
  turnTimerSeconds: number;
  voteTimerSeconds: number;
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
