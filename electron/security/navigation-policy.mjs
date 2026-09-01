import { pathToFileURL } from 'node:url';

function parseUrl(value) {
  try { return new URL(value); } catch { return null; }
}

export function isAllowedNavigation(url, { devUrl = null, productionEntryPath = null } = {}) {
  const candidate = parseUrl(url);
  if (!candidate) return false;
  if (devUrl) {
    const expected = parseUrl(devUrl);
    return Boolean(expected && candidate.origin === expected.origin);
  }
  if (!productionEntryPath || candidate.protocol !== 'file:') return false;
  return candidate.pathname === new URL(pathToFileURL(productionEntryPath).href).pathname;
}

export function denyWindowOpen() {
  return { action: 'deny' };
}
