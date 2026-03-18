"""Config loader for known event patterns."""

import json
import os

_CONFIG_DIR = os.path.dirname(os.path.abspath(__file__))
_PATTERNS_FILE = os.path.join(_CONFIG_DIR, "known_event_patterns.json")


def load_known_patterns() -> dict:
    """Load the known event patterns config."""
    with open(_PATTERNS_FILE) as f:
        return json.load(f)


def get_exact_slugs() -> list[str]:
    """Return the list of exact event slugs to look up."""
    return load_known_patterns().get("exact_slugs", [])


def get_direct_urls() -> list[str]:
    """Return the list of direct Polymarket URLs."""
    return load_known_patterns().get("direct_urls", [])


def get_series() -> list[dict]:
    """Return the list of known series patterns."""
    return load_known_patterns().get("series", [])
