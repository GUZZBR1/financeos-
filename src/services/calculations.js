/**
 * services/calculations.js
 * Funções puras para cálculos financeiros e transformação de dados para gráficos.
 * Todas as funções são puras (sem efeitos colaterais) para facilitar testes.
 */

import { format, subDays, startOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Filtros de período disponíveis
 */
export const PERIOD_FILTERS = {
  TODAY: 'today',
  LAST_5: 'last5',
  LAST_7: 'last7',
  LAST_30: 'last30',
  THIS_MONTH: 'thisMonth',
  CUSTOM: 'custom',
};

export const PERIOD_LABELS = {
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
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.value, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.value, 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
};

/**
 * Gera dados para o gráfico de barras (Entradas vs Saídas por dia)
 */
export const getBarChartData = (transactions, filter, customStart, customEnd) => {
  const { start, end } = getDateRange(filter, customStart, customEnd);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

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
  const { start, end } = getDateRange(filter, customStart, customEnd);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const dailyMap = {};
  for (let i = 0; i < days; i++) {
    const d = subDays(end, days - 1 - i);
    const key = format(d, 'yyyy-MM-dd');
    dailyMap[key] = { date: format(d, 'dd/MM', { locale: ptBR }), net: 0 };
  }

  transactions.forEach((t) => {
    if (dailyMap[t.date]) {
      dailyMap[t.date].net += t.type === 'income' ? t.value : -t.value;
    }
  });

  // Acumula saldo progressivo
  let running = 0;
  return Object.values(dailyMap).map((d) => {
    running += d.net;
    return { date: d.date, saldo: running };
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
    const category = t.description
      ? t.description.split(' ').slice(0, 2).join(' ')
      : 'Outros';
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
