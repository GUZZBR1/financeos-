import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FinanceDatabase } from '../database/finance-database.mjs';
import { createDatabaseBackup, restoreDatabaseBackup, validateBackup } from './backup-service.mjs';

test('cria e valida backup SQLite consistente', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'financeos-backup-test-'));
  const source = join(directory, 'source.db');
  const destination = join(directory, 'backup.db');
  const database = new FinanceDatabase(source);
  database.createTransaction({ value: 75, type: 'income', description: 'Teste de backup', date: '2026-08-03', categoryId: 'category_income' });
  await createDatabaseBackup(database, destination);
  validateBackup(destination);
  const restored = new FinanceDatabase(destination);
  assert.equal(restored.listTransactions().length, 1);
  restored.close();
  database.close();
});

test('restaura por substituição segura e mantém backup do banco anterior', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'financeos-restore-test-'));
  const destination = join(directory, 'current.db');
  const source = join(directory, 'restore.db');
  const safetyBackup = join(directory, 'safety.db');
  const current = new FinanceDatabase(destination);
  current.createTransaction({ value: 10, type: 'income', description: 'Antes', date: '2026-08-01', categoryId: 'category_income' });
  const restoreSource = new FinanceDatabase(source);
  restoreSource.createTransaction({ value: 20, type: 'income', description: 'Depois', date: '2026-08-02', categoryId: 'category_income' });
  restoreSource.close();
  await restoreDatabaseBackup({ database: current, source, destination, safetyBackup });
  const restored = new FinanceDatabase(destination);
  assert.deepEqual(restored.listTransactions().map((item) => item.description), ['Depois']);
  restored.close();
  const previous = new FinanceDatabase(safetyBackup);
  assert.deepEqual(previous.listTransactions().map((item) => item.description), ['Antes']);
  previous.close();
});

test('rejeita restaurar o próprio banco em uso', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'financeos-restore-same-test-'));
  const destination = join(directory, 'current.db');
  const database = new FinanceDatabase(destination);
  await assert.rejects(() => restoreDatabaseBackup({ database, source: destination, destination, safetyBackup: join(directory, 'safety.db') }), /diferente do banco em uso/i);
  database.close();
});
