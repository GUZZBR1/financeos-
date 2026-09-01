import assert from 'node:assert/strict';
import test from 'node:test';
import { moneyToCents, requireIsoDate } from './financial-values.mjs';

test('converte valores legitimos sem arredondamento', () => {
  assert.equal(moneyToCents('10'), 1000);
  assert.equal(moneyToCents('10,5'), 1050);
  assert.equal(moneyToCents(-10.25, { allowNegative: true }), -1025);
});

test('rejeita fracao excessiva e valores nao finitos ou fora da faixa', () => {
  assert.throws(() => moneyToCents('1.001'), /2 casas/);
  assert.throws(() => moneyToCents(NaN), /2 casas/);
  assert.throws(() => moneyToCents(Infinity), /2 casas/);
  assert.throws(() => moneyToCents('90071992547410.00'), /faixa/);
});

test('valida datas ISO pelo calendario', () => {
  assert.equal(requireIsoDate('2024-02-29'), '2024-02-29');
  assert.throws(() => requireIsoDate('2026-02-29'), /calendário/);
  assert.throws(() => requireIsoDate('2026-13-01'), /calendário/);
  assert.throws(() => requireIsoDate('01/08/2026'), /YYYY-MM-DD/);
});
