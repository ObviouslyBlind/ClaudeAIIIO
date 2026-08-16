/** PAPER firm charter. Owner is equity; CEO is a job. Not live. No wallet. */

export type SizeClass = "small" | "large";

/** Launch default. House may amend later. */
export const MAX_OWNERS = 4;

export type Firm = {
  owners: string[];
  ceo: string;
  sizeClass: SizeClass;
  mode: "PAPER";
  provenance: "SIMULATED";
};

export type FoundFirmInput = {
  owners: string[];
  ceo?: string;
  siteClass: SizeClass;
  maxOwners?: number;
};

export type FoundFirmOk = { ok: true; firm: Firm };
export type FoundFirmFail = { ok: false; reason: string };
export type FoundFirmResult = FoundFirmOk | FoundFirmFail;

/** Small sites are by-right. Large class files planning. */
export function canFoundWithoutPlanning(siteClass: SizeClass): boolean {
  return siteClass === "small";
}

function uniqueNames(raw: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const name = item.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * Found a PAPER firm.
 * Small: solo Owner-operator is enough (Owner=CEO stack counts as one).
 * Large (factory / industrial mine): a second name as co-owner, or a separate CEO.
 */
export function foundFirm(input: FoundFirmInput): FoundFirmResult {
  const siteClass = input.siteClass;
  if (siteClass !== "small" && siteClass !== "large") {
    return { ok: false, reason: "bad_class" };
  }

  const owners = uniqueNames(input.owners ?? []);
  if (owners.length === 0) return { ok: false, reason: "no_owners" };

  const cap = input.maxOwners ?? MAX_OWNERS;
  if (owners.length > cap) return { ok: false, reason: "max_owners" };

  const ceo = typeof input.ceo === "string" ? input.ceo.trim() : "";
  const resolvedCeo = ceo || owners[0]!;
  if (!resolvedCeo) return { ok: false, reason: "no_ceo" };

  const names = new Set([...owners, resolvedCeo]);
  if (siteClass === "large" && names.size < 2) {
    return { ok: false, reason: "need_second" };
  }

  return {
    ok: true,
    firm: {
      owners,
      ceo: resolvedCeo,
      sizeClass: siteClass,
      mode: "PAPER",
      provenance: "SIMULATED",
    },
  };
}
