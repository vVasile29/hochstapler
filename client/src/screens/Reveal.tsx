import type { GameResult, PlayerInfo } from '../types';

interface RevealProps {
  result: GameResult;
  myId: string;
  hostId: string;
  players: PlayerInfo[];
  onPlayAgain: () => void;
}

export default function Reveal({ result, myId, hostId, players, onPlayAgain }: RevealProps) {
  const isHost = myId === hostId;
  const playerMap = new Map(players.map((p) => [p.id, p.name]));
  const maxVotes = Math.max(...Object.values(result.voteTally), 0);

  return (
    <div className="screen">
      <div className={`winner-banner ${result.winner === 'PLAYERS' ? 'players' : 'hochstapler'}`}>
        {result.winner === 'PLAYERS'
          ? 'The Hochstapler was caught!'
          : 'The Hochstapler got away with it!'}
      </div>

      <div className="card reveal-player">
        <p style={{ color: 'var(--text-dim)' }}>The Hochstapler was</p>
        <p className="hochstapler-name">{result.hochstaplerName}</p>
        <p style={{ color: 'var(--text-dim)', marginTop: 16 }}>The secret word was</p>
        <p className="secret-word-reveal">{result.secretWord}</p>
      </div>

      <div className="card">
        <h3>Vote Tally</h3>
        <div className="vote-tally">
          {Object.entries(result.voteTally).map(([pid, count]) => {
            const pct = maxVotes > 0 ? (count / maxVotes) * 100 : 0;
            return (
              <div className="tally-row" key={pid}>
                <span className="tally-name">
                  {playerMap.get(pid) || 'Unknown'}
                  {result.accusedIds.includes(pid) && <span style={{ color: 'var(--red)', marginLeft: 4 }}>⬅</span>}
                </span>
                <div className="tally-bar">
                  <div className="tally-fill" style={{ width: `${Math.max(pct, 5)}%` }} />
                </div>
                <span className="tally-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {isHost && (
        <button className="btn-primary" onClick={onPlayAgain}>
          Play Again
        </button>
      )}
      {!isHost && (
        <p className="center-text" style={{ color: 'var(--text-dim)' }}>
          Waiting for host to start a new game...
        </p>
      )}
    </div>
  );
}
