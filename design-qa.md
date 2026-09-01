# Design QA — chat lateral e feedback de clique

- Referência: chat compacto no canto superior direito, abrindo lateralmente como no Codex.
- Captura verificada: `artifacts/chat-drawer-qa-final.png` em 1360 × 860.
- Chat fechado: lançador quadrado de 48 × 48 px permanece visível no canto superior direito, 76 px abaixo do topo para não disputar espaço com a ação “Nova Transação”.
- Chat aberto: painel lateral de 420 px, fundo escurecido, conteúdo rolável e formulário fixado na parte inferior.
- Interação: o lançador alterna entre abrir e fechar; fundo e tecla Escape fecham o painel.
- Acessibilidade: estado fechado fica inerte; rótulos ARIA e preferência por movimento reduzido são respeitados.
- Botões: onda de clique parte das coordenadas do ponteiro e se expande até cobrir o botão.
- Responsividade: painel limitado à largura da viewport e lançador reposicionado em telas menores.

final result: passed

## Contraste e estética dos sinais financeiros

- Captura verificada: `artifacts/dashboard-aesthetic-qa.png` em 1360 × 860.
- Painéis internos claros foram substituídos por superfícies escuras consistentes com o FinanceOS.
- Verde identifica oportunidades e valores de economia; azul identifica resultados e simulações; vermelho fica reservado a alertas.
- Textos antes em inglês foram traduzidos: “Ações recomendadas”, “Categoria” e “Redução”.
- Hierarquia revisada com títulos, descrições, ações e métricas visualmente separados.
- Contraste de texto e controles revisado no tema escuro.

final result: passed

## Reclassificação de pendências

- Captura verificada: `artifacts/rule-review-dialog-qa.png` em 1360 × 860.
- A janela identifica descrição, categoria sugerida, regra e percentual de confiança.
- Cada sugestão abaixo de 85% possui decisões explícitas “Está certo” e “Não está certo”.
- Sugestões rejeitadas ou sem decisão permanecem pendentes.
- Correspondências com confiança a partir de 85% são informadas antes da aplicação automática.
- A operação atualiza lançamentos e classificações atomicamente.

final result: passed
