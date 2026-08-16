import { describe, expect, it } from "vitest";
import { createLandBoard } from "./land.ts";
import { createVisitor } from "./sim.ts";
import {
  PLANNING_WINDOW_TICKS,
  RESIDENT_POLL_QUORUM,
  castVote,
  createPlanningBoard,
  fileApplication,
  resolveApplication,
  resolveDue,
} from "./planning.ts";

function fileFactory(
  board = createPlanningBoard(),
  extra: { plotId?: string; owners?: string[]; feePaid?: number; filedAt?: number; payer?: { cash: number } } = {},
) {
  return {
    board,
    result: fileApplication(board, {
      plotId: extra.plotId ?? "n-street-0",
      use: "factory",
      owners: extra.owners ?? ["ada", "bev"],
      feePaid: extra.feePaid ?? 25,
      filedAt: extra.filedAt,
      payer: extra.payer,
    }),
  };
}

function vote(board: ReturnType<typeof createPlanningBoard>, appId: string, voter: string, choice: "yes" | "no") {
  return castVote(board, { appId, voter, choice });
}

describe("PAPER planning board step F", () => {
  it("files a large-class application with owners[] and sinks the fee", () => {
    const payer = createVisitor(100);
    const { board, result } = fileFactory(createPlanningBoard(), { payer, feePaid: 25 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.app.owners).toEqual(["ada", "bev"]);
    expect(result.app.use).toBe("factory");
    expect(result.app.status).toBe("queued");
    expect(result.app.provenance).toBe("PAPER");
    expect(result.app.feePaid).toBe(25);
    expect(result.app.closesAt - result.app.filedAt).toBe(PLANNING_WINDOW_TICKS);
    expect(PLANNING_WINDOW_TICKS).toBe(7200);
    expect(board.sink).toBe(25);
    expect(board.provenance).toBe("PAPER");
    expect(payer.cash).toBeCloseTo(75, 4);
  });

  it("rejects by-right uses, empty owners, and never returns not_wired", () => {
    const board = createPlanningBoard();
    const shop = fileApplication(board, { plotId: "p1", use: "shop", owners: ["ada"], feePaid: 10 });
    expect(shop.ok).toBe(false);
    if (shop.ok) return;
    expect(shop.reason).toBe("not_large");
    expect(shop.reason).not.toBe("not_wired");

    const nobody = fileApplication(board, { plotId: "p1", use: "factory", owners: ["  "], feePaid: 10 });
    expect(nobody.ok).toBe(false);
    if (nobody.ok) return;
    expect(nobody.reason).toBe("no_owners");

    const house = fileApplication(board, { plotId: "p1", use: "house", owners: ["ada"], feePaid: 10 });
    expect(house.ok).toBe(false);
    if (!house.ok) expect(house.reason).not.toBe("not_wired");
  });

  it("fail does not place a building; pass only sets passed (queue)", () => {
    const land = createLandBoard();
    const plot = land.plots.find((p) => !p.owner && !p.use)!;
    expect(plot.use).toBeNull();

    const failBoard = createPlanningBoard();
    const failFile = fileApplication(failBoard, {
      plotId: plot.id,
      use: "warehouse",
      owners: ["ada"],
      feePaid: 20,
      filedAt: 0,
    });
    expect(failFile.ok).toBe(true);
    if (!failFile.ok) return;
    vote(failBoard, failFile.app.id, "r1", "no");
    vote(failBoard, failFile.app.id, "r2", "no");
    vote(failBoard, failFile.app.id, "r3", "yes");
    const failed = resolveApplication(failBoard, failFile.app.id, PLANNING_WINDOW_TICKS);
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(failed.app.status).toBe("failed");
    expect(plot.use).toBeNull();

    const passBoard = createPlanningBoard();
    const passFile = fileApplication(passBoard, {
      plotId: plot.id,
      use: "factory",
      owners: ["ada", "bev"],
      feePaid: 20,
      filedAt: 0,
    });
    expect(passFile.ok).toBe(true);
    if (!passFile.ok) return;
    vote(passBoard, passFile.app.id, "r1", "yes");
    vote(passBoard, passFile.app.id, "r2", "yes");
    vote(passBoard, passFile.app.id, "r3", "no");
    const due = resolveDue(passBoard, PLANNING_WINDOW_TICKS);
    expect(due).toHaveLength(1);
    expect(due[0]!.status).toBe("passed");
    expect(plot.use).toBeNull();
    expect(passBoard.apps[0]!.status).toBe("passed");
  });

  it("bootstrap resident poll waits at quorum 3 and does not fail under it", () => {
    expect(RESIDENT_POLL_QUORUM).toBe(3);
    const { board, result } = fileFactory();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const id = result.app.id;
    vote(board, id, "r1", "yes");
    vote(board, id, "r2", "yes");
    const early = resolveApplication(board, id, PLANNING_WINDOW_TICKS - 1);
    expect(early.ok).toBe(false);
    if (early.ok) return;
    expect(early.reason).toBe("window_open");

    const waiting = resolveApplication(board, id, PLANNING_WINDOW_TICKS);
    expect(waiting.ok).toBe(true);
    if (!waiting.ok) return;
    expect(waiting.app.status).toBe("waiting_quorum");

    vote(board, id, "r3", "yes");
    const passed = resolveApplication(board, id, PLANNING_WINDOW_TICKS + 10);
    expect(passed.ok).toBe(true);
    if (!passed.ok) return;
    expect(passed.app.status).toBe("passed");
  });
});
