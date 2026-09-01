/**
 * modules/finance/services/financeInsights.js
 * Rule-based financial insights comparing current period vs previous equivalent period.
 */

import { getDateRange, filterByPeriod } from '../../../services/calculations';

/**
 * Returns the previous period range of equivalent duration.
 */
export const getPreviousPeriodRange = (period, customStart, customEnd) => {
  const { start, end } = getDateRange(period, customStart, customEnd);
  const duration = end - start;
  return {
    start: new Date(start.getTime() - duration - 86400000),
    end: new Date(start.getTime() - 86400000),
  };
};

/**
 * Generates insights based on transactions and period.
 * @returns {{ balanceInsight, incomeInsight, expenseInsight }}
 */
export const generateInsights = (transactions, currentPeriod, customStart, customEnd) => {
  getDateRange(currentPeriod, customStart, customEnd);
  const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(currentPeriod, customStart, customEnd);

  const currentTx = filterByPeriod(transactions, currentPeriod, customStart, customEnd);
  const previousTx = transactions.filter((t) => {
    const date = new Date(t.date);
    return date >= prevStart && date <= prevEnd;
  });

  const currIncome = currentTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.value, 0);
  const prevIncome = previousTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.value, 0);
  const currExpense = currentTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.value, 0);
  const prevExpense = previousTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.value, 0);
  const balance = currIncome - currExpense;

  // Balance insight
  let balanceInsight;
  if (balance > 10000) {
    balanceInsight = { text: 'Saldo saudável', status: 'positive', trend: null };
  } else if (balance > 0) {
    balanceInsight = { text: 'Saldo positivo', status: 'neutral', trend: null };
  } else if (balance < 0) {
    balanceInsight = { text: 'Saldo negativo', status: 'warning', trend: null };
  } else {
    balanceInsight = { text: 'Saldo zerado', status: 'neutral', trend: null };
  }

  // Income insight
  let incomeInsight;
  if (prevIncome === 0 && currIncome > 0) {
    incomeInsight = { text: 'Receitas aumentaram', status: 'positive', trend: null };
  } else if (prevIncome === 0) {
    incomeInsight = { text: 'Receitas estáveis', status: 'neutral', trend: null };
  } else {
    const pct = ((currIncome - prevIncome) / prevIncome) * 100;
    if (Math.abs(pct) < 5) {
      incomeInsight = { text: 'Receitas estáveis', status: 'neutral', trend: null };
    } else if (pct > 0) {
      incomeInsight = { text: `Receitas subiram ${Math.round(pct)}%`, status: 'positive', trend: pct };
    } else {
      incomeInsight = { text: `Receitas caíram ${Math.round(Math.abs(pct))}%`, status: 'warning', trend: -pct };
    }
  }

  // Expense insight
  let expenseInsight;
  if (prevExpense === 0 && currExpense > 0) {
    expenseInsight = { text: 'Há despesas no período', status: 'neutral', trend: null };
  } else if (prevExpense === 0) {
    expenseInsight = { text: 'Despesas estáveis', status: 'neutral', trend: null };
  } else {
    const pct = ((currExpense - prevExpense) / prevExpense) * 100;
    if (Math.abs(pct) < 5) {
      expenseInsight = { text: 'Despesas estáveis', status: 'neutral', trend: null };
    } else if (pct > 0) {
      expenseInsight = { text: `Despesas subiram ${Math.round(pct)}%`, status: 'warning', trend: pct };
    } else {
      expenseInsight = { text: `Despesas caíram ${Math.round(Math.abs(pct))}%`, status: 'positive', trend: -pct };
    }
  }

  return { balanceInsight, incomeInsight, expenseInsight };
};
