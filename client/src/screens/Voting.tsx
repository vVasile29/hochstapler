import { useState, useEffect } from 'react';

interface VotingProps {
  myId: string;
  players: { id: string; name: string }[];
  votesIn: number;
  totalPlayers: number;
  timeRemaining?: number;
  onSubmitVote: (playerId: string) => void;
}

export default function Voting({
  myId,
  players,
  votesIn,
  totalPlayers,
  timeRemaining,
  onSubmitVote,
}: VotingProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeRemaining);

  useEffect(() => {
    setTimeLeft(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    if (timeLeft === undefined || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev !== undefined ? Math.max(0, prev - 1) : undefined));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const others = players.filter((p) => p.id !== myId);

  function handleVote() {
    if (!selected) return;
    setConfirmed(true);
    onSubmitVote(selected);
  }

  if (confirmed) {
    return (
      <div className="screen">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <h2>Vote submitted</h2>
          <p style={{ fontSize: '2rem', fontWeight: 700, margin: '16px 0' }}>
            {votesIn}/{totalPlayers}
          </p>
          <p className="vote-progress">Waiting for others to vote...</p>
          {timeLeft !== undefined && timeLeft > 0 && (
            <div className="countdown">{timeLeft}s</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>Who is the Hochstapler?</h2>
      {timeLeft !== undefined && timeLeft > 0 && (
        <div className="countdown">{timeLeft}s</div>
      )}
      <div className="voting-grid">
        {others.map((p) => (
          <button
            key={p.id}
            className={`vote-btn ${selected === p.id ? 'selected' : ''}`}
            onClick={() => setSelected(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <button className="btn-primary" onClick={handleVote} disabled={!selected}>
        Confirm Vote
      </button>
    </div>
  );
}
