/**
 * Predetermined visitor look. No freeform hex — no hot-pink skin.
 * PAPER / SIMULATED. #0001 is the owner; this visitor is #0002.
 */

export type HairId = "short" | "bun" | "fade" | "locs" | "bald";
export type SkinId = "sand" | "tan" | "brown" | "deep" | "olive";
export type WearId = "sea" | "brass" | "moss" | "sandcloth" | "night" | "clay";

export type PlayerLook = {
  hair: HairId;
  skin: SkinId;
  shirt: WearId;
  jacket: WearId;
  pants: WearId;
};

export const HAIR_STYLES: { id: HairId; label: string }[] = [
  { id: "short", label: "Short" },
  { id: "bun", label: "Bun" },
  { id: "fade", label: "Fade" },
  { id: "locs", label: "Locs" },
  { id: "bald", label: "Bald" },
];

/** Harbour skins. Warm, not costume neon. */
export const SKIN_TONES: { id: SkinId; label: string; hex: number }[] = [
  { id: "sand", label: "Sand", hex: 0xf2d2a8 },
  { id: "tan", label: "Tan", hex: 0xc48a5a },
  { id: "brown", label: "Brown", hex: 0x8d5a32 },
  { id: "deep", label: "Deep", hex: 0x5c3a24 },
  { id: "olive", label: "Olive", hex: 0x7a6b48 },
];

export const WEAR_COLOURS: { id: WearId; label: string; hex: number }[] = [
  { id: "sea", label: "Sea", hex: 0x2f7a8a },
  { id: "brass", label: "Brass", hex: 0xc45c12 },
  { id: "moss", label: "Moss", hex: 0x3d4a38 },
  { id: "sandcloth", label: "Sand", hex: 0xd4b07a },
  { id: "night", label: "Night", hex: 0x1a2c30 },
  { id: "clay", label: "Clay", hex: 0xa85a3c },
];

export function defaultLook(): PlayerLook {
  return { hair: "short", skin: "sand", shirt: "sea", jacket: "brass", pants: "moss" };
}

function pick<T extends string>(id: unknown, allowed: { id: T }[], fallback: T): T {
  return allowed.some((row) => row.id === id) ? (id as T) : fallback;
}

export function clampLook(raw: unknown): PlayerLook {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    hair: pick(row.hair, HAIR_STYLES, "short"),
    skin: pick(row.skin, SKIN_TONES, "sand"),
    shirt: pick(row.shirt, WEAR_COLOURS, "sea"),
    jacket: pick(row.jacket, WEAR_COLOURS, "brass"),
    pants: pick(row.pants, WEAR_COLOURS, "moss"),
  };
}

export function skinHex(id: SkinId): number {
  return SKIN_TONES.find((s) => s.id === id)?.hex ?? 0xf2d2a8;
}

export function wearHex(id: WearId): number {
  return WEAR_COLOURS.find((s) => s.id === id)?.hex ?? 0x2f7a8a;
}

/** Guard the catalog: no hot-pink / neon magenta skins. */
export function skinIsHarbour(hex: number): boolean {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  if (r > 200 && g < 90 && b > 120) return false;
  if (r > 220 && g < 140 && b > 180) return false;
  return r - g < 120;
}
