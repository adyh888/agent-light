# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install
cd web && npm install && cd ..

# Start backend server (port 3777)
npm start

# Frontend dev server (port 5173, proxies API to backend)
cd web && npm run dev

# Build frontend for production
npm run web:build

# Start/stop via shell scripts
./start.sh
./stop.sh
```

## Architecture

This project is a Node.js server that bridges an HTTP/WebSocket API to a USB serial traffic light (CH341 chip), plus a Vue 3 web frontend for configuration.

**Backend** (`server/`):
- `index.js` — Express HTTP server + WebSocket server (`ws://localhost:3777/ws`). All state changes broadcast to connected WS clients via `broadcastState()`. Binds `stateManager.onStateChange` for watchdog-triggered broadcasts.
- `state-manager.js` — Singleton `StateManager`. Owns the current agent state (`idle/completed/waiting_for_user/thinking/busy/error`), state history (last 100), and a watchdog timer that auto-resets non-terminal states (`thinking/busy/waiting_for_user`) to `idle` after `config.watchdogTimeout` ms (default 3 min).
- `serial.js` — Singleton `LightController`. Wraps `serialport` to send 4-byte CH341 commands: `[0xA0, opCode, stateValue, checksum]`. Uses `sendAsync`+`drain` for sequencing (60ms gaps between commands to avoid CH341 buffer overflow). Supports light colors (red/yellow/green), modes (on/blink/off), buzzer, and marquee (cycling) mode.
- `config.js` — Reads/writes `config.json` at project root. Holds serial path, port, watchdog timeout, per-state light configs, and 3 presets (default/quiet/intense).

**Frontend** (`web/`): Vue 3 + Vite SPA. Connects to backend via WebSocket for real-time updates. Built output goes to `web/dist/` and is served as static files by the Express server.

## Key Design Points

- The serial protocol requires commands to be sequenced with 60ms delays; use `sendAsync()` + `await` rather than the fire-and-forget `send()` when order matters (see `applyState()` in `serial.js`).
- State config lives in `config.json` under `states.<stateName>` with fields: `light`, `lightMode` (`on/blink/off/marquee`), `buzzer`, `buzzerDuration`, `marqueeSpeed`, `marqueeDirection`.
- Watchdog only starts for non-terminal states; it clears when transitioning to `idle/completed/error`.
- The frontend dev server (`localhost:5173`) proxies `/api/*` and `/ws` to the backend (`localhost:3777`) via Vite config.
