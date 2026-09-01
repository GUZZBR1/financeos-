# API HTTP local

A API permite que outro programa executado no mesmo computador envie transações ao FinanceOS.

## Ativação

Em **Configurações → API HTTP local**:

1. mantenha o endereço `127.0.0.1`;
2. escolha uma porta entre 1024 e 65535;
3. gere um token forte;
4. habilite e salve.

O servidor existe apenas enquanto o FinanceOS estiver aberto. Ele não aceita escutar na rede externa.

## Saúde

```http
GET /health
```

Essa rota não exige autenticação e retorna o estado do serviço.

## Receber transações

```http
POST /v1/transactions
Authorization: Bearer SEU_TOKEN
Content-Type: application/json
```

Aceita um objeto ou uma lista com até 1000 objetos. Exemplo:

```json
{
  "externalId": "questor-2026-000123",
  "date": "2026-08-10",
  "type": "expense",
  "value": 149.90,
  "description": "Fornecedor ABC",
  "documentNumber": "123",
  "transactionType": "payment"
}
```

Campos obrigatórios:

- `externalId`: chave estável do sistema de origem;
- `date`: data no formato `YYYY-MM-DD`;
- `type`: `income` ou `expense`;
- `value`: número positivo;
- `description`: descrição da movimentação.

`externalId` garante idempotência: reenviar o mesmo registro da mesma origem não cria uma duplicação. O corpo é limitado a 1 MB.

Resposta:

```json
{ "accepted": 1, "duplicates": 0 }
```
