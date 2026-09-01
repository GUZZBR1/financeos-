import { isSafeRegexPattern } from '../domain/classification.mjs';

export function requireObject(value, name = 'dados') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} inválidos.`);
  return value;
}

export function requireString(value, name, { max = 500, optional = false } = {}) {
  if (optional && (value == null || value === '')) return null;
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} é obrigatório.`);
  if (value.length > max) throw new Error(`${name} excede ${max} caracteres.`);
  return value.trim();
}

export function validateTransactionInput(value) {
  const input = requireObject(value, 'Transação');
  return {
    value: Number(input.value),
    type: requireString(input.type, 'Tipo', { max: 20 }),
    description: typeof input.description === 'string' ? input.description.slice(0, 300) : '',
    date: requireString(input.date, 'Data', { max: 10 }),
    categoryId: input.categoryId ? requireString(input.categoryId, 'Categoria', { max: 100 }) : null,
    accountId: input.accountId ? requireString(input.accountId, 'Conta', { max: 100 }) : null,
  };
}

export function validateRuleInput(value) {
  const input = requireObject(value, 'Regra');
  const operators = ['equals', 'contains', 'starts_with', 'regex'];
  const operator = requireString(input.operator, 'Operador', { max: 30 });
  if (!operators.includes(operator)) throw new Error('Operador de regra inválido.');
  const field = requireString(input.field || 'description', 'Campo', { max: 30 });
  if (!['description', 'transaction_type', 'document_number'].includes(field)) throw new Error('Campo de regra inválido.');
  const direction = input.direction ? requireString(input.direction, 'Movimento', { max: 20 }) : null;
  if (direction && !['income', 'expense'].includes(direction)) throw new Error('Movimento de regra inválido.');
  const priority = Number(input.priority ?? 100);
  const confidence = Number(input.confidence ?? 1);
  if (!Number.isFinite(priority) || !Number.isFinite(confidence)) throw new Error('Prioridade ou confiança inválida.');
  const pattern = requireString(input.pattern, 'Padrão', { max: 300 });
  if (operator === 'regex') {
    if (!isSafeRegexPattern(pattern)) throw new Error('A expressão regular é inválida ou usa recursos inseguros. Use uma expressão simples, sem grupos, repetições por faixa ou referências anteriores.');
  } else {
    const normalizedPattern = pattern.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\b(?:PIX|TED|DOC|COMPRA|PAGAMENTO|RECEBIMENTO)\b/g, ' ').replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (normalizedPattern.length < 3) throw new Error('O padrão precisa ter pelo menos 3 caracteres úteis além de termos bancários genéricos.');
  }
  const bankAccountId = input.bankAccountId ? requireString(input.bankAccountId, 'Conta bancária', { max: 100 }) : null;
  const minAmountCents = input.minAmountCents == null ? null : Number(input.minAmountCents);
  const maxAmountCents = input.maxAmountCents == null ? null : Number(input.maxAmountCents);
  if ((minAmountCents != null && (!Number.isInteger(minAmountCents) || minAmountCents < 0)) || (maxAmountCents != null && (!Number.isInteger(maxAmountCents) || maxAmountCents < 0))) throw new Error('Os limites de valor devem ser inteiros não negativos.');
  if (minAmountCents != null && maxAmountCents != null && minAmountCents > maxAmountCents) throw new Error('O valor mínimo não pode ser maior que o máximo.');
  return {
    name: requireString(input.name, 'Nome', { max: 100 }),
    priority: Math.max(0, Math.min(1000, priority)),
    active: input.active !== false,
    field,
    operator,
    pattern,
    direction,
    bankAccountId,
    minAmountCents,
    maxAmountCents,
    categoryId: requireString(input.categoryId, 'Categoria', { max: 100 }),
    confidence: Math.max(0, Math.min(1, confidence)),
    createdBy: 'user',
  };
}
