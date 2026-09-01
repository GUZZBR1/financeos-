function boundedText(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normalizeWorkText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateWorkPlan(value) {
  const message = boundedText(value?.message, 500) || 'Não consegui transformar o pedido em uma atividade segura.';
  if (value?.action !== 'categorize_transactions') return { action: null, message };

  const pattern = boundedText(value.pattern, 120);
  const categoryName = boundedText(value.categoryName, 100);
  if (normalizeWorkText(pattern).length < 2 || !categoryName) {
    return { action: null, message: 'Informe o texto que deve ser localizado e a categoria de destino.' };
  }

  return {
    action: 'categorize_transactions',
    operator: ['contains', 'equals', 'starts_with'].includes(value.operator) ? value.operator : 'contains',
    pattern,
    categoryName,
    direction: ['income', 'expense'].includes(value.direction) ? value.direction : null,
    message,
  };
}

export function workDescriptionMatches(description, operator, pattern) {
  const value = normalizeWorkText(description);
  const expected = normalizeWorkText(pattern);
  if (!expected) return false;
  if (operator === 'equals') return value === expected;
  if (operator === 'starts_with') return value.startsWith(expected);
  return value.includes(expected);
}

export function findWorkCategory(categories, requestedName) {
  const requested = normalizeWorkText(requestedName);
  const exact = categories.find((category) => normalizeWorkText(category.name) === requested);
  if (exact) return exact;

  const singular = requested.endsWith('S') ? requested.slice(0, -1) : requested;
  const compatible = categories.filter((category) => {
    const name = normalizeWorkText(category.name);
    return (name.endsWith('S') ? name.slice(0, -1) : name) === singular;
  });
  return compatible.length === 1 ? compatible[0] : null;
}
