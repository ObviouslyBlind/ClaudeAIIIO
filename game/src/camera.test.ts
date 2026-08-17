import { describe, expect, it } from "vitest";
import { spawnCameraOffset } from "../public/harbour/roads.js";
import {
  cartesianToSpherical,
  createOrbitState,
  handleOrbitPointer,
  LMB,
  RMB,
  sphericalToCartesian,
} from "../public/harbour/camera.js";

describe("RMB-hold orbit camera", () => {
  it("round-trips the spawn offset through spherical coordinates", () => {
    const o = spawnCameraOffset("north");
    const back = sphericalToCartesian(cartesianToSpherical(o));
    expect(back.x).toBeCloseTo(o.x, 8);
    expect(back.y).toBeCloseTo(o.y, 8);
    expect(back.z).toBeCloseTo(o.z, 8);
  });

  it("dragging right-button changes yaw; left click does not", () => {
    const start = createOrbitState(spawnCameraOffset("north"));
    const yaw0 = start.yaw;

    const afterLeftDown = handleOrbitPointer(start, {
      type: "down",
      button: LMB,
      clientX: 10,
      clientY: 10,
    });
    const afterLeftMove = handleOrbitPointer(afterLeftDown, {
      type: "move",
      button: LMB,
      dx: 80,
      dy: 12,
      clientX: 90,
      clientY: 22,
    });
    expect(afterLeftMove.yaw).toBe(yaw0);
    expect(afterLeftMove.orbited).toBe(false);
    expect(afterLeftMove.dragging).toBe(false);

    const afterRightDown = handleOrbitPointer(start, {
      type: "down",
      button: RMB,
      clientX: 10,
      clientY: 10,
    });
    expect(afterRightDown.dragging).toBe(true);
    expect(afterRightDown.orbited).toBe(false);
    expect(afterRightDown.yaw).toBe(yaw0);

    const afterDrag = handleOrbitPointer(afterRightDown, {
      type: "move",
      dx: 80,
      dy: 0,
      clientX: 90,
      clientY: 10,
    });
    expect(afterDrag.yaw).not.toBe(yaw0);
    expect(afterDrag.yaw).toBeLessThan(yaw0);
    expect(afterDrag.orbited).toBe(true);

    const offset0 = sphericalToCartesian(start);
    const offset1 = sphericalToCartesian(afterDrag);
    expect(offset1.x).not.toBeCloseTo(offset0.x, 3);
    expect(Math.hypot(offset1.x, offset1.y, offset1.z)).toBeCloseTo(
      Math.hypot(offset0.x, offset0.y, offset0.z),
      6,
    );
  });

  it("pointerup does not orbit; release only stops the hold", () => {
    const start = createOrbitState(spawnCameraOffset("north"));
    const afterUp = handleOrbitPointer(start, { type: "up", button: RMB, dx: 120 });
    expect(afterUp.yaw).toBe(start.yaw);
    expect(afterUp.orbited).toBe(false);
    expect(afterUp.dragging).toBe(false);

    const held = handleOrbitPointer(start, { type: "down", button: RMB, clientX: 0, clientY: 0 });
    const dragged = handleOrbitPointer(held, { type: "move", dx: 40, dy: 0 });
    const released = handleOrbitPointer(dragged, { type: "up", button: RMB });
    expect(released.dragging).toBe(false);
    expect(released.orbited).toBe(true);
    expect(released.yaw).toBe(dragged.yaw);
  });

  it("ignores single-finger touch so tap-walk keeps pointerup", () => {
    const start = createOrbitState(spawnCameraOffset("north"));
    const down = handleOrbitPointer(start, {
      type: "down",
      button: LMB,
      pointerType: "touch",
      pointerCount: 1,
      clientX: 4,
      clientY: 4,
    });
    const moved = handleOrbitPointer(down, {
      type: "move",
      pointerType: "touch",
      pointerCount: 1,
      dx: 90,
      dy: 40,
    });
    expect(moved.yaw).toBe(start.yaw);
    expect(moved.orbited).toBe(false);
    expect(moved.dragging).toBe(false);
  });
});
