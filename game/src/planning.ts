/** Planning applications. Fail does not place. Pass starts the queue. PAPER. */

export type PlanningStatus = "queued" | "passed" | "failed" | "waiting_quorum";

export type PlanningApplication = {
  id: string;
  plotId: string;
  use: string;
  owners: string[];
  status: PlanningStatus;
  feePaid: number;
  provenance: "PAPER";
};

export function createPlanningBoard(): { apps: PlanningApplication[]; nextId: number } {
  return { apps: [], nextId: 1 };
}

export function fileApplication(
  _board: { apps: PlanningApplication[]; nextId: number },
  _input: { plotId: string; use: string; owners: string[]; feePaid: number },
): { ok: false; reason: string } {
  return { ok: false, reason: "not_wired" };
}
