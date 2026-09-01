import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { FinanceDatabase } from './finance-database.mjs';
import { migrations } from './migrations.mjs';
import { parseOfx, hashImportFile } from '../domain/ofx-parser.mjs';

test('cria transação manual e lançamento balanceado', () => {
  const database = new FinanceDatabase(':memory:');
  const transaction = database.createTransaction({
    value: 100,
    type: 'income',
    description: 'Venda local',
    date: '2026-08-01',
    categoryId: 'category_income',
  });
  assert.equal(transaction.value, 100);
  const postings = database.db.prepare(`
    SELECT p.amount_cents FROM postings p
    JOIN journal_entries e ON e.id = p.journal_entry_id
    WHERE e.source_transaction_id = ?
  `).all(transaction.id);
  assert.equal(postings.reduce((sum, row) => sum + Number(row.amount_cents), 0), 0);
  assert.equal(database.reconcileTransaction(transaction.id).status, 'reconciled');
  database.close();
});

test('classifica transações em lote e preserva lançamentos conciliados', () => {
  const database = new FinanceDatabase(':memory:');
  const first = database.createTransaction({ value: 100, type: 'income', description: 'Recebimento cliente A', date: '2026-08-01' });
  const second = database.createTransaction({ value: 200, type: 'income', description: 'Recebimento cliente B', date: '2026-08-02' });
  const reconciled = database.createTransaction({ value: 300, type: 'income', description: 'Recebimento antigo', date: '2026-08-03', categoryId: 'category_income' });
  database.reconcileTransaction(reconciled.id);

  const result = database.categorizeTransactions([first.id, second.id, reconciled.id], 'category_income');
  assert.deepEqual({ updated: result.updated, skipped: result.skipped }, { updated: 2, skipped: 1 });
  assert.equal(database.getTransaction(first.id).categoryId, 'category_income');
  assert.equal(database.getTransaction(second.id).categoryId, 'category_income');
  assert.equal(database.getTransaction(reconciled.id).status, 'reconciled');
  assert.equal(database.db.prepare('SELECT COUNT(*) AS total FROM journal_entries').get().total, 3);
  database.close();
});

test('não duplica o mesmo lote OFX', () => {
  const content = `<OFX><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>1</BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260801<TRNAMT>-10.00<FITID>same-1<NAME>TARIFA</STMTTRN></BANKTRANLIST></OFX>`;
  const parsed = parseOfx(content);
  const database = new FinanceDatabase(':memory:');
  const input = { batch: { sourceType: 'ofx', fileName: 'one.ofx', fileHash: hashImportFile(content) }, ...parsed };
  const first = database.importNormalizedTransactions(input);
  const second = database.importNormalizedTransactions(input);
  assert.equal(first.imported, 1);
  assert.equal(second.alreadyImported, true);
  assert.equal(database.listTransactions().length, 1);
  database.close();
});

test('mantém De/Para e exportação idempotente de lançamentos', () => {
  const database = new FinanceDatabase(':memory:');
  const connector = database.saveConnector({ type: 'questor-syn', name: 'Questor', enabled: true, config: {} });
  const transaction = database.createTransaction({ value: 50, type: 'expense', description: 'Serviço', date: '2026-08-02', categoryId: 'category_suppliers' });
  database.saveExternalMapping({ connectorId: connector.id, entityType: 'ledger_account', localId: 'account_checking_default', externalId: '10' });
  const pending = database.listPendingAccountingEntries(connector.id);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].id.length > 0, true);
  const runId = database.startSyncRun(connector.id, 'push');
  database.markAccountingEntriesExported(connector.id, [pending[0].id], runId);
  database.finishSyncRun(runId, { status: 'completed', processedCount: 1 });
  assert.equal(database.listPendingAccountingEntries(connector.id).length, 0);
  assert.equal(database.getTransaction(transaction.id).status, 'categorized');
  database.close();
});

test('cria conta bancária e categoria com conta contábil vinculada', () => {
  const database = new FinanceDatabase(':memory:');
  const account = database.createBankAccount({ name: 'Banco Teste', institution: '001', externalKey: '001:1:2' });
  const category = database.createCategory({ name: 'Combustível', type: 'expense', color: '#123456' });
  assert.equal(account.subtype, 'bank');
  assert.equal(category.name, 'Combustível');
  const ledger = database.db.prepare('SELECT * FROM ledger_accounts WHERE id = ?').get(category.ledger_account_id);
  assert.equal(ledger.kind, 'expense');
  database.close();
});

test('impede categoria incompatível com o tipo da transação', () => {
  const database = new FinanceDatabase(':memory:');
  assert.throws(() => database.createTransaction({
    value: 10,
    type: 'income',
    description: 'Entrada inválida',
    date: '2026-08-03',
    categoryId: 'category_taxes',
  }), /não corresponde ao tipo/i);
  database.close();
});

test('salva o saldo bancário do OFX sem exigir categoria', () => {
  const content = `<OFX><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>saldo</BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260801<TRNAMT>100.00<FITID>credit-1<NAME>CLIENTE</STMTTRN><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260802<TRNAMT>-25.00<FITID>debit-1<NAME>TARIFA</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>975.00<DTASOF>20260802</LEDGERBAL></OFX>`;
  const database = new FinanceDatabase(':memory:');
  database.importNormalizedTransactions({
    batch: { sourceType: 'ofx', fileName: 'saldo.ofx', fileHash: hashImportFile(content) },
    ...parseOfx(content),
  });
  const account = database.listAccounts().find((item) => item.external_key === '001:saldo');
  assert.equal(account.statement_balance_cents, 97500);
  assert.equal(account.statement_balance_as_of, '2026-08-02');
  assert.deepEqual(database.listTransactions().map((item) => item.type).sort(), ['expense', 'income']);
  assert.equal(database.listTransactions().every((item) => item.status === 'review'), true);
  database.close();
});

test('reler um lote existente atualiza o saldo OFX sem duplicar movimentos', () => {
  const content = `<OFX><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>legado</BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260401<TRNAMT>50.00<FITID>legacy-1<NAME>CLIENTE</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>500.00<DTASOF>20260430</LEDGERBAL></OFX>`;
  const parsed = parseOfx(content);
  const database = new FinanceDatabase(':memory:');
  const batch = { sourceType: 'ofx', fileName: 'legado.ofx', fileHash: hashImportFile(content) };
  database.importNormalizedTransactions({ ...parsed, account: { ...parsed.account, balanceCents: null, balanceAsOf: null }, batch });
  const repeated = database.importNormalizedTransactions({ ...parsed, batch });
  const account = database.listAccounts().find((item) => item.external_key === '001:legado');
  assert.equal(repeated.alreadyImported, true);
  assert.equal(account.statement_balance_cents, 50000);
  assert.equal(database.listTransactions().length, 1);
  database.close();
});

test('impede regras duplicadas com o mesmo padrão e movimento', () => {
  const database = new FinanceDatabase(':memory:');
  const rule = {
    name: 'Fornecedor recorrente',
    field: 'description',
    operator: 'contains',
    pattern: 'FORNECEDOR TESTE',
    direction: 'expense',
    categoryId: 'category_suppliers',
    priority: 700,
    confidence: 0.9,
  };
  database.createRule(rule);
  assert.throws(() => database.createRule({ ...rule, name: 'Outra regra' }), /Já existe uma regra/);
  assert.throws(() => database.createRule({ ...rule, name: 'Equivalente', pattern: 'fornecedor-téste' }), /Já existe uma regra/);
  assert.equal(database.listRules().filter((item) => item.pattern === rule.pattern).length, 1);
  database.close();
});

test('reprocessa pendências, aplica alta confiança e exige aprovação na baixa confiança', () => {
  const database = new FinanceDatabase(':memory:');
  const automaticTransaction = database.createTransaction({ value: 100, type: 'income', description: 'COBRANCA', date: '2026-08-04' });
  const suggestedTransaction = database.createTransaction({ value: 20, type: 'income', description: 'BB RENDE FACIL', date: '2026-08-05' });
  database.createRule({ name: 'Cobrança automática', field: 'description', operator: 'equals', pattern: 'COBRANCA', direction: 'income', categoryId: 'category_income', priority: 800, confidence: 0.98 });
  database.createRule({ name: 'Rendimento sugerido', field: 'description', operator: 'contains', pattern: 'RENDE FACIL', direction: 'income', categoryId: 'category_income', priority: 700, confidence: 0.8 });

  const preview = database.previewPendingRuleMatches();
  assert.deepEqual(preview.automatic.map((match) => match.transactionId), [automaticTransaction.id]);
  assert.deepEqual(preview.suggestions.map((match) => match.transactionId), [suggestedTransaction.id]);

  const firstApplication = database.applyPendingRuleMatches();
  assert.equal(firstApplication.automaticApplied, 1);
  assert.equal(firstApplication.confirmedApplied, 0);
  assert.equal(database.getTransaction(automaticTransaction.id).status, 'categorized');
  assert.equal(database.getTransaction(suggestedTransaction.id).status, 'review');

  const secondApplication = database.applyPendingRuleMatches({ approvedSuggestionIds: [suggestedTransaction.id] });
  assert.equal(secondApplication.confirmedApplied, 1);
  assert.equal(database.getTransaction(suggestedTransaction.id).status, 'categorized');
  database.close();
});

test('mantém sugestão rejeitada pendente e sem lançamento contábil', () => {
  const database = new FinanceDatabase(':memory:');
  const transaction = database.createTransaction({ value: 20, type: 'expense', description: 'TARIFA INCERTA', date: '2026-08-05' });
  database.createRule({ name: 'Tarifa sugerida', field: 'description', operator: 'contains', pattern: 'TARIFA', direction: 'expense', categoryId: 'category_financial', priority: 700, confidence: 0.7 });
  const result = database.applyPendingRuleMatches({ approvedSuggestionIds: [] });
  assert.equal(result.rejected, 1);
  assert.equal(database.getTransaction(transaction.id).status, 'review');
  assert.equal(database.getTransaction(transaction.id).categoryId, null);
  assert.equal(database.getTransaction(transaction.id).suggestedCategoryId, null);
  assert.equal(database.db.prepare('SELECT COUNT(*) AS total FROM journal_entries WHERE source_transaction_id = ?').get(transaction.id).total, 0);
  database.close();
});

test('mantem categoria de baixa confianca apenas como sugestao no OFX', () => {
  const content = `<OFX><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>sugestao</BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260806<TRNAMT>-12.00<FITID>suggested-1<NAME>TARIFA INCERTA</STMTTRN></BANKTRANLIST></OFX>`;
  const database = new FinanceDatabase(':memory:');
  database.createRule({ name: 'Tarifa sugerida OFX', field: 'description', operator: 'contains', pattern: 'TARIFA', direction: 'expense', categoryId: 'category_financial', priority: 700, confidence: 0.8 });
  database.importNormalizedTransactions({ batch: { sourceType: 'ofx', fileName: 'suggested.ofx', fileHash: hashImportFile(content) }, ...parseOfx(content) });
  const transaction = database.listTransactions()[0];
  assert.equal(transaction.status, 'review');
  assert.equal(transaction.categoryId, null);
  assert.equal(transaction.category, null);
  assert.equal(transaction.suggestedCategoryId, 'category_financial');
  assert.equal(transaction.suggestedCategory, 'Despesas financeiras');
  assert.equal(transaction.suggestedConfidence, 0.8);
  assert.equal(database.db.prepare('SELECT COUNT(*) AS total FROM journal_entries').get().total, 0);
  database.close();
});

test('mantem categoria de baixa confianca apenas como sugestao na API', () => {
  const database = new FinanceDatabase(':memory:');
  database.createRule({ name: 'Tarifa sugerida API', field: 'description', operator: 'contains', pattern: 'TARIFA', direction: 'expense', categoryId: 'category_financial', priority: 700, confidence: 0.75 });
  const result = database.ingestApiTransaction('local', { externalId: 'api-suggested', value: 9.5, type: 'expense', date: '2026-08-06', description: 'TARIFA INCERTA' });
  assert.equal(result.transaction.status, 'review');
  assert.equal(result.transaction.categoryId, null);
  assert.equal(result.transaction.suggestedCategoryId, 'category_financial');
  assert.equal(result.transaction.suggestedConfidence, 0.75);
  assert.equal(database.db.prepare('SELECT COUNT(*) AS total FROM journal_entries').get().total, 0);
  database.close();
});

test('migra categoria pendente legada para sugestao sem criar lancamento', () => {
  const directory = mkdtempSync(join(tmpdir(), 'financeos-migration-'));
  const filePath = join(directory, 'legacy.db');
  const legacy = new DatabaseSync(filePath);
  try {
    legacy.exec('PRAGMA foreign_keys = ON');
    legacy.exec(migrations[0].sql);
    legacy.exec(migrations[1].sql);
    legacy.exec("PRAGMA user_version = 2");
    legacy.exec(`
      INSERT INTO organizations VALUES ('org_default', 'Empresa', NULL, '2026-01-01', '2026-01-01');
      INSERT INTO ledger_accounts (id, organization_id, code, name, kind, subtype, currency, created_at, updated_at)
        VALUES ('bank', 'org_default', '1', 'Banco', 'asset', 'bank', 'BRL', '2026-01-01', '2026-01-01'),
               ('expense', 'org_default', '4', 'Despesa', 'expense', 'category', 'BRL', '2026-01-01', '2026-01-01');
      INSERT INTO categories (id, organization_id, name, type, ledger_account_id, created_at, updated_at)
        VALUES ('category', 'org_default', 'Categoria legada', 'expense', 'expense', '2026-01-01', '2026-01-01');
      INSERT INTO classification_rules (id, organization_id, name, field, operator, pattern, direction, category_id, confidence, created_at, updated_at)
        VALUES ('rule', 'org_default', 'Regra legada', 'description', 'contains', 'TARIFA', 'expense', 'category', 0.8, '2026-01-01', '2026-01-01');
      INSERT INTO bank_transactions (id, organization_id, bank_account_id, fingerprint, posted_at, amount_cents, direction, description, normalized_description, category_id, status, created_at, updated_at)
        VALUES ('transaction', 'org_default', 'bank', 'legacy', '2026-01-01', -1000, 'expense', 'TARIFA', 'TARIFA', 'category', 'review', '2026-01-01', '2026-01-01');
      INSERT INTO rule_matches VALUES ('match', 'rule', 'transaction', 0.8, 'Sugestao legada', '2026-01-01');
    `);
  } finally {
    legacy.close();
  }
  try {
    const database = new FinanceDatabase(filePath);
    const transaction = database.getTransaction('transaction');
    assert.equal(transaction.categoryId, null);
    assert.equal(transaction.suggestedCategoryId, 'category');
    assert.equal(transaction.suggestedConfidence, 0.8);
    assert.equal(database.db.prepare('PRAGMA user_version').get().user_version, 3);
    assert.equal(database.db.prepare('SELECT COUNT(*) AS total FROM journal_entries').get().total, 0);
    database.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('importa um lote OFX multi-conta nas contas corretas e permanece idempotente', () => {
  const content = `<OFX><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>a</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260801<TRNAMT>10.00<FITID>a-1<NAME>RECEITA A</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>100.00<DTASOF>20260801</LEDGERBAL></STMTRS><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>237<ACCTID>b</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260802<TRNAMT>-5.00<FITID>b-1<NAME>DESPESA B</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>50.00<DTASOF>20260802</LEDGERBAL></STMTRS></OFX>`;
  const parsed = parseOfx(content);
  const database = new FinanceDatabase(':memory:');
  const input = { batch: { sourceType: 'ofx', fileName: 'multi.ofx', fileHash: hashImportFile(content) }, ...parsed };
  const first = database.importNormalizedTransactions(input);
  const second = database.importNormalizedTransactions(input);
  assert.equal(first.imported, 2);
  assert.equal(second.alreadyImported, true);
  const accounts = database.listAccounts();
  const accountA = accounts.find((item) => item.external_key === '001:a');
  const accountB = accounts.find((item) => item.external_key === '237:b');
  assert.equal(accountA.statement_balance_cents, 10000);
  assert.equal(accountB.statement_balance_cents, 5000);
  const transactions = database.listTransactions();
  assert.equal(transactions.find((item) => item.description === 'RECEITA A').accountId, accountA.id);
  assert.equal(transactions.find((item) => item.description === 'DESPESA B').accountId, accountB.id);
  assert.equal(transactions.length, 2);
  assert.equal(database.listImportBatches().length, 1);
  database.close();
});

test('rejeita valores e datas invalidas de transacoes manuais e API', () => {
  const database = new FinanceDatabase(':memory:');
  assert.throws(() => database.createTransaction({ value: '1.001', type: 'income', date: '2026-08-01' }), /2 casas/);
  assert.throws(() => database.createTransaction({ value: Infinity, type: 'income', date: '2026-08-01' }), /2 casas/);
  assert.throws(() => database.createTransaction({ value: 1, type: 'income', date: '2026-02-29' }), /calendário/);
  assert.throws(() => database.ingestApiTransaction('local', { externalId: 'bad-value', value: '1.999', type: 'income', date: '2026-08-01' }), /2 casas/);
  assert.throws(() => database.ingestApiTransaction('local', { externalId: 'bad-date', value: 1, type: 'income', date: '2026-13-01' }), /calendário/);
  assert.equal(database.listTransactions().length, 0);
  database.close();
});

test('recupera execuções de sincronização abandonadas ao reabrir o banco', () => {
  const directory = mkdtempSync(join(tmpdir(), 'financeos-sync-recovery-'));
  const filePath = join(directory, 'financeos.db');
  try {
    let database = new FinanceDatabase(filePath);
    const connector = database.saveConnector({ type: 'questor-syn', name: 'Questor', enabled: true, config: {} });
    const runId = database.startSyncRun(connector.id, 'push');
    database.close();
    database = new FinanceDatabase(filePath);
    const run = database.db.prepare('SELECT * FROM sync_runs WHERE id = ?').get(runId);
    assert.equal(run.status, 'failed');
    assert.match(run.error_message, /abandonada/i);
    assert.ok(run.finished_at);
    database.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('confirmação parcial exporta apenas aceitos e mantém rejeitados pendentes', () => {
  const database = new FinanceDatabase(':memory:');
  const connector = database.saveConnector({ type: 'questor-syn', name: 'Questor', enabled: true, config: {} });
  database.createTransaction({ value: 50, type: 'expense', description: 'Serviço A', date: '2026-08-02', categoryId: 'category_suppliers' });
  database.createTransaction({ value: 60, type: 'expense', description: 'Serviço B', date: '2026-08-03', categoryId: 'category_suppliers' });
  const pending = database.listPendingAccountingEntries(connector.id);
  const runId = database.startSyncRun(connector.id, 'push');
  database.markAccountingEntriesExported(connector.id, [pending[0].id], runId);
  database.finishSyncRun(runId, { status: 'completed', processedCount: 1 });
  assert.deepEqual(database.listPendingAccountingEntries(connector.id).map((item) => item.id), [pending[1].id]);
  const nextRun = database.startSyncRun(connector.id, 'push');
  assert.throws(() => database.markAccountingEntriesExported(connector.id, [pending[1].id, pending[1].id], nextRun), /duplicados/);
  assert.throws(() => database.markAccountingEntriesExported(connector.id, ['desconhecido'], nextRun), /não pertencem/);
  database.finishSyncRun(nextRun, { status: 'failed', errorMessage: 'teste' });
  assert.deepEqual(database.listPendingAccountingEntries(connector.id).map((item) => item.id), [pending[1].id]);
  database.close();
});
