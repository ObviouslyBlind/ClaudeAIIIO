/** Metres. Tap-to-walk needs ground above this. Water and the channel sit below. */
export const BEACH_THRESHOLD_M = 0.25;

/**
 * Highest authored island height at (x, z).
 * Inject `heightAt` so tests share the same formula as `land.ts`.
 */
export function surfaceHeight<T>(
  x: number,
  z: number,
  islands: Record<string, T>,
  heightAt: (spec: T, x: number, z: number) => number,
): number {
  let h = Number.NEGATIVE_INFINITY;
  for (const spec of Object.values(islands)) {
    const y = heightAt(spec, x, z);
    if (y > h) h = y;
  }
  return h;
}

/** True only on land above the beach threshold. Water and the channel are false. */
export function canWalk<T>(
  x: number,
  z: number,
  islands: Record<string, T>,
  heightAt: (spec: T, x: number, z: number) => number,
): boolean {
  return surfaceHeight(x, z, islands, heightAt) > BEACH_THRESHOLD_M;
}
