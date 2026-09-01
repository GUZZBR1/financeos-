# Questor SYN

O FinanceOS possui um adaptador configurável para enviar lançamentos contábeis ao Questor. A sincronização é iniciada no FinanceOS; não é necessário expor o computador na internet.

## Configuração

Em **Configurações → Questor SYN**, informe:

- URL base fornecida para o ambiente;
- caminho do endpoint de lançamentos;
- caminho usado para testar a conexão;
- CNPJ do cliente e, se diferente, do estabelecimento;
- CNPJ(s) da contabilidade;
- código de histórico padrão;
- token de acesso, quando exigido.

Os caminhos e a autenticação podem variar conforme a versão e o contrato do ambiente Questor. Eles devem ser confirmados com o responsável pela integração antes do primeiro envio real.

## De/Para contábil

Depois de salvar o conector, preencha o código Questor para cada conta local. O envio é bloqueado enquanto alguma conta usada por um lançamento pendente estiver sem mapeamento.

O layout gerado:

- usa data `DD/MM/AAAA`;
- usa valores com duas casas decimais e vírgula;
- sanitiza quebras de linha e ponto e vírgula em campos textuais;
- aplica o prefixo contábil esperado quando necessário;
- envia partidas de débito e crédito previamente balanceadas.

Ao concluir um envio, o identificador do lançamento é gravado no De/Para de exportação. Assim, a mesma partida não volta para a fila em execuções posteriores.

## Operação segura

1. Salve o conector desabilitado.
2. Preencha todo o De/Para.
3. Use **Testar conexão**.
4. Valide o primeiro payload em um ambiente de homologação.
5. Habilite o conector e envie os pendentes.

O FinanceOS registra cada tentativa de sincronização, quantidade processada e mensagem de falha no SQLite.
