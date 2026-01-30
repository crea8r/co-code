#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="${CLI_PATH:-$ROOT_DIR/packages/agent-runtime/dist/platforms/node/cli.js}"
COLLECTIVE_FILE="${COLLECTIVE_FILE:-/config/collective.json}"

if [[ ! -f "$CLI" ]]; then
  echo "Agent CLI not built: $CLI" >&2
  exit 1
fi

if [[ ! -f "$COLLECTIVE_FILE" ]]; then
  echo "Collective config not found at $COLLECTIVE_FILE" >&2
  exit 1
fi

AGENT_ID="${AGENT_ID:-}"
if [[ -z "$AGENT_ID" ]]; then
  AGENT_ID="$(node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); process.stdout.write(data.agentId||'');" "$COLLECTIVE_FILE")"
fi

if [[ -z "$AGENT_ID" ]]; then
  echo "AGENT_ID not set and not found in $COLLECTIVE_FILE" >&2
  exit 1
fi

AGENT_HOME="${HOME}/.co-code/agents/${AGENT_ID}"

if [[ ! -d "$AGENT_HOME" ]]; then
  echo "Initializing agent $AGENT_ID..."
  node "$CLI" init --id "$AGENT_ID"
fi

echo "Setting up collective config..."
node "$CLI" setup --collective "$COLLECTIVE_FILE" --id "$AGENT_ID"

echo "Starting runtime for $AGENT_ID..."
node "$CLI" start --id "$AGENT_ID"
