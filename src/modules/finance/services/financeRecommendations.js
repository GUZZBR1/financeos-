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
        title: `Reduzir custos de ${topCategory[0]}`,
        message: `${topCategory[0]} apresentou picos de custo ${spikeCount} vezes. Simular uma redução de 10%?`,
        action: {
          label: 'Simular economia',
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
        title: `Salvar visão de ${topCategory[0]}`,
        message: `Você revisa despesas de ${topCategory[0]} com frequência, mas ainda não salvou esse filtro.`,
        action: {
          label: 'Salvar visão',
          type: 'save_view',
          payload: { category: topCategory[0], suggestedName: `Despesas de ${topCategory[0]}` },
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
          title: `Reabrir "${mostUsedView.name}"`,
          message: `Sua visão mais usada é "${mostUsedView.name}" (${mostUsedEntry[1]} vezes). Deseja abri-la?`,
          action: {
            label: 'Abrir visão salva',
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
      title: 'Revisar suas despesas',
      message: `O saldo ficou negativo ${mem.patterns.negativeBalanceCount} vezes recentemente. Que tal fazer uma revisão detalhada?`,
      action: {
        label: 'Revisar despesas',
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
          title: `Salvar filtro de ${mostViewedCat[0]}`,
          message: `Você consultou ${mostViewedCat[0]} ${mostViewedCat[1]} vezes. Salvar esse filtro para acesso rápido?`,
          action: {
            label: 'Salvar visão',
            type: 'save_view',
            payload: { category: mostViewedCat[0], suggestedName: `Despesas de ${mostViewedCat[0]}` },
          },
        });
      }
    }
  }

  return recommendations.slice(0, 3);
}
