export function normalizeDescription(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\b(?:PIX|TED|DOC|COMPRA|PAGAMENTO|RECEBIMENTO)\b/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSafeRegexPattern(pattern) {
  const source = String(pattern || '');
  if (!source || source.length > 120) return false;

  // Regras são executadas no processo principal. Mantemos um subconjunto
  // deliberadamente simples para impedir backtracking catastrófico (ReDoS).
  if (/[(){}]/u.test(source)) return false;
  if (/\\[1-9]/u.test(source)) return false;
  if (/(?:[*+?]){2,}/u.test(source)) return false;

  try {
    new RegExp(source, 'iu');
    return true;
  } catch {
    return false;
  }
}

function matchesPattern(value, operator, pattern) {
  const normalizedValue = normalizeDescription(value);
  const normalizedPattern = normalizeDescription(pattern);

  if (operator !== 'regex' && !normalizedPattern) return false;

  switch (operator) {
    case 'equals':
      return normalizedValue === normalizedPattern;
    case 'starts_with':
      return normalizedValue.startsWith(normalizedPattern);
    case 'contains':
      return normalizedValue.includes(normalizedPattern);
    case 'regex': {
      if (!isSafeRegexPattern(pattern)) return false;
      return new RegExp(pattern, 'iu').test(String(value).slice(0, 500));
    }
    default:
      return false;
  }
}

export function ruleMatches(transaction, rule) {
  if (!rule.active) return false;
  if (rule.direction && rule.direction !== transaction.direction) return false;
  if (rule.bank_account_id && rule.bank_account_id !== transaction.bankAccountId) return false;

  const absoluteAmount = Math.abs(transaction.amountCents);
  if (rule.min_amount_cents != null && absoluteAmount < rule.min_amount_cents) return false;
  if (rule.max_amount_cents != null && absoluteAmount > rule.max_amount_cents) return false;

  const fieldMap = {
    description: transaction.description,
    transaction_type: transaction.transactionType,
    document_number: transaction.documentNumber,
  };

  return matchesPattern(fieldMap[rule.field] || '', rule.operator, rule.pattern);
}

export function classifyTransaction(transaction, rules = []) {
  const ordered = [...rules].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return String(a.id).localeCompare(String(b.id));
  });

  const match = ordered.find((rule) => ruleMatches(transaction, rule));
  if (!match) {
    return {
      categoryId: null,
      confidence: 0,
      ruleId: null,
      explanation: 'Nenhuma regra determinística correspondeu à transação.',
      requiresReview: true,
    };
  }

  return {
    categoryId: match.category_id,
    confidence: Number(match.confidence),
    ruleId: match.id,
    explanation: `Classificada pela regra “${match.name}”.`,
    requiresReview: Number(match.confidence) < 0.85,
  };
}

export function createLearnedRule({ description, direction, categoryId, bankAccountId = null }) {
  const pattern = normalizeDescription(description);
  if (!pattern) throw new Error('Não é possível aprender uma regra sem descrição.');

  return {
    name: `Aprendida: ${pattern.slice(0, 48)}`,
    priority: 800,
    active: true,
    field: 'description',
    operator: 'equals',
    pattern,
    direction,
    bankAccountId,
    categoryId,
    confidence: 0.98,
    createdBy: 'learned',
  };
}
