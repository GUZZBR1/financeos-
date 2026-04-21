/**
 * financeHistoryUrlState.js
 * Helper for parsing and building URL query params for FinanceHistory.
 */

/**
 * Parse URL search params into filter state.
 * @param {URLSearchParams} searchParams
 * @returns {{ type: string, category: string }}
 */
export function parseUrlState(searchParams) {
  const type = searchParams.get('type');
  const category = searchParams.get('category') || '';

  return {
    type: ['all', 'income', 'expense'].includes(type) ? type : 'all',
    category,
  };
}

/**
 * Build a query string from filter state.
 * Only includes params that are not default values.
 * @param {{ type: string, category: string }} state
 * @returns {string} query string (including leading ? if needed, or empty string)
 */
export function buildQueryString(state) {
  const params = new URLSearchParams();

  if (state.type && state.type !== 'all') {
    params.set('type', state.type);
  }
  if (state.category) {
    params.set('category', state.category);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Merge location.state with URL params.
 * URL params take priority over location.state.
 * @param {URLSearchParams} searchParams
 * @param {{ type?: string, category?: string }} locationState
 * @returns {{ type: string, category: string }}
 */
export function mergeFilterState(searchParams, locationState = {}) {
  const urlState = parseUrlState(searchParams);

  return {
    type: urlState.type,
    category: urlState.category || locationState.category || '',
  };
}
