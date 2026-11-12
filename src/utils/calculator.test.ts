import {
  splitEqual,
  validateExactSplit,
  splitPercentage,
  splitShares,
  calculateBalances,
  simplifyDebts,
} from './calculator';
import { Expense, Settlement } from '../types/models';

export function runCalculationTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      results.push(` PASS: ${testName}`);
    } else {
      failed++;
      results.push(` FAIL: ${testName}`);
      console.error(`Assertion failed: ${testName}`);
    }
  }

  // 1. Equal splitting with odd remainder
  const split1000_3 = splitEqual(1000, ['u1', 'u2', 'u3']);
  const sum1 = Object.values(split1000_3).reduce((a, b) => a + b, 0);
  assert(sum1 === 1000, 'Equal split 1000 paise among 3 people must sum exactly to 1000');
  assert(split1000_3['u1'] === 334 && split1000_3['u2'] === 333 && split1000_3['u3'] === 333,
    'Equal split distributes 1-paise remainder to first member (334, 333, 333)');

  // 2. Equal splitting among 7 users
  const split10000_7 = splitEqual(10000, ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7']);
  const sum2 = Object.values(split10000_7).reduce((a, b) => a + b, 0);
  assert(sum2 === 10000, 'Equal split 10000 paise among 7 people must sum to 10000 without penny loss');

  // 3. Exact split validation
  const exactValid = validateExactSplit(5000, { u1: 2000, u2: 3000 });
  assert(exactValid.valid === true, 'Exact split summing to total is valid');
  const exactInvalid = validateExactSplit(5000, { u1: 2000, u2: 2900 });
  assert(exactInvalid.valid === false && exactInvalid.differencePaise === 100,
    'Exact split shortage is flagged with correct difference');

  // 4. Percentage split with rounding
  const pctResult = splitPercentage(10000, { u1: 33.33, u2: 33.33, u3: 33.34 });
  assert(pctResult.valid === true, 'Valid 100% split succeeds');
  const sumPct = Object.values(pctResult.splits).reduce((a, b) => a + b, 0);
  assert(sumPct === 10000, 'Percentage split with decimals sums to exactly 10000 paise');

  // 5. Shares split (2 : 1 : 1 on 1000 paise)
  const sharesResult = splitShares(1000, { u1: 2, u2: 1, u3: 1 });
  assert(sharesResult.valid === true, 'Valid shares split succeeds');
  const sumShares = Object.values(sharesResult.splits).reduce((a, b) => a + b, 0);
  assert(sumShares === 1000, 'Shares split sums to exactly 1000 paise');
  assert(sharesResult.splits['u1'] === 500 && sharesResult.splits['u2'] === 250 && sharesResult.splits['u3'] === 250,
    'Shares split ratio 2:1:1 produces 500, 250, 250 paise');

  // 6. Balance calculation with multiple payers and splits
  const sampleExpense: Expense = {
    id: 'exp-1',
    group_id: 'grp-1',
    title: 'Dinner',
    amount_paise: 3000,
    currency: 'INR',
    category: 'Food',
    split_method: 'equal',
    expense_date: '2026-11-12',
    created_by: 'alice',
    created_at: new Date().toISOString(),
    payers: [
      { id: 'p1', expense_id: 'exp-1', user_id: 'alice', amount_paid_paise: 2000 },
      { id: 'p2', expense_id: 'exp-1', user_id: 'bob', amount_paid_paise: 1000 }
    ],
    splits: [
      { id: 's1', expense_id: 'exp-1', user_id: 'alice', owed_amount_paise: 1000 },
      { id: 's2', expense_id: 'exp-1', user_id: 'bob', owed_amount_paise: 1000 },
      { id: 's3', expense_id: 'exp-1', user_id: 'charlie', owed_amount_paise: 1000 },
    ]
  };

  const balances = calculateBalances([sampleExpense], [], ['alice', 'bob', 'charlie']);
  assert(balances['alice'].net_balance_paise === 1000, 'Alice paid 2000, owes 1000 => net +1000 paise');
  assert(balances['bob'].net_balance_paise === 0, 'Bob paid 1000, owes 1000 => net 0 paise');
  assert(balances['charlie'].net_balance_paise === -1000, 'Charlie paid 0, owes 1000 => net -1000 paise');

  // 7. Settlement application
  const settlement: Settlement = {
    id: 'set-1',
    group_id: 'grp-1',
    payer_id: 'charlie',
    payee_id: 'alice',
    amount_paise: 1000,
    currency: 'INR',
    settled_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  const balancesAfterSettlement = calculateBalances([sampleExpense], [settlement], ['alice', 'bob', 'charlie']);
  assert(balancesAfterSettlement['alice'].net_balance_paise === 0, 'Alice balance is 0 after Charlie settled');
  assert(balancesAfterSettlement['charlie'].net_balance_paise === 0, 'Charlie balance is 0 after settlement');

  // 8. Debt Simplification (Chained debts: A owes B 500, B owes C 500 => A owes C 500)
  const netBalances = {
    alice: -500,
    bob: 0,
    charlie: 500,
  };
  const simplified = simplifyDebts(netBalances);
  assert(simplified.length === 1, 'Debt simplification compresses chained debt to 1 transaction');
  assert(simplified[0].from_user_id === 'alice' && simplified[0].to_user_id === 'charlie' && simplified[0].amount_paise === 500,
    'Alice directly pays Charlie 500 paise, bypassing Bob');

  // 9. Complex multi-party debt simplification (3 debtors, 2 creditors)
  const complexBalances = {
    u1: -4000,
    u2: -2000,
    u3: -1000,
    u4: 5000,
    u5: 2000,
  };
  const complexSimplified = simplifyDebts(complexBalances);
  // Total debtors = 3, total creditors = 2, max transactions <= 4
  assert(complexSimplified.length <= 4, 'Max simplified transactions is at most N - 1');
  const totalSettledFrom = complexSimplified.reduce((acc, t) => acc + t.amount_paise, 0);
  assert(totalSettledFrom === 7000, 'Total simplified transaction volume equals total positive debt (7000 paise)');

  return { passed, failed, results };
}

