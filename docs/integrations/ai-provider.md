# Provedor opcional de IA

IA não é uma dependência do FinanceOS. A importação, classificação por regras, contabilidade e conciliação funcionam offline.

A interface `ClassificationProvider`, em `electron/ai/classification-provider.mjs`, define os pontos de extensão:

- `healthCheck()` verifica se o provedor está disponível;
- `classify()` retorna sugestão, confiança e explicação;
- `ClassificationProviderRegistry` permite registrar implementações sem acoplar o domínio a um fornecedor.

O provedor padrão é `none`. O aplicativo desktop também oferece um provedor compatível com a API Chat Completions. Ele pode ser configurado em **Configurações → Assistente de IA** com URL base, modelo e chave.

Ao solicitar uma análise no painel, o FinanceOS pode enviar até 250 transações do período e retorna:

- padrões recorrentes;
- anomalias que merecem revisão;
- recomendações e oportunidades;
- sugestões de regras de classificação.

## Chat financeiro

O painel oferece um chat contextual sobre o período selecionado. Ele recebe dados compactados, mantém somente as seis mensagens recentes no contexto e não executa ações. Ao trocar o período, a conversa em tela é reiniciada para evitar misturar contextos.

O mesmo painel possui o modo **Work** para atividades assistidas. Nesta primeira versão, ele interpreta pedidos de classificação por texto da descrição, resolve uma categoria existente e calcula localmente uma prévia limitada ao período selecionado. A IA não recebe acesso ao banco nem executa comandos.

Cada prévia informa quantidade, valor total, amostras e itens protegidos. A execução exige confirmação explícita e usa um token local temporário, de uso único. Transações conciliadas não são alteradas. A classificação confirmada ocorre em uma única transação do banco e gera eventos de auditoria para cada item modificado.

## Análise automática

Nas configurações, o usuário pode ativar ou desativar análises automáticas e escolher frequência diária, a cada três dias ou semanal. Elas são executadas enquanto o aplicativo desktop estiver aberto, com apenas uma consulta de IA por vez. O último resumo ou erro fica armazenado localmente na configuração do conector e é exibido separadamente no painel. Nenhuma regra ou transação é alterada automaticamente.

As descrições podem ser ocultadas nas configurações. A chave é armazenada pelo `SecretStore`, protegida pelo mecanismo de credenciais do sistema operacional. Nenhum resultado cria regras ou altera transações automaticamente.

Os prompts tratam descrições bancárias, categorias, regras e perguntas como dados não confiáveis. Conteúdo semelhante a instruções encontrado nesses campos deve ser ignorado. A análise valida e limita localmente o JSON retornado; o chat retorna somente texto, renderizado sem HTML.

Uma integração deve:

1. ser explicitamente habilitada;
2. armazenar sua credencial com `SecretStore`;
3. enviar somente os campos autorizados pelo usuário;
4. tratar a resposta como sugestão, nunca como lançamento definitivo;
5. manter uma alternativa totalmente determinística e offline.
