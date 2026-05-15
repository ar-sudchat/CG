import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// ICMarkets server timezone = GMT+2 (EET)
// PostgreSQL Etc zones have inverted signs: Etc/GMT-2 = UTC+2
export const MT4_TZ = 'Etc/GMT-2';

// Auto-migration: ensure insight column exists
let _migrated = false;
export async function ensureInsightColumn() {
  if (_migrated) return;
  _migrated = true;
  try {
    await sql`ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS insight JSONB`;
  } catch {
    // Column may already exist or table not ready — ignore
  }
}

export default sql;
