import { useEffect, useState } from 'react';
import { Bot, DatabaseBackup, RotateCcw, PlugZap, ShieldCheck, RadioTower, Send } from 'lucide-react';
import { platformApi } from '../services/platform-api';

const emptyQuestor = {
  id: null,
  type: 'questor-syn',
  name: 'Questor SYN',
  enabled: false,
  token: '',
  config: { baseUrl: '', accountingPath: '', healthPath: '/', clientDocument: '', establishmentDocument: '', accountantDocuments: [], defaultHistoryCode: '1' },
};

const emptyLocalApi = {
  id: null,
  type: 'local-api',
  name: 'API local',
  enabled: false,
  token: '',
  config: { host: '127.0.0.1', port: 4765 },
};

const emptyAi = {
  id: null, enabled: false, configured: false, hasApiKey: false,
  baseUrl: 'https://api.openai.com/v1', model: '', apiKey: '', shareDescriptions: true,
  automaticAnalysis: false, automaticIntervalHours: 24,
};

export default function Settings() {
  const [appInfo, setAppInfo] = useState(null);
  const [questor, setQuestor] = useState(emptyQuestor);
  const [localApi, setLocalApi] = useState(emptyLocalApi);
  const [ai, setAi] = useState(emptyAi);
  const [accounts, setAccounts] = useState([]);
  const [mappings, setMappings] = useState({});
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [infoResult, accountsResult, aiResult, connectorsResult] = await Promise.allSettled([
        platformApi.getAppInfo(), platformApi.listAccounts(), platformApi.getAiConfig(), platformApi.listConnectors(),
      ]);
      if (!active) return;
      if (infoResult.status === 'fulfilled') setAppInfo(infoResult.value);
      if (accountsResult.status === 'fulfilled') setAccounts(accountsResult.value);
      if (aiResult.status === 'fulfilled') setAi({ ...emptyAi, ...aiResult.value, apiKey: '' });
      const failures = [infoResult, accountsResult, aiResult, connectorsResult].filter((result) => result.status === 'rejected');
      if (failures.length) { setFeedbackType('error'); setFeedback('Algumas configurações não puderam ser carregadas. Tente abrir esta tela novamente.'); }
      if (connectorsResult.status === 'fulfilled') {
        const items = connectorsResult.value;
      const savedQuestor = items.find((item) => item.type === 'questor-syn');
      const savedLocalApi = items.find((item) => item.type === 'local-api');
      if (savedQuestor) {
        setQuestor({ ...emptyQuestor, ...savedQuestor, token: '', config: { ...emptyQuestor.config, ...savedQuestor.config } });
        try { const rows = await platformApi.listConnectorMappings(savedQuestor.id, 'ledger_account'); if (active) setMappings(Object.fromEntries(rows.map((row) => [row.local_id, row.external_id]))); }
        catch { if (active) { setFeedbackType('warning'); setFeedback('Configurações carregadas, mas os mapeamentos do Questor estão indisponíveis.'); } }
      }
      if (savedLocalApi) setLocalApi({ ...emptyLocalApi, ...savedLocalApi, token: '', config: { ...emptyLocalApi.config, ...savedLocalApi.config } });
      }
      if (active) setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const setQuestorConfig = (field) => (event) => setQuestor((current) => ({ ...current, config: { ...current.config, [field]: event.target.value } }));
  const runAction = async (action, operation) => {
    if (busyAction) return;
    setBusyAction(action);
    setFeedback('');
    try {
      const result = await operation();
      if (!result?.canceled) { setFeedbackType('success'); setFeedback(result?.message || 'Operação concluída com sucesso.'); }
    } catch (error) {
      setFeedbackType('error'); setFeedback(error.message || 'A operação falhou.');
    } finally { setBusyAction(''); }
  };

  const saveQuestor = async (event) => {
    event.preventDefault();
    if (busyAction) return;
    setBusyAction('save-questor'); setFeedback('');
    try {
      const saved = await platformApi.saveConnector({
        ...questor,
        config: {
          ...questor.config,
          accountantDocuments: String(questor.config.accountantDocuments || '').split(',').map((item) => item.trim()).filter(Boolean),
        },
      });
      setQuestor((current) => ({ ...current, ...saved, token: '' }));
      setFeedbackType('success'); setFeedback('Configuração do Questor salva.');
    } catch (error) {
      setFeedbackType('error'); setFeedback(error.message || 'Não foi possível salvar o Questor.');
    } finally { setBusyAction(''); }
  };

  const saveMapping = async (accountId, externalId) => {
    setMappings((current) => ({ ...current, [accountId]: externalId }));
    if (!questor.id || !externalId.trim()) return;
    try {
      await platformApi.saveConnectorMapping({ connectorId: questor.id, entityType: 'ledger_account', localId: accountId, externalId: externalId.trim() });
      setFeedbackType('success'); setFeedback('Mapeamento salvo.');
    } catch (error) {
      setFeedbackType('error'); setFeedback(error.message || 'Não foi possível salvar o mapeamento.');
    }
  };

  const saveLocalApi = async (event) => {
    event.preventDefault();
    if (busyAction) return;
    setBusyAction('save-local-api'); setFeedback('');
    try {
      const saved = await platformApi.saveConnector({ ...localApi, config: { ...localApi.config, port: Number(localApi.config.port) } });
      setLocalApi((current) => ({ ...current, ...saved, token: '' }));
      setFeedbackType('success'); setFeedback('Configuração da API local salva.');
    } catch (error) {
      setFeedbackType('error'); setFeedback(error.message || 'Não foi possível salvar a API local.');
    } finally { setBusyAction(''); }
  };

  const saveAi = async (event) => {
    event.preventDefault();
    if (busyAction) return;
    setBusyAction('save-ai'); setFeedback('');
    try {
      const saved = await platformApi.saveAiConfig(ai);
      setAi((current) => ({ ...current, ...saved, apiKey: '' }));
      setFeedbackType('success'); setFeedback('Configuração de IA salva com segurança.');
    } catch (error) {
      setFeedbackType('error'); setFeedback(error.message || 'Não foi possível salvar a configuração de IA.');
    } finally { setBusyAction(''); }
  };

  return (
    <section className="page-shell">
      <p className="eyebrow">Configurações</p>
      <h1>Preferências locais</h1>
      <p className="page-lead">Gerencie dados, backups e integrações opcionais do FinanceOS.</p>

      <div className="settings-grid">
        <div className="card settings-card">
          <ShieldCheck size={22} color="var(--accent-green)" />
          <div><h2>Armazenamento local</h2><p>{appInfo?.desktop ? `Dados em ${appInfo.dataPath}` : 'Use o desktop para SQLite, backup e conectores.'}</p></div>
        </div>
        <div className="card settings-card settings-card--actions">
          <DatabaseBackup size={22} color="var(--accent-blue)" />
          <div><h2>Backup e restauração</h2><p>Crie uma cópia portátil ou restaure um banco validado.</p></div>
          <div className="button-row"><button className="btn btn-ghost" disabled={Boolean(busyAction)} onClick={() => runAction('backup', platformApi.createBackup)}><DatabaseBackup size={14} /> {busyAction === 'backup' ? 'Criando...' : 'Criar backup'}</button><button className="btn btn-ghost" disabled={Boolean(busyAction)} onClick={() => runAction('restore', platformApi.restoreBackup)}><RotateCcw size={14} /> {busyAction === 'restore' ? 'Restaurando...' : 'Restaurar'}</button></div>
        </div>
      </div>

      <form className="card connector-form" onSubmit={saveAi}>
        <div className="section-heading"><div><p className="eyebrow">Análises opcionais</p><h2>Assistente de IA</h2></div><Bot size={22} color="var(--accent-blue)" /></div>
        <p className="form-help">Conecte uma API compatível com Chat Completions para identificar padrões, anomalias e oportunidades, além de sugerir regras. Nada é alterado automaticamente.</p>
        <div className="form-grid">
          <div className="form-field form-field--wide"><label htmlFor="ai-url">URL base da API</label><input id="ai-url" className="input" type="url" value={ai.baseUrl} onChange={(event) => setAi((current) => ({ ...current, baseUrl: event.target.value }))} placeholder="https://api.openai.com/v1" required /></div>
          <div className="form-field"><label htmlFor="ai-model">Modelo</label><input id="ai-model" className="input" value={ai.model} onChange={(event) => setAi((current) => ({ ...current, model: event.target.value }))} placeholder="Nome do modelo" required /></div>
          <div className="form-field"><label htmlFor="ai-key">Chave da API</label><input id="ai-key" className="input" type="password" value={ai.apiKey} onChange={(event) => setAi((current) => ({ ...current, apiKey: event.target.value }))} placeholder={ai.hasApiKey ? 'Deixe vazio para manter a chave atual' : 'Insira sua chave'} /></div>
          <label className="checkbox-field"><input type="checkbox" checked={ai.enabled} onChange={(event) => setAi((current) => ({ ...current, enabled: event.target.checked }))} /> Habilitar análises com IA</label>
          <label className="checkbox-field"><input type="checkbox" checked={ai.shareDescriptions} onChange={(event) => setAi((current) => ({ ...current, shareDescriptions: event.target.checked }))} /> Enviar descrições das transações</label>
          <label className="checkbox-field"><input type="checkbox" checked={ai.automaticAnalysis} onChange={(event) => setAi((current) => ({ ...current, automaticAnalysis: event.target.checked }))} /> Ativar análise automática em segundo plano</label>
          <div className="form-field"><label htmlFor="ai-interval">Frequência automática</label><select id="ai-interval" className="input" value={ai.automaticIntervalHours} onChange={(event) => setAi((current) => ({ ...current, automaticIntervalHours: Number(event.target.value) }))} disabled={!ai.automaticAnalysis}><option value={24}>Diariamente</option><option value={72}>A cada 3 dias</option><option value={168}>Semanalmente</option></select></div>
          <div className="form-actions form-field--wide"><button className="btn btn-primary" disabled={Boolean(busyAction) || loading}>{busyAction === 'save-ai' ? 'Salvando...' : 'Salvar IA'}</button>{ai.configured && <button type="button" className="btn btn-ghost" disabled={Boolean(busyAction)} onClick={() => runAction('test-ai', platformApi.testAi)}>{busyAction === 'test-ai' ? 'Testando...' : 'Testar conexão'}</button>}</div>
        </div>
        <div className="notice notice--warning">Ao executar uma análise, até 250 transações do período serão enviadas ao provedor. A chave fica criptografada no armazenamento local do sistema operacional.</div>
        {ai.automaticAnalysis && <div className="notice notice--warning">Com a análise automática ativa, dados financeiros serão enviados ao provedor na frequência escolhida enquanto o FinanceOS estiver aberto. Nenhuma regra ou transação será alterada automaticamente.</div>}
      </form>

      <form className="card connector-form" onSubmit={saveQuestor}>
        <div className="section-heading"><div><p className="eyebrow">Integração opcional</p><h2>Questor SYN</h2></div><PlugZap size={22} color="var(--accent-green)" /></div>
        <p className="form-help">O FinanceOS inicia a conexão. Nenhuma sincronização ocorre enquanto o conector estiver desativado.</p>
        <div className="form-grid">
          <div className="form-field form-field--wide"><label htmlFor="questor-url">URL base</label><input id="questor-url" className="input" type="url" value={questor.config.baseUrl} onChange={setQuestorConfig('baseUrl')} placeholder="https://..." /></div>
          <div className="form-field"><label htmlFor="questor-path">Caminho de lançamentos</label><input id="questor-path" className="input" value={questor.config.accountingPath} onChange={setQuestorConfig('accountingPath')} placeholder="/api/..." /></div>
          <div className="form-field"><label htmlFor="questor-health">Caminho de teste</label><input id="questor-health" className="input" value={questor.config.healthPath} onChange={setQuestorConfig('healthPath')} /></div>
          <div className="form-field"><label htmlFor="questor-client">CNPJ do cliente</label><input id="questor-client" className="input" value={questor.config.clientDocument} onChange={setQuestorConfig('clientDocument')} /></div>
          <div className="form-field"><label htmlFor="questor-accountant">CNPJs da contabilidade</label><input id="questor-accountant" className="input" value={questor.config.accountantDocuments} onChange={setQuestorConfig('accountantDocuments')} placeholder="Separados por vírgula" /></div>
          <div className="form-field"><label htmlFor="questor-establishment">CNPJ do estabelecimento</label><input id="questor-establishment" className="input" value={questor.config.establishmentDocument} onChange={setQuestorConfig('establishmentDocument')} /></div>
          <div className="form-field"><label htmlFor="questor-history">Histórico padrão</label><input id="questor-history" className="input" value={questor.config.defaultHistoryCode} onChange={setQuestorConfig('defaultHistoryCode')} /></div>
          <div className="form-field form-field--wide"><label htmlFor="questor-token">Token</label><input id="questor-token" className="input" type="password" value={questor.token} onChange={(event) => setQuestor((current) => ({ ...current, token: event.target.value }))} placeholder={questor.id ? 'Deixe vazio para manter o token atual' : ''} /></div>
          <label className="checkbox-field form-field--wide"><input type="checkbox" checked={questor.enabled} onChange={(event) => setQuestor((current) => ({ ...current, enabled: event.target.checked }))} /> Habilitar conector</label>
          <div className="form-actions form-field--wide"><button className="btn btn-primary" disabled={Boolean(busyAction) || loading}>{busyAction === 'save-questor' ? 'Salvando...' : 'Salvar conector'}</button>{questor.id && <button type="button" className="btn btn-ghost" disabled={Boolean(busyAction)} onClick={() => runAction('test-questor', () => platformApi.testConnector(questor.id))}>{busyAction === 'test-questor' ? 'Testando...' : 'Testar conexão'}</button>}</div>
        </div>
      </form>

      {questor.id && (
        <div className="card connector-form">
          <div className="section-heading"><div><p className="eyebrow">De/Para</p><h2>Plano de contas → Questor</h2></div><button className="btn btn-primary" disabled={Boolean(busyAction)} onClick={() => runAction('push-questor', () => platformApi.pushConnector(questor.id))}><Send size={14} /> {busyAction === 'push-questor' ? 'Enviando...' : 'Enviar pendentes'}</button></div>
          <p className="form-help">Informe o código da conta no Questor. O prefixo Q será aplicado automaticamente quando necessário.</p>
          <div className="mapping-list">
            {accounts.map((account) => (
              <label className="mapping-row" key={account.id}>
                <span><strong>{account.code}</strong>{account.name}</span>
                <input className="input" value={mappings[account.id] || ''} onChange={(event) => setMappings((current) => ({ ...current, [account.id]: event.target.value }))} onBlur={(event) => saveMapping(account.id, event.target.value)} placeholder="Código Questor" />
              </label>
            ))}
          </div>
        </div>
      )}

      <form className="card connector-form" onSubmit={saveLocalApi}>
        <div className="section-heading"><div><p className="eyebrow">Entrada de dados</p><h2>API HTTP local</h2></div><RadioTower size={22} color="var(--accent-blue)" /></div>
        <p className="form-help">Recebe transações de programas na mesma máquina. Por segurança, o padrão escuta apenas em 127.0.0.1.</p>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="local-api-host">Endereço</label><input id="local-api-host" className="input" value={localApi.config.host} onChange={(event) => setLocalApi((current) => ({ ...current, config: { ...current.config, host: event.target.value } }))} /></div>
          <div className="form-field"><label htmlFor="local-api-port">Porta</label><input id="local-api-port" className="input" type="number" min="1024" max="65535" value={localApi.config.port} onChange={(event) => setLocalApi((current) => ({ ...current, config: { ...current.config, port: event.target.value } }))} /></div>
          <div className="form-field form-field--wide"><label htmlFor="local-api-token">Token de acesso</label><div className="button-row"><input id="local-api-token" className="input" type="password" value={localApi.token} onChange={(event) => setLocalApi((current) => ({ ...current, token: event.target.value }))} placeholder={localApi.id ? 'Deixe vazio para manter o token atual' : 'Crie um token forte'} /><button type="button" className="btn btn-ghost" onClick={() => setLocalApi((current) => ({ ...current, token: crypto.randomUUID().replaceAll('-', '') }))}>Gerar</button></div></div>
          <label className="checkbox-field form-field--wide"><input type="checkbox" checked={localApi.enabled} onChange={(event) => setLocalApi((current) => ({ ...current, enabled: event.target.checked }))} /> Habilitar API local</label>
          <div className="form-actions form-field--wide"><button className="btn btn-primary" disabled={Boolean(busyAction) || loading}>{busyAction === 'save-local-api' ? 'Salvando...' : 'Salvar API local'}</button><code>POST http://{localApi.config.host}:{localApi.config.port}/v1/transactions</code></div>
        </div>
      </form>

      {feedback && <div className={`notice notice--${feedbackType}`} role={feedbackType === 'error' ? 'alert' : 'status'}>{feedback}</div>}
    </section>
  );
}
