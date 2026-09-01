/**
 * services/calculations.js
 * Funções puras para cálculos financeiros e transformação de dados para gráficos.
 * Todas as funções são puras (sem efeitos colaterais) para facilitar testes.
 */

import { differenceInCalendarDays, format, subDays, startOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Filtros de período disponíveis
 */
export const PERIOD_FILTERS = {
  ALL: 'all',
  TODAY: 'today',
  LAST_5: 'last5',
  LAST_7: 'last7',
  LAST_30: 'last30',
  THIS_MONTH: 'thisMonth',
  CUSTOM: 'custom',
};

export const PERIOD_LABELS = {
  [PERIOD_FILTERS.ALL]: 'Tudo',
  [PERIOD_FILTERS.TODAY]: 'Hoje',
  [PERIOD_FILTERS.LAST_5]: 'Últimos 5 dias',
  [PERIOD_FILTERS.LAST_7]: 'Últimos 7 dias',
  [PERIOD_FILTERS.LAST_30]: 'Últimos 30 dias',
  [PERIOD_FILTERS.THIS_MONTH]: 'Este mês',
  [PERIOD_FILTERS.CUSTOM]: 'Período personalizado',
};

/**
 * Retorna o intervalo de datas para um filtro de período
 */
export const getDateRange = (filter, customStart = null, customEnd = null) => {
  const today = new Date();
  switch (filter) {
    case PERIOD_FILTERS.TODAY:
      return { start: startOfDay(today), end: endOfDay(today) };
    case PERIOD_FILTERS.LAST_5:
      return { start: startOfDay(subDays(today, 4)), end: endOfDay(today) };
    case PERIOD_FILTERS.LAST_7:
      return { start: startOfDay(subDays(today, 6)), end: endOfDay(today) };
    case PERIOD_FILTERS.LAST_30:
      return { start: startOfDay(subDays(today, 29)), end: endOfDay(today) };
    case PERIOD_FILTERS.THIS_MONTH:
      return { start: startOfDay(startOfMonth(today)), end: endOfDay(today) };
    case PERIOD_FILTERS.CUSTOM:
      return {
        start: customStart ? startOfDay(new Date(customStart)) : startOfDay(subDays(today, 29)),
        end: customEnd ? endOfDay(new Date(customEnd)) : endOfDay(today),
      };
    default:
      return { start: startOfDay(subDays(today, 29)), end: endOfDay(today) };
  }
};

/**
 * Filtra transações por período
 */
export const filterByPeriod = (transactions, filter, customStart = null, customEnd = null) => {
  if (filter === PERIOD_FILTERS.ALL) return transactions;
  const { start, end } = getDateRange(filter, customStart, customEnd);
  return transactions.filter((t) => {
    const date = parseISO(t.date);
    return isWithinInterval(date, { start, end });
  });
};

/**
 * Calcula totais financeiros
 */
export const calculateSummary = (transactions) => {
  const totalIncomeCents = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, transaction) => sum + Math.abs(signedTransactionCents(transaction)), 0);

  const totalExpenseCents = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, transaction) => sum + Math.abs(signedTransactionCents(transaction)), 0);

  return {
    totalIncome: totalIncomeCents / 100,
    totalExpense: totalExpenseCents / 100,
    balance: (totalIncomeCents - totalExpenseCents) / 100,
  };
};

const signedTransactionCents = (transaction) => {
  const storedCents = Number(transaction.amountCents);
  if (Number.isFinite(storedCents)) return storedCents;
  const absoluteCents = Math.round(Math.abs(Number(transaction.value) || 0) * 100);
  return transaction.type === 'income' ? absoluteCents : -absoluteCents;
};

export const calculateCurrentBalance = (transactions, accounts = []) => {
  const bankAccounts = accounts.filter((account) => account.subtype === 'bank');
  if (!bankAccounts.length) {
    return transactions.reduce((sum, transaction) => sum + signedTransactionCents(transaction) / 100, 0);
  }

  return bankAccounts.reduce((total, account) => {
    const accountTransactions = transactions.filter((transaction) => transaction.accountId === account.id);
    const snapshotCents = account.statement_balance_cents;
    if (snapshotCents != null && account.statement_balance_as_of) {
      const movementsAfterSnapshot = accountTransactions
        .filter((transaction) => transaction.date > account.statement_balance_as_of)
        .reduce((sum, transaction) => sum + signedTransactionCents(transaction), 0);
      return total + (snapshotCents + movementsAfterSnapshot) / 100;
    }
    return total + accountTransactions.reduce((sum, transaction) => sum + signedTransactionCents(transaction), 0) / 100;
  }, 0);
};

const getChartDateRange = (transactions, filter, customStart, customEnd) => {
  if (filter !== PERIOD_FILTERS.ALL) {
    return getDateRange(filter, customStart, customEnd);
  }

  const dates = transactions
    .map((transaction) => parseISO(transaction.date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);

  if (!dates.length) return { start: null, end: null };
  return {
    start: startOfDay(dates[0]),
    end: endOfDay(dates[dates.length - 1]),
  };
};

/**
 * Gera dados para o gráfico de barras (Entradas vs Saídas por dia)
 */
export const getBarChartData = (transactions, filter, customStart, customEnd) => {
  const { start, end } = getChartDateRange(transactions, filter, customStart, customEnd);
  if (!start || !end) return [];
  const days = differenceInCalendarDays(end, start) + 1;

  const map = {};
  for (let i = 0; i < days; i++) {
    const d = subDays(end, days - 1 - i);
    const key = format(d, 'yyyy-MM-dd');
    map[key] = { date: format(d, 'dd/MM', { locale: ptBR }), income: 0, expense: 0 };
  }

  transactions.forEach((t) => {
    if (map[t.date]) {
      if (t.type === 'income') map[t.date].income += t.value;
      else map[t.date].expense += t.value;
    }
  });

  return Object.values(map);
};

/**
 * Gera dados para o gráfico de linha (Evolução do saldo)
 */
export const getLineChartData = (transactions, filter, customStart, customEnd) => {
  const { start, end } = getChartDateRange(transactions, filter, customStart, customEnd);
  if (!start || !end) return [];
  const days = differenceInCalendarDays(end, start) + 1;

  const dailyMap = {};
  for (let i = 0; i < days; i++) {
    const d = subDays(end, days - 1 - i);
    const key = format(d, 'yyyy-MM-dd');
    dailyMap[key] = { date: format(d, 'dd/MM', { locale: ptBR }), netCents: 0 };
  }

  transactions.forEach((t) => {
    if (dailyMap[t.date]) {
      dailyMap[t.date].netCents += signedTransactionCents(t);
    }
  });

  // Acumula saldo progressivo
  let runningCents = 0;
  return Object.values(dailyMap).map((d) => {
    runningCents += d.netCents;
    return { date: d.date, saldo: runningCents / 100 };
  });
};

/**
 * Gera dados para o gráfico de pizza (Distribuição de gastos)
 */
export const getPieChartData = (transactions) => {
  const expenses = transactions.filter((t) => t.type === 'expense');
  
  // Agrupa por descrição (primeiras 2 palavras como categoria)
  const grouped = {};
  expenses.forEach((t) => {
    const category = t.category || 'Não classificado';
    if (!grouped[category]) grouped[category] = 0;
    grouped[category] += t.value;
  });

  // Top 6 categorias + Outros
  const sorted = Object.entries(grouped)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return sorted.map(([name, value]) => ({ name, value }));
};

/**
 * Formata valor monetário em BRL
 */
export const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/**
 * Formata data para exibição
 */
export const formatDisplayDate = (dateStr) => {
  try {
    return format(parseISO(dateStr), "dd 'de' MMM, yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
};
