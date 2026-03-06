/**
 * pages/History.jsx
 * Histórico completo de transações com filtros, ordenação e busca.
 */

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import {
  filterByPeriod,
  formatCurrency,
  PERIOD_FILTERS,
} from '../services/calculations';
import PeriodFilter from '../components/PeriodFilter';
import TransactionRow from '../components/TransactionRow';

export default function History() {
  const { transactions, loading } = useTransactions();

  // Filtros
  const [period, setPeriod] = useState(PERIOD_FILTERS.LAST_30);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc' | 'date-asc' | 'value-desc' | 'value-asc'
  const [search, setSearch] = useState('');

  const handleCustomChange = (field, value) => {
    if (field === 'start') setCustomStart(value);
    else setCustomEnd(value);
  };

  // Pipeline de filtragem e ordenação
  const processed = useMemo(() => {
    let result = filterByPeriod(transactions, period, customStart, customEnd);

    // Filtro por tipo
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Busca por descrição
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.description?.toLowerCase().includes(q));
    }

    // Ordenação
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': return new Date(b.date) - new Date(a.date);
        case 'date-asc': return new Date(a.date) - new Date(b.date);
        case 'value-desc': return b.value - a.value;
        case 'value-asc': return a.value - b.value;
        default: return 0;
      }
    });

    return result;
  }, [transactions, period, customStart, customEnd, typeFilter, sortBy, search]);

  // Totais do resultado filtrado
  const totals = useMemo(() => ({
    income: processed.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0),
    expense: processed.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0),
  }), [processed]);

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', marginBottom: 4 }}>
          Histórico
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Todas as suas transações registradas
        </p>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Period */}
        <PeriodFilter
          value={period}
          onChange={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          onCustomChange={handleCustomChange}
        />

        {/* Segunda linha de filtros */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Busca */}
          <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar descrição..."
              className="input"
              style={{ paddingLeft: 32, fontSize: 13, padding: '8px 10px 8px 32px' }}
            />
          </div>

          {/* Tipo */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { value: 'all', label: 'Todos' },
              { value: 'income', label: '↓ Entradas' },
              { value: 'expense', label: '↑ Saídas' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${typeFilter === value ? 'var(--accent-green)' : 'var(--border)'}`,
                  background: typeFilter === value ? 'var(--accent-green-dim)' : 'var(--bg-elevated)',
                  color: typeFilter === value ? 'var(--accent-green)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                  transition: 'all var(--transition)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Ordenação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <ArrowUpDown size={14} color="var(--text-muted)" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input"
              style={{ width: 'auto', padding: '7px 12px', fontSize: 12, cursor: 'pointer', background: 'var(--bg-elevated)' }}
            >
              <option value="date-desc">Data (mais recente)</option>
              <option value="date-asc">Data (mais antiga)</option>
              <option value="value-desc">Valor (maior)</option>
              <option value="value-asc">Valor (menor)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Totais do filtro */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>
            {processed.length} transações
          </span>
        </div>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Entradas:</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', fontWeight: 500 }}>
            {formatCurrency(totals.income)}
          </span>
        </div>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Saídas:</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent-red)', fontWeight: 500 }}>
            {formatCurrency(totals.expense)}
          </span>
        </div>
      </div>

      {/* Lista */}
      <div className="card animate-fadeUp" style={{ opacity: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando transações...
          </div>
        ) : processed.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>Nenhuma transação encontrada</p>
            <p style={{ fontSize: 13 }}>Tente ajustar os filtros ou adicione novas transações</p>
          </div>
        ) : (
          processed.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))
        )}
      </div>
    </div>
  );
}
