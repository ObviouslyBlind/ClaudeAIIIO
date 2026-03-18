"""Export latest data files into dashboard/data/ for the HTML dashboard."""

import glob
import json
import logging
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def find_latest_file(directory: str, prefix: str) -> str | None:
    pattern = os.path.join(directory, f"{prefix}*.json")
    files = sorted(glob.glob(pattern))
    return files[-1] if files else None


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(root, "data")
    dash_data = os.path.join(root, "dashboard", "data")
    os.makedirs(dash_data, exist_ok=True)

    exports = {
        "markets.json": find_latest_file(os.path.join(data_dir, "normalized"), "all_markets_"),
        "relevant.json": find_latest_file(os.path.join(data_dir, "normalized"), "relevant_markets_"),
        "signals.json": find_latest_file(os.path.join(data_dir, "signals"), "signals_"),
        "ledger.json": os.path.join(data_dir, "ledger", "ledger.json"),
    }

    for dest_name, src_path in exports.items():
        dest_path = os.path.join(dash_data, dest_name)
        if src_path and os.path.exists(src_path):
            shutil.copy2(src_path, dest_path)
            logger.info("Exported %s → %s", os.path.basename(src_path), dest_name)
        else:
            # Write empty array so dashboard doesn't error
            with open(dest_path, "w") as f:
                json.dump([], f)
            logger.info("No data for %s, wrote empty file", dest_name)

    print(f"\nDashboard data exported to: {dash_data}")
    print(f"Open dashboard/index.html in a browser to view.")


if __name__ == "__main__":
    main()
