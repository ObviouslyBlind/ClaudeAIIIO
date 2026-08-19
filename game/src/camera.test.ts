import { describe, expect, it } from "vitest";
import { spawnCameraOffset } from "../public/harbour/roads.js";
import {
  applyStallCamera,
  cameraNearForRadius,
  cartesianToSpherical,
  closeOrbitState,
  createOrbitState,
  handleOrbitPointer,
  LMB,
  RMB,
  sphericalToCartesian,
  stallCameraPose,
  STALL_CAM_BACK_M,
  STALL_CAM_SIDE_M,
  STALL_CAM_UP_M,
  STALL_LOOK_Y,
  nextWalkFollow,
  walkOrbitState,
  WALK_CAM_PITCH,
  WALK_CAM_RADIUS_M,
  rideOrbitState,
  RIDE_CAM_PITCH,
  RIDE_CAM_RADIUS_M,
  ZOOM_MAX_M,
  ZOOM_MIN_M,
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

  it("widens the near clip as you zoom out so water does not punch through", () => {
    expect(cameraNearForRadius(ZOOM_MIN_M)).toBeCloseTo(0.4, 5);
    expect(cameraNearForRadius(ZOOM_MAX_M)).toBeGreaterThan(4);
    expect(cameraNearForRadius(ZOOM_MAX_M)).toBeLessThan(ZOOM_MAX_M * 0.2);
  });

  it("close orbit looks at the player from stall distance, not 28 m inland", () => {
    const close = closeOrbitState("south");
    expect(close.orbited).toBe(true);
    expect(close.radius).toBe(9);
    expect(close.radius).toBeLessThan(Math.hypot(-8, 5.2, -10));
    const o = sphericalToCartesian(close);
    expect(Math.hypot(o.x, o.y, o.z)).toBeCloseTo(9, 5);
  });

  it("stall pose sits a few metres from the cart, looking at the stall not the highway", () => {
    const pose = stallCameraPose({ x: 100, y: 2, z: 200 });
    expect(pose.lookX).toBe(100);
    expect(pose.lookZ).toBe(200);
    expect(pose.lookY).toBeCloseTo(2 + STALL_LOOK_Y);
    const dist = Math.hypot(pose.x - 100, pose.y - 2, pose.z - 200);
    expect(dist).toBeGreaterThan(4);
    expect(dist).toBeLessThan(8);
    expect(dist).toBeCloseTo(
      Math.hypot(STALL_CAM_SIDE_M, STALL_CAM_UP_M, STALL_CAM_BACK_M),
      5,
    );
    expect(pose.x - 100).toBeCloseTo(STALL_CAM_SIDE_M);
    expect(pose.z - 200).toBeCloseTo(STALL_CAM_BACK_M);
  });

  it("applyStallCamera copies the pose with no lerp", () => {
    const cam = {
      position: {
        x: 0,
        y: 0,
        z: 0,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
      lookAt(x, y, z) {
        this.lx = x;
        this.ly = y;
        this.lz = z;
      },
      near: 12,
      updateProjectionMatrix() {
        this.updated = true;
      },
    };
    applyStallCamera(cam, stallCameraPose({ x: 10, y: 1, z: 20 }));
    expect(cam.position.x).toBeCloseTo(10 + STALL_CAM_SIDE_M);
    expect(cam.position.y).toBeCloseTo(1 + STALL_CAM_UP_M);
    expect(cam.position.z).toBeCloseTo(20 + STALL_CAM_BACK_M);
    expect(cam.lx).toBe(10);
    expect(cam.lz).toBe(20);
    expect(cam.ly).toBeCloseTo(1 + STALL_LOOK_Y);
  });

  it("walk follow keeps a zoomed-out orbit instead of snapping to 8 m", () => {
    const zoomed = { ...walkOrbitState("south"), radius: 80 };
    expect(nextWalkFollow(zoomed, "south")).toBe(zoomed);
    expect(nextWalkFollow(zoomed, "south").radius).toBe(80);
    const spawn = createOrbitState(spawnCameraOffset("south"));
    expect(spawn.orbited).toBe(false);
    const first = nextWalkFollow(spawn, "south");
    expect(first.radius).toBe(WALK_CAM_RADIUS_M);
    expect(first.orbited).toBe(true);
    const forced = nextWalkFollow(zoomed, "south", { force: true });
    expect(forced.radius).toBe(WALK_CAM_RADIUS_M);
  });

  it("walk orbit is close enough to read a person, not 28 m inland", () => {
    const walk = walkOrbitState("south");
    expect(walk.orbited).toBe(true);
    expect(walk.radius).toBe(WALK_CAM_RADIUS_M);
    expect(walk.pitch).toBe(WALK_CAM_PITCH);
    expect(walk.radius).toBeLessThan(12);
    expect(walk.radius).toBeGreaterThan(5);
    const o = sphericalToCartesian(walk);
    expect(Math.hypot(o.x, o.y, o.z)).toBeCloseTo(WALK_CAM_RADIUS_M, 5);
  });

  it("ride orbit is pulled back to show the cab, not spawn look-at", () => {
    const ride = rideOrbitState("south");
    expect(ride.orbited).toBe(true);
    expect(ride.radius).toBe(RIDE_CAM_RADIUS_M);
    expect(ride.pitch).toBe(RIDE_CAM_PITCH);
    expect(ride.radius).toBeGreaterThan(WALK_CAM_RADIUS_M);
    expect(ride.radius).toBeLessThan(22);
    const o = sphericalToCartesian(ride);
    expect(Math.hypot(o.x, o.y, o.z)).toBeCloseTo(RIDE_CAM_RADIUS_M, 5);
  });
});
