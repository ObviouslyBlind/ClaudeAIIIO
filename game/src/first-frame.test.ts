import { describe, expect, it } from "vitest";
import { BERTH_Z, CAM, LOOK, SKY_HEX } from "../public/harbour/first-frame.js";
import { HOME_Z } from "../public/harbour/ferry.js";

describe("first harbour frame", () => {
  it("keeps the north berth constant in sync with the ferry hull", () => {
    expect(BERTH_Z).toBe(HOME_Z);
    expect(SKY_HEX).toBe(0x7ec8d4);
  });

  it("looks inland along the tarmac, not at the seaward berth", () => {
    expect(CAM.z).toBe(-6918);
    expect(LOOK.z).toBeLessThan(CAM.z);
    expect(LOOK.z).toBeLessThan(-7000);
  });
});
