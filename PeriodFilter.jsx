/**
 * components/PeriodFilter.jsx
 * Seletor de período para filtrar dados do dashboard e histórico.
 */

import { useState } from 'react';
import { PERIOD_FILTERS, PERIOD_LABELS } from '../services/calculations';
import { CalendarDays } from 'lucide-react';

export default function PeriodFilter({ value, onChange, customStart, customEnd, onCustomChange }) {
  const filters = Object.values(PERIOD_FILTERS);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {/* Period pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {filters.filter(f => f !== PERIOD_FILTERS.CUSTOM).map((filter) => (
          <button
            key={filter}
            onClick={() => onChange(filter)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${value === filter ? 'var(--accent-green)' : 'var(--border)'}`,
              background: value === filter ? 'var(--accent-green-dim)' : 'transparent',
              color: value === filter ? 'var(--accent-green)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'all var(--transition)',
              whiteSpace: 'nowrap',
            }}
          >
            {PERIOD_LABELS[filter]}
          </button>
        ))}

        {/* Custom period */}
        <button
          onClick={() => onChange(PERIOD_FILTERS.CUSTOM)}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: `1px solid ${value === PERIOD_FILTERS.CUSTOM ? 'var(--accent-green)' : 'var(--border)'}`,
            background: value === PERIOD_FILTERS.CUSTOM ? 'var(--accent-green-dim)' : 'transparent',
            color: value === PERIOD_FILTERS.CUSTOM ? 'var(--accent-green)' : 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all var(--transition)',
          }}
        >
          <CalendarDays size={13} />
          Personalizado
        </button>
      </div>

      {/* Custom date inputs */}
      {value === PERIOD_FILTERS.CUSTOM && (
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          animation: 'fadeIn 0.2s ease',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>De</span>
          <input
            type="date"
            value={customStart || ''}
            onChange={(e) => onCustomChange('start', e.target.value)}
            className="input"
            style={{ width: 150, padding: '6px 10px', fontSize: 12, colorScheme: 'dark', fontFamily: 'var(--font-mono)' }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>até</span>
          <input
            type="date"
            value={customEnd || ''}
            onChange={(e) => onCustomChange('end', e.target.value)}
            className="input"
            style={{ width: 150, padding: '6px 10px', fontSize: 12, colorScheme: 'dark', fontFamily: 'var(--font-mono)' }}
          />
        </div>
      )}
    </div>
  );
}
