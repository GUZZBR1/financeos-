import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Plus, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { platformApi } from '../../services/platform-api';

const initialForm = {
  name: '',
  operator: 'contains',
  pattern: '',
  direction: 'expense',
  categoryId: '',
  priority: 500,
};

export default function RulesCenter() {
  const { categories, desktop, refresh } = useTransactions();
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');
  const [review, setReview] = useState(null);
  const [approved, setApproved] = useState({});
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState(null);
  const reviewDialogRef = useRef(null);
  const reviewTriggerRef = useRef(null);
  const reviewCloseRef = useRef(null);

  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      setRules(await platformApi.listRules());
      return true;
    } catch (error) {
      setFeedbackType('error');
      setFeedback(error.message || 'Não foi possível carregar as regras.');
      return false;
    } finally {
      setRulesLoading(false);
    }
  }, []);
  useEffect(() => { loadRules(); }, [loadRules]);
  useEffect(() => {
    if (!review) return undefined;
    const frame = requestAnimationFrame(() => reviewCloseRef.current?.focus());
    const handleDialogKeys = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setReview(null); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...reviewDialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleDialogKeys);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleDialogKeys);
      reviewTriggerRef.current?.focus();
    };
  }, [review]);

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const createRule = async (event) => {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setFeedback('');
    try {
      await platformApi.createRule({ ...form, priority: Number(form.priority), confidence: 1 });
      setForm(initialForm);
      if (await loadRules()) {
        setFeedbackType('success');
        setFeedback('Regra criada com sucesso.');
      }
    } catch (error) {
      setFeedbackType('error');
      setFeedback(error.message || 'Não foi possível criar a regra.');
    } finally {
      setCreating(false);
    }
  };

  const removeRule = async (id) => {
    if (deletingRuleId) return;
    setDeletingRuleId(id);
    setFeedback('');
    try {
      await platformApi.deleteRule(id);
      if (await loadRules()) {
        setFeedbackType('success');
        setFeedback('Regra excluída com sucesso.');
      }
    } catch (error) {
      setFeedbackType('error');
      setFeedback(error.message || 'Não foi possível excluir a regra.');
    } finally {
      setDeletingRuleId(null);
    }
  };

  const previewPending = async () => {
    setReviewLoading(true);
    setFeedback('');
    try {
      const result = await platformApi.previewPendingRules();
      setReview(result);
      setApproved(Object.fromEntries(result.suggestions.map((suggestion) => [suggestion.transactionId, null])));
    } catch (error) {
      setFeedbackType('error');
      setFeedback(error.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const applyPending = async () => {
    setReviewLoading(true);
    try {
      const result = await platformApi.applyPendingRules({ approvedSuggestionIds: Object.entries(approved).filter(([, decision]) => decision === true).map(([id]) => id) });
      await refresh();
      setReview(null);
      setFeedbackType('success');
      setFeedback(`${result.applied} transação(ões) classificadas: ${result.automaticApplied} automáticas e ${result.confirmedApplied} confirmadas por você.`);
    } catch (error) {
      setFeedbackType('error');
      setFeedback(error.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const undecided = review?.suggestions.filter((suggestion) => approved[suggestion.transactionId] == null).length || 0;

  return (
    <section className="page-shell">
      <p className="eyebrow">Automação local</p>
      <h1>Regras de classificação</h1>
      <p className="page-lead">Defina como descrições bancárias devem ser classificadas, sem depender de IA.</p>

      <div className="card rules-retroactive-card">
        <div><p className="eyebrow">Reclassificação segura</p><h2>Aplicar regras às pendências</h2><p className="form-help">Correspondências com 85% ou mais serão aplicadas automaticamente. As demais serão mostradas para sua confirmação.</p></div>
        <button ref={reviewTriggerRef} className="btn btn-primary" type="button" onClick={previewPending} disabled={!desktop || reviewLoading}><RefreshCw size={16} className={reviewLoading ? 'spin' : ''} /> {reviewLoading ? 'Analisando...' : 'Analisar pendências'}</button>
      </div>

      <form className="card form-grid" onSubmit={createRule}>
        <div className="form-field form-field--wide"><label htmlFor="rule-name">Nome da regra</label><input id="rule-name" className="input" value={form.name} onChange={set('name')} required /></div>
        <div className="form-field"><label htmlFor="rule-direction">Movimento</label><select id="rule-direction" className="input" value={form.direction} onChange={set('direction')}><option value="expense">Saída</option><option value="income">Entrada</option></select></div>
        <div className="form-field"><label htmlFor="rule-operator">Comparação</label><select id="rule-operator" className="input" value={form.operator} onChange={set('operator')}><option value="contains">Contém</option><option value="equals">É exatamente</option><option value="starts_with">Começa com</option><option value="regex">Expressão regular</option></select></div>
        <div className="form-field form-field--wide"><label htmlFor="rule-pattern">Texto ou padrão</label><input id="rule-pattern" className="input" value={form.pattern} onChange={set('pattern')} required /></div>
        <div className="form-field"><label htmlFor="rule-category">Categoria</label><select id="rule-category" className="input" value={form.categoryId} onChange={set('categoryId')} required><option value="">Selecione</option>{categories.filter((category) => category.type === form.direction || category.type === 'both').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        <div className="form-field"><label htmlFor="rule-priority">Prioridade</label><input id="rule-priority" className="input" type="number" min="0" max="1000" value={form.priority} onChange={set('priority')} /></div>
        <div className="form-actions form-field--wide"><button className="btn btn-primary" disabled={!desktop || creating}><Plus size={16} /> {creating ? 'Criando...' : 'Criar regra'}</button></div>
      </form>

      {feedback && <div className={`notice notice--${feedbackType}`} role={feedbackType === 'error' ? 'alert' : 'status'}>{feedback}</div>}

      {!desktop && <div className="notice notice--warning">Abra o aplicativo desktop para persistir regras.</div>}
      {rulesLoading ? (
        <div className="card empty-state" role="status"><RefreshCw size={20} className="spin" /><p>Carregando regras...</p></div>
      ) : rules.length === 0 ? (
        <div className="card empty-state"><h2>Nenhuma regra cadastrada</h2><p>Ao classificar uma movimentação, você também poderá ensinar uma regra exata automaticamente.</p></div>
      ) : (
        <div className="card data-list">
          {rules.map((rule) => (
            <div className="data-row" key={rule.id}>
              <div><strong>{rule.name}</strong><span>{rule.field} {rule.operator} “{rule.pattern}” → {rule.category_name}</span></div>
              <div className="data-row__metrics"><span>Prioridade {rule.priority}</span><button className="icon-button" aria-label={deletingRuleId === rule.id ? `Excluindo regra ${rule.name}` : `Excluir regra ${rule.name}`} onClick={() => removeRule(rule.id)} disabled={Boolean(deletingRuleId)}><Trash2 size={14} /></button></div>
            </div>
          ))}
        </div>
      )}

      {review && <div className="rule-review-backdrop" role="presentation">
        <section ref={reviewDialogRef} className="rule-review-dialog" role="dialog" aria-modal="true" aria-labelledby="rule-review-title" aria-describedby="rule-review-description">
          <header className="rule-review-header"><div><p className="eyebrow">Conferência necessária</p><h2 id="rule-review-title">Revisar classificações sugeridas</h2></div><button ref={reviewCloseRef} className="icon-button" type="button" aria-label="Fechar revisão" onClick={() => setReview(null)} disabled={reviewLoading}><X size={17} /></button></header>
          <div id="rule-review-description" className="notice notice--warning"><AlertTriangle size={17} /><span><strong>{review.automatic.length}</strong> correspondência(s) com confiança alta serão aplicadas automaticamente. Confira as <strong>{review.suggestions.length}</strong> sugestões abaixo de 85%.</span></div>
          {review.suggestions.length === 0 ? <div className="rule-review-empty"><ShieldCheck size={34} /><h3>Nenhuma sugestão duvidosa</h3><p>Você pode aplicar as correspondências de alta confiança com segurança.</p></div> : <div className="rule-review-list">{review.suggestions.map((suggestion) => {
            const decision = approved[suggestion.transactionId];
            return <article className={`rule-review-item${decision === true ? ' rule-review-item--approved' : decision === false ? ' rule-review-item--rejected' : ''}`} key={suggestion.transactionId}>
              <div className="rule-review-copy"><strong>{suggestion.description}</strong><span>{suggestion.direction === 'income' ? 'Entrada' : 'Saída'} · {suggestion.categoryName} · confiança {Math.round(suggestion.confidence * 100)}%</span><small>Regra: {suggestion.ruleName}</small></div>
              <div className="rule-review-actions"><button className="btn btn-ghost" type="button" onClick={() => setApproved((current) => ({ ...current, [suggestion.transactionId]: false }))}><X size={14} /> Não está certo</button><button className="btn btn-primary" type="button" onClick={() => setApproved((current) => ({ ...current, [suggestion.transactionId]: true }))}><Check size={14} /> Está certo</button></div>
            </article>;
          })}</div>}
          <footer className="rule-review-footer"><span>{undecided ? `${undecided} sugestão(ões) ainda sem decisão. Se continuar, elas permanecerão pendentes.` : 'Todas as sugestões foram conferidas.'}</span><div className="button-row"><button className="btn btn-ghost" type="button" onClick={() => setReview(null)}>Cancelar</button><button className="btn btn-primary" type="button" onClick={applyPending} disabled={reviewLoading}><ShieldCheck size={15} /> {reviewLoading ? 'Aplicando...' : 'Aplicar decisões'}</button></div></footer>
        </section>
      </div>}
    </section>
  );
}
