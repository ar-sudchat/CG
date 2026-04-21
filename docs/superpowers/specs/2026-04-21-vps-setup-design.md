# VPS Setup: All-in-One Trading + Demo Server

**Date:** 2026-04-21
**Status:** Phase 1 in progress
**Owner:** artit

---

## 1. Purpose

Set up a newly-rented Windows VPS as a multi-purpose server for:
1. **MT4 + EA trading** for XAUUSD (24/7)
2. **AI demo apps** hosted on-demand for customer testing
3. **(Rejected for hosting)** ClevrGold database — migrate to Supabase instead

---

## 2. VPS Specifications

| Item | Value |
|---|---|
| Provider | (Thai hosting) |
| OS | Windows Server 2016 |
| CPU | 4 vCPU cores |
| RAM | 6 GB |
| Storage | 100 GB SSD NVMe |
| Public IP | `119.59.117.12` |
| Data transfer | Unlimited |
| Control Panel | None |
| Backup service | None (manual setup required) |
| Default user | `administrator` |

---

## 3. Architecture Decision

### Chosen: **Path A — Supabase for database, VPS for trading + demos**

**Why Path A over Path B (host DB on VPS):**

1. **Latency** — ClevrGold dashboard runs on Vercel (US region by default). DB on Supabase US-east keeps query latency < 10ms. DB on Thai VPS would add ~200ms per query across the Pacific.
2. **Resource isolation** — MT4 crashes/memory-leaks are common. Hosting prod DB on the same VM risks data loss if MT4 brings the system down.
3. **Managed services** — Supabase provides daily auto-backups, SSL, connection pooling free. VPS would require manual setup of all of these.
4. **Already planned** — Supabase migration plan exists and is ready to execute (see [project_supabase_migration.md](../../../.claude/projects/-Users-artit-All-Code-CG/memory/project_supabase_migration.md)).

### Resource budget (estimated steady-state RAM)

| Component | RAM |
|---|---|
| Windows Server 2016 idle | 1.5 GB |
| MT4 + 1-2 EAs | 500 MB |
| AI demos (off unless demoing) | ~0 GB |
| Free for on-demand demo | ~4 GB |
| **Total** | 6 GB ✓ |

---

## 4. Phase Plan

### Phase 1: VPS Hardening (security baseline)

| Step | Action | Status |
|---|---|---|
| 1.1 | Change `administrator` password to strong 16+ char passphrase | ⏳ in progress |
| 1.2 | Note Mac's public IP (dynamic — not used for whitelist) | skipped (dynamic IP) |
| 1.3 | Configure Account Lockout Policy: 5 failed attempts → 30 min lock | ⏳ pending |
| 1.4 | Run all Windows Updates, reboot | ⏳ pending |
| 1.5 | Install Chrome, Git, Notepad++ (utilities for later phases) | ⏳ pending |

**Exit criteria:** admin password changed, lockout policy active, OS patched, base tooling installed.

### Phase 2: MT4 + EA Deployment (highest business priority)

| Step | Action |
|---|---|
| 2.1 | Download MT4 installer from **HFM (HF Markets)** official site |
| 2.2 | Install MT4, log in to live/demo account |
| 2.3 | Copy EA files (.ex4/.mq4) into MT4 `Experts` folder |
| 2.4 | Attach EA to XAUUSD chart, enable AutoTrading |
| 2.5 | Verify trades execute correctly |
| 2.6 | Configure Task Scheduler: auto-start MT4 on Windows boot |
| 2.7 | Configure auto-reconnect (via EA heartbeat or 3rd-party MT4 watchdog) |
| 2.8 | Test: reboot VPS, confirm MT4 + EA resume trading automatically |

**Exit criteria:** MT4 runs 24/7, survives reboots, EA executes trades on XAUUSD.

### Phase 3: ClevrGold → Supabase Migration

Execute the existing migration plan stored in memory. Summary:

| Step | Action |
|---|---|
| 3.1 | Wait for Neon compute reset (1st of month) |
| 3.2 | `pg_dump` from Neon → `clevrgold_backup.sql` (already exists in `PORTFOLIO/`) |
| 3.3 | `psql` import backup into Supabase |
| 3.4 | Change `lib/db.ts` from `@neondatabase/serverless` → `postgres` (postgres.js) |
| 3.5 | `npm install postgres && npm uninstall @neondatabase/serverless` |
| 3.6 | Update `DATABASE_URL` in `.env.local` and Vercel env vars |
| 3.7 | Deploy, smoke-test dashboard |

**Important:** do NOT use `PORTFOLIO/EATrade/clevrgold_schema.sql` — it's incomplete. Use `pg_dump` output instead (captures full schema including `users`, `user_accounts`, and extra columns).

**Exit criteria:** ClevrGold dashboard reads/writes from Supabase in production. Neon DB can be retained as cold backup for ~30 days, then removed.

### Phase 4: AI Demo Infrastructure (on-demand)

Since demos are opened rarely (only when showing customers), keep this lightweight:

| Step | Action |
|---|---|
| 4.1 | Install runtimes: **Node.js LTS**, **Python 3.12** |
| 4.2 | Install Git (done in Phase 1) |
| 4.3 | Clone each demo repo into `C:\Demos\<app-name>` |
| 4.4 | Create `start-<app>.bat` and `stop-<app>.bat` scripts per demo for fast toggle |
| 4.5 | Share demo URL as `http://119.59.117.12:PORT` during sessions |
| 4.6 | (Optional later) If customer-facing URLs need prettier endpoints: set up domain + reverse proxy (IIS or Caddy) + Let's Encrypt SSL |

**Exit criteria:** each demo can be started/stopped with a single command; accessible via IP:PORT during demo sessions.

---

## 5. Security Considerations

**Accepted risks (pragmatic trade-offs for a solo operator):**

- **RDP on default port 3389** — mitigated by strong password + account lockout. Not changing port to avoid complexity. If brute-force attempts spike, consider moving to non-standard port.
- **No IP whitelist** — home internet is dynamic IP. Account lockout is the substitute defense.
- **`administrator` account name retained** — bots target this name, but password + lockout blocks them. Renaming to custom name is a future hardening option if needed.
- **Windows Server 2016 EOL 2027-01-12** — have ~9 months of security patches remaining. Plan to upgrade to 2019/2022 before EOL or migrate MT4 workload to a fresh VPS.

**Non-negotiable:**

- Never disable Windows Defender / Firewall
- Never reuse administrator password from other services
- Never expose PostgreSQL (port 5432) on this VPS to the internet (N/A — DB stays on Supabase)
- Never store production secrets in plain text on VPS — use environment variables scoped per demo app

---

## 6. Backup Strategy

| Component | Backup |
|---|---|
| ClevrGold DB | Supabase daily auto-backup (free tier) |
| MT4 settings + EA files | Manual export weekly to Google Drive — `.set` files + `templates/` folder |
| AI demo code | Already on GitHub (source of truth) |
| VPS snapshot | Not provided by hosting plan — consider asking provider about paid snapshot option once production workloads are on it |

---

## 7. Open Questions / Deferred Decisions

- **Domain for AI demos** — do customers need to see `demo.<company>.com` instead of raw IP:PORT? Decide when first customer demo is scheduled.
- **Monitoring** — currently none. If MT4 uptime becomes critical, add a simple uptime check (UptimeRobot ping to a small health endpoint).
- **VPS snapshot backup** — ask hosting provider if snapshot is available as add-on service before Phase 2 completion.

---

## 8. Current Progress (as of 2026-04-21)

- ✅ RDP access confirmed
- ✅ Architecture decision: Path A (Supabase)
- ✅ Broker confirmed: HFM
- ⏳ Phase 1 Step 1.1: Change admin password (in progress)
- ⏳ Phase 1 Step 1.3: Account lockout policy (pending user action)
- ⏳ Phase 1 Step 1.4: Windows Update (pending user action)

**Next session:** resume at Phase 1.3 / 1.4. User will report completion of password change + lockout + updates, then proceed to Phase 1.5 (install utilities) and Phase 2 (MT4).
