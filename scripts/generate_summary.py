"""Generate compact evaluation summary from ledger and signal data.

Produces dashboard/data/summary.json with:
  - Per-profile signal counts (from latest signals)
  - Per-profile trade stats (from ledgers)
  - Win rate (wins + losses only)
  - PnL and open exposure
  - Average time to resolution (if enough data)
  - Pipeline run timestamp

All metrics labeled SIMULATED.
"""

import glob
import json
import logging
import os
import sys
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

PROFILES = ["conservative", "moderate", "aggressive"]


def parse_hours(entry_time_str, exit_time_str):
    """Parse two ISO timestamps and return hours between them, or None."""
    try:
        fmt1 = "%Y-%m-%dT%H:%M:%S.%f"
        fmt2 = "%Y-%m-%dT%H:%M:%S"
        for fmt in [fmt1, fmt2]:
            try:
                entry = datetime.strptime(entry_time_str, fmt)
                exit_t = datetime.strptime(exit_time_str, fmt)
                return (exit_t - entry).total_seconds() / 3600
            except ValueError:
                continue
    except Exception:
        pass
    return None


def build_profile_summary(profile_id, data_dir):
    """Build summary for one profile."""
    signals_dir = os.path.join(data_dir, "signals")
    ledger_dir = os.path.join(data_dir, "ledger")

    # Find latest signal file for this profile
    signal_files = sorted(glob.glob(os.path.join(signals_dir, f"signals_*_{profile_id}.json")))
    signal_stats = {"trade": 0, "watch": 0, "skip": 0, "total": 0}

    if signal_files:
        latest_signal = signal_files[-1]
        try:
            with open(latest_signal) as f:
                sig_data = json.load(f)
            results = sig_data.get("results", [])
            signal_stats["total"] = len(results)
            for r in results:
                sig = r.get("signal", "").upper()
                if sig == "TRADE":
                    signal_stats["trade"] += 1
                elif sig == "WATCH":
                    signal_stats["watch"] += 1
                elif sig == "SKIP":
                    signal_stats["skip"] += 1
        except Exception as e:
            logger.warning("Failed to read signal file %s: %s", latest_signal, e)

    # Find ledger for this profile — glob for any strategy, not just no_side
    ledger_matches = sorted(glob.glob(os.path.join(ledger_dir, f"ledger_*_{profile_id}.json")))
    ledger_path = ledger_matches[-1] if ledger_matches else None
    trade_stats = {
        "total_trades": 0,
        "open_trades": 0,
        "wins": 0,
        "losses": 0,
        "expired": 0,
        "cancelled": 0,
        "win_rate_pct": 0.0,
        "total_pnl": 0.0,
        "open_exposure": 0.0,
        "avg_hours_to_resolution": None,
    }

    if ledger_path and os.path.exists(ledger_path):
        try:
            with open(ledger_path) as f:
                trades = json.load(f)

            open_trades = [t for t in trades if t.get("status") == "OPEN"]
            closed_trades = [t for t in trades if t.get("status") != "OPEN"]
            wins = [t for t in closed_trades if t.get("status") == "WON"]
            losses = [t for t in closed_trades if t.get("status") == "LOST"]
            expired = [t for t in closed_trades if t.get("status") == "EXPIRED"]
            cancelled = [t for t in closed_trades if t.get("status") == "CANCELLED"]

            definitive = len(wins) + len(losses)
            win_rate = (len(wins) / definitive * 100) if definitive else 0.0

            total_pnl = sum(t.get("pnl", 0) or 0 for t in closed_trades)
            open_exposure = sum(t.get("stake", 0) for t in open_trades)

            # Average time to resolution
            resolution_hours = []
            for t in closed_trades:
                entry = t.get("entry_time")
                exit_t = t.get("exit_time")
                if entry and exit_t:
                    h = parse_hours(entry, exit_t)
                    if h is not None and h > 0:
                        resolution_hours.append(h)

            avg_resolution = None
            if len(resolution_hours) >= 2:
                avg_resolution = round(sum(resolution_hours) / len(resolution_hours), 1)

            trade_stats = {
                "total_trades": len(trades),
                "open_trades": len(open_trades),
                "wins": len(wins),
                "losses": len(losses),
                "expired": len(expired),
                "cancelled": len(cancelled),
                "win_rate_pct": round(win_rate, 1),
                "total_pnl": round(total_pnl, 2),
                "open_exposure": round(open_exposure, 2),
                "avg_hours_to_resolution": avg_resolution,
            }
        except Exception as e:
            logger.warning("Failed to read ledger %s: %s", ledger_path, e)

    return {
        "profile_id": profile_id,
        "signals": signal_stats,
        "trades": trade_stats,
        "provenance": "SIMULATED",
    }


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(root, "data")
    dash_data = os.path.join(root, "dashboard", "data")
    os.makedirs(dash_data, exist_ok=True)

    # Build per-profile summaries
    profiles = []
    for pid in PROFILES:
        profiles.append(build_profile_summary(pid, data_dir))

    # Aggregate totals
    total_signals = sum(p["signals"]["total"] for p in profiles)
    total_trades = sum(p["trades"]["total_trades"] for p in profiles)
    total_open = sum(p["trades"]["open_trades"] for p in profiles)
    total_wins = sum(p["trades"]["wins"] for p in profiles)
    total_losses = sum(p["trades"]["losses"] for p in profiles)
    total_pnl = sum(p["trades"]["total_pnl"] for p in profiles)
    total_exposure = sum(p["trades"]["open_exposure"] for p in profiles)

    definitive = total_wins + total_losses
    overall_win_rate = (total_wins / definitive * 100) if definitive else 0.0

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "provenance": "SIMULATED",
        "profiles": profiles,
        "totals": {
            "signals_evaluated": total_signals,
            "total_trades": total_trades,
            "open_trades": total_open,
            "wins": total_wins,
            "losses": total_losses,
            "win_rate_pct": round(overall_win_rate, 1),
            "total_pnl": round(total_pnl, 2),
            "open_exposure": round(total_exposure, 2),
        },
    }

    # Write to dashboard data
    summary_path = os.path.join(dash_data, "summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)
    logger.info("Summary written to %s", summary_path)

    # Also write to reports/
    reports_dir = os.path.join(root, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    reports_path = os.path.join(reports_dir, "evaluation_summary.json")
    with open(reports_path, "w") as f:
        json.dump(summary, f, indent=2)
    logger.info("Summary also written to %s", reports_path)

    # Print human-readable summary
    print(f"\n{'='*60}")
    print(f"EVALUATION SUMMARY [SIMULATED]")
    print(f"{'='*60}")
    for p in profiles:
        s = p["signals"]
        t = p["trades"]
        avg_res = t["avg_hours_to_resolution"]
        avg_str = f"{avg_res}h" if avg_res else "n/a"
        print(f"\n  {p['profile_id'].upper()}")
        print(f"    Signals:  {s['trade']} TRADE / {s['watch']} WATCH / {s['skip']} SKIP  ({s['total']} total)")
        print(f"    Trades:   {t['total_trades']} total, {t['open_trades']} open")
        print(f"    Results:  {t['wins']}W / {t['losses']}L / {t['expired']}E / {t['cancelled']}C")
        print(f"    Win rate: {t['win_rate_pct']}%  (wins+losses only)")
        print(f"    P&L:      ${t['total_pnl']:.2f}  |  Exposure: ${t['open_exposure']:.2f}")
        print(f"    Avg resolution: {avg_str}")

    tot = summary["totals"]
    print(f"\n  TOTALS")
    print(f"    {tot['total_trades']} trades, {tot['open_trades']} open")
    print(f"    {tot['wins']}W / {tot['losses']}L  →  {tot['win_rate_pct']}% win rate")
    print(f"    P&L: ${tot['total_pnl']:.2f}  |  Exposure: ${tot['open_exposure']:.2f}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
