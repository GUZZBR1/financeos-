/**
 * pages/Finance/FinanceDashboard.jsx
 * Página principal do departamento de finanças com métricas, filtros de período e gráficos interativos.
 */

import { useState, useMemo, useEffect } from 'react';
import { Bot, Briefcase, Check, MessageCircle, Plus, Send, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../../context/TransactionContext';
import {
  filterByPeriod,
  calculateSummary,
  calculateCurrentBalance,
  getBarChartData,
  getLineChartData,
  getPieChartData,
  PERIOD_FILTERS,
} from '../../services/calculations';
import { generateInsights } from '../../modules/finance/services/financeInsights';
import FinanceSignals from '../../modules/finance/components/FinanceSignals';
import ActionResultPanel from '../../modules/finance/components/ActionResultPanel';
import { generateAlertsAndSuggestions } from '../../modules/finance/services/financeAlerts';
import { executeAction } from '../../modules/finance/services/financeActions';
import { trackEvent, generateRecurringInsights } from '../../modules/finance/services/financeMemory';
import { getSavedViews } from '../../modules/finance/services/financeSavedViews';
import { generateRecommendations } from '../../modules/finance/services/financeRecommendations';
import { platformApi } from '../../services/platform-api';

import SummaryCards from '../../components/SummaryCards';
import PeriodFilter from '../../components/PeriodFilter';
import { BarChartCard, LineChartCard, PieChartCard } from '../../components/Charts';
import TransactionRow from '../../components/TransactionRow';
import TransactionModal from '../../components/TransactionModal';

export default function FinanceDashboard() {
  const { transactions, accounts, categories, loading, refresh } = useTransactions();
  const navigate = useNavigate();
  // Imported statements are often historical. Showing the complete history by
  // default prevents valid movements from looking as if they were not loaded.
  const [period, setPeriod] = useState(PERIOD_FILTERS.ALL);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [aiConfig, setAiConfig] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiRuleCategories, setAiRuleCategories] = useState({});
  const [aiRuleStatus, setAiRuleStatus] = useState({});
  const [aiBackground, setAiBackground] = useState(null);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState('chat');
  const [workQuestion, setWorkQuestion] = useState('');
  const [workMessages, setWorkMessages] = useState([]);
  const [workProposal, setWorkProposal] = useState(null);
  const [workLoading, setWorkLoading] = useState(false);
  const [workError, setWorkError] = useState('');

  useEffect(() => {
    platformApi.getAiConfig().then(setAiConfig);
    platformApi.getAiBackground().then(setAiBackground);
    const backgroundRefresh = setInterval(() => platformApi.getAiBackground().then(setAiBackground), 60 * 1000);
    return () => clearInterval(backgroundRefresh);
  }, []);

  // Calculate top category for action handlers
  const topCategory = useMemo(() => {
    const filtered = filterByPeriod(transactions, period, customStart, customEnd);
    const categoryTotals = {};
    filtered
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category || 'Não classificado';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + t.value;
      });
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    return sorted[0] || null;
  }, [transactions, period, customStart, customEnd]);

  const handleSignalAction = (signal, action) => {
    const result = executeAction(action.type, {
      topCategory,
      categoryName: topCategory?.[0]
    });

    // Handle navigation actions directly
    if (result.type === 'navigation') {
      navigate(result.navigateTo || '/finance/history');
      return;
    }

    setActionResult(result);
  };

  // Filtra transações pelo período selecionado — recalcula automaticamente ao mudar transactions
  const filtered = useMemo(
    () => filterByPeriod(transactions, period, customStart, customEnd),
    [transactions, period, customStart, customEnd]
  );

  useEffect(() => {
    setAiAnalysis(null);
    setAiError('');
    setChatMessages([]);
    setChatError('');
    setWorkMessages([]);
    setWorkProposal(null);
    setWorkError('');
  }, [period, customStart, customEnd]);

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') setChatOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  const currentBalance = useMemo(() => calculateCurrentBalance(transactions, accounts), [transactions, accounts]);
  const summary = useMemo(() => ({ ...calculateSummary(filtered), balance: currentBalance }), [filtered, currentBalance]);
  const barData = useMemo(() => getBarChartData(filtered, period, customStart, customEnd), [filtered, period, customStart, customEnd]);
  const lineData = useMemo(() => getLineChartData(filtered, period, customStart, customEnd), [filtered, period, customStart, customEnd]);
  const pieData = useMemo(() => getPieChartData(filtered), [filtered]);

  const recentMovements = useMemo(() => filtered.slice(0, 5), [filtered]);

  const insights = useMemo(() => {
    const result = generateInsights(transactions, period, customStart, customEnd);
    return {
      ...result,
      balanceInsight: {
        text: 'Inclui créditos e débitos sem categoria',
        status: currentBalance < 0 ? 'warning' : 'neutral',
        trend: null,
      },
    };
  }, [transactions, period, customStart, customEnd, currentBalance]);

  const { alerts, suggestions } = useMemo(
    () => generateAlertsAndSuggestions(transactions, period, customStart, customEnd),
    [transactions, period, customStart, customEnd]
  );

  // Generate recurring insights from memory
  const recurringInsights = useMemo(() => {
    return generateRecurringInsights(getSavedViews());
  }, []);

  // Track pattern events from alerts
  useEffect(() => {
    const hasNegativeBalance = alerts.some(a => a.id === 'negative-balance');
    const hasExpenseSpike = alerts.some(a => a.id === 'expenses-spike');
    if (hasNegativeBalance) trackEvent('negativeBalance');
    if (hasExpenseSpike && topCategory) {
      trackEvent('expenseSpike', { category: topCategory[0] });
    }
  }, [alerts, topCategory]);

  // Generate proactive recommendations from memory + context
  const recommendations = useMemo(() => {
    return generateRecommendations({ topCategory, alerts });
  }, [topCategory, alerts]);

  // Handle recommendation action (reuses existing action system)
  const handleRecommendationAction = (rec) => {
    const result = executeAction(rec.action.type, {
      topCategory,
      categoryName: topCategory?.[0],
      ...rec.action.payload,
    });
    if (result.type === 'navigation') {
      navigate(result.navigateTo || '/finance/history');
      return;
    }
    setActionResult(result);
  };

  const handleCustomChange = (field, value) => {
    if (field === 'start') setCustomStart(value);
    else setCustomEnd(value);
  };

  const runAiAnalysis = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const analysis = await platformApi.analyzeWithAi({ transactions: filtered, periodLabel: period });
      setAiAnalysis(analysis);
      setAiRuleCategories(Object.fromEntries((analysis.suggestedRules || []).map((rule, index) => {
        const suggested = categories.find((category) => category.type === rule.direction && category.name.localeCompare(rule.categoryName || '', 'pt-BR', { sensitivity: 'base' }) === 0);
        return [index, suggested?.id || ''];
      })));
      setAiRuleStatus({});
    } catch (error) {
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const createAiRule = async (rule, index) => {
    const categoryId = aiRuleCategories[index];
    if (!categoryId) {
      setAiRuleStatus((current) => ({ ...current, [index]: { state: 'error', message: 'Selecione uma categoria.' } }));
      return;
    }
    setAiRuleStatus((current) => ({ ...current, [index]: { state: 'saving', message: '' } }));
    try {
      await platformApi.createRule({
        name: rule.name || `Regra sugerida: ${rule.pattern}`,
        field: 'description',
        operator: ['equals', 'contains', 'starts_with'].includes(rule.operator) ? rule.operator : 'contains',
        pattern: rule.pattern,
        direction: rule.direction,
        categoryId,
        priority: 700,
        confidence: Number.isFinite(Number(rule.confidence)) ? Number(rule.confidence) : 0.9,
        active: true,
      });
      setAiRuleStatus((current) => ({ ...current, [index]: { state: 'created', message: 'Regra criada.' } }));
    } catch (error) {
      setAiRuleStatus((current) => ({ ...current, [index]: { state: 'error', message: error.message } }));
    }
  };

  const askFinancialChat = async (event) => {
    event.preventDefault();
    const question = chatQuestion.trim();
    if (!question || chatLoading) return;
    const previous = chatMessages;
    setChatMessages((current) => [...current, { role: 'user', content: question }]);
    setChatQuestion('');
    setChatError('');
    setChatLoading(true);
    try {
      const result = await platformApi.chatWithAi({ question, transactions: filtered, periodLabel: period, history: previous });
      setChatMessages((current) => [...current, { role: 'assistant', content: result.answer }]);
    } catch (error) {
      setChatError(error.message);
    } finally {
      setChatLoading(false);
    }
  };

  const previewFinancialWork = async (event) => {
    event.preventDefault();
    const question = workQuestion.trim();
    if (!question || workLoading) return;
    setWorkMessages((current) => [...current, { role: 'user', content: question }]);
    setWorkQuestion('');
    setWorkProposal(null);
    setWorkError('');
    setWorkLoading(true);
    try {
      const result = await platformApi.previewAiWork({ question, transactionIds: filtered.map((transaction) => transaction.id), periodLabel: period });
      if (!result.proposal) {
        setWorkMessages((current) => [...current, { role: 'assistant', content: result.message }]);
        return;
      }
      setWorkProposal(result.proposal);
      setWorkMessages((current) => [...current, { role: 'assistant', content: result.proposal.message }]);
    } catch (error) {
      setWorkError(error.message);
    } finally {
      setWorkLoading(false);
    }
  };

  const confirmFinancialWork = async () => {
    if (!workProposal?.token || workLoading) return;
    setWorkLoading(true);
    setWorkError('');
    try {
      const result = await platformApi.executeAiWork({ token: workProposal.token });
      await refresh();
      setWorkMessages((current) => [...current, { role: 'assistant', content: `${result.updated} transações foram classificadas como ${result.categoryName}.${result.skipped ? ` ${result.skipped} foram ignoradas por segurança.` : ''}` }]);
      setWorkProposal(null);
    } catch (error) {
      setWorkError(error.message);
    } finally {
      setWorkLoading(false);
    }
  };

  const cancelFinancialWork = () => {
    setWorkProposal(null);
    setWorkMessages((current) => [...current, { role: 'assistant', content: 'Atividade cancelada. Nenhuma transação foi alterada.' }]);
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
            Painel financeiro
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Acompanhe caixa, movimentações e pontos que exigem atenção
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
          includeAll
        />
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} loading={loading} insights={insights} />

      <section className="card ai-analysis-card">
        <div className="section-heading">
          <div><p className="eyebrow">Assistente opcional</p><h2>Análise inteligente</h2></div>
          <Bot size={22} color="var(--accent-blue)" />
        </div>
        <p className="form-help">Procura padrões recorrentes, anomalias, oportunidades e possíveis regras no período selecionado.</p>
        {!aiConfig?.enabled ? (
          <div className="button-row"><span className="form-help">Configure e habilite uma API de IA para usar esta análise.</span><button className="btn btn-ghost" onClick={() => navigate('/settings')}>Configurar IA</button></div>
        ) : (
          <button className="btn btn-primary" onClick={runAiAnalysis} disabled={aiLoading || filtered.length === 0}><Sparkles size={15} /> {aiLoading ? 'Analisando...' : 'Analisar este período'}</button>
        )}
        {aiError && <div className="notice notice--error">{aiError}</div>}
        {aiAnalysis && (
          <div className="ai-analysis-results">
            <p className="ai-summary">{aiAnalysis.summary}</p>
            {[
              ['Padrões encontrados', aiAnalysis.patterns],
              ['Pontos para revisar', aiAnalysis.anomalies],
              ['Ideias e oportunidades', aiAnalysis.recommendations],
            ].filter(([, items]) => items?.length).map(([title, items]) => (
              <div key={title} className="ai-result-group"><h3>{title}</h3>{items.map((item, index) => <div className="ai-result-item" key={`${title}-${index}`}><strong>{item.title || item.name}</strong><span>{item.detail || item.reason}{item.categoryName ? ` → ${item.categoryName}` : ''}</span></div>)}</div>
            ))}
            {aiAnalysis.suggestedRules?.length > 0 && (
              <div className="ai-result-group">
                <h3>Regras sugeridas</h3>
                {aiAnalysis.suggestedRules.map((rule, index) => {
                  const status = aiRuleStatus[index];
                  const eligibleCategories = categories.filter((category) => category.type === rule.direction || category.type === 'both');
                  return (
                    <div className="ai-result-item ai-rule-suggestion" key={`${rule.direction}-${rule.pattern}-${index}`}>
                      <div className="ai-rule-copy">
                        <strong>{rule.name}</strong>
                        <span>{rule.reason}{rule.categoryName ? ` → ${rule.categoryName}` : ''}</span>
                        <span className="ai-rule-meta">Padrão: “{rule.pattern}” · {rule.direction === 'income' ? 'Entrada' : 'Saída'} · Confiança {Math.round((Number(rule.confidence) || 0) * 100)}%</span>
                      </div>
                      <div className="ai-rule-actions">
                        <select className="input" aria-label={`Categoria para ${rule.name}`} value={aiRuleCategories[index] || ''} onChange={(event) => setAiRuleCategories((current) => ({ ...current, [index]: event.target.value }))} disabled={status?.state === 'saving' || status?.state === 'created'}>
                          <option value="">Escolha a categoria</option>
                          {eligibleCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                        <button className={status?.state === 'created' ? 'btn btn-ghost' : 'btn btn-primary'} onClick={() => createAiRule(rule, index)} disabled={status?.state === 'saving' || status?.state === 'created'}>
                          {status?.state === 'created' ? <><Check size={14} /> Criada</> : status?.state === 'saving' ? 'Criando...' : <><Plus size={14} /> Criar regra</>}
                        </button>
                      </div>
                      {status?.message && <span className={status.state === 'error' ? 'form-error' : 'ai-rule-success'}>{status.message}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            <small>{aiAnalysis.disclaimer}</small>
          </div>
        )}
      </section>

      {aiBackground?.enabled && (aiBackground.result || aiBackground.error) && (
        <section className="card ai-background-card">
          <div className="section-heading"><div><p className="eyebrow">Segundo plano</p><h2>Última análise automática</h2></div><Sparkles size={20} color="var(--accent-green)" /></div>
          {aiBackground.lastAt && <p className="form-help">Executada em {new Date(aiBackground.lastAt).toLocaleString('pt-BR')}.</p>}
          {aiBackground.result?.summary && <p className="ai-summary">{aiBackground.result.summary}</p>}
          {[
            ['Padrões', aiBackground.result?.patterns],
            ['Pontos para revisar', aiBackground.result?.anomalies],
            ['Oportunidades', aiBackground.result?.recommendations],
          ].filter(([, items]) => items?.length).map(([title, items]) => (
            <div className="ai-result-group" key={title}><h3>{title}</h3>{items.slice(0, 4).map((item, index) => <div className="ai-result-item" key={`${title}-${index}`}><strong>{item.title}</strong><span>{item.detail}</span></div>)}</div>
          ))}
          {aiBackground.error && <div className="notice notice--error">{aiBackground.error}</div>}
        </section>
      )}

      <button className={`financial-chat-launcher${chatOpen ? ' financial-chat-launcher--open' : ''}`} type="button" aria-label={chatOpen ? 'Fechar chat financeiro' : 'Abrir chat financeiro'} aria-expanded={chatOpen} aria-controls="financial-chat-drawer" onClick={() => setChatOpen((current) => !current)}>
        {chatOpen ? <X size={21} /> : <MessageCircle size={21} />}
        {(chatMessages.length > 0 || workMessages.length > 0) && !chatOpen && <span className="financial-chat-launcher__dot" />}
      </button>
      <button className={`financial-chat-backdrop${chatOpen ? ' financial-chat-backdrop--visible' : ''}`} type="button" aria-label="Fechar chat financeiro" tabIndex={chatOpen ? 0 : -1} onClick={() => setChatOpen(false)} />
      <aside id="financial-chat-drawer" className={`financial-chat-drawer${chatOpen ? ' financial-chat-drawer--open' : ''}`} aria-hidden={!chatOpen} aria-labelledby="financial-chat-title" inert={!chatOpen ? '' : undefined}>
        <div className="section-heading"><div><p className="eyebrow">Assistente contextual</p><h2 id="financial-chat-title">Assistente financeiro</h2></div></div>
        <div className="assistant-mode-tabs" role="tablist" aria-label="Modo do assistente">
          <button type="button" role="tab" aria-selected={assistantMode === 'chat'} className={assistantMode === 'chat' ? 'assistant-mode-tab assistant-mode-tab--active' : 'assistant-mode-tab'} onClick={() => setAssistantMode('chat')}><MessageCircle size={15} /> Chat</button>
          <button type="button" role="tab" aria-selected={assistantMode === 'work'} className={assistantMode === 'work' ? 'assistant-mode-tab assistant-mode-tab--active' : 'assistant-mode-tab'} onClick={() => setAssistantMode('work')}><Briefcase size={15} /> Work</button>
        </div>
        {assistantMode === 'chat' ? (
          <>
            <p className="form-help">Pergunte sobre receitas, despesas, categorias e padrões do período selecionado. O chat não altera seus dados.</p>
            <div className="chat-suggestions">
              {['Onde mais gastei?', 'Quais despesas parecem recorrentes?', 'O que merece minha atenção?'].map((question) => <button type="button" className="btn btn-ghost" key={question} onClick={() => setChatQuestion(question)}>{question}</button>)}
            </div>
            <div className="chat-messages" role="log" aria-live="polite" aria-relevant="additions">{chatMessages.length === 0 && <div className="chat-empty"><MessageCircle size={28} /><span>Escolha uma pergunta ou escreva a sua para começar.</span></div>}{chatMessages.map((message, index) => <div className={`chat-message chat-message--${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>)}{chatLoading && <div className="chat-message chat-message--assistant">Analisando seus dados...</div>}</div>
            <form className="chat-form" onSubmit={askFinancialChat}>
              <input className="input" value={chatQuestion} onChange={(event) => setChatQuestion(event.target.value)} maxLength={1000} placeholder="Ex.: quais categorias cresceram neste período?" disabled={!aiConfig?.enabled || chatLoading} />
              <button className="btn btn-primary" disabled={!aiConfig?.enabled || chatLoading || !chatQuestion.trim()}><Send size={14} /> {chatLoading ? 'Pensando...' : 'Enviar'}</button>
            </form>
            {chatError && <div className="notice notice--error">{chatError}</div>}
            <small>As respostas são informativas e usam dados agregados do período atual.</small>
          </>
        ) : (
          <>
            <p className="form-help">Peça uma classificação em lote. Você revisa a prévia antes de qualquer alteração.</p>
            <div className="chat-suggestions">
              {['Classifique recebimentos como Receitas', 'Classifique tarifas como Despesas financeiras'].map((question) => <button type="button" className="btn btn-ghost" key={question} onClick={() => setWorkQuestion(question)}>{question}</button>)}
            </div>
            <div className="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
              {workMessages.length === 0 && <div className="chat-empty"><Briefcase size={28} /><span>Descreva a atividade que deseja realizar neste período.</span></div>}
              {workMessages.map((message, index) => <div className={`chat-message chat-message--${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>)}
              {workLoading && <div className="chat-message chat-message--assistant">{workProposal ? 'Executando atividade...' : 'Preparando uma prévia segura...'}</div>}
              {workProposal && (
                <div className="work-proposal">
                  <div className="work-proposal__heading"><div><span>Prévia da atividade</span><strong>{workProposal.count} transações → {workProposal.categoryName}</strong></div><Briefcase size={18} /></div>
                  <dl><div><dt>Filtro</dt><dd>Descrição {workProposal.operator === 'equals' ? 'é igual a' : workProposal.operator === 'starts_with' ? 'começa com' : 'contém'} “{workProposal.pattern}”</dd></div><div><dt>Valor total</dt><dd>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(workProposal.totalValue)}</dd></div></dl>
                  {workProposal.skipped > 0 && <p className="work-proposal__warning">{workProposal.skipped} transações conciliadas não serão alteradas.</p>}
                  {workProposal.samples.length > 0 && <div className="work-proposal__samples">{workProposal.samples.map((sample) => <span key={sample.id}>{sample.description}</span>)}</div>}
                  {workProposal.count === 0 && <p className="form-help">Nenhuma transação editável corresponde ao pedido.</p>}
                  <div className="work-proposal__actions"><button type="button" className="btn btn-ghost" onClick={cancelFinancialWork} disabled={workLoading}><X size={14} /> {workProposal.count === 0 ? 'Fechar' : 'Cancelar'}</button>{workProposal.count > 0 && <button type="button" className="btn btn-primary" onClick={confirmFinancialWork} disabled={workLoading}><Check size={14} /> Confirmar</button>}</div>
                </div>
              )}
            </div>
            <form className="chat-form" onSubmit={previewFinancialWork}>
              <input className="input" value={workQuestion} onChange={(event) => setWorkQuestion(event.target.value)} maxLength={1000} placeholder="Ex.: classifique recebimentos como Receitas" disabled={!aiConfig?.enabled || workLoading} />
              <button className="btn btn-primary" disabled={!aiConfig?.enabled || workLoading || !workQuestion.trim()}><Send size={14} /> {workLoading ? 'Aguarde...' : 'Preparar'}</button>
            </form>
            {workError && <div className="notice notice--error">{workError}</div>}
            <small>O Work nunca executa uma alteração sem sua confirmação.</small>
          </>
        )}
        {!aiConfig?.enabled && <span className="form-help">Habilite a integração com IA nas configurações para usar o assistente.</span>}
      </aside>

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

      {/* Finance Signals */}
      <FinanceSignals
        alerts={alerts}
        suggestions={suggestions}
        onAction={handleSignalAction}
      />

      {/* Recurring Insights */}
      {recurringInsights.length > 0 && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: 16,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(99, 102, 241, 0.7)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 10,
          }}>
            Padrões observados
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recurringInsights.map((insight, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: insight.type === 'warning' ? '#f59e0b' : insight.type === 'pattern' ? '#8b5cf6' : '#3b82f6',
                  flexShrink: 0,
                }} />
                {insight.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proactive Recommendations */}
      {recommendations.length > 0 && (
        <section className="dashboard-recommendations">
          <div className="dashboard-recommendations__heading"><div><p className="eyebrow">Próximos passos</p><h3>Recomendações para você</h3></div><span>{recommendations.length}</span></div>
          <div className="dashboard-recommendations__list">
            {recommendations.map((rec) => (
              <article className="dashboard-recommendation" key={rec.id}><span className="dashboard-recommendation__marker" /><div><strong>{rec.title}</strong><p>{rec.message}</p></div><button type="button" onClick={() => handleRecommendationAction(rec)}>{rec.action.label}</button></article>
            ))}
          </div>
        </section>
      )}

      {/* Action Result Panel */}
      <ActionResultPanel
        result={actionResult}
        onClose={() => setActionResult(null)}
      />

      {/* Pie + Recent Movements */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
      }}>
        <PieChartCard data={pieData} />

        {/* Recent Movements */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Movimentos Recentes
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {filtered.length} registros
            </span>
          </div>

          {recentMovements.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nenhum movimento no período
            </div>
          ) : (
            recentMovements.map((t) => (
              <TransactionRow key={t.id} transaction={t} compact />
            ))
          )}
        </div>
      </div>

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
