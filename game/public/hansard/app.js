const GROUP_ORDER = [
  "money",
  "trade",
  "land",
  "planning",
  "firms",
  "labour",
  "environment",
  "stocks",
  "elections",
  "offices",
];

const GROUP_LABELS = {
  money: "Money and treasury",
  trade: "Trade and ferry",
  land: "Land and size class",
  planning: "Planning procedure",
  firms: "Firms",
  labour: "Labour",
  environment: "Environment",
  stocks: "Stocks and banking",
  elections: "Elections",
  offices: "Offices",
};

const list = document.getElementById("list");
const meta = document.getElementById("meta");

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function groupLabel(key) {
  return GROUP_LABELS[key] || key.replace(/_/g, " ");
}

function groupRows(rows) {
  const buckets = new Map();
  for (const key of GROUP_ORDER) buckets.set(key, []);
  for (const row of rows) {
    const key = row.group || "other";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }
  return [...buckets.entries()].filter(([, items]) => items.length);
}

function sliderText(row) {
  return Object.entries(row.sliders || {})
    .map(([key, value]) => esc(key) + "=" + esc(value))
    .join(" · ");
}

function tagText(row) {
  const tags = [];
  if (row.money_bill) tags.push("money bill");
  if (row.council_may_restrict) tags.push("council may restrict");
  return tags.join(" · ");
}

function rowHtml(row) {
  const on = !!row.enabled;
  const sliders = sliderText(row);
  const tags = tagText(row);
  const status = on ? "in force" : "not in force";
  return (
    '<article class="row ' +
    (on ? "on" : "off") +
    '"><div><p class="name">' +
    esc(row.title) +
    '</p><p class="status">' +
    status +
    (sliders ? " · " + sliders : "") +
    "</p>" +
    (tags ? '<p class="tags">' + esc(tags) + "</p>" : "") +
    "</div></article>"
  );
}

function render(data) {
  const rows = Array.isArray(data.statutes) ? data.statutes : [];
  const inForce = rows.filter((row) => row.enabled).length;
  const notInForce = rows.length - inForce;
  meta.textContent =
    rows.length +
    " rows · " +
    inForce +
    " in force · " +
    notInForce +
    " not in force · PAPER";

  if (!rows.length) {
    list.innerHTML =
      '<p class="empty">No statutes in this catalog yet. The House amends rows; it does not author from blank paper.</p>';
    return;
  }

  list.innerHTML = groupRows(rows)
    .map(([key, items]) => {
      const ordered = items.slice().sort((a, b) => Number(b.enabled) - Number(a.enabled));
      const on = ordered.filter((row) => row.enabled).length;
      return (
        '<section class="group"><h2>' +
        esc(groupLabel(key)) +
        " <span>" +
        on +
        " in force · " +
        (ordered.length - on) +
        " not in force</span></h2>" +
        ordered.map(rowHtml).join("") +
        "</section>"
      );
    })
    .join("");
}

async function load() {
  try {
    const res = await fetch("/api/statutes");
    if (!res.ok) throw new Error("statutes " + res.status);
    render(await res.json());
  } catch (err) {
    meta.textContent = "Catalog did not load · PAPER";
    list.innerHTML =
      '<p class="err">Could not read statutes. Return to the harbour and try again.</p>';
    console.warn(err);
  }
}

load();
