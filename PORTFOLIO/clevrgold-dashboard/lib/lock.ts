// Account Lock — manual + auto (AW pair + combined PnL)

export interface LockStatus {
  is_locked: boolean;
  lock_reason: string | null;
  lock_reasons: string[];
  locked_by: number | null;
}

export interface AccountForLock {
  account_number: number;
  pair_group: string;
  aw_orders: number;
  open_orders: number;
  floating_pnl: number;
  manual_lock?: boolean | null;
  auto_lock_enabled?: boolean;
  auto_lock_threshold?: number;
}

const UNLOCKED: LockStatus = { is_locked: false, lock_reason: null, lock_reasons: [], locked_by: null };
const DEFAULT_THRESHOLD = 3.0;

/**
 * Compute lock status for a single account.
 *
 * Priority (high → low):
 * 1. manual_lock = true   → LOCKED (manual override)
 * 2. manual_lock = false  → UNLOCKED (manual override)
 * 3. auto_lock disabled   → UNLOCKED
 * 4. Pair has AW orders   → LOCK BOTH accounts
 * 5. Combined float < -$X → LOCK BOTH accounts
 * 6. Otherwise            → UNLOCKED
 */
export function computeLockStatus(
  account: AccountForLock,
  allAccounts: AccountForLock[]
): LockStatus {
  // 1. Manual lock override
  if (account.manual_lock === true) {
    return { is_locked: true, lock_reason: 'Manual lock', lock_reasons: ['Manual lock'], locked_by: null };
  }

  // 2. Manual unlock override
  if (account.manual_lock === false) {
    return UNLOCKED;
  }

  // 3. Auto-lock disabled for this pair
  const autoEnabled = account.auto_lock_enabled !== false; // default true
  if (!autoEnabled) return UNLOCKED;

  // No pair group → no auto rules
  if (!account.pair_group) return UNLOCKED;

  const partners = allAccounts.filter(
    (a) => a.pair_group === account.pair_group && a.account_number !== account.account_number
  );
  if (partners.length === 0) return UNLOCKED;

  const reasons: string[] = [];
  let lockedBy: number | null = null;
  const threshold = account.auto_lock_threshold ?? DEFAULT_THRESHOLD;

  // 4. AW Recovery — lock BOTH accounts in pair (not just the partner)
  if (account.aw_orders > 0) {
    reasons.push(`บัญชีนี้ติด AW (${account.aw_orders} orders)`);
  }
  for (const p of partners) {
    if (p.aw_orders > 0) {
      reasons.push(`คู่ #${p.account_number} ติด AW (${p.aw_orders} orders)`);
      lockedBy = p.account_number;
    }
  }

  // 5. Combined floating PnL check
  if (reasons.length === 0 && threshold > 0) {
    const pairAccounts = [account, ...partners];
    const combinedFloat = pairAccounts.reduce((sum, a) => sum + a.floating_pnl, 0);
    if (combinedFloat < -threshold) {
      reasons.push(`Combined float ${combinedFloat.toFixed(2)} < -$${threshold}`);
    }
  }

  if (reasons.length === 0) return UNLOCKED;

  return { is_locked: true, lock_reason: reasons[0], lock_reasons: reasons, locked_by: lockedBy };
}

/** Compute lock status for ALL accounts at once. */
export function computeAllLockStatuses(
  accounts: AccountForLock[]
): Map<number, LockStatus> {
  const result = new Map<number, LockStatus>();
  for (const acc of accounts) {
    result.set(acc.account_number, computeLockStatus(acc, accounts));
  }
  return result;
}

/**
 * Find accounts with stale override (manual_lock = false)
 * that no longer have auto-lock conditions.
 * These should be reset to null so future triggers auto-lock again.
 */
export function findStaleOverrides(
  accounts: AccountForLock[]
): number[] {
  return accounts
    .filter((acc) => {
      if (acc.manual_lock !== false) return false;
      if (!acc.pair_group) return true;
      const partners = accounts.filter(
        (a) => a.pair_group === acc.pair_group && a.account_number !== acc.account_number
      );
      // Check if any auto-lock condition is active
      const hasAw = acc.aw_orders > 0 || partners.some((p) => p.aw_orders > 0);
      if (hasAw) return false; // AW still active, override not stale
      const threshold = acc.auto_lock_threshold ?? DEFAULT_THRESHOLD;
      const pairAccounts = [acc, ...partners];
      const combinedFloat = pairAccounts.reduce((sum, a) => sum + a.floating_pnl, 0);
      if (combinedFloat < -threshold) return false; // PnL still bad, override not stale
      return true; // No conditions active → stale
    })
    .map((a) => a.account_number);
}
