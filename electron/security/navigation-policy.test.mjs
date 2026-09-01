import assert from 'node:assert/strict';
import test from 'node:test';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { denyWindowOpen, isAllowedNavigation } from './navigation-policy.mjs';

test('development navigation requires the exact configured origin', () => {
  const options = { devUrl: 'http://127.0.0.1:5173' };
  assert.equal(isAllowedNavigation('http://127.0.0.1:5173/#/finance', options), true);
  assert.equal(isAllowedNavigation('http://127.0.0.1:5173.evil.test/', options), false);
  assert.equal(isAllowedNavigation('http://localhost:5173/', options), false);
  assert.equal(isAllowedNavigation('https://127.0.0.1:5173/', options), false);
});

test('production navigation allows only the packaged index file', () => {
  const productionEntryPath = join('C:', 'FinanceOS', 'dist', 'index.html');
  const entry = pathToFileURL(productionEntryPath).href;
  assert.equal(isAllowedNavigation(`${entry}#/finance`, { productionEntryPath }), true);
  assert.equal(isAllowedNavigation(pathToFileURL(join('C:', 'FinanceOS', 'dist', 'other.html')).href, { productionEntryPath }), false);
  assert.equal(isAllowedNavigation('https://example.test/', { productionEntryPath }), false);
});

test('new windows are denied for every destination', () => {
  assert.deepEqual(denyWindowOpen('https://example.test/'), { action: 'deny' });
  assert.deepEqual(denyWindowOpen('file:///tmp/index.html'), { action: 'deny' });
});
