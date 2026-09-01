import { AlertTriangle, ArrowRight, Lightbulb } from 'lucide-react';

export default function FinanceSignals({ alerts = [], suggestions = [], onAction }) {
  if (alerts.length === 0 && suggestions.length === 0) return null;

  const renderGroup = (items, tone, title, Icon) => (
    <section className={`finance-signal-card finance-signal-card--${tone}`}>
      <header className="finance-signal-heading"><span className="finance-signal-icon"><Icon size={16} /></span><h3>{title}</h3><span className="finance-signal-count">{items.length}</span></header>
      <div className="finance-signal-list">
        {items.map((item) => <article className="finance-signal-item" key={item.id}>
          <span className="finance-signal-dot" />
          <div className="finance-signal-copy"><strong>{item.title}</strong><p>{item.message}</p>{item.action && <button className="finance-signal-action" type="button" onClick={() => onAction?.(item, item.action)}>{item.action.label}<ArrowRight size={13} /></button>}</div>
        </article>)}
      </div>
    </section>
  );

  return <div className="finance-signals-grid">
    {alerts.length > 0 && renderGroup(alerts, 'alert', 'Alertas financeiros', AlertTriangle)}
    {suggestions.length > 0 && renderGroup(suggestions, 'opportunity', 'Ações recomendadas', Lightbulb)}
  </div>;
}
