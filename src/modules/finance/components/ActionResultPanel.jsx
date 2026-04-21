import React from 'react';

/**
 * Lightweight panel that displays action results on the Finance Dashboard.
 */
export default function ActionResultPanel({ result, onClose }) {
  if (!result) return null;

  const getIcon = () => {
    switch (result.type) {
      case 'simulation':
        return '📊';
      case 'navigation':
        return '📜';
      case 'filter':
        return '🔍';
      case 'recommendation':
        return '💡';
      default:
        return '✨';
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.05))',
      border: '1px solid rgba(99, 102, 241, 0.15)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <span style={{ fontSize: '20px' }}>{getIcon()}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--primary, #3b82f6)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px'
          }}>
            {result.title}
          </div>
          <div style={{
            fontSize: '14px',
            color: 'var(--text-primary, #1a1a1a)',
            lineHeight: '1.5'
          }}>
            {result.message}
          </div>
          {result.data && (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '8px'
            }}>
              {result.data.monthlySavings !== undefined && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    Monthly Savings
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>
                    R$ {result.data.monthlySavings.toLocaleString('BRL')}
                  </div>
                </div>
              )}
              {result.data.yearlySavings !== undefined && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    Yearly Savings
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>
                    R$ {result.data.yearlySavings.toLocaleString('BRL')}
                  </div>
                </div>
              )}
              {result.data.category && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    Category
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>
                    {result.data.category}
                  </div>
                </div>
              )}
              {result.data.percentage && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    Reduction
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>
                    {result.data.percentage}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              fontSize: '16px'
            }}
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
