const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('financeOS', Object.freeze({
  app: Object.freeze({
    getInfo: () => ipcRenderer.invoke('app:get-info'),
  }),
  transactions: Object.freeze({
    list: () => ipcRenderer.invoke('transactions:list'),
    create: (input) => ipcRenderer.invoke('transactions:create', input),
    remove: (id) => ipcRenderer.invoke('transactions:delete', id),
    categorize: (id, categoryId, learn = false) => ipcRenderer.invoke('transactions:categorize', { id, categoryId, learn }),
    reconcile: (id) => ipcRenderer.invoke('transactions:reconcile', id),
  }),
  categories: Object.freeze({
    list: (type) => ipcRenderer.invoke('categories:list', type),
    create: (input) => ipcRenderer.invoke('categories:create', input),
  }),
  accounts: Object.freeze({
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (input) => ipcRenderer.invoke('accounts:create', input),
  }),
  imports: Object.freeze({
    selectOfx: () => ipcRenderer.invoke('imports:select-ofx'),
    prepareDroppedOfx: (file) => ipcRenderer.invoke('imports:prepare-dropped-ofx', webUtils.getPathForFile(file)),
    commitOfx: (token) => ipcRenderer.invoke('imports:commit-ofx', token),
    listBatches: () => ipcRenderer.invoke('imports:list-batches'),
  }),
  rules: Object.freeze({
    list: () => ipcRenderer.invoke('rules:list'),
    create: (input) => ipcRenderer.invoke('rules:create', input),
    remove: (id) => ipcRenderer.invoke('rules:delete', id),
    previewPending: () => ipcRenderer.invoke('rules:preview-pending'),
    applyPending: (input) => ipcRenderer.invoke('rules:apply-pending', input),
  }),
  ai: Object.freeze({
    getConfig: () => ipcRenderer.invoke('ai:get-config'),
    saveConfig: (input) => ipcRenderer.invoke('ai:save-config', input),
    test: () => ipcRenderer.invoke('ai:test'),
    analyze: (input) => ipcRenderer.invoke('ai:analyze', input),
    chat: (input) => ipcRenderer.invoke('ai:chat', input),
    previewWork: (input) => ipcRenderer.invoke('ai:work-preview', input),
    executeWork: (input) => ipcRenderer.invoke('ai:work-execute', input),
    getBackground: () => ipcRenderer.invoke('ai:get-background'),
  }),
  backups: Object.freeze({
    create: () => ipcRenderer.invoke('backups:create'),
    restore: () => ipcRenderer.invoke('backups:restore'),
  }),
  connectors: Object.freeze({
    list: () => ipcRenderer.invoke('connectors:list'),
    save: (input) => ipcRenderer.invoke('connectors:save', input),
    test: (id) => ipcRenderer.invoke('connectors:test', id),
    listMappings: (id, entityType) => ipcRenderer.invoke('connectors:list-mappings', { id, entityType }),
    saveMapping: (input) => ipcRenderer.invoke('connectors:save-mapping', input),
    push: (id) => ipcRenderer.invoke('connectors:push', id),
  }),
}));
