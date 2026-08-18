import { afterEach, describe, expect, it, vi } from "vitest";
import { createLandBoard, developPlot, leasePlot } from "../src/land.ts";
import { createVisitor } from "../src/sim.ts";
import { postStaff, staffMapSnapshot } from "../src/staff-http.ts";
import { STAFF_NOTE, STAFF_WAGE } from "../src/staff.ts";
import {
  MAX_STAFF_PER_PLOT,
  formatStaffLine,
  mountStaffHud,
} from "../public/harbour/staff-hud.js";

function developedFarm(cash = 1_000) {
  const land = createLandBoard();
  const visitor = createVisitor(cash);
  const plot = land.plots.find((p) => !p.owner && p.class === "by_right")!;
  expect(leasePlot(land, visitor, plot.id).ok).toBe(true);
  expect(developPlot(land, visitor, plot.id, "farm").ok).toBe(true);
  return { land, visitor, plot };
}

function btn() {
  const listeners: Record<string, () => void> = {};
  return {
    disabled: true,
    addEventListener(type: string, fn: () => void) {
      listeners[type] = fn;
    },
    click() {
      listeners.click?.();
    },
  };
}

describe("POST /api/staff PAPER hire/fire", () => {
  it("hires PAPER staff on a developed visitor plot and snapshots staffSlots", () => {
    const { land, visitor, plot } = developedFarm();
    const result = postStaff(land, visitor, { plotId: plot.id, action: "hire" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("PAPER");
    expect(result.provenance).toBe("SIMULATED");
    expect(result.note).toBe(STAFF_NOTE);
    expect(result.note).toMatch(/PAPER/);
    expect(result.slot.mode).toBe("PAPER");
    expect(result.staffSlots).toHaveLength(1);
    expect(result.snapshot.mode).toBe("PAPER");
    expect(result.snapshot.staffSlots).toHaveLength(1);
    expect(result.snapshot.visitor.staffSlots).toHaveLength(1);
    expect(result.snapshot.visitor.staffSlots[0]!.plotId).toBe(plot.id);
    expect(visitor.staffSlots).toHaveLength(1);
  });

  it("rejects hire when PAPER cash is too low", () => {
    const { land, visitor, plot } = developedFarm();
    visitor.cash = STAFF_WAGE - 1;
    const result = postStaff(land, visitor, { plotId: plot.id, action: "hire" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("no_cash");
    expect(result.mode).toBe("PAPER");
    expect(result.snapshot.staffSlots).toHaveLength(0);
    expect(visitor.staffSlots).toHaveLength(0);
    expect(visitor.cash).toBe(STAFF_WAGE - 1);
  });

  it("rejects hire on leased land that is not developed", () => {
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const plot = land.plots.find((p) => !p.owner && p.class === "by_right")!;
    expect(leasePlot(land, visitor, plot.id).ok).toBe(true);
    const result = postStaff(land, visitor, { plotId: plot.id, action: "hire" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_developed");
    expect(result.snapshot.staffSlots).toHaveLength(0);
  });

  it("fires one PAPER slot and keeps staffSlots on the snapshot", () => {
    const { land, visitor, plot } = developedFarm();
    expect(postStaff(land, visitor, { plotId: plot.id, action: "hire" }).ok).toBe(true);
    expect(postStaff(land, visitor, { plotId: plot.id, action: "hire" }).ok).toBe(true);
    const fired = postStaff(land, visitor, { plotId: plot.id, action: "fire" });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    expect(fired.mode).toBe("PAPER");
    expect(fired.snapshot.staffSlots).toHaveLength(1);
    expect(visitor.staffSlots).toHaveLength(1);
  });

  it("labels an empty map snapshot PAPER and includes staffSlots", () => {
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const snap = staffMapSnapshot(land, visitor);
    expect(snap.mode).toBe("PAPER");
    expect(snap.provenance).toBe("SIMULATED");
    expect(snap.staffSlots).toEqual([]);
    expect(snap.visitor.staffSlots).toEqual([]);
  });
});

describe("harbour PAPER staff sheet hook", () => {
  const mounted: Array<{ sync: () => void }> = [];

  afterEach(() => {
    mounted.length = 0;
  });

  it("paints a PAPER staff line on a developed plot", () => {
    const plot = { id: "p1", owner: "visitor", use: "farm" };
    const map = {
      plots: [plot],
      staffSlots: [{ plotId: "p1", mode: "PAPER" }],
      visitor: { cash: 900, staffSlots: [{ plotId: "p1", mode: "PAPER" }] },
    };
    expect(formatStaffLine(map, plot)).toBe("PAPER · SIMULATED · Staff 1/2");
    expect(formatStaffLine(map, null)).toContain("PAPER");
    expect(MAX_STAFF_PER_PLOT).toBe(2);
  });

  it("posts hire to /api/staff with plotId and action", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const hireBtn = btn();
    const fireBtn = btn();
    const line = { textContent: "" };
    const statuses: string[] = [];
    const snaps: unknown[] = [];
    const plot = { id: "farm-1", owner: "visitor", use: "farm" };
    const map = { plots: [plot], visitor: { cash: 1000, staffSlots: [] as unknown[] }, staffSlots: [] as unknown[] };

    const hud = mountStaffHud({
      hireBtn,
      fireBtn,
      lineEl: line,
      getSelected: () => plot.id,
      getMap: () => map,
      applySnapshot: (s: unknown) => snaps.push(s),
      setStatus: (s: string) => statuses.push(s),
      fetch: async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), init: init || {} });
        return {
          ok: true,
          json: async () => ({
            ok: true,
            mode: "PAPER",
            snapshot: {
              plots: map.plots,
              staffSlots: [{ plotId: plot.id, mode: "PAPER" }],
              visitor: { cash: 1000, staffSlots: [{ plotId: plot.id, mode: "PAPER" }] },
            },
          }),
        };
      },
    });
    mounted.push(hud);
    hud.sync();
    expect(hireBtn.disabled).toBe(false);
    expect(fireBtn.disabled).toBe(true);
    expect(line.textContent).toContain("PAPER");

    hireBtn.click();
    await vi.waitFor(() => expect(calls.length).toBe(1));

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("/api/staff");
    expect(calls[0]!.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      plotId: "farm-1",
      action: "hire",
    });
    await vi.waitFor(() => expect(statuses.some((s) => s.includes("Hired"))).toBe(true));
    expect(snaps).toHaveLength(1);
  });

  it("posts fire and reports no_cash from the server", async () => {
    const calls: { url: string }[] = [];
    const hireBtn = btn();
    const fireBtn = btn();
    const statuses: string[] = [];
    const plot = { id: "farm-1", owner: "visitor", use: "farm" };
    const map = {
      plots: [plot],
      staffSlots: [{ plotId: "farm-1", mode: "PAPER" }],
      visitor: { cash: 0, staffSlots: [{ plotId: "farm-1", mode: "PAPER" }] },
    };

    const hud = mountStaffHud({
      hireBtn,
      fireBtn,
      lineEl: { textContent: "" },
      getSelected: () => plot.id,
      getMap: () => map,
      applySnapshot: () => {},
      setStatus: (s: string) => statuses.push(s),
      fetch: async (url: string) => {
        calls.push({ url: String(url) });
        return {
          ok: false,
          json: async () => ({ ok: false, reason: "no_cash", mode: "PAPER" }),
        };
      },
    });
    mounted.push(hud);
    hud.sync();
    expect(fireBtn.disabled).toBe(false);

    fireBtn.click();
    await vi.waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0]!.url).toBe("/api/staff");
    await vi.waitFor(() => expect(statuses.join(" ")).toMatch(/no_cash/));
  });
});
