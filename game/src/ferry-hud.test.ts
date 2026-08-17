import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import {
  FALLBACK_FARE,
  fareOf,
  formatFerryHint,
  isFerryHintActive,
  mountFerryHud,
} from "../public/harbour/ferry-hud.js";

const mounted: Array<{ stop: () => void }> = [];

afterEach(() => {
  for (const hud of mounted) hud.stop();
  mounted.length = 0;
});

function counterEl() {
  let text = "";
  const el = {
    writes: 0,
    setAttribute() {},
    get textContent() {
      return text;
    },
    set textContent(v: string) {
      text = String(v);
      el.writes += 1;
    },
  };
  return el;
}

function failFetch() {
  return async () => ({ ok: false, json: async () => null });
}

async function microtasks() {
  for (let i = 0; i < 4; i++) await Promise.resolve();
}

describe("harbour PAPER ferry fare hint", () => {
  it("formats one short Ferry · PAPER line", () => {
    expect(formatFerryHint(null, true)).toBe("Ferry $15 · PAPER");
    expect(formatFerryHint(null, false)).toBe("");
    expect(fareOf(null)).toBe(FALLBACK_FARE);
    expect(isFerryHintActive({ disabled: false }, null)).toBe(true);
    expect(isFerryHintActive({ disabled: true }, { hidden: true })).toBe(false);
  });

  it("paints only when the text changes, so observers cannot feed themselves", async () => {
    const el = counterEl();
    const hud = mountFerryHud({
      el,
      btnEl: { disabled: false },
      overlayEl: null,
      isActive: () => true,
      fetch: failFetch(),
    });
    mounted.push(hud);
    await microtasks();
    expect(el.textContent).toBe("Ferry $15 · PAPER");
    const before = el.writes;
    hud.sync();
    hud.sync();
    hud.sync();
    await microtasks();
    expect(el.writes).toBe(before);
  });

  it("never observes document.body (the /g/south100 Page Unresponsive loop)", () => {
    const src = readFileSync(new URL("../public/harbour/ferry-hud.js", import.meta.url), "utf8");
    expect(src).not.toContain("observer.observe(document.body");
    expect(src).toMatch(/if \(el\.textContent !== next\) el\.textContent = next;/);
  });
});
