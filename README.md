# Anonymous Chat (Vue + TypeScript + WebSocket)

A tiny, no-auth, ephemeral chat. All clients connect to the same Node.js WebSocket backend.  
**Frontend:** Vue 3 + TypeScript (Vite).  
**Backend:** single `index.js` using `ws`.

> ⚠️ By design this project runs **without CORS** for simplicity. You can enable CORS later if you want (notes below).

---

## Features

- Realtime chat over WebSocket (no DB, memory-only).
- Typing indicators and message broadcast.
- Zero auth; messages vanish on server restart.

---

## Repo Layout (branches)

- **`main`** → frontend (Vue + TS)
- **`backend`** → Node.js WebSocket server

Clone once, then switch branches as needed.

```bash
git clone https://github.com/unkn0wndo3s/anonymous-chat anonymous-chat
cd anonymous-chat
```
## Requirements
- Node.js ≥ 22.19 LTS (recommended)
- npm (or yarn/pnpm if you prefer)
---
## TL;DR - Quick Start
# 1) Start the backend (WebSocket server)
```
# from the repo root
git checkout backend
npm install
node index.js
# server listens on 8080 by default
```
# 2) Run the frontend (dev)
```
# new terminal
git checkout main
npm install
npm run dev
# Vite dev server (usually http://localhost:5173)
```
Open the dev URL, test chatting in two tabs
---
## Backend -- Details
# Install & Run
```
git checkout backend
npm install
node index.js
```
# Production tip (optional)
Use PM2 to keep it alive:
```
npm i -g pm2
pm2 start index.js --name anon-chat-ws
pm2 logs anon-chat-ws
```
---
## Frontend - Details
# Dev
```
git checkout main
npm install
npm run dev
```
# Build
```
npm run build
# Output -> dist/
```
# Preview local build (optional)
```
npm run preview
```
---
## CORS (Optional)
- The WebSocket server uses `ws` and by default doesn’t enforce CORS (WS handshakes are different from typical XHR/fetch CORS).
- If you later add HTTP routes (REST) or want strict origins, add CORS middleware (e.g., `cors` package with Express) to your HTTP layer. For pure `ws`, restrict allowed origins manually in the upgrade handler.
---
## Scripts
# Frontend (`main` branch):
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — preview built app
# Backend (backend branch):
- `node index.js` — start server
- (optional) `pm2 start index.js` — manage with PM2
---
## Troubleshooting
- **Can’t connect to WS**
  Check server port, and browser console errors.
- **Port in use**
  Change PORT for backend or Vite’s dev port (npm run dev -- --port 5174).
- **Mixed content (HTTP vs HTTPS)**
  If your site is served over HTTPS, your WS must be WSS.
- **Nothing appears in Quick Start**
  Make sure you’re on the correct branch:
```
git branch
# switch if needed:
git checkout backend   # for server
git checkout main      # for frontend
```
## Notes
- Messages are in-memory only. Restarting the server or closing every client connected to it clears everything.
- No persistence by design. Keep it simple.
