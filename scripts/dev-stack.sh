#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${LESSONHUB_COMPOSE_FILE:-$ROOT_DIR/docker-compose.yml}"
ENV_FILE="${LESSONHUB_ENV_FILE:-}"
ENV_NOTE_SHOWN=0

if [[ -z "$ENV_FILE" ]]; then
  if [[ -f "$ROOT_DIR/.env" ]]; then
    ENV_FILE="$ROOT_DIR/.env"
  elif [[ -f "$ROOT_DIR/.env.example" ]]; then
    ENV_FILE="$ROOT_DIR/.env.example"
  else
    echo "[error] .env or .env.example file is required." >&2
    exit 1
  fi
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[error] env file not found: $ENV_FILE" >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE_CMD=(docker-compose)
else
  echo "[error] docker compose command is not available." >&2
  exit 1
fi

compose() {
  (
    cd "$ROOT_DIR"
    "${DOCKER_COMPOSE_CMD[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
  )
}

require_docker_daemon() {
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "[error] docker daemon is not running. Start Docker Desktop or Colima first." >&2
    exit 1
  fi
}

show_env_note() {
  if [[ "$ENV_NOTE_SHOWN" -eq 1 ]]; then
    return 0
  fi

  echo "[env] using $ENV_FILE" >&2
  if [[ "$ENV_FILE" == "$ROOT_DIR/.env.example" ]]; then
    echo "[env] .env is missing, so dev defaults from .env.example are active." >&2
  fi
  ENV_NOTE_SHOWN=1
}

env_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"
  printf '%s' "${line#*=}"
}

frontend_port() {
  local value
  value="$(env_value FRONTEND_PORT)"
  printf '%s' "${value:-18080}"
}

backend_port() {
  local value
  value="$(env_value BACKEND_PORT)"
  printf '%s' "${value:-4000}"
}

db_port() {
  local value
  value="$(env_value POSTGRES_PORT)"
  printf '%s' "${value:-5432}"
}

db_name() {
  local value
  value="$(env_value POSTGRES_DB)"
  printf '%s' "${value:-lesson_booking}"
}

db_user() {
  local value
  value="$(env_value POSTGRES_USER)"
  printf '%s' "${value:-lesson_user}"
}

show_endpoints() {
  cat <<EOF
Frontend: http://localhost:$(frontend_port)/index.html
Frontend proxy health: http://localhost:$(frontend_port)/api/health
Backend health: http://localhost:$(backend_port)/health
PostgreSQL: localhost:$(db_port) (db=$(db_name), user=$(db_user))
EOF
}

wait_for_db() {
  local retries="${1:-30}"
  local sleep_seconds="${2:-2}"
  local attempt

  for ((attempt = 1; attempt <= retries; attempt += 1)); do
    if compose exec -T db pg_isready -U "$(db_user)" -d "$(db_name)" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_seconds"
  done

  echo "[error] database did not become ready in time." >&2
  return 1
}

ensure_running() {
  local service="$1"
  if compose ps --status running --services | grep -qx "$service"; then
    return 0
  fi

  echo "[info] starting $service ..." >&2
  compose up -d "$service"

  if [[ "$service" == "db" ]]; then
    wait_for_db
  fi
}

run_backend_task() {
  show_env_note
  require_docker_daemon
  compose up -d db
  wait_for_db
  compose run --build --rm backend "$@"
}

show_help() {
  cat <<'EOF'
LessonHub local stack helper

Usage:
  ./scripts/dev-stack.sh <command> [args]

Commands:
  up [services...]        Build and start the whole stack or selected services
  start [services...]     Start stopped containers without rebuilding
  stop [services...]      Stop the whole stack or selected services
  down                    Remove containers, network, and keep DB volume
  restart [services...]   Restart the whole stack or selected services
  status                  Show current container status
  logs [service]          Tail logs for all services or a single service
  bootstrap               up + migrate + seed
  migrate                 Run backend migrations against local DB
  seed                    Seed local dev data
  test                    Run backend test suite
  db-shell                Open psql inside the DB container
  backend-shell           Open a shell in a one-off backend container
  reset --yes             Stop stack and remove DB volume too
  env                     Show which env file/ports are active
  config                  Print resolved docker compose config
  help                    Show this help

Examples:
  ./scripts/dev-stack.sh bootstrap
  ./scripts/dev-stack.sh up
  ./scripts/dev-stack.sh logs backend
  ./scripts/dev-stack.sh stop db
  ./scripts/dev-stack.sh db-shell
  ./scripts/dev-stack.sh reset --yes
EOF
}

command="${1:-help}"
shift || true

case "$command" in
  up)
    show_env_note
    require_docker_daemon
    if [[ "$#" -gt 0 ]]; then
      compose up --build -d "$@"
    else
      compose up --build -d
    fi
    show_endpoints
    ;;
  start)
    show_env_note
    require_docker_daemon
    if [[ "$#" -gt 0 ]]; then
      compose start "$@"
    else
      compose start
    fi
    show_endpoints
    ;;
  stop)
    show_env_note
    require_docker_daemon
    if [[ "$#" -gt 0 ]]; then
      compose stop "$@"
    else
      compose stop
    fi
    ;;
  down)
    show_env_note
    require_docker_daemon
    compose down --remove-orphans
    ;;
  restart)
    show_env_note
    require_docker_daemon
    if [[ "$#" -gt 0 ]]; then
      compose restart "$@"
    else
      compose restart
    fi
    show_endpoints
    ;;
  status|ps)
    show_env_note
    require_docker_daemon
    compose ps
    ;;
  logs)
    show_env_note
    require_docker_daemon
    if [[ "$#" -gt 0 ]]; then
      compose logs -f --tail 150 "$1"
    else
      compose logs -f --tail 150
    fi
    ;;
  bootstrap)
    show_env_note
    require_docker_daemon
    compose up --build -d
    wait_for_db
    run_backend_task npm run migrate
    run_backend_task npm run seed
    show_endpoints
    ;;
  migrate)
    run_backend_task npm run migrate
    ;;
  seed)
    run_backend_task npm run seed
    ;;
  test)
    run_backend_task npm test
    ;;
  db-shell)
    show_env_note
    require_docker_daemon
    ensure_running db
    cd "$ROOT_DIR"
    exec "${DOCKER_COMPOSE_CMD[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec db psql -U "$(db_user)" -d "$(db_name)"
    ;;
  backend-shell)
    show_env_note
    require_docker_daemon
    compose up -d db
    wait_for_db
    cd "$ROOT_DIR"
    exec "${DOCKER_COMPOSE_CMD[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --build --rm backend sh
    ;;
  reset)
    show_env_note
    if [[ "${1:-}" != "--yes" ]]; then
      echo "[error] reset deletes the local DB volume. Run again with: ./scripts/dev-stack.sh reset --yes" >&2
      exit 1
    fi
    require_docker_daemon
    compose down -v --remove-orphans
    ;;
  env)
    show_env_note
    show_endpoints
    ;;
  config)
    show_env_note
    compose config
    ;;
  help|-h|--help)
    show_help
    ;;
  *)
    echo "[error] unknown command: $command" >&2
    echo >&2
    show_help >&2
    exit 1
    ;;
esac
