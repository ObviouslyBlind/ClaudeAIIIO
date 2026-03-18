"""Data models for Polymarket markets."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Token:
    """A single outcome token in a market (e.g., YES or NO)."""

    token_id: str
    outcome: str
    price: float
    winner: Optional[bool] = None


@dataclass
class Market:
    """A Polymarket prediction market."""

    condition_id: str
    question: str
    slug: str
    end_date: Optional[datetime]
    active: bool
    closed: bool
    tokens: list[Token] = field(default_factory=list)
    description: str = ""
    category: str = ""
    volume: float = 0.0
    liquidity: float = 0.0

    # Event/group fields (set during event-based ingestion)
    event_slug: str = ""  # Parent event slug (e.g. "elon-musk-of-tweets-march-19-march-21")
    event_title: str = ""  # Parent event title (e.g. "Elon Musk # tweets March 19 - March 21, 2026?")
    event_id: str = ""  # Polymarket event ID
    bracket_label: str = ""  # Bracket label (e.g. "65-89", "<40", "200+")
    neg_risk_market_id: str = ""  # Shared neg-risk group ID linking all brackets in an event
    resolution_source: str = ""  # Official resolution source URL

    # Classification fields (set by classifier)
    market_type: str = ""  # "musk_posting", "trump_posting", or ""
    is_timer_market: bool = False  # True if it's a "will X happen by date?" market

    @property
    def no_price(self) -> Optional[float]:
        """Price of the NO token, if available."""
        for token in self.tokens:
            if token.outcome.upper() == "NO":
                return token.price
        return None

    @property
    def yes_price(self) -> Optional[float]:
        """Price of the YES token, if available."""
        for token in self.tokens:
            if token.outcome.upper() == "YES":
                return token.price
        return None

    @property
    def hours_until_expiry(self) -> Optional[float]:
        """Hours until market end date, or None if no end date."""
        if self.end_date is None:
            return None
        delta = self.end_date - datetime.utcnow()
        return delta.total_seconds() / 3600

    @classmethod
    def from_dict(cls, d: dict) -> "Market":
        """Reconstruct a Market from a dict (inverse of to_dict)."""
        end_date = None
        if d.get("end_date"):
            try:
                end_date = datetime.fromisoformat(d["end_date"])
            except (ValueError, TypeError):
                pass

        tokens = []
        for t in d.get("tokens", []):
            tokens.append(Token(
                token_id=t.get("token_id", ""),
                outcome=t.get("outcome", ""),
                price=float(t.get("price", 0)),
                winner=t.get("winner"),
            ))

        return cls(
            condition_id=d.get("condition_id", ""),
            question=d.get("question", ""),
            slug=d.get("slug", ""),
            end_date=end_date,
            active=d.get("active", False),
            closed=d.get("closed", False),
            tokens=tokens,
            description=d.get("description", ""),
            category=d.get("category", ""),
            volume=float(d.get("volume", 0) or 0),
            liquidity=float(d.get("liquidity", 0) or 0),
            event_slug=d.get("event_slug", ""),
            event_title=d.get("event_title", ""),
            event_id=d.get("event_id", ""),
            bracket_label=d.get("bracket_label", ""),
            neg_risk_market_id=d.get("neg_risk_market_id", ""),
            resolution_source=d.get("resolution_source", ""),
            market_type=d.get("market_type", ""),
            is_timer_market=d.get("is_timer_market", False),
        )

    def to_dict(self) -> dict:
        """Convert to a plain dict for JSON serialization."""
        return {
            "condition_id": self.condition_id,
            "question": self.question,
            "slug": self.slug,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "active": self.active,
            "closed": self.closed,
            "tokens": [
                {
                    "token_id": t.token_id,
                    "outcome": t.outcome,
                    "price": t.price,
                    "winner": t.winner,
                }
                for t in self.tokens
            ],
            "description": self.description,
            "category": self.category,
            "volume": self.volume,
            "liquidity": self.liquidity,
            "event_slug": self.event_slug,
            "event_title": self.event_title,
            "event_id": self.event_id,
            "bracket_label": self.bracket_label,
            "neg_risk_market_id": self.neg_risk_market_id,
            "resolution_source": self.resolution_source,
            "market_type": self.market_type,
            "is_timer_market": self.is_timer_market,
            "no_price": self.no_price,
            "yes_price": self.yes_price,
            "hours_until_expiry": self.hours_until_expiry,
        }


@dataclass
class MarketFamily:
    """A grouped event containing bracket sub-markets (e.g. tweet-count ranges).

    Preserves parent event identity and links all child bracket markets.
    """

    event_id: str
    event_slug: str
    event_title: str
    end_date: Optional[datetime]
    resolution_source: str
    series_slug: str
    neg_risk_market_id: str
    active: bool
    closed: bool
    brackets: list[Market] = field(default_factory=list)

    # Classification (event-level)
    market_type: str = ""
    is_timer_market: bool = False

    def to_dict(self) -> dict:
        return {
            "event_id": self.event_id,
            "event_slug": self.event_slug,
            "event_title": self.event_title,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "resolution_source": self.resolution_source,
            "series_slug": self.series_slug,
            "neg_risk_market_id": self.neg_risk_market_id,
            "active": self.active,
            "closed": self.closed,
            "market_type": self.market_type,
            "is_timer_market": self.is_timer_market,
            "bracket_count": len(self.brackets),
            "brackets": [m.to_dict() for m in self.brackets],
        }
