/**
 * pages/Finance/FinanceHistory.jsx
 * Histórico completo de movimentos com filtros, ordenação e busca.
 * Filtros sincronizados com URL (query params), com fallback para location.state.
 */

import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowUpDown, X, LayoutList, TrendingDown, TrendingUp, Star, Bookmark, Trash2 } from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import {
  filterByPeriod,
  formatCurrency,
  PERIOD_FILTERS,
} from '../../services/calculations';
import { mergeFilterState, buildQueryString } from '../../modules/finance/services/financeHistoryUrlState';
import { getSavedViews, saveView, deleteView } from '../../modules/finance/services/financeSavedViews';
import { trackEvent } from '../../modules/finance/services/financeMemory';
import PeriodFilter from '../../components/PeriodFilter';
import TransactionRow from '../../components/TransactionRow';

export default function FinanceHistory() {
  const { transactions, loading } = useTransactions();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Parse URL and location.state
  const locationState = location.state || {};
  const filters = useMemo(
    () => mergeFilterState(searchParams, locationState),
    [searchParams, locationState]
  );

  // Filters state
  const [period, setPeriod] = useState(PERIOD_FILTERS.LAST_30);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState(filters.type);
  const [categoryFilter, setCategoryFilter] = useState(filters.category);
  const [sortBy, setSortBy] = useState('date-desc');
  const [search, setSearch] = useState('');
  const [savedViews, setSavedViews] = useState(() => getSavedViews());
  const [saveInput, setSaveInput] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Sync type and category filters when URL changes
  useEffect(() => {
    setTypeFilter(filters.type);
    setCategoryFilter(filters.category);
  }, [filters.type, filters.category]);

  // Track category views for memory
  useEffect(() => {
    if (categoryFilter) {
      trackEvent('categoryView', { category: categoryFilter });
    }
  }, [categoryFilter]);

  // Sync URL when filters change
  useEffect(() => {
    const newState = {
      type: typeFilter,
      category: categoryFilter,
    };
    const qs = buildQueryString(newState);
    const base = location.pathname;
    navigate(`${base}${qs}`, { replace: true, preventScrollReset: true });
  }, [typeFilter, categoryFilter]);

  // Clear location state after reading (prevents stale filters on back navigation)
  useEffect(() => {
    if (Object.keys(locationState).length > 0) {
      navigate(location.pathname, { replace: true, preventScrollReset: true });
    }
  }, []);

  const handleCustomChange = (field, value) => {
    if (field === 'start') setCustomStart(value);
    else setCustomEnd(value);
  };

  // Extract top expense category for quick view
  const topCategory = useMemo(() => {
    const categoryTotals = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.description.split(' ').slice(0, 2).join(' ');
        categoryTotals[cat] = (categoryTotals[cat] || 0) + t.value;
      });
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    return sorted[0] || null;
  }, [transactions]);

  // Extract unique categories from transactions
  const categories = useMemo(() => {
    const cats = new Set();
    transactions.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.description.split(' ').slice(0, 2).join(' ');
        cats.add(cat);
      }
    });
    return Array.from(cats).sort();
  }, [transactions]);

  // Reset all filters and URL
  const resetFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('');
    setSearch('');
  };

  const hasActiveFilters = typeFilter !== 'all' || categoryFilter !== '' || search.trim();

  // Quick view handlers
  const applyQuickView = (view) => {
    switch (view) {
      case 'all':
        setTypeFilter('all');
        setCategoryFilter('');
        break;
      case 'income':
        setTypeFilter('income');
        setCategoryFilter('');
        break;
      case 'expense':
        setTypeFilter('expense');
        setCategoryFilter('');
        break;
      case 'top-category':
        if (topCategory) {
          setTypeFilter('expense');
          setCategoryFilter(topCategory[0]);
        }
        break;
      default:
        break;
    }
  };

  // Saved views handlers
  const applySavedView = (view) => {
    setTypeFilter(view.filters.type);
    setCategoryFilter(view.filters.category || '');
    trackEvent('savedViewClick', { viewId: view.id });
  };

  const handleSaveView = () => {
    if (!saveInput.trim()) return;
    const ok = saveView({ name: saveInput, filters: { type: typeFilter, category: categoryFilter } });
    if (ok) {
      setSavedViews(getSavedViews());
      setSaveInput('');
      setShowSaveInput(false);
    }
  };

  const handleDeleteView = (id) => {
    deleteView(id);
    setSavedViews(getSavedViews());
  };

  // Build context indicator message
  const contextMessage = useMemo(() => {
    const parts = [];
    if (typeFilter === 'income') parts.push('Income');
    if (typeFilter === 'expense') parts.push('Expenses');
    if (categoryFilter) parts.push(categoryFilter);
    if (parts.length > 0) {
      return `Viewing: ${parts.join(' ')} transactions`;
    }
    return null;
  }, [typeFilter, categoryFilter]);

  // Pipeline de filtragem e ordenação
  const processed = useMemo(() => {
    let result = filterByPeriod(transactions, period, customStart, customEnd);

    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (categoryFilter.trim()) {
      result = result.filter((t) => {
        const cat = t.description.split(' ').slice(0, 2).join(' ');
        return cat === categoryFilter;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.description?.toLowerCase().includes(q));
    }

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
  }, [transactions, period, customStart, customEnd, typeFilter, categoryFilter, sortBy, search]);

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
          Financial History
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Todos os seus movimentos registrados
        </p>
      </div>

      {/* Quick Views */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Quick Views:</span>
        {[
          { id: 'all', label: 'All', icon: <LayoutList size={12} /> },
          { id: 'income', label: 'Income', icon: <TrendingUp size={12} /> },
          { id: 'expense', label: 'Expenses', icon: <TrendingDown size={12} /> },
          ...(topCategory ? [{ id: 'top-category', label: topCategory[0], icon: <Star size={12} /> }] : []),
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => applyQuickView(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'all var(--transition)',
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Saved Views */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Saved Views:</span>

        {savedViews.map((view) => (
          <div
            key={view.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 8px 5px 10px',
              borderRadius: '20px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              background: 'rgba(99, 102, 241, 0.05)',
              color: 'var(--primary, #3b82f6)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'all var(--transition)',
            }}
            onClick={() => applySavedView(view)}
          >
            <Bookmark size={10} />
            {view.name}
            <span
              onClick={(e) => { e.stopPropagation(); handleDeleteView(view.id); }}
              style={{ marginLeft: 2, cursor: 'pointer', opacity: 0.7, lineHeight: 1 }}
            >
              <Trash2 size={10} />
            </span>
          </div>
        ))}

        {showSaveInput ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="text"
              value={saveInput}
              onChange={(e) => setSaveInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
              placeholder="View name..."
              autoFocus
              style={{
                padding: '5px 8px',
                fontSize: 11,
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                width: 120,
              }}
            />
            <button
              onClick={handleSaveView}
              style={{ padding: '5px 8px', fontSize: 11, borderRadius: '6px', background: 'var(--primary, #3b82f6)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Save
            </button>
            <button
              onClick={() => { setShowSaveInput(false); setSaveInput(''); }}
              style={{ padding: '5px 8px', fontSize: 11, borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveInput(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: '20px',
              border: '1px dashed var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'all var(--transition)',
            }}
          >
            + Save current view
          </button>
        )}
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

          {/* Categoria */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input"
            style={{ width: 'auto', padding: '7px 12px', fontSize: 12, cursor: 'pointer', background: 'var(--bg-elevated)' }}
          >
            <option value="">Todas categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Reset */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                transition: 'all var(--transition)',
              }}
            >
              <X size={12} />
              Limpar
            </button>
          )}

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

      {/* Context indicator */}
      {contextMessage && (
        <div style={{
          marginBottom: 12,
          padding: '8px 14px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          borderRadius: '8px',
          fontSize: 13,
          color: 'var(--primary, #3b82f6)',
          fontWeight: 500,
        }}>
          {contextMessage}
        </div>
      )}

      {/* Totais do filtro */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>
            {processed.length} movimentos
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
            Carregando movimentos...
          </div>
        ) : processed.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>Nenhum movimento encontrado</p>
            <p style={{ fontSize: 13 }}>Tente ajustar os filtros ou adicione novos movimentos</p>
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
