import { neon } from '@neondatabase/serverless';

// Disable Next.js fetch caching for all DB queries
// Next.js patches global fetch to cache by default — neon uses fetch internally
const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: { cache: 'no-store' },
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
