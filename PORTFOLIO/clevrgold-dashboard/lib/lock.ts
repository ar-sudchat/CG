// Account Lock — manual + auto (AW pair)

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
}

const UNLOCKED: LockStatus = { is_locked: false, lock_reason: null, lock_reasons: [], locked_by: null };

/**
 * Compute lock status for a single account.
 *
 * manual_lock = true  → LOCKED (manual)
 * manual_lock = false → UNLOCKED (explicit override — user dismissed auto-lock)
 * manual_lock = null  → auto rules:
 *   - Partner has AW orders AND this account has 0 open orders → LOCKED
 *   - Otherwise → UNLOCKED
 */
export function computeLockStatus(
  account: AccountForLock,
  allAccounts: AccountForLock[]
): LockStatus {
  // Explicit manual lock
  if (account.manual_lock === true) {
    return { is_locked: true, lock_reason: 'Manual lock', lock_reasons: ['Manual lock'], locked_by: null };
  }

  // Explicit override (user dismissed auto-lock)
  if (account.manual_lock === false) {
    return UNLOCKED;
  }

  // Auto rules (manual_lock = null)
  if (!account.pair_group) return UNLOCKED;

  const partners = allAccounts.filter(
    (a) => a.pair_group === account.pair_group && a.account_number !== account.account_number
  );

  if (partners.length === 0) return UNLOCKED;

  const reasons: string[] = [];
  let lockedBy: number | null = null;

  for (const p of partners) {
    // Auto-lock: partner has AW AND this account has no open orders
    if (p.aw_orders > 0 && account.open_orders === 0) {
      reasons.push(`คู่ #${p.account_number} ติด AW (${p.aw_orders} orders)`);
      lockedBy = p.account_number;
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
 * These should be reset to null so future AW triggers auto-lock again.
 */
export function findStaleOverrides(
  accounts: AccountForLock[]
): number[] {
  return accounts
    .filter((acc) => {
      if (acc.manual_lock !== false) return false;
      // Check if any partner has AW (auto-lock condition)
      if (!acc.pair_group) return true; // no pair → stale
      const partners = accounts.filter(
        (a) => a.pair_group === acc.pair_group && a.account_number !== acc.account_number
      );
      const hasAwPartner = partners.some((p) => p.aw_orders > 0);
      // Stale if no AW partner or account already has orders
      return !hasAwPartner || acc.open_orders > 0;
    })
    .map((a) => a.account_number);
}
