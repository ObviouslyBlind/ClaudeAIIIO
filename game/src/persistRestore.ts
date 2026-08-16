/** Load the last PAPER shard blob into the live world/visitor/land. Not Postgres. Does not restart play. */

import type { LandBoard } from "./land.ts";
import { restoreShard } from "./persist.ts";
import type { Visitor, World } from "./sim.ts";

export const RESTORE_NOTE =
  "PAPER restore of last in-memory shard blob. SIMULATED. Not Postgres. Does not restart play.";

export type GetLastBlob = () => unknown;

export type LiveSetters = {
  setWorld: (world: World) => void;
  setLand: (land: LandBoard) => void;
  setVisitor: (visitor: Visitor) => void;
};

export type RestoreLiveOk = {
  ok: true;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type RestoreLiveFail = {
  ok: false;
  reason: string;
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
};

export type RestoreLiveResult = RestoreLiveOk | RestoreLiveFail;

function fail(reason: string): RestoreLiveFail {
  return { ok: false, reason, mode: "PAPER", provenance: "SIMULATED", note: RESTORE_NOTE };
}

/**
 * Read the last PAPER persist blob and seat it on the live world/visitor/land.
 * Rejects no_blob. Does not talk to Postgres. Does not restart play.
 */
export function restoreLive(getLastBlob: GetLastBlob, setters: LiveSetters): RestoreLiveResult {
  const blob = getLastBlob();
  if (blob == null) return fail("no_blob");

  const restored = restoreShard(blob);
  if (!restored.ok) return fail(restored.reason);

  setters.setWorld(restored.world);
  setters.setLand(restored.land);
  setters.setVisitor(restored.visitor);

  return { ok: true, mode: "PAPER", provenance: "SIMULATED", note: RESTORE_NOTE };
}
