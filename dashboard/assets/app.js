// SENTINEL — Dashboard data loader and renderer
// Hardened: error vs empty states, source-based freshness, safe rendering

// ---- DATA LOADING ----

const LoadState = { LOADING: "loading", LOADED: "loaded", EMPTY: "empty", FAILED: "failed" };

const REFRESH_INTERVAL_MS = 60000; // 60 seconds

async function loadJSON(path, bustCache) {
    try {
        const url = bustCache ? path + "?_t=" + Date.now() : path;
        const resp = await fetch(url);
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

/** Check summary-dependent panel state. Returns true if the panel was consumed (FAILED/not loaded). */
function checkSummaryState(container, result, panelName) {
    if (result.state === LoadState.FAILED) {
        container.innerHTML = `<div class="error-state">Failed to load summary data for ${escapeHtml(panelName)}.</div>`;
        return true;
    }
    if (result.state !== LoadState.LOADED || !result.data) {
        container.innerHTML = `<div class="empty-state">No ${escapeHtml(panelName)} data yet.</div>`;
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

function renderHeaderStats(relevant, signals, ledger, meta, summary, pipelineReport) {
    document.getElementById("stat-relevant").textContent =
        relevant.state === LoadState.LOADED ? relevant.data.length : "\u2014";

    // Freshness: show the oldest source mtime across all core files.
    // This way "3h ago" means the oldest file is 3h old, not the freshest.
    const freshnessEl = document.getElementById("stat-freshness");
    if (meta.state === LoadState.LOADED && meta.data.sources) {
        const coreFiles = ["relevant.json", "signals.json", "ledger.json", "summary.json"];
        let oldestMs = null;
        for (const key of coreFiles) {
            const src = meta.data.sources[key];
            if (src && src.modified_at) {
                const ms = new Date(src.modified_at).getTime();
                if (!isNaN(ms) && (oldestMs === null || ms < oldestMs)) {
                    oldestMs = ms;
                }
            }
        }
        if (oldestMs !== null) {
            freshnessEl.textContent = formatFreshness(new Date(oldestMs).toISOString());
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

    // Data status bar — monitors all core data files
    const statusBar = document.getElementById("data-status-bar");
    const coreStates = [relevant, signals, ledger];
    const evalStates = [summary, pipelineReport];
    const anyCoreFailed = coreStates.some(s => s.state === LoadState.FAILED);
    const anyEvalFailed = evalStates.some(s => s && s.state === LoadState.FAILED);
    const allEmpty = coreStates.every(s => s.state === LoadState.EMPTY || s.state === LoadState.FAILED);
    if (anyCoreFailed) {
        statusBar.textContent = "some data failed to load";
        statusBar.className = "data-status data-status-error";
    } else if (anyEvalFailed) {
        statusBar.textContent = "evaluation data failed to load \u2014 breakdowns may be stale";
        statusBar.className = "data-status data-status-warn";
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
        const runPnl = r.total_pnl || 0;
        const pnlCls = runPnl >= 0 ? "pnl-positive" : "pnl-negative";
        const won = r.trades_won || 0;
        const lost = r.trades_lost || 0;
        const winRate = (won + lost) > 0
            ? ((won / (won + lost)) * 100).toFixed(0) + "%"
            : "\u2014";
        return `<tr>
            <td style="color: var(--text-dim); font-size: 10px;">${escapeHtml(r.run_id)}</td>
            <td>${escapeHtml(r.strategy_id)}@${escapeHtml(r.strategy_version)}</td>
            <td><span class="profile-tag profile-${escapeHtml(r.profile_id)}">${escapeHtml(r.profile_id)}</span></td>
            <td>${r.markets_evaluated || 0}</td>
            <td style="color: var(--green-bright)">${r.signals_trade || 0}</td>
            <td>${r.signals_watch || 0}</td>
            <td>${r.trades_opened || 0}</td>
            <td>${r.trades_open || 0}</td>
            <td style="color: var(--green-bright)">${won}</td>
            <td style="color: var(--red)">${lost}</td>
            <td style="color: var(--text-dim)">${r.trades_expired || 0}</td>
            <td>${winRate}</td>
            <td class="${pnlCls}">${formatPnl(runPnl)}</td>
            <td>$${(r.open_exposure || 0).toFixed(0)}</td>
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

// ---- EVALUATION SUMMARY ----

function renderEvaluationSummary(result) {
    const container = document.getElementById("evaluation-summary");
    if (renderStateMessage(container, result.state,
        "No evaluation summary yet. Run generate_summary.py.",
        "Failed to load evaluation summary.")) return;

    const data = result.data;
    const profiles = data.profiles || [];
    const totals = data.totals || {};

    // Per-profile table
    const profileRows = profiles.map(p => {
        const s = p.signals || {};
        const t = p.trades || {};
        const pnl = t.total_pnl || 0;
        const pnlCls = pnl >= 0 ? "pnl-positive" : "pnl-negative";
        const avgRes = t.avg_hours_to_resolution != null ? t.avg_hours_to_resolution + "h" : "\u2014";
        return `<tr>
            <td><span class="profile-tag profile-${escapeHtml(p.profile_id)}">${escapeHtml(p.profile_id)}</span></td>
            <td style="color: var(--green-bright)">${s.trade || 0}</td>
            <td>${s.watch || 0}</td>
            <td style="color: var(--text-dim)">${s.skip || 0}</td>
            <td>${t.total_trades || 0}</td>
            <td style="color: var(--blue)">${t.open_trades || 0}</td>
            <td style="color: var(--green-bright)">${t.wins || 0}</td>
            <td style="color: var(--red)">${t.losses || 0}</td>
            <td style="color: var(--text-dim)">${t.expired || 0}</td>
            <td>${t.win_rate_pct || 0}%</td>
            <td class="${pnlCls}">${formatPnl(t.realized_pnl || 0)}</td>
            <td>$${(t.unrealized_exposure || t.open_exposure || 0).toFixed(0)}</td>
            <td style="color: var(--text-dim)">${avgRes}</td>
        </tr>`;
    }).join("");

    // Totals row (null-safe)
    const totRealizedPnl = totals.realized_pnl || totals.total_pnl || 0;
    const totPnlCls = totRealizedPnl >= 0 ? "pnl-positive" : "pnl-negative";

    const html = `
        <div class="eval-freshness">
            Generated: ${escapeHtml(formatFreshness(data.generated_at))}
        </div>
        <table>
            <thead><tr>
                <th>profile</th>
                <th>trade</th><th>watch</th><th>skip</th>
                <th>trades</th><th>open</th><th>won</th><th>lost</th><th>exp</th>
                <th>win%</th><th>realized p&amp;l</th><th>exposure</th><th>avg res</th>
            </tr></thead>
            <tbody>
                ${profileRows}
                <tr class="totals-row">
                    <td><strong>TOTAL</strong></td>
                    <td colspan="3">${totals.signals_evaluated || 0} signals</td>
                    <td>${totals.total_trades || 0}</td>
                    <td style="color: var(--blue)">${totals.open_trades || 0}</td>
                    <td style="color: var(--green-bright)">${totals.wins || 0}</td>
                    <td style="color: var(--red)">${totals.losses || 0}</td>
                    <td>\u2014</td>
                    <td>${totals.win_rate_pct || 0}%</td>
                    <td class="${totPnlCls}">${formatPnl(totRealizedPnl)}</td>
                    <td>$${(totals.unrealized_exposure || totals.open_exposure || 0).toFixed(0)}</td>
                    <td>\u2014</td>
                </tr>
            </tbody>
        </table>`;

    container.innerHTML = html;
}

function renderPipelineStatus(result) {
    const container = document.getElementById("pipeline-status");
    if (renderStateMessage(container, result.state,
        "No pipeline report yet. Run run_pipeline.sh or wait for automation.",
        "Failed to load pipeline report.")) return;

    const data = result.data;
    const statusCls = data.status === "success" ? "pnl-positive" :
                      data.status === "partial_failure" ? "pnl-negative" : "error-state";

    const steps = data.steps || {};
    const stepRows = Object.entries(steps).map(([name, status]) => {
        const cls = status === "success" ? "status-won" :
                    status === "failed" ? "status-lost" :
                    status === "skipped" ? "status-expired" : "";
        return `<tr>
            <td>${escapeHtml(name)}</td>
            <td class="${cls}">${escapeHtml(status)}</td>
        </tr>`;
    }).join("");

    container.innerHTML = `
        <div class="pipeline-header">
            <span class="${statusCls}">${escapeHtml(data.status || "unknown")}</span>
            <span style="color: var(--text-dim); margin-left: 12px;">
                ${escapeHtml(data.pipeline_start || "")} \u2192 ${escapeHtml(data.pipeline_end || "")}
            </span>
            <span style="color: var(--text-dim); margin-left: 12px;">
                ${data.errors || 0} error(s)
            </span>
        </div>
        <table style="margin-top: 8px;">
            <thead><tr><th>step</th><th>status</th></tr></thead>
            <tbody>${stepRows}</tbody>
        </table>`;
}

// ---- ALERTS ----

function renderAlerts(result) {
    const container = document.getElementById("eval-alerts");
    if (!container) return;
    if (result.state !== LoadState.LOADED || !result.data.alerts || result.data.alerts.length === 0) {
        container.innerHTML = "";
        return;
    }

    const alerts = result.data.alerts;
    container.innerHTML = alerts.map(a => {
        const cls = a.level === "error" ? "alert-error" :
                    a.level === "warning" ? "alert-warning" : "alert-info";
        return `<div class="alert ${cls}">${escapeHtml(a.level.toUpperCase())}: ${escapeHtml(a.message)}</div>`;
    }).join("");
}

// ---- BREAKDOWNS ----

function renderBreakdownSubject(result) {
    const container = document.getElementById("breakdown-subject");
    if (result.state !== LoadState.LOADED || !result.data.breakdowns) {
        container.innerHTML = '<div class="empty-state">No breakdown data.</div>';
        return;
    }
    const data = result.data.breakdowns.signals.by_subject || {};
    if (Object.keys(data).length === 0) {
        container.innerHTML = '<div class="empty-state">No signal data by subject.</div>';
        return;
    }
    const rows = Object.entries(data).map(([subj, counts]) => {
        const total = (counts.trade || 0) + (counts.watch || 0) + (counts.skip || 0);
        return `<tr>
            <td>${escapeHtml(subj)}</td>
            <td style="color: var(--green-bright)">${counts.trade || 0}</td>
            <td>${counts.watch || 0}</td>
            <td style="color: var(--text-dim)">${counts.skip || 0}</td>
            <td>${total}</td>
        </tr>`;
    }).join("");
    container.innerHTML = `<table>
        <thead><tr><th>subject</th><th>trade</th><th>watch</th><th>skip</th><th>total</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
}

function renderBreakdownSkipReason(result) {
    const container = document.getElementById("breakdown-skip-reason");
    if (result.state !== LoadState.LOADED || !result.data.breakdowns) {
        container.innerHTML = '<div class="empty-state">No breakdown data.</div>';
        return;
    }
    const data = result.data.breakdowns.signals.by_skip_reason || {};
    if (Object.keys(data).length === 0) {
        container.innerHTML = '<div class="empty-state">No skip reasons recorded.</div>';
        return;
    }
    const rows = Object.entries(data).map(([reason, count]) =>
        `<tr><td>${escapeHtml(reason.replace(/_/g, " "))}</td><td>${count}</td></tr>`
    ).join("");
    container.innerHTML = `<table>
        <thead><tr><th>reason</th><th>count</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
}

function renderBreakdownExpiry(result) {
    const container = document.getElementById("breakdown-expiry");
    if (result.state !== LoadState.LOADED || !result.data.breakdowns) {
        container.innerHTML = '<div class="empty-state">No breakdown data.</div>';
        return;
    }
    const data = result.data.breakdowns.signals.by_expiry || {};
    if (Object.keys(data).length === 0) {
        container.innerHTML = '<div class="empty-state">No expiry data.</div>';
        return;
    }
    const rows = Object.entries(data).map(([bucket, counts]) =>
        `<tr>
            <td>${escapeHtml(bucket)}</td>
            <td style="color: var(--green-bright)">${counts.trade || 0}</td>
            <td>${counts.watch || 0}</td>
            <td style="color: var(--text-dim)">${counts.skip || 0}</td>
        </tr>`
    ).join("");
    container.innerHTML = `<table>
        <thead><tr><th>expiry window</th><th>trade</th><th>watch</th><th>skip</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
}

function renderBreakdownTradesSubject(result) {
    const container = document.getElementById("breakdown-trades-subject");
    if (result.state !== LoadState.LOADED || !result.data.breakdowns) {
        container.innerHTML = '<div class="empty-state">No breakdown data.</div>';
        return;
    }
    const data = result.data.breakdowns.trades.by_subject || {};
    if (Object.keys(data).length === 0) {
        container.innerHTML = '<div class="empty-state">No trades by subject.</div>';
        return;
    }
    const rows = Object.entries(data).map(([subj, s]) => {
        const rpnl = s.realized_pnl || 0;
        const pnlCls = rpnl >= 0 ? "pnl-positive" : "pnl-negative";
        return `<tr>
            <td>${escapeHtml(subj)}</td>
            <td>${s.total || 0}</td>
            <td style="color: var(--blue)">${s.open || 0}</td>
            <td style="color: var(--green-bright)">${s.won || 0}</td>
            <td style="color: var(--red)">${s.lost || 0}</td>
            <td style="color: var(--text-dim)">${s.expired || 0}</td>
            <td class="${pnlCls}">${formatPnl(rpnl)}</td>
            <td>$${(s.unrealized_exposure || 0).toFixed(0)}</td>
        </tr>`;
    }).join("");
    container.innerHTML = `<table>
        <thead><tr><th>subject</th><th>trades</th><th>open</th><th>won</th><th>lost</th><th>exp</th><th>realized p&amp;l</th><th>exposure</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
}

function renderBreakdownEvent(result) {
    const container = document.getElementById("breakdown-event");
    if (result.state !== LoadState.LOADED || !result.data.breakdowns) {
        container.innerHTML = '<div class="empty-state">No breakdown data.</div>';
        return;
    }
    const data = result.data.breakdowns.signals.by_event || {};
    if (Object.keys(data).length === 0) {
        container.innerHTML = '<div class="empty-state">No event data.</div>';
        return;
    }
    const rows = Object.entries(data).map(([slug, counts]) => {
        const total = (counts.trade || 0) + (counts.watch || 0) + (counts.skip || 0);
        const title = counts.event_title || slug;
        return `<tr>
            <td title="${escapeHtml(slug)}">${escapeHtml(title.length > 60 ? title.slice(0, 57) + "..." : title)}</td>
            <td style="color: var(--green-bright)">${counts.trade || 0}</td>
            <td>${counts.watch || 0}</td>
            <td style="color: var(--text-dim)">${counts.skip || 0}</td>
            <td>${total}</td>
        </tr>`;
    }).join("");
    container.innerHTML = `<table>
        <thead><tr><th>event</th><th>trade</th><th>watch</th><th>skip</th><th>total</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
}

function renderBreakdownTradesEvent(result) {
    const container = document.getElementById("breakdown-trades-event");
    if (result.state !== LoadState.LOADED || !result.data.breakdowns) {
        container.innerHTML = '<div class="empty-state">No breakdown data.</div>';
        return;
    }
    const data = result.data.breakdowns.trades.by_event || {};
    if (Object.keys(data).length === 0) {
        container.innerHTML = '<div class="empty-state">No trades by event.</div>';
        return;
    }
    const rows = Object.entries(data).map(([slug, s]) => {
        const rpnl = s.realized_pnl || 0;
        const pnlCls = rpnl >= 0 ? "pnl-positive" : "pnl-negative";
        const title = s.event_title || slug;
        return `<tr>
            <td title="${escapeHtml(slug)}">${escapeHtml(title.length > 50 ? title.slice(0, 47) + "..." : title)}</td>
            <td>${s.total || 0}</td>
            <td style="color: var(--blue)">${s.open || 0}</td>
            <td style="color: var(--green-bright)">${s.won || 0}</td>
            <td style="color: var(--red)">${s.lost || 0}</td>
            <td class="${pnlCls}">${formatPnl(rpnl)}</td>
            <td>$${(s.unrealized_exposure || 0).toFixed(0)}</td>
        </tr>`;
    }).join("");
    container.innerHTML = `<table>
        <thead><tr><th>event</th><th>trades</th><th>open</th><th>won</th><th>lost</th><th>realized p&amp;l</th><th>exposure</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
}

// ---- OPERATOR SUMMARY ----

function renderPositionOutcomeLine(outcomes) {
    if (!outcomes) return "";
    const positions = ["hot", "adjacent", "tail"];
    const colors = { hot: "var(--red)", adjacent: "var(--accent-gold)", tail: "var(--green-bright)" };
    const parts = positions.map(pos => {
        const o = outcomes[pos] || {};
        const wr = o.win_rate_pct || 0;
        const w = o.won || 0;
        const l = o.lost || 0;
        const total = w + l;
        if (total === 0) return `<span style="color: ${colors[pos]}">${pos}</span>: —`;
        return `<span style="color: ${colors[pos]}">${pos}</span>: ${wr}% (${w}W/${l}L)`;
    }).join(" &middot; ");
    return `<div style="margin-top: 6px; font-size: 12px; color: var(--text-secondary);">
        outcomes: ${parts}
    </div>`;
}

function renderOpsStatus(ops) {
    if (!ops) return "";
    const freshCls = ops.freshness_status === "fresh" ? "status-won" :
                     ops.freshness_status === "stale" ? "status-lost" : "status-expired";
    const ageStr = ops.freshness_age_minutes != null ? ops.freshness_age_minutes + "m" : "?";
    // Three distinct timestamps
    const pipelineTime = ops.last_pipeline_completed_at
        ? formatFreshness(ops.last_pipeline_completed_at)
        : (ops.last_successful_pipeline_run_at  // backward compat
            ? formatFreshness(ops.last_successful_pipeline_run_at)
            : "never");
    const summaryTime = ops.last_summary_generated_at
        ? formatFreshness(ops.last_summary_generated_at)
        : (ops.last_successful_summary_generated_at || "?");  // backward compat
    const exportTime = ops.last_export_at
        ? formatFreshness(ops.last_export_at)
        : (ops.last_successful_export_at
            ? formatFreshness(ops.last_successful_export_at)
            : "pending");
    const byPos = ops.definitive_outcomes_by_position || {};
    return `<div style="margin-top: 8px; padding: 6px 8px; background: rgba(255,255,255,0.03); border-radius: 4px; font-size: 11px; color: var(--text-dim);">
        <span style="margin-right: 12px;">pipeline: ${escapeHtml(pipelineTime)}</span>
        <span style="margin-right: 12px;">summary: ${escapeHtml(summaryTime)}</span>
        <span style="margin-right: 12px;">export: ${escapeHtml(exportTime)}</span>
        <span style="margin-right: 12px;">data freshness: <span class="${freshCls}">${escapeHtml(ops.freshness_status || "unknown")}</span> (${escapeHtml(ageStr)})</span>
        <span>outcomes: ${ops.definitive_outcomes_total || 0} (hot:${byPos.hot || 0} adj:${byPos.adjacent || 0} tail:${byPos.tail || 0})</span>
    </div>`;
}

function renderReadinessGate(gate) {
    if (!gate) return "";
    const readyCls = gate.position_strategy_ready ? "status-won" : "status-expired";
    const reasons = (gate.reasons || []).map(r =>
        `<span style="display: inline-block; margin: 1px 6px 1px 0; padding: 1px 5px; background: rgba(255,255,255,0.05); border-radius: 3px; font-size: 10px;">${escapeHtml(r)}</span>`
    ).join("");
    return `<div style="margin-top: 4px; font-size: 11px; color: var(--text-dim);">
        readiness: <span class="${readyCls}">${escapeHtml(gate.evidence_label || "unknown")}</span>
        ${reasons ? '<div style="margin-top: 3px;">' + reasons + '</div>' : ''}
    </div>`;
}

function renderOperatorSummary(result) {
    const container = document.getElementById("operator-summary");
    if (!container) return;
    if (checkSummaryState(container, result, "operator summary")) return;
    if (!result.data.operator_summary) {
        container.innerHTML = '<div class="empty-state">No operator summary yet.</div>';
        return;
    }

    const op = result.data.operator_summary;
    const posCoverage = op.position_coverage || {};
    const rpnl = op.realized_pnl || 0;
    const pnlCls = rpnl >= 0 ? "pnl-positive" : "pnl-negative";

    container.innerHTML = `
        <div class="operator-grid">
            <div class="op-stat">
                <span class="op-label">families</span>
                <span class="op-value">${op.total_families || 0}</span>
            </div>
            <div class="op-stat">
                <span class="op-label">brackets evaluated</span>
                <span class="op-value">${op.total_brackets_evaluated || 0}</span>
            </div>
            <div class="op-stat">
                <span class="op-label">active trades</span>
                <span class="op-value" style="color: var(--blue)">${op.active_trades || 0}</span>
            </div>
            <div class="op-stat">
                <span class="op-label">definitive outcomes</span>
                <span class="op-value">${op.definitive_outcomes || 0}</span>
            </div>
            <div class="op-stat">
                <span class="op-label">win rate</span>
                <span class="op-value">${op.win_rate_pct || 0}%</span>
            </div>
            <div class="op-stat">
                <span class="op-label">realized p&amp;l</span>
                <span class="op-value ${pnlCls}">${formatPnl(rpnl)}</span>
            </div>
            <div class="op-stat">
                <span class="op-label">exposure</span>
                <span class="op-value">$${(op.unrealized_exposure || 0).toFixed(0)}</span>
            </div>
            <div class="op-stat">
                <span class="op-label">trades by position</span>
                <span class="op-value" style="font-size: 12px">
                    <span style="color: var(--red)">${posCoverage.hot || 0} hot</span>
                    <span style="color: var(--accent-gold)"> ${posCoverage.adjacent || 0} adj</span>
                    <span style="color: var(--green-bright)"> ${posCoverage.tail || 0} tail</span>
                </span>
            </div>
        </div>
        ${renderPositionOutcomeLine(op.position_outcomes || {})}
        <div class="op-strategy-b" style="margin-top: 4px; color: var(--text-dim); font-size: 12px;">
            Strategy B: ${escapeHtml(op.strategy_b_status || "unknown")}
        </div>
        <div style="margin-top: 2px; color: var(--text-dim); font-size: 11px; font-style: italic;">
            ${escapeHtml(op.position_verdict || "")}
        </div>
        ${renderOpsStatus(op.ops_status)}
        ${renderReadinessGate(op.readiness_gate)}`;
}

// ---- BRACKET POSITION BREAKDOWNS ----

function renderBreakdownBracketSignals(result) {
    const container = document.getElementById("breakdown-bracket-signals");
    if (checkSummaryState(container, result, "bracket signals")) return;
    if (!result.data.breakdowns || !result.data.breakdowns.bracket_position) {
        container.innerHTML = '<div class="empty-state">No bracket position data.</div>';
        return;
    }
    const data = result.data.breakdowns.bracket_position.signals_by_position || {};
    if (Object.keys(data).length === 0) {
        container.innerHTML = '<div class="empty-state">No bracket position data.</div>';
        return;
    }
    const positionColors = { hot: "var(--red)", adjacent: "var(--accent-gold)", tail: "var(--green-bright)" };
    const rows = Object.entries(data).map(([pos, counts]) => {
        const total = (counts.trade || 0) + (counts.watch || 0) + (counts.skip || 0);
        const color = positionColors[pos] || "var(--text-dim)";
        return `<tr>
            <td style="color: ${color}; font-weight: 600">${escapeHtml(pos)}</td>
            <td style="color: var(--green-bright)">${counts.trade || 0}</td>
            <td>${counts.watch || 0}</td>
            <td style="color: var(--text-dim)">${counts.skip || 0}</td>
            <td>${total}</td>
        </tr>`;
    }).join("");
    container.innerHTML = `
        <p style="color: var(--text-dim); font-size: 11px; margin: 0 0 8px 0;">
            ${result.data.breakdowns.bracket_position.families_analyzed || 0} families analyzed
        </p>
        <table>
            <thead><tr><th>position</th><th>trade</th><th>watch</th><th>skip</th><th>total</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderBreakdownBracketTrades(result) {
    const container = document.getElementById("breakdown-bracket-trades");
    if (checkSummaryState(container, result, "bracket trades")) return;
    if (!result.data.breakdowns || !result.data.breakdowns.bracket_position) {
        container.innerHTML = '<div class="empty-state">No bracket position data.</div>';
        return;
    }
    const bp = result.data.breakdowns.bracket_position;
    const data = bp.trades_by_position || {};
    if (Object.keys(data).length === 0) {
        container.innerHTML = '<div class="empty-state">No trades by bracket position.</div>';
        return;
    }
    const positionColors = { hot: "var(--red)", adjacent: "var(--accent-gold)", tail: "var(--green-bright)" };
    const rows = Object.entries(data).map(([pos, s]) => {
        const rpnl = s.realized_pnl || 0;
        const pnlCls = rpnl >= 0 ? "pnl-positive" : "pnl-negative";
        const color = positionColors[pos] || "var(--text-dim)";
        const avgRes = s.avg_hours_to_resolution != null ? s.avg_hours_to_resolution + "h" : "\u2014";
        return `<tr>
            <td style="color: ${color}; font-weight: 600">${escapeHtml(pos)}</td>
            <td>${s.total || 0}</td>
            <td style="color: var(--blue)">${s.open || 0}</td>
            <td style="color: var(--green-bright)">${s.won || 0}</td>
            <td style="color: var(--red)">${s.lost || 0}</td>
            <td style="color: var(--text-dim)">${s.expired || 0}</td>
            <td style="color: var(--text-dim)">${s.cancelled || 0}</td>
            <td>${s.win_rate_pct || 0}%</td>
            <td class="${pnlCls}">${formatPnl(rpnl)}</td>
            <td>$${(s.unrealized_exposure || 0).toFixed(0)}</td>
            <td style="color: var(--text-dim)">${avgRes}</td>
        </tr>`;
    }).join("");
    container.innerHTML = `<table>
        <thead><tr><th>position</th><th>trades</th><th>open</th><th>won</th><th>lost</th><th>exp</th><th>canc</th><th>win%</th><th>realized p&amp;l</th><th>exposure</th><th>avg res</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
}

// ---- POSITION ASSESSMENT ----

function renderPositionAssessment(result) {
    const container = document.getElementById("position-assessment");
    if (!container) return;
    if (checkSummaryState(container, result, "position assessment")) return;
    if (!result.data.breakdowns || !result.data.breakdowns.bracket_position ||
        !result.data.breakdowns.bracket_position.position_assessment) {
        container.innerHTML = '<div class="empty-state">No position assessment data.</div>';
        return;
    }

    const a = result.data.breakdowns.bracket_position.position_assessment;
    const positionColors = { hot: "var(--red)", adjacent: "var(--accent-gold)", tail: "var(--green-bright)" };

    const positionRows = ["hot", "adjacent", "tail"].map(pos => {
        const verdict = a[pos] || "no data";
        const color = positionColors[pos] || "var(--text-dim)";
        return `<tr>
            <td style="color: ${color}; font-weight: 600">${pos}</td>
            <td>${escapeHtml(verdict)}</td>
        </tr>`;
    }).join("");

    const recs = (a.recommendations || []).map(r =>
        `<div class="assessment-rec">${escapeHtml(r)}</div>`
    ).join("");

    container.innerHTML = `
        <div style="margin-bottom: 8px; color: var(--text-secondary);">
            ${escapeHtml(a.summary || "")}
        </div>
        <table>
            <thead><tr><th>position</th><th>assessment</th></tr></thead>
            <tbody>${positionRows}</tbody>
        </table>
        <div style="margin-top: 10px;">${recs}</div>`;
}

// ---- STRATEGY B PROGRESS ----

function renderStrategyBProgress(result) {
    const container = document.getElementById("strategy-b-progress");
    if (checkSummaryState(container, result, "Strategy B progress")) return;
    if (!result.data.strategy_b_progress) {
        container.innerHTML = '<div class="empty-state">No Strategy B progress data.</div>';
        return;
    }

    const sb = result.data.strategy_b_progress;
    const criteria = sb.criteria || [];

    const criteriaRows = criteria.map(c => {
        const icon = c.met ? "&#9745;" : "&#9744;";
        const cls = c.met ? "status-won" : "";
        return `<tr>
            <td class="${cls}">${icon}</td>
            <td>${escapeHtml(c.criterion)}</td>
            <td style="color: var(--text-dim)">${escapeHtml(String(c.current))}</td>
            <td style="color: var(--text-dim)">${escapeHtml(String(c.target))}</td>
        </tr>`;
    }).join("");

    const readyCls = sb.ready ? "status-won" : "status-expired";

    container.innerHTML = `
        <div style="margin-bottom: 8px;">
            <span class="${readyCls}" style="font-weight: 600;">
                ${sb.criteria_met}/${sb.criteria_total} criteria met
            </span>
            <span style="color: var(--text-dim); margin-left: 12px;">
                ${escapeHtml(sb.recommendation)}
            </span>
        </div>
        <table>
            <thead><tr><th></th><th>criterion</th><th>current</th><th>target</th></tr></thead>
            <tbody>${criteriaRows}</tbody>
        </table>`;
}

// ---- PER-PROFILE LEDGER COMPARISON ----

async function loadPerProfileLedgers(meta, bustCache) {
    if (meta.state !== LoadState.LOADED || !meta.data.ledger_files) return [];
    const results = [];
    for (const filename of meta.data.ledger_files) {
        const result = await loadJSON("data/" + filename, bustCache);
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

// ---- SAFE RENDER HELPER ----

function safeRender(name, fn) {
    try { fn(); } catch (e) {
        console.error(`Render ${name} failed:`, e);
        const el = document.getElementById(name);
        if (el) el.innerHTML = `<div class="error-state">Render error in ${name}: ${escapeHtml(String(e))}</div>`;
    }
}

// ---- PAGE REFRESH INDICATOR ----
// Shows when the browser last re-fetched data. NOT data freshness (that comes from meta.json).

function updatePageRefreshIndicator() {
    const el = document.getElementById("page-refresh-time");
    if (el) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        el.textContent = hh + ":" + mm + ":" + ss;
    }
}

// ---- DATA REFRESH ----
// Loads all data files and re-renders. Called on init and every REFRESH_INTERVAL_MS.

async function refreshData(bustCache) {
    const [relevant, signals, ledger, runs, meta, summary, pipelineReport, validation] = await Promise.all([
        loadJSON("data/relevant.json", bustCache),
        loadJSON("data/signals.json", bustCache),
        loadJSON("data/ledger.json", bustCache),
        loadJSON("data/runs.json", bustCache),
        loadJSON("data/meta.json", bustCache),
        loadJSON("data/summary.json", bustCache),
        loadJSON("data/pipeline_report.json", bustCache),
        loadJSON("data/statistical_validation.json", bustCache),
    ]);

    safeRender("header", () => renderHeaderStats(relevant, signals, ledger, meta, summary, pipelineReport));
    safeRender("relevant-markets", () => renderRelevantMarkets(relevant));
    safeRender("signal-feed", () => renderSignalFeed(signals));
    safeRender("signals-full", () => renderSignalsFull(signals));
    safeRender("ledger-summary", () => renderLedgerSummary(ledger));
    safeRender("ledger-full", () => renderLedgerFull(ledger));
    safeRender("runs-table", () => renderRunHistory(runs));
    safeRender("all-markets", () => renderAllMarkets(relevant));
    safeRender("operator-summary", () => renderOperatorSummary(summary));
    safeRender("evaluation-summary", () => renderEvaluationSummary(summary));
    safeRender("eval-alerts", () => renderAlerts(summary));
    safeRender("breakdown-subject", () => renderBreakdownSubject(summary));
    safeRender("breakdown-skip-reason", () => renderBreakdownSkipReason(summary));
    safeRender("breakdown-expiry", () => renderBreakdownExpiry(summary));
    safeRender("breakdown-trades-subject", () => renderBreakdownTradesSubject(summary));
    safeRender("breakdown-event", () => renderBreakdownEvent(summary));
    safeRender("breakdown-trades-event", () => renderBreakdownTradesEvent(summary));
    safeRender("breakdown-bracket-signals", () => renderBreakdownBracketSignals(summary));
    safeRender("breakdown-bracket-trades", () => renderBreakdownBracketTrades(summary));
    safeRender("position-assessment", () => renderPositionAssessment(summary));
    safeRender("strategy-b-progress", () => renderStrategyBProgress(summary));
    safeRender("pipeline-status", () => renderPipelineStatus(pipelineReport));
    safeRender("validation-summary", () => renderValidationSummary(validation));

    // Per-profile ledger comparison (re-render cleanly)
    const profileContainer = document.getElementById("tab-ledger");
    const oldComparison = profileContainer.querySelector(".panel:last-child");
    if (oldComparison && oldComparison.querySelector("h2") &&
        oldComparison.querySelector("h2").textContent.includes("Per-Profile")) {
        oldComparison.remove();
    }
    const profileLedgers = await loadPerProfileLedgers(meta, bustCache);
    if (profileLedgers.length > 1) {
        renderProfileComparison(profileLedgers, profileContainer);
    }

    updatePageRefreshIndicator();
}

// ---- STATISTICAL VALIDATION ----

function renderValidationSummary(valData) {
    const container = document.getElementById("validation-summary");
    if (!container) return;

    if (!valData || !valData.strategies) {
        container.innerHTML = '<div class="empty-state">No statistical validation data. Run: python scripts/run_statistical_validation.py</div>';
        return;
    }

    const strategies = valData.strategies;
    const labels = Object.keys(strategies).sort();

    let html = '';

    // Sample size warning
    if (valData.sample_size_note) {
        html += `<div class="alert alert-warning" style="margin-bottom:12px;padding:8px 12px;background:#2a2000;border:1px solid #665500;border-radius:4px;font-size:12px;color:#ccaa44;">${valData.sample_size_note}</div>`;
    }

    html += `<div style="font-size:12px;color:#888;margin-bottom:8px;">Source: ${valData.source || 'unknown'} · ${valData.total_real_trades || 0} trades · Bootstrap N=${(valData.bootstrap_simulations || 0).toLocaleString()} · MC paths=${(valData.monte_carlo_paths || 0).toLocaleString()}</div>`;

    // Summary table
    html += '<table class="data-table"><thead><tr>';
    html += '<th>Strategy</th><th>N</th><th>WR</th><th>95% CI</th><th>CI &gt; 50%?</th>';
    html += '<th>EV/trade</th><th>Sharpe</th><th>P(loss)</th><th>Worst Path</th><th>Verdict</th>';
    html += '</tr></thead><tbody>';

    for (const label of labels) {
        const s = strategies[label];
        const bs = s.bootstrap;
        const mc = s.monte_carlo;
        const exp = s.expectancy;

        const verdictClass = s.overall_label === 'potential_edge' ? 'positive'
            : s.overall_label === 'no_edge' ? 'negative' : 'neutral';
        const verdictDisplay = s.overall_label.replace(/_/g, ' ').toUpperCase();

        html += '<tr>';
        html += `<td style="font-family:monospace;font-size:11px">${label}</td>`;
        html += `<td>${s.n_trades}${s.sample_size_warning ? ' ⚠' : ''}</td>`;
        html += `<td>${(bs.observed_win_rate * 100).toFixed(0)}%</td>`;
        html += `<td>[${(bs.ci_95_low * 100).toFixed(0)}%, ${(bs.ci_95_high * 100).toFixed(0)}%]</td>`;
        html += `<td class="${bs['ci_excludes_0.5'] ? 'positive' : 'negative'}">${bs['ci_excludes_0.5'] ? 'YES' : 'NO'}</td>`;
        html += `<td class="${exp.ev_per_trade > 0 ? 'positive' : 'negative'}">$${exp.ev_per_trade.toFixed(2)}</td>`;
        html += `<td>${exp.sharpe_like.toFixed(2)}</td>`;
        html += `<td>${(mc.prob_of_loss * 100).toFixed(0)}%</td>`;
        html += `<td>$${mc.worst_path_pnl.toFixed(0)}</td>`;
        html += `<td class="${verdictClass}" style="font-weight:600">${verdictDisplay}</td>`;
        html += '</tr>';
    }

    html += '</tbody></table>';
    container.innerHTML = html;

    // Detailed cards per strategy
    const detailContainer = document.getElementById("validation-strategies");
    if (!detailContainer) return;

    let detailHtml = '';
    for (const label of labels) {
        const s = strategies[label];
        const bs = s.bootstrap;
        const mc = s.monte_carlo;
        const exp = s.expectancy;

        detailHtml += `<div class="panel" style="margin-top:12px;">`;
        detailHtml += `<div class="panel-header"><h2 style="font-size:14px;font-family:monospace">${label}</h2>`;
        detailHtml += `<span class="provenance-badge">${s.overall_label.replace(/_/g, ' ')}</span></div>`;

        detailHtml += '<div class="two-col" style="gap:12px">';

        // Bootstrap
        detailHtml += '<div style="padding:8px">';
        detailHtml += '<h3 style="font-size:12px;color:#888;margin-bottom:6px">Bootstrap Win Rate CI</h3>';
        detailHtml += `<div style="font-size:12px">Observed: <strong>${(bs.observed_win_rate * 100).toFixed(1)}%</strong></div>`;
        detailHtml += `<div style="font-size:12px">Mean: ${(bs.mean_win_rate * 100).toFixed(1)}%</div>`;
        detailHtml += `<div style="font-size:12px">95% CI: <strong>[${(bs.ci_95_low * 100).toFixed(1)}%, ${(bs.ci_95_high * 100).toFixed(1)}%]</strong></div>`;
        detailHtml += `<div style="font-size:12px">CI excludes 50%: <span class="${bs['ci_excludes_0.5'] ? 'positive' : 'negative'}">${bs['ci_excludes_0.5'] ? 'YES' : 'NO'}</span></div>`;
        detailHtml += '</div>';

        // Monte Carlo
        detailHtml += '<div style="padding:8px">';
        detailHtml += '<h3 style="font-size:12px;color:#888;margin-bottom:6px">Monte Carlo Paths</h3>';
        detailHtml += `<div style="font-size:12px">Median PnL: <strong>$${mc.median_final_pnl.toFixed(2)}</strong></div>`;
        detailHtml += `<div style="font-size:12px">5th-95th: [$${mc.pnl_5th_percentile.toFixed(0)}, $${mc.pnl_95th_percentile.toFixed(0)}]</div>`;
        detailHtml += `<div style="font-size:12px">P(loss): <strong>${(mc.prob_of_loss * 100).toFixed(1)}%</strong></div>`;
        detailHtml += `<div style="font-size:12px">Median max DD: $${mc.median_max_drawdown.toFixed(0)}</div>`;
        detailHtml += `<div style="font-size:12px">95th DD: $${mc.max_drawdown_95th.toFixed(0)}</div>`;
        detailHtml += '</div>';

        detailHtml += '</div>';

        // Expectancy row
        detailHtml += '<div style="padding:8px 8px 4px">';
        detailHtml += '<h3 style="font-size:12px;color:#888;margin-bottom:6px">Expectancy</h3>';
        detailHtml += `<div style="font-size:12px;display:flex;gap:24px;flex-wrap:wrap">`;
        detailHtml += `<span>EV/trade: <strong>$${exp.ev_per_trade.toFixed(2)}</strong></span>`;
        detailHtml += `<span>Std dev: $${exp.std_dev.toFixed(2)}</span>`;
        detailHtml += `<span>Sharpe: ${exp.sharpe_like.toFixed(3)}</span>`;
        detailHtml += `<span>Avg win: $${exp.avg_win_size.toFixed(2)}</span>`;
        detailHtml += `<span>Avg loss: $${exp.avg_loss_size.toFixed(2)}</span>`;
        detailHtml += `<span>W/L ratio: ${exp.win_loss_ratio === Infinity ? '∞' : exp.win_loss_ratio.toFixed(2)}</span>`;
        detailHtml += '</div></div>';

        detailHtml += '</div>';
    }
    detailContainer.innerHTML = detailHtml;
}

// ---- MAIN ----

async function init() {
    initTabs();

    // First load — no cache bust needed (fresh page load)
    await refreshData(false);

    // Auto-refresh every 60s with cache busting
    setInterval(() => {
        refreshData(true).catch(err => {
            console.error("Auto-refresh failed:", err);
        });
    }, REFRESH_INTERVAL_MS);
}

init().catch(err => {
    console.error("Dashboard init failed:", err);
    const bar = document.getElementById("data-status-bar");
    if (bar) {
        bar.textContent = "JS error: " + String(err);
        bar.className = "data-status data-status-error";
    }
    document.querySelectorAll(".empty-state").forEach(el => {
        if (el.textContent === "Loading...") {
            el.textContent = "Failed to render \u2014 check console. Error: " + String(err);
        }
    });
});
