#!/usr/bin/env bash
set -euo pipefail
SESSION_NAME="two-harbors-play"
CONF=/exec-daemon/tmux.portal.conf
tmux -f "$CONF" has-session -t "=$SESSION_NAME" 2>/dev/null || tmux -f "$CONF" new-session -d -s "$SESSION_NAME" -c /workspace/game -- "${SHELL:-bash}" -l
tmux -f "$CONF" send-keys -t "$SESSION_NAME:0.0" C-c
sleep 0.3
# C-c sometimes leaves the old Node on :8787, so the next boot is not a wipe.
pkill -f "tsx src/server.ts" 2>/dev/null || true
if command -v fuser >/dev/null 2>&1; then
  fuser -k 8787/tcp >/dev/null 2>&1 || true
fi
sleep 0.4
tmux -f "$CONF" send-keys -t "$SESSION_NAME:0.0" 'cd /workspace/game && npm run play' C-m
echo "play restarting on http://0.0.0.0:8787"
