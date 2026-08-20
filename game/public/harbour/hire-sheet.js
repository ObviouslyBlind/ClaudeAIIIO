/**
 * Hire sheet: your businesses at a location, not a floating vendor button.
 * Tap a company. See people, fleet, plant. Hire into that site.
 */

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

export function listBusinesses(play) {
  const stands = (play && play.stands) || [];
  const work = (play && play.workSites) || [];
  return [...stands, ...work];
}

export function businessType(site) {
  if (!site) return "Business";
  if (site.siteClass === "shop") return "Shop";
  if (site.siteClass === "mine" || site.kind === "quarry" || site.kind === "aggregates") {
    return "Aggregates";
  }
  if (site.siteClass === "farm" || site.kind === "orchard") return "Farm";
  if (site.siteClass === "hotel" || site.siteClass === "house") return "Hospitality";
  return "Street cart";
}

function plotNameFor(play, site) {
  if (site && site.unitId) return site.label || "room";
  const lease = ((play && play.leases) || []).find((l) => l.id === site.plotId);
  return (lease && lease.name) || site.where || "your lot";
}

function fleetLine(site) {
  const rows = (site && site.fleet) || [];
  if (!rows.length) return "No trucks yet";
  return rows.map((r) => r.label || r.kind || "Truck").join(", ");
}

function plantLine(site) {
  const rows = (site && site.plant) || [];
  if (!rows.length) return "No plant yet";
  return rows.map((r) => r.label || r.kind || "Machine").join(", ");
}

export function peopleLine(site) {
  if (site && site.unitId) {
    const bits = [];
    if (site.packerHired) bits.push(site.packerStaffName || "Packer");
    if (site.tillHired) bits.push(site.staffName || "Till");
    return bits.length ? bits.join(" · ") : "No one hired";
  }
  if (site && site.hired) return site.staffName || "Vendor";
  return "No one hired";
}

function hireCost(play) {
  const n = Number(play && play.hireCost);
  return Number.isFinite(n) && n > 0 ? n : 300;
}

function emptyBody() {
  return `
    <div class="mp-soon">
      <p class="mp-soon-lead">No business on the ground yet.</p>
      <p>Buy a cart in Market, put it on a pad. It shows up here. Hire lives on that site — people, then trucks, then plant.</p>
    </div>`;
}

function listBody(play, sites) {
  return sites
    .map((s) => {
      const where = plotNameFor(play, s);
      const type = businessType(s);
      const state = s.unitId || s.hired ? peopleLine(s) : "Needs hire";
      return `
        <button type="button" class="biz-row" data-hire-pick="${esc(s.id)}">
          <span class="biz-copy">
            <strong>${esc(s.label || "Site")}</strong>
            <span>${esc(type)} · ${esc(where)}</span>
          </span>
          <span class="biz-state${s.hired || s.packerHired || s.tillHired ? " is-hired" : ""}">${esc(state)}</span>
        </button>`;
    })
    .join("");
}

function detailBody(play, site) {
  const where = plotNameFor(play, site);
  const type = businessType(site);
  const cost = hireCost(play);
  let hireBtn = "";
  if (site.unitId) {
    if (!site.packerHired) {
      hireBtn += `<button type="button" class="go" data-unit-hire="${esc(site.unitId)}" data-unit-role="packer">Hire packer ${money(cost)}</button>`;
    }
    if (!site.tillHired) {
      hireBtn += `<button type="button" class="go" data-unit-hire="${esc(site.unitId)}" data-unit-role="till">Hire till ${money(cost)}</button>`;
    }
  } else if (!site.hired) {
    hireBtn = `<button type="button" class="go" data-sheet-hire="${esc(site.id)}">Hire ${money(cost)}</button>`;
  }
  return `
    <button type="button" class="ghost hire-back" data-hire-back>All businesses</button>
    <h3 class="hire-site-name">${esc(site.label || "Site")}</h3>
    <p class="whisper">${esc(type)} · ${esc(where)} · South</p>
    <div class="stand-row"><span>People</span><strong>${esc(peopleLine(site))}</strong></div>
    <div class="stand-row"><span>Fleet</span><strong>${esc(fleetLine(site))}</strong></div>
    <div class="stand-row"><span>Plant</span><strong>${esc(plantLine(site))}</strong></div>
    <div class="hire-actions">
      <button type="button" class="go" data-open-stand="${esc(site.id)}">Open site</button>
      ${hireBtn}
    </div>
  `;
}

export function formatHireSheet(play, opts = {}) {
  const sites = listBusinesses(play);
  const selectedId = opts.selectedId || "";
  const selected = selectedId ? sites.find((s) => s.id === selectedId) : null;
  let list;
  if (selected) list = detailBody(play || {}, selected);
  else if (!sites.length) list = emptyBody();
  else list = listBody(play || {}, sites);
  return `
    <header class="mp-head">
      <h2 class="mp-word">Hire</h2>
      <button type="button" class="sheet-close" data-sheet-close aria-label="Close">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </header>
    <div class="mp-scroll">${list}</div>
  `;
}
