import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRuleInput } from './validation.mjs';

const validRule = { name: 'Regra', operator: 'contains', pattern: 'FORNECEDOR', direction: 'expense', categoryId: 'category_suppliers' };

test('rejects patterns that become empty after banking normalization', () => {
  assert.throws(() => validateRuleInput({ ...validRule, pattern: 'PIX PAGAMENTO' }), /caracteres úteis/);
  assert.throws(() => validateRuleInput({ ...validRule, pattern: '---' }), /caracteres úteis/);
});

test('validates rule amount limits and bank account id', () => {
  assert.throws(() => validateRuleInput({ ...validRule, minAmountCents: 200, maxAmountCents: 100 }), /mínimo/);
  assert.throws(() => validateRuleInput({ ...validRule, minAmountCents: -1 }), /não negativos/);
  assert.equal(validateRuleInput({ ...validRule, bankAccountId: 'bank-1', minAmountCents: 100 }).bankAccountId, 'bank-1');
});

test('allows simple regex and rejects unsafe regex', () => {
  assert.equal(validateRuleInput({ ...validRule, operator: 'regex', pattern: '^TARIFA[ -]+BANCARIA$' }).operator, 'regex');
  assert.throws(() => validateRuleInput({ ...validRule, operator: 'regex', pattern: '(a+)+$' }), /insegur/);
  assert.throws(() => validateRuleInput({ ...validRule, operator: 'regex', pattern: '([A-Z]+)\\1' }), /insegur/);
});
