-- ============================================================
-- ClevrGold Database Schema for Neon PostgreSQL
-- Run this in Neon SQL Editor to create all tables & views
-- ============================================================

-- Accounts table
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

-- Real-time snapshots (one row per account, upserted)
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

-- Trade history
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

-- Balance history for charts
CREATE TABLE IF NOT EXISTS balance_history (
    id SERIAL PRIMARY KEY,
    account_number BIGINT REFERENCES accounts(account_number),
    balance DECIMAL(12,2),
    equity DECIMAL(12,2),
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bh_account_time
    ON balance_history(account_number, recorded_at);

-- Daily summary
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

-- Open positions (live tracking, full-replace each sync)
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

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    account_number BIGINT REFERENCES accounts(account_number),
    type VARCHAR(20) NOT NULL,
    message TEXT,
    severity VARCHAR(10) DEFAULT 'info',
    created_at TIMESTAMP DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Portfolio overview (all accounts combined)
CREATE OR REPLACE VIEW v_portfolio AS
SELECT
    COUNT(*) AS total_accounts,
    SUM(s.balance) AS total_balance,
    SUM(s.equity) AS total_equity,
    SUM(s.floating_pnl) AS total_floating,
    SUM(s.daily_pnl) AS total_daily_pnl,
    SUM(s.weekly_pnl) AS total_weekly_pnl,
    SUM(s.open_orders) AS total_open_orders,
    SUM(s.aw_orders) AS total_aw_orders,
    SUM(a.initial_deposit) AS total_deposit,
    CASE WHEN SUM(a.initial_deposit) > 0
         THEN ROUND(((SUM(s.balance) - SUM(a.initial_deposit)) / SUM(a.initial_deposit) * 100)::numeric, 2)
         ELSE 0
    END AS total_roi_pct
FROM snapshots s
JOIN accounts a ON a.account_number = s.account_number
WHERE a.is_active = TRUE;

-- Account detail view
CREATE OR REPLACE VIEW v_account_detail AS
SELECT
    a.account_number,
    a.name,
    a.server,
    a.initial_deposit,
    s.balance,
    s.equity,
    s.floating_pnl,
    s.margin,
    s.free_margin,
    s.margin_level,
    s.daily_pnl,
    s.weekly_pnl,
    s.open_orders,
    s.aw_orders,
    s.mode,
    s.tp_today,
    s.spread,
    s.updated_at,
    CASE WHEN a.initial_deposit > 0
         THEN ROUND(((s.balance - a.initial_deposit) / a.initial_deposit * 100)::numeric, 2)
         ELSE 0
    END AS roi_pct,
    s.balance - a.initial_deposit AS total_profit,
    CASE WHEN s.updated_at < NOW() - INTERVAL '5 minutes'
         THEN 'offline'
         ELSE 'online'
    END AS status
FROM accounts a
LEFT JOIN snapshots s ON s.account_number = a.account_number
WHERE a.is_active = TRUE;

-- Daily portfolio summary
CREATE OR REPLACE VIEW v_daily_portfolio AS
SELECT
    ds.date,
    SUM(ds.balance_end) AS total_balance,
    SUM(ds.pnl) AS total_pnl,
    SUM(ds.tp_count) AS total_tp,
    SUM(ds.aw_count) AS total_aw
FROM daily_summary ds
GROUP BY ds.date
ORDER BY ds.date DESC;

-- Recent trades view
CREATE OR REPLACE VIEW v_recent_trades AS
SELECT
    t.ticket,
    a.name AS account_name,
    t.account_number,
    t.type,
    t.lots,
    t.open_price,
    t.close_price,
    t.profit,
    t.swap,
    t.commission,
    t.profit + t.swap + t.commission AS net_profit,
    t.open_time,
    t.close_time,
    t.magic_number,
    t.comment
FROM trades t
JOIN accounts a ON a.account_number = t.account_number
ORDER BY t.close_time DESC;

-- Unread alerts
CREATE OR REPLACE VIEW v_unread_alerts AS
SELECT
    al.id,
    a.name AS account_name,
    al.account_number,
    al.type,
    al.message,
    al.severity,
    al.created_at
FROM alerts al
JOIN accounts a ON a.account_number = al.account_number
WHERE al.is_read = FALSE
ORDER BY al.created_at DESC;
