import wordsData from './data/words.json' with { type: 'json' };
import { Room, Player, GameResult } from './types.js';

function pickRandomWord(): string {
  return wordsData[Math.floor(Math.random() * wordsData.length)];
}

function pickHochstapler(room: Room): string {
  const connectedPlayers = Array.from(room.players.values()).filter((p) => p.connected);
  return connectedPlayers[Math.floor(Math.random() * connectedPlayers.length)].id;
}

function determineTurnOrder(room: Room): string[] {
  const connectedPlayers = Array.from(room.players.values()).filter((p) => p.connected);
  const shuffled = [...connectedPlayers].sort(() => Math.random() - 0.5);
  return shuffled.map((p) => p.id);
}

function advanceTurn(room: Room): { roundComplete: boolean; gameOver: boolean } {
  const game = room.game!;
  game.currentTurnIndex++;

  const playersInTurnOrder = game.turnOrder.length;
  if (game.currentTurnIndex >= playersInTurnOrder) {
    game.currentTurnIndex = 0;
    if (game.round >= 3) {
      return { roundComplete: true, gameOver: true };
    }
    game.round = (game.round + 1) as 1 | 2 | 3;
    return { roundComplete: true, gameOver: false };
  }

  return { roundComplete: false, gameOver: false };
}

function tallyVotes(room: Room): GameResult {
  const game = room.game!;
  const tally: Record<string, number> = {};
  for (const pid of game.turnOrder) {
    tally[pid] = 0;
  }

  for (const votedId of game.votes.values()) {
    if (tally[votedId] !== undefined) {
      tally[votedId]++;
    }
  }

  const maxVotes = Math.max(...Object.values(tally), 0);
  const accusedIds = Object.entries(tally)
    .filter(([, count]) => count === maxVotes && count > 0)
    .map(([id]) => id);

  const genauEinerAngeklagt = accusedIds.length === 1;
  const istHochstapler = genauEinerAngeklagt && accusedIds[0] === game.hochstaplerId;
  const hochstaplerCaught = genauEinerAngeklagt && istHochstapler;

  const hochstaplerPlayer = room.players.get(game.hochstaplerId);

  return {
    hochstaplerId: game.hochstaplerId,
    hochstaplerName: hochstaplerPlayer?.name ?? 'Unknown',
    secretWord: game.secretWord,
    voteTally: tally,
    accusedIds,
    hochstaplerCaught,
    winner: hochstaplerCaught ? 'PLAYERS' : 'HOCHSTAPLER',
  };
}

function resetGame(room: Room): void {
  room.game = null;
  room.phase = 'LOBBY';
  for (const player of room.players.values()) {
    player.ready = false;
  }
}

export { pickRandomWord, pickHochstapler, determineTurnOrder, advanceTurn, tallyVotes, resetGame };
