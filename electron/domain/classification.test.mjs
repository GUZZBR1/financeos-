import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTransaction, createLearnedRule, isSafeRegexPattern, normalizeDescription, ruleMatches } from './classification.mjs';

test('normaliza descrições bancárias de forma determinística', () => {
  assert.equal(normalizeDescription('PIX Pagamento — Posto São João'), 'POSTO SAO JOAO');
});

test('aplica a regra de maior prioridade e informa a explicação', () => {
  const result = classifyTransaction({
    description: 'Compra no Posto Central',
    direction: 'expense',
    amountCents: -15000,
    bankAccountId: 'bank-1',
  }, [
    { id: 'low', name: 'Genérica', active: true, priority: 10, field: 'description', operator: 'contains', pattern: 'posto', category_id: 'other', confidence: 0.8 },
    { id: 'high', name: 'Combustível', active: true, priority: 100, field: 'description', operator: 'contains', pattern: 'posto', direction: 'expense', category_id: 'fuel', confidence: 0.99 },
  ]);

  assert.equal(result.categoryId, 'fuel');
  assert.equal(result.ruleId, 'high');
  assert.equal(result.requiresReview, false);
});

test('cria regra aprendida exata sem IA', () => {
  const rule = createLearnedRule({ description: 'TED Fornecedor ABC', direction: 'expense', categoryId: 'supplier' });
  assert.equal(rule.operator, 'equals');
  assert.equal(rule.pattern, 'FORNECEDOR ABC');
  assert.equal(rule.createdBy, 'learned');
});

test('padrão que normaliza para vazio nunca corresponde', () => {
  const transaction = { description: 'QUALQUER FORNECEDOR', direction: 'expense', amountCents: -1000 };
  assert.equal(ruleMatches(transaction, { active: true, field: 'description', operator: 'contains', pattern: 'PIX' }), false);
  assert.equal(ruleMatches(transaction, { active: true, field: 'description', operator: 'starts_with', pattern: 'PAGAMENTO' }), false);
});

test('rejeita regex com risco de backtracking catastrófico', () => {
  assert.equal(isSafeRegexPattern('^TARIFA[ -]+BANCARIA$'), true);
  assert.equal(isSafeRegexPattern('(a+)+$'), false);
  assert.equal(isSafeRegexPattern('(a|aa)+$'), false);
  assert.equal(isSafeRegexPattern('([A-Z]+)\\1'), false);
  assert.equal(ruleMatches(
    { description: `${'a'.repeat(300)}!`, direction: 'expense', amountCents: -100 },
    { active: true, field: 'description', operator: 'regex', pattern: '(a+)+$' },
  ), false);
});
