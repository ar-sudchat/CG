"""
ClevrGold DB Sync v2.0 - Reads CSV from MT4 folders → Neon PostgreSQL
Run on the same PC as MT4. Keeps running in background.
Supports multiple MT4 terminals (C:\\MT4ACC1, C:\\MT4ACC2, ...)

v2.0: Persistent connection, batch inserts, reduced logging
"""

import os
import glob
import time
import csv
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("Please install: pip install psycopg2-binary")
    exit(1)

# ============================================================
# CONFIGURATION
# ============================================================

NEON_URL = "postgresql://neondb_owner:npg_PIfHpr1K2vMT@ep-fragrant-art-aibzvw2m-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

MT4_FOLDER_PATTERNS = [
    r"C:\MT4ACC*\MQL4\Files",
    r"C:\MT4ACC*\Common\Files",
    r"C:\Users\*\AppData\Roaming\MetaQuotes\Terminal\Common\Files",
]

# Sync intervals (seconds)
SNAPSHOT_INTERVAL = 10
HISTORY_INTERVAL = 15
BALANCE_INTERVAL = 300
DAILY_SUMMARY_HOUR = 23
STALE_MINUTES = 5

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger("ClevrGold")

# ============================================================
# CACHED MT4 FOLDERS (scan once, not every cycle)
# ============================================================

_mt4_folders = None

def get_mt4_folders():
    """Find MT4 folders (cached after first scan)."""
    global _mt4_folders
    if _mt4_folders is None:
        _mt4_folders = []
        for pattern in MT4_FOLDER_PATTERNS:
            _mt4_folders.extend(glob.glob(pattern))
    return _mt4_folders

def find_csv_files(prefix):
    """Find CSV files matching prefix across cached MT4 folders."""
    files = []
    for folder in get_mt4_folders():
        files.extend(glob.glob(os.path.join(folder, f"{prefix}*.csv")))
    # Skip account 0 files (created when MT4 opens before login)
    files = [f for f in files if not f.endswith("_0.csv")]
    return files

# Track file modification times to skip unchanged files
_file_mtimes = {}

def file_changed(filepath):
    """Check if file has been modified since last read."""
    try:
        mtime = os.path.getmtime(filepath)
    except:
        return False
    last = _file_mtimes.get(filepath, 0)
    if mtime > last:
        _file_mtimes[filepath] = mtime
        return True
    return False

# ============================================================
# DATABASE - Persistent connection with keepalive
# ============================================================

_conn = None

def get_conn():
    """Get persistent database connection with TCP keepalive."""
    global _conn
    if _conn is not None:
        try:
            if _conn.closed:
                raise Exception("closed")
            return _conn
        except Exception:
            try:
                _conn.close()
            except Exception:
                pass
            _conn = None
            log.info("Reconnecting to database...")

    for attempt in range(3):
        try:
            _conn = psycopg2.connect(
                NEON_URL,
                connect_timeout=10,
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=3,
            )
            _conn.autocommit = False
            log.info("Database connected")
            return _conn
        except Exception as e:
            if attempt < 2:
                log.warning(f"DB connect attempt {attempt+1} failed: {e}")
                time.sleep(2 * (attempt + 1))
            else:
                raise


def init_db():
    """Create tables if not exist."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(open("clevrgold_schema.sql", "r").read() if os.path.exists("clevrgold_schema.sql") else """
        CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            account_number BIGINT UNIQUE NOT NULL,
            name VARCHAR(100),
            server VARCHAR(100),
            initial_deposit DECIMAL(12,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE,
            notes TEXT
        );
        CREATE TABLE IF NOT EXISTS snapshots (
            id SERIAL PRIMARY KEY,
            account_number BIGINT UNIQUE REFERENCES accounts(account_number),
            balance DECIMAL(12,2),
            equity DECIMAL(12,2),
            floating_pnl DECIMAL(10,2),
            margin DECIMAL(10,2),
            free_margin DECIMAL(12,2),
            margin_level DECIMAL(10,2),
            daily_pnl DECIMAL(10,2),
            weekly_pnl DECIMAL(10,2),
            open_orders INT DEFAULT 0,
            aw_orders INT DEFAULT 0,
            mode VARCHAR(10) DEFAULT 'OK',
            tp_today INT DEFAULT 0,
            spread INT DEFAULT 0,
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS trades (
            id SERIAL PRIMARY KEY,
            account_number BIGINT REFERENCES accounts(account_number),
            ticket BIGINT NOT NULL,
            type VARCHAR(10),
            lots DECIMAL(6,2),
            open_price DECIMAL(10,5),
            close_price DECIMAL(10,5),
            profit DECIMAL(10,2),
            swap DECIMAL(8,2) DEFAULT 0,
            commission DECIMAL(8,2) DEFAULT 0,
            open_time TIMESTAMP,
            close_time TIMESTAMP,
            magic_number INT,
            comment VARCHAR(200),
            UNIQUE(account_number, ticket)
        );
        CREATE TABLE IF NOT EXISTS balance_history (
            id SERIAL PRIMARY KEY,
            account_number BIGINT REFERENCES accounts(account_number),
            balance DECIMAL(12,2),
            equity DECIMAL(12,2),
            recorded_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_bh_account_time
            ON balance_history(account_number, recorded_at);
        CREATE TABLE IF NOT EXISTS daily_summary (
            id SERIAL PRIMARY KEY,
            account_number BIGINT REFERENCES accounts(account_number),
            date DATE NOT NULL,
            balance_start DECIMAL(12,2),
            balance_end DECIMAL(12,2),
            pnl DECIMAL(10,2),
            tp_count INT DEFAULT 0,
            aw_count INT DEFAULT 0,
            UNIQUE(account_number, date)
        );
        CREATE TABLE IF NOT EXISTS alerts (
            id SERIAL PRIMARY KEY,
            account_number BIGINT REFERENCES accounts(account_number),
            type VARCHAR(20) NOT NULL,
            message TEXT,
            severity VARCHAR(10) DEFAULT 'info',
            created_at TIMESTAMP DEFAULT NOW(),
            is_read BOOLEAN DEFAULT FALSE
        );
        CREATE TABLE IF NOT EXISTS open_positions (
            id SERIAL PRIMARY KEY,
            account_number BIGINT NOT NULL,
            ticket BIGINT NOT NULL UNIQUE,
            type VARCHAR(10),
            lots NUMERIC(10,2),
            symbol VARCHAR(20) DEFAULT 'XAUUSD',
            open_price NUMERIC(12,2),
            current_price NUMERIC(12,2) DEFAULT 0,
            sl NUMERIC(12,2) DEFAULT 0,
            tp NUMERIC(12,2) DEFAULT 0,
            commission NUMERIC(10,2) DEFAULT 0,
            swap NUMERIC(10,2) DEFAULT 0,
            profit NUMERIC(10,2) DEFAULT 0,
            open_time TIMESTAMP WITHOUT TIME ZONE,
            magic_number INT DEFAULT 0,
            comment VARCHAR(100),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        );
    """)
    conn.commit()
    cur.close()
    log.info("Database initialized")


# ============================================================
# CSV READERS
# ============================================================

def read_csv_line(filepath, delimiter='|'):
    """Read single-line CSV file, return list of values."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if '\x00' in content:
            log.warning(f"Null bytes in {os.path.basename(filepath)}, skipping")
            return None
        reader = csv.reader([content], delimiter=delimiter)
        for row in reader:
            if row:
                return [v.strip() for v in row]
    except Exception as e:
        log.error(f"Read error {filepath}: {e}")
    return None


def read_csv_all(filepath, delimiter='|'):
    """Read multi-line CSV file, return list of rows."""
    rows = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if '\x00' in content:
            log.warning(f"Null bytes in {os.path.basename(filepath)}, skipping")
            return rows
        reader = csv.reader(content.splitlines(), delimiter=delimiter)
        for row in reader:
            if row and len(row) > 1:
                rows.append([v.strip() for v in row])
    except Exception as e:
        log.error(f"Read error {filepath}: {e}")
    return rows


def file_age_seconds(filepath):
    """Get file age in seconds."""
    try:
        return time.time() - os.path.getmtime(filepath)
    except:
        return 99999


# ============================================================
# SYNC FUNCTIONS
# ============================================================

def sync_accounts():
    """Read collector_account_*.csv and upsert into accounts table."""
    files = find_csv_files("collector_account_")
    if not files:
        return

    conn = get_conn()
    cur = conn.cursor()
    dedup = {}

    for f in files:
        row = read_csv_line(f)
        if not row or len(row) < 5:
            continue
        acc = int(row[0])
        dedup[acc] = (
            acc,
            row[1],       # name
            row[2],       # server
            float(row[4]) if row[4] else 0,  # deposit
        )

    values = list(dedup.values())
    if values:
        execute_values(cur, """
            INSERT INTO accounts (account_number, name, server, initial_deposit)
            VALUES %s
            ON CONFLICT (account_number)
            DO UPDATE SET name = EXCLUDED.name,
                          server = EXCLUDED.server,
                          initial_deposit = CASE
                              WHEN accounts.initial_deposit = 0 THEN EXCLUDED.initial_deposit
                              ELSE accounts.initial_deposit
                          END
        """, values)

    conn.commit()
    cur.close()
    log.info(f"Synced {len(values)} account(s)")


# ============================================================
# AW EVENT TRACKING
# ============================================================
# Track previous aw_orders per account to detect transitions
_aw_prev = {}   # { account_number: aw_orders_count }
_aw_peak = {}   # { account_number: max_aw_orders during event }

def detect_aw_events(new_snapshots):
    """
    Detect AW trigger/end by comparing previous aw_orders with current.
    new_snapshots: dict { account_number: (acc, balance, equity, floating, margin,
                          free_margin, margin_level, daily_pnl, weekly_pnl,
                          open_orders, aw_orders, mode, tp_today, spread) }
    """
    global _aw_prev, _aw_peak

    conn = get_conn()
    cur = conn.cursor()

    # Batch: get direction for all accounts in 1 query
    dir_map = {}
    try:
        cur.execute("""
            SELECT account_number, type, COUNT(*) as cnt FROM open_positions
            GROUP BY account_number, type
        """)
        for r in cur.fetchall():
            acc_num, typ, cnt = r[0], r[1], r[2]
            if acc_num not in dir_map:
                dir_map[acc_num] = {'BUY': 0, 'SELL': 0}
            if typ in ('BUY', 'SELL'):
                dir_map[acc_num][typ] = cnt
    except:
        pass

    for acc, snap in new_snapshots.items():
        aw_now = snap[10]       # aw_orders
        aw_before = _aw_prev.get(acc, 0)
        floating = snap[3]      # floating_pnl
        price = 0               # we don't have price in snapshot, use 0

        # Determine trade direction from cached position data
        direction = None
        if acc in dir_map:
            buys = dir_map[acc].get('BUY', 0)
            sells = dir_map[acc].get('SELL', 0)
            if buys > sells:
                direction = 'BUY'
            elif sells > buys:
                direction = 'SELL'

        # AW TRIGGER: 0 → >0
        if aw_before == 0 and aw_now > 0:
            now = datetime.now(timezone.utc)
            open_orders = snap[9]  # open_orders (EA orders)
            cur.execute("""
                INSERT INTO aw_events
                    (account_number, round, triggered_at, trigger_pnl,
                     trigger_orders, trigger_direction, trigger_price,
                     day_of_week, hour_of_day)
                VALUES (%s, COALESCE((SELECT MAX(round) FROM aw_events WHERE account_number = %s), 0) + 1,
                        NOW(), %s, %s, %s, %s, %s, %s)
            """, (acc, acc, floating, open_orders, direction, price,
                  now.weekday(), now.hour))
            conn.commit()
            log.info(f"AW TRIGGER: acc={acc} aw_orders={aw_now} floating={floating}")
            _aw_peak[acc] = aw_now

        # AW ONGOING: track peak
        elif aw_now > 0:
            if aw_now > _aw_peak.get(acc, 0):
                _aw_peak[acc] = aw_now

        # AW END: >0 → 0
        elif aw_before > 0 and aw_now == 0:
            peak = _aw_peak.get(acc, aw_before)
            # Determine end reason
            end_reason = "AW_DONE"
            if floating >= 0:
                end_reason = "AW_TP"

            cur.execute("""
                UPDATE aw_events SET
                    ended_at = NOW(),
                    peak_dd = ABS(%s),
                    aw_orders_max = %s,
                    end_pnl = %s,
                    end_reason = %s,
                    duration_minutes = EXTRACT(EPOCH FROM (NOW() - triggered_at))::int / 60
                WHERE id = (
                    SELECT id FROM aw_events
                    WHERE account_number = %s AND ended_at IS NULL
                    ORDER BY triggered_at DESC LIMIT 1
                )
            """, (floating, peak, floating, end_reason, acc))
            conn.commit()
            log.info(f"AW END: acc={acc} reason={end_reason} pnl={floating} peak_aw={peak}")
            _aw_peak.pop(acc, None)

        _aw_prev[acc] = aw_now

    cur.close()


def sync_snapshots():
    """Read collector_snap_*.csv and batch upsert into snapshots table."""
    files = find_csv_files("collector_snap_")
    if not files:
        return

    conn = get_conn()
    cur = conn.cursor()
    stale_limit = STALE_MINUTES * 60
    dedup = {}

    for f in files:
        age = file_age_seconds(f)
        if age > stale_limit:
            continue

        row = read_csv_line(f)
        if not row or len(row) < 16:
            continue

        acc = int(row[0])
        dedup[acc] = (
            acc,
            float(row[1]),   # balance
            float(row[2]),   # equity
            float(row[3]),   # floating
            float(row[4]),   # margin
            float(row[5]),   # free_margin
            float(row[6]),   # margin_level
            float(row[7]),   # daily_pnl
            float(row[8]),   # weekly_pnl
            int(row[9]),     # open_orders
            int(row[10]),    # aw_orders
            row[11],         # mode
            int(row[12]),    # tp_today
            int(row[15]),    # spread
        )

    values = list(dedup.values())
    if values:
        execute_values(cur, """
            INSERT INTO snapshots
                (account_number, balance, equity, floating_pnl, margin,
                 free_margin, margin_level, daily_pnl, weekly_pnl,
                 open_orders, aw_orders, mode, tp_today, spread, updated_at)
            VALUES %s
            ON CONFLICT (account_number)
            DO UPDATE SET
                balance = EXCLUDED.balance,
                equity = EXCLUDED.equity,
                floating_pnl = EXCLUDED.floating_pnl,
                margin = EXCLUDED.margin,
                free_margin = EXCLUDED.free_margin,
                margin_level = EXCLUDED.margin_level,
                daily_pnl = EXCLUDED.daily_pnl,
                weekly_pnl = EXCLUDED.weekly_pnl,
                open_orders = EXCLUDED.open_orders,
                aw_orders = EXCLUDED.aw_orders,
                mode = EXCLUDED.mode,
                tp_today = EXCLUDED.tp_today,
                spread = EXCLUDED.spread,
                updated_at = NOW()
        """, values, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")

    conn.commit()
    cur.close()
    if values:
        log.info(f"Snapshots: {len(values)} updated")

    # Detect AW trigger/end events from snapshot changes
    if dedup:
        try:
            detect_aw_events(dedup)
        except Exception as e:
            log.warning(f"AW detect error: {e}")

    return dedup  # Return for reuse by sync_lock_status


def sync_trades():
    """Read collector_trades_*.csv and batch insert new trades.
    Uses ON CONFLICT DO NOTHING - no need to SELECT existing tickets."""
    files = find_csv_files("collector_trades_")
    if not files:
        return

    conn = get_conn()
    cur = conn.cursor()

    # Collect rows only from files that changed since last read
    all_rows = []
    for f in files:
        if not file_changed(f):
            continue
        rows = read_csv_all(f)
        if rows:
            all_rows.extend([r for r in rows if len(r) >= 12])

    if not all_rows:
        cur.close()
        return

    # Build values - just send everything, DB handles duplicates
    values = []
    for row in all_rows:
        try:
            values.append((
                int(row[0]),       # ticket
                int(row[1]),       # account_number
                row[2],            # type
                float(row[3]),     # lots
                float(row[4]),     # open_price
                float(row[5]),     # close_price
                float(row[6]),     # profit
                float(row[7]),     # swap
                float(row[8]),     # commission
                row[9],            # open_time
                row[10],           # close_time
                int(row[11]),      # magic
                row[12] if len(row) > 12 else ""
            ))
        except (ValueError, IndexError):
            continue

    if values:
        execute_values(cur, """
            INSERT INTO trades
                (ticket, account_number, type, lots, open_price, close_price,
                 profit, swap, commission, open_time, close_time, magic_number, comment)
            VALUES %s
            ON CONFLICT DO NOTHING
        """, values)
        # Check how many were actually inserted
        inserted = cur.rowcount
        if inserted > 0:
            log.info(f"New trades: {inserted}")

    conn.commit()
    cur.close()


def sync_balance_history():
    """Read collector_balance_*.csv and insert new records."""
    files = find_csv_files("collector_balance_")
    if not files:
        return

    conn = get_conn()
    cur = conn.cursor()

    # 1 query: get all accounts that already have recent records
    cur.execute("""
        SELECT DISTINCT account_number FROM balance_history
        WHERE recorded_at > NOW() - INTERVAL '4 minutes'
    """)
    recent = set(row[0] for row in cur.fetchall())

    # Collect values, skip accounts with recent records
    values = []
    for f in files:
        rows = read_csv_all(f)
        if not rows:
            continue
        row = rows[-1]
        if len(row) < 4:
            continue
        acc_num = int(row[0])
        if acc_num in recent:
            continue
        values.append((acc_num, float(row[1]), float(row[2]), row[3]))

    if values:
        execute_values(cur, """
            INSERT INTO balance_history (account_number, balance, equity, recorded_at)
            VALUES %s
        """, values)
        log.info(f"Balance history: {len(values)} records")

    conn.commit()
    cur.close()


def sync_positions():
    """Read collector_positions_*.csv and batch sync open positions."""
    files = find_csv_files("collector_positions_")
    if not files:
        return

    conn = get_conn()
    cur = conn.cursor()
    stale_limit = STALE_MINUTES * 60

    for f in files:
        if not file_changed(f):
            continue

        basename = os.path.basename(f)
        acc_str = basename.replace("collector_positions_", "").replace(".csv", "")
        try:
            acc_num = int(acc_str)
        except ValueError:
            continue

        if file_age_seconds(f) > stale_limit:
            continue

        rows = read_csv_all(f)

        # Delete old positions for this account
        cur.execute("DELETE FROM open_positions WHERE account_number = %s", (acc_num,))

        # Batch insert all positions
        pos_values = []
        for row in rows:
            if len(row) < 10:
                continue
            try:
                pos_values.append((
                    acc_num,
                    int(row[0]),       # ticket
                    row[1],            # type
                    float(row[2]),     # lots
                    row[3],            # symbol
                    float(row[4]),     # open_price
                    float(row[5]),     # current_price
                    float(row[6]),     # sl
                    float(row[7]),     # tp
                    float(row[8]),     # commission
                    float(row[9]),     # swap
                    float(row[10]) if len(row) > 10 else 0,
                    row[11] if len(row) > 11 else None,
                ))
            except (ValueError, IndexError) as e:
                log.error(f"Position parse error: {e}")

        if pos_values:
            execute_values(cur, """
                INSERT INTO open_positions
                    (account_number, ticket, type, lots, symbol, open_price, current_price,
                     sl, tp, commission, swap, profit, open_time, updated_at)
                VALUES %s
            """, pos_values, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")

    conn.commit()
    cur.close()


def sync_lock_status(snapshot_data=None):
    """Pull lock status from DB and write per-account lock files.
    File: clevredge_locked_[account_number].txt  (content "1" = locked, "0" = unlocked)

    Lock priority (high → low):
      1. manual_lock = TRUE   → LOCKED (manual override)
      2. manual_lock = FALSE  → UNLOCKED (manual override)
      3. auto_lock disabled   → UNLOCKED
      4. Pair has AW orders   → LOCK BOTH accounts
      5. Combined float < -$X → LOCK BOTH accounts
      6. Otherwise            → UNLOCKED

    snapshot_data: optional dict { acc_num: (acc, bal, eq, float, margin, free, ml, daily, weekly, open, aw, mode, tp, spread) }
    """
    conn = get_conn()
    cur = conn.cursor()

    if snapshot_data:
        cur.execute("""
            SELECT account_number, pair_group, manual_lock,
                   COALESCE(auto_lock_enabled, true),
                   COALESCE(auto_lock_threshold, 3.0)
            FROM accounts WHERE is_active = TRUE
        """)
        rows = cur.fetchall()
        cur.close()

        accounts = []
        for r in rows:
            acc_num = r[0]
            snap = snapshot_data.get(acc_num)
            accounts.append({
                'account_number': acc_num,
                'pair_group': r[1],
                'manual_lock': r[2],
                'auto_lock_enabled': r[3],
                'auto_lock_threshold': float(r[4]) if r[4] else 3.0,
                'aw_orders': snap[10] if snap else 0,
                'open_orders': snap[9] if snap else 0,
                'floating_pnl': snap[3] if snap else 0,
            })
    else:
        cur.execute("""
            SELECT a.account_number, a.pair_group, a.manual_lock,
                   COALESCE(a.auto_lock_enabled, true),
                   COALESCE(a.auto_lock_threshold, 3.0),
                   COALESCE(s.aw_orders, 0), COALESCE(s.open_orders, 0),
                   COALESCE(s.floating_pnl, 0)
            FROM accounts a
            LEFT JOIN snapshots s ON a.account_number = s.account_number
            WHERE a.is_active = TRUE
        """)
        rows = cur.fetchall()
        cur.close()

        accounts = []
        for r in rows:
            accounts.append({
                'account_number': r[0],
                'pair_group': r[1],
                'manual_lock': r[2],
                'auto_lock_enabled': r[3],
                'auto_lock_threshold': float(r[4]) if r[4] else 3.0,
                'aw_orders': r[5],
                'open_orders': r[6],
                'floating_pnl': float(r[7]),
            })

    # Build pair group lookup
    pair_groups = {}
    for acc in accounts:
        pg = acc['pair_group']
        if pg:
            if pg not in pair_groups:
                pair_groups[pg] = []
            pair_groups[pg].append(acc)

    # Compute lock per account
    lock_map = {}
    lock_reasons = {}
    for acc in accounts:
        acc_num = acc['account_number']

        # 1. Manual lock override
        if acc['manual_lock'] is True:
            lock_map[acc_num] = True
            lock_reasons[acc_num] = 'manual_lock'
            continue

        # 2. Manual unlock override
        if acc['manual_lock'] is False:
            lock_map[acc_num] = False
            lock_reasons[acc_num] = 'manual_unlock'
            continue

        # 3. Auto-lock disabled
        if not acc['auto_lock_enabled']:
            lock_map[acc_num] = False
            lock_reasons[acc_num] = 'auto_disabled'
            continue

        # No pair group → no auto rules
        pg = acc['pair_group']
        if not pg or pg not in pair_groups:
            lock_map[acc_num] = False
            lock_reasons[acc_num] = 'no_pair'
            continue

        pair = pair_groups[pg]
        locked = False
        reason = 'ok'

        # 4. AW Recovery — lock BOTH accounts in pair
        if acc['aw_orders'] > 0:
            locked = True
            reason = f'self_aw({acc["aw_orders"]})'
        else:
            for partner in pair:
                if partner['account_number'] != acc_num and partner['aw_orders'] > 0:
                    locked = True
                    reason = f'partner_aw({partner["account_number"]}:{partner["aw_orders"]})'
                    break

        # 5. Combined floating PnL < -threshold
        if not locked:
            threshold = acc['auto_lock_threshold']
            if threshold > 0:
                combined_float = sum(p['floating_pnl'] for p in pair)
                if combined_float < -threshold:
                    locked = True
                    reason = f'combined_pnl({combined_float:.2f}<-{threshold})'

        lock_map[acc_num] = locked
        lock_reasons[acc_num] = reason

    # Write per-account lock files
    lock_dir = os.path.join(os.environ.get('APPDATA', ''), 'MetaQuotes', 'Terminal', 'Common', 'Files')
    try:
        os.makedirs(lock_dir, exist_ok=True)
        locked_count = 0
        for acc_num, is_locked in lock_map.items():
            fname = os.path.join(lock_dir, f'clevredge_locked_{acc_num}.txt')
            with open(fname, 'w', encoding='utf-8') as f:
                f.write('1' if is_locked else '0')
            if is_locked:
                locked_count += 1
        if locked_count:
            reasons_str = ', '.join(f'{k}:{v}' for k, v in lock_reasons.items() if lock_map.get(k))
            log.info(f"Lock sync: {locked_count}/{len(lock_map)} locked [{reasons_str}]")
    except Exception as e:
        log.error(f"Lock file write error: {e}")


def check_alerts():
    """Check for alert conditions - single query, no per-account SELECTs."""
    conn = get_conn()
    cur = conn.cursor()

    # 1 query: find AW accounts that DON'T have a recent alert yet
    cur.execute("""
        SELECT s.account_number FROM snapshots s
        WHERE s.mode = 'AW'
          AND NOT EXISTS (
            SELECT 1 FROM alerts a
            WHERE a.account_number = s.account_number
              AND a.type = 'AW_TRIGGERED'
              AND a.created_at > NOW() - INTERVAL '1 hour'
          )
    """)
    new_alerts = [(row[0],) for row in cur.fetchall()]

    for (acc,) in new_alerts:
        cur.execute("""
            INSERT INTO alerts (account_number, type, message, severity)
            VALUES (%s, 'AW_TRIGGERED', %s, 'critical')
        """, (acc, f"Account {acc} entered AW Recovery mode"))
        log.warning(f"ALERT: Account {acc} in AW Recovery!")

    conn.commit()
    cur.close()


# ============================================================
# MAIN LOOP
# ============================================================

def main():
    print("=" * 50)
    print("  ClevrGold DB Sync v2.0")
    print("=" * 50)
    mt4_folders = get_mt4_folders()
    print(f"  MT4 Folders: {len(mt4_folders)} found")
    for f in mt4_folders:
        print(f"    - {f}")
    print(f"  Database:   Neon PostgreSQL")
    print(f"  Intervals:  Snap={SNAPSHOT_INTERVAL}s  History={HISTORY_INTERVAL}s")
    print("=" * 50)

    if not mt4_folders:
        log.error(f"No MT4 folders found matching: {MT4_FOLDER_PATTERNS}")
        return

    try:
        init_db()
    except Exception as e:
        log.error(f"Database connection failed: {e}")
        return

    try:
        sync_accounts()
    except Exception as e:
        log.warning(f"Initial sync_accounts failed: {e}")

    last_snapshot = 0
    last_history = 0
    last_balance = 0
    last_alerts = 0
    last_accounts = 0

    log.info("Sync loop started. Press Ctrl+C to stop.")

    while True:
        try:
            now = time.time()

            # Snapshots + Positions + Lock sync (frequent - every 10s)
            if now - last_snapshot >= SNAPSHOT_INTERVAL:
                t0 = time.time()
                snap_data = sync_snapshots()
                sync_positions()
                sync_lock_status(snap_data)
                elapsed = time.time() - t0
                if elapsed > 5:
                    log.warning(f"Snapshot cycle slow: {elapsed:.1f}s")
                last_snapshot = now

            # Trade history (every 15s)
            if now - last_history >= HISTORY_INTERVAL:
                sync_trades()
                last_history = now

            # Account metadata (every 5 min - rarely changes)
            if now - last_accounts >= BALANCE_INTERVAL:
                sync_accounts()
                last_accounts = now

            # Balance history (every 5 min)
            if now - last_balance >= BALANCE_INTERVAL:
                sync_balance_history()
                last_balance = now

            # Alerts (every 60s)
            if now - last_alerts >= 60:
                check_alerts()
                last_alerts = now

            time.sleep(2)

        except KeyboardInterrupt:
            log.info("Stopped by user")
            break
        except Exception as e:
            log.error(f"Sync error: {e}")
            # Reset connection on error
            global _conn
            try:
                _conn.close()
            except:
                pass
            _conn = None
            time.sleep(10)


if __name__ == "__main__":
    main()
