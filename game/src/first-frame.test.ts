import { describe, expect, it } from "vitest";
import { BERTH_Z, SKY_HEX } from "../public/harbour/first-frame.js";
import { HOME_Z } from "../public/harbour/ferry.js";

describe("first harbour frame", () => {
  it("looks at the same north berth the ferry hull uses", () => {
    expect(BERTH_Z).toBe(HOME_Z);
    expect(SKY_HEX).toBe(0x7ec8d4);
  });
});
