# ADR 002 — Modelo financeiro e contábil

## Status

Aceito.

## Decisão

O armazenamento usará lançamentos contábeis de partidas dobradas. Uma transação bancária é a evidência de origem; sua contabilização gera um lançamento com pelo menos duas partidas, cuja soma deve ser zero.

Categorias de interface serão vinculadas a contas do plano de contas. Descrição bancária nunca será usada como categoria implícita.

## Consequências

- Integrações contábeis podem mapear débito e crédito sem reconstruir o domínio.
- Conciliação bancária e rastreabilidade ficam separadas da classificação.
- Lançamentos incompletos permanecem em revisão e não são enviados a conectores.
