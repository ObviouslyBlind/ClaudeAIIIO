"""Generate compact evaluation summary from ledger and signal data.

Produces dashboard/data/summary.json with:
  - Per-profile signal counts, trade stats, win rate, PnL, exposure
  - Breakdowns by subject (musk/trump), event family, expiry window, skip reason
  - Realized vs unrealized PnL
  - Average time to resolution
  - Alert flags (zero markets, new trades, resolutions)

All metrics labeled SIMULATED.
"""

import glob
import json
import logging
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

PROFILES = ["conservative", "moderate", "aggressive"]


def parse_hours(entry_time_str, exit_time_str):
    """Parse two ISO timestamps and return hours between them, or None."""
    try:
        for fmt in ["%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"]:
            try:
                entry = datetime.strptime(entry_time_str, fmt)
                exit_t = datetime.strptime(exit_time_str, fmt)
                return (exit_t - entry).total_seconds() / 3600
            except ValueError:
                continue
    except Exception:
        pass
    return None


def classify_skip_reason(reasons):
    """Classify the primary skip reason from a list of reason strings."""
    text = " ".join(reasons).lower()
    if "closed" in text:
        return "market_closed"
    if "inactive" in text:
        return "market_inactive"
    if "not a musk" in text or "not a timer" in text:
        return "not_relevant"
    if "not enough upside" in text:
        return "price_too_high"
    if "market thinks event is likely" in text:
        return "price_too_low"
    if "mixed-evidence" in text:
        return "mixed_evidence"
    if "exceeds" in text and "max" in text:
        return "expiry_too_far"
    if "expired" in text:
        return "already_expired"
    return "other"


def expiry_bucket(hours):
    """Classify hours_until_expiry into a readable bucket."""
    if hours is None:
        return "unknown"
    if hours <= 0:
        return "expired"
    if hours <= 12:
        return "0-12h"
    if hours <= 24:
        return "12-24h"
    if hours <= 48:
        return "24-48h"
    if hours <= 72:
        return "48-72h"
    return "72h+"


def parse_bracket_sort_key(label):
    """Parse a bracket label into a sortable numeric key.

    Examples: "<40" → -1, "40-64" → 40, "200+" → 200, "1400+" → 1400
    """
    if not label:
        return 999999
    label = label.strip()
    if label.startswith("<"):
        return -1
    if label.endswith("+"):
        try:
            return int(label[:-1])
        except ValueError:
            return 999999
    parts = label.split("-")
    try:
        return int(parts[0])
    except ValueError:
        return 999999


def classify_bracket_position(bracket_label, family_brackets):
    """Classify a bracket as hot/adjacent/tail within its family.

    Args:
        bracket_label: This bracket's label (e.g. "65-89")
        family_brackets: List of dicts with bracket_label and yes_price

    Returns:
        "hot", "adjacent", or "tail"
    """
    if not family_brackets or not bracket_label:
        return "unknown"

    # Sort brackets by their natural order
    sorted_brackets = sorted(family_brackets,
                             key=lambda b: parse_bracket_sort_key(b.get("bracket_label", "")))

    # Find the hot bracket (highest YES price)
    hot_idx = 0
    hot_yes = 0
    for i, b in enumerate(sorted_brackets):
        yes_p = b.get("yes_price", 0) or 0
        if yes_p > hot_yes:
            hot_yes = yes_p
            hot_idx = i

    # Find this bracket's index
    my_idx = None
    for i, b in enumerate(sorted_brackets):
        if b.get("bracket_label") == bracket_label:
            my_idx = i
            break

    if my_idx is None:
        return "unknown"

    distance = abs(my_idx - hot_idx)
    if distance == 0:
        return "hot"
    if distance <= 1:
        return "adjacent"
    return "tail"


def build_family_lookup(data_dir):
    """Build a lookup of event_slug → list of bracket dicts from families or relevant markets."""
    families_lookup = {}

    # Try families file first (best structure)
    norm_dir = os.path.join(data_dir, "normalized")
    family_files = sorted(glob.glob(os.path.join(norm_dir, "families_*.json")))
    if family_files:
        try:
            with open(family_files[-1]) as f:
                families = json.load(f)
            for fam in families:
                slug = fam.get("event_slug", "")
                brackets = fam.get("brackets", [])
                if slug and len(brackets) > 1:
                    families_lookup[slug] = brackets
        except Exception as e:
            logger.warning("Failed to read families file: %s", e)

    # Fallback: group relevant markets by event_slug
    if not families_lookup:
        relevant_files = sorted(glob.glob(os.path.join(norm_dir, "relevant_markets_*.json")))
        if relevant_files:
            try:
                with open(relevant_files[-1]) as f:
                    markets = json.load(f)
                by_slug = defaultdict(list)
                for m in markets:
                    slug = m.get("event_slug", "")
                    if slug and m.get("bracket_label"):
                        by_slug[slug].append(m)
                for slug, brackets in by_slug.items():
                    if len(brackets) > 1:
                        families_lookup[slug] = brackets
            except Exception as e:
                logger.warning("Failed to read relevant markets for family lookup: %s", e)

    return families_lookup


def build_bracket_position_breakdowns(data_dir, families_lookup):
    """Build signal and trade breakdowns by bracket position (hot/adjacent/tail)."""
    signals_dir = os.path.join(data_dir, "signals")
    ledger_dir = os.path.join(data_dir, "ledger")

    # Signal breakdowns by position
    by_position_signals = defaultdict(lambda: {"trade": 0, "watch": 0, "skip": 0})
    # Trade breakdowns by position
    by_position_trades = defaultdict(lambda: {
        "total": 0, "open": 0, "won": 0, "lost": 0, "expired": 0,
        "realized_pnl": 0.0, "unrealized_exposure": 0.0,
    })

    # Process signals
    for profile_id in PROFILES:
        signal_files = sorted(glob.glob(
            os.path.join(signals_dir, f"signals_*_{profile_id}.json")
        ))
        if not signal_files:
            continue
        try:
            with open(signal_files[-1]) as f:
                sig_data = json.load(f)
            results = sig_data.get("results", [])
        except Exception:
            continue

        for r in results:
            sig = r.get("signal", "").upper()
            eslug = r.get("event_slug", "") or ""
            bracket = r.get("bracket_label", "") or ""

            family = families_lookup.get(eslug, [])
            position = classify_bracket_position(bracket, family) if family else "unknown"

            if sig in ("TRADE", "WATCH", "SKIP"):
                by_position_signals[position][sig.lower()] += 1

    # Process trades
    ledger_files = sorted(glob.glob(os.path.join(ledger_dir, "ledger_*.json")))
    for lf in ledger_files:
        try:
            with open(lf) as f:
                trades = json.load(f)
        except Exception:
            continue

        for t in trades:
            eslug = t.get("event_slug", "") or ""
            bracket = t.get("bracket_label", "") or ""
            status = t.get("status", "OPEN")
            pnl = t.get("pnl", 0) or 0
            stake = t.get("stake", 0)

            family = families_lookup.get(eslug, [])
            position = classify_bracket_position(bracket, family) if family else "unknown"

            by_position_trades[position]["total"] += 1
            if status == "OPEN":
                by_position_trades[position]["open"] += 1
                by_position_trades[position]["unrealized_exposure"] += stake
            elif status == "WON":
                by_position_trades[position]["won"] += 1
                by_position_trades[position]["realized_pnl"] += pnl
            elif status == "LOST":
                by_position_trades[position]["lost"] += 1
                by_position_trades[position]["realized_pnl"] += pnl
            elif status == "EXPIRED":
                by_position_trades[position]["expired"] += 1
                by_position_trades[position]["realized_pnl"] += pnl

    # Round floats
    for k in by_position_trades:
        by_position_trades[k]["realized_pnl"] = round(by_position_trades[k]["realized_pnl"], 2)
        by_position_trades[k]["unrealized_exposure"] = round(by_position_trades[k]["unrealized_exposure"], 2)

    # Sort in logical order: hot, adjacent, tail, unknown
    position_order = ["hot", "adjacent", "tail", "unknown"]

    return {
        "signals_by_position": {
            k: dict(by_position_signals[k])
            for k in position_order if k in by_position_signals
        },
        "trades_by_position": {
            k: dict(by_position_trades[k])
            for k in position_order if k in by_position_trades
        },
        "families_analyzed": len(families_lookup),
    }


def build_strategy_b_progress(totals, families_lookup):
    """Report progress toward Strategy B evidence threshold.

    Threshold (from Q012 / user message 3):
      - 10+ definitive outcomes (wins + losses)
      - 2+ complete event cycles (families fully resolved)
      - Profile differentiation (conservative vs aggressive differ)
      - Position-matters evidence (hot vs tail have different outcomes)
    """
    definitive = totals["wins"] + totals["losses"]

    criteria = [
        {
            "criterion": "10+ definitive outcomes",
            "current": definitive,
            "target": 10,
            "met": definitive >= 10,
        },
        {
            "criterion": "2+ complete event cycles",
            "current": 0,  # We don't track resolved families yet
            "target": 2,
            "met": False,
        },
        {
            "criterion": "Profile differentiation observed",
            "current": "insufficient data" if definitive < 5 else "pending analysis",
            "target": "profiles differ on win rate",
            "met": False,
        },
        {
            "criterion": "Position-matters evidence",
            "current": "insufficient data" if definitive < 5 else "pending analysis",
            "target": "hot vs tail differ on outcomes",
            "met": False,
        },
    ]

    met_count = sum(1 for c in criteria if c["met"])

    return {
        "ready": met_count == len(criteria),
        "criteria_met": met_count,
        "criteria_total": len(criteria),
        "criteria": criteria,
        "recommendation": "DEFER — need more resolution data" if met_count < len(criteria)
                          else "READY — evidence threshold met, consider implementing Strategy B",
    }


def build_signal_breakdowns(data_dir):
    """Build breakdowns from all signal files (latest per profile)."""
    signals_dir = os.path.join(data_dir, "signals")

    by_subject = defaultdict(lambda: {"trade": 0, "watch": 0, "skip": 0})
    by_event = defaultdict(lambda: {"trade": 0, "watch": 0, "skip": 0, "event_title": ""})
    by_expiry = defaultdict(lambda: {"trade": 0, "watch": 0, "skip": 0})
    by_skip_reason = defaultdict(int)

    for profile_id in PROFILES:
        signal_files = sorted(glob.glob(
            os.path.join(signals_dir, f"signals_*_{profile_id}.json")
        ))
        if not signal_files:
            continue
        try:
            with open(signal_files[-1]) as f:
                sig_data = json.load(f)
            results = sig_data.get("results", [])
        except Exception as e:
            logger.warning("Failed to read signal file: %s", e)
            continue

        for r in results:
            sig = r.get("signal", "").upper()
            mtype = r.get("market_type", "unknown") or "unknown"
            eslug = r.get("event_slug", "unknown") or "unknown"
            etitle = r.get("event_title", "") or ""
            hours = r.get("hours_until_expiry")
            reasons = r.get("reasons", [])

            # Subject breakdown (only count once per unique market per profile)
            subject = "musk" if "musk" in mtype else "trump" if "trump" in mtype else "other"
            if sig in ("TRADE", "WATCH", "SKIP"):
                by_subject[subject][sig.lower()] += 1

            # Event family breakdown
            if sig in ("TRADE", "WATCH", "SKIP"):
                by_event[eslug][sig.lower()] += 1
                if etitle:
                    by_event[eslug]["event_title"] = etitle

            # Expiry bucket breakdown
            bucket = expiry_bucket(hours)
            if sig in ("TRADE", "WATCH", "SKIP"):
                by_expiry[bucket][sig.lower()] += 1

            # Skip reason breakdown
            if sig == "SKIP":
                reason_cat = classify_skip_reason(reasons)
                by_skip_reason[reason_cat] += 1

    return {
        "by_subject": {k: dict(v) for k, v in sorted(by_subject.items())},
        "by_event": {k: dict(v) for k, v in sorted(by_event.items())},
        "by_expiry": {k: dict(v) for k, v in sorted(by_expiry.items(),
                      key=lambda x: ["expired", "0-12h", "12-24h", "24-48h",
                                     "48-72h", "72h+", "unknown"].index(x[0])
                      if x[0] in ["expired", "0-12h", "12-24h", "24-48h",
                                  "48-72h", "72h+", "unknown"] else 99)},
        "by_skip_reason": dict(sorted(by_skip_reason.items(),
                               key=lambda x: -x[1])),
    }


def build_trade_breakdowns(data_dir):
    """Build trade breakdowns from all ledger files."""
    ledger_dir = os.path.join(data_dir, "ledger")
    ledger_files = sorted(glob.glob(os.path.join(ledger_dir, "ledger_*.json")))

    by_subject = defaultdict(lambda: {
        "total": 0, "open": 0, "won": 0, "lost": 0, "expired": 0,
        "realized_pnl": 0.0, "unrealized_exposure": 0.0,
    })
    by_event = defaultdict(lambda: {
        "total": 0, "open": 0, "won": 0, "lost": 0, "expired": 0,
        "realized_pnl": 0.0, "unrealized_exposure": 0.0, "event_title": "",
    })

    for lf in ledger_files:
        try:
            with open(lf) as f:
                trades = json.load(f)
        except Exception as e:
            logger.warning("Failed to read ledger %s: %s", lf, e)
            continue

        for t in trades:
            mtype = t.get("market_type", "unknown") or "unknown"
            eslug = t.get("event_slug", "unknown") or "unknown"
            etitle = t.get("event_title", "") or ""
            status = t.get("status", "OPEN")
            pnl = t.get("pnl", 0) or 0
            stake = t.get("stake", 0)

            subject = "musk" if "musk" in mtype else "trump" if "trump" in mtype else "other"

            for group_key, group_dict in [(subject, by_subject), (eslug, by_event)]:
                group_dict[group_key]["total"] += 1
                if status == "OPEN":
                    group_dict[group_key]["open"] += 1
                    group_dict[group_key]["unrealized_exposure"] += stake
                elif status == "WON":
                    group_dict[group_key]["won"] += 1
                    group_dict[group_key]["realized_pnl"] += pnl
                elif status == "LOST":
                    group_dict[group_key]["lost"] += 1
                    group_dict[group_key]["realized_pnl"] += pnl
                elif status == "EXPIRED":
                    group_dict[group_key]["expired"] += 1
                    group_dict[group_key]["realized_pnl"] += pnl

            if etitle:
                by_event[eslug]["event_title"] = etitle

    # Round floats
    for d in [by_subject, by_event]:
        for k in d:
            d[k]["realized_pnl"] = round(d[k]["realized_pnl"], 2)
            d[k]["unrealized_exposure"] = round(d[k]["unrealized_exposure"], 2)

    return {
        "by_subject": {k: dict(v) for k, v in sorted(by_subject.items())},
        "by_event": {k: dict(v) for k, v in sorted(by_event.items())},
    }


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

    # Find ledger for this profile
    ledger_matches = sorted(glob.glob(os.path.join(ledger_dir, f"ledger_*_{profile_id}.json")))
    ledger_path = ledger_matches[-1] if ledger_matches else None
    trade_stats = {
        "total_trades": 0, "open_trades": 0,
        "wins": 0, "losses": 0, "expired": 0, "cancelled": 0,
        "win_rate_pct": 0.0,
        "realized_pnl": 0.0, "unrealized_exposure": 0.0,
        "total_pnl": 0.0, "open_exposure": 0.0,
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

            realized_pnl = sum(t.get("pnl", 0) or 0 for t in closed_trades)
            open_exposure = sum(t.get("stake", 0) for t in open_trades)

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
                "realized_pnl": round(realized_pnl, 2),
                "unrealized_exposure": round(open_exposure, 2),
                "total_pnl": round(realized_pnl, 2),
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


def build_alerts(data_dir, profiles, totals):
    """Build alert flags for the pipeline report."""
    alerts = []

    # Zero relevant markets
    norm_dir = os.path.join(data_dir, "normalized")
    latest_files = sorted(glob.glob(os.path.join(norm_dir, "relevant_markets_*.json")))
    if latest_files:
        try:
            with open(latest_files[-1]) as f:
                markets = json.load(f)
            if len(markets) == 0:
                alerts.append({
                    "level": "warning",
                    "message": "Zero relevant markets found in latest fetch",
                })
        except Exception:
            alerts.append({
                "level": "error",
                "message": "Failed to read latest relevant markets file",
            })
    else:
        alerts.append({
            "level": "warning",
            "message": "No relevant markets file found — fetch may not have run",
        })

    # New trades opened this cycle
    total_new = sum(p["trades"]["open_trades"] for p in profiles)
    if total_new > 0:
        alerts.append({
            "level": "info",
            "message": f"{total_new} open trades across all profiles",
        })

    # Resolutions
    total_resolved = sum(
        p["trades"]["wins"] + p["trades"]["losses"] + p["trades"]["expired"]
        for p in profiles
    )
    if total_resolved > 0:
        wins = totals["wins"]
        losses = totals["losses"]
        alerts.append({
            "level": "info",
            "message": f"{total_resolved} trades resolved ({wins}W/{losses}L)",
        })

    # No signals at all
    if totals["signals_evaluated"] == 0:
        alerts.append({
            "level": "warning",
            "message": "No signals evaluated — pipeline may have no input data",
        })

    return alerts


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
    total_realized = sum(p["trades"]["realized_pnl"] for p in profiles)
    total_exposure = sum(p["trades"]["unrealized_exposure"] for p in profiles)

    definitive = total_wins + total_losses
    overall_win_rate = (total_wins / definitive * 100) if definitive else 0.0

    totals = {
        "signals_evaluated": total_signals,
        "total_trades": total_trades,
        "open_trades": total_open,
        "wins": total_wins,
        "losses": total_losses,
        "win_rate_pct": round(overall_win_rate, 1),
        "realized_pnl": round(total_realized, 2),
        "unrealized_exposure": round(total_exposure, 2),
        "total_pnl": round(total_realized, 2),
        "open_exposure": round(total_exposure, 2),
    }

    # Build breakdowns
    signal_breakdowns = build_signal_breakdowns(data_dir)
    trade_breakdowns = build_trade_breakdowns(data_dir)

    # Build bracket-position breakdowns
    families_lookup = build_family_lookup(data_dir)
    bracket_breakdowns = build_bracket_position_breakdowns(data_dir, families_lookup)

    # Build Strategy B progress
    strategy_b = build_strategy_b_progress(totals, families_lookup)

    # Build alerts
    alerts = build_alerts(data_dir, profiles, totals)

    # Build compact operator summary
    operator_summary = {
        "total_families": len(families_lookup),
        "total_brackets_evaluated": totals["signals_evaluated"],
        "active_trades": totals["open_trades"],
        "realized_pnl": totals["realized_pnl"],
        "unrealized_exposure": totals["unrealized_exposure"],
        "definitive_outcomes": totals["wins"] + totals["losses"],
        "win_rate_pct": totals["win_rate_pct"],
        "strategy_b_status": strategy_b["recommendation"],
        "position_coverage": {
            k: bracket_breakdowns["signals_by_position"].get(k, {}).get("trade", 0)
            for k in ["hot", "adjacent", "tail"]
        },
    }

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "provenance": "SIMULATED",
        "profiles": profiles,
        "totals": totals,
        "operator_summary": operator_summary,
        "breakdowns": {
            "signals": signal_breakdowns,
            "trades": trade_breakdowns,
            "bracket_position": bracket_breakdowns,
        },
        "strategy_b_progress": strategy_b,
        "alerts": alerts,
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
        print(f"    Realized P&L:  ${t['realized_pnl']:.2f}")
        print(f"    Open exposure: ${t['unrealized_exposure']:.2f}")
        print(f"    Avg resolution: {avg_str}")

    tot = summary["totals"]
    print(f"\n  TOTALS")
    print(f"    {tot['total_trades']} trades, {tot['open_trades']} open")
    print(f"    {tot['wins']}W / {tot['losses']}L  →  {tot['win_rate_pct']}% win rate")
    print(f"    Realized P&L: ${tot['realized_pnl']:.2f}")
    print(f"    Open exposure: ${tot['unrealized_exposure']:.2f}")

    # Print breakdowns
    print(f"\n  SIGNALS BY SUBJECT")
    for subj, counts in signal_breakdowns["by_subject"].items():
        print(f"    {subj}: {counts.get('trade',0)}T / {counts.get('watch',0)}W / {counts.get('skip',0)}S")

    print(f"\n  SIGNALS BY SKIP REASON")
    for reason, count in signal_breakdowns["by_skip_reason"].items():
        print(f"    {reason}: {count}")

    # Print bracket position breakdowns
    print(f"\n  SIGNALS BY BRACKET POSITION")
    for pos, counts in bracket_breakdowns["signals_by_position"].items():
        print(f"    {pos}: {counts.get('trade',0)}T / {counts.get('watch',0)}W / {counts.get('skip',0)}S")

    print(f"\n  TRADES BY BRACKET POSITION")
    for pos, stats in bracket_breakdowns["trades_by_position"].items():
        rpnl = stats.get("realized_pnl", 0)
        print(f"    {pos}: {stats['total']} trades ({stats['open']} open, "
              f"{stats.get('won',0)}W/{stats.get('lost',0)}L) "
              f"realized=${rpnl:.2f} exposure=${stats.get('unrealized_exposure',0):.2f}")

    print(f"\n  STRATEGY B PROGRESS")
    print(f"    Status: {strategy_b['recommendation']}")
    print(f"    Criteria met: {strategy_b['criteria_met']}/{strategy_b['criteria_total']}")
    for c in strategy_b["criteria"]:
        mark = "[x]" if c["met"] else "[ ]"
        print(f"    {mark} {c['criterion']} (current: {c['current']}, target: {c['target']})")

    # Print alerts
    if alerts:
        print(f"\n  ALERTS")
        for a in alerts:
            print(f"    [{a['level'].upper()}] {a['message']}")

    print(f"{'='*60}")


if __name__ == "__main__":
    main()
