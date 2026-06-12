# Orçamentos como template recorrente + export/import JSON

**Data:** 2026-06-12
**Branch:** feat/btc-cdi-gastos-fixos

## Objetivo

Fazer os orçamentos estarem presentes em todos os meses, na mesma modelagem
dos gastos fixos (template com mês de início projetado adiante), em vez de
exigir uma linha por (tag, ano, mês). Além disso, incluí-los no export/import
de JSON de configurações.

## Contexto

- Hoje `Orcamento` (`backend/app/models.py`) é uma linha por
  `(tag_id, year, month, limit_value)`. Unicidade ativa em
  `(tag_id, year, month)`. O usuário recria o limite a cada mês.
- `GastoFixo` é o modelo-alvo: template com `start_year`/`start_month`, sem
  linha por mês; o endpoint `/gastos-fixos/status?year=&month=` projeta os
  templates ativos cujo início é `<= (year, month)`.
- Os gráficos `orcamento_realizado`, `orcamento_progresso` e
  `orcamento_alerta_estouro` (`backend/app/graphs/queries.py`) filtram
  `Orcamento.year == year, Orcamento.month == month`.
- Frontend: `useOrcamentos(year, month)` lista por mês; `orcamentos.tsx`
  exibe a lista + progresso (via gráfico); `orcamento-form-dialog.tsx` cria
  por mês.
- Dados atuais: 6 orçamentos ativos, todos 2026-06, um por tag.

## Decisões

1. **Limite único por tag** (template puro, igual ao `expected_value` do
   gasto fixo). Editar o limite muda todos os meses. Sem override por mês.
2. **Migration de duplicatas:** se uma tag tiver orçamentos ativos em vários
   meses, colapsa em um template: `start` = mês mais antigo, `limit_value` =
   do mês mais recente. Os demais ativos da tag viram inativos.
3. **Tag faltante no import:** auto-criar com cor padrão `#64748b` (mesma
   regra dos gastos fixos).
4. **Dedup no import:** por tag (um template ativo por tag). Existe ativo →
   ignora; existe inativo → reativa e atualiza; senão → cria.

## Seção 1 — Modelo + migration

### `backend/app/models.py`

`Orcamento` remove `year`/`month`, adiciona:

```python
start_year: Mapped[int] = mapped_column(Integer, nullable=False)
start_month: Mapped[int] = mapped_column(Integer, nullable=False)
```

Passa a valer "um orçamento ativo por tag".

### Migration alembic

1. Adiciona `start_year`/`start_month` nullable.
2. Backfill `start_year=year`, `start_month=month` em todas as linhas.
3. Colapsa duplicatas por tag entre ativos (decisão 2): para cada `tag_id` com
   mais de um ativo, mantém uma linha com `start` = `min(year*12+month)` e
   `limit_value` = da linha com `max(year*12+month)`; marca as demais ativas
   da tag como `active=False`.
4. `ALTER` `start_year`/`start_month` para NOT NULL; dropa `year`/`month`.

Downgrade: recria `year`/`month`, backfill `year=start_year`,
`month=start_month`, dropa `start_*`. (Perda das linhas colapsadas é aceitável;
ver gotcha de reset de banco em dev.)

## Seção 2 — Backend: API + gráficos

### `backend/app/schemas/orcamento.py`

`OrcamentoCreate`/`OrcamentoUpdate`/`OrcamentoOut` trocam `year`/`month` por
`start_year`/`start_month` (validações mantidas: `start_month` 1–12,
`limit_value > 0`).

### `backend/app/routers/orcamentos.py`

- `_check_uniqueness`: passa a checar **um orçamento ativo por tag**
  (`tag_id` + `active`, com `exclude_id` no update). 409 em conflito.
- `create_orcamento`: usa `start_year`/`start_month`.
- `list_orcamentos`: quando `year`/`month` informados, retorna templates
  ativos com `(start_year*12+start_month) <= (year*12+month)`; sem eles,
  retorna todos os ativos. Mantém filtro opcional por `tag_id`.
- `get`/`update`/`delete`: iguais, com os campos novos.

### `backend/app/graphs/queries.py`

Nas 3 funções, trocar o filtro de mês por:

```python
Orcamento.active.is_(True),
(Orcamento.start_year * 12 + Orcamento.start_month) <= (year * 12 + month),
```

O "realizado" continua sendo o gasto real da tag no mês consultado vs o
`limit_value` do template.

## Seção 3 — Export/import JSON (`backend/app/routers/configs.py`)

### Export — `GET /configs/export`

Adicionar chave `orcamentos` (só ativos), tag por nome+tipo:

```json
{
  "tag_name": "Delivery",
  "tag_type": "despesa",
  "limit_value": "220.00",
  "start_year": 2026,
  "start_month": 6
}
```

### Import — `POST /configs/import`

`ConfigImportBody` ganha `orcamentos: List[ConfigOrcamentoItem] = []`,
processado depois de tags/contas (reusa `_resolve_or_create_tag`):

- Resolve/auto-cria a tag por `(tag_name, tag_type)`.
- Dedup por tag: ativo → ignora; inativo → reativa e atualiza
  `limit_value`/`start_year`/`start_month`; senão → cria.
- Retorno inclui `orcamentos: {criadas, ignoradas}`.

`ConfigOrcamentoItem`: `tag_name`, `tag_type`, `limit_value`, `start_year`,
`start_month`.

## Seção 4 — Frontend

### `frontend/src/types/api.ts`

- `OrcamentoOut`/`Create`/`Update`: `year`/`month` → `start_year`/`start_month`.
- Novo `ConfigOrcamentoItem` (`tag_name`, `tag_type`, `limit_value`,
  `start_year`, `start_month`).
- `ConfigsExport` ganha `orcamentos: ConfigOrcamentoItem[]`.
- `ConfigImportResult` ganha `orcamentos: { criadas; ignoradas }`.

### `frontend/src/hooks/useOrcamentos.ts`

Query mantém `{year, month}` (agora "iniciados até o mês"). Sem mudança na
assinatura.

### `frontend/src/features/orcamentos/orcamento-form-dialog.tsx`

Ao criar, envia `start_year`/`start_month` = mês em visualização (em vez de
`year`/`month`). Editar altera o limite do template (global). Form: tag +
limite.

### `frontend/src/features/orcamentos/orcamentos.tsx`

Ajustar textos: criar = "a partir de {mês}"; excluir = "removido de todos os
meses". Lista e progresso seguem usando `year`/`month`.

### `frontend/src/features/import-export/import-export.tsx`

Body do import inclui `orcamentos`; invalida `["orcamentos"]`; resumo mostra
"X orçamentos criados, Y ignorados"; textos descritivos atualizados.

## Seção 5 — Testes

- **Backend orçamentos** (`tests/test_orcamentos.py`): criar template;
  unicidade (2º ativo na mesma tag → 409); `GET ?year/month` projeta só os
  iniciados (start futuro não aparece); editar limite reflete em meses
  futuros; soft-delete some de todos os meses.
- **Gráficos** (`tests/test_graphs.py`): `realizado/progresso/alerta` usam o
  template em meses ≥ start, com realizado do mês.
- **Export/import** (`tests/test_configs.py`): export inclui `orcamentos` por
  nome; import cria/ignora/reativa/auto-cria tag; round-trip.
- **Migration**: teste de upgrade colapsando duplicatas (start mais antigo,
  limite mais recente) — se a suíte testar migrations; senão, validar via
  os testes de comportamento acima.
