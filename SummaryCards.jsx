/**
 * components/SummaryCards.jsx
 * Cards de resumo financeiro: saldo, entradas e saídas.
 */

import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '../services/calculations';

export default function SummaryCards({ summary, loading }) {
  const cards = [
    {
      label: 'Saldo Atual',
      value: summary.balance,
      icon: Wallet,
      color: summary.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
      dim: summary.balance >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
      glow: summary.balance >= 0 ? 'var(--shadow-glow-green)' : 'var(--shadow-glow-red)',
      delay: '0ms',
    },
    {
      label: 'Total de Entradas',
      value: summary.totalIncome,
      icon: TrendingUp,
      color: 'var(--accent-green)',
      dim: 'var(--accent-green-dim)',
      glow: 'var(--shadow-glow-green)',
      delay: '60ms',
    },
    {
      label: 'Total de Gastos',
      value: summary.totalExpense,
      icon: TrendingDown,
      color: 'var(--accent-red)',
      dim: 'var(--accent-red-dim)',
      glow: 'var(--shadow-glow-red)',
      delay: '120ms',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 16,
      marginBottom: 24,
    }}>
      {cards.map(({ label, value, icon: Icon, color, dim, glow, delay }) => (
        <div
          key={label}
          className="card animate-fadeUp"
          style={{
            animationDelay: delay,
            opacity: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Glow effect top bar */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {label}
            </span>
            <div style={{
              width: 36, height: 36,
              borderRadius: 'var(--radius-sm)',
              background: dim,
              border: `1px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color={color} />
            </div>
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            fontSize: loading ? 14 : 26,
            color: loading ? 'var(--text-muted)' : color,
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}>
            {loading ? (
              <div style={{ height: 26, width: 140, background: 'var(--bg-elevated)', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} />
            ) : (
              formatCurrency(value)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
