import { describe, expect, it } from "vitest";
import {
  AI_SLOTS_BY_CLASS,
  JOB_CAP,
  JOB_RANKS,
  OUTPUT_PER_AI_SLOT,
  SHIFT_BONUS,
  abortShift,
  closeHiringPool,
  completeShift,
  createLabourBoard,
  disconnect,
  jobsHeld,
  millOutput,
  openHiringPool,
  registerSite,
  takeShift,
} from "./labour.ts";

function millBoard(hiringPoolOpen = false) {
  const board = createLabourBoard();
  const result = registerSite(board, { id: "mill-1", siteClass: "mill", hiringPoolOpen });
  return { board, result };
}

function openMill(board = createLabourBoard(), id = "mill-1") {
  registerSite(board, { id, siteClass: "mill" });
  openHiringPool(board, id);
  return board;
}

describe("PAPER labour board step E2", () => {
  it("lists five job ranks and a 3-job cap", () => {
    expect(JOB_RANKS).toEqual(["worker", "miller", "clerk", "manager", "officer"]);
    expect(JOB_RANKS).toHaveLength(5);
    expect(JOB_CAP).toBe(3);
  });

  it("fills AI worker slots on register even with the hiring pool closed", () => {
    const { board, result } = millBoard(false);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.site.hiringPoolOpen).toBe(false);
    expect(result.site.aiSlots).toBe(AI_SLOTS_BY_CLASS.mill);
    expect(result.site.aiFilled).toBe(result.site.aiSlots);
    expect(result.site.aiOutput).toBe(true);
    expect(result.site.output).toBe(AI_SLOTS_BY_CLASS.mill * OUTPUT_PER_AI_SLOT);
    expect(millOutput(board, "mill-1")).toBe(result.site.output);
    expect(board.mode).toBe("PAPER");
    expect(board.provenance).toBe("SIMULATED");
  });

  it("keeps mill AI output when no human takes a shift", () => {
    const { board, result } = millBoard(false);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const before = millOutput(board, "mill-1");
    expect(jobsHeld(board, "ada")).toBe(0);
    expect(millOutput(board, "mill-1")).toBe(before);
    expect(result.site.aiFilled).toBe(result.site.aiSlots);
    expect(result.site.aiOutput).toBe(true);
  });

  it("blocks human shifts while the hiring pool is closed, then allows takeShift", () => {
    const board = createLabourBoard();
    registerSite(board, { id: "mill-1", siteClass: "mill" });
    const closed = takeShift(board, { playerId: "ada", siteId: "mill-1", rank: "miller" });
    expect(closed.ok).toBe(false);
    if (closed.ok) return;
    expect(closed.reason).toBe("pool_closed");
    expect(closed.reason).not.toBe("not_wired");

    openHiringPool(board, "mill-1");
    const taken = takeShift(board, { playerId: "ada", siteId: "mill-1", rank: "miller" });
    expect(taken.ok).toBe(true);
    if (!taken.ok) return;
    expect(taken.shift.status).toBe("active");
    expect(taken.shift.rank).toBe("miller");
    expect(taken.shift.bonusPaid).toBe(0);
    expect(taken.aiOutput).toBe(true);
    expect(taken.shift.mode).toBe("PAPER");
    expect(taken.shift.provenance).toBe("SIMULATED");
    expect(jobsHeld(board, "ada")).toBe(1);
  });

  it("pays a PAPER shift bonus only on completeShift", () => {
    const board = openMill();
    const player = { cash: 10 };
    const taken = takeShift(board, { playerId: "ada", siteId: "mill-1", rank: "miller" });
    expect(taken.ok).toBe(true);
    const done = completeShift(board, { playerId: "ada", siteId: "mill-1", player });
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.shift.status).toBe("completed");
    expect(done.bonusPaid).toBe(SHIFT_BONUS);
    expect(done.shift.bonusPaid).toBe(SHIFT_BONUS);
    expect(player.cash).toBeCloseTo(10 + SHIFT_BONUS, 4);
    expect(done.aiOutput).toBe(true);
    expect(millOutput(board, "mill-1")).toBe(AI_SLOTS_BY_CLASS.mill * OUTPUT_PER_AI_SLOT);
  });

  it("pays nothing on abortShift and leaves mill AI output unchanged", () => {
    const board = openMill();
    const player = { cash: 0 };
    const before = millOutput(board, "mill-1");
    takeShift(board, { playerId: "ada", siteId: "mill-1", rank: "worker" });
    const aborted = abortShift(board, { playerId: "ada", siteId: "mill-1", player });
    expect(aborted.ok).toBe(true);
    if (!aborted.ok) return;
    expect(aborted.shift.status).toBe("aborted");
    expect(aborted.bonusPaid).toBe(0);
    expect(aborted.shift.bonusPaid).toBe(0);
    expect(player.cash).toBe(0);
    expect(aborted.aiOutput).toBe(true);
    expect(millOutput(board, "mill-1")).toBe(before);
  });

  it("on disconnect mid-shift does not pay the bonus and does not change mill output", () => {
    const board = openMill();
    const player = { cash: 0 };
    const before = millOutput(board, "mill-1");
    const taken = takeShift(board, { playerId: "ada", siteId: "mill-1", rank: "miller" });
    expect(taken.ok).toBe(true);
    if (!taken.ok) return;
    expect(taken.output).toBe(before);

    const gone = disconnect(board, { playerId: "ada", player });
    expect(gone.ok).toBe(true);
    if (!gone.ok) return;
    expect(gone.shift.status).toBe("disconnected");
    expect(gone.bonusPaid).toBe(0);
    expect(gone.shift.bonusPaid).toBe(0);
    expect(player.cash).toBe(0);
    expect(gone.aiOutput).toBe(true);
    expect(millOutput(board, "mill-1")).toBe(before);
    expect(gone.output).toBe(before);
  });

  it("rejects a fourth job so jobsHeld cannot exceed 3", () => {
    const board = createLabourBoard();
    for (const id of ["mill-1", "mill-2", "mill-3", "mill-4"]) {
      registerSite(board, { id, siteClass: "mill" });
      openHiringPool(board, id);
    }
    const ranks = ["worker", "miller", "clerk", "manager"] as const;
    const results = ranks.map((rank, i) =>
      takeShift(board, { playerId: "ada", siteId: `mill-${i + 1}`, rank }),
    );
    expect(results[0]!.ok).toBe(true);
    expect(results[1]!.ok).toBe(true);
    expect(results[2]!.ok).toBe(true);
    expect(results[3]!.ok).toBe(false);
    if (results[3]!.ok) return;
    expect(results[3]!.reason).toBe("job_cap");
    expect(jobsHeld(board, "ada")).toBe(3);
    expect(jobsHeld(board, "ada")).toBeLessThanOrEqual(JOB_CAP);
  });

  it("rejects unknown ranks and never returns not_wired", () => {
    const board = openMill();
    const bad = takeShift(board, { playerId: "ada", siteId: "mill-1", rank: "ceo" as never });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.reason).toBe("bad_rank");
    expect(bad.reason).not.toBe("not_wired");

    closeHiringPool(board, "mill-1");
    const closed = takeShift(board, { playerId: "ada", siteId: "mill-1", rank: "officer" });
    expect(closed.ok).toBe(false);
    if (!closed.ok) expect(closed.reason).not.toBe("not_wired");
  });
});
