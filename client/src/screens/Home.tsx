import { useState } from 'react';

interface HomeProps {
  onJoin: (roomCode: string, playerName: string) => void;
  onCreate: (playerName: string) => void;
  error: string | null;
}

export default function Home({ onJoin, onCreate, error }: HomeProps) {
  const [view, setView] = useState<'menu' | 'create' | 'join'>('menu');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleCreate() {
    if (!name.trim()) return;
    setSubmitting(true);
    onCreate(name.trim());
  }

  function handleJoin() {
    if (!name.trim() || !code.trim()) return;
    setSubmitting(true);
    onJoin(code.trim().toUpperCase(), name.trim());
  }

  if (view === 'create') {
    return (
      <div className="screen">
        <h1>Hochstapler</h1>
        <div className="card">
          <h2>Create Game</h2>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button className="btn-primary" onClick={handleCreate} disabled={submitting || !name.trim()}>
            {submitting ? 'Creating...' : 'Create Room'}
          </button>
          <button className="btn-secondary" onClick={() => setView('menu')}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="screen">
        <h1>Hochstapler</h1>
        <div className="card">
          <h2>Join Game</h2>
          <input
            type="text"
            placeholder="Room code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
            maxLength={4}
            autoFocus
          />
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
          />
          <button className="btn-primary" onClick={handleJoin} disabled={submitting || !name.trim() || code.length < 4}>
            {submitting ? 'Joining...' : 'Join Room'}
          </button>
          <button className="btn-secondary" onClick={() => setView('menu')}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1>Hochstapler</h1>
      <p className="center-text" style={{ color: 'var(--text-dim)' }}>
        The Impostor Word Game
      </p>
      {error && <div className="error-banner">{error}</div>}
      <div className="card">
        <button className="btn-primary" onClick={() => setView('create')}>
          Create Game
        </button>
        <button className="btn-secondary" onClick={() => setView('join')}>
          Join Game
        </button>
      </div>
    </div>
  );
}
