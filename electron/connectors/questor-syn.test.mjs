import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestorAccountingData, buildQuestorSynPayload, QuestorSynConnector, validateQuestorConfirmation } from './questor-syn.mjs';

const entry = {
  id: 'entry-1',
  date: '2026-08-01',
  debitAccountId: 'bank',
  creditAccountId: 'income',
  amountCents: 125050,
  historyCode: '22',
  description: 'Recebimento Cliente ACME',
};

test('gera layout contábil Questor com CRLF e contas mapeadas', () => {
  const data = buildQuestorAccountingData([entry], { bank: '10', income: '20' }, '12.345.678/0001-00');
  assert.match(data, /^C;/);
  assert.match(data, /Q10/);
  assert.match(data, /Q20/);
  assert.match(data, /0000000001250,50/);
});

test('exige HTTPS fora do computador local', () => {
  const connector = new QuestorSynConnector({ baseUrl: 'http://questor.example', accountingPath: '/push', clientDocument: '1' });
  assert.throws(() => connector.endpoint('/push'), /HTTPS/i);
  const local = new QuestorSynConnector({ baseUrl: 'http://127.0.0.1:9999', accountingPath: '/push', clientDocument: '1' });
  assert.equal(local.endpoint('/push').hostname, '127.0.0.1');
});

test('headers customizados não sobrescrevem autorização', () => {
  const connector = new QuestorSynConnector({ token: 'seguro', headers: { authorization: 'Bearer atacante', 'x-api-key': 'permitida', cookie: 'bloqueado' } });
  assert.equal(connector.headers().authorization, 'Bearer seguro');
  assert.equal(connector.headers()['x-api-key'], 'permitida');
  assert.equal(connector.headers().cookie, undefined);
});

test('gera envelope SYN sem depender de credencial', () => {
  const payload = buildQuestorSynPayload({
    clientDocument: '12.345.678/0001-00',
    accountantDocuments: ['98.765.432/0001-00'],
    entries: [entry],
    mapping: { bank: '10', income: '20' },
  });
  assert.equal(payload.grupoLayout, 100);
  assert.equal(payload.versao, '2.00');
  assert.match(payload.dado, /Recebimento Cliente ACME/);
});

test('valida confirmação parcial e rejeita IDs inválidos', () => {
  assert.deepEqual(validateQuestorConfirmation({ acceptedIds: ['entry-1'] }, ['entry-1', 'entry-2']), {
    accepted: 1, rejected: 1, acceptedIds: ['entry-1'], rejectedIds: ['entry-2'],
  });
  assert.throws(() => validateQuestorConfirmation({ acceptedIds: ['entry-1', 'entry-1'] }, ['entry-1']), /duplicados/);
  assert.throws(() => validateQuestorConfirmation({ acceptedIds: ['desconhecido'] }, ['entry-1']), /desconhecido/);
  assert.throws(() => validateQuestorConfirmation({ acceptedIds: ['entry-1'], rejectedIds: ['entry-1'] }, ['entry-1']), /aceito e rejeitado/);
});

test('push interpreta confirmação parcial retornada pelo Questor', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ acceptedIds: ['entry-1'], rejectedIds: ['entry-2'] }), { status: 200 });
  try {
    const connector = new QuestorSynConnector({ baseUrl: 'http://127.0.0.1:9999', accountingPath: '/push', clientDocument: '1' });
    const result = await connector.push({ entries: [entry, { ...entry, id: 'entry-2' }], mapping: { bank: '10', income: '20' } });
    assert.deepEqual(result.acceptedIds, ['entry-1']);
    assert.deepEqual(result.rejectedIds, ['entry-2']);
    assert.equal(result.accepted, 1);
    assert.equal(result.rejected, 1);
  } finally { globalThis.fetch = originalFetch; }
});
