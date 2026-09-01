import { BarChart3, FileText, Lightbulb, Search, Sparkles, X } from 'lucide-react';

const icons = { simulation: BarChart3, navigation: FileText, filter: Search, recommendation: Lightbulb };
const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ActionResultPanel({ result, onClose }) {
  if (!result) return null;
  const Icon = icons[result.type] || Sparkles;

  return <section className={`action-result-panel action-result-panel--${result.type || 'default'}`} aria-live="polite">
    <div className="action-result-icon"><Icon size={19} /></div>
    <div className="action-result-content">
      <p className="action-result-eyebrow">{result.title}</p>
      <p className="action-result-message">{result.message}</p>
      {result.data && <div className="action-result-metrics">
        {result.data.monthlySavings !== undefined && <div><span>Economia mensal</span><strong>{formatMoney(result.data.monthlySavings)}</strong></div>}
        {result.data.yearlySavings !== undefined && <div><span>Economia anual</span><strong>{formatMoney(result.data.yearlySavings)}</strong></div>}
        {result.data.category && <div><span>Categoria</span><strong>{result.data.category}</strong></div>}
        {result.data.percentage !== undefined && <div><span>Redução</span><strong>{result.data.percentage}%</strong></div>}
      </div>}
    </div>
    {onClose && <button className="action-result-close" type="button" onClick={onClose} aria-label="Fechar resultado"><X size={16} /></button>}
  </section>;
}
