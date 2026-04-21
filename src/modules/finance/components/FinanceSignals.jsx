import React from 'react';

export default function FinanceSignals({ alerts = [], suggestions = [], onAction }) {
  if (alerts.length === 0 && suggestions.length === 0) {
    return null;
  }

  const handleAction = (signal, action) => {
    if (onAction) {
      onAction(signal, action);
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
      marginBottom: '16px'
    }}>
      {alerts.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#ef4444',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Finance Alerts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.map(alert => (
              <div key={alert.id} style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: alert.type === 'warning' ? '#ef4444' : '#a3a3a3',
                  marginTop: '6px',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '14px', color: '#1a1a1a' }}>
                    {alert.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#525252', marginTop: '2px' }}>
                    {alert.message}
                  </div>
                  {alert.action && (
                    <button
                      onClick={() => handleAction(alert, alert.action)}
                      style={{
                        marginTop: '8px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {alert.action.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.06)',
          border: '1px solid rgba(34, 197, 94, 0.15)',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#22c55e',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Recommended Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {suggestions.map(suggestion => (
              <div key={suggestion.id} style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: suggestion.type === 'positive' ? '#22c55e' : '#a3a3a3',
                  marginTop: '6px',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '14px', color: '#1a1a1a' }}>
                    {suggestion.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#525252', marginTop: '2px' }}>
                    {suggestion.message}
                  </div>
                  {suggestion.action && (
                    <button
                      onClick={() => handleAction(suggestion, suggestion.action)}
                      style={{
                        marginTop: '8px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#16a34a',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {suggestion.action.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
