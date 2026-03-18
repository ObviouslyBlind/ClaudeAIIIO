// Dashboard data loader and renderer

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

function formatPrice(p) {
    if (p === null || p === undefined) return "—";
    return "$" + Number(p).toFixed(2);
}

function formatHours(h) {
    if (h === null || h === undefined) return "—";
    if (h < 0) return "expired";
    if (h < 1) return Math.round(h * 60) + "m";
    return Number(h).toFixed(1) + "h";
}

function signalClass(signal) {
    if (signal === "TRADE") return "signal-trade";
    if (signal === "WATCH") return "signal-watch";
    return "signal-skip";
}

function statusClass(status) {
    if (status === "OPEN") return "status-open";
    if (status === "WON") return "status-won";
    return "status-lost";
}

// --- Render functions ---

function renderStats(markets, relevant, signals, ledger) {
    const container = document.getElementById("stats");
    const trades = signals.filter(s => s.signal === "TRADE");
    const openTrades = ledger.filter(t => t.status === "OPEN");
    const closedTrades = ledger.filter(t => t.status !== "OPEN");
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const wins = closedTrades.filter(t => t.status === "WON").length;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length * 100) : 0;

    const stats = [
        { label: "Total Markets", value: markets.length, cls: "" },
        { label: "Relevant", value: relevant.length, cls: relevant.length > 0 ? "positive" : "neutral" },
        { label: "Trade Signals", value: trades.length, cls: trades.length > 0 ? "positive" : "" },
        { label: "Open Trades", value: openTrades.length, cls: openTrades.length > 0 ? "neutral" : "" },
        { label: "Win Rate", value: winRate.toFixed(0) + "%", cls: winRate >= 50 ? "positive" : "neutral" },
        { label: "P&L (SIM)", value: "$" + totalPnl.toFixed(2), cls: totalPnl >= 0 ? "positive" : "negative" },
    ];

    container.innerHTML = stats.map(s =>
        `<div class="stat-card">
            <div class="label">${s.label}</div>
            <div class="value ${s.cls}">${s.value}</div>
        </div>`
    ).join("");
}

function renderRelevantMarkets(markets) {
    const container = document.getElementById("relevant-markets");
    if (markets.length === 0) {
        container.innerHTML = '<div class="empty-state">No relevant Musk/Trump posting markets right now.</div>';
        return;
    }
    const rows = markets.map(m =>
        `<tr>
            <td>${escapeHtml(m.question)}</td>
            <td>${m.market_type || "—"}</td>
            <td>${formatPrice(m.no_price)}</td>
            <td>${formatPrice(m.yes_price)}</td>
            <td>${formatHours(m.hours_until_expiry)}</td>
        </tr>`
    ).join("");

    container.innerHTML =
        `<table>
            <thead><tr><th>Market</th><th>Type</th><th>NO</th><th>YES</th><th>Expiry</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderSignals(signals) {
    const container = document.getElementById("signals");
    if (signals.length === 0) {
        container.innerHTML = '<div class="empty-state">No signals generated yet.</div>';
        return;
    }
    const rows = signals.map(s =>
        `<tr>
            <td class="${signalClass(s.signal)}">${s.signal}</td>
            <td>${escapeHtml(s.question)}</td>
            <td>${Number(s.score).toFixed(0)}</td>
            <td>${formatPrice(s.no_price)}</td>
            <td>${formatHours(s.hours_until_expiry)}</td>
            <td>${(s.reasons || []).join("; ")}</td>
        </tr>`
    ).join("");

    container.innerHTML =
        `<table>
            <thead><tr><th>Signal</th><th>Market</th><th>Score</th><th>NO</th><th>Expiry</th><th>Reasons</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderLedger(ledger) {
    const container = document.getElementById("ledger");
    if (ledger.length === 0) {
        container.innerHTML = '<div class="empty-state">No paper trades yet.</div>';
        return;
    }
    const rows = ledger.map(t =>
        `<tr>
            <td>${t.trade_id}</td>
            <td>${escapeHtml(t.question)}</td>
            <td class="${statusClass(t.status)}">${t.status}</td>
            <td>${formatPrice(t.entry_no_price)}</td>
            <td>${t.exit_no_price !== null ? formatPrice(t.exit_no_price) : "—"}</td>
            <td>$${Number(t.stake).toFixed(0)}</td>
            <td class="${t.pnl !== null ? (t.pnl >= 0 ? 'signal-trade' : 'status-lost') : ''}">${t.pnl !== null ? "$" + Number(t.pnl).toFixed(2) : "—"}</td>
        </tr>`
    ).join("");

    container.innerHTML =
        `<table>
            <thead><tr><th>ID</th><th>Market</th><th>Status</th><th>Entry NO</th><th>Exit NO</th><th>Stake</th><th>P&L</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// --- Main ---

async function init() {
    const [markets, relevant, signals, ledger] = await Promise.all([
        loadJSON("data/markets.json"),
        loadJSON("data/relevant.json"),
        loadJSON("data/signals.json"),
        loadJSON("data/ledger.json"),
    ]);

    document.getElementById("last-updated").textContent =
        "Last updated: " + new Date().toLocaleString();

    renderStats(markets, relevant, signals, ledger);
    renderRelevantMarkets(relevant);
    renderSignals(signals);
    renderLedger(ledger);
}

init();
