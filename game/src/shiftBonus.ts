/**
 * Client-side cart pack shift. The sim already sold; this only pays a small
 * PAPER bonus. Disconnect or a missed tap never cuts output.
 */

export const PACK_NOTE =
  "Client-side cart pack. The stall already ran. PAPER bonus only. SIMULATED.";
export const PACK_BONUS_PER_HIT = 0.5;
export const PACK_MAX_HITS = 24;
export const PACK_COOLDOWN_MS = 60_000;

export type PackHolder = {
  cash: number;
  lastPackAtMs?: number;
  play?: {
    stands: { id: string; boostLeft?: number }[];
    workSites?: { id: string; boostLeft?: number }[];
  };
};

export type PackOk = {
  ok: true;
  hits: number;
  bonus: number;
  cash: number;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type PackFail = {
  ok: false;
  reason: string;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type PackResult = PackOk | PackFail;

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function fail(reason: string): PackFail {
  return { ok: false, reason, mode: "PAPER", provenance: "SIMULATED", note: PACK_NOTE };
}

/**
 * Pay a capped PAPER bonus for a finished pack shift. Hits are clamped.
 * Cooldown is 60s. Never trusted as production. Optional standId speeds
 * the next sales on that site; hired AI still sells if the player skips.
 */
export function completePackShift(
  visitor: PackHolder,
  body: { hits?: unknown; nowMs?: unknown; standId?: unknown } = {},
): PackResult {
  const now = Number(body.nowMs);
  const at = Number.isFinite(now) ? now : Date.now();
  const last = Number(visitor.lastPackAtMs) || 0;
  if (last && at - last < PACK_COOLDOWN_MS) return fail("cooldown");
  const raw = Math.floor(Number(body.hits));
  if (!Number.isFinite(raw) || raw < 0) return fail("bad_hits");
  const hits = Math.max(0, Math.min(PACK_MAX_HITS, raw));
  const bonus = roundMoney(hits * PACK_BONUS_PER_HIT);
  visitor.cash = roundMoney(Number(visitor.cash) + bonus);
  visitor.lastPackAtMs = at;
  const standId = typeof body.standId === "string" ? body.standId : "";
  if (standId && visitor.play) {
    const row =
      visitor.play.stands.find((s) => s.id === standId) ||
      (visitor.play.workSites || []).find((s) => s.id === standId);
    if (row) row.boostLeft = Math.min(40, (Number(row.boostLeft) || 0) + hits);
  }
  return {
    ok: true,
    hits,
    bonus,
    cash: visitor.cash,
    mode: "PAPER",
    provenance: "SIMULATED",
    note: PACK_NOTE,
  };
}
