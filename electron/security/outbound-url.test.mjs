import assert from 'node:assert/strict';
import test from 'node:test';
import { validateOutboundUrl } from './outbound-url.mjs';

test('aceita HTTPS público e localhost explicitamente permitido', () => {
  assert.equal(validateOutboundUrl('https://api.groq.com/openai/v1', { service: 'IA', allowLocalhost: true }).hostname, 'api.groq.com');
  assert.equal(validateOutboundUrl('http://localhost:11434/v1', { service: 'IA', allowLocalhost: true }).hostname, 'localhost');
});

test('bloqueia protocolos, credenciais e destinos internos', () => {
  assert.throws(() => validateOutboundUrl('http://api.example.com/v1', { service: 'IA', allowLocalhost: true }), /HTTPS/);
  assert.throws(() => validateOutboundUrl('https://user:pass@example.com/v1', { service: 'IA' }), /credenciais/);
  assert.throws(() => validateOutboundUrl('https://169.254.169.254/latest', { service: 'IA' }), /privado/);
  assert.throws(() => validateOutboundUrl('https://192.168.1.10/api', { service: 'Questor' }), /privado/);
  assert.throws(() => validateOutboundUrl('https://metadata.google.internal/', { service: 'IA' }), /interna/);
});
