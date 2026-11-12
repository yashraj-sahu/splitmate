import { runCalculationTests } from '../src/utils/calculator.test';

console.log('----------------------------------------------------');
console.log('Running SplitMate Expense Calculation Engine Tests...');
console.log('----------------------------------------------------');

const { passed, failed, results } = runCalculationTests();

results.forEach(res => console.log(res));

console.log('----------------------------------------------------');
console.log(`Results: ${passed} PASSED, ${failed} FAILED.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL EDGE CASE TESTS PASSED PERFECTLY!');
  process.exit(0);
}

