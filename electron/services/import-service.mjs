import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { parseOfx, hashImportFile } from '../domain/ofx-parser.mjs';

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export function validateOfxPath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new Error('Arquivo OFX inválido.');
  if (!['.ofx', '.qfx'].includes(extname(filePath).toLowerCase())) {
    throw new Error('Solte um arquivo com extensão .ofx ou .qfx.');
  }
  return filePath;
}

function decodeOfx(buffer) {
  const header = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('ascii');
  const encoding = /ENCODING\s*:\s*(1252|WINDOWS-1252|USASCII)/i.test(header)
    ? 'windows-1252'
    : 'utf-8';
  return new TextDecoder(encoding).decode(buffer);
}

export async function prepareOfxFile(filePath) {
  const validatedPath = validateOfxPath(filePath);
  const buffer = await readFile(validatedPath);
  if (buffer.length > MAX_IMPORT_BYTES) throw new Error('O arquivo OFX excede o limite de 25 MB.');
  const content = decodeOfx(buffer);
  const parsed = parseOfx(content);
  return {
    batch: {
      sourceType: 'ofx',
      fileName: validatedPath.split(/[\\/]/).pop(),
      fileHash: hashImportFile(content),
    },
    ...parsed,
    accounts: parsed.accounts || [parsed.account],
    statements: parsed.statements || [{ account: parsed.account, transactions: parsed.transactions }],
  };
}

export async function importOfxFile(database, filePath) {
  return database.importNormalizedTransactions(await prepareOfxFile(filePath));
}
