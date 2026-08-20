/**
 * Units sheets. Systems only — grey-box facts, not a dollhouse.
 * PAPER / SIMULATED.
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

export function floorName(i) {
  const n = Number(i) || 0;
  if (n <= 0) return "Ground floor";
  if (n === 1) return "First floor";
  return "Second floor";
}

export function unitsSnap(play) {
  return (play && play.units) || { buildings: [], kit: [], leaseHours: [3, 6, 24, 48] };
}

export function ownedShopUnits(play) {
  const out = [];
  for (const b of unitsSnap(play).buildings || []) {
    for (const r of b.rooms || []) {
      if (r.owner === "visitor" && r.use === "shop") {
        out.push({ ...r, buildingName: b.name });
      }
    }
  }
  return out;
}

export function findBuilding(play, buildingId) {
  return (unitsSnap(play).buildings || []).find((b) => b.id === buildingId) || null;
}

function kitForUse(play, use) {
  return (unitsSnap(play).kit || []).filter((k) => k.use === use);
}

function roomLine(r) {
  const who = r.owner === "visitor" ? "Yours" : "Vacant";
  return `${esc(r.label)} · ${esc(r.use)} · ${who} · ${money(r.price)}`;
}

function paintRoot(building, play) {
  const cash = Number(play && play.cash) || 0;
  const landOwned = building.landOwner === "visitor";
  const canLand = !landOwned && cash >= Number(building.landPrice);
  const manageOff = !building.canManage;
  const vacant = (building.rooms || []).filter((r) => r.owner !== "visitor");
  const ask = vacant.reduce((m, r) => Math.min(m, Number(r.price) || Infinity), Infinity);
  const hint =
    ask < Infinity && cash >= ask
      ? "You can buy a room here."
      : ask < Infinity
        ? "Need " + money(ask) + " for a room here. Spawn is $10,000. Building dirt is $15,000."
        : "No vacant rooms.";
  return `
    <p class="whisper">${building.floors} floor${building.floors === 1 ? "" : "s"} · ${building.rooms.length} rooms · PAPER</p>
    <p class="whisper">${esc(hint)}</p>
    <div class="unit-actions">
      <button type="button" class="go" data-unit-view="buy">Buy rooms</button>
      <button type="button" class="go" data-unit-view="manage" ${manageOff ? "disabled" : ""}>Manage rooms</button>
      <button type="button" class="go" data-buy-land="${esc(building.id)}" ${canLand ? "" : "disabled"}>
        ${landOwned ? "You own this land" : "Buy this land " + money(building.landPrice)}
      </button>
    </div>
    <ul class="unit-list">
      ${(building.rooms || [])
        .map((r) => `<li>${roomLine(r)}</li>`)
        .join("")}
    </ul>`;
}

function paintBuy(building, play, floor) {
  const floors = [...new Set((building.rooms || []).map((r) => r.floor))].sort((a, b) => a - b);
  const viewFloor = floors.includes(floor) ? floor : floors[0];
  const onFloor = (building.rooms || []).filter((r) => r.floor === viewFloor);
  const others = (building.rooms || []).filter((r) => r.floor !== viewFloor && !r.owner);
  const cash = Number(play && play.cash) || 0;
  const floorBtns = floors
    .map(
      (f) =>
        `<button type="button" class="ghost${f === viewFloor ? " is-on" : ""}" data-unit-floor="${f}">${esc(floorName(f))}</button>`,
    )
    .join("");
  const row = (r) => {
    const owned = r.owner === "visitor";
    const can = !owned && cash >= Number(r.price);
    return `
      <div class="inv-row">
        <span>${esc(r.label)} · ${esc(r.use)}</span>
        <button type="button" class="go" data-buy-unit="${esc(r.id)}" ${can ? "" : "disabled"}>
          ${owned ? "Owned" : can ? "Buy " + money(r.price) : "Need " + money(r.price)}
        </button>
      </div>`;
  };
  return `
    <button type="button" class="ghost hire-back" data-unit-view="root">Back</button>
    <div class="dest-row">${floorBtns}</div>
    <p class="whisper">${esc(floorName(viewFloor))}</p>
    ${onFloor.map(row).join("")}
    ${others.length ? `<p class="whisper">Other vacant rooms in this building</p>${others.map(row).join("")}` : ""}`;
}

function paintManage(building, play, floor) {
  const mine = (building.rooms || []).filter((r) => r.owner === "visitor");
  if (!mine.length) {
    return `
      <button type="button" class="ghost hire-back" data-unit-view="root">Back</button>
      <p class="whisper">Manage is grey until you own a room in this building.</p>`;
  }
  const floors = [...new Set((building.rooms || []).map((r) => r.floor))].sort((a, b) => a - b);
  const viewFloor = floors.includes(floor) ? floor : floors[0];
  const onFloor = mine.filter((r) => r.floor === viewFloor);
  const others = mine.filter((r) => r.floor !== viewFloor);
  const floorBtns = floors
    .map(
      (f) =>
        `<button type="button" class="ghost${f === viewFloor ? " is-on" : ""}" data-unit-floor="${f}">${esc(floorName(f))}</button>`,
    )
    .join("");
  const row = (r) => `
      <div class="inv-row">
        <span>${esc(r.label)} · ${esc(r.use)}</span>
        <button type="button" class="go" data-unit-room="${esc(r.id)}">Open</button>
      </div>`;
  return `
    <button type="button" class="ghost hire-back" data-unit-view="root">Back</button>
    <div class="dest-row">${floorBtns}</div>
    <p class="whisper">${esc(floorName(viewFloor))}</p>
    ${onFloor.map(row).join("")}
    ${others.length ? `<p class="whisper">Other rooms you own</p>${others.map(row).join("")}` : ""}`;
}

function paintRoom(building, play, unitId) {
  const unit = (building.rooms || []).find((r) => r.id === unitId);
  if (!unit || unit.owner !== "visitor") {
    return `<button type="button" class="ghost hire-back" data-unit-view="manage">Back</button><p>Not yours.</p>`;
  }
  const kit = kitForUse(play, unit.use);
  const fitted = new Set(unit.kit || []);
  const cash = Number(play && play.cash) || 0;
  const kitRows = kit
    .map((k) => {
      const have = fitted.has(k.id);
      const can = !have && cash >= Number(k.cost);
      return `
        <div class="inv-row">
          <span>${esc(k.label)}</span>
          <button type="button" class="go" data-fit-kit="${esc(k.id)}" data-unit-id="${esc(unit.id)}" ${can ? "" : "disabled"}>
            ${have ? "Fitted" : money(k.cost)}
          </button>
        </div>`;
    })
    .join("");
  if (unit.use === "shop") {
    const site = ((play && play.workSites) || []).find((s) => s.unitId === unit.id);
    return `
      <button type="button" class="ghost hire-back" data-unit-view="manage">Back</button>
      <p class="whisper">Shop. Packer fills the shelf. Till sells.</p>
      ${kitRows}
      <button type="button" class="go" data-open-stand="${esc(site ? site.id : "")}" ${site ? "" : "disabled"}>Open site card</button>`;
  }
  const hours = unitsSnap(play).leaseHours || [3, 6, 24, 48];
  const lease = unit.lease;
  const offer = unit.offer;
  const leaseBlock = lease
    ? `<p class="whisper">${esc(lease.tenantName)} · ${lease.hours} sim hours · ${money(lease.rentPerHour)} / hour</p>`
    : offer
      ? `<p class="whisper">${esc(offer.tenantName)} offers ${money(offer.rentPerHour)} / hour</p>
         <div class="dest-row">${hours
           .map(
             (h) =>
               `<button type="button" class="go" data-sign-lease="${esc(unit.id)}" data-hours="${h}">${h}h</button>`,
           )
           .join("")}</div>`
      : `<button type="button" class="go" data-scout-unit="${esc(unit.id)}">Scout tenants</button>`;
  return `
    <button type="button" class="ghost hire-back" data-unit-view="manage">Back</button>
    <p class="whisper">${esc(unit.use)}. Kit first, then scout. Empty room = no takers.</p>
    ${kitRows}
    ${leaseBlock}`;
}

export function formatBuildingSheet(play, opts = {}) {
  const building = findBuilding(play, opts.buildingId);
  if (!building) return `<div class="site-card"><p>No building.</p></div>`;
  const view = opts.view || "root";
  let body = paintRoot(building, play);
  if (view === "buy") body = paintBuy(building, play, opts.floor);
  else if (view === "manage") body = paintManage(building, play, opts.floor);
  else if (view === "room") body = paintRoom(building, play, opts.unitId);
  return `
    <div class="site-card" data-unit-building="${esc(building.id)}">
      <div class="stand-head">
        <h2>${esc(building.name)}</h2>
        <button type="button" class="stand-x" id="stand-close">Close</button>
      </div>
      <div class="site-body">${body}</div>
    </div>`;
}

export function formatOrderDests(play, marketDest, marketUnitId) {
  const shops = ownedShopUnits(play);
  const shopBtns = shops
    .map((r) => {
      const on = marketDest === "unit" && marketUnitId === r.id;
      return `<button type="button" class="dest${on ? " is-on" : ""}" data-order-dest="unit" data-order-unit="${esc(r.id)}">This room · ${esc(r.label)}</button>`;
    })
    .join("");
  return `
    <button type="button" class="dest ${marketDest === "road" ? "is-on" : ""}" data-order-dest="road">Bring to me</button>
    <button type="button" class="dest ${marketDest === "warehouse" ? "is-on" : ""}" data-order-dest="warehouse">Warehouse</button>
    ${shopBtns}`;
}
