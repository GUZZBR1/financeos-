import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareOfxFile, validateOfxPath } from './import-service.mjs';

test('aceita arquivos OFX e QFX sem diferenciar maiúsculas', () => {
  assert.equal(validateOfxPath('C:\\extratos\\agosto.OFX'), 'C:\\extratos\\agosto.OFX');
  assert.equal(validateOfxPath('C:\\extratos\\cartao.qfx'), 'C:\\extratos\\cartao.qfx');
});

test('rejeita outros tipos de arquivo arrastados', () => {
  assert.throws(() => validateOfxPath('C:\\extratos\\agosto.csv'), /\.ofx ou \.qfx/i);
});

test('prepara todas as contas e extratos de um OFX multi-conta', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'financeos-ofx-'));
  const filePath = join(directory, 'multi.ofx');
  writeFileSync(filePath, `<OFX><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>a</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260801<TRNAMT>10.00<FITID>a-1<NAME>A</STMTTRN></BANKTRANLIST></STMTRS><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>237<ACCTID>b</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260802<TRNAMT>-5.00<FITID>b-1<NAME>B</STMTTRN></BANKTRANLIST></STMTRS></OFX>`);
  try {
    const prepared = await prepareOfxFile(filePath);
    assert.deepEqual(prepared.accounts.map((item) => item.externalKey), ['001:a', '237:b']);
    assert.equal(prepared.statements.length, 2);
    assert.equal(prepared.transactions.length, 2);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
