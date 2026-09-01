import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateCurrentBalance,
  calculateSummary,
  getBarChartData,
  getLineChartData,
  PERIOD_FILTERS,
} from './calculations.js';

test('movimentos sem categoria entram imediatamente no saldo', () => {
  const transactions = [
    { accountId: 'bank-1', amountCents: 10000, type: 'income', value: 100, date: '2026-04-01', status: 'review' },
    { accountId: 'bank-1', amountCents: -2500, type: 'expense', value: 25, date: '2026-04-02', status: 'review' },
  ];
  assert.equal(calculateCurrentBalance(transactions, [{ id: 'bank-1', subtype: 'bank' }]), 75);
});

test('usa saldo do OFX e soma movimentos posteriores ao extrato', () => {
  const accounts = [{
    id: 'bank-1',
    subtype: 'bank',
    statement_balance_cents: 97500,
    statement_balance_as_of: '2026-04-30',
  }];
  const transactions = [
    { accountId: 'bank-1', amountCents: 10000, date: '2026-04-10' },
    { accountId: 'bank-1', amountCents: -5000, date: '2026-05-02' },
  ];
  assert.equal(calculateCurrentBalance(transactions, accounts), 925);
});

test('gráficos de todo o histórico usam o intervalo real dos lançamentos', () => {
  const transactions = [
    { type: 'income', value: 100, date: '2026-04-01' },
    { type: 'expense', value: 25, date: '2026-04-03' },
  ];

  const bars = getBarChartData(transactions, PERIOD_FILTERS.ALL);
  const line = getLineChartData(transactions, PERIOD_FILTERS.ALL);

  assert.equal(bars.length, 3);
  assert.deepEqual(bars[0], { date: '01/04', income: 100, expense: 0 });
  assert.deepEqual(bars[2], { date: '03/04', income: 0, expense: 25 });
  assert.equal(line.at(-1).saldo, 75);
});

test('gráficos de todo o histórico ficam vazios quando não há lançamentos', () => {
  assert.deepEqual(getBarChartData([], PERIOD_FILTERS.ALL), []);
  assert.deepEqual(getLineChartData([], PERIOD_FILTERS.ALL), []);
});

test('totais e evolução não criam saldo negativo por erro de ponto flutuante', () => {
  const transactions = [
    { type: 'income', value: 0.1, date: '2026-04-01' },
    { type: 'income', value: 0.2, date: '2026-04-01' },
    { type: 'expense', value: 0.3, date: '2026-04-02' },
  ];

  assert.equal(calculateSummary(transactions).balance, 0);
  assert.equal(getLineChartData(transactions, PERIOD_FILTERS.ALL).at(-1).saldo, 0);
});

test('saldo negativo real permanece negativo', () => {
  const transactions = [
    { type: 'income', amountCents: 10000, value: 100, date: '2026-04-01' },
    { type: 'expense', amountCents: -12500, value: 125, date: '2026-04-02' },
  ];

  assert.equal(calculateSummary(transactions).balance, -25);
  assert.equal(calculateCurrentBalance(transactions), -25);
  assert.equal(getLineChartData(transactions, PERIOD_FILTERS.ALL).at(-1).saldo, -25);
});
