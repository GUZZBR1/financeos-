/**
 * financeRecommendations.js
 * Rule-based proactive recommendations combining behavior, memory, and financial signals.
 * Max 3 recommendations. Does not repeat alerts or behavior insights.
 */

import { getMemory } from './financeMemory';
import { getSavedViews } from './financeSavedViews';

/**
 * Generate proactive recommendations based on memory, saved views, and current context.
 * @param {Object} params
 * @param {Object} params.topCategory - [name, amount] of top expense category
 * @param {Array} params.alerts - current alerts (to avoid duplication)
 * @returns {Array<{id: string, type: string, title: string, message: string, action: {label: string, type: string}}>}
 */
export function generateRecommendations({ topCategory, alerts = [] } = {}) {
  const mem = getMemory();
  const savedViews = getSavedViews();
  const recommendations = [];

  // Avoid duplicating what alerts already cover
  const hasNegativeBalanceAlert = alerts.some(a => a.id === 'negative-balance');
  const hasExpenseSpikeAlert = alerts.some(a => a.id === 'expenses-spike');

  // Rule A: Repeated category spikes → suggest cost reduction simulation
  if (topCategory) {
    const spikeCount = mem.patterns.repeatedSpikes[topCategory[0]] || 0;
    if (spikeCount >= 2 && !hasExpenseSpikeAlert) {
      recommendations.push({
        id: `spike-reduce-${topCategory[0]}`,
        type: 'action',
        title: `Reduce ${topCategory[0]} costs`,
        message: `${topCategory[0]} has triggered cost spikes ${spikeCount} times recently. Simulate a 10% reduction?`,
        action: {
          label: 'Simulate savings',
          type: 'simulate_savings',
        },
      });
    }
  }

  // Rule B: Frequent category views but no saved view → suggest creating one
  if (topCategory) {
    const viewCount = mem.usage.categoryViews[topCategory[0]] || 0;
    const hasSavedView = savedViews.some(v => v.filters.category === topCategory[0]);
    if (viewCount >= 5 && !hasSavedView) {
      recommendations.push({
        id: `create-view-${topCategory[0]}`,
        type: 'action',
        title: `Save ${topCategory[0]} view`,
        message: `You often review ${topCategory[0]} expenses but haven't saved this filter yet.`,
        action: {
          label: 'Save view',
          type: 'save_view',
          payload: { category: topCategory[0], suggestedName: `${topCategory[0]} Expenses` },
        },
      });
    }
  }

  // Rule C: Most used saved view → suggest revisiting it
  const viewClicks = mem.usage.savedViewClicks;
  if (Object.keys(viewClicks).length > 0) {
    const mostUsedEntry = Object.entries(viewClicks).sort((a, b) => b[1] - a[1])[0];
    if (mostUsedEntry[1] >= 3) {
      const mostUsedView = savedViews.find(v => v.id === mostUsedEntry[0]);
      if (mostUsedView) {
        recommendations.push({
          id: `revisit-${mostUsedView.id}`,
          type: 'action',
          title: `Revisit "${mostUsedView.name}"`,
          message: `Your most used view is "${mostUsedView.name}" (${mostUsedEntry[1]} times). Open it?`,
          action: {
            label: 'Open saved view',
            type: 'open_saved_view',
            payload: { viewId: mostUsedView.id, filters: mostUsedView.filters, viewName: mostUsedView.name },
          },
        });
      }
    }
  }

  // Rule D: Negative balance pattern → suggest reviewing expenses
  if (mem.patterns.negativeBalanceCount >= 3 && !hasNegativeBalanceAlert) {
    recommendations.push({
      id: 'review-expenses-negative',
      type: 'action',
      title: 'Review your expenses',
      message: `Balance has been negative ${mem.patterns.negativeBalanceCount} times recently. Time for a thorough review?`,
      action: {
        label: 'Review expenses',
        type: 'review_expenses',
      },
    });
  }

  // Rule E: Top category with no saved view → prompt saving
  if (topCategory && savedViews.length >= 1 && savedViews.length < 10) {
    const mostViewedCat = Object.entries(mem.usage.categoryViews).sort((a, b) => b[1] - a[1])[0];
    if (mostViewedCat && mostViewedCat[1] >= 3) {
      const hasViewForMostViewed = savedViews.some(v => v.filters.category === mostViewedCat[0]);
      if (!hasViewForMostViewed && recommendations.length < 3) {
        recommendations.push({
          id: `save-${mostViewedCat[0]}`,
          type: 'action',
          title: `Save your ${mostViewedCat[0]} filter`,
          message: `You've viewed ${mostViewedCat[0]} ${mostViewedCat[1]} times. Save this filter for quick access?`,
          action: {
            label: 'Save view',
            type: 'save_view',
            payload: { category: mostViewedCat[0], suggestedName: `${mostViewedCat[0]} Expenses` },
          },
        });
      }
    }
  }

  return recommendations.slice(0, 3);
}