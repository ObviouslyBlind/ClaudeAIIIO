// SENTINEL — Dashboard data loader and renderer
// Hardened: error vs empty states, source-based freshness, safe rendering

// ---- DATA LOADING ----

const LoadState = { LOADING: "loading", LOADED: "loaded", EMPTY: "empty", FAILED: "failed" };

async function loadJSON(path) {
    try {
        const resp = await fetch(path);
        if (!resp.ok) return { state: LoadState.FAILED, data: null, error: `HTTP ${resp.status}` };
        const data = await resp.json();
        if (data === null || (Array.isArray(data) && data.length === 0)) {
            return { state: LoadState.EMPTY, data: data };
        }
        return { state: LoadState.LOADED, data: data };
    } catch (e) {
        return { state: LoadState.FAILED, data: null, error: String(e) };
    }
}

function renderStateMessage(container, state, emptyMsg, failedMsg) {
    if (state === LoadState.FAILED) {
        container.innerHTML = `<div class="error-state">${escapeHtml(failedMsg || "Failed to load data.")}</div>`;
        return true;
    }
    if (state === LoadState.EMPTY) {
        container.innerHTML = `<div class="empty-state">${escapeHtml(emptyMsg || "No data available.")}</div>`;
        return true;
    }
    return false;
}

// ---- FORMATTING HELPERS ----

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
}

function formatCents(p) {
    if (p === null || p === undefined) return "\u2014";
    return Math.round(Number(p) * 100) + "\u00A2";
}

function formatHours(h) {
    if (h === null || h === undefined) return "\u2014";
    if (h < 0) return "expired";
    if (h < 1) return Math.round(h * 60) + "m";
    if (h < 24) return Number(h).toFixed(1) + "h";
    return Number(h / 24).toFixed(1) + "d";
}

function formatVolume(v) {
    if (!v) return "\u2014";
    v = Number(v);
    if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
    if (v >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
    return "$" + v.toFixed(0);
}

function formatPnl(v) {
    if (v === null || v === undefined) return "\u2014";
    const prefix = v >= 0 ? "+$" : "-$";
    return prefix + Math.abs(v).toFixed(2);
}

function formatFreshness(isoStr) {
    if (!isoStr) return "unknown";
    try {
        const d = new Date(isoStr);
        const now = new Date();
        const mins = Math.round((now - d) / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return mins + "m ago";
        if (mins < 1440) return Math.round(mins / 60) + "h ago";
        return Math.round(mins / 1440) + "d ago";
    } catch (e) {
        return "unknown";
    }
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

function renderHeaderStats(relevant, signals, ledger, meta) {
    document.getElementById("stat-relevant").textContent =
        relevant.state === LoadState.LOADED ? relevant.data.length : "\u2014";

    // Freshness from source data mtime, not browser clock
    const freshnessEl = document.getElementById("stat-freshness");
    if (meta.state === LoadState.LOADED && meta.data.sources) {
        const relSrc = meta.data.sources["relevant.json"];
        if (relSrc && relSrc.modified_at) {
            freshnessEl.textContent = formatFreshness(relSrc.modified_at);
        } else {
            freshnessEl.textContent = "unknown";
        }
    } else {
        freshnessEl.textContent = "unknown";
    }

    // Ledger stats
    if (ledger.state === LoadState.LOADED) {
        const trades = ledger.data;
        const openTrades = trades.filter(t => t.status === "OPEN");
        const closedTrades = trades.filter(t => t.status !== "OPEN");
        const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        document.getElementById("stat-open").textContent = openTrades.length;
        const pnlEl = document.getElementById("stat-pnl");
        pnlEl.textContent = formatPnl(totalPnl);
        pnlEl.className = "header-stat-value " + (totalPnl >= 0 ? "positive" : "negative");
    } else {
        document.getElementById("stat-open").textContent = "\u2014";
        document.getElementById("stat-pnl").textContent = "\u2014";
    }

    // Data status bar
    const statusBar = document.getElementById("data-status-bar");
    const allStates = [relevant, signals, ledger];
    const anyFailed = allStates.some(s => s.state === LoadState.FAILED);
    const allEmpty = allStates.every(s => s.state === LoadState.EMPTY || s.state === LoadState.FAILED);
    if (anyFailed) {
        statusBar.textContent = "some data failed to load";
        statusBar.className = "data-status data-status-error";
    } else if (allEmpty) {
        statusBar.textContent = "no pipeline data \u2014 run fetch + signals first";
        statusBar.className = "data-status data-status-warn";
    } else {
        statusBar.textContent = "";
        statusBar.className = "data-status";
    }
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

function renderRelevantMarkets(result) {
    const container = document.getElementById("relevant-markets");
    if (renderStateMessage(container, result.state,
        "No relevant Musk / Trump posting markets active right now.",
        "Failed to load market data. Run export_dashboard.py.")) return;

    const markets = result.data;
    container.innerHTML = markets.map((m, i) => {
        const typeLabel = escapeHtml((m.market_type || "").replace("_", " "));
        const bracketLabel = m.bracket_label ? ` <span class="bracket-tag">${escapeHtml(m.bracket_label)}</span>` : "";
        return `
            <div class="market-card">
                <div class="market-card-header">
                    <span class="market-card-label">mkt ${String(i + 1).padStart(3, "0")} \u00B7 ${formatVolume(m.volume)} volume</span>
                    <span class="market-card-label">${formatHours(m.hours_until_expiry)} left</span>
                </div>
                <div class="market-card-question">${escapeHtml(m.question)}${bracketLabel}</div>
                <span class="market-card-type">${typeLabel}</span>
                ${renderProbBar(m.yes_price, m.no_price)}
            </div>`;
    }).join("");
}

// ---- SIGNAL FEED (overview, limited) ----

function renderSignalFeed(result) {
    const container = document.getElementById("signal-feed");
    if (renderStateMessage(container, result.state,
        "No signals generated. Run fetch + signals pipeline first.",
        "Failed to load signal data. Run export_dashboard.py.")) return;

    // Handle new format (object with .results) or old format (plain array)
    const signals = Array.isArray(result.data) ? result.data : (result.data.results || []);
    if (signals.length === 0) {
        container.innerHTML = '<div class="empty-state">No signals generated. Run fetch + signals pipeline first.</div>';
        return;
    }

    const sorted = [...signals].sort((a, b) => (b.score || 0) - (a.score || 0));
    const top = sorted.slice(0, 10);

    container.innerHTML = top.map(s => {
        const cls = s.signal === "TRADE" ? "trade" : s.signal === "WATCH" ? "watch" : "skip";
        const bracketLabel = s.bracket_label ? ` [${escapeHtml(s.bracket_label)}]` : "";
        const stratLabel = s.profile_id ? `<span class="signal-profile">${escapeHtml(s.profile_id)}</span>` : "";
        return `
            <div class="signal-card">
                <span class="signal-badge ${cls}">${escapeHtml(s.signal)}</span>
                <div class="signal-info">
                    <div class="signal-question">${escapeHtml(s.question)}${bracketLabel}</div>
                    <div class="signal-meta">
                        score <span class="score">${Number(s.score).toFixed(0)}</span>
                        \u00B7 NO ${formatCents(s.no_price)}
                        \u00B7 ${formatHours(s.hours_until_expiry)} left
                        ${stratLabel}
                    </div>
                    <div class="signal-reasons">${(s.reasons || []).map(r => escapeHtml(r)).join(" \u00B7 ")}</div>
                </div>
            </div>`;
    }).join("");
}

// ---- FULL SIGNALS TABLE ----

function renderSignalsFull(result) {
    const container = document.getElementById("signals-full");
    if (renderStateMessage(container, result.state,
        "No signals generated yet.",
        "Failed to load signal data.")) return;

    const signals = Array.isArray(result.data) ? result.data : (result.data.results || []);
    const strategyInfo = !Array.isArray(result.data) && result.data.strategy ? result.data.strategy : null;

    // Show strategy label if available
    const labelEl = document.getElementById("signals-strategy-label");
    if (strategyInfo) {
        labelEl.textContent = `${escapeHtml(strategyInfo.strategy_id || "")}@${escapeHtml(strategyInfo.strategy_version || "")} / ${escapeHtml(strategyInfo.profile_id || "")}`;
    } else {
        labelEl.textContent = "trade / watch / skip";
    }

    if (signals.length === 0) {
        container.innerHTML = '<div class="empty-state">No signals generated yet.</div>';
        return;
    }

    const rows = signals.map(s => {
        const cls = s.signal === "TRADE" ? "trade" : s.signal === "WATCH" ? "watch" : "skip";
        return `<tr>
            <td><span class="signal-badge ${cls}">${escapeHtml(s.signal)}</span></td>
            <td>${escapeHtml(s.question)}</td>
            <td>${escapeHtml(s.bracket_label || "")}</td>
            <td style="color: var(--accent-gold)">${Number(s.score).toFixed(0)}</td>
            <td>${formatCents(s.no_price)}</td>
            <td>${formatHours(s.hours_until_expiry)}</td>
            <td style="color: var(--text-dim); font-size: 10px;">${(s.reasons || []).map(r => escapeHtml(r)).join("; ")}</td>
        </tr>`;
    }).join("");

    container.innerHTML = `
        <table>
            <thead><tr>
                <th>signal</th><th>market</th><th>bracket</th><th>score</th><th>no price</th><th>expiry</th><th>reasons</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ---- LEDGER SUMMARY ----

function renderLedgerSummary(result) {
    const container = document.getElementById("ledger-summary");
    if (renderStateMessage(container, result.state,
        "No trades recorded yet. Run run_papertrade.py.",
        "Failed to load ledger data. Run export_dashboard.py.")) return;

    const ledger = result.data;
    const open = ledger.filter(t => t.status === "OPEN");
    const closed = ledger.filter(t => t.status !== "OPEN");
    const wins = closed.filter(t => t.status === "WON").length;
    const losses = closed.filter(t => t.status === "LOST").length;
    const expired = closed.filter(t => t.status === "EXPIRED").length;
    const totalPnl = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const definitive = wins + losses;
    const winRate = definitive > 0 ? (wins / definitive * 100) : 0;
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
                <span class="ledger-stat-label">won</span>
                <span class="ledger-stat-value" style="color: var(--green-bright)">${wins}</span>
            </div>
            <div class="ledger-stat">
                <span class="ledger-stat-label">lost</span>
                <span class="ledger-stat-value" style="color: var(--red)">${losses}</span>
            </div>
            <div class="ledger-stat">
                <span class="ledger-stat-label">expired</span>
                <span class="ledger-stat-value" style="color: var(--text-dim)">${expired}</span>
            </div>
            <div class="ledger-stat">
                <span class="ledger-stat-label">win rate</span>
                <span class="ledger-stat-value">${winRate.toFixed(0)}%</span>
            </div>
            <div class="ledger-stat">
                <span class="ledger-stat-label">p&amp;l</span>
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
        const statusCls = "status-" + (t.status || "open").toLowerCase();
        const pnlCls = t.pnl !== null ? (t.pnl >= 0 ? "pnl-positive" : "pnl-negative") : "";
        const bracketLabel = t.bracket_label ? ` [${escapeHtml(t.bracket_label)}]` : "";
        return `<tr>
            <td style="color: var(--text-dim); font-size: 11px;">${escapeHtml(t.trade_id)}</td>
            <td>${escapeHtml(t.question)}${bracketLabel}</td>
            <td class="${statusCls}">${escapeHtml(t.status)}</td>
            <td>${formatCents(t.entry_no_price)}</td>
            <td>$${Number(t.stake).toFixed(0)}</td>
            <td class="${pnlCls}">${t.pnl !== null ? formatPnl(t.pnl) : "\u2014"}</td>
        </tr>`;
    }).join("");

    container.innerHTML = statsHtml + `
        <table>
            <thead><tr>
                <th>id</th><th>market</th><th>status</th><th>entry no</th><th>stake</th><th>p&amp;l</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ---- FULL LEDGER ----

function renderLedgerFull(result) {
    const container = document.getElementById("ledger-full");
    if (renderStateMessage(container, result.state,
        "No trades recorded yet.",
        "Failed to load ledger data.")) return;

    const ledger = result.data;
    if (ledger.length === 0) {
        container.innerHTML = '<div class="empty-state">No trades recorded yet.</div>';
        return;
    }

    const rows = ledger.map(t => {
        const statusCls = "status-" + (t.status || "open").toLowerCase();
        const pnlCls = t.pnl !== null ? (t.pnl >= 0 ? "pnl-positive" : "pnl-negative") : "";
        return `<tr>
            <td style="color: var(--text-dim); font-size: 11px;">${escapeHtml(t.trade_id)}</td>
            <td>${escapeHtml(t.question)}</td>
            <td>${escapeHtml(t.bracket_label || "")}</td>
            <td>${escapeHtml(t.market_type || "\u2014")}</td>
            <td class="${statusCls}">${escapeHtml(t.status)}</td>
            <td>${formatCents(t.entry_no_price)}</td>
            <td>${t.exit_no_price !== null ? formatCents(t.exit_no_price) : "\u2014"}</td>
            <td>$${Number(t.stake).toFixed(0)}</td>
            <td class="${pnlCls}">${t.pnl !== null ? formatPnl(t.pnl) : "\u2014"}</td>
            <td>${escapeHtml(t.event_slug || "")}</td>
            <td style="color: var(--text-dim); font-size: 10px;">${escapeHtml(t.entry_time || "\u2014")}</td>
        </tr>`;
    }).join("");

    container.innerHTML = `
        <table>
            <thead><tr>
                <th>id</th><th>market</th><th>bracket</th><th>type</th><th>status</th><th>entry no</th><th>exit no</th><th>stake</th><th>p&amp;l</th><th>event</th><th>opened</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ---- RUN HISTORY (comparative) ----

function renderRunHistory(result) {
    const container = document.getElementById("runs-table");
    if (renderStateMessage(container, result.state,
        "No runs recorded yet. Run the pipeline with --profile to generate runs.",
        "Failed to load run history.")) return;

    const runs = result.data;
    if (runs.length === 0) {
        container.innerHTML = '<div class="empty-state">No runs recorded yet. Run the pipeline with --profile to generate runs.</div>';
        return;
    }

    const rows = runs.slice().reverse().map(r => {
        const pnlCls = r.total_pnl >= 0 ? "pnl-positive" : "pnl-negative";
        const winRate = (r.trades_won + r.trades_lost) > 0
            ? ((r.trades_won / (r.trades_won + r.trades_lost)) * 100).toFixed(0) + "%"
            : "\u2014";
        return `<tr>
            <td style="color: var(--text-dim); font-size: 10px;">${escapeHtml(r.run_id)}</td>
            <td>${escapeHtml(r.strategy_id)}@${escapeHtml(r.strategy_version)}</td>
            <td><span class="profile-tag profile-${escapeHtml(r.profile_id)}">${escapeHtml(r.profile_id)}</span></td>
            <td>${r.markets_evaluated}</td>
            <td style="color: var(--green-bright)">${r.signals_trade}</td>
            <td>${r.signals_watch}</td>
            <td>${r.trades_opened}</td>
            <td>${r.trades_open}</td>
            <td style="color: var(--green-bright)">${r.trades_won || 0}</td>
            <td style="color: var(--red)">${r.trades_lost || 0}</td>
            <td style="color: var(--text-dim)">${r.trades_expired || 0}</td>
            <td>${winRate}</td>
            <td class="${pnlCls}">${formatPnl(r.total_pnl)}</td>
            <td>$${r.open_exposure.toFixed(0)}</td>
            <td style="color: var(--text-dim); font-size: 10px;">${escapeHtml(r.created_at || "")}</td>
        </tr>`;
    }).join("");

    container.innerHTML = `
        <table>
            <thead><tr>
                <th>run id</th><th>strategy</th><th>profile</th><th>markets</th>
                <th>trade</th><th>watch</th>
                <th>opened</th><th>open</th><th>won</th><th>lost</th><th>exp</th><th>win%</th><th>p&amp;l</th><th>exposure</th><th>created</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ---- ALL MARKETS ----

function renderAllMarkets(result) {
    const container = document.getElementById("all-markets");
    const countEl = document.getElementById("markets-count");

    if (renderStateMessage(container, result.state,
        "No relevant market data loaded.",
        "Failed to load market data.")) {
        countEl.textContent = "";
        return;
    }

    const markets = result.data;
    countEl.textContent = markets.length + " markets";

    const sorted = [...markets].sort((a, b) => (b.volume || 0) - (a.volume || 0));
    const top = sorted.slice(0, 30);

    container.innerHTML = top.map((m, i) => {
        const typeLabel = m.market_type ? `<span class="market-card-type">${escapeHtml(m.market_type.replace("_", " "))}</span>` : "";
        const bracketLabel = m.bracket_label ? ` <span class="bracket-tag">${escapeHtml(m.bracket_label)}</span>` : "";
        return `
            <div class="market-card">
                <div class="market-card-header">
                    <span class="market-card-label">mkt ${String(i + 1).padStart(3, "0")} \u00B7 ${formatVolume(m.volume)} volume</span>
                    <span class="market-card-label">${formatHours(m.hours_until_expiry)}</span>
                </div>
                <div class="market-card-question">${escapeHtml(m.question)}${bracketLabel}</div>
                ${typeLabel}
                ${renderProbBar(m.yes_price, m.no_price)}
            </div>`;
    }).join("");

    if (markets.length > 30) {
        container.innerHTML += `<div class="empty-state">\u2026 and ${markets.length - 30} more markets</div>`;
    }
}

// ---- PER-PROFILE LEDGER COMPARISON ----

async function loadPerProfileLedgers(meta) {
    if (meta.state !== LoadState.LOADED || !meta.data.ledger_files) return [];
    const results = [];
    for (const filename of meta.data.ledger_files) {
        const result = await loadJSON("data/" + filename);
        if (result.state === LoadState.LOADED) {
            // Extract profile from filename: ledger_no_side_moderate.json → no_side / moderate
            const match = filename.match(/^ledger_(.+)_(.+)\.json$/);
            const strategyId = match ? match[1] : "unknown";
            const profileId = match ? match[2] : "unknown";
            results.push({ filename, strategyId, profileId, data: result.data });
        }
    }
    return results;
}

function renderProfileComparison(profileLedgers, container) {
    if (!profileLedgers.length) return;

    const rows = profileLedgers.map(pl => {
        const open = pl.data.filter(t => t.status === "OPEN");
        const closed = pl.data.filter(t => t.status !== "OPEN");
        const wins = closed.filter(t => t.status === "WON").length;
        const losses = closed.filter(t => t.status === "LOST").length;
        const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
        const definitive = wins + losses;
        const winRate = definitive > 0 ? (wins / definitive * 100).toFixed(0) + "%" : "\u2014";
        const pnlCls = totalPnl >= 0 ? "pnl-positive" : "pnl-negative";
        return `<tr>
            <td>${escapeHtml(pl.strategyId)}</td>
            <td><span class="profile-tag profile-${escapeHtml(pl.profileId)}">${escapeHtml(pl.profileId)}</span></td>
            <td>${pl.data.length}</td>
            <td style="color: var(--blue)">${open.length}</td>
            <td style="color: var(--green-bright)">${wins}</td>
            <td style="color: var(--red)">${losses}</td>
            <td>${winRate}</td>
            <td class="${pnlCls}">${formatPnl(totalPnl)}</td>
            <td>$${open.reduce((s, t) => s + t.stake, 0).toFixed(0)}</td>
        </tr>`;
    }).join("");

    const html = `
        <div class="panel" style="margin-top: 16px;">
            <div class="panel-header">
                <h2>Per-Profile Ledger Comparison</h2>
                <span class="provenance-badge">simulated</span>
            </div>
            <table>
                <thead><tr>
                    <th>strategy</th><th>profile</th><th>trades</th><th>open</th>
                    <th>won</th><th>lost</th><th>win%</th><th>p&amp;l</th><th>exposure</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;

    container.insertAdjacentHTML("beforeend", html);
}

// ---- MAIN ----

async function init() {
    initTabs();

    const [relevant, signals, ledger, runs, meta] = await Promise.all([
        loadJSON("data/relevant.json"),
        loadJSON("data/signals.json"),
        loadJSON("data/ledger.json"),
        loadJSON("data/runs.json"),
        loadJSON("data/meta.json"),
    ]);

    const safeRender = (name, fn) => {
        try { fn(); } catch (e) {
            console.error(`Render ${name} failed:`, e);
            const el = document.getElementById(name);
            if (el) el.innerHTML = `<div class="error-state">Render error in ${name}: ${escapeHtml(String(e))}</div>`;
        }
    };

    safeRender("header", () => renderHeaderStats(relevant, signals, ledger, meta));
    safeRender("relevant-markets", () => renderRelevantMarkets(relevant));
    safeRender("signal-feed", () => renderSignalFeed(signals));
    safeRender("signals-full", () => renderSignalsFull(signals));
    safeRender("ledger-summary", () => renderLedgerSummary(ledger));
    safeRender("ledger-full", () => renderLedgerFull(ledger));
    safeRender("runs-table", () => renderRunHistory(runs));
    safeRender("all-markets", () => renderAllMarkets(relevant));

    // Load per-profile ledgers for comparative view
    const profileLedgers = await loadPerProfileLedgers(meta);
    if (profileLedgers.length > 1) {
        renderProfileComparison(profileLedgers, document.getElementById("tab-ledger"));
    }
}

init().catch(err => {
    console.error("Dashboard init failed:", err);
    const bar = document.getElementById("data-status-bar");
    if (bar) {
        bar.textContent = "JS error: " + String(err);
        bar.className = "data-status data-status-error";
    }
    // Try to render whatever loaded successfully
    document.querySelectorAll(".empty-state").forEach(el => {
        if (el.textContent === "Loading...") {
            el.textContent = "Failed to render — check console. Error: " + String(err);
        }
    });
});
