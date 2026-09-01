import { deleteTransaction, getAllTransactions, saveTransaction, updateTransaction } from './database';

const fallbackCategories = [
  { id: 'category_income', name: 'Receitas', type: 'income', color: '#63eab4' },
  { id: 'category_suppliers', name: 'Fornecedores e serviços', type: 'expense', color: '#4d9de0' },
  { id: 'category_people', name: 'Pessoal', type: 'expense', color: '#f5c842' },
  { id: 'category_taxes', name: 'Impostos e taxas', type: 'expense', color: '#ff8f70' },
  { id: 'category_financial', name: 'Despesas financeiras', type: 'expense', color: '#a78bfa' },
  { id: 'category_other', name: 'Outras despesas', type: 'expense', color: '#8892a4' },
];

const fallbackAccounts = [
  { id: 'account_checking_default', name: 'Conta bancária principal', kind: 'asset', subtype: 'bank' },
];

const desktop = () => typeof window !== 'undefined' ? window.financeOS : null;

function categoryName(categoryId) {
  return fallbackCategories.find((category) => category.id === categoryId)?.name || null;
}

export const platformApi = {
  isDesktop: () => Boolean(desktop()),
  getAppInfo: () => desktop()?.app.getInfo() || Promise.resolve({ desktop: false, version: 'web', dataPath: null }),
  listTransactions: () => desktop()?.transactions.list() || Promise.resolve(getAllTransactions()),
  createTransaction: (input) => desktop()?.transactions.create(input) || Promise.resolve(saveTransaction({
    ...input,
    category: categoryName(input.categoryId),
    account: fallbackAccounts[0].name,
  })),
  deleteTransaction: (id) => desktop()?.transactions.remove(id) || Promise.resolve(deleteTransaction(id)),
  categorizeTransaction: (id, categoryId, learn = false) => {
    if (desktop()) return desktop().transactions.categorize(id, categoryId, learn);
    return Promise.resolve(updateTransaction(id, {
      categoryId,
      category: categoryName(categoryId),
      status: 'categorized',
    }));
  },
  reconcileTransaction: (id) => desktop()?.transactions.reconcile(id) || Promise.resolve(updateTransaction(id, { status: 'reconciled' })),
  listCategories: (type = null) => desktop()?.categories.list(type) || Promise.resolve(
    fallbackCategories.filter((category) => !type || category.type === type || category.type === 'both'),
  ),
  createCategory: (input) => desktop()?.categories.create(input) || Promise.reject(new Error('Cadastros persistentes estão disponíveis no aplicativo desktop.')),
  listAccounts: () => desktop()?.accounts.list() || Promise.resolve(fallbackAccounts),
  createAccount: (input) => desktop()?.accounts.create(input) || Promise.reject(new Error('Cadastros persistentes estão disponíveis no aplicativo desktop.')),
  selectOfx: () => desktop()?.imports.selectOfx() || Promise.reject(new Error('A importação OFX está disponível no aplicativo desktop.')),
  prepareDroppedOfx: (file) => desktop()?.imports.prepareDroppedOfx(file) || Promise.reject(new Error('Arrastar arquivos OFX está disponível no aplicativo desktop.')),
  commitOfx: (token) => desktop()?.imports.commitOfx(token) || Promise.reject(new Error('A importação OFX está disponível no aplicativo desktop.')),
  listImportBatches: () => desktop()?.imports.listBatches() || Promise.resolve([]),
  listRules: () => desktop()?.rules.list() || Promise.resolve([]),
  createRule: (input) => desktop()?.rules.create(input) || Promise.reject(new Error('As regras persistentes estão disponíveis no aplicativo desktop.')),
  deleteRule: (id) => desktop()?.rules.remove(id) || Promise.resolve(false),
  previewPendingRules: () => desktop()?.rules.previewPending() || Promise.reject(new Error('A aplicação retroativa de regras está disponível no aplicativo desktop.')),
  applyPendingRules: (input) => desktop()?.rules.applyPending(input) || Promise.reject(new Error('A aplicação retroativa de regras está disponível no aplicativo desktop.')),
  getAiConfig: () => desktop()?.ai.getConfig() || Promise.resolve({ enabled: false, configured: false, baseUrl: '', model: '' }),
  saveAiConfig: (input) => desktop()?.ai.saveConfig(input) || Promise.reject(new Error('A integração com IA está disponível no aplicativo desktop.')),
  testAi: () => desktop()?.ai.test() || Promise.reject(new Error('A integração com IA está disponível no aplicativo desktop.')),
  analyzeWithAi: (input) => desktop()?.ai.analyze(input) || Promise.reject(new Error('A análise com IA está disponível no aplicativo desktop.')),
  chatWithAi: (input) => desktop()?.ai.chat(input) || Promise.reject(new Error('O chat financeiro está disponível no aplicativo desktop.')),
  previewAiWork: (input) => desktop()?.ai.previewWork(input) || Promise.reject(new Error('O modo Work está disponível no aplicativo desktop.')),
  executeAiWork: (input) => desktop()?.ai.executeWork(input) || Promise.reject(new Error('O modo Work está disponível no aplicativo desktop.')),
  getAiBackground: () => desktop()?.ai.getBackground() || Promise.resolve({ enabled: false, result: null }),
  createBackup: () => desktop()?.backups.create() || Promise.reject(new Error('Backups estão disponíveis no aplicativo desktop.')),
  restoreBackup: () => desktop()?.backups.restore() || Promise.reject(new Error('Restauração está disponível no aplicativo desktop.')),
  listConnectors: () => desktop()?.connectors.list() || Promise.resolve([]),
  saveConnector: (input) => desktop()?.connectors.save(input) || Promise.reject(new Error('Conectores estão disponíveis no aplicativo desktop.')),
  testConnector: (id) => desktop()?.connectors.test(id) || Promise.reject(new Error('Conectores estão disponíveis no aplicativo desktop.')),
  listConnectorMappings: (id, entityType) => desktop()?.connectors.listMappings(id, entityType) || Promise.resolve([]),
  saveConnectorMapping: (input) => desktop()?.connectors.saveMapping(input) || Promise.reject(new Error('Mapeamentos estão disponíveis no aplicativo desktop.')),
  pushConnector: (id) => desktop()?.connectors.push(id) || Promise.reject(new Error('Sincronização está disponível no aplicativo desktop.')),
};
