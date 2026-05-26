# Property Blitz

A real-time multiplayer card game inspired by Monopoly Deal. Collect 3 complete property sets and bank £10M to win. Play action cards, charge rent, and block your opponents with **Just Say No**.

**Live:** [property-blitz.vercel.app](https://property-blitz.vercel.app)

---

## Gameplay

- 2–5 players join a room using a shared code
- Each turn: draw 2 cards, then play up to 3
- Cards can be played as **money** (banked), **properties** (on the table), or **actions** (targeting opponents)
- First player to complete **3 full property sets** and have **≥ £10M banked** wins

### Action cards
| Card | Effect |
|---|---|
| Rent | Charge all opponents (or one) rent on a colour set |
| Deal Breaker | Steal a complete property set |
| Sly Deal | Steal a single property from an incomplete set |
| Forced Deal | Swap one of your properties for an opponent's |
| Debt Collector | Demand £5M from one player |
| It's My Birthday | Demand £2M from every player |
| Just Say No | Cancel any action targeting you (can be countered) |
| Double the Rent | Double the value of the next rent card played |
| House / Hotel | Add to a complete set to boost rent |
| Pass Go | Draw 2 extra cards |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, Socket.IO |
| Deployment | Vercel (client), Railway (server) |

---

## Project structure

```
property_blitz/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── components/   # Board, Hand, Card, Lobby, modals
│   │   ├── hooks/        # useGameState, useSocket
│   │   └── utils/        # cardHelpers
│   └── vite.config.js
└── server/          # Express + Socket.IO backend
    ├── game/
    │   ├── deck.js        # Card definitions & rent tables
    │   ├── state.js       # Room & player state management
    │   ├── actions.js     # Card play logic
    │   └── rules.js       # Win condition, set completion, payable cards
    ├── index.js           # Socket event handlers
    └── railway.toml
```

---

## Local development

**Prerequisites:** Node.js 18+

```bash
# Start the backend
cd server
npm install
npm run dev        # runs on http://localhost:3001

# Start the frontend (new terminal)
cd client
npm install
npm run dev        # runs on http://localhost:5173
```

The Vite dev server proxies `/socket.io` to `localhost:3001` automatically — no env vars needed locally.

---

## Deployment

### Railway (backend)

1. Connect the repo to Railway
2. In the service settings, set **Root Directory** to `server`
3. Railway uses `server/railway.toml` — no further config needed
4. Note your Railway public URL (e.g. `https://yourapp-production.up.railway.app`)

### Vercel (frontend)

1. Connect the repo to Vercel
2. Set **Root Directory** to `client`
3. Add environment variable:
   ```
   VITE_SERVER_URL=https://yourapp-production.up.railway.app
   ```
4. Deploy — Vite bakes the URL into the bundle at build time

> **Note:** `VITE_SERVER_URL` must be set *before* the build runs. Changing it requires a fresh redeploy.
