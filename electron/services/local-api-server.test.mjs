import test from 'node:test';
import assert from 'node:assert/strict';
import { FinanceDatabase } from '../database/finance-database.mjs';
import { LocalApiServer } from './local-api-server.mjs';

test('API local exige token e deduplica por externalId', async () => {
  const database = new FinanceDatabase(':memory:');
  const server = new LocalApiServer(database);
  const address = await server.start({ host: '127.0.0.1', port: 0, token: 'test-token' });
  const endpoint = `http://127.0.0.1:${address.port}/v1/transactions`;
  try {
    const unauthorized = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ externalId: 'api-1', value: 10, type: 'expense', date: '2026-08-01' }),
    });
    assert.equal(unauthorized.status, 401);

    const request = () => fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test-token' },
      body: JSON.stringify({ externalId: 'api-1', value: 10, type: 'expense', date: '2026-08-01', description: 'Tarifa' }),
    }).then((response) => response.json());
    assert.deepEqual(await request(), { accepted: 1, duplicates: 0 });
    assert.deepEqual(await request(), { accepted: 0, duplicates: 1 });
  } finally {
    await server.stop();
    database.close();
  }
});

test('API local rejeita o lote inteiro quando um registro é inválido', async () => {
  const database = new FinanceDatabase(':memory:');
  const server = new LocalApiServer(database);
  const address = await server.start({ host: '127.0.0.1', port: 0, token: 'test-token' });
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/v1/transactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test-token' },
      body: JSON.stringify([
        { externalId: 'batch-valid', value: 10, type: 'expense', date: '2026-08-01', description: 'Tarifa' },
        { externalId: 'batch-invalid', value: -1, type: 'expense', date: '2026-08-01', description: 'Inválida' },
      ]),
    });
    assert.equal(response.status, 400);
    assert.equal(database.listTransactions().length, 0);
  } finally {
    await server.stop();
    database.close();
  }
});

test('API local limita excesso de requisições por cliente', async () => {
  const database = new FinanceDatabase(':memory:');
  const server = new LocalApiServer(database);
  const address = await server.start({ host: '127.0.0.1', port: 0, token: 'test-token', maxRequestsPerMinute: 2 });
  const endpoint = `http://127.0.0.1:${address.port}/health`;
  try {
    assert.equal((await fetch(endpoint)).status, 200);
    assert.equal((await fetch(endpoint)).status, 200);
    const limited = await fetch(endpoint);
    assert.equal(limited.status, 429);
    assert.match((await limited.json()).error, /Muitas requisições/);
  } finally {
    await server.stop();
    database.close();
  }
});
