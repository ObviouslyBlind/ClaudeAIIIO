#!/usr/bin/env bash
# run_pipeline.sh — Full pipeline orchestrator
#
# Runs: fetch → signals → papertrade → resolve → summary → export
# For all 3 profiles (conservative, moderate, aggressive).
#
# Usage:
#   ./scripts/run_pipeline.sh              # full pipeline
#   ./scripts/run_pipeline.sh --no-fetch   # skip fetch (reuse latest data)
#
# Exit codes:
#   0 = success
#   1 = partial failure (some steps failed)
#   2 = critical failure (fetch failed, nothing else can run)
#
# Output:
#   - All pipeline data files updated
#   - reports/pipeline_report.json written (machine-readable)
#   - Human-readable summary printed to stdout

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PROFILES="conservative moderate aggressive"
REPORT_FILE="$ROOT_DIR/reports/pipeline_report.json"
SKIP_FETCH=false

# Parse args
for arg in "$@"; do
    case "$arg" in
        --no-fetch) SKIP_FETCH=true ;;
        *) echo "Unknown arg: $arg"; exit 1 ;;
    esac
done

# Ensure reports dir exists
mkdir -p "$ROOT_DIR/reports"

# --- Helpers ---

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

# Track step results
declare -A STEP_STATUS
PIPELINE_START=$(timestamp)
ERRORS=0

run_step() {
    local name="$1"
    shift
    log "▶ $name"
    local start
    start=$(timestamp)
    if "$@" 2>&1; then
        STEP_STATUS["$name"]="success"
        log "✓ $name completed"
    else
        STEP_STATUS["$name"]="failed"
        log "✗ $name FAILED"
        ERRORS=$((ERRORS + 1))
    fi
}

# --- Pipeline ---

log "═══════════════════════════════════════════════"
log "PIPELINE START"
log "═══════════════════════════════════════════════"

# Step 1: Fetch markets
if [ "$SKIP_FETCH" = true ]; then
    log "⏭ Skipping fetch (--no-fetch)"
    STEP_STATUS["fetch_markets"]="skipped"
else
    run_step "fetch_markets" python "$SCRIPT_DIR/fetch_markets.py"
    if [ "${STEP_STATUS[fetch_markets]}" = "failed" ]; then
        log "CRITICAL: fetch failed, cannot continue"
        # Write failure report
        cat > "$REPORT_FILE" <<REOF
{
  "pipeline_start": "$PIPELINE_START",
  "pipeline_end": "$(timestamp)",
  "status": "critical_failure",
  "steps": {"fetch_markets": "failed"},
  "errors": 1,
  "summary": "Fetch failed — pipeline aborted"
}
REOF
        exit 2
    fi
fi

# Step 2: Signals for all profiles
for profile in $PROFILES; do
    run_step "signals_$profile" python "$SCRIPT_DIR/run_signals.py" --profile "$profile"
done

# Step 3: Paper trades for all profiles
for profile in $PROFILES; do
    run_step "papertrade_$profile" python "$SCRIPT_DIR/run_papertrade.py" --profile "$profile"
done

# Step 4: Resolve trades
run_step "resolve_trades" python "$SCRIPT_DIR/resolve_trades.py"

# Step 5: Generate evaluation summary
run_step "generate_summary" python "$SCRIPT_DIR/generate_summary.py"

# --- Write pipeline report BEFORE export so export can include it ---

PIPELINE_END=$(timestamp)
PIPELINE_STATUS="success"
if [ $ERRORS -gt 0 ]; then
    PIPELINE_STATUS="partial_failure"
fi

write_report() {
    python3 -c "
import json, sys, glob, os
steps = json.loads(sys.argv[1])
ledgers = sorted(glob.glob(os.path.join(sys.argv[6], 'data/ledger/ledger*.json')))
report = {
    'pipeline_start': sys.argv[2],
    'pipeline_end': sys.argv[3],
    'status': sys.argv[4],
    'errors': int(sys.argv[5]),
    'steps': steps,
    'ledger_summary': [{'file': os.path.basename(f)} for f in ledgers]
}
with open(sys.argv[7], 'w') as f:
    json.dump(report, f, indent=2)
" "$1" "$PIPELINE_START" "$PIPELINE_END" "$PIPELINE_STATUS" "$ERRORS" "$ROOT_DIR" "$REPORT_FILE"
}

# Build steps JSON from associative array
STEPS_JSON="{"
first=true
for key in "${!STEP_STATUS[@]}"; do
    if [ "$first" = true ]; then
        first=false
    else
        STEPS_JSON+=","
    fi
    STEPS_JSON+="\"$key\":\"${STEP_STATUS[$key]}\""
done
STEPS_JSON+="}"

write_report "$STEPS_JSON"
log "Pipeline report written to $REPORT_FILE"

# Step 6: Export dashboard data (now includes pipeline report)
run_step "export_dashboard" python "$SCRIPT_DIR/export_dashboard.py"

log ""
log "═══════════════════════════════════════════════"
log "PIPELINE COMPLETE — $PIPELINE_STATUS ($ERRORS errors)"
log "═══════════════════════════════════════════════"
log "Report: $REPORT_FILE"

if [ $ERRORS -gt 0 ]; then
    exit 1
fi
exit 0
