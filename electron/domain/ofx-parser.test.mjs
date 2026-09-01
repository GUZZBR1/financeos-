import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfx } from './ofx-parser.mjs';

const sample = `OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>BRL
<BANKACCTFROM><BANKID>001<BRANCHID>1234<ACCTID>98765<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260801120000[-3:BRT]<TRNAMT>-125.50<FITID>abc-1<NAME>POSTO CENTRAL<MEMO>ABASTECIMENTO</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260802120000[-3:BRT]<TRNAMT>2000.00<FITID>abc-2<NAME>CLIENTE ACME</STMTTRN>
</BANKTRANLIST><LEDGERBAL><BALAMT>1874.50<DTASOF>20260802120000[-3:BRT]</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

test('lê conta e transações OFX SGML', () => {
  const result = parseOfx(sample);
  assert.equal(result.account.externalKey, '001:1234:98765');
  assert.equal(result.account.balanceCents, 187450);
  assert.equal(result.account.balanceAsOf, '2026-08-02');
  assert.equal(result.transactions.length, 2);
  assert.equal(result.transactions[0].amountCents, -12550);
  assert.equal(result.transactions[0].direction, 'expense');
  assert.equal(result.transactions[1].direction, 'income');
});

test('usa FITID como chave determinística de deduplicação', () => {
  const result = parseOfx(sample);
  assert.equal(result.transactions[0].fingerprint, 'fitid:abc-1');
});

test('separa duas contas e associa cada transacao ao extrato correto', () => {
  const content = `<OFX>
    <STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>001<BRANCHID>1111<ACCTID>conta-a<ACCTTYPE>CHECKING</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260801<TRNAMT>100.00<FITID>a-1<NAME>CLIENTE A</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>1000.00<DTASOF>20260801</LEDGERBAL></STMTRS>
    <STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>237<BRANCHID>2222<ACCTID>conta-b<ACCTTYPE>SAVINGS</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260802<TRNAMT>-25.00<FITID>b-1<NAME>FORNECEDOR B</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>500.00<DTASOF>20260802</LEDGERBAL></STMTRS>
  </OFX>`;
  const result = parseOfx(content);
  assert.deepEqual(result.accounts.map((account) => account.externalKey), ['001:1111:conta-a', '237:2222:conta-b']);
  assert.deepEqual(result.accounts.map((account) => account.balanceCents), [100000, 50000]);
  assert.equal(result.statements[0].transactions[0].accountExternalKey, '001:1111:conta-a');
  assert.equal(result.statements[1].transactions[0].accountExternalKey, '237:2222:conta-b');
  assert.deepEqual(result.transactions.map((item) => item.rowNumber), [1, 2]);
  assert.equal(result.account, result.accounts[0]);
});

test('fingerprint sem FITID inclui a conta de origem', () => {
  const content = `<OFX><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>a</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260801<TRNAMT>-10.00<NAME>TARIFA</STMTTRN></BANKTRANLIST></STMTRS><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>b</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260801<TRNAMT>-10.00<NAME>TARIFA</STMTTRN></BANKTRANLIST></STMTRS></OFX>`;
  const result = parseOfx(content);
  assert.notEqual(result.transactions[0].fingerprint, result.transactions[1].fingerprint);
});

test('rejeita data inexistente e valor OFX com arredondamento silencioso', () => {
  const invalidDate = `<OFX><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>a</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260229<TRNAMT>-10.00<NAME>TARIFA</STMTTRN></BANKTRANLIST></STMTRS></OFX>`;
  const excessiveDecimals = `<OFX><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>a</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260801<TRNAMT>-10.001<NAME>TARIFA</STMTTRN></BANKTRANLIST></STMTRS></OFX>`;
  assert.throws(() => parseOfx(invalidDate), /calendário/);
  assert.throws(() => parseOfx(excessiveDecimals), /2 casas/);
});
