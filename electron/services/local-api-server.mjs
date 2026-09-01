import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const MAX_BODY_BYTES = 1024 * 1024;
const RATE_WINDOW_MS = 60_000;

function tokenMatches(received, expected) {
  const left = Buffer.from(received || '');
  const right = Buffer.from(expected || '');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function send(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  response.end(body);
}

function publicError(error) {
  return String(error?.message || 'Requisição inválida.').replace(/[\r\n\t]+/g, ' ').slice(0, 300);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('O corpo excede 1 MB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export class LocalApiServer {
  constructor(database) {
    this.database = database;
    this.server = null;
  }

  async start({ host = '127.0.0.1', port = 4765, token, maxRequestsPerMinute = 120 }) {
    await this.stop();
    if (!token) throw new Error('A API local exige um token.');
    const clients = new Map();
    this.server = createServer(async (request, response) => {
      try {
        const now = Date.now();
        const client = request.socket.remoteAddress || 'local';
        const current = clients.get(client);
        const bucket = !current || now - current.startedAt >= RATE_WINDOW_MS ? { startedAt: now, count: 0 } : current;
        bucket.count++;
        clients.set(client, bucket);
        if (bucket.count > Math.max(1, Number(maxRequestsPerMinute) || 120)) {
          send(response, 429, { error: 'Muitas requisições. Aguarde antes de tentar novamente.' });
          return;
        }
        const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
        if (request.method === 'GET' && url.pathname === '/health') {
          send(response, 200, { ok: true, service: 'FinanceOS Local API', version: 1 });
          return;
        }
        const authorization = request.headers.authorization || '';
        if (!tokenMatches(authorization.replace(/^Bearer\s+/i, ''), token)) {
          send(response, 401, { error: 'Token inválido.' });
          return;
        }
        if (request.method === 'POST' && url.pathname === '/v1/transactions') {
          const body = await readJson(request);
          const records = Array.isArray(body) ? body : [body];
          if (records.length > 1000) throw new Error('O limite é de 1000 transações por requisição.');
          const results = this.database.transaction(() => records.map((record) => this.database.ingestApiTransaction('local', record)));
          send(response, 200, {
            accepted: results.filter((result) => !result.duplicate).length,
            duplicates: results.filter((result) => result.duplicate).length,
          });
          return;
        }
        send(response, 404, { error: 'Rota não encontrada.' });
      } catch (error) {
        send(response, 400, { error: publicError(error) });
      }
    });
    this.server.requestTimeout = 15_000;
    this.server.headersTimeout = 10_000;
    this.server.keepAliveTimeout = 5_000;
    this.server.maxHeadersCount = 50;

    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(Number(port), host, resolve);
    });
    const address = this.server.address();
    return { host, port: typeof address === 'object' && address ? address.port : Number(port) };
  }

  async stop() {
    if (!this.server) return;
    const current = this.server;
    this.server = null;
    await new Promise((resolve) => current.close(resolve));
  }
}
