# Decision Memo: Pipeline Cadence — 5 Minutes vs 1 Minute

**Date:** 2026-03-18
**Status:** RECOMMENDATION ONLY — no implementation yet
**Context:** Current pipeline runs every 6 hours via GitHub Actions cron.

---

## Current State

- **Cadence:** Every 6 hours (4x/day)
- **Runtime:** GitHub Actions on `ubuntu-latest`
- **Pipeline:** fetch → signals × 3 profiles → papertrade × 3 → resolve → summary → export
- **Dashboard:** GitHub Pages, auto-deploys on push to main
- **Execution time:** ~30-60 seconds per run
- **Cost:** $0 (free tier for public repos)

## Why Consider Faster?

3-day expiry markets can move significantly in 6 hours. Bracket prices shift as the underlying count changes. A 6-hour gap means:
- Stale signals when markets move fast
- Missed entry points on brackets that become tradeable between runs
- Resolution detection delayed up to 6 hours
- No ability to react to price spikes or drops

---

## Option 1: GitHub Actions Every 5 Minutes

### How it works
Change cron from `0 */6 * * *` to `*/5 * * * *`. Same pipeline, same infrastructure.

### Cadence realism
GitHub Actions cron has **no guarantee of exact timing**. Documented behavior:
- Cron triggers can be delayed 5-15 minutes during high-load periods
- Minimum cron interval is 5 minutes, but actual execution may cluster or skip
- During heavy GitHub load, jobs can queue for 10+ minutes
- Public repos get 2,000 free minutes/month

### Cost
- Pipeline takes ~60 seconds per run
- 288 runs/day × 1 min = 288 min/day × 30 = **8,640 min/month**
- Free tier: 2,000 min/month → **would exceed free tier by 4x**
- GitHub Actions billing: $0.008/min → ~$53/month for overage
- Could reduce with shorter runs or conditional execution

### Complexity
- **Minimal** — change one line in `pipeline.yml`
- Risk: commit storm (288 commits/day to main). Noisy git history.
- Risk: GitHub rate limits on Actions API and git push
- Risk: race conditions if runs overlap (previous run still pushing when next starts)

### Reliability
- **Medium** — cron timing unreliable under load, but retries are automatic
- No persistent state between runs
- No monitoring beyond email on failure

### What changes in this repo
- `.github/workflows/pipeline.yml`: cron schedule
- Consider adding a lock file or commit-dedup logic to prevent overlap

### What stays the same
- All Python code, data format, dashboard
- GitHub Pages frontend

### GitHub Pages compatible?
**Yes** — pushes to main still trigger Pages rebuild. But 288 deploys/day may be slow.

---

## Option 2: Small VPS Running Every 1 Minute

### How it works
A small Linux VPS runs a cron job or systemd timer that executes the pipeline every 60 seconds. Data is pushed to the repo (or served directly).

### Cadence realism
- **Highly reliable** — systemd timers or cron on a dedicated machine fire on time
- True 1-minute cadence achievable
- Can skip runs if previous is still executing (simple lock file)

### Cost
- **Hetzner CX22**: €4.51/month (~$5), 2 vCPU, 4GB RAM, 40GB SSD — more than enough
- **DigitalOcean basic**: $6/month, 1 vCPU, 1GB RAM — sufficient
- **Oracle Cloud free tier**: free forever, 1 vCPU ARM, 6GB RAM — works but less reliable support
- **AWS Lightsail**: $5/month, 1 vCPU, 1GB RAM
- Best value: **Hetzner CX22 at ~$5/month**

### Complexity
- **Medium** — need to provision a server, install Python, clone repo, set up cron/timer
- Need SSH key or deploy key for git push (if pushing data to GitHub)
- Need to handle: log rotation, monitoring, updates, OS patches
- Initial setup: ~30 minutes if you know what you're doing

### Reliability
- **High** — dedicated machine, no queueing, no shared resource contention
- Downside: single point of failure (VPS goes down = pipeline stops)
- Can add health check (simple HTTP ping or cron monitor like healthchecks.io free tier)

### What runs on the VPS
1. `scripts/run_pipeline.sh` on cron/timer (every 60s)
2. Python 3.12 + requirements.txt
3. Git for pushing data to repo

### How dashboard data gets updated
Two options:

**Option A: Push to GitHub → Pages serves it** (simpler)
- VPS runs pipeline, commits data, pushes to main
- GitHub Pages redeploys on push
- Latency: ~30-90 seconds from push to Pages update
- Pro: dashboard stays on free GitHub Pages
- Con: 1440 commits/day, 1440 Pages deploys/day

**Option B: VPS serves dashboard directly** (cleaner)
- VPS writes data to a local directory
- Nginx or Caddy serves the static dashboard + data
- Pro: instant updates, no commit noise, no git history bloat
- Con: need a domain or use VPS IP, need HTTPS (Caddy does this automatically)
- Pro: can later add websocket for real-time push to dashboard

### GitHub Pages compatible?
**Option A: Yes** — but noisy.
**Option B: No** — dashboard moves to VPS. Can keep Pages as a "last known state" fallback.

---

## Option 3: Long-Running Daemon/Service

### How it works
A persistent Python process on a VPS (or container) that runs continuously, sleeping between cycles. Uses `asyncio` or a simple `while True: run(); sleep(60)` loop.

### Cadence realism
- **True 1-minute cadence** with precise control
- Can dynamically adjust: run more frequently near market expiry, less at night
- Can implement "run immediately on market close detection" via websocket

### Cost
Same as Option 2 — needs a VPS ($5-6/month).

### Complexity
- **Higher** — need process management (systemd service), crash recovery, health monitoring
- Need to handle: memory leaks over time, graceful shutdown, log rotation
- Daemon code is more complex than a cron script
- Adds ~100-200 lines of orchestration code

### Reliability
- **Medium-High** — systemd can auto-restart on crash
- But: long-running processes accumulate state and can drift
- More failure modes than a fresh cron invocation each time

### What changes in this repo
- New `scripts/daemon.py` or similar
- systemd unit file
- Health check endpoint

### What stays the same
- All Python pipeline code, data format
- Dashboard can stay on GitHub Pages or move to VPS

### GitHub Pages compatible?
Same as Option 2 — depends on push vs serve locally.

---

## Comparison Matrix

| Factor | GH Actions 5min | VPS 1min (cron) | VPS daemon |
|--------|-----------------|-----------------|------------|
| **Cadence** | ~5-15 min actual | True 1 min | True 1 min, adaptive |
| **Monthly cost** | ~$53 (over free tier) | ~$5 (Hetzner) | ~$5 (Hetzner) |
| **Setup complexity** | 1 line change | 30 min setup | 1-2 hours setup |
| **Ongoing maintenance** | None | Low (OS updates) | Medium (process health) |
| **Reliability** | Medium (cron drift) | High | Medium-High |
| **Git noise** | 288 commits/day | 1440 or 0 | 1440 or 0 |
| **Upgrade path** | Dead end at ~5 min | Can add daemon later | Already there |
| **Pages compatible** | Yes | Yes (noisy) or No | Yes (noisy) or No |

---

## Recommendations

### Best option right now
**Option 2: VPS with cron, every 1 minute, serving dashboard directly.**

Why:
- Cheapest at $5/month vs $53/month for Actions
- Most reliable 1-minute cadence
- Eliminates git commit noise entirely if serving dashboard locally
- Clean upgrade path to daemon later if needed
- Hetzner CX22 is the best value ($5, 2 vCPU, 4GB RAM)

### Cheapest acceptable setup
**Option 2 with GitHub Pages kept as frontend (push to repo).**

- VPS: Hetzner CX22 at $5/month
- Runs pipeline every 1 min, pushes data to repo
- GitHub Pages serves the dashboard (free)
- Accept the 1440 commits/day noise (can squash weekly)
- Total: **$5/month**

This is half the cost of the GitHub Actions approach and gives true 1-minute cadence.

### Cleanest upgrade path
1. **Now:** Stay on GitHub Actions at 6 hours. Free. No infrastructure.
2. **When faster cadence is needed:** Provision Hetzner CX22. Run cron every 1 min. Push data to repo. Keep Pages.
3. **When commit noise is unacceptable:** Move dashboard to VPS (Caddy + static files). Stop pushing to repo. GitHub becomes code-only.
4. **When adaptive cadence is needed:** Replace cron with a simple daemon. Run more frequently near expiry windows.

Each step is additive. Nothing gets thrown away.

---

## What Should Wait

- **Do not build the daemon now.** Cron is simpler and sufficient for 1-minute cadence.
- **Do not move the dashboard off GitHub Pages now.** Accept the commit noise initially.
- **Do not build dynamic cadence adjustment now.** Fixed 1-minute is fine for 3-day markets.
- **Do not provision a VPS until the 6-hour cadence is proven insufficient.** Right now we have 0 resolved trades — faster cadence doesn't help until the system is validated.

---

## Immediate Safe Improvement

One small change is safe to do now without any infrastructure: **reduce GitHub Actions from 6 hours to 1 hour**.

- Change cron to `0 * * * *` (every hour)
- Stays within free tier: 24 runs/day × 1 min = 720 min/month (under 2,000 limit)
- 24 commits/day is acceptable noise
- 4x faster resolution detection
- Zero cost, zero infrastructure, 1-line change

This buys time while the system accumulates resolution data. If 1-hour proves insufficient, then provision the VPS.
