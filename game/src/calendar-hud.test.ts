import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatCalendarLine,
  mountCalendarHud,
  POLL_MS,
} from "../public/harbour/calendar-hud.js";

const SNAPSHOT = {
  mode: "PAPER",
  provenance: "SIMULATED",
  calendar: { mode: "PAPER", provenance: "SIMULATED", day: 0, tick: 12 },
  hud: { tick: 12 },
};

function el(text = "PAPER · SIMULATED · Day 0 · tick 0") {
  return { textContent: text, setAttribute() {} };
}

const mounted: Array<{ stop: () => void }> = [];

afterEach(() => {
  for (const hud of mounted) hud.stop();
  mounted.length = 0;
  vi.useRealTimers();
});

describe("harbour PAPER calendar strip", () => {
  it("keeps PAPER · SIMULATED · Day · tick on one line", () => {
    const line = formatCalendarLine(SNAPSHOT);
    expect(line).toBe("PAPER · SIMULATED · Day 0 · tick 12");
    expect(line.includes("\n")).toBe(false);
    expect(formatCalendarLine(null)).toBe("PAPER · SIMULATED · Day — · tick —");
  });

  it("does not clobber the first-frame Day 0 line before snapshot returns", async () => {
    const node = el();
    let calls = 0;
    const hud = mountCalendarHud({
      el: node,
      fetch: async () => {
        calls += 1;
        return { ok: true, json: async () => SNAPSHOT };
      },
    });
    mounted.push(hud);
    expect(node.textContent).toBe("PAPER · SIMULATED · Day 0 · tick 0");
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toBe(1);
    expect(node.textContent).toBe("PAPER · SIMULATED · Day 0 · tick 12");
  });

  it("polls about once a second", async () => {
    vi.useFakeTimers();
    let n = 0;
    const node = el();
    const hud = mountCalendarHud({
      el: node,
      fetch: async () => {
        n += 1;
        return { ok: true, json: async () => SNAPSHOT };
      },
    });
    mounted.push(hud);
    await Promise.resolve();
    expect(n).toBe(1);
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(n).toBe(2);
  });
});

describe("first-frame sheet placeholders", () => {
  it("ships calendar and cart as PAPER lines, not Day — / Cart —", () => {
    const html = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../public/harbour/index.html"),
      "utf8",
    );
    expect(html).toMatch(/id="calendar">PAPER · SIMULATED · Day 0 · tick 0</);
    expect(html).toMatch(/id="cart">PAPER</);
    expect(html).not.toMatch(/id="calendar">Day/);
    expect(html).not.toMatch(/id="cart">Cart/);
    expect(html).toContain('fetch("/api/snapshot")');
  });
});
