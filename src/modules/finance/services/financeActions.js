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
    title: 'Negative Balance',
    message: 'Review your recent expenses to identify areas where spending can be reduced.',
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
    title: 'Top Expense Category',
    message: topCategory
      ? `Navigating to show ${topCategory[0]} expenses.`
      : 'Navigating to show expense transactions.',
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
    title: 'Revenue Analysis',
    message: 'View your transaction history to identify revenue trends and patterns.',
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
    title: `Filter: ${category || 'Top Category'}`,
    message: topCategory
      ? `Navigating to show ${topCategory[0]} transactions. Total: R$ ${topCategory[1].toLocaleString('BRL')}`
      : 'Navigating to show category transactions.',
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
      title: 'Savings Simulation',
      message: 'No expense data available for simulation.',
    };
  }

  const [categoryName, categoryAmount] = topCategory;
  const monthlySavings = categoryAmount * (percentage / 100);
  const yearlySavings = monthlySavings * 12;

  return {
    type: 'simulation',
    title: 'Savings Simulation',
    message: `Reducing ${categoryName} by ${percentage}% could save R$ ${monthlySavings.toLocaleString('BRL')} this month and R$ ${yearlySavings.toLocaleString('BRL')} per year.`,
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
    title: 'Financial Overview',
    message: 'Your finances are stable. Continue monitoring income and expenses to maintain this trend.',
  };
}

/**
 * Handle open saved view action
 * @param {Object} params
 * @param {string} params.viewId
 * @param {Object} params.filters - { type, category }
 * @returns {ActionResult}
 */
export function handleOpenSavedView({ filters = {} } = {}) {
  const qs = new URLSearchParams();
  if (filters.type && filters.type !== 'all') qs.set('type', filters.type);
  if (filters.category) qs.set('category', filters.category);
  const queryString = qs.toString() ? `?${qs.toString()}` : '';
  return {
    type: 'navigation',
    title: 'Open Saved View',
    message: 'Navigating to your saved view.',
    navigateTo: `/finance/history${queryString}`,
  };
}

/**
 * Handle save view action (no-op placeholder — triggered when not on history page)
 * @returns {ActionResult}
 */
export function handleSaveViewAction() {
  return {
    type: 'recommendation',
    title: 'Save View',
    message: 'Go to Finance History to save this filter as a view.',
    navigateTo: '/finance/history',
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
    save_view: () => handleSaveViewAction(),
  };

  const handler = handlers[actionType];
  if (!handler) {
    return {
      type: 'recommendation',
      title: 'Action',
      message: 'Action not available.',
    };
  }

  return handler();
}
