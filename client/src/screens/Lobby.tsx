import { useState } from 'react';
import type { PlayerInfo, Settings } from '../types';

interface LobbyProps {
  roomCode: string;
  hostId: string;
  myId: string;
  players: PlayerInfo[];
  settings: Settings;
  phase: string;
  onToggleReady: () => void;
  onStartGame: () => void;
  onKickPlayer: (playerId: string) => void;
  onUpdateSettings: (s: Partial<Settings>) => void;
  onLeaveRoom: () => void;
}

export default function Lobby({
  roomCode,
  hostId,
  myId,
  players,
  settings,
  phase,
  onToggleReady,
  onStartGame,
  onKickPlayer,
  onUpdateSettings,
  onLeaveRoom,
}: LobbyProps) {
  const isHost = myId === hostId;
  const me = players.find((p) => p.id === myId);
  const allReady = players.every((p) => !p.connected || p.ready);
  const connectedCount = players.filter((p) => p.connected).length;
  const canStart = isHost && phase === 'LOBBY' && connectedCount >= 3 && allReady;
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="screen">
      <h2>Lobby</h2>
      <div className="room-code">{roomCode}</div>
      <p className="center-text" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        Share this code with other players
      </p>

      {connectedCount < 4 && (
        <p className="center-text" style={{ color: 'var(--yellow)', fontSize: '0.85rem' }}>
          Works best with 4+ players
        </p>
      )}

      <div className="player-list">
        {players.map((p) => (
          <div className="player-row" key={p.id}>
            <span className="name">
              {p.name}
              {!p.connected && <span style={{ color: 'var(--red)', marginLeft: 8 }}>(disconnected)</span>}
            </span>
            {p.id === hostId && <span className="badge host">Host</span>}
            {p.connected && p.ready && <span className="badge ready">Ready</span>}
            {p.connected && !p.ready && <span className="badge">Waiting</span>}
            {!p.connected && <span className="badge disconnected">Offline</span>}
            {isHost && p.id !== myId && phase === 'LOBBY' && (
              <button className="btn-small btn-secondary" onClick={() => onKickPlayer(p.id)}>
                Kick
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        className={me?.ready ? 'btn-secondary' : 'btn-success'}
        onClick={onToggleReady}
        disabled={phase !== 'LOBBY'}
      >
        {me?.ready ? 'Not Ready' : 'Ready'}
      </button>

      {isHost && (
        <>
          <button className="btn-primary" onClick={onStartGame} disabled={!canStart}>
            Start Game
          </button>
          <button className="btn-small btn-secondary" onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? 'Hide Settings' : 'Settings'}
          </button>
          {showSettings && (
            <div className="card">
              <h3>Settings</h3>
              <div className="settings-row">
                <label>Turn Timer</label>
                <div
                  className={`toggle ${settings.turnTimerEnabled ? 'active' : ''}`}
                  onClick={() => onUpdateSettings({ turnTimerEnabled: !settings.turnTimerEnabled })}
                />
              </div>
              {settings.turnTimerEnabled && (
                <div className="settings-row">
                  <label>Turn Time (s)</label>
                  <input
                    type="number"
                    min={15}
                    max={120}
                    value={settings.turnTimerSeconds}
                    onChange={(e) => onUpdateSettings({ turnTimerSeconds: Math.max(15, Math.min(120, parseInt(e.target.value) || 45)) })}
                    style={{ width: 80 }}
                  />
                </div>
              )}
              <div className="settings-row">
                <label>Vote Time (s)</label>
                <input
                  type="number"
                  min={20}
                  max={180}
                  value={settings.voteTimerSeconds}
                  onChange={(e) => onUpdateSettings({ voteTimerSeconds: Math.max(20, Math.min(180, parseInt(e.target.value) || 60)) })}
                  style={{ width: 80 }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {!isHost && (
        <p className="center-text" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Waiting for host to start the game...
        </p>
      )}

      <button className="btn-small btn-secondary" onClick={onLeaveRoom} style={{ marginTop: 8 }}>
        Leave Room
      </button>
    </div>
  );
}
