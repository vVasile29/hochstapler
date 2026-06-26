# Hochstapler

A real-time multiplayer party game in the style of *The Chameleon* / *Fibbing It*. Players sit together in the same room; the app handles role assignment, turn order, voting, and the big reveal — all through your phones.

## How to Play

1. One player creates a room on their laptop and shares the 4-letter code.
2. Everyone else joins from their phones.
3. All players see their role: everyone except one secret **Hochstapler** (impostor) gets the same secret word.
4. Over 3 rounds, each player takes turns saying a word related to the secret word — the Hochstapler must bluff without knowing it.
5. After round 3, everyone votes for who they think the Hochstapler is.
6. The Hochstapler is caught if they get the most votes **and** there's a single top vote-getter. Ties always favor the Hochstapler.

## Quick Start (Development)

```bash
# Terminal 1 — Server
cd server && npm install && npm run dev

# Terminal 2 — Client
cd client && npm install && npm run dev -- --host
```

- Laptop: `http://localhost:5173`
- Phones on the same network: `http://<laptop-ip>:5173`

## Production (Docker)

Build and run as a single container that serves the app and WebSocket on one port:

```bash
docker build -t hochstapler:latest .
docker run -d -p 9999:9999 --restart unless-stopped --name hochstapler hochstapler:latest
```

Then point your reverse proxy at `http://<host>:9999`.

## Project Structure

```
server/              Node.js + Socket.IO backend (port 9999)
  index.ts           Express server with static file serving
  src/
    types.ts         Shared TypeScript types
    rooms.ts         Room creation, code generation, player management
    gameLogic.ts     Word selection, role assignment, vote tallying
    socketHandlers.ts  All WebSocket event handlers
    data/words.json  150-entry word list
client/              React + Vite frontend
  src/
    App.tsx          Phase-based screen router
    socket.ts        Socket.IO client helper (auto-detects server)
    screens/         Home, Lobby, RoleReveal, RoundStart, Playing, Voting, Reveal
Dockerfile           Multi-stage build (client → server → production image)
```

## Tech Stack

- **Backend:** Node.js, Socket.IO, Express, TypeScript
- **Frontend:** React, Vite, TypeScript, Socket.IO Client
- **Deployment:** Docker, multi-stage build, single-port deployment

## Player Count

3–10 players. Works best with 4+.
