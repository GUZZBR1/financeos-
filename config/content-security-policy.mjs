export function buildContentSecurityPolicy({ development = false } = {}) {
  const connectSources = development
    ? "'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*"
    : "'none'";
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "worker-src 'self'",
  ].join('; ');
}
