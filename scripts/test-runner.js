// Standalone test suite for SplitMate calculation engine using plain JS
function splitEqual(totalPaise, memberIds) {
  if (!memberIds || memberIds.length === 0) return {};
  if (totalPaise <= 0) return memberIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});
  const count = memberIds.length;
  const baseShare = Math.floor(totalPaise / count);
  const remainder = totalPaise % count;
  const result = {};
  memberIds.forEach((id, index) => {
    result[id] = baseShare + (index < remainder ? 1 : 0);
  });
  return result;
}

function validateExactSplit(totalPaise, splits) {
  const sum = Object.values(splits).reduce((acc, val) => acc + (val || 0), 0);
  const diff = totalPaise - sum;
  return { valid: diff === 0, differencePaise: diff };
}

function splitPercentage(totalPaise, percentages) {
  const memberIds = Object.keys(percentages);
  const totalPercentage = Object.values(percentages).reduce((a, b) => a + (b || 0), 0);
  if (Math.abs(totalPercentage - 100) > 0.01) return { splits: {}, valid: false };
  let distributedSum = 0;
  const splits = {};
  memberIds.forEach(id => {
    const pct = percentages[id] || 0;
    const share = Math.floor((totalPaise * pct) / 100);
    splits[id] = share;
    distributedSum += share;
  });
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

function splitShares(totalPaise, shares) {
  const memberIds = Object.keys(shares);
  const totalShares = Object.values(shares).reduce((a, b) => a + (b || 0), 0);
  if (totalShares <= 0) return { splits: {}, valid: false };
  let distributedSum = 0;
  const splits = {};
  memberIds.forEach(id => {
    const share = shares[id] || 0;
    const amount = Math.floor((totalPaise * share) / totalShares);
    splits[id] = amount;
    distributedSum += amount;
  });
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

function simplifyDebts(netBalances) {
  const debtors = [];
  const creditors = [];
  Object.entries(netBalances).forEach(([id, balance]) => {
    if (balance < 0) debtors.push({ id, amount: Math.abs(balance) });
    else if (balance > 0) creditors.push({ id, amount: balance });
  });
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  const transactions = [];
  let dIdx = 0, cIdx = 0;
  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settledAmount = Math.min(debtor.amount, creditor.amount);
    if (settledAmount > 0) {
      transactions.push({ from: debtor.id, to: creditor.id, amount_paise: settledAmount });
    }
    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;
    if (debtor.amount === 0) dIdx++;
    if (creditor.amount === 0) cIdx++;
  }
  return transactions;
}

// RUN TESTS
console.log('Testing Expense Calculation Engine...');
let passed = 0;
function assert(cond, name) {
  if (cond) {
    console.log(`✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${name}`);
    process.exit(1);
  }
}

// 1. Equal split odd remainder
const eq1 = splitEqual(1000, ['a', 'b', 'c']);
assert(eq1.a === 334 && eq1.b === 333 && eq1.c === 333, 'Odd remainder (1000 paise among 3 -> 334, 333, 333)');
assert(eq1.a + eq1.b + eq1.c === 1000, 'Sum is exactly 1000 paise');

// 2. Exact split
assert(validateExactSplit(5000, { a: 2500, b: 2500 }).valid, 'Exact split 5000 = 2500 + 2500');
assert(!validateExactSplit(5000, { a: 2500, b: 2400 }).valid, 'Exact split shortfall detected');

// 3. Percentage
const pct = splitPercentage(10000, { a: 33.33, b: 33.33, c: 33.34 });
assert(pct.valid && pct.splits.a + pct.splits.b + pct.splits.c === 10000, 'Percentage split exact 10000 paise');

// 4. Shares (2:1:1 on 1000)
const sh = splitShares(1000, { a: 2, b: 1, c: 1 });
assert(sh.valid && sh.splits.a === 500 && sh.splits.b === 250 && sh.splits.c === 250, 'Shares 2:1:1 gives 500, 250, 250');

// 5. Debt simplification
const debts = simplifyDebts({ a: -500, b: 0, c: 500 });
assert(debts.length === 1 && debts[0].from === 'a' && debts[0].to === 'c' && debts[0].amount_paise === 500, 'Chained debt simplification A->C 500');

console.log(`\nAll ${passed} calculation tests executed successfully!`);

