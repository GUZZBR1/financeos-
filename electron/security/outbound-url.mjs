import { isIP } from 'node:net';

function isPrivateIpv4(hostname) {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

function isPrivateIpv6(hostname) {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return normalized === '::' || normalized === '::1' || normalized.startsWith('fc')
    || normalized.startsWith('fd') || /^fe[89ab]/u.test(normalized);
}

export function validateOutboundUrl(value, { service = 'serviço', allowLocalhost = false } = {}) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`URL do ${service} inválida.`); }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const local = ['localhost', '127.0.0.1', '::1'].includes(hostname);

  if (url.username || url.password) throw new Error(`Não inclua credenciais na URL do ${service}.`);
  if (url.protocol !== 'https:' && !(allowLocalhost && local && url.protocol === 'http:')) {
    throw new Error(`${service} deve usar HTTPS. HTTP é permitido somente no computador local.`);
  }
  if (local && !allowLocalhost) throw new Error(`A URL do ${service} não pode apontar para o computador local.`);
  if (/^(?:metadata|metadata\.google\.internal)$/u.test(hostname) || hostname.endsWith('.local')) {
    throw new Error(`A URL do ${service} aponta para uma rede interna bloqueada.`);
  }
  if ((isIP(hostname) === 4 && isPrivateIpv4(hostname)) || (isIP(hostname) === 6 && isPrivateIpv6(hostname))) {
    if (!(allowLocalhost && local)) throw new Error(`A URL do ${service} aponta para um endereço de rede privado bloqueado.`);
  }
  return url;
}
