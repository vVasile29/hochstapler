import { useState } from 'react';

interface RoleRevealProps {
  role: 'PLAYER' | 'HOCHSTAPLER';
  word?: string;
  acknowledgedIds: number;
  totalPlayers: number;
  onAcknowledge: () => void;
}

export default function RoleReveal({
  role,
  word,
  acknowledgedIds,
  totalPlayers,
  onAcknowledge,
}: RoleRevealProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  function handleAck() {
    setAcknowledged(true);
    onAcknowledge();
  }

  if (acknowledged) {
    return (
      <div className="screen">
        <div className="card role-card">
          <h2>Waiting for others</h2>
          <p style={{ fontSize: '2rem', fontWeight: 700, margin: '16px 0' }}>
            {acknowledgedIds}/{totalPlayers}
          </p>
          <p style={{ color: 'var(--text-dim)' }}>
            Don't let others see your screen!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="card role-card">
        <h2>{role === 'HOCHSTAPLER' ? 'You are the Hochstapler!' : 'Your Word'}</h2>
        {role === 'HOCHSTAPLER' ? (
          <p className="bluff-text">Try to fit in.</p>
        ) : (
          <p className="secret-word">{word}</p>
        )}
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '12px 0' }}>
          Don't let others see your screen!
        </p>
        <button className="btn-primary" onClick={handleAck}>
          I'm ready
        </button>
      </div>
    </div>
  );
}
