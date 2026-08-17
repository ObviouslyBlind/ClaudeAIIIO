#!/usr/bin/env bash
# Start Two Harbors on this machine (PAPER / SIMULATED).
#
#   ./scripts/play.sh           # http://localhost:8787
#   ./scripts/play.sh --public  # that, plus a URL you can open on a laptop
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8787}"
PUBLIC=0
for arg in "$@"; do
  case "$arg" in
    --public|--tunnel|--laptop) PUBLIC=1 ;;
    --help|-h)
      echo "Usage: $0 [--public]"
      echo "  --public   also open a Cloudflare tunnel (laptop / phone browser)"
      exit 0
      ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "Need Node.js 18+ on PATH."
  exit 1
fi

if [[ ! -d node_modules || ! -x node_modules/.bin/tsx ]]; then
  echo "Installing game dependencies…"
  npm install
fi

harbour_up() {
  curl -sf -o /dev/null "http://127.0.0.1:${PORT}/" 2>/dev/null
}

open_local() {
  local url="http://localhost:${PORT}/"
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v wslview >/dev/null 2>&1; then
    wslview "$url" >/dev/null 2>&1 || true
  fi
}

if [[ "${PUBLIC}" -eq 0 ]]; then
  if harbour_up; then
    echo "Harbour already on http://localhost:${PORT}/"
    open_local
    exit 0
  fi
  echo "Starting harbour on http://0.0.0.0:${PORT}/  (PAPER · SIMULATED)"
  echo "On this computer:  http://localhost:${PORT}/"
  echo "Need it on a laptop that is not this machine?"
  echo "  npm run play:laptop"
  (sleep 2 && harbour_up && open_local) &
  exec env PORT="${PORT}" npm run play
fi

PLAY_PID=""
TUNNEL_PID=""
cleanup() {
  if [[ -n "${TUNNEL_PID}" ]] && kill -0 "${TUNNEL_PID}" 2>/dev/null; then
    kill "${TUNNEL_PID}" 2>/dev/null || true
  fi
  if [[ -n "${PLAY_PID}" ]] && kill -0 "${PLAY_PID}" 2>/dev/null; then
    kill "${PLAY_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if harbour_up; then
  echo "Harbour already on http://127.0.0.1:${PORT}/"
else
  echo "Starting harbour on http://0.0.0.0:${PORT}/  (PAPER · SIMULATED)"
  PORT="${PORT}" npm run play &
  PLAY_PID=$!
  ready=0
  for _ in $(seq 1 40); do
    if harbour_up; then
      ready=1
      break
    fi
    sleep 0.25
  done
  if [[ "${ready}" -ne 1 ]]; then
    echo "Harbour did not come up on port ${PORT}."
    exit 1
  fi
  echo "Harbour ready: http://localhost:${PORT}/"
fi
open_local

echo "Opening a public URL for your laptop…"
LOG="$(mktemp)"
npx --yes cloudflared tunnel --url "http://127.0.0.1:${PORT}" >"${LOG}" 2>&1 &
TUNNEL_PID=$!
URL=""
for _ in $(seq 1 40); do
  URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "${LOG}" | head -n 1 || true)"
  if [[ -n "${URL}" ]]; then
    break
  fi
  sleep 0.4
done

echo
echo "========================================"
echo "  This computer:  http://localhost:${PORT}/"
if [[ -n "${URL}" ]]; then
  echo "  Your laptop:    ${URL}/"
else
  echo "  Laptop URL:     still spinning up — watch ${LOG}"
fi
echo "  PAPER · SIMULATED · South spawn"
echo "========================================"
echo
echo "Ctrl+C stops the harbour and the tunnel."

if [[ -n "${PLAY_PID}" ]]; then
  wait "${PLAY_PID}"
else
  wait "${TUNNEL_PID}"
fi
