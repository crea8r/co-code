# Platform Dev Tasks

## Your Current Assignments

### Task 8: Human Presence + Directory

**Status**: TODO
**Priority**: High

**What to do**:

1. Add human presence list to dashboard
2. Subscribe to presence events via WebSocket
3. Show “last seen” when offline

**Acceptance**:

- [ ] Dashboard lists human users
- [ ] Presence updates live
- [ ] Offline shows last seen

**Notes**:
- Use `/auth/me` + `/agents` + `/channels` patterns for user list endpoint
- If no endpoint exists, coordinate with Manager to add `/users`

---

### Task 9: Direct Messages (Human ↔ Human, Human ↔ Agent)

**Status**: TODO
**Priority**: High

**What to do**:

1. Add DM concept in channels (type = `dm`)
2. Add UI list in sidebar (Slack-like)
3. Allow starting DM from roster/profile

**Acceptance**:

- [ ] DM channel can be created
- [ ] DM shows in sidebar
- [ ] DM messages flow via WebSocket

---

### Task 10: Channel Access Control (Public vs Invite-Only)

**Status**: TODO
**Priority**: High

**What to do**:

1. Add `visibility` field to channels (public/invite-only)
2. Enforce join rule on server
3. Add selector in Create Channel UI

**Acceptance**:

- [ ] Public channels joinable by anyone
- [ ] Invite-only requires member invite
- [ ] UI shows lock icon

---

### Task 11: Slack-like Layout + Mentions UX

**Status**: TODO
**Priority**: Medium

**What to do**:

1. Adjust layout to Slack-style sidebar
2. Add @mention autocomplete in composer
3. Render mention tokens

**Acceptance**:

- [ ] Slack-like layout in channels view
- [ ] @mention autocomplete works
- [ ] Mentions render distinctly

---

### Task 17: Destination Policy + Config UX

**Status**: TODO
**Priority**: Medium

**What to do**:

1. Add UI to configure external destinations (Slack/Telegram)
2. Add routing policy (DM only, mentions only, whitelist)
3. Save config for runtime retrieval

**Acceptance**:

- [ ] UI for destination config + policy
- [ ] Config stored and retrievable by runtime

---

### Task 18: Identity Bridging + Presence UX

**Status**: TODO
**Priority**: Medium

**What to do**:

1. Surface external identities (Slack/Telegram) on agent profile
2. Show attention state (active/queued)

**Acceptance**:

- [ ] External identity visible
- [ ] Queue state visible

---

### Task 1: Database Setup

**Status**: READY FOR REVIEW
**Priority**: High (blocks Task 2)

**What to do**:

1. Ensure PostgreSQL is installed and running
2. Create database: `createdb cocode`
3. Run schema: `psql cocode < packages/collective-server/src/db/schema.sql`
4. Verify tables created: `psql cocode -c "\dt"`

**Expected tables**:

- users
- agents
- agent_configs
- agent_tokens
- channels
- channel_members
- messages
- credits
- credit_transactions
- platform_stats

**Environment variables needed**:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=cocode
export DB_USER=postgres
export DB_PASSWORD=<your-password>
```

**Report**:

- Document connection string in `notes.md`
- If errors, document them
- Update status to DONE when tables exist

---

### Task 2: Test Server Endpoints

**Status**: READY FOR REVIEW
**Priority**: High

**What to do**:

1. Start server: `npm run dev:server`
2. Test with curl or similar:

```bash
# Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use token from login for authenticated requests
TOKEN="<jwt-from-login>"

# Create channel
curl -X POST http://localhost:3001/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"general","description":"General chat"}'

# Check balance
curl http://localhost:3001/credits/balance \
  -H "Authorization: Bearer $TOKEN"
```

3. Test WebSocket connection (wscat or similar)

**Acceptance**:

- [x] Server starts on port 3001
- [x] Can register user
- [x] Can login and get JWT
- [x] Can create channel with token
- [x] WebSocket accepts connection

---

## When Done

Update `notes.md` with:

- Connection string that works
- Any API endpoints that failed
- Error messages encountered
- Questions for Manager

Then tell Manager you're ready for Task 5 integration.

---

### Task 6: Expand React Frontend to Full App

**Status**: READY TO START
**Priority**: High

**Context**:
- Basic shell exists at `apps/web/` (Vite + React + TypeScript)
- Visual design is approved - keep the dark teal aesthetic
- Run with `npm run dev` at http://localhost:5173/
- Server is at `http://localhost:3001` (REST) and `ws://localhost:3001/ws` (WebSocket)

**What to build**:

1. **Routing** - Install react-router-dom, create pages:
   - `/login` - Login form
   - `/register` - Register form
   - `/` - Dashboard (current App.tsx content, but live data)
   - `/channels/:id` - Channel chat view
   - `/agents/create` - Create agent form

2. **Component library** - Extract from App.tsx:
   - Button, Card, Badge, Chip, Sidebar, TopBar
   - Put in `src/components/`

3. **Auth flow**:
   - Login/Register forms calling `/auth/login` and `/auth/register`
   - Store JWT in localStorage
   - Auth context for current user state
   - Protected routes redirect to /login if not authenticated

4. **API client** - Create `src/services/api.ts`:
   - Base fetch wrapper with JWT header
   - Methods: `login()`, `register()`, `getChannels()`, `createChannel()`, `getBalance()`

5. **WebSocket client** - Create `src/services/websocket.ts`:
   - Connect to `ws://localhost:3001/ws`
   - Send auth token on connect
   - Handle message events for real-time chat

6. **State management**:
   - React Context for auth (user, token, login/logout)
   - React Context or local state for channels/messages

**Acceptance criteria**:
- [ ] Can register a new user
- [ ] Can login and see dashboard with real data
- [ ] Can view list of channels from API
- [ ] Can open a channel and see WebSocket connected
- [ ] Logout clears token and redirects to login

**Files to create**:
```
apps/web/src/
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Sidebar.tsx
│   └── TopBar.tsx
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   └── Channel.tsx
├── services/
│   ├── api.ts
│   └── websocket.ts
├── context/
│   └── AuthContext.tsx
└── App.tsx (router setup)
```
