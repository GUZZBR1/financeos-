import { Connector } from './connector.mjs';
import { validateOutboundUrl } from '../security/outbound-url.mjs';

function formatQuestorDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function sanitizeField(value) {
  return String(value ?? '').replace(/[;\r\n]+/g, ' ').trim();
}

function padQuestorAmount(cents) {
  const value = (Math.abs(Number(cents)) / 100).toFixed(2).replace('.', ',');
  const [integer, decimal] = value.split(',');
  return `${integer.padStart(13, '0')},${decimal}`;
}

export function buildQuestorAccountingData(entries, mapping, establishmentDocument) {
  return entries.map((entry) => {
    const debit = mapping[entry.debitAccountId];
    const credit = mapping[entry.creditAccountId];
    if (!debit || !credit) throw new Error(`Mapeamento contábil ausente para o lançamento ${entry.id}.`);
    const debitCode = debit.startsWith('Q') || /^[CF]/.test(debit) ? debit : `Q${debit}`;
    const creditCode = credit.startsWith('Q') || /^[CF]/.test(credit) ? credit : `Q${credit}`;
    return [
      'C',
      `"${sanitizeField(establishmentDocument)}"`,
      formatQuestorDate(entry.date),
      `"${sanitizeField(entry.batchNumber || '')}"`,
      `"${sanitizeField(entry.documentNumber || '')}"`,
      debitCode,
      '""',
      creditCode,
      '""',
      padQuestorAmount(entry.amountCents),
      `"${sanitizeField(entry.historyCode)}"`,
      `"${sanitizeField(entry.description)}"`,
      '',
    ].join(';');
  }).join('\r\n');
}

export function buildQuestorSynPayload({ clientDocument, accountantDocuments, entries, mapping, establishmentDocument }) {
  return {
    cnpjCliente: clientDocument,
    versao: '2.00',
    grupoLayout: 100,
    dataDocumentos: new Date().toISOString(),
    cnpjContabilidade: accountantDocuments,
    dado: buildQuestorAccountingData(entries, mapping, establishmentDocument || clientDocument),
  };
}

export function validateQuestorConfirmation(result, entryIds) {
  const expectedIds = new Set(entryIds);
  if (expectedIds.size !== entryIds.length) throw new Error('O lote Questor contém IDs duplicados.');
  const acceptedInput = result?.acceptedIds;
  const rejectedInput = result?.rejectedIds;
  if (acceptedInput != null && !Array.isArray(acceptedInput)) throw new Error('A confirmação acceptedIds do Questor é inválida.');
  if (rejectedInput != null && !Array.isArray(rejectedInput)) throw new Error('A confirmação rejectedIds do Questor é inválida.');
  const acceptedIds = acceptedInput == null && rejectedInput == null ? [...entryIds] : [...(acceptedInput || [])];
  const rejectedIds = [...(rejectedInput || [])];
  if (acceptedInput == null && rejectedInput != null) {
    const rejected = new Set(rejectedIds);
    acceptedIds.push(...entryIds.filter((id) => !rejected.has(id)));
  }
  const confirmations = [...acceptedIds, ...rejectedIds];
  if (new Set(acceptedIds).size !== acceptedIds.length || new Set(rejectedIds).size !== rejectedIds.length) {
    throw new Error('O Questor retornou IDs duplicados na confirmação.');
  }
  if (new Set(confirmations).size !== confirmations.length) throw new Error('O Questor marcou o mesmo lançamento como aceito e rejeitado.');
  if (confirmations.some((id) => typeof id !== 'string' || !expectedIds.has(id))) {
    throw new Error('O Questor confirmou um lançamento desconhecido.');
  }
  const confirmed = new Set(confirmations);
  rejectedIds.push(...entryIds.filter((id) => !confirmed.has(id)));
  return { accepted: acceptedIds.length, rejected: rejectedIds.length, acceptedIds, rejectedIds };
}

export class QuestorSynConnector extends Connector {
  endpoint(path) {
    let endpoint;
    try { endpoint = new URL(path, this.config.baseUrl); } catch { throw new Error('URL do Questor inválida.'); }
    return validateOutboundUrl(endpoint, { service: 'Questor', allowLocalhost: true });
  }

  requestHeaders() {
    const allowed = ['x-api-key', 'x-tenant-id', 'x-client-id'];
    const custom = Object.fromEntries(Object.entries(this.config.headers || {}).filter(([key]) => allowed.includes(key.toLowerCase())));
    return { ...custom, 'content-type': 'application/json', accept: 'application/json', ...(this.config.token ? { authorization: `Bearer ${this.config.token}` } : {}) };
  }

  validateConfig() {
    const required = ['baseUrl', 'accountingPath', 'clientDocument'];
    const missing = required.filter((field) => !this.config[field]);
    if (missing.length) throw new Error(`Configuração Questor incompleta: ${missing.join(', ')}.`);
  }

  headers() {
    return this.requestHeaders();
  }

  async testConnection() {
    this.validateConfig();
    const endpoint = this.endpoint(this.config.healthPath || '/');
    const response = await fetch(endpoint, { method: 'GET', headers: this.headers(), signal: AbortSignal.timeout(Number(this.config.timeoutMs) || 15000), redirect: 'error' });
    return { ok: response.ok, status: response.status, message: response.statusText };
  }

  async push({ entries, mapping }) {
    this.validateConfig();
    const endpoint = this.endpoint(this.config.accountingPath);
    const payload = buildQuestorSynPayload({
      clientDocument: this.config.clientDocument,
      accountantDocuments: this.config.accountantDocuments || [],
      establishmentDocument: this.config.establishmentDocument,
      entries,
      mapping,
    });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(Number(this.config.timeoutMs) || 30000),
      redirect: 'error',
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Questor SYN respondeu ${response.status}: ${body.slice(0, 500)}`);
    let parsed = null;
    try { parsed = body ? JSON.parse(body) : null; } catch { /* respostas legadas podem ser texto */ }
    const confirmation = validateQuestorConfirmation(parsed, entries.map((entry) => entry.id));
    return { ...confirmation, response: body };
  }
}
