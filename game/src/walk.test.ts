import { describe, expect, it } from "vitest";
import { heightAt, ISLANDS } from "./land.ts";
import { BEACH_THRESHOLD_M, canWalk, surfaceHeight } from "./walk.ts";

describe("walk surface", () => {
  it("lets you walk the north port and a hill, not the channel", () => {
    const n = ISLANDS.north;
    expect(canWalk(n.port.x, n.port.z, ISLANDS, heightAt)).toBe(true);
    expect(canWalk(0, 0, ISLANDS, heightAt)).toBe(false);
    expect(canWalk(n.hill.x, n.hill.z, ISLANDS, heightAt)).toBe(true);
    const s = ISLANDS.south;
    expect(canWalk(s.port.x, s.port.z, ISLANDS, heightAt)).toBe(true);
    expect(canWalk(s.hill.x, s.hill.z, ISLANDS, heightAt)).toBe(false);
  });

  it("treats the channel midpoint as water, below the beach threshold", () => {
    expect(surfaceHeight(0, 0, ISLANDS, heightAt)).toBeLessThan(0);
    expect(surfaceHeight(0, 0, ISLANDS, heightAt)).toBeLessThanOrEqual(BEACH_THRESHOLD_M);
  });
});
