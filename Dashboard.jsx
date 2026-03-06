/**
 * pages/Dashboard.jsx
 * Página principal com métricas, filtros de período e gráficos interativos.
 * Todos os gráficos e cards atualizam automaticamente via Context.
 */

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import {
  filterByPeriod,
  calculateSummary,
  getBarChartData,
  getLineChartData,
  getPieChartData,
  PERIOD_FILTERS,
} from '../services/calculations';

import SummaryCards from '../components/SummaryCards';
import PeriodFilter from '../components/PeriodFilter';
import { BarChartCard, LineChartCard, PieChartCard } from '../components/Charts';
import TransactionRow from '../components/TransactionRow';
import TransactionModal from '../components/TransactionModal';

export default function Dashboard() {
  const { transactions, loading } = useTransactions();
  const [period, setPeriod] = useState(PERIOD_FILTERS.LAST_30);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Filtra transações pelo período selecionado — recalcula automaticamente ao mudar transactions
  const filtered = useMemo(
    () => filterByPeriod(transactions, period, customStart, customEnd),
    [transactions, period, customStart, customEnd]
  );

  const summary = useMemo(() => calculateSummary(filtered), [filtered]);
  const barData = useMemo(() => getBarChartData(filtered, period, customStart, customEnd), [filtered, period, customStart, customEnd]);
  const lineData = useMemo(() => getLineChartData(filtered, period, customStart, customEnd), [filtered, period, customStart, customEnd]);
  const pieData = useMemo(() => getPieChartData(filtered), [filtered]);

  const recentTransactions = useMemo(() => filtered.slice(0, 5), [filtered]);

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
            Dashboard
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Visão geral das suas finanças
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
      <SummaryCards summary={summary} loading={loading} />

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

      {/* Pie + Recent transactions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
      }}>
        <PieChartCard data={pieData} />

        {/* Recent Transactions */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Transações Recentes
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {filtered.length} registros
            </span>
          </div>

          {recentTransactions.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nenhuma transação no período
            </div>
          ) : (
            recentTransactions.map((t) => (
              <TransactionRow key={t.id} transaction={t} compact />
            ))
          )}
        </div>
      </div>

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
