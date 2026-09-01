import assert from 'node:assert/strict';
import test from 'node:test';
import { buildContentSecurityPolicy } from './content-security-policy.mjs';

test('production CSP blocks network connections and unsafe eval', () => {
  const policy = buildContentSecurityPolicy();
  assert.match(policy, /connect-src 'none'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /frame-src 'none'/);
  assert.doesNotMatch(policy, /unsafe-eval|ws:/);
});

test('development CSP allows only local Vite HTTP and websocket connections', () => {
  const policy = buildContentSecurityPolicy({ development: true });
  assert.match(policy, /http:\/\/127\.0\.0\.1:\*/);
  assert.match(policy, /ws:\/\/localhost:\*/);
  assert.doesNotMatch(policy, /unsafe-eval/);
});
