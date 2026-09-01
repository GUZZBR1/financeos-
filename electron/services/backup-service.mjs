import { copyFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

function escapeSqliteLiteral(value) {
  return String(value).replaceAll("'", "''");
}

export async function createDatabaseBackup(database, destination) {
  await mkdir(dirname(destination), { recursive: true });
  database.db.exec(`VACUUM INTO '${escapeSqliteLiteral(destination)}'`);
  return destination;
}

export function validateBackup(filePath) {
  const candidate = new DatabaseSync(filePath, { readOnly: true });
  try {
    const integrity = candidate.prepare('PRAGMA integrity_check').all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') throw new Error('Backup inválido. A verificação de integridade falhou.');
    const foreignKeys = candidate.prepare('PRAGMA foreign_key_check').all();
    if (foreignKeys.length) throw new Error('Backup inválido. Existem referências quebradas.');
    const tables = candidate.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all().map((row) => row.name);
    const required = ['organizations', 'bank_transactions', 'journal_entries', 'postings'];
    const missing = required.filter((name) => !tables.includes(name));
    if (missing.length) throw new Error(`Backup inválido. Tabelas ausentes: ${missing.join(', ')}.`);
    const version = Number(candidate.prepare('PRAGMA user_version').get().user_version || 0);
    if (version < 1) throw new Error('Backup inválido. A versão do banco não é reconhecida.');
    return { version };
  } finally {
    candidate.close();
  }
}

export async function restoreDatabaseBackup({ database, source, destination, safetyBackup }) {
  if (resolve(source).toLowerCase() === resolve(destination).toLowerCase()) throw new Error('Selecione um arquivo de backup diferente do banco em uso.');
  validateBackup(source);
  await stat(destination);
  const temporary = `${destination}.restore-${process.pid}-${Date.now()}.tmp`;
  const displaced = `${destination}.restore-${process.pid}-${Date.now()}.old`;
  await rm(safetyBackup, { force: true });
  await createDatabaseBackup(database, safetyBackup);
  await copyFile(source, temporary);
  validateBackup(temporary);
  database.close();
  try {
    await rename(destination, displaced);
    try {
      await rename(temporary, destination);
    } catch (error) {
      await rename(displaced, destination);
      throw error;
    }
    await rm(displaced, { force: true });
    return safetyBackup;
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}
