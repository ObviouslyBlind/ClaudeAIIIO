/**
 * Compact PAPER cash on the chip.
 * Exact cents, holdings, and $/min live in the cash ledger.
 */

function trimDec(n) {
  const rounded = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function compactCash(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0";
  const sign = v < 0 ? "-" : "";
  const dollars = Math.round(Math.abs(v));
  if (dollars >= 1_000_000_000) {
    return sign + "$" + trimDec(dollars / 1_000_000_000) + " billion";
  }
  if (dollars >= 1_000_000) {
    return sign + "$" + trimDec(dollars / 1_000_000) + " million";
  }
  if (dollars >= 100_000) {
    const k = Math.round(dollars / 1000);
    if (k >= 1000) return sign + "$1 million";
    return sign + "$" + k + "k";
  }
  return sign + "$" + dollars.toLocaleString("en-US");
}

export function fullCash(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
