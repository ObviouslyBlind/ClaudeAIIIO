/**
 * Alpha play contract. Harbour spawn is a fresh visitor.
 * PAPER / SIMULATED. Not a durable account. Restore is refused.
 */

export const ALPHA_PLAY_WIPE = true;

export const ALPHA_WIPE_NOTE =
  "Alpha: harbour spawn is a fresh visitor. PAPER restore of lastBlob is refused. SIMULATED.";

export function alphaRestoreBlocked(): boolean {
  return ALPHA_PLAY_WIPE;
}

export function alphaRestoreRefuse(): {
  ok: false;
  reason: "alpha_wipe";
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
} {
  return {
    ok: false,
    reason: "alpha_wipe",
    mode: "PAPER",
    provenance: "SIMULATED",
    note: ALPHA_WIPE_NOTE,
  };
}
