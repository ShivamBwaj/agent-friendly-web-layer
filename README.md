# Agent-Friendly Web Layer

A benchmark, not a demo: how much does exposing a website's operations as structured, agent-native capabilities (a WebMCP-style layer) actually save an AI agent, compared to driving the same site through its rendered HTML?

## What's here

- **`server/`** — QuickBook, a small event-booking app with one shared backend (`store.js`) exposed two ways:
  - a classic server-rendered multi-page UI (`domRoutes.js` + `views/*.ejs`) — the DOM-agent's target
  - an agent-native capability layer (`capabilities/`) — a JSON manifest at `/api/manifest` plus one HTTP endpoint per operation (search, filter, compare, book, update, cancel)
- **`tasks/tasks.json`** — the 12-task benchmark suite: 7 base operations plus 5 error-recovery/edge-case tasks
- **`results/`** — raw per-task and per-request logs from an actual run in each mode
- **`RESULTS.md`** — the write-up: methodology, metrics, what drove the gap, and honest limitations
- **`docs/INTERVIEW_PREP.md`** — the design decisions behind this project, why each one was made, and how to talk about the metrics

## Run it

```bash
npm install
npm start
```

Then either browse `http://localhost:3000` (DOM mode) or call the capability layer directly, e.g.:

```bash
curl http://localhost:3000/api/manifest
curl "http://localhost:3000/api/capabilities/search?q=jazz"
```

`POST /api/_reset` resets state to the seed data between runs.

## The headline result

Same 12 tasks, same underlying app, same agent (me) driving both interfaces: **7.5 agent actions per task through the DOM UI vs. 1.3 through the agent-native API (5.6x fewer)**, and DOM interaction hit an **11.1% wasted-action rate** (render-timing races) that's structurally impossible over a JSON API. The 5 error-recovery tasks also surfaced two unplanned asymmetries — the DOM UI hides some invalid actions entirely (so the agent can't even attempt them), while the hand-built API layer had a real input-validation gap the UI didn't. Full breakdown, methodology, and caveats in [RESULTS.md](RESULTS.md).
