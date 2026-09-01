# ADR 001 — FinanceOS local-first para desktop

## Status

Aceito.

## Decisão

O FinanceOS será um aplicativo desktop local baseado em Electron. A interface existente em React continuará no processo renderer. Acesso a arquivos, SQLite, credenciais e integrações ficará restrito ao processo main e será exposto por uma API IPC pequena e validada.

O banco principal será SQLite pelo módulo `node:sqlite` incluído no Node do Electron. Nenhum serviço em nuvem será necessário para abrir o aplicativo ou trabalhar com dados locais.

## Consequências

- O aplicativo funciona sem internet.
- O usuário controla banco, backups e arquivos importados.
- APIs externas continuam exigindo rede quando configuradas.
- Sistemas externos na nuvem não conseguem chamar diretamente um computador atrás de firewall; a sincronização padrão será iniciada pelo FinanceOS.
- O renderer não terá acesso direto ao Node ou ao banco.

## Segurança

- `contextIsolation: true`.
- `sandbox: true`.
- `nodeIntegration: false`.
- Canais IPC permitidos explicitamente no preload.
- Credenciais protegidas por `safeStorage`.
