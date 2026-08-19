/**
 * Account sheet. Google is a placeholder. This visitor is #0002.
 * #0001 is the owner, not this save.
 */

import { HAIR_STYLES, SKIN_TONES, WEAR_COLOURS, clampLook } from "./look.js";

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function swatches(kind, rows, on) {
  return rows
    .map((row) => {
      const hit = row.id === on ? " is-on" : "";
      const hex = row.hex != null ? "#" + row.hex.toString(16).padStart(6, "0") : "";
      const style = hex ? ` style="--sw:${hex}"` : "";
      return `<button type="button" class="look-swatch${hit}" data-look="${esc(kind)}" data-look-id="${esc(row.id)}"${style}>${esc(row.label)}</button>`;
    })
    .join("");
}

function wipeCopy(step) {
  if (step === "reset-1") {
    return {
      lead: "Reset this island save? Cash, carts, and lots go back to the start. Your look stays.",
      go: "Reset data",
      act: "reset",
    };
  }
  if (step === "delete-1") {
    return {
      lead: "Are you sure? This deletes the game account on this shard.",
      go: "I am sure",
      act: "delete",
    };
  }
  if (step === "delete-2") {
    return {
      lead: "Are you sure sure? Carts, lots, and cash are gone.",
      go: "I am sure sure",
      act: "delete",
    };
  }
  if (step === "delete-3") {
    return {
      lead: "Last chance. Delete this game account.",
      go: "Delete account",
      act: "delete",
    };
  }
  return null;
}

export function formatAccountSheet(play, opts = {}) {
  const look = clampLook(play && play.look);
  const tag = (play && play.accountTag) || "#0002";
  const taxPct = Math.round((Number(play && play.salesTax) || 0.08) * 100);
  const wipe = wipeCopy(opts.wipe);
  const confirm = wipe
    ? `
      <div class="acct-wipe">
        <p>${esc(wipe.lead)}</p>
        <button type="button" class="danger" data-wipe-go="${esc(wipe.act)}">${esc(wipe.go)}</button>
        <button type="button" class="ghost" data-wipe-cancel>Cancel</button>
      </div>`
    : `
      <button type="button" class="danger" data-wipe="reset-1">Reset data</button>
      <button type="button" class="danger" data-wipe="delete-1">Delete game account</button>`;
  return `
    <h2>Account</h2>
    <button type="button" class="google-ph" disabled>Google · signed in</button>
    <p class="whisper">You have to be signed in to play. This is a placeholder.</p>
    <p class="acct-no">${esc(tag)}</p>
    <p class="whisper">#0001 is the owner. You are the next account on this shard.</p>
    <div class="stand-row"><span>Balance</span><strong>${money(play && play.cash)}</strong></div>
    <div class="stand-row"><span>Income</span><strong>${money(play && play.incomePerMinute)}/min</strong></div>
    <p class="whisper">Sales tax ${taxPct}% is already in every sale.</p>
    <p class="look-label">Hair</p>
    <div class="look-row">${swatches("hair", HAIR_STYLES, look.hair)}</div>
    <p class="look-label">Skin</p>
    <div class="look-row">${swatches("skin", SKIN_TONES, look.skin)}</div>
    <p class="look-label">Shirt</p>
    <div class="look-row">${swatches("shirt", WEAR_COLOURS, look.shirt)}</div>
    <p class="look-label">Jacket</p>
    <div class="look-row">${swatches("jacket", WEAR_COLOURS, look.jacket)}</div>
    <p class="look-label">Pants</p>
    <div class="look-row">${swatches("pants", WEAR_COLOURS, look.pants)}</div>
    ${confirm}
  `;
}
