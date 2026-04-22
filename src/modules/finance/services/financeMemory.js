/**
 * financeMemory.js
 * Lightweight localStorage memory system for tracking user behavior patterns.
 */

const STORAGE_KEY = 'finance_memory';

const DEFAULT_MEMORY = {
  usage: {
    savedViewClicks: {},
    categoryViews: {},
  },
  patterns: {
    repeatedSpikes: {},
    negativeBalanceCount: 0,
  },
};

/**
 * Get current memory from localStorage.
 * @returns {Object}
 */
export function getMemory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_MEMORY };
    return { ...DEFAULT_MEMORY, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_MEMORY };
  }
}

/**
 * Update memory with a pure updater function.
 * @param {Function} updater - receives current memory, returns partial update
 */
export function updateMemory(updater) {
  const current = getMemory();
  const update = updater(current);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...update }));
}

/**
 * Track a specific event type with optional payload.
 * @param {'savedViewClick' | 'categoryView' | 'expenseSpike' | 'negativeBalance'} type
 * @param {Object} payload
 */
export function trackEvent(type, payload = {}) {
  updateMemory((mem) => {
    const next = JSON.parse(JSON.stringify(mem));

    switch (type) {
      case 'savedViewClick': {
        const { viewId } = payload;
        if (!viewId) break;
        next.usage.savedViewClicks[viewId] = (next.usage.savedViewClicks[viewId] || 0) + 1;
        break;
      }
      case 'categoryView': {
        const { category } = payload;
        if (!category) break;
        next.usage.categoryViews[category] = (next.usage.categoryViews[category] || 0) + 1;
        break;
      }
      case 'expenseSpike': {
        const { category } = payload;
        if (!category) break;
        next.patterns.repeatedSpikes[category] = (next.patterns.repeatedSpikes[category] || 0) + 1;
        break;
      }
      case 'negativeBalance': {
        next.patterns.negativeBalanceCount = (next.patterns.negativeBalanceCount || 0) + 1;
        break;
      }
      default:
        break;
    }

    return next;
  });
}

/**
 * Generate recurring insights from memory.
 * Threshold-based, max 3 insights.
 * @param {Array} savedViewsList - array of {id, name} to map viewId to name
 * @returns {Array<{text: string, type: string}>}
 */
export function generateRecurringInsights(savedViewsList = []) {
  const mem = getMemory();
  const insights = [];

  // Most used saved view (threshold >= 3)
  const viewClicks = mem.usage.savedViewClicks;
  if (Object.keys(viewClicks).length > 0) {
    const mostUsed = Object.entries(viewClicks).sort((a, b) => b[1] - a[1])[0];
    if (mostUsed[1] >= 3) {
      const viewName = savedViewsList.find(v => v.id === mostUsed[0])?.name;
      if (viewName) {
        insights.push({
          text: `Your most used saved view is "${viewName}" (${mostUsed[1]} times)`,
          type: 'behavior',
        });
      }
    }
  }

  // Frequent category view (threshold >= 5)
  const catViews = mem.usage.categoryViews;
  if (Object.keys(catViews).length > 0) {
    const mostViewed = Object.entries(catViews).sort((a, b) => b[1] - a[1])[0];
    if (mostViewed[1] >= 5) {
      insights.push({
        text: `You frequently review ${mostViewed[0]} expenses (${mostViewed[1]} times)`,
        type: 'behavior',
      });
    }
  }

  // Repeated spikes in same category (threshold >= 2)
  const spikes = mem.patterns.repeatedSpikes;
  if (Object.keys(spikes).length > 0) {
    const topSpike = Object.entries(spikes).sort((a, b) => b[1] - a[1])[0];
    if (topSpike[1] >= 2) {
      insights.push({
        text: `${topSpike[0]} has triggered cost spikes ${topSpike[1]} times recently`,
        type: 'pattern',
      });
    }
  }

  // Multiple negative balance events (threshold >= 3)
  const negCount = mem.patterns.negativeBalanceCount || 0;
  if (negCount >= 3) {
    insights.push({
      text: `Balance has been negative ${negCount} times this period — consider reviewing expenses`,
      type: 'warning',
    });
  }

  return insights.slice(0, 3);
}

/**
 * Clear all memory data.
 */
export function clearMemory() {
  localStorage.removeItem(STORAGE_KEY);
}