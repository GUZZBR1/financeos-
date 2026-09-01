# Plano mestre de revisão do FinanceOS

Data: 13/08/2026  
Escopo: aplicação Electron, renderer React, SQLite, contabilidade, OFX, regras, IA, conectores, API local, backup/restore, segurança, testes, CI, distribuição, acessibilidade e organização.

## Equipe e responsabilidades

- Agente Backend/Dados: SQLite, regras, OFX, partidas dobradas, backup, Questor e arquitetura do processo principal.
- Agente Frontend/UX: fluxos React, erros/loading, filtros, modais, acessibilidade, responsividade e testes de interface.
- Agente Segurança/Qualidade: IPC, egress/SSRF, segredos, API local, CSP, CI, supply chain e empacotamento.
- Agente principal: consolidação, decisões transversais, integração das mudanças, gates e auditoria final.

## Diagnóstico inicial

Não foi confirmado nenhum P0. Foram confirmados P1 que podem afetar integridade financeira, disponibilidade ou proteção:

1. Sugestões de regras abaixo de 85% gravam categoria antes da aprovação e podem contaminar gráficos/totais.
2. Questor considera todo HTTP 2xx como sucesso integral e pode marcar rejeições parciais como exportadas.
3. OFX com múltiplas contas pode misturar movimentos na primeira conta.
4. Restore não é atômico e valida apenas presença de tabelas.
5. Regex arbitrária pode causar ReDoS no processo principal.
6. IA/Questor aceitam destinos configuráveis sem política central contra SSRF; Questor não exige TLS nem timeout.
7. IPCs privilegiados não validam origem/frame chamador.
8. CI não executa a suíte central Electron.
9. Falhas de carregamento/mutações no frontend não são apresentadas nem recuperáveis de modo consistente.
10. Filtro do histórico exclui categorias de receita e a importação duplicada força navegação inadequada.

## Estratégia de execução

### Onda 0 — Baseline e caracterização

- Restaurar instalação/ferramenta de lint e separar configurações renderer/main/preload.
- Fazer CI rodar lint, testes core, testes React, build e smoke Electron.
- Criar testes que reproduzam cada P1 antes das correções.
- Registrar baseline: testes, banco temporário, build, tamanho dos módulos e fluxos críticos.

Gate: os testes de caracterização precisam falhar pelo motivo esperado; o baseline deve ser reproduzível.

### Onda 1 — Integridade financeira e dados

- Separar categoria sugerida de categoria confirmada; transação em revisão fica sem `category_id` efetivo.
- Migrar registros inconsistentes com relatório, preservando decisões humanas e lançamentos existentes.
- Centralizar categorização + journal entry numa operação transacional com invariantes de soma zero.
- Processar OFX por escopo de conta e validar data, moeda, precisão e limites monetários.
- Uniformizar regras entre transações manuais, OFX e API.
- Preservar proveniência ao excluir regras.

Gate: pendências não entram em totais categorizados; aprovação cria exatamente dois postings balanceados; rejeição não altera contabilidade; fixture multi-conta não mistura dados.

### Onda 2 — Segurança do processo principal e rede

- Criar wrapper de IPC confiável validando janela, frame, origem e path exatos.
- Bloquear regex insegura ou substituir por motor/política com timeout e limite de complexidade.
- Criar política única de egress para IA e Questor: TLS, bloqueio de destinos internos/metadata, redirects revalidados e timeout.
- Limitar headers Questor, tamanho de resposta e sanear erros.
- Endurecer API local com timeouts, rate limit, limites de conexão e erros públicos genéricos.
- Serializar SecretStore e escrever por arquivo temporário + rename atômico.

Gate: origem não confiável não chama IPC; regex adversária não bloqueia o main; SSRF privado/metadata/redirect é rejeitado; segredos não aparecem em erros/logs.

### Onda 3 — Backup, restore e sincronização

- Validar backup com `integrity_check`, `foreign_key_check`, versão e esquema.
- Restaurar via arquivo temporário e substituição atômica, com rollback automático pelo safety backup.
- Informar que credenciais não fazem parte do backup e exigir reautenticação quando necessário.
- Interpretar confirmação Questor por lançamento; marcar apenas itens realmente aceitos.
- Adicionar timeout, idempotência/checkpoint e recuperação de sync runs abandonados.

Gate: falha injetada em qualquer etapa não danifica o banco original; rejeições parciais continuam pendentes e podem ser reenviadas sem duplicação.

### Onda 4 — Confiabilidade do frontend

- Permitir carregamento parcial de transações/categorias/contas e apresentar erro recuperável.
- Criar padrão de mutação assíncrona: loading, bloqueio de clique duplo, erro visível e atualização consistente.
- Corrigir filtro de categorias de receita, período customizado na URL e importação duplicada.
- Tratar falhas em regras, configurações, catálogos, polling de IA e operações de transação.
- Padronizar feedback `success/warning/error` com `role=status/alert`.

Gate: cada rejeição IPC tem estado visual e retry; nenhum clique duplo duplica operação; filtros sobrevivem a reload/voltar/avançar.

### Onda 5 — Acessibilidade, responsividade e UX

- Criar diálogo reutilizável com foco inicial, trap, Escape, restauração de foco e scroll lock.
- Trocar `div/span` clicáveis por elementos semânticos.
- Adicionar `aria-pressed`, grupos e rótulos aos filtros.
- Revisar navegação móvel e breakpoints 320/360/768/900/1280/1920, além de zoom 200%.
- Substituir ripple que muta DOM por implementação declarativa.

Gate: fluxo crítico funciona somente por teclado; nenhuma violação crítica/séria no axe; sem overflow nos breakpoints definidos.

### Onda 6 — Arquitetura e organização

- Extrair SQL e orquestração de `electron/main.mjs` para serviços/repositórios testáveis.
- Dividir `finance-database.mjs` por domínios mantendo unidade transacional explícita.
- Dividir Dashboard, Histórico e Configurações em componentes/hooks menores.
- Consolidar tokens CSS, remover estilos inline críticos e padronizar vocabulário.
- Memoizar/separar contextos para reduzir rerenders.
- Atualizar ADRs, README e documentação das integrações.

Gate: handlers IPC finos, sem SQL direto; módulos têm responsabilidade clara; testes de domínio não dependem de Electron UI.

### Onda 7 — Distribuição e auditoria final

- Fortalecer CSP por ambiente, links externos por allowlist/confirmação e logging local com redaction.
- Usar `npm ci`, audit/política de dependências, ações fixadas, SBOM e hashes.
- Preparar assinatura Authenticode/proveniência como requisito de release, quando certificado estiver disponível.
- Executar testes unitários, integração, E2E Electron e smoke no pacote final.
- Auditar todos os requisitos e empacotar somente `FinanceOS-win-x64-latest`.

Gate final: lint sem erros; core + React + integração + E2E verdes; restore ida/volta; OFX multi-conta; regras/aprovação; IA Groq/OpenAI; Questor sucesso/parcial/timeout; backup; API local; acessibilidade; QA visual; smoke do executável.

## Regras de execução

- Cada P1 recebe primeiro um teste de reprodução e depois a correção.
- Dados reais do usuário não serão usados para testes destrutivos; serão usados bancos temporários/cópias.
- Migrações serão reversíveis por backup de segurança e verificadas em banco versão anterior.
- Agentes trabalharão em áreas separadas; o agente principal integrará e resolverá conflitos.
- Nenhuma onda será considerada concluída apenas por build verde; o gate funcional correspondente precisa passar.

## Entregáveis

- Matriz de achados com status, evidência, correção e teste.
- Código corrigido e reorganizado.
- Suíte ampliada e CI obrigatória.
- Relatório de segurança, acessibilidade e QA visual.
- Documentação atualizada.
- Pacote desktop final mais recente.
