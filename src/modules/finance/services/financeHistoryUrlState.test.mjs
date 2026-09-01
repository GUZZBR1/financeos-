import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQueryString, parseUrlState } from './financeHistoryUrlState.js';

test('preserva filtros do lote importado na URL', () => {
  const query = buildQueryString({
    type: 'all',
    category: '',
    period: 'all',
    status: 'review',
    batchId: 'lote-123',
  });
  assert.equal(query, '?period=all&status=review&batchId=lote-123');
  assert.deepEqual(parseUrlState(new URLSearchParams(query)), {
    type: 'all',
    category: '',
    period: 'all',
    status: 'review',
    batchId: 'lote-123',
  });
});

test('usa os últimos 30 dias quando o período da URL é inválido', () => {
  assert.equal(parseUrlState(new URLSearchParams('period=invalid')).period, 'last30');
});
