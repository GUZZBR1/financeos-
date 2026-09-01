# ADR 003 — Classificação determinística com IA opcional

## Status

Aceito.

## Decisão

O classificador padrão será um motor de regras local e explicável. Regras explícitas do usuário têm precedência sobre regras aprendidas e padrões gerais. Cada resultado informa regra, confiança e justificativa.

IA será implementada como uma porta opcional. Nenhum fluxo essencial poderá depender dela, e resultados de IA serão sugestões até confirmação do usuário.
