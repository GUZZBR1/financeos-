import { filterByPeriod, calculateSummary } from '../../../services/calculations';
import { getPreviousPeriodRange } from './financeInsights';

export function generateAlertsAndSuggestions(transactions, period, customStart, customEnd) {
  const currentFiltered = filterByPeriod(transactions, period, customStart, customEnd);
  const prevRange = getPreviousPeriodRange(period, customStart, customEnd);
  const prevFiltered = filterByPeriod(transactions, 'custom', prevRange.start, prevRange.end);

  const currentSummary = calculateSummary(currentFiltered);
  const prevSummary = calculateSummary(prevFiltered);

  const alerts = [];
  const suggestions = [];

  // --- ALERTS ---

  // 1. Negative balance
  if (currentSummary.balance < 0) {
    alerts.push({
      id: 'negative-balance',
      type: 'warning',
      title: 'Saldo negativo detectado',
      message: 'O saldo está negativo no período atual.',
      action: {
        label: 'Revisar despesas',
        type: 'review_negative'
      }
    });
  }

  // 2. Expenses up more than 20% vs previous period
  if (prevSummary.totalExpense > 0) {
    const expenseChange = ((currentSummary.totalExpense - prevSummary.totalExpense) / prevSummary.totalExpense) * 100;
    if (expenseChange > 20) {
      alerts.push({
        id: 'expenses-spike',
        type: 'warning',
        title: 'Despesas aumentaram significativamente',
        message: `As despesas subiram ${Math.round(expenseChange)}% em relação ao período anterior.`,
        action: {
          label: 'Ver maiores despesas',
          type: 'see_top_expenses'
        }
      });
    }
  }

  // 3. Revenue down more than 10% vs previous period
  if (prevSummary.totalIncome > 0) {
    const incomeChange = ((currentSummary.totalIncome - prevSummary.totalIncome) / prevSummary.totalIncome) * 100;
    if (incomeChange < -10) {
      alerts.push({
        id: 'revenue-decline',
        type: 'warning',
        title: 'Receitas em queda',
        message: `As receitas caíram ${Math.round(Math.abs(incomeChange))}% em relação ao período anterior.`,
        action: {
          label: 'Abrir histórico',
          type: 'open_history'
        }
      });
    }
  }

  // 4. Unusually dominant expense category
  const categoryTotals = {};
  currentFiltered
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const cat = t.category || 'Não classificado';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + t.value;
    });

  const totalExpenses = currentSummary.totalExpense;
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  if (topCategory && totalExpenses > 0) {
    const dominance = (topCategory[1] / totalExpenses) * 100;
    if (dominance > 50) {
      alerts.push({
        id: 'dominant-category',
        type: dominance > 70 ? 'warning' : 'neutral',
        title: 'Despesas concentradas em uma categoria',
        message: `${topCategory[0]} representa ${Math.round(dominance)}% das despesas.`
      });
    }
  }

  // --- SUGGESTIONS ---

  // 1. Top expense category review
  if (topCategory) {
    suggestions.push({
      id: 'review-top-category',
      type: 'neutral',
      title: 'Revisar principal categoria de despesa',
      message: `${topCategory[0]} é a maior despesa deste período.`,
      action: {
        label: 'Filtrar categoria',
        type: 'filter_category'
      }
    });

    // 2. Small savings estimate (rough: 10% of top category)
    const estimatedSavings = topCategory[1] * 0.1;
    if (estimatedSavings > 100) {
      suggestions.push({
        id: 'savings-opportunity',
        type: 'positive',
        title: 'Oportunidade de economia',
        message: `Reduzir ${topCategory[0]} em 10% economizaria aproximadamente ${estimatedSavings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} neste período.`,
        action: {
          label: 'Simular economia',
          type: 'simulate_savings'
        }
      });
    }
  }

  // 3. Stable period signal (healthy finances)
  if (currentSummary.balance > 0 &&
      prevSummary.balance > 0 &&
      prevSummary.totalIncome > 0 &&
      prevSummary.totalExpense > 0 &&
      Math.abs(((currentSummary.totalIncome - prevSummary.totalIncome) / prevSummary.totalIncome) * 100) <= 10 &&
      Math.abs(((currentSummary.totalExpense - prevSummary.totalExpense) / prevSummary.totalExpense) * 100) <= 10 &&
      !alerts.some(a => a.type === 'warning')) {
    suggestions.push({
      id: 'stable-period',
      type: 'positive',
      title: 'Finanças estáveis',
      message: 'Receitas e despesas estão consistentes neste período.',
      action: {
        label: 'Ver resumo',
        type: 'see_overview'
      }
    });
  }

  return { alerts, suggestions };
}
