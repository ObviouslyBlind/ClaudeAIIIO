/**
 * PAPER sfx. Web Audio, no files, no wallet.
 * One shared AudioContext (browsers cap live contexts ~6, so the old
 * new-context-per-purchase engine went silent after a shopping spree).
 */

let sharedCtx = null;

function ac() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    if (!sharedCtx) sharedCtx = new AC();
    if (sharedCtx.state === "suspended") sharedCtx.resume().catch(() => {});
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Call from a user gesture (Play button) so later sounds are allowed. */
export function unlockAudio() {
  return ac();
}

function tone({ type = "sine", from = 880, to = null, dur = 0.2, vol = 0.14, delay = 0 }) {
  const ctx = ac();
  if (!ctx || ctx.state !== "running") return;
  try {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur * 0.55);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    /* autoplay block — silent is fine */
  }
}

/** Short PAPER buy chirp. Lets a click confirm cash moved. */
export function playPaperBuy() {
  tone({ type: "sine", from: 880, to: 523, dur: 0.22, vol: 0.14 });
}

/** Soft UI tick for buttons / menus. */
export function playClick() {
  tone({ type: "triangle", from: 660, to: 520, dur: 0.07, vol: 0.06 });
}

/** Two-step cash register for big sales. */
export function playCash() {
  tone({ type: "square", from: 1046, dur: 0.09, vol: 0.05 });
  tone({ type: "square", from: 1568, dur: 0.14, vol: 0.05, delay: 0.09 });
}

/** Low buzz when an action is refused. */
export function playError() {
  tone({ type: "sawtooth", from: 196, to: 130, dur: 0.18, vol: 0.07 });
}

/** Little welcome arpeggio once the player presses Play. */
export function playStart() {
  tone({ type: "sine", from: 523, dur: 0.12, vol: 0.08 });
  tone({ type: "sine", from: 659, dur: 0.12, vol: 0.08, delay: 0.11 });
  tone({ type: "sine", from: 784, dur: 0.18, vol: 0.09, delay: 0.22 });
}
