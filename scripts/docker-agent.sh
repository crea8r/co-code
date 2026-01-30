#!/usr/bin/env bash
# Helper script to run agent in Docker
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
    cat << EOF
Usage: $0 <command> [options]

Commands:
    start           Start infrastructure (postgres + server)
    stop            Stop all services
    reset           Stop and delete all data
    shell           Open shell in agent container
    run <id>        Run agent with given ID
    logs [service]  Show logs (default: all)
    status          Show service status

Examples:
    $0 start                    # Start database and server
    $0 shell                    # Open interactive shell in agent container
    $0 run abc-123              # Run agent with ID abc-123
    $0 logs server              # Show server logs
EOF
}

start_infra() {
    echo "Starting PostgreSQL and Collective Server..."
    docker compose up -d postgres server
    echo "Waiting for services to be healthy..."
    sleep 5
    docker compose ps
    echo ""
    echo "Infrastructure ready!"
    echo "  - Server: http://localhost:3000"
    echo "  - Database: localhost:55000"
}

stop_all() {
    echo "Stopping all services..."
    docker compose down
}

reset_all() {
    echo "Stopping and deleting all data..."
    docker compose down -v
    echo "All data deleted."
}

open_shell() {
    echo "Opening shell in agent container..."
    echo "Inside the container, you can:"
    echo "  - Initialize agent: node /app/packages/agent-runtime/dist/platforms/node/cli.js init --id <ID>"
    echo "  - Setup collective: node /app/packages/agent-runtime/dist/platforms/node/cli.js setup --collective /config/collective.json"
    echo "  - Start agent: node /app/packages/agent-runtime/dist/platforms/node/cli.js start --id <ID>"
    echo ""
    docker compose run --rm agent bash
}

run_agent() {
    local agent_id="${1:-}"
    if [[ -z "$agent_id" ]]; then
        echo "Error: Agent ID required"
        echo "Usage: $0 run <agent-id>"
        exit 1
    fi

    echo "Running agent $agent_id in Docker..."
    docker compose run --rm agent bash -c "
        cd /app && \
        node packages/agent-runtime/dist/platforms/node/cli.js init --id $agent_id && \
        node packages/agent-runtime/dist/platforms/node/cli.js setup --collective /config/collective.json && \
        node packages/agent-runtime/dist/platforms/node/cli.js start --id $agent_id
    "
}

show_logs() {
    local service="${1:-}"
    if [[ -z "$service" ]]; then
        docker compose logs -f
    else
        docker compose logs -f "$service"
    fi
}

show_status() {
    docker compose ps
}

# Main
case "${1:-help}" in
    start)
        start_infra
        ;;
    stop)
        stop_all
        ;;
    reset)
        reset_all
        ;;
    shell)
        open_shell
        ;;
    run)
        run_agent "${2:-}"
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        echo "Unknown command: $1"
        usage
        exit 1
        ;;
esac
