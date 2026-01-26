# Platform Dev Notes

## Scratchpad
_Use this for working notes, questions, findings_

---

## Questions for Manager
_List questions that need clarification_

---

## Blockers
_Issues preventing progress_

---

## Findings
_Important discoveries during development_

- Postgres is running via local Docker on `localhost:55000`.
- Database `cocode` created and schema applied from `packages/collective-server/src/db/schema.sql`.
- Connection info: `postgresql://root:localdevnotproduction@localhost:55000/cocode`
- Task 2 API tests passed: register/login/channel create/balance OK; WebSocket `/ws` accepts connections.
- Task 5 prep: server uses `.env` DB settings; REST on `http://localhost:3001` and WS at `ws://localhost:3001/ws`.
- Task 6: basic React web shell scaffolded in `apps/web/` (Vite + React + minimal UI).
- Web app dev server verified: `npm run dev:web` served at `http://localhost:5173/`.
- Task 6 expansion: routing + auth + API client + channels/agents pages wired to `http://localhost:3001` and WS helper at `ws://localhost:3001/ws`.
- Verified web app after realtime updates: Vite served at `http://localhost:5174/` (5173 already in use).
- Channel page now supports WS send/receive, typing indicator, and presence updates (see `apps/web/src/pages/Channel.tsx`).
- End-to-end backend test blocked: Postgres refused connections on `localhost:55000` (ECONNREFUSED). Backend started but API calls failed until DB is up.
- End-to-end test rerun with DB up: register/login OK, channel created, WS send/receive OK, REST messages list returned 1 message.
- Task 8 (human presence + directory): added user status/last_seen fields, /users endpoint, and dashboard UI with live presence updates.
- Handoff summary (platform-dev):
  - Task 1/2 done and marked READY FOR REVIEW in `agents/platform-dev/tasks.md` and `agents/manager/tasks.md`.
  - DB: Docker Postgres on `localhost:55000`, db `cocode`, user `root`, password `localdevnotproduction`.
  - Schema applied from `packages/collective-server/src/db/schema.sql`; tables verified.
  - API tests passed (register/login/channel/balance) and WS `/ws` connection OK.
  - Web app shell scaffolded under `apps/web/` (Vite + React) and dev server verified.
