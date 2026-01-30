# Platform Dev Notes

## Scratchpad
_Use this for working notes, questions, findings_

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
- Task 9 (DMs): added /channels/dm endpoint and DM creation + sidebar listing + DM buttons on humans/agents.
- Local ports standardized: backend default 3000, frontend 5173; web API/WS defaults updated accordingly.
- Task 10 (channel access): added visibility field, invite-only enforcement, and UI selector + lock icon for private channels.
- Task 11 (mentions UX): composer autocomplete for @mentions, highlighted mentions in messages, and Slack-like channel layout refinements.
- Task 10 verification: invite-only channel join blocked with 403 on port 3000.
- Task 19 (structured mentions): server resolves @name to IDs, stores mentionedIds in message metadata, and includes mentionedIds in WS message payloads.
- Task 17 (destination policy UX): added destination_configs table + CRUD endpoints and Destinations UI page (Slack/Telegram policy + tokens).
- Task 17 smoke test: /agents/:id/destinations upsert + list returned 1 entry on port 3000.
- Task 18 (identity bridging + presence UX): dashboard shows external identity from destination configs and attention state badges via WS attention_change events.
- Task 30 (vitals dashboard) started: API + UI scaffolding added (cycles/current endpoints, AgentVitals page).
- Vitals API smoke test passed: current + cycle insert + list returned 1 cycle (port 3000).
- Vitals UI smoke test: frontend served on port 5173 after freeing ports; AgentVitals page compiles.
- Task 32 (channel tabs + reduced scroll): added Messages/Presence/Details tabs in channel view; composer stays in Messages tab.
- Task 32 smoke test: `npm run build -w @co-code/web` passed.
- Task 33 (Slack-style app shell): channel header with stats/actions + message list scroll container, denser sidebar spacing.
- Task 33 smoke test: `npm run build -w @co-code/web` passed.
- Task 34 (right details pane): toggleable details pane in channel view, responsive stack on mobile.
- Task 34 smoke test: `npm run build -w @co-code/web` passed.
- Task 35 (message list refinements): day separators, sender grouping, mention highlight styling.
- Task 35 smoke test: `npm run build -w @co-code/web` passed.
- Task 36 (unified navigation): removed Channels nav, redirected /channels to dashboard, moved channel creation into Dashboard channels tab.
- Task 36 smoke test: `npm run build -w @co-code/web` passed.
- Added pagination to listing UIs (Dashboard humans/channels/agents, Channel messages, Channels page list, AgentVitals cycles) with shared Pagination component.
- Pagination smoke test: `npm run build -w @co-code/web` passed.
- UI/UX refresh: reduced gradients, neutral palette, tighter spacing, cleaner sidebar, flatter cards, minimal tabs, cleaner message styling.
- UI refresh smoke test: `npm run build -w @co-code/web` passed.
- Dashboard tabs alignment fix: adjusted tab alignment + line-height to remove visual lift.
- Tabs fix smoke test: `npm run build -w @co-code/web` passed.
- Dashboard layout fix attempt: set grid auto-rows to min-content and align-content start.
- Layout fix smoke test: `npm run build -w @co-code/web` passed.
- Sprint 9 Slack parity: channel header actions + member count, right pane members/pins/files, grouped message identity with avatars, hover actions, sidebar unread/mention badges.
- Sprint 9 smoke test: `npm run build -w @co-code/web` passed.
- Task 53 (docker workflow): aligned docker-compose to .env DB_* vars, added COLLECTIVE_CONFIG override, server healthcheck now installs wget, README updated.
- Task 55 (docker smoke test): ran compose-based API smoke test successfully.
  - Needed DB_PORT override (55000 in use): `DB_PORT=55001 docker compose up -d postgres`
  - Fixed Docker build: copied `tsconfig.base.json` into server image + added `@types/ws`
  - Smoke test command: `DB_PORT=55001 docker compose run --rm --entrypoint sh server -lc "npm test -w @co-code/collective-server -- --run api.smoke.test.ts"`
- 2026-01-28: Task 26 DONE - mcp-collective Server
  - Created new package: `packages/mcp-collective/`
  - Implemented MCP server with 5 tools: join_channel, send_message, get_mentions, set_presence, list_channels.
  - Implemented WebSocket client to collective-server in `src/client/collective.ts`.
  - Tools mapping: join_channel -> `join_channel` WS, send_message -> `send_message` WS, etc.
  - Successfully built and linked. ✅

---

## Questions for Manager
_List questions that need clarification_

---

## Blockers
_Issues preventing progress_

---

## Findings
_Important discoveries during development_
