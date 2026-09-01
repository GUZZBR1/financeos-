import { pathToFileURL } from 'node:url';

const UNTRUSTED_IPC_ERROR = 'Chamada IPC recusada por origem não confiável.';

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isTrustedIpcEvent(event, { mainWindow, devUrl = null, productionEntryPath }) {
  if (!event || !mainWindow || mainWindow.isDestroyed?.()) return false;

  const webContents = mainWindow.webContents;
  const senderFrame = event.senderFrame;
  if (!webContents || webContents.isDestroyed?.()) return false;
  if (event.sender !== webContents || !senderFrame || senderFrame !== webContents.mainFrame) return false;

  const actualUrl = parseUrl(senderFrame.url);
  if (!actualUrl) return false;

  if (devUrl) {
    const expectedDevUrl = parseUrl(devUrl);
    return Boolean(expectedDevUrl && actualUrl.origin === expectedDevUrl.origin);
  }

  if (!productionEntryPath) return false;
  const expectedUrl = new URL(pathToFileURL(productionEntryPath).href);
  return actualUrl.protocol === 'file:' && actualUrl.pathname === expectedUrl.pathname;
}

export function createTrustedIpcRegistrar(ipcMain, options) {
  if (!ipcMain?.handle) throw new TypeError('ipcMain inválido.');
  if (typeof options?.getMainWindow !== 'function') throw new TypeError('getMainWindow é obrigatório.');

  return (channel, listener) => ipcMain.handle(channel, (event, ...args) => {
    const trusted = isTrustedIpcEvent(event, {
      mainWindow: options.getMainWindow(),
      devUrl: options.devUrl,
      productionEntryPath: options.productionEntryPath,
    });
    if (!trusted) throw new Error(UNTRUSTED_IPC_ERROR);
    return listener(event, ...args);
  });
}

export { UNTRUSTED_IPC_ERROR };
