// Account Lock — computed from pair_group + snapshot data

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
  manual_lock?: boolean;
}

/**
 * Compute lock status for a single account based on its paired account's state.
 * LOCKED when paired account has: aw_orders > 0 OR (open_orders > 0 AND floating_pnl < 0)
 */
export function computeLockStatus(
  account: AccountForLock,
  allAccounts: AccountForLock[]
): LockStatus {
  const unlocked: LockStatus = {
    is_locked: false,
    lock_reason: null,
    lock_reasons: [],
    locked_by: null,
  };

  // Manual lock — highest priority
  if (account.manual_lock) {
    return {
      is_locked: true,
      lock_reason: 'Manual lock',
      lock_reasons: ['Manual lock'],
      locked_by: null,
    };
  }

  if (!account.pair_group) return unlocked;

  const partners = allAccounts.filter(
    (a) => a.pair_group === account.pair_group && a.account_number !== account.account_number
  );

  if (partners.length === 0) return unlocked;

  const reasons: string[] = [];
  let lockedBy: number | null = null;

  for (const p of partners) {
    if (p.aw_orders > 0) {
      reasons.push(`#${p.account_number} AW Recovery (${p.aw_orders} orders)`);
      lockedBy = p.account_number;
    }
    if (p.open_orders > 0 && p.floating_pnl < 0) {
      reasons.push(`#${p.account_number} floating ${p.floating_pnl.toFixed(2)}$ (${p.open_orders} orders)`);
      if (!lockedBy) lockedBy = p.account_number;
    }
  }

  if (reasons.length === 0) return unlocked;

  return {
    is_locked: true,
    lock_reason: reasons[0],
    lock_reasons: reasons,
    locked_by: lockedBy,
  };
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
