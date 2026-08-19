/**
 * Predetermined look catalog. Keep ids in sync with game/src/look.ts.
 */

export const HAIR_STYLES = [
  { id: "short", label: "Short" },
  { id: "bun", label: "Bun" },
  { id: "fade", label: "Fade" },
  { id: "locs", label: "Locs" },
  { id: "bald", label: "Bald" },
];

export const SKIN_TONES = [
  { id: "sand", label: "Sand", hex: 0xf2d2a8 },
  { id: "tan", label: "Tan", hex: 0xc48a5a },
  { id: "brown", label: "Brown", hex: 0x8d5a32 },
  { id: "deep", label: "Deep", hex: 0x5c3a24 },
  { id: "olive", label: "Olive", hex: 0x7a6b48 },
];

export const WEAR_COLOURS = [
  { id: "sea", label: "Sea", hex: 0x2f7a8a },
  { id: "brass", label: "Brass", hex: 0xc45c12 },
  { id: "moss", label: "Moss", hex: 0x3d4a38 },
  { id: "sandcloth", label: "Sand", hex: 0xd4b07a },
  { id: "night", label: "Night", hex: 0x1a2c30 },
  { id: "clay", label: "Clay", hex: 0xa85a3c },
];

export function defaultLook() {
  return { hair: "short", skin: "sand", shirt: "sea", jacket: "brass", pants: "moss" };
}

function pick(id, allowed, fallback) {
  return allowed.some((row) => row.id === id) ? id : fallback;
}

export function clampLook(raw) {
  const row = raw && typeof raw === "object" ? raw : {};
  return {
    hair: pick(row.hair, HAIR_STYLES, "short"),
    skin: pick(row.skin, SKIN_TONES, "sand"),
    shirt: pick(row.shirt, WEAR_COLOURS, "sea"),
    jacket: pick(row.jacket, WEAR_COLOURS, "brass"),
    pants: pick(row.pants, WEAR_COLOURS, "moss"),
  };
}

export function skinHex(id) {
  const row = SKIN_TONES.find((s) => s.id === id);
  return row ? row.hex : 0xf2d2a8;
}

export function wearHex(id) {
  const row = WEAR_COLOURS.find((s) => s.id === id);
  return row ? row.hex : 0x2f7a8a;
}

/** Guard the catalog: no hot-pink / neon magenta skins. */
export function skinIsHarbour(hex) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  if (r > 200 && g < 90 && b > 120) return false;
  if (r > 220 && g < 140 && b > 180) return false;
  return r - g < 120;
}
