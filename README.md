# FinanceOS

Aplicativo financeiro desktop, local-first e preparado para integrações. Os dados operacionais ficam em um banco SQLite no computador; nenhuma conta em nuvem é necessária.

## O que está implementado

- Aplicativo Windows em Electron com interface React.
- SQLite local, migrações e trilha de auditoria.
- Contas bancárias, categorias e partidas dobradas balanceadas.
- Importação OFX/QFX com prévia, limite de 25 MB e deduplicação.
- Classificação determinística por regras, inclusive aprendizado a partir de correções manuais.
- Revisão, categorização e conciliação de transações.
- API HTTP local autenticada para receber transações de outros programas.
- Conector configurável para envio contábil ao Questor SYN, com De/Para de contas e idempotência.
- Backup e restauração do banco.
- Interface de provedor preparada para IA opcional. O fluxo principal não usa nem exige IA.

## Executar a versão pronta

Abra:

```text
release\FinanceOS-win-x64\FinanceOS.exe
```

A pasta inteira `FinanceOS-win-x64` compõe a versão portátil; não mova somente o arquivo `.exe`.

O banco e as credenciais não ficam dentro da pasta do programa. No Windows, a tela **Configurações** mostra o caminho exato usado pelo Electron. Tokens são protegidos pelo mecanismo de credenciais do sistema operacional.

## Desenvolvimento

Requisitos: Node.js 22 ou superior e PowerShell no Windows.

```powershell
npm install
npm run setup:desktop-runtime
npm run dev:desktop
```

Outros comandos:

```powershell
npm run build          # compila a interface
npm run test:core      # testa SQLite, OFX, regras, API, backup e conectores
npm run test:run       # testa componentes React
npm run lint           # análise estática
npm run build:desktop  # compila e gera release\FinanceOS-win-x64
```

O script de runtime baixa o ZIP oficial do Electron e confere seu SHA-256 antes da extração. O empacotamento anterior é movido para `.omc\package-backups` em vez de ser apagado.

## Fluxo OFX

1. Abra **Importações** e arraste um `.ofx` ou `.qfx` para a área indicada, ou use **Selecionar OFX**.
2. Confira a conta, a quantidade e a amostra exibida.
3. Confirme a importação.
4. Transações reconhecidas por regras recebem categoria automaticamente; as demais ficam em revisão.
5. Ao corrigir uma categoria, marque a opção de aprendizado para criar uma regra exata reutilizável.

A deduplicação usa `FITID` quando fornecido pelo banco e uma impressão digital determinística como alternativa. Reimportar o mesmo arquivo não duplica movimentos.

Créditos e débitos entram no saldo bancário imediatamente, mesmo quando a categoria ainda está pendente. Quando o OFX informa `LEDGERBAL/BALAMT`, esse saldo do banco é usado como referência; movimentos posteriores são acrescentados normalmente.

## Integrações

- [API HTTP local](docs/integrations/local-api.md)
- [Questor SYN](docs/integrations/questor-syn.md)
- [Extensão opcional para IA](docs/integrations/ai-provider.md)

Integrações ficam desativadas até serem configuradas pelo usuário. A API local aceita apenas endereços de loopback (`127.0.0.1`, `localhost` ou `::1`).

## Estrutura

```text
electron/
  ai/             interfaces opcionais de IA
  connectors/     conectores externos e Questor
  database/       SQLite, migrações e repositório financeiro
  domain/         parser OFX e classificação determinística
  services/       importação, backup, API e credenciais
src/              interface React
scripts/          execução e empacotamento desktop
docs/architecture decisões arquiteturais
```

## Decisões importantes

- O renderer não acessa Node.js, arquivos ou SQLite diretamente.
- `contextIsolation`, sandbox e uma lista explícita de operações IPC reduzem a superfície de ataque.
- Valores monetários são persistidos em centavos inteiros.
- Uma transação categorizada gera duas partidas cuja soma deve ser zero.
- IA somente pode sugerir; regras e revisão humana permanecem o caminho confiável.

Veja os registros completos em `docs/architecture/`.
