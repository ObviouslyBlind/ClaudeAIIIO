async function load() {
  const res = await fetch("/api/statutes");
  const data = await res.json();
  const list = document.getElementById("list");
  const meta = document.getElementById("meta");
  const rows = data.statutes || [];
  const on = rows.filter((s) => s.enabled).length;
  meta.textContent = rows.length + " rows · " + on + " in force · PAPER";
  list.innerHTML = rows
    .map((s) => {
      const cls = s.enabled ? "on" : "off";
      const sliders = Object.entries(s.sliders || {})
        .map(([k, v]) => k + "=" + v)
        .join(" · ");
      return (
        '<div class="row ' +
        cls +
        '"><strong>' +
        s.title +
        "</strong> · " +
        (s.enabled ? "in force" : "not in force") +
        (sliders ? "<div>" + sliders + "</div>" : "") +
        "</div>"
      );
    })
    .join("");
}
load();
