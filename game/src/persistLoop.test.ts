import { afterEach, describe, expect, it, vi } from "vitest";
import { createLandBoard } from "./land.ts";
import { serializeShard } from "./persist.ts";
import { PERSIST_INTERVAL_MS, startPersistLoop } from "./persistLoop.ts";
import { createVisitor, createWorld } from "./sim.ts";

const loops: Array<{ stop: () => void }> = [];

afterEach(() => {
  for (const loop of loops) loop.stop();
  loops.length = 0;
  vi.useRealTimers();
});

function start(opts: Parameters<typeof startPersistLoop>[0]) {
  const loop = startPersistLoop(opts);
  loops.push(loop);
  return loop;
}

describe("PAPER persist dump loop", () => {
  it("keeps lastBlob empty until the first interval (204 if none)", () => {
    vi.useFakeTimers();
    const world = createWorld(3);
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const loop = start({
      getShard: () => ({ world, land, visitor }),
      intervalMs: PERSIST_INTERVAL_MS,
    });

    expect(loop.lastBlob).toBeNull();
    vi.advanceTimersByTime(PERSIST_INTERVAL_MS - 1);
    expect(loop.lastBlob).toBeNull();
  });

  it("stores a PAPER serializeShard blob every interval", () => {
    vi.useFakeTimers();
    const world = createWorld(3);
    world.tick = 12;
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    visitor.cash = 777;
    const loop = start({
      getShard: () => ({ world, land, visitor }),
      intervalMs: PERSIST_INTERVAL_MS,
    });

    vi.advanceTimersByTime(PERSIST_INTERVAL_MS);
    expect(loop.lastBlob).toEqual(serializeShard({ world, land, visitor }));
    expect(loop.lastBlob?.mode).toBe("PAPER");
    expect(loop.lastBlob?.provenance).toBe("SIMULATED");
    expect(loop.lastBlob?.tick).toBe(12);
    expect(loop.lastBlob?.visitor.cash).toBe(777);

    world.tick = 40;
    visitor.cash = 50;
    vi.advanceTimersByTime(PERSIST_INTERVAL_MS);
    expect(loop.lastBlob).toEqual(serializeShard({ world, land, visitor }));
    expect(loop.lastBlob?.tick).toBe(40);
    expect(loop.lastBlob?.visitor.cash).toBe(50);
  });

  it("stop() ends dumps", () => {
    vi.useFakeTimers();
    const world = createWorld(3);
    const land = createLandBoard();
    const visitor = createVisitor(1_000);
    const loop = start({
      getShard: () => ({ world, land, visitor }),
      intervalMs: 1_000,
    });

    vi.advanceTimersByTime(1_000);
    const frozen = loop.lastBlob;
    expect(frozen).not.toBeNull();
    loop.stop();

    world.tick = 99;
    vi.advanceTimersByTime(5_000);
    expect(loop.lastBlob).toBe(frozen);
    expect(loop.lastBlob?.tick).not.toBe(99);
  });
});
