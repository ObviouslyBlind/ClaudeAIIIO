#!/usr/bin/env bash
# Public https URL for the harbour on this machine. PAPER / SIMULATED.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8787}"

harbour_up() { curl -sf -o /dev/null "http://127.0.0.1:${PORT}/"; }

if ! harbour_up; then
  echo "Starting harbour on 0.0.0.0:${PORT}"
  npm run play &
  for _ in $(seq 1 40); do
    harbour_up && break
    sleep 0.25
  done
  harbour_up || { echo "Harbour did not come up."; exit 1; }
fi

BIN="${CLOUDFLARED:-}"
if [[ -z "${BIN}" ]]; then
  if command -v cloudflared >/dev/null 2>&1; then
    BIN="$(command -v cloudflared)"
  elif [[ -x /tmp/cloudflared ]]; then
    BIN=/tmp/cloudflared
  else
    echo "Need cloudflared on PATH (or /tmp/cloudflared)."
    exit 1
  fi
fi

LOG="$(mktemp)"
"${BIN}" tunnel --no-autoupdate --url "http://127.0.0.1:${PORT}" >"${LOG}" 2>&1 &
URL=""
for _ in $(seq 1 50); do
  URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare.com' "${LOG}" | head -n 1 || true)"
  [[ -n "${URL}" ]] && break
  sleep 0.3
done

echo
echo "Harbour:  http://127.0.0.1:${PORT}/"
echo "Play at:  ${URL:-still spinning — see ${LOG}}"
echo "PAPER · SIMULATED · restart wipes"
echo
wait
