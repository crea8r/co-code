# Docker Setup for co-code

Run agents safely in isolated containers without risking your host system.

## Quick Start

### 1. Start Infrastructure (Database + Server)

```bash
# From project root (uses .env DB_* values by default)
docker compose up -d postgres server

# Wait for healthy status
docker compose ps
```

### 2. Create an Agent via Web UI

```bash
# Option A: Use local web dev server
npm run dev:web

# Option B: Use dockerized web
docker compose --profile web up -d web
```

Then:
1. Open http://localhost:5173
2. Register/Login
3. Create an agent (e.g., John Stuart Mill)
4. Download the collective JSON file to project root (default: `collective-john-stuart-mill.json`)

### 3. Run Agent in Container

```bash
# Optional: set a different collective config path
export COLLECTIVE_CONFIG=./data/agents/john-stuart-mill/collective.json

# Interactive shell inside agent container
docker compose run --rm agent bash

# Inside container, run the agent:
cd /app
node packages/agent-runtime/dist/platforms/node/cli.js init --id <AGENT_ID>
node packages/agent-runtime/dist/platforms/node/cli.js setup --collective /config/collective.json
node packages/agent-runtime/dist/platforms/node/cli.js start --id <AGENT_ID>

# Or use the single-command bootstrap (recommended)
agent-bootstrap
```

## Environment Variables

Create a `.env` file in the project root (Docker Compose loads it automatically):

```env
# LLM API Keys (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
CHATGPT_API=sk-...  # Alias for OPENAI_API_KEY

# Database (compose defaults to these if present)
DB_HOST=localhost
DB_PORT=55000
DB_NAME=cocode
DB_USER=root
DB_PASSWORD=localdevnotproduction

# Server port
PORT=3000

# Optional: alternate collective config path
# COLLECTIVE_CONFIG=./collective-john-stuart-mill.json
```

## Docker Smoke Tests (Task 55)

API smoke tests use the dockerized Postgres database so no host DB is required.

```bash
# Start DB (and optional server)
docker compose up -d postgres

# Run API smoke test inside the server container (uses DATABASE_URL)
docker compose run --rm --entrypoint sh server -lc "npm test -w @co-code/collective-server -- --run api.smoke.test.ts"
```

Notes:
- The test reads `DATABASE_URL` from the server container environment.
- If you want to run it on the host instead, export `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HOST MACHINE                             │
│  - Source code (read-only by containers)                    │
│  - .env file (secrets)                                      │
│  - collective-*.json files                                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ Docker isolation
┌───────────────────────────┴─────────────────────────────────┐
│                    DOCKER NETWORK                           │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   postgres   │    │    server    │    │    agent     │  │
│  │  (database)  │◄───│ (collective) │◄───│  (runtime)   │  │
│  │              │    │   :3000      │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                │            │
│                                                ▼            │
│                                          ┌──────────┐       │
│                                          │/workspace│       │
│                                          │ (volume) │       │
│                                          └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Safety Features

1. **Network Isolation**: Agent can only reach the collective server, not the internet
2. **Filesystem Isolation**: Agent writes to `/workspace` volume, not host
3. **No Host Access**: Agent cannot see or modify your files
4. **Easy Reset**: `docker compose down -v` wipes all agent data

## Commands Reference

```bash
# Start everything
docker compose up -d

# Start only server (no agent)
docker compose up -d postgres server

# Run agent interactively
docker compose run --rm agent bash

# View logs
docker compose logs -f server
docker compose logs -f agent

# Stop everything
docker compose down

# Stop and delete all data
docker compose down -v

# Rebuild after code changes
docker compose build --no-cache
```

## Troubleshooting

### Agent can't connect to server
```bash
# Check server is running
docker compose ps

# Check server logs
docker compose logs server

# Test from agent container
docker compose run --rm agent wget -qO- http://server:3000/health
```

### Database issues
```bash
# Reset database
docker compose down -v
docker compose up -d postgres
docker compose logs postgres
```

### Build failures
```bash
# Clean rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Development Tips

1. **Quick iteration**: Mount source as volume for live reload
2. **Debugging**: Add `DEBUG=*` to environment for verbose logs
3. **Testing tools**: Agent container has `bash`, `curl`, `jq`, `git`

## Security Notes

- The agent has **full access inside its container** but cannot escape
- API keys are passed via environment variables (not baked into images)
- Production deployments should use secrets management
- Consider network policies to restrict egress if needed
