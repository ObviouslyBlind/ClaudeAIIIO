import { describe, expect, it } from "vitest";
import {
  HAIR_STYLES as HairTs,
  SKIN_TONES as SkinTs,
  WEAR_COLOURS as WearTs,
  clampLook,
  defaultLook,
  skinIsHarbour,
} from "./look.ts";
import {
  HAIR_STYLES as HairJs,
  SKIN_TONES as SkinJs,
  WEAR_COLOURS as WearJs,
  clampLook as clampLookJs,
  defaultLook as defaultLookJs,
  skinIsHarbour as skinIsHarbourJs,
} from "../public/harbour/look.js";

describe("harbour look catalog", () => {
  it("keeps TS and JS palettes in lockstep", () => {
    expect(HairJs.map((r) => r.id)).toEqual(HairTs.map((r) => r.id));
    expect(SkinJs.map((r) => r.id)).toEqual(SkinTs.map((r) => r.id));
    expect(WearJs.map((r) => r.id)).toEqual(WearTs.map((r) => r.id));
    expect(SkinJs.map((r) => r.hex)).toEqual(SkinTs.map((r) => r.hex));
    expect(WearJs.map((r) => r.hex)).toEqual(WearTs.map((r) => r.hex));
    expect(defaultLookJs()).toEqual(defaultLook());
  });

  it("uses predetermined skins — no hot pink, no freeform hex", () => {
    for (const row of SkinTs) expect(skinIsHarbour(row.hex)).toBe(true);
    for (const row of SkinJs) expect(skinIsHarbourJs(row.hex)).toBe(true);
    expect(skinIsHarbour(0xff69b4)).toBe(false);
    expect(skinIsHarbour(0xff00ff)).toBe(false);
    expect(clampLook({ skin: "hotpink", shirt: "#ff00aa" })).toEqual(defaultLook());
    expect(clampLookJs({ hair: "mohawk", skin: "pink" }).hair).toBe("short");
    expect(clampLookJs({ skin: "pink" }).skin).toBe("sand");
  });
});
