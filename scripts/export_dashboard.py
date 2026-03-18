"""Export latest data files into dashboard/data/ for the HTML dashboard.

Exports:
  - relevant.json: latest relevant markets
  - families.json: latest event families
  - signals_*.json: per-profile signal outputs
  - ledger_*.json: per-profile ledger files
  - runs.json: run history index
  - meta.json: data freshness metadata (file mtimes)
"""

import glob
import json
import logging
import os
import shutil
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def find_latest_file(directory: str, prefix: str) -> str | None:
    pattern = os.path.join(directory, f"{prefix}*.json")
    files = sorted(glob.glob(pattern))
    return files[-1] if files else None


def file_mtime_iso(path: str) -> str | None:
    """Return the file's modification time as ISO string, or None."""
    if path and os.path.exists(path):
        mtime = os.path.getmtime(path)
        return datetime.utcfromtimestamp(mtime).isoformat() + "Z"
    return None


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(root, "data")
    dash_data = os.path.join(root, "dashboard", "data")
    os.makedirs(dash_data, exist_ok=True)

    meta = {"exported_at": datetime.utcnow().isoformat() + "Z", "sources": {}}

    # --- Single-file exports ---
    single_exports = {
        "relevant.json": find_latest_file(os.path.join(data_dir, "normalized"), "relevant_markets_"),
        "families.json": find_latest_file(os.path.join(data_dir, "normalized"), "families_"),
    }

    for dest_name, src_path in single_exports.items():
        dest_path = os.path.join(dash_data, dest_name)
        if src_path and os.path.exists(src_path):
            shutil.copy2(src_path, dest_path)
            meta["sources"][dest_name] = {
                "source_file": os.path.basename(src_path),
                "modified_at": file_mtime_iso(src_path),
                "status": "loaded",
            }
            logger.info("Exported %s → %s", os.path.basename(src_path), dest_name)
        else:
            with open(dest_path, "w") as f:
                json.dump([], f)
            meta["sources"][dest_name] = {"status": "missing", "source_file": None}
            logger.info("No data for %s, wrote empty file", dest_name)

    # --- Per-profile signal files ---
    signals_dir = os.path.join(data_dir, "signals")
    signal_files = sorted(glob.glob(os.path.join(signals_dir, "signals_*.json")))
    exported_signals = []
    for sf in signal_files:
        dest_name = os.path.basename(sf)
        shutil.copy2(sf, os.path.join(dash_data, dest_name))
        exported_signals.append(dest_name)
        logger.info("Exported signals: %s", dest_name)

    # Also write a combined signals list for backward compat
    if signal_files:
        # Use the latest signal file as "signals.json"
        shutil.copy2(signal_files[-1], os.path.join(dash_data, "signals.json"))
        meta["sources"]["signals.json"] = {
            "source_file": os.path.basename(signal_files[-1]),
            "modified_at": file_mtime_iso(signal_files[-1]),
            "status": "loaded",
        }
    else:
        with open(os.path.join(dash_data, "signals.json"), "w") as f:
            json.dump({"strategy": {}, "results": []}, f)
        meta["sources"]["signals.json"] = {"status": "missing"}

    # --- Per-profile ledger files ---
    ledger_dir = os.path.join(data_dir, "ledger")
    ledger_files = sorted(glob.glob(os.path.join(ledger_dir, "ledger*.json")))
    exported_ledgers = []
    for lf in ledger_files:
        dest_name = os.path.basename(lf)
        shutil.copy2(lf, os.path.join(dash_data, dest_name))
        exported_ledgers.append(dest_name)
        logger.info("Exported ledger: %s", dest_name)

    # Also write "ledger.json" as the default/combined for backward compat
    if ledger_files:
        shutil.copy2(ledger_files[-1], os.path.join(dash_data, "ledger.json"))
        meta["sources"]["ledger.json"] = {
            "source_file": os.path.basename(ledger_files[-1]),
            "modified_at": file_mtime_iso(ledger_files[-1]),
            "status": "loaded",
        }
    else:
        with open(os.path.join(dash_data, "ledger.json"), "w") as f:
            json.dump([], f)
        meta["sources"]["ledger.json"] = {"status": "missing"}

    # --- Run history ---
    runs_index = os.path.join(data_dir, "runs", "index.json")
    if os.path.exists(runs_index):
        shutil.copy2(runs_index, os.path.join(dash_data, "runs.json"))
        meta["sources"]["runs.json"] = {
            "source_file": "runs/index.json",
            "modified_at": file_mtime_iso(runs_index),
            "status": "loaded",
        }
    else:
        with open(os.path.join(dash_data, "runs.json"), "w") as f:
            json.dump([], f)
        meta["sources"]["runs.json"] = {"status": "missing"}

    # --- Write meta.json for dashboard freshness ---
    meta["signal_files"] = exported_signals
    meta["ledger_files"] = exported_ledgers
    with open(os.path.join(dash_data, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\nDashboard data exported to: {dash_data}")
    print(f"  Relevant markets: {'loaded' if single_exports['relevant.json'] else 'missing'}")
    print(f"  Families:         {'loaded' if single_exports['families.json'] else 'missing'}")
    print(f"  Signal files:     {len(exported_signals)}")
    print(f"  Ledger files:     {len(exported_ledgers)}")
    print(f"  Run history:      {'loaded' if os.path.exists(runs_index) else 'missing'}")
    print(f"  Meta:             meta.json")
    print(f"\nOpen dashboard/index.html via serve_dashboard.py to view.")


if __name__ == "__main__":
    main()
