"""Run context: durable attribution and history for pipeline runs.

Each pipeline run (fetch → signals → papertrade → resolve) is captured
as a RunRecord stored in data/runs/. This enables:
  - Attributing results to a specific strategy + profile combination
  - Comparing runs across time
  - Reviewing what happened without relying on memory
  - Supporting future shorter-interval testing
"""

import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class RunRecord:
    """Metadata for a single pipeline run."""

    run_id: str
    strategy_id: str
    strategy_version: str
    profile_id: str
    input_snapshot: str  # filename of the relevant_markets_*.json used
    created_at: str  # ISO timestamp when the run was created

    # Filled as pipeline stages complete
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

    # Summary metrics (filled after signals + papertrade)
    markets_evaluated: int = 0
    signals_trade: int = 0
    signals_watch: int = 0
    signals_skip: int = 0
    trades_opened: int = 0
    trades_resolved: int = 0
    trades_open: int = 0
    trades_won: int = 0
    trades_lost: int = 0
    trades_expired: int = 0
    total_pnl: float = 0.0
    open_exposure: float = 0.0

    # Output file references
    signals_file: str = ""
    ledger_file: str = ""

    # Provenance
    provenance: str = "SIMULATED"

    def to_dict(self) -> dict:
        return {
            "run_id": self.run_id,
            "strategy_id": self.strategy_id,
            "strategy_version": self.strategy_version,
            "profile_id": self.profile_id,
            "input_snapshot": self.input_snapshot,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "markets_evaluated": self.markets_evaluated,
            "signals_trade": self.signals_trade,
            "signals_watch": self.signals_watch,
            "signals_skip": self.signals_skip,
            "trades_opened": self.trades_opened,
            "trades_resolved": self.trades_resolved,
            "trades_open": self.trades_open,
            "trades_won": self.trades_won,
            "trades_lost": self.trades_lost,
            "trades_expired": self.trades_expired,
            "total_pnl": self.total_pnl,
            "open_exposure": self.open_exposure,
            "signals_file": self.signals_file,
            "ledger_file": self.ledger_file,
            "provenance": self.provenance,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "RunRecord":
        return cls(
            run_id=d["run_id"],
            strategy_id=d["strategy_id"],
            strategy_version=d["strategy_version"],
            profile_id=d["profile_id"],
            input_snapshot=d.get("input_snapshot", ""),
            created_at=d["created_at"],
            started_at=d.get("started_at"),
            completed_at=d.get("completed_at"),
            markets_evaluated=d.get("markets_evaluated", 0),
            signals_trade=d.get("signals_trade", 0),
            signals_watch=d.get("signals_watch", 0),
            signals_skip=d.get("signals_skip", 0),
            trades_opened=d.get("trades_opened", 0),
            trades_resolved=d.get("trades_resolved", 0),
            trades_open=d.get("trades_open", 0),
            trades_won=d.get("trades_won", 0),
            trades_lost=d.get("trades_lost", 0),
            trades_expired=d.get("trades_expired", 0),
            total_pnl=d.get("total_pnl", 0.0),
            open_exposure=d.get("open_exposure", 0.0),
            signals_file=d.get("signals_file", ""),
            ledger_file=d.get("ledger_file", ""),
            provenance=d.get("provenance", "SIMULATED"),
        )


def create_run_id() -> str:
    """Generate a short, unique run ID."""
    return datetime.utcnow().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:6]


class RunStore:
    """Simple JSON-file store for run records in data/runs/."""

    def __init__(self, runs_dir: str):
        self.runs_dir = runs_dir
        os.makedirs(runs_dir, exist_ok=True)
        self._index_path = os.path.join(runs_dir, "index.json")

    def _load_index(self) -> list[dict]:
        if os.path.exists(self._index_path):
            with open(self._index_path) as f:
                return json.load(f)
        return []

    def _save_index(self, records: list[dict]):
        with open(self._index_path, "w") as f:
            json.dump(records, f, indent=2)

    def save_run(self, run: RunRecord):
        """Save a run record. Also saves a standalone file for each run."""
        # Save individual run file
        run_file = os.path.join(self.runs_dir, f"run_{run.run_id}.json")
        with open(run_file, "w") as f:
            json.dump(run.to_dict(), f, indent=2)

        # Update index
        records = self._load_index()
        # Replace existing or append
        updated = False
        for i, r in enumerate(records):
            if r["run_id"] == run.run_id:
                records[i] = run.to_dict()
                updated = True
                break
        if not updated:
            records.append(run.to_dict())
        self._save_index(records)

        logger.info("Saved run %s to %s", run.run_id, run_file)

    def load_all(self) -> list[RunRecord]:
        """Load all run records from the index."""
        records = self._load_index()
        return [RunRecord.from_dict(r) for r in records]

    def load_run(self, run_id: str) -> Optional[RunRecord]:
        """Load a single run by ID."""
        for r in self._load_index():
            if r["run_id"] == run_id:
                return RunRecord.from_dict(r)
        return None
