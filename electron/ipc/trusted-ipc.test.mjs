import assert from 'node:assert/strict';
import test from 'node:test';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTrustedIpcRegistrar, isTrustedIpcEvent } from './trusted-ipc.mjs';

function fixture(url) {
  const mainFrame = { url };
  const webContents = { mainFrame, isDestroyed: () => false };
  const mainWindow = { webContents, isDestroyed: () => false };
  return { mainWindow, event: { sender: webContents, senderFrame: mainFrame } };
}

test('accepts only the main window main frame on the configured development origin', () => {
  const { mainWindow, event } = fixture('http://127.0.0.1:5173/#/finance');
  const options = { mainWindow, devUrl: 'http://127.0.0.1:5173' };

  assert.equal(isTrustedIpcEvent(event, options), true);
  assert.equal(isTrustedIpcEvent({ ...event, sender: {} }, options), false);
  assert.equal(isTrustedIpcEvent({ ...event, senderFrame: { url: event.senderFrame.url } }, options), false);
  assert.equal(isTrustedIpcEvent({ sender: event.sender, senderFrame: { url: 'http://evil.test/' } }, options), false);
});

test('accepts only the production index file, ignoring its route hash', () => {
  const productionEntryPath = join('C:', 'FinanceOS', 'resources', 'app', 'dist', 'index.html');
  const entryUrl = `${pathToFileURL(productionEntryPath).href}#/finance`;
  const { mainWindow, event } = fixture(entryUrl);

  assert.equal(isTrustedIpcEvent(event, { mainWindow, productionEntryPath }), true);
  event.senderFrame.url = pathToFileURL(join('C:', 'FinanceOS', 'resources', 'app', 'other.html')).href;
  assert.equal(isTrustedIpcEvent(event, { mainWindow, productionEntryPath }), false);
});

test('registrar rejects untrusted events before invoking the handler', async () => {
  let registered;
  let invoked = false;
  const ipcMain = { handle: (channel, listener) => { registered = { channel, listener }; } };
  const { mainWindow } = fixture('http://127.0.0.1:5173/');
  const handle = createTrustedIpcRegistrar(ipcMain, {
    getMainWindow: () => mainWindow,
    devUrl: 'http://127.0.0.1:5173',
  });
  handle('test:channel', () => { invoked = true; });

  assert.throws(() => registered.listener({ sender: {}, senderFrame: {} }), /origem não confiável/);
  assert.equal(registered.channel, 'test:channel');
  assert.equal(invoked, false);
});

test('registrar preserves handler arguments and result for trusted events', async () => {
  let listener;
  const ipcMain = { handle: (_, registered) => { listener = registered; } };
  const { mainWindow, event } = fixture('http://127.0.0.1:5173/');
  const handle = createTrustedIpcRegistrar(ipcMain, {
    getMainWindow: () => mainWindow,
    devUrl: 'http://127.0.0.1:5173',
  });
  handle('sum', (_, left, right) => left + right);

  assert.equal(await listener(event, 2, 3), 5);
});
