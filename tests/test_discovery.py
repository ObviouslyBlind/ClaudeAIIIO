"""Integration tests for event-based discovery paths."""

from polymarket_timer_bot.adapters.polymarket import (
    _is_posting_count_event,
    extract_slug_from_url,
)
from polymarket_timer_bot.config import get_direct_urls, get_exact_slugs, get_series


# --- Config loader tests ---


def test_config_loads_exact_slugs():
    slugs = get_exact_slugs()
    assert isinstance(slugs, list)
    assert len(slugs) >= 2
    assert any("elon-musk" in s for s in slugs)
    assert any("trump" in s for s in slugs)


def test_config_loads_direct_urls():
    urls = get_direct_urls()
    assert isinstance(urls, list)
    assert all("polymarket.com" in u for u in urls)


def test_config_loads_series():
    series = get_series()
    assert isinstance(series, list)
    assert len(series) >= 2
    slugs = {s["series_slug"] for s in series}
    assert "elon-tweets-48h" in slugs or "elon-tweet-daily" in slugs
    assert "trump-truth-social" in slugs


# --- URL → slug → event round-trip tests ---


def test_url_to_slug_roundtrip():
    urls = get_direct_urls()
    for url in urls:
        slug = extract_slug_from_url(url)
        assert slug is not None, f"Failed to extract slug from {url}"
        assert len(slug) > 5


def test_url_slug_matches_exact_slugs():
    """Direct URLs should produce slugs that are in the exact_slugs list."""
    urls = get_direct_urls()
    exact = set(get_exact_slugs())
    for url in urls:
        slug = extract_slug_from_url(url)
        assert slug in exact, f"URL slug '{slug}' not in exact_slugs registry"


# --- Client-side event filter tests ---


def test_filter_musk_tweet_event():
    assert _is_posting_count_event("elon musk # tweets march 19 - march 21", [])


def test_filter_trump_truth_event():
    assert _is_posting_count_event("donald trump # truth social posts march 17 - march 24", [])


def test_filter_rejects_unrelated():
    assert not _is_posting_count_event("bitcoin etf inflows march 2026", [])


def test_filter_rejects_person_only():
    assert not _is_posting_count_event("will elon musk visit mars by 2030", [])


def test_filter_rejects_posting_only():
    assert not _is_posting_count_event("daily tweets on crypto march 2026", [])


# --- Known slug discovery path tests ---


def test_known_slugs_are_well_formed():
    """Known slugs should look like valid Polymarket event slugs."""
    for slug in get_exact_slugs():
        assert "/" not in slug
        assert " " not in slug
        assert slug == slug.lower()
