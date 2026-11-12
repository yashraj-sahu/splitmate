import { Expense, Settlement, SimplifiedDebt, MemberBalance, UserProfile } from '../types/models';

/**
 * 1. EQUAL SPLIT
 * Distributes totalPaise equally among memberIds with exact remainder distribution.
 * e.g., 1000 paise among 3 users: 334, 333, 333 -> sum = 1000 paise.
 */
export function splitEqual(totalPaise: number, memberIds: string[]): Record<string, number> {
  if (!memberIds || memberIds.length === 0) return {};
  if (totalPaise <= 0) {
    return memberIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});
  }

  const count = memberIds.length;
  const baseShare = Math.floor(totalPaise / count);
  const remainder = totalPaise % count;

  const result: Record<string, number> = {};
  memberIds.forEach((id, index) => {
    // Distribute remainder 1 paise each to the first 'remainder' members
    result[id] = baseShare + (index < remainder ? 1 : 0);
  });

  return result;
}

/**
 * 2. EXACT AMOUNT SPLIT VALIDATION
 * Checks if provided exact paise amounts add up to totalPaise.
 */
export function validateExactSplit(
  totalPaise: number,
  splits: Record<string, number>
): { valid: boolean; differencePaise: number; error?: string } {
  const sum = Object.values(splits).reduce((acc, val) => acc + (val || 0), 0);
  const diff = totalPaise - sum;
  if (diff === 0) {
    return { valid: true, differencePaise: 0 };
  }
  return {
    valid: false,
    differencePaise: diff,
    error: diff > 0 
      ? `Splits are short by ${(diff / 100).toFixed(2)}` 
      : `Splits exceed total by ${(Math.abs(diff) / 100).toFixed(2)}`
  };
}

/**
 * 3. PERCENTAGE SPLIT
 * Converts percentage shares to integer paise, distributing any rounding discrepancy.
 */
export function splitPercentage(
  totalPaise: number,
  percentages: Record<string, number>
): { splits: Record<string, number>; valid: boolean; error?: string } {
  const memberIds = Object.keys(percentages);
  const totalPercentage = Object.values(percentages).reduce((a, b) => a + (b || 0), 0);

  // Validate percentage sums to 100%
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return {
      splits: {},
      valid: false,
      error: `Percentages sum to ${totalPercentage.toFixed(2)}%, must equal 100%`
    };
  }

  let distributedSum = 0;
  const splits: Record<string, number> = {};

  memberIds.forEach(id => {
    const pct = percentages[id] || 0;
    const share = Math.floor((totalPaise * pct) / 100);
    splits[id] = share;
    distributedSum += share;
  });

  // Distribute rounding remainder (if any)
  let remainder = totalPaise - distributedSum;
  let i = 0;
  while (remainder > 0 && memberIds.length > 0) {
    const id = memberIds[i % memberIds.length];
    splits[id] = (splits[id] || 0) + 1;
    remainder--;
    i++;
  }

  return { splits, valid: true };
}

/**
 * 4. SHARES / RATIO SPLIT
 * e.g., Alice 2 shares, Bob 1 share, Charlie 1 share (total 4 shares)
 */
export function splitShares(
  totalPaise: number,
  shares: Record<string, number>
): { splits: Record<string, number>; valid: boolean; error?: string } {
  const memberIds = Object.keys(shares);
  const totalShares = Object.values(shares).reduce((a, b) => a + (b || 0), 0);

  if (totalShares <= 0) {
    return { splits: {}, valid: false, error: 'Total shares must be greater than zero' };
  }

  let distributedSum = 0;
  const splits: Record<string, number> = {};

  memberIds.forEach(id => {
    const share = shares[id] || 0;
    const amount = Math.floor((totalPaise * share) / totalShares);
    splits[id] = amount;
    distributedSum += amount;
  });

  // Remainder distribution
  let remainder = totalPaise - distributedSum;
  let i = 0;
  while (remainder > 0 && memberIds.length > 0) {
    const id = memberIds[i % memberIds.length];
    splits[id] = (splits[id] || 0) + 1;
    remainder--;
    i++;
  }

  return { splits, valid: true };
}

/**
 * 5. MULTIPLE PAYERS VALIDATION
 * Confirms that total amounts paid by all payers equals total expense amount
 */
export function validatePayers(
  totalPaise: number,
  payers: Record<string, number>
): { valid: boolean; differencePaise: number; error?: string } {
  const sum = Object.values(payers).reduce((acc, val) => acc + (val || 0), 0);
  const diff = totalPaise - sum;
  if (diff === 0) {
    return { valid: true, differencePaise: 0 };
  }
  return {
    valid: false,
    differencePaise: diff,
    error: diff > 0 
      ? `Payers amount is short by ${(diff / 100).toFixed(2)}` 
      : `Payers amount exceeds total by ${(Math.abs(diff) / 100).toFixed(2)}`
  };
}

/**
 * 6. CALCULATE BALANCES
 * Aggregates all expenses (with multiple payers & splits) and settlements to produce:
 * - total_paid_paise
 * - total_owed_paise
 * - net_balance_paise (positive = is owed money, negative = owes money)
 */
export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[],
  memberIds: string[],
  profilesMap: Record<string, UserProfile> = {}
): Record<string, MemberBalance> {
  const balances: Record<string, MemberBalance> = {};

  // Initialize for all known members
  memberIds.forEach(id => {
    balances[id] = {
      user_id: id,
      profile: profilesMap[id],
      total_paid_paise: 0,
      total_owed_paise: 0,
      net_balance_paise: 0,
    };
  });

  // Process expenses
  expenses.forEach(exp => {
    // Payers: add to total_paid_paise
    if (exp.payers && exp.payers.length > 0) {
      exp.payers.forEach(payer => {
        if (!balances[payer.user_id]) {
          balances[payer.user_id] = {
            user_id: payer.user_id,
            profile: profilesMap[payer.user_id] || payer.profile,
            total_paid_paise: 0,
            total_owed_paise: 0,
            net_balance_paise: 0,
          };
        }
        balances[payer.user_id].total_paid_paise += payer.amount_paid_paise;
      });
    } else if (exp.created_by) {
      // Single payer fallback (created_by paid total)
      if (!balances[exp.created_by]) {
        balances[exp.created_by] = {
          user_id: exp.created_by,
          profile: profilesMap[exp.created_by] || exp.creator_profile,
          total_paid_paise: 0,
          total_owed_paise: 0,
          net_balance_paise: 0,
        };
      }
      balances[exp.created_by].total_paid_paise += exp.amount_paise;
    }

    // Splits: add to total_owed_paise
    if (exp.splits && exp.splits.length > 0) {
      exp.splits.forEach(split => {
        if (!balances[split.user_id]) {
          balances[split.user_id] = {
            user_id: split.user_id,
            profile: profilesMap[split.user_id] || split.profile,
            total_paid_paise: 0,
            total_owed_paise: 0,
            net_balance_paise: 0,
          };
        }
        balances[split.user_id].total_owed_paise += split.owed_amount_paise;
      });
    }
  });

  // Process settlements
  // Payer gave money -> increases payer's net position (effectively paid)
  // Payee received money -> decreases payee's net position (debt paid off)
  settlements.forEach(settle => {
    if (!balances[settle.payer_id]) {
      balances[settle.payer_id] = {
        user_id: settle.payer_id,
        profile: profilesMap[settle.payer_id] || settle.payer_profile,
        total_paid_paise: 0,
        total_owed_paise: 0,
        net_balance_paise: 0,
      };
    }
    if (!balances[settle.payee_id]) {
      balances[settle.payee_id] = {
        user_id: settle.payee_id,
        profile: profilesMap[settle.payee_id] || settle.payee_profile,
        total_paid_paise: 0,
        total_owed_paise: 0,
        net_balance_paise: 0,
      };
    }

    balances[settle.payer_id].total_paid_paise += settle.amount_paise;
    balances[settle.payee_id].total_owed_paise += settle.amount_paise;
  });

  // Calculate net balances: paid - owed
  Object.keys(balances).forEach(id => {
    balances[id].net_balance_paise = balances[id].total_paid_paise - balances[id].total_owed_paise;
  });

  return balances;
}

/**
 * 7. DEBT SIMPLIFICATION ALGORITHM (Min-Cash-Flow Greedy Solver)
 * Takes net balances and simplifies them into the minimum possible transactions.
 * Returns a list of SimplifiedDebt items: { from_user_id, to_user_id, amount_paise }
 */
export function simplifyDebts(
  netBalances: Record<string, number>,
  profilesMap: Record<string, UserProfile> = {}
): SimplifiedDebt[] {
  // Separate into debtors (negative balance) and creditors (positive balance)
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  Object.entries(netBalances).forEach(([id, balance]) => {
    if (balance < 0) {
      debtors.push({ id, amount: Math.abs(balance) });
    } else if (balance > 0) {
      creditors.push({ id, amount: balance });
    }
  });

  // Sort descending to match largest debtor with largest creditor
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SimplifiedDebt[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Math.min(debtor.amount, creditor.amount);

    if (settledAmount > 0) {
      transactions.push({
        from_user_id: debtor.id,
        to_user_id: creditor.id,
        amount_paise: settledAmount,
        from_profile: profilesMap[debtor.id],
        to_profile: profilesMap[creditor.id],
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount === 0) dIdx++;
    if (creditor.amount === 0) cIdx++;
  }

  return transactions;
}

