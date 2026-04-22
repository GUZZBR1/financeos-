/**
 * pages/Finance/FinanceDashboard.jsx
 * Página principal do departamento de finanças com métricas, filtros de período e gráficos interativos.
 */

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../../context/TransactionContext';
import {
  filterByPeriod,
  calculateSummary,
  getBarChartData,
  getLineChartData,
  getPieChartData,
  PERIOD_FILTERS,
} from '../../services/calculations';
import { generateInsights } from '../../modules/finance/services/financeInsights';
import FinanceSignals from '../../modules/finance/components/FinanceSignals';
import ActionResultPanel from '../../modules/finance/components/ActionResultPanel';
import { generateAlertsAndSuggestions } from '../../modules/finance/services/financeAlerts';
import { executeAction } from '../../modules/finance/services/financeActions';
import { trackEvent, generateRecurringInsights } from '../../modules/finance/services/financeMemory';
import { getSavedViews } from '../../modules/finance/services/financeSavedViews';

import SummaryCards from '../../components/SummaryCards';
import PeriodFilter from '../../components/PeriodFilter';
import { BarChartCard, LineChartCard, PieChartCard } from '../../components/Charts';
import TransactionRow from '../../components/TransactionRow';
import TransactionModal from '../../components/TransactionModal';

export default function FinanceDashboard() {
  const { transactions, loading } = useTransactions();
  const navigate = useNavigate();
  const [period, setPeriod] = useState(PERIOD_FILTERS.LAST_30);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  // Calculate top category for action handlers
  const topCategory = useMemo(() => {
    const filtered = filterByPeriod(transactions, period, customStart, customEnd);
    const categoryTotals = {};
    filtered
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.description.split(' ').slice(0, 2).join(' ');
        categoryTotals[cat] = (categoryTotals[cat] || 0) + t.value;
      });
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    return sorted[0] || null;
  }, [transactions, period, customStart, customEnd]);

  const handleSignalAction = (signal, action) => {
    const result = executeAction(action.type, {
      topCategory,
      categoryName: topCategory?.[0]
    });

    // Handle navigation actions directly
    if (result.type === 'navigation') {
      navigate(result.navigateTo || '/finance/history');
      return;
    }

    setActionResult(result);
  };

  // Filtra transações pelo período selecionado — recalcula automaticamente ao mudar transactions
  const filtered = useMemo(
    () => filterByPeriod(transactions, period, customStart, customEnd),
    [transactions, period, customStart, customEnd]
  );

  const summary = useMemo(() => calculateSummary(filtered), [filtered]);
  const barData = useMemo(() => getBarChartData(filtered, period, customStart, customEnd), [filtered, period, customStart, customEnd]);
  const lineData = useMemo(() => getLineChartData(filtered, period, customStart, customEnd), [filtered, period, customStart, customEnd]);
  const pieData = useMemo(() => getPieChartData(filtered), [filtered]);

  const recentMovements = useMemo(() => filtered.slice(0, 5), [filtered]);

  const insights = useMemo(
    () => generateInsights(transactions, period, customStart, customEnd),
    [transactions, period, customStart, customEnd]
  );

  const { alerts, suggestions } = useMemo(
    () => generateAlertsAndSuggestions(transactions, period, customStart, customEnd),
    [transactions, period, customStart, customEnd]
  );

  // Generate recurring insights from memory
  const recurringInsights = useMemo(() => {
    return generateRecurringInsights(getSavedViews());
  }, []);

  // Track pattern events from alerts
  useMemo(() => {
    const hasNegativeBalance = alerts.some(a => a.id === 'negative-balance');
    const hasExpenseSpike = alerts.some(a => a.id === 'expenses-spike');
    if (hasNegativeBalance) trackEvent('negativeBalance');
    if (hasExpenseSpike && topCategory) {
      trackEvent('expenseSpike', { category: topCategory[0] });
    }
  }, [alerts, topCategory]);

  const handleCustomChange = (field, value) => {
    if (field === 'start') setCustomStart(value);
    else setCustomEnd(value);
  };

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 28,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', marginBottom: 4 }}>
            Finance Department
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            This department manages your business finances
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Nova Transação
        </button>
      </div>

      {/* Period Filter */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <PeriodFilter
          value={period}
          onChange={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          onCustomChange={handleCustomChange}
        />
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} loading={loading} insights={insights} />

      {/* Charts — 2 column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 16,
        marginBottom: 16,
      }}>
        <BarChartCard data={barData} />
        <LineChartCard data={lineData} />
      </div>

      {/* Finance Signals */}
      <FinanceSignals
        alerts={alerts}
        suggestions={suggestions}
        onAction={handleSignalAction}
      />

      {/* Recurring Insights */}
      {recurringInsights.length > 0 && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: 16,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(99, 102, 241, 0.7)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 10,
          }}>
            Behavior Insights
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recurringInsights.map((insight, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: insight.type === 'warning' ? '#f59e0b' : insight.type === 'pattern' ? '#8b5cf6' : '#3b82f6',
                  flexShrink: 0,
                }} />
                {insight.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Result Panel */}
      <ActionResultPanel
        result={actionResult}
        onClose={() => setActionResult(null)}
      />

      {/* Pie + Recent Movements */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
      }}>
        <PieChartCard data={pieData} />

        {/* Recent Movements */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Movimentos Recentes
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {filtered.length} registros
            </span>
          </div>

          {recentMovements.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nenhum movimento no período
            </div>
          ) : (
            recentMovements.map((t) => (
              <TransactionRow key={t.id} transaction={t} compact />
            ))
          )}
        </div>
      </div>

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}