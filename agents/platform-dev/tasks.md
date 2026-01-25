# Platform Dev Tasks

## Your Current Assignments

### Task 1: Database Setup

**Status**: TODO
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

**Status**: BLOCKED (needs Task 1)
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

- [ ] Server starts on port 3001
- [ ] Can register user
- [ ] Can login and get JWT
- [ ] Can create channel with token
- [ ] WebSocket accepts connection

---

## When Done

Update `notes.md` with:

- Connection string that works
- Any API endpoints that failed
- Error messages encountered
- Questions for Manager

Then tell Manager you're ready for Task 5 integration.
