interface PlayingProps {
  round: number;
  currentPlayerId: string;
  myId: string;
  turnOrder: string[];
  players: { id: string; name: string }[];
  completedThisRound: string[];
  onAdvanceTurn: () => void;
}

export default function Playing({
  round,
  currentPlayerId,
  myId,
  turnOrder,
  players,
  completedThisRound,
  onAdvanceTurn,
}: PlayingProps) {
  const isMyTurn = currentPlayerId === myId;
  const playerMap = new Map(players.map((p) => [p.id, p.name]));
  const currentPlayerName = playerMap.get(currentPlayerId) || 'Unknown';
  const alreadySpoken = completedThisRound.includes(myId);

  return (
    <div className="screen playing">
      <div className="round-indicator">Round {round}/3</div>

      <div className="turn-order">
        {turnOrder.map((pid, i) => {
          const name = playerMap.get(pid) || '?';
          const isActive = pid === currentPlayerId;
          const isDone = completedThisRound.includes(pid);
          return (
            <span key={pid} className={`turn-chip ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
              {name}
            </span>
          );
        })}
      </div>

      {isMyTurn ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ fontSize: '1.2rem', marginBottom: 16 }}>It's your turn!</p>
          <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>
            Say a word related to your secret word.
          </p>
          {!alreadySpoken ? (
            <button className="btn-primary" onClick={onAdvanceTurn}>
              I've spoken
            </button>
          ) : (
            <p style={{ color: 'var(--text-dim)' }}>Waiting for others...</p>
          )}
        </div>
      ) : (
        <div className="waiting-turn">
          <p style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>
            {currentPlayerName}
          </p>
          <p style={{ color: 'var(--text-dim)' }}>is thinking of a word...</p>
        </div>
      )}
    </div>
  );
}
