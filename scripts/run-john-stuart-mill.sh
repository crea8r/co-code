#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COLLECTIVE_FILE="${COLLECTIVE_FILE:-$ROOT_DIR/collective-john-stuart-mill.json}"
CLI="$ROOT_DIR/packages/agent-runtime/dist/platforms/node/cli.js"

if [[ ! -f "$COLLECTIVE_FILE" ]]; then
  echo "Collective file not found: $COLLECTIVE_FILE" >&2
  exit 1
fi

if [[ ! -f "$CLI" ]]; then
  echo "Agent CLI not built. Run: npm run build -w @co-code/agent-runtime" >&2
  exit 1
fi

# Load CHATGPT_API from .env if not already set
if [[ -z "${CHATGPT_API:-}" && -f "$ROOT_DIR/.env" ]]; then
  CHATGPT_API="$(grep -E '^CHATGPT_API=' "$ROOT_DIR/.env" | sed 's/^CHATGPT_API=//')"
  export CHATGPT_API
fi

if [[ -z "${CHATGPT_API:-}" ]]; then
  echo "CHATGPT_API is not set. Export it or set it in .env." >&2
  exit 1
fi

AGENT_ID="$(node -e "const fs=require('fs'); const p=process.argv[1]; const data=JSON.parse(fs.readFileSync(p,'utf8')); process.stdout.write(data.agentId || '');" "$COLLECTIVE_FILE")"

if [[ -z "$AGENT_ID" ]]; then
  echo "agentId not found in $COLLECTIVE_FILE" >&2
  exit 1
fi

AGENT_HOME="${HOME}/.co-code/agents/${AGENT_ID}"

if [[ ! -d "$AGENT_HOME" ]]; then
  echo "Initializing agent $AGENT_ID..."
  node "$CLI" init --id "$AGENT_ID"
fi

echo "Setting up collective config..."
node "$CLI" setup --collective "$COLLECTIVE_FILE"

echo "Starting runtime for $AGENT_ID..."
node "$CLI" start --id "$AGENT_ID"
