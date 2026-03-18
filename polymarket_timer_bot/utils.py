"""Shared utilities used across pipeline scripts."""

import glob
import os


def find_latest_file(directory: str, prefix: str) -> str | None:
    """Find the most recent file matching a prefix in a directory.

    Files are sorted lexicographically, so timestamped filenames
    (e.g. relevant_markets_20260318_102423.json) naturally sort by time.

    Returns the full path to the latest file, or None if no match.
    """
    pattern = os.path.join(directory, f"{prefix}*.json")
    files = sorted(glob.glob(pattern))
    return files[-1] if files else None
