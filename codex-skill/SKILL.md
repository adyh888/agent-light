---
name: agent-light
description: "MUST LOAD at the start of EVERY conversation and task. Control USB traffic light to reflect AI agent working state — set thinking when starting work, busy during long operations, completed when done, waiting_for_user when asking questions. Always execute these curl commands proactively at every state transition."
metadata:
  short-description: "USB traffic light status indicator for Codex"
---

# Agent Light - AI Agent Status Visualizer

> **⚠️ MANDATORY: This skill must be executed at every state transition in every conversation.**
>
> No matter what task the user gives you, you MUST:
> 1. **Immediately** when you start processing → run `thinking` curl
> 2. **When done** → run `completed` curl
> 3. **When asking the user a question** → run `waiting_for_user` curl
>
> This is NOT optional. The user relies on the light color to know your status.

Control a USB traffic light (CH341) to show your AI agent's current state via HTTP API.

## Prerequisites

- Agent Light server running at `http://localhost:3777`
- USB traffic light connected

## State Mapping

| Agent State | API state value | Light Effect |
|---|---|---|
| Start processing user request | `thinking` | Marquee (cycling lights) |
| Executing long operations (build/install) | `busy` | Red light |
| Task completed successfully | `completed` | Green light + buzzer |
| Need user input or decision | `waiting_for_user` | Yellow blink |
| Idle / conversation ended | `idle` | Light off |
| Error occurred | `error` | Red blink + buzzer |

## Trigger Rules (MUST FOLLOW)

### 1. Start Working → thinking

**When**: You receive a user request and start analyzing, searching, reading files, etc. **Immediately** run:

```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"thinking"}'
```

### 2. Long Operations → busy

**When**: You execute builds, install dependencies, or long-running commands:

```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"busy"}'
```

### 3. Task Complete → completed

**When**: You finish the user's request and are ready to present results:

```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"completed"}'
```

### 4. Need User Input → waiting_for_user

**When**: You ask the user a question, need confirmation, or need them to make a choice:

```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"waiting_for_user"}'
```

### 5. Error → error

**When**: An error occurs that prevents task completion:

```bash
curl -s -X POST http://localhost:3777/api/status -H "Content-Type: application/json" -d '{"state":"error"}'
```

### 6. Turn Off Light

**When**: The user asks to turn off the light:

```bash
curl -s -X POST http://localhost:3777/api/off
```

## Critical Rules (MUST FOLLOW)

1. **Run curl directly** — do NOT add `>/dev/null 2>&1` or `&` to the curl commands. Run them as-is so they execute reliably.
2. **One curl per state change** — don't chain curl with other commands using `;` or `&&`.
3. **Only call on state changes** — don't repeat the same state.
4. **Silently skip if server unavailable** — if curl returns empty or times out, continue working normally.
5. **Do NOT mention the light to the user** — this is background automation. The user sees the light directly.

## Helper Script

A convenience script is available at `scripts/al.sh`:

```bash
scripts/al.sh thinking    # Start thinking
scripts/al.sh busy        # Working hard
scripts/al.sh done        # Task completed
scripts/al.sh wait        # Waiting for user
scripts/al.sh error       # Error
scripts/al.sh idle        # Idle
scripts/al.sh off         # Turn off
scripts/al.sh status      # Check current status
```

## Check Service Status

```bash
curl -s --connect-timeout 2 http://localhost:3777/api/status
```

If empty or connection fails, the agent-light service is not running. Start it:

```bash
cd /path/to/agent-light && node server/index.js
```

## Web Panel

Visit `http://localhost:3777` to view real-time light status and customize per-state configurations.

## API Reference

| Endpoint | Method | Body | Description |
|---|---|---|---|
| `/api/status` | GET | - | Get current status |
| `/api/status` | POST | `{"state":"busy"}` | Set status |
| `/api/off` | POST | - | Turn off all lights |
| `/api/config` | GET | - | Get config |
| `/api/config` | PUT | `{...}` | Update config |
| `/api/ports` | GET | - | List serial ports |
| `/api/connect` | POST | `{"path":"/dev/ttyUSB0"}` | Connect to serial port |
