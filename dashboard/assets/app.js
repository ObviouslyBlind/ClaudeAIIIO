// SENTINEL — Dashboard data loader and renderer

async function loadJSON(path) {
    try {
        const resp = await fetch(path);
        if (!resp.ok) return [];
        return await resp.json();
    } catch (e) {
        console.warn("Failed to load " + path, e);
        return [];
    }
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatCents(p) {
    if (p === null || p === undefined) return "—";
    return Math.round(Number(p) * 100) + "\u00A2";
}

function formatPct(p) {
    if (p === null || p === undefined) return "—";
    return Math.round(Number(p) * 100) + "%";
}

function formatHours(h) {
    if (h === null || h === undefined) return "—";
    if (h < 0) return "expired";
    if (h < 1) return Math.round(h * 60) + "m";
    if (h < 24) return Number(h).toFixed(1) + "h";
    return Number(h / 24).toFixed(1) + "d";
}

function formatVolume(v) {
    if (!v) return "—";
    v = Number(v);
    if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
    if (v >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
    return "$" + v.toFixed(0);
}

function formatPnl(v) {
    if (v === null || v === undefined) return "—";
    const prefix = v >= 0 ? "+$" : "-$";
    return prefix + Math.abs(v).toFixed(2);
}

function formatDate() {
    const d = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    return days[d.getDay()] + ", " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
}

function formatTime() {
    const d = new Date();
    return d.getHours().toString().padStart(2, "0") + ":" +
        d.getMinutes().toString().padStart(2, "0");
}

// ---- TAB SWITCHING ----

function initTabs() {
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
        });
    });
}

// ---- HEADER STATS ----

function renderHeaderStats(markets, relevant, signals, ledger) {
    document.getElementById("stat-markets").textContent = markets.length.toLocaleString();
    document.getElementById("stat-relevant").textContent = relevant.length;
    document.getElementById("stat-updated").textContent = formatTime();

    const openTrades = ledger.filter(t => t.status === "OPEN");
    document.getElementById("stat-open").textContent = openTrades.length;

    const closedTrades = ledger.filter(t => t.status !== "OPEN");
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const pnlEl = document.getElementById("stat-pnl");
    pnlEl.textContent = formatPnl(totalPnl);
    pnlEl.className = "header-stat-value " + (totalPnl >= 0 ? "positive" : "negative");
}

// ---- PROBABILITY BAR ----

function renderProbBar(yesPrice, noPrice) {
    const yes = yesPrice !== null ? Number(yesPrice) : 0.5;
    const no = noPrice !== null ? Number(noPrice) : 0.5;
    const yesPct = Math.round(yes * 100);
    const noPct = Math.round(no * 100);

    return `
        <div class="prob-bar-container">
            <span class="prob-yes-pct">${yesPct}%</span>
            <div class="prob-bar-track">
                <div class="prob-bar-yes" style="width: ${yesPct}%"></div>
                <div class="prob-bar-no" style="width: ${noPct}%"></div>
            </div>
            <span class="prob-no-pct">${noPct}%</span>
        </div>
        <div class="prob-prices">
            <span class="yes-label">YES</span> ${formatCents(yesPrice)}
            &middot;
            <span class="no-label">NO</span> ${formatCents(noPrice)}
        </div>`;
}

// ---- RELEVANT MARKETS ----

function renderRelevantMarkets(markets) {
    const container = document.getElementById("relevant-markets");
    if (markets.length === 0) {
        container.innerHTML = '<div class="empty-state">No relevant Musk / Trump posting markets active right now.</div>';
        return;
    }

    container.innerHTML = markets.map((m, i) => {
        const typeLabel = (m.market_type || "").replace("_", " ");
        return `
            <div class="market-card">
                <div class="market-card-header">
                    <span class="market-card-label">mkt ${String(i + 1).padStart(3, "0")} · ${formatVolume(m.volume)} volume</span>
                    <span class="market-card-label">${formatHours(m.hours_until_expiry)} left</span>
                </div>
                <div class="market-card-question">${escapeHtml(m.question)}</div>
                <span class="market-card-type">${typeLabel}</span>
                ${renderProbBar(m.yes_price, m.no_price)}
            </div>`;
    }).join("");
}

// ---- SIGNAL FEED (overview, limited) ----

function renderSignalFeed(signals) {
    const container = document.getElementById("signal-feed");
    if (signals.length === 0) {
        container.innerHTML = '<div class="empty-state">No signals generated. Run fetch + signals pipeline first.</div>';
        return;
    }

    // Show top signals (TRADE first, then WATCH)
    const sorted = [...signals].sort((a, b) => (b.score || 0) - (a.score || 0));
    const top = sorted.slice(0, 10);

    container.innerHTML = top.map(s => {
        const cls = s.signal === "TRADE" ? "trade" : s.signal === "WATCH" ? "watch" : "skip";
        return `
            <div class="signal-card">
                <span class="signal-badge ${cls}">${s.signal}</span>
                <div class="signal-info">
                    <div class="signal-question">${escapeHtml(s.question)}</div>
                    <div class="signal-meta">
                        score <span class="score">${Number(s.score).toFixed(0)}</span>
                        · NO ${formatCents(s.no_price)}
                        · ${formatHours(s.hours_until_expiry)} left
                    </div>
                    <div class="signal-reasons">${(s.reasons || []).join(" · ")}</div>
                </div>
            </div>`;
    }).join("");
}

// ---- FULL SIGNALS TABLE ----

function renderSignalsFull(signals) {
    const container = document.getElementById("signals-full");
    if (signals.length === 0) {
        container.innerHTML = '<div class="empty-state">No signals generated yet.</div>';
        return;
    }

    const rows = signals.map(s => {
        const cls = s.signal === "TRADE" ? "trade" : s.signal === "WATCH" ? "watch" : "skip";
        return `<tr>
            <td><span class="signal-badge ${cls}">${s.signal}</span></td>
            <td>${escapeHtml(s.question)}</td>
            <td style="color: var(--accent-gold)">${Number(s.score).toFixed(0)}</td>
            <td>${formatCents(s.no_price)}</td>
            <td>${formatHours(s.hours_until_expiry)}</td>
            <td style="color: var(--text-dim); font-size: 10px;">${(s.reasons || []).join("; ")}</td>
        </tr>`;
    }).join("");

    container.innerHTML = `
        <table>
            <thead><tr>
                <th>signal</th><th>market</th><th>score</th><th>no price</th><th>expiry</th><th>reasons</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ---- LEDGER SUMMARY ----

function renderLedgerSummary(ledger) {
    const container = document.getElementById("ledger-summary");

    const open = ledger.filter(t => t.status === "OPEN");
    const closed = ledger.filter(t => t.status !== "OPEN");
    const wins = closed.filter(t => t.status === "WON").length;
    const losses = closed.filter(t => t.status === "LOST").length;
    const totalPnl = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = closed.length > 0 ? (wins / closed.length * 100) : 0;
    const exposure = open.reduce((sum, t) => sum + t.stake, 0);

    const statsHtml = `
        <div class="ledger-stats">
            <div class="ledger-stat">
                <span class="ledger-stat-label">total trades</span>
                <span class="ledger-stat-value">${ledger.length}</span>
            </div>
            <div class="ledger-stat">
                <span class="ledger-stat-label">open</span>
                <span class="ledger-stat-value" style="color: var(--blue)">${open.length}</span>
            </div>
            <div class="ledger-stat">
                <span class="ledger-stat-label">wins</span>
                <span class="ledger-stat-value" style="color: var(--green-bright)">${wins}</span>
            </div>
            <div class="ledger-stat">
                <span class="ledger-stat-label">losses</span>
                <span class="ledger-stat-value" style="color: var(--red)">${losses}</span>
            </div>
            <div class="ledger-stat">
                <span class="ledger-stat-label">win rate</span>
                <span class="ledger-stat-value">${winRate.toFixed(0)}%</span>
            </div>
            <div class="ledger-stat">
                <span class="ledger-stat-label">p&l</span>
                <span class="ledger-stat-value ${totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">${formatPnl(totalPnl)}</span>
            </div>
            <div class="ledger-stat">
                <span class="ledger-stat-label">exposure</span>
                <span class="ledger-stat-value">$${exposure.toFixed(0)}</span>
            </div>
        </div>`;

    if (ledger.length === 0) {
        container.innerHTML = statsHtml + '<div class="empty-state">No trades recorded yet.</div>';
        return;
    }

    const rows = ledger.slice(-5).reverse().map(t => {
        const statusCls = "status-" + t.status.toLowerCase();
        const pnlCls = t.pnl !== null ? (t.pnl >= 0 ? "pnl-positive" : "pnl-negative") : "";
        return `<tr>
            <td style="color: var(--text-dim); font-size: 11px;">${t.trade_id}</td>
            <td>${escapeHtml(t.question)}</td>
            <td class="${statusCls}">${t.status}</td>
            <td>${formatCents(t.entry_no_price)}</td>
            <td>$${Number(t.stake).toFixed(0)}</td>
            <td class="${pnlCls}">${t.pnl !== null ? formatPnl(t.pnl) : "—"}</td>
        </tr>`;
    }).join("");

    container.innerHTML = statsHtml + `
        <table>
            <thead><tr>
                <th>id</th><th>market</th><th>status</th><th>entry no</th><th>stake</th><th>p&l</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ---- FULL LEDGER ----

function renderLedgerFull(ledger) {
    const container = document.getElementById("ledger-full");
    if (ledger.length === 0) {
        container.innerHTML = '<div class="empty-state">No trades recorded yet.</div>';
        return;
    }

    const rows = ledger.map(t => {
        const statusCls = "status-" + t.status.toLowerCase();
        const pnlCls = t.pnl !== null ? (t.pnl >= 0 ? "pnl-positive" : "pnl-negative") : "";
        return `<tr>
            <td style="color: var(--text-dim); font-size: 11px;">${t.trade_id}</td>
            <td>${escapeHtml(t.question)}</td>
            <td>${t.market_type || "—"}</td>
            <td class="${statusCls}">${t.status}</td>
            <td>${formatCents(t.entry_no_price)}</td>
            <td>${t.exit_no_price !== null ? formatCents(t.exit_no_price) : "—"}</td>
            <td>$${Number(t.stake).toFixed(0)}</td>
            <td class="${pnlCls}">${t.pnl !== null ? formatPnl(t.pnl) : "—"}</td>
            <td style="color: var(--text-dim); font-size: 10px;">${t.entry_time || "—"}</td>
        </tr>`;
    }).join("");

    container.innerHTML = `
        <table>
            <thead><tr>
                <th>id</th><th>market</th><th>type</th><th>status</th><th>entry no</th><th>exit no</th><th>stake</th><th>p&l</th><th>opened</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ---- ALL MARKETS ----

function renderAllMarkets(markets) {
    const container = document.getElementById("all-markets");
    document.getElementById("markets-count").textContent = markets.length + " markets";

    if (markets.length === 0) {
        container.innerHTML = '<div class="empty-state">No market data loaded.</div>';
        return;
    }

    // Show as market cards, top 20 by volume
    const sorted = [...markets].sort((a, b) => (b.volume || 0) - (a.volume || 0));
    const top = sorted.slice(0, 20);

    container.innerHTML = top.map((m, i) => {
        const typeLabel = m.market_type ? `<span class="market-card-type">${m.market_type.replace("_", " ")}</span>` : "";
        return `
            <div class="market-card">
                <div class="market-card-header">
                    <span class="market-card-label">mkt ${String(i + 1).padStart(3, "0")} · ${formatVolume(m.volume)} volume</span>
                    <span class="market-card-label">${formatHours(m.hours_until_expiry)}</span>
                </div>
                <div class="market-card-question">${escapeHtml(m.question)}</div>
                ${typeLabel}
                ${renderProbBar(m.yes_price, m.no_price)}
            </div>`;
    }).join("");
}

// ---- MAIN ----

async function init() {
    initTabs();

    const [markets, relevant, signals, ledger] = await Promise.all([
        loadJSON("data/markets.json"),
        loadJSON("data/relevant.json"),
        loadJSON("data/signals.json"),
        loadJSON("data/ledger.json"),
    ]);

    renderHeaderStats(markets, relevant, signals, ledger);
    renderRelevantMarkets(relevant);
    renderSignalFeed(signals);
    renderSignalsFull(signals);
    renderLedgerSummary(ledger);
    renderLedgerFull(ledger);
    renderAllMarkets(markets);
}

init();
