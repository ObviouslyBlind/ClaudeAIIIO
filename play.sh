#!/usr/bin/env bash
# Repo-root shortcut. Same as: cd game && ./scripts/play.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec bash "${ROOT}/game/scripts/play.sh" "$@"
