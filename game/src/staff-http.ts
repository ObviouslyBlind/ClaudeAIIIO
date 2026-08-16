/** POST /api/staff — hire/fire PAPER AI slots. SIMULATED. Not live. */

import { getPlot, landSnapshot, type LandBoard } from "./land.ts";
import type { Visitor } from "./sim.ts";
import {
  STAFF_NOTE,
  fireStaff,
  hireStaff,
  staffSnapshot,
  type StaffResult,
} from "./staff.ts";

export type StaffAction = "hire" | "fire";

export type StaffHttpBody = {
  plotId?: unknown;
  action?: unknown;
};

export type StaffHttpResult = StaffResult & {
  mode: "PAPER";
  provenance: "SIMULATED";
  note: string;
  snapshot: ReturnType<typeof staffMapSnapshot>;
};

/** Land map plus staffSlots. PAPER / SIMULATED. */
export function staffMapSnapshot(land: LandBoard, visitor: Visitor) {
  const snap = landSnapshot(land, visitor);
  const staff = staffSnapshot(visitor);
  return {
    ...snap,
    staffSlots: staff.staffSlots,
    visitor: {
      ...snap.visitor,
      staffSlots: staff.staffSlots,
    },
  };
}

function wrap(
  result: StaffResult,
  land: LandBoard,
  visitor: Visitor,
): StaffHttpResult {
  return {
    ...result,
    mode: "PAPER",
    provenance: "SIMULATED",
    note: STAFF_NOTE,
    snapshot: staffMapSnapshot(land, visitor),
  };
}

function parseAction(raw: unknown): StaffAction | null {
  const action = String(raw ?? "").trim();
  if (action === "hire" || action === "fire") return action;
  return null;
}

/**
 * Hire or fire one PAPER AI slot on a developed visitor plot.
 * Uses visitor PAPER cash (hire rejects no_cash). Not a wallet.
 */
export function postStaff(
  land: LandBoard,
  visitor: Visitor,
  body: StaffHttpBody | null,
): StaffHttpResult {
  const fail = (reason: string) =>
    wrap({ ok: false, reason }, land, visitor);

  if (!body || typeof body !== "object") return fail("bad_json");

  const action = parseAction(body.action);
  if (!action) return fail("bad_action");

  const plotId = String(body.plotId ?? "").trim();
  const plot = getPlot(land, plotId);
  if (!plot) return fail("no_plot");

  const result =
    action === "hire" ? hireStaff(visitor, plot) : fireStaff(visitor, plot);
  return wrap(result, land, visitor);
}
