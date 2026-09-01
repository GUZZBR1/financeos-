/**
 * financeActions.js
 * Maps finance signal types to simple UI actions.
 * Each action returns a result object with type and data.
 */

/**
 * @typedef {Object} ActionResult
 * @property {string} type - 'navigation' | 'simulation' | 'filter' | 'highlight' | 'recommendation'
 * @property {string} title - Display title for the result
 * @property {string} message - Display message for the result
 * @property {Object} [data] - Optional payload data
 */

/**
 * Handle negative balance alert
 * @returns {ActionResult}
 */
export function handleNegativeBalance() {
  return {
    type: 'recommendation',
    title: 'Saldo negativo',
    message: 'Revise as despesas recentes para identificar onde os gastos podem ser reduzidos.',
  };
}

/**
 * Handle expenses spike alert
 * @param {Object} params
 * @param {Array} params.topCategory - [name, amount]
 * @returns {ActionResult}
 */
export function handleExpensesSpike({ topCategory }) {
  return {
    type: 'navigation',
    title: 'Principal categoria de despesa',
    message: topCategory
      ? `Abrindo as despesas de ${topCategory[0]}.`
      : 'Abrindo as transações de despesa.',
    navigateTo: '/finance/history?type=expense',
  };
}

/**
 * Handle revenue decline alert
 * @returns {ActionResult}
 */
export function handleRevenueDecline() {
  return {
    type: 'navigation',
    title: 'Análise de receitas',
    message: 'Consulte o histórico para identificar tendências e padrões nas receitas.',
    navigateTo: '/finance/history',
  };
}

/**
 * Handle review top category suggestion
 * @param {Object} params
 * @param {Array} params.topCategory - [name, amount]
 * @param {string} params.categoryName - Category name to filter
 * @returns {ActionResult}
 */
export function handleReviewTopCategory({ topCategory, categoryName }) {
  const category = categoryName || topCategory?.[0];
  return {
    type: 'navigation',
    title: `Filtro: ${category || 'Principal categoria'}`,
    message: topCategory
      ? `Abrindo as transações de ${topCategory[0]}. Total: ${topCategory[1].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      : 'Abrindo as transações da categoria.',
    navigateTo: `/finance/history?type=expense&category=${encodeURIComponent(category || '')}`,
  };
}

/**
 * Handle savings opportunity suggestion
 * @param {Object} params
 * @param {Array} params.topCategory - [name, amount]
 * @param {number} [params.percentage] - Reduction percentage (default 10)
 * @returns {ActionResult}
 */
export function handleSavingsOpportunity({ topCategory, percentage = 10 }) {
  if (!topCategory) {
    return {
      type: 'simulation',
      title: 'Simulação de economia',
      message: 'Não há despesas disponíveis para simular.',
    };
  }

  const [categoryName, categoryAmount] = topCategory;
  const monthlySavings = categoryAmount * (percentage / 100);
  const yearlySavings = monthlySavings * 12;

  return {
    type: 'simulation',
    title: 'Simulação de economia',
    message: `Reduzir ${categoryName} em ${percentage}% economizaria ${monthlySavings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no mês e ${yearlySavings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no ano.`,
    data: {
      category: categoryName,
      originalAmount: categoryAmount,
      monthlySavings,
      yearlySavings,
      percentage,
    },
  };
}

/**
 * Handle stable period suggestion
 * @returns {ActionResult}
 */
export function handleStablePeriod() {
  return {
    type: 'recommendation',
    title: 'Resumo financeiro',
    message: 'As finanças estão estáveis. Continue acompanhando receitas e despesas.',
  };
}

/**
 * Handle open saved view action
 * @param {Object} params
 * @param {string} params.viewId
 * @param {Object} params.filters - { type, category }
 * @param {string} params.viewName - display name for context label
 * @returns {ActionResult}
 */
export function handleOpenSavedView({ filters = {}, viewName = '' } = {}) {
  const qs = new URLSearchParams();
  if (filters.type && filters.type !== 'all') qs.set('type', filters.type);
  if (filters.category) qs.set('category', filters.category);
  if (viewName) qs.set('viewName', viewName);
  qs.set('action', 'open_saved_view');
  return {
    type: 'navigation',
    title: 'Abrir visão salva',
    message: 'Abrindo a visão salva.',
    navigateTo: `/finance/history?${qs.toString()}`,
  };
}

/**
 * Handle save view action
 * @param {Object} params
 * @param {string} params.category - category to prefill
 * @param {string} params.type - type to prefill (default: expense)
 * @param {string} params.suggestedName - suggested name for the view
 * @returns {ActionResult}
 */
export function handleSaveViewAction({ category = '', type = 'expense', suggestedName = '' } = {}) {
  const qs = new URLSearchParams();
  qs.set('type', type);
  if (category) qs.set('category', category);
  qs.set('action', 'save_view');
  if (suggestedName) qs.set('suggestedName', suggestedName);
  return {
    type: 'navigation',
    title: 'Salvar visão',
    message: 'Abrindo o cadastro da visão.',
    navigateTo: `/finance/history?${qs.toString()}`,
  };
}

/**
 * Map action type string to handler function
 * @param {string} actionType
 * @param {Object} params - Parameters to pass to the handler
 * @returns {ActionResult}
 */
export function executeAction(actionType, params = {}) {
  const handlers = {
    simulate_savings: () => handleSavingsOpportunity(params),
    review_expenses: () => handleExpensesSpike(params),
    see_top_expenses: () => handleExpensesSpike(params),
    open_history: () => handleRevenueDecline(),
    filter_category: () => handleReviewTopCategory(params),
    see_overview: () => handleStablePeriod(),
    review_negative: () => handleNegativeBalance(),
    open_saved_view: () => handleOpenSavedView(params),
    save_view: () => handleSaveViewAction(params),
  };

  const handler = handlers[actionType];
  if (!handler) {
    return {
      type: 'recommendation',
      title: 'Ação',
      message: 'Ação indisponível.',
    };
  }

  return handler();
}
