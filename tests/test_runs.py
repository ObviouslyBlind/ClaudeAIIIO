"""Tests for run context and run store."""

import json
import os
import tempfile

from polymarket_timer_bot.runs import RunRecord, RunStore, create_run_id


def test_create_run_id_unique():
    """Run IDs should be unique."""
    ids = {create_run_id() for _ in range(10)}
    assert len(ids) == 10


def test_create_run_id_format():
    """Run ID should contain timestamp and short hex."""
    rid = create_run_id()
    parts = rid.split("_")
    assert len(parts) == 3  # date, time, hex
    assert len(parts[2]) == 6  # hex suffix


def test_run_record_roundtrip():
    """to_dict → from_dict preserves all fields."""
    r = RunRecord(
        run_id="test_123",
        strategy_id="no_side",
        strategy_version="1.0",
        profile_id="moderate",
        input_snapshot="relevant_markets_20260318.json",
        created_at="2026-03-18T10:00:00",
        markets_evaluated=50,
        signals_trade=5,
        signals_watch=10,
        signals_skip=35,
        trades_opened=3,
        total_pnl=-12.50,
    )
    d = r.to_dict()
    r2 = RunRecord.from_dict(d)
    assert r2.run_id == "test_123"
    assert r2.strategy_id == "no_side"
    assert r2.profile_id == "moderate"
    assert r2.markets_evaluated == 50
    assert r2.signals_trade == 5
    assert r2.total_pnl == -12.50


def test_run_store_save_and_load():
    with tempfile.TemporaryDirectory() as tmpdir:
        store = RunStore(tmpdir)

        r1 = RunRecord(
            run_id="run_001",
            strategy_id="no_side",
            strategy_version="1.0",
            profile_id="moderate",
            input_snapshot="snap.json",
            created_at="2026-03-18T10:00:00",
        )
        r2 = RunRecord(
            run_id="run_002",
            strategy_id="no_side",
            strategy_version="1.0",
            profile_id="conservative",
            input_snapshot="snap.json",
            created_at="2026-03-18T10:05:00",
        )

        store.save_run(r1)
        store.save_run(r2)

        # Load all
        runs = store.load_all()
        assert len(runs) == 2
        assert runs[0].run_id == "run_001"
        assert runs[1].run_id == "run_002"

        # Load single
        loaded = store.load_run("run_001")
        assert loaded is not None
        assert loaded.profile_id == "moderate"

        # Not found
        assert store.load_run("nonexistent") is None


def test_run_store_update_existing():
    """Saving a run with same ID should update, not duplicate."""
    with tempfile.TemporaryDirectory() as tmpdir:
        store = RunStore(tmpdir)
        r = RunRecord(
            run_id="run_001",
            strategy_id="no_side",
            strategy_version="1.0",
            profile_id="moderate",
            input_snapshot="snap.json",
            created_at="2026-03-18T10:00:00",
            trades_opened=0,
        )
        store.save_run(r)

        # Update
        r.trades_opened = 5
        r.total_pnl = 25.0
        store.save_run(r)

        runs = store.load_all()
        assert len(runs) == 1
        assert runs[0].trades_opened == 5
        assert runs[0].total_pnl == 25.0


def test_run_store_creates_individual_files():
    """Each run should also be saved as an individual file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        store = RunStore(tmpdir)
        r = RunRecord(
            run_id="run_xyz",
            strategy_id="no_side",
            strategy_version="1.0",
            profile_id="aggressive",
            input_snapshot="snap.json",
            created_at="2026-03-18T10:00:00",
        )
        store.save_run(r)

        run_file = os.path.join(tmpdir, "run_run_xyz.json")
        assert os.path.exists(run_file)
        with open(run_file) as f:
            data = json.load(f)
        assert data["run_id"] == "run_xyz"
        assert data["profile_id"] == "aggressive"
