import { app, BrowserWindow, dialog, ipcMain, net, safeStorage } from 'electron';
import { existsSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { FinanceDatabase } from './database/finance-database.mjs';
import { prepareOfxFile } from './services/import-service.mjs';
import { SecretStore } from './services/secret-store.mjs';
import { createDatabaseBackup, restoreDatabaseBackup } from './services/backup-service.mjs';
import { validateRuleInput, validateTransactionInput, requireObject, requireString } from './ipc/validation.mjs';
import { createTrustedIpcRegistrar } from './ipc/trusted-ipc.mjs';
import { ConnectorRegistry } from './connectors/connector.mjs';
import { QuestorSynConnector, validateQuestorConfirmation } from './connectors/questor-syn.mjs';
import { LocalApiServer } from './services/local-api-server.mjs';
import { OpenAiCompatibleProvider } from './ai/classification-provider.mjs';
import { findWorkCategory, workDescriptionMatches } from './ai/work-planner.mjs';
import { denyWindowOpen, isAllowedNavigation } from './security/navigation-policy.mjs';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
let database;
let mainWindow;
let secretStore;
let localApiServer;
let aiBackgroundTimer;
let aiBackgroundRunning = false;
let aiInteractiveRunning = false;
let shutdownStarted = false;
const pendingImports = new Map();
const pendingAiWork = new Map();

const connectorRegistry = new ConnectorRegistry();
connectorRegistry.register('questor-syn', (config) => new QuestorSynConnector(config));

function getAiConnector() {
  return database.listConnectors().find((item) => item.type === 'ai-provider') || null;
}

async function createAiProvider({ requireEnabled = true } = {}) {
  const connector = getAiConnector();
  if (!connector || (requireEnabled && !connector.enabled)) throw new Error('Configure e habilite a integração com IA primeiro.');
  const raw = database.db.prepare('SELECT secret_key FROM connectors WHERE id = ?').get(connector.id);
  const apiKey = raw?.secret_key ? await secretStore.get(raw.secret_key) : null;
  if (!apiKey) throw new Error('Nenhuma chave de API foi configurada.');
  return new OpenAiCompatibleProvider({ ...connector.config, apiKey, fetchImpl: net.fetch });
}

function sanitizeAiTransactions(items, shareDescriptions) {
  return items.map((item) => ({
    date: String(item.date || item.postedAt || '').slice(0, 40),
    description: shareDescriptions ? String(item.description || '').slice(0, 160) : '',
    value: Number(item.value || 0),
    type: ['income', 'expense'].includes(item.type) ? item.type : null,
    category: item.category ? String(item.category).slice(0, 100) : null,
    status: item.status ? String(item.status).slice(0, 30) : null,
  })).filter((item) => Number.isFinite(item.value) && item.value > 0 && item.type).slice(0, 250);
}

function cleanExpiredAiWork() {
  const currentTime = Date.now();
  for (const [token, pending] of pendingAiWork) {
    if (pending.expiresAt <= currentTime) pendingAiWork.delete(token);
  }
}

function validateCandidateIds(value) {
  if (!Array.isArray(value) || value.length > 5000) throw new Error('Período de trabalho inválido.');
  const ids = value.map((id) => requireString(id, 'ID da transação', { max: 100 }));
  if (new Set(ids).size !== ids.length) throw new Error('O período contém transações duplicadas.');
  return ids;
}

async function runBackgroundAiAnalysis() {
  const connector = getAiConnector();
  if (!connector?.enabled || !connector.config.automaticAnalysis || aiBackgroundRunning || aiInteractiveRunning) return;
  const hours = Math.max(24, Number(connector.config.automaticIntervalHours) || 24);
  const lastAt = Date.parse(connector.config.lastAutomaticAnalysisAt || '') || 0;
  if (Date.now() - lastAt < hours * 60 * 60 * 1000) return;
  aiBackgroundRunning = true;
  try {
    const transactions = sanitizeAiTransactions(database.listTransactions(), connector.config.shareDescriptions !== false);
    if (!transactions.length) return;
    const result = await (await createAiProvider()).analyze({ transactions, categories: database.listCategories(), existingRules: database.listRules(), allowRuleSuggestions: connector.config.shareDescriptions !== false, periodLabel: 'histórico disponível (análise automática)' });
    const current = getAiConnector();
    if (current?.id === connector.id) database.saveConnector({ ...current, secretKey: null, config: { ...current.config, lastAutomaticAnalysisAt: new Date().toISOString(), lastAutomaticAnalysis: result, lastAutomaticError: null } });
  } catch (error) {
    const current = getAiConnector();
    if (current?.id === connector.id) database.saveConnector({ ...current, secretKey: null, config: { ...current.config, lastAutomaticAnalysisAt: new Date().toISOString(), lastAutomaticError: String(error.message).slice(0, 500) } });
  } finally { aiBackgroundRunning = false; }
}

function configureAiBackground() {
  clearInterval(aiBackgroundTimer);
  aiBackgroundTimer = setInterval(() => runBackgroundAiAnalysis().catch(() => {}), 15 * 60 * 1000);
  setTimeout(() => runBackgroundAiAnalysis().catch(() => {}), 30 * 1000);
}

async function createImportPreview(filePath) {
  const prepared = await prepareOfxFile(filePath);
  const token = randomUUID();
  const now = Date.now();
  for (const [pendingToken, pending] of pendingImports) {
    if (pending.expiresAt <= now) pendingImports.delete(pendingToken);
  }
  pendingImports.set(token, { prepared, expiresAt: now + 15 * 60 * 1000 });
  return {
    canceled: false,
    token,
    fileName: prepared.batch.fileName,
    account: prepared.account,
    total: prepared.transactions.length,
    sample: prepared.transactions.slice(0, 20).map((transaction) => ({
      date: transaction.postedAt,
      description: transaction.description,
      value: Math.abs(transaction.amountCents) / 100,
      type: transaction.direction,
    })),
  };
}

if (process.env.FINANCEOS_DATA_PATH) {
  app.setPath('userData', process.env.FINANCEOS_DATA_PATH);
}

function createWindow() {
  const productionEntryPath = join(moduleDirectory, '..', 'dist', 'index.html');
  const navigationOptions = { devUrl: process.env.FINANCEOS_DEV_URL || null, productionEntryPath };
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: '#0a0b0f',
    show: false,
    webPreferences: {
      preload: join(moduleDirectory, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (!process.env.FINANCEOS_SMOKE_RESULT) mainWindow.show();
  });
  mainWindow.webContents.once('did-finish-load', async () => {
    if (!process.env.FINANCEOS_SMOKE_RESULT) return;
    try {
      const renderer = await mainWindow.webContents.executeJavaScript(`
        new Promise((resolve, reject) => {
          const deadline = Date.now() + 10000;
          const check = () => {
            const root = document.querySelector('#root');
            const text = document.body?.innerText || '';
            if (root?.children.length && text.includes('FinanceOS')) {
              [...document.querySelectorAll('button')].find((item) => item.textContent.includes('Abrir painel'))?.click();
              const openAssistant = () => {
                const launcher = document.querySelector('[aria-controls="financial-chat-drawer"]');
                if (!launcher && Date.now() < deadline) return setTimeout(openAssistant, 100);
                launcher?.click();
                setTimeout(() => {
                  const workTab = [...document.querySelectorAll('[role="tab"]')].find((item) => item.textContent.trim() === 'Work');
                  workTab?.click();
                  setTimeout(() => resolve({
                    ready: true,
                    title: document.title,
                    textLength: document.body?.innerText?.length || 0,
                    droppedOfxBridge: typeof window.financeOS?.imports?.prepareDroppedOfx === 'function',
                    workModeVisible: Boolean(workTab),
                  }), 100);
                }, 100);
              };
              openAssistant();
            } else if (Date.now() >= deadline) {
              reject(new Error('A interface React não ficou pronta a tempo.'));
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        })
      `, true);
      const smokeSecretKey = 'smoke:credential';
      await secretStore.set(smokeSecretKey, 'round-trip');
      const secretStorageRoundTrip = await secretStore.get(smokeSecretKey) === 'round-trip';
      await secretStore.remove(smokeSecretKey);
      if (process.env.FINANCEOS_SMOKE_SCREENSHOT) {
        mainWindow.showInactive();
        await new Promise((resolve) => setTimeout(resolve, 250));
        const screenshot = await mainWindow.webContents.capturePage();
        writeFileSync(process.env.FINANCEOS_SMOKE_SCREENSHOT, screenshot.toPNG());
        mainWindow.hide();
      }
      writeFileSync(process.env.FINANCEOS_SMOKE_RESULT, JSON.stringify({
        ok: true,
        version: app.getVersion(),
        transactionCount: database.listTransactions().length,
        categoryCount: database.listCategories().length,
        databasePath: database.filePath,
        secretStorageRoundTrip,
        renderer,
      }, null, 2));
    } catch (error) {
      writeFileSync(process.env.FINANCEOS_SMOKE_RESULT, JSON.stringify({ ok: false, error: error.message }, null, 2));
    } finally {
      app.quit();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(denyWindowOpen);
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url, navigationOptions)) event.preventDefault();
  });
  mainWindow.webContents.on('will-redirect', (event, url) => {
    if (!isAllowedNavigation(url, navigationOptions)) event.preventDefault();
  });

  if (process.env.FINANCEOS_DEV_URL) {
    mainWindow.loadURL(process.env.FINANCEOS_DEV_URL);
  } else {
    mainWindow.loadFile(productionEntryPath);
  }
}

function registerIpc() {
  const handle = createTrustedIpcRegistrar(ipcMain, {
    getMainWindow: () => mainWindow,
    devUrl: process.env.FINANCEOS_DEV_URL || null,
    productionEntryPath: join(moduleDirectory, '..', 'dist', 'index.html'),
  });

  handle('app:get-info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    desktop: true,
    dataPath: app.getPath('userData'),
  }));

  handle('transactions:list', () => database.listTransactions());
  handle('transactions:create', (_, input) => database.createTransaction(validateTransactionInput(input)));
  handle('transactions:delete', (_, id) => database.deleteTransaction(requireString(id, 'ID', { max: 100 })));
  handle('transactions:categorize', (_, value) => {
    const input = requireObject(value);
    return database.categorizeTransaction(
      requireString(input.id, 'ID', { max: 100 }),
      requireString(input.categoryId, 'Categoria', { max: 100 }),
      { learn: Boolean(input.learn) },
    );
  });
  handle('transactions:reconcile', (_, id) => database.reconcileTransaction(requireString(id, 'ID', { max: 100 })));
  handle('categories:list', (_, type) => database.listCategories(type || null));
  handle('categories:create', (_, value) => {
    const input = requireObject(value, 'Categoria');
    const type = requireString(input.type, 'Tipo', { max: 20 });
    if (!['income', 'expense'].includes(type)) throw new Error('Tipo de categoria inválido.');
    return database.createCategory({ name: requireString(input.name, 'Nome', { max: 100 }), type, color: input.color || null });
  });
  handle('accounts:list', () => database.listAccounts());
  handle('accounts:create', (_, value) => {
    const input = requireObject(value, 'Conta');
    return database.createBankAccount({
      name: requireString(input.name, 'Nome', { max: 100 }),
      institution: input.institution ? requireString(input.institution, 'Instituição', { max: 100 }) : null,
      externalKey: input.externalKey ? requireString(input.externalKey, 'Identificador externo', { max: 150 }) : null,
      currency: 'BRL',
    });
  });
  handle('rules:list', () => database.listRules());
  handle('rules:create', (_, input) => database.createRule(validateRuleInput(input)));
  handle('rules:delete', (_, id) => database.deleteRule(requireString(id, 'ID', { max: 100 })));
  handle('rules:preview-pending', () => database.previewPendingRuleMatches());
  handle('rules:apply-pending', (_, value) => {
    const input = requireObject(value || {}, 'Decisões de classificação');
    if (!Array.isArray(input.approvedSuggestionIds) || input.approvedSuggestionIds.length > 1000) throw new Error('Lista de confirmações inválida.');
    const approvedSuggestionIds = input.approvedSuggestionIds.map((id) => requireString(id, 'Transação', { max: 100 }));
    return database.applyPendingRuleMatches({ approvedSuggestionIds });
  });
  handle('ai:get-config', async () => {
    const connector = getAiConnector();
    const raw = connector ? database.db.prepare('SELECT secret_key FROM connectors WHERE id = ?').get(connector.id) : null;
    const hasApiKey = Boolean(raw?.secret_key && await secretStore.get(raw.secret_key));
    return connector ? { ...connector.config, id: connector.id, enabled: connector.enabled, configured: true, hasApiKey } : {
      id: null, enabled: false, configured: false, hasApiKey: false, baseUrl: 'https://api.openai.com/v1', model: '', shareDescriptions: true,
    };
  });
  handle('ai:save-config', async (_, value) => {
    const input = requireObject(value, 'Configuração de IA');
    const baseUrl = requireString(input.baseUrl, 'URL base', { max: 500 }).replace(/\/+$/, '');
    let parsedUrl;
    try { parsedUrl = new URL(baseUrl); } catch { throw new Error('Informe uma URL base válida.'); }
    const localHost = ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname);
    if (parsedUrl.protocol !== 'https:' && !(localHost && parsedUrl.protocol === 'http:')) {
      throw new Error('Use HTTPS. HTTP é permitido somente para provedores locais.');
    }
    const current = getAiConnector();
    const apiKey = input.apiKey ? requireString(input.apiKey, 'Chave da API', { max: 8192 }) : null;
    if (!current && !apiKey) throw new Error('Informe a chave da API.');
    const id = current?.id || randomUUID();
    const raw = current ? database.db.prepare('SELECT secret_key FROM connectors WHERE id = ?').get(current.id) : null;
    const secretKey = raw?.secret_key || `ai-provider:${id}:api-key`;
    if (apiKey) await secretStore.set(secretKey, apiKey);
    const saved = database.saveConnector({
      id, type: 'ai-provider', name: 'Assistente de IA', enabled: Boolean(input.enabled), secretKey,
      config: {
        baseUrl,
        model: requireString(input.model, 'Modelo', { max: 150 }),
        shareDescriptions: input.shareDescriptions !== false,
        automaticAnalysis: Boolean(input.automaticAnalysis),
        automaticIntervalHours: [24, 72, 168].includes(Number(input.automaticIntervalHours)) ? Number(input.automaticIntervalHours) : 24,
        lastAutomaticAnalysisAt: current?.config.lastAutomaticAnalysisAt || null,
        lastAutomaticAnalysis: current?.config.lastAutomaticAnalysis || null,
        lastAutomaticError: current?.config.lastAutomaticError || null,
      },
    });
    configureAiBackground();
    return { ...saved.config, id: saved.id, enabled: saved.enabled, configured: true, hasApiKey: true };
  });
  handle('ai:test', async () => (await createAiProvider({ requireEnabled: false })).healthCheck());
  handle('ai:analyze', async (_, value) => {
    if (aiInteractiveRunning || aiBackgroundRunning) throw new Error('Já existe uma consulta de IA em andamento. Aguarde a conclusão.');
    aiInteractiveRunning = true;
    try {
    const input = requireObject(value, 'Análise');
    if (!Array.isArray(input.transactions)) throw new Error('Lista de transações inválida.');
    const connector = getAiConnector();
    const shareDescriptions = connector?.config.shareDescriptions !== false;
    const transactions = sanitizeAiTransactions(input.transactions, shareDescriptions);
    if (!transactions.length) throw new Error('Não há transações válidas neste período para analisar.');
    const provider = await createAiProvider();
    return await provider.analyze({
      transactions,
      categories: database.listCategories(),
      existingRules: database.listRules(),
      allowRuleSuggestions: shareDescriptions,
      periodLabel: String(input.periodLabel || 'período selecionado').slice(0, 100),
    });
    } finally { aiInteractiveRunning = false; }
  });
  handle('ai:chat', async (_, value) => {
    if (aiInteractiveRunning || aiBackgroundRunning) throw new Error('Já existe uma consulta de IA em andamento. Aguarde a conclusão.');
    aiInteractiveRunning = true;
    try {
    const input = requireObject(value, 'Pergunta');
    if (!Array.isArray(input.transactions)) throw new Error('Lista de transações inválida.');
    const question = requireString(input.question, 'Pergunta', { max: 1000 });
    const connector = getAiConnector();
    const transactions = sanitizeAiTransactions(input.transactions, connector?.config.shareDescriptions !== false);
    if (!transactions.length) throw new Error('Não há transações válidas neste período para responder.');
    const history = Array.isArray(input.history) ? input.history.slice(-6).map((message) => {
      const item = requireObject(message, 'Mensagem');
      const role = requireString(item.role, 'Papel', { max: 20 });
      if (!['user', 'assistant'].includes(role)) throw new Error('Papel de mensagem inválido.');
      return { role, content: requireString(item.content, 'Conteúdo', { max: 800 }) };
    }) : [];
    return await (await createAiProvider()).chat({ question, transactions, periodLabel: String(input.periodLabel || 'período selecionado').slice(0, 100), history });
    } finally { aiInteractiveRunning = false; }
  });
  handle('ai:work-preview', async (_, value) => {
    if (aiInteractiveRunning || aiBackgroundRunning) throw new Error('Já existe uma consulta de IA em andamento. Aguarde a conclusão.');
    aiInteractiveRunning = true;
    try {
      const input = requireObject(value, 'Atividade');
      const question = requireString(input.question, 'Atividade', { max: 1000 });
      const candidateIds = new Set(validateCandidateIds(input.transactionIds));
      if (!candidateIds.size) throw new Error('Não há transações neste período para trabalhar.');
      const categories = database.listCategories();
      const plan = await (await createAiProvider()).planWork({
        question,
        categories,
        periodLabel: String(input.periodLabel || 'período selecionado').slice(0, 100),
      });
      if (!plan.action) return { proposal: null, message: plan.message };

      const category = findWorkCategory(categories, plan.categoryName);
      if (!category) throw new Error(`A categoria “${plan.categoryName}” não existe. Crie ou escolha uma categoria disponível.`);
      if (plan.direction && ![plan.direction, 'both'].includes(category.type)) throw new Error('A categoria sugerida não corresponde ao tipo de movimentação solicitado.');
      const direction = plan.direction || (category.type === 'both' ? null : category.type);
      const candidates = database.listTransactions().filter((transaction) => candidateIds.has(transaction.id));
      const matching = candidates.filter((transaction) => (
        !['reconciled', 'ignored'].includes(transaction.status)
        && (!direction || transaction.type === direction)
        && [transaction.type, 'both'].includes(category.type)
        && workDescriptionMatches(transaction.description, plan.operator, plan.pattern)
      ));
      const matchingAllStatuses = candidates.filter((transaction) => (
        (!direction || transaction.type === direction)
        && [transaction.type, 'both'].includes(category.type)
        && workDescriptionMatches(transaction.description, plan.operator, plan.pattern)
      ));
      const token = matching.length ? randomUUID() : null;
      if (token) {
        cleanExpiredAiWork();
        pendingAiWork.set(token, {
          transactionIds: matching.map((transaction) => transaction.id),
          categoryId: category.id,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });
      }
      return {
        proposal: {
          token,
          action: plan.action,
          operator: plan.operator,
          pattern: plan.pattern,
          categoryId: category.id,
          categoryName: category.name,
          count: matching.length,
          skipped: matchingAllStatuses.length - matching.length,
          totalValue: Math.round(matching.reduce((sum, transaction) => sum + transaction.value, 0) * 100) / 100,
          samples: matching.slice(0, 5).map((transaction) => ({ id: transaction.id, description: transaction.description, date: transaction.date, value: transaction.value })),
          message: plan.message,
        },
      };
    } finally { aiInteractiveRunning = false; }
  });
  handle('ai:work-execute', (_, value) => {
    const input = requireObject(value, 'Confirmação');
    const token = requireString(input.token, 'Confirmação', { max: 100 });
    cleanExpiredAiWork();
    const pending = pendingAiWork.get(token);
    if (!pending) throw new Error('Esta prévia expirou ou já foi utilizada. Gere uma nova prévia.');
    pendingAiWork.delete(token);
    return database.categorizeTransactions(pending.transactionIds, pending.categoryId);
  });
  handle('ai:get-background', () => {
    const connector = getAiConnector();
    return { enabled: Boolean(connector?.enabled && connector?.config.automaticAnalysis), lastAt: connector?.config.lastAutomaticAnalysisAt || null, result: connector?.config.lastAutomaticAnalysis || null, error: connector?.config.lastAutomaticError || null };
  });
  handle('imports:list-batches', () => database.listImportBatches());

  handle('imports:select-ofx', async () => {
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: 'Importar extrato OFX',
      properties: ['openFile'],
      filters: [{ name: 'Extrato OFX', extensions: ['ofx', 'qfx'] }],
    });
    if (selection.canceled || !selection.filePaths[0]) return { canceled: true };
    return createImportPreview(selection.filePaths[0]);
  });
  handle('imports:prepare-dropped-ofx', (_, filePathValue) => createImportPreview(
    requireString(filePathValue, 'Caminho do arquivo', { max: 32767 }),
  ));
  handle('imports:commit-ofx', (_, tokenValue) => {
    const token = requireString(tokenValue, 'Token de importação', { max: 100 });
    const pending = pendingImports.get(token);
    if (!pending || pending.expiresAt <= Date.now()) {
      pendingImports.delete(token);
      throw new Error('A prévia expirou. Selecione o arquivo novamente.');
    }
    pendingImports.delete(token);
    return database.importNormalizedTransactions(pending.prepared);
  });

  handle('backups:create', async () => {
    const defaultName = `financeos-backup-${new Date().toISOString().slice(0, 10)}.db`;
    const selection = await dialog.showSaveDialog(mainWindow, {
      title: 'Salvar backup do FinanceOS',
      defaultPath: join(app.getPath('documents'), defaultName),
      filters: [{ name: 'Banco FinanceOS', extensions: ['db'] }],
    });
    if (selection.canceled || !selection.filePath) return { canceled: true };
    if (existsSync(selection.filePath)) throw new Error('Escolha um novo nome para o backup.');
    await createDatabaseBackup(database, selection.filePath);
    return { canceled: false, filePath: selection.filePath };
  });

  handle('backups:restore', async () => {
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: 'Restaurar backup do FinanceOS',
      properties: ['openFile'],
      filters: [{ name: 'Banco FinanceOS', extensions: ['db'] }],
    });
    if (selection.canceled || !selection.filePaths[0]) return { canceled: true };
    const confirmation = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Restaurar backup',
      message: 'Os dados atuais serão substituídos e o aplicativo será reiniciado.',
      detail: 'Uma cópia de segurança automática será criada antes da restauração.',
      buttons: ['Cancelar', 'Restaurar'],
      defaultId: 0,
      cancelId: 0,
    });
    if (confirmation.response !== 1) return { canceled: true };
    const databasePath = join(app.getPath('userData'), 'financeos.db');
    const safetyBackup = join(app.getPath('userData'), `financeos-before-restore-${Date.now()}.db`);
    await restoreDatabaseBackup({ database, source: selection.filePaths[0], destination: databasePath, safetyBackup });
    app.relaunch();
    app.exit(0);
    return { canceled: false };
  });

  handle('connectors:list', () => database.listConnectors());
  handle('connectors:save', async (_, value) => {
    const input = requireObject(value, 'Conector');
    const type = requireString(input.type, 'Tipo', { max: 50 });
    if (!['questor-syn', 'local-api'].includes(type)) throw new Error('Tipo de conector não suportado.');
    const id = input.id || randomUUID();
    const current = input.id
      ? database.db.prepare('SELECT secret_key FROM connectors WHERE id = ?').get(input.id)
      : null;
    const secretKey = current?.secret_key || `connector:${id}:token`;
    const existingToken = current?.secret_key ? await secretStore.get(current.secret_key) : null;
    const token = input.token ? requireString(input.token, 'Token', { max: 4096 }) : existingToken;
    const config = requireObject(input.config || {}, 'Configuração');
    if (type === 'local-api') {
      const host = String(config.host || '127.0.0.1').trim().toLowerCase();
      const port = Number(config.port);
      if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
        throw new Error('Por segurança, a API deve escutar somente no computador local.');
      }
      if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('A porta deve estar entre 1024 e 65535.');
      if (input.enabled && !token) throw new Error('Crie um token antes de habilitar a API local.');
    }
    if (input.token) await secretStore.set(secretKey, token);
    const saved = database.saveConnector({
      id,
      type,
      name: requireString(input.name, 'Nome', { max: 100 }),
      enabled: Boolean(input.enabled),
      config,
      secretKey: input.token ? secretKey : current?.secret_key || null,
    });
    if (saved.type === 'local-api') {
      try {
        await configureLocalApi();
      } catch (error) {
        database.saveConnector({ ...saved, enabled: false, secretKey: null });
        throw new Error(`A API local foi desabilitada porque não pôde iniciar: ${error.message}`);
      }
    }
    return saved;
  });
  handle('connectors:test', async (_, id) => {
    const connectorRow = database.listConnectors().find((item) => item.id === id);
    if (!connectorRow) throw new Error('Conector não encontrado.');
    const raw = database.db.prepare('SELECT secret_key FROM connectors WHERE id = ?').get(id);
    const token = raw?.secret_key ? await secretStore.get(raw.secret_key) : null;
    const connector = connectorRegistry.create(connectorRow.type, { ...connectorRow.config, token });
    return connector.testConnection();
  });
  handle('connectors:list-mappings', (_, value) => {
    const input = requireObject(value);
    return database.listExternalMappings(
      requireString(input.id, 'Conector', { max: 100 }),
      requireString(input.entityType, 'Tipo de entidade', { max: 50 }),
    );
  });
  handle('connectors:save-mapping', (_, value) => {
    const input = requireObject(value);
    return database.saveExternalMapping({
      connectorId: requireString(input.connectorId, 'Conector', { max: 100 }),
      entityType: requireString(input.entityType, 'Tipo de entidade', { max: 50 }),
      localId: requireString(input.localId, 'ID local', { max: 100 }),
      externalId: requireString(input.externalId, 'Código externo', { max: 100 }),
    });
  });
  handle('connectors:push', async (_, idValue) => {
    const id = requireString(idValue, 'Conector', { max: 100 });
    const connectorRow = database.listConnectors().find((item) => item.id === id);
    if (!connectorRow) throw new Error('Conector não encontrado.');
    if (!connectorRow.enabled) throw new Error('Habilite o conector antes de sincronizar.');
    if (connectorRow.type !== 'questor-syn') throw new Error('Este conector não oferece exportação contábil.');
    const raw = database.db.prepare('SELECT secret_key FROM connectors WHERE id = ?').get(id);
    const token = raw?.secret_key ? await secretStore.get(raw.secret_key) : null;
    const connector = connectorRegistry.create(connectorRow.type, { ...connectorRow.config, token });
    const entries = database.listPendingAccountingEntries(id).map((entry) => ({
      ...entry,
      historyCode: connectorRow.config.defaultHistoryCode || entry.historyCode,
    }));
    const mappings = Object.fromEntries(database.listExternalMappings(id, 'ledger_account').map((item) => [item.local_id, item.external_id]));
    const missing = [...new Set(entries.flatMap((entry) => [entry.debitAccountId, entry.creditAccountId]).filter((accountId) => !mappings[accountId]))];
    if (missing.length) throw new Error(`Existem ${missing.length} contas sem mapeamento para o Questor.`);
    if (!entries.length) return { accepted: 0, rejected: 0, message: 'Nenhum lançamento pendente.' };
    const syncRunId = database.startSyncRun(id, 'push');
    try {
      const result = await connector.push({ entries, mapping: mappings });
      const confirmation = validateQuestorConfirmation(result, entries.map((entry) => entry.id));
      const acceptedIds = confirmation.acceptedIds;
      database.markAccountingEntriesExported(id, acceptedIds, syncRunId);
      database.finishSyncRun(syncRunId, { status: 'completed', processedCount: acceptedIds.length });
      return { ...result, ...confirmation };
    } catch (error) {
      database.finishSyncRun(syncRunId, { status: 'failed', errorMessage: error.message });
      throw error;
    }
  });
}

async function configureLocalApi() {
  if (!localApiServer) localApiServer = new LocalApiServer(database);
  const connector = database.listConnectors().find((item) => item.type === 'local-api');
  if (!connector?.enabled) {
    await localApiServer.stop();
    return;
  }
  const raw = database.db.prepare('SELECT secret_key FROM connectors WHERE id = ?').get(connector.id);
  const token = raw?.secret_key ? await secretStore.get(raw.secret_key) : null;
  await localApiServer.start({ ...connector.config, token });
}

app.whenReady().then(() => {
  const dataPath = app.getPath('userData');
  database = new FinanceDatabase(join(dataPath, 'financeos.db'));
  secretStore = new SecretStore(join(dataPath, 'credentials.json'), safeStorage);
  registerIpc();
  configureLocalApi().catch((error) => console.error('Não foi possível iniciar a API local:', error));
  configureAiBackground();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', (event) => {
  clearInterval(aiBackgroundTimer);
  if (shutdownStarted) return;
  if (localApiServer?.server) {
    event.preventDefault();
    shutdownStarted = true;
    localApiServer.stop().finally(() => {
      if (database) {
        database.close();
        database = null;
      }
      app.quit();
    });
    return;
  }
  if (database) {
    database.close();
    database = null;
  }
});
