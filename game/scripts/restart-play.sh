#!/usr/bin/env bash
set -euo pipefail
SESSION_NAME="two-harbors-play"
CONF=/exec-daemon/tmux.portal.conf
tmux -f "$CONF" has-session -t "=$SESSION_NAME" 2>/dev/null || tmux -f "$CONF" new-session -d -s "$SESSION_NAME" -c /workspace/game -- "${SHELL:-bash}" -l
tmux -f "$CONF" send-keys -t "$SESSION_NAME:0.0" C-c
sleep 0.3
tmux -f "$CONF" send-keys -t "$SESSION_NAME:0.0" 'cd /workspace/game && npm run play' C-m
echo "play restarting on http://0.0.0.0:8787"
