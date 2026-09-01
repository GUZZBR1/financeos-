import { createHash } from 'node:crypto';
import { normalizeDescription } from './classification.mjs';
import { moneyToCents, requireIsoDate } from './financial-values.mjs';

function readTag(block, tag) {
  const closed = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (closed) return closed[1].trim();
  const sgml = block.match(new RegExp(`<${tag}[^>]*>\\s*([^<\\r\\n]+)`, 'i'));
  return sgml ? sgml[1].trim() : '';
}

function parseOfxDate(value) {
  const match = String(value).match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) throw new Error(`Data OFX inválida: ${value || '(vazia)'}`);
  return requireIsoDate(`${match[1]}-${match[2]}-${match[3]}`, 'Data OFX');
}

export function decimalToCents(value) {
  return moneyToCents(value, { name: 'Valor monetário', allowNegative: true, allowZero: true });
}

function statementBlocks(content) {
  return [...content.matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTRS>))/gi)].map((match) => match[1]);
}

function parseAccount(scope, kind) {
  const bankId = readTag(scope, 'BANKID');
  const branchId = readTag(scope, 'BRANCHID');
  const accountId = readTag(scope, 'ACCTID');
  const accountType = readTag(scope, 'ACCTTYPE') || (kind === 'CCSTMTRS' ? 'CREDITCARD' : 'CHECKING');
  const currency = readTag(scope, 'CURDEF') || 'BRL';
  if (!accountId) throw new Error('O OFX não informa a conta bancária (ACCTID).');
  const balanceBlock = scope.match(/<LEDGERBAL>([\s\S]*?)(?:<\/LEDGERBAL>|$)/i)?.[1] || '';
  const balanceValue = readTag(balanceBlock, 'BALAMT');
  const balanceDate = readTag(balanceBlock, 'DTASOF');
  return { bankId, branchId, accountId, accountType, currency,
    externalKey: [bankId, branchId, accountId].filter(Boolean).join(':'),
    balanceCents: balanceValue === '' ? null : decimalToCents(balanceValue),
    balanceAsOf: balanceDate ? parseOfxDate(balanceDate) : null };
}

export function parseOfx(content) {
  if (typeof content !== 'string' || !content.trim()) throw new Error('O arquivo OFX está vazio.');
  const found = [...content.matchAll(/<(STMTRS|CCSTMTRS)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => ({ kind: match[1].toUpperCase(), content: match[2] }));
  const scopes = found.length ? found : [{ kind: /<CCACCTTO>/i.test(content) ? 'CCSTMTRS' : 'STMTRS', content }];
  let rowNumber = 0;
  const statements = scopes.map(({ kind, content: scope }) => {
    const account = parseAccount(scope, kind);
    const transactions = statementBlocks(scope).map((block) => {
      rowNumber += 1;
      const amountCents = decimalToCents(readTag(block, 'TRNAMT'));
      if (amountCents === 0) throw new Error(`A transação OFX ${rowNumber} possui valor zero.`);
      const fitId = readTag(block, 'FITID');
      const postedAt = parseOfxDate(readTag(block, 'DTPOSTED'));
      const name = readTag(block, 'NAME');
      const memo = readTag(block, 'MEMO');
      const description = [name, memo].filter(Boolean).join(' — ') || 'Movimentação bancária';
      const transactionType = readTag(block, 'TRNTYPE');
      const documentNumber = readTag(block, 'CHECKNUM') || readTag(block, 'REFNUM');
      const fallback = [account.externalKey, postedAt, amountCents, normalizeDescription(description), documentNumber].join('|');
      return { rowNumber, externalId: fitId || null,
        fingerprint: fitId ? `fitid:${fitId}` : `hash:${createHash('sha256').update(fallback).digest('hex')}`,
        postedAt, amountCents, direction: amountCents > 0 ? 'income' : 'expense', description,
        normalizedDescription: normalizeDescription(description), transactionType: transactionType || null,
        documentNumber: documentNumber || null, accountExternalKey: account.externalKey,
        metadata: { name, memo, accountExternalKey: account.externalKey } };
    });
    return { account, transactions };
  });
  const accounts = statements.map(({ account }) => account);
  const transactions = statements.flatMap(({ transactions: items }) => items);
  if (!transactions.length) throw new Error('Nenhuma transação foi encontrada no arquivo OFX.');
  return { account: accounts[0], accounts, statements, transactions };
}

export function hashImportFile(content) {
  return createHash('sha256').update(content).digest('hex');
}
