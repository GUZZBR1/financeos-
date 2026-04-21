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
      title: 'Negative balance detected',
      message: 'Your balance is negative in the current period.',
      action: {
        label: 'Review expenses',
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
        title: 'Expenses are up significantly',
        message: `Expenses rose ${Math.round(expenseChange)}% compared to the previous period.`,
        action: {
          label: 'See top expenses',
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
        title: 'Revenue is declining',
        message: `Revenue is down ${Math.round(Math.abs(incomeChange))}% compared to the previous period.`,
        action: {
          label: 'Open history',
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
      const cat = t.description.split(' ').slice(0, 2).join(' ');
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
        title: 'Concentrated expense category',
        message: `${topCategory[0]} accounts for ${Math.round(dominance)}% of total expenses.`
      });
    }
  }

  // --- SUGGESTIONS ---

  // 1. Top expense category review
  if (topCategory) {
    suggestions.push({
      id: 'review-top-category',
      type: 'neutral',
      title: 'Review top expense category',
      message: `${topCategory[0]} is your highest expense this period.`,
      action: {
        label: 'Filter category',
        type: 'filter_category'
      }
    });

    // 2. Small savings estimate (rough: 10% of top category)
    const estimatedSavings = topCategory[1] * 0.1;
    if (estimatedSavings > 100) {
      suggestions.push({
        id: 'savings-opportunity',
        type: 'positive',
        title: 'Potential savings opportunity',
        message: `Consider reducing ${topCategory[0]} by 10% to save ~R$ ${estimatedSavings.toLocaleString('BRL')} this period.`,
        action: {
          label: 'Simulate savings',
          type: 'simulate_savings'
        }
      });
    }
  }

  // 3. Stable period signal (healthy finances)
  if (currentSummary.balance > 0 &&
      prevSummary.balance > 0 &&
      Math.abs(((currentSummary.totalIncome - prevSummary.totalIncome) / prevSummary.totalIncome) * 100) <= 10 &&
      Math.abs(((currentSummary.totalExpense - prevSummary.totalExpense) / prevSummary.totalExpense) * 100) <= 10 &&
      !alerts.some(a => a.type === 'warning')) {
    suggestions.push({
      id: 'stable-period',
      type: 'positive',
      title: 'Finances are stable',
      message: 'Your income and expenses are consistent this period.',
      action: {
        label: 'See overview',
        type: 'see_overview'
      }
    });
  }

  return { alerts, suggestions };
}