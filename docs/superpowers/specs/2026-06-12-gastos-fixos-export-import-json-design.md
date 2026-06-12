# Gastos fixos no export/import JSON

**Data:** 2026-06-12
**Branch:** feat/btc-cdi-gastos-fixos

## Objetivo

Incluir os gastos fixos no export e import de JSON de configurações
(`/configs/export` e `/configs/import`), do mesmo jeito que já acontece com
tags e contas. Hoje os gastos fixos só existem no banco via a aba de
Orçamentos e não têm caminho de backup/migração por arquivo.

## Contexto

- `GET /configs/export` retorna `{ tags, contas }`, exportando ambos **por
  nome** (não por ID), porque IDs não são portáveis entre bancos.
- `POST /configs/import` recebe `{ tags, contas }`, deduplica
  (tag por `nome+tipo`, conta por `nome`), reativa inativos e cria novos.
- O `GastoFixo` (`backend/app/models.py`) referencia `tag_id` (obrigatório) e
  `default_account_id` (opcional) por chave estrangeira, além de
  `expected_value`, `default_payment_method`, `due_day`, `start_year`,
  `start_month`, `name`.
- O frontend (`frontend/src/features/import-export/import-export.tsx`) exporta
  fazendo `JSON.stringify` do retorno de `/configs/export` e importa postando o
  JSON parseado inteiro para `/configs/import`.

## Decisões

1. **Referência de tag/conta:** por nome + tipo (não por ID), seguindo o padrão
   das configs.
2. **Tag/conta faltante no import:** auto-criar com cor padrão (`#64748b`).
3. **Identidade de duplicado:** `nome + tag`. Existe ativo → ignora; existe
   inativo → reativa e atualiza campos; senão → cria.
4. Só exporta gastos fixos **ativos** (igual a tags/contas).

## Backend — `backend/app/routers/configs.py`

### Export — `GET /configs/export`

Adicionar a chave `gastos_fixos`. Cada item referencia tag e conta por nome +
tipo:

```json
{
  "tags": [...],
  "contas": [...],
  "gastos_fixos": [
    {
      "name": "Aluguel",
      "tag_name": "Moradia",
      "tag_type": "despesa",
      "expected_value": "1500.00",
      "default_account_name": "Nubank",
      "default_account_type": "banco",
      "default_payment_method": "pix",
      "due_day": 10,
      "start_year": 2026,
      "start_month": 1
    }
  ]
}
```

- `expected_value` serializado como string (Decimal), consistente com o resto.
- Se `default_account_id` for null: `default_account_name` e
  `default_account_type` ficam null.
- Carrega a tag/conta via relationship pra obter nome + tipo.

### Import — `POST /configs/import`

Aceitar `gastos_fixos` opcional no body (`ConfigImportBody`). Processar
**depois** de tags e contas, para que elas já existam e possam ser resolvidas.

Para cada gasto fixo:
1. Resolver tag por `(tag_name, tag_type)` entre as tags ativas; se faltar,
   criar `Tag(name=tag_name, type=tag_type, color="#64748b")`.
2. Se `default_account_name` presente: resolver conta por
   `(default_account_name, default_account_type)` entre as contas ativas; se
   faltar, criar `Conta(name=..., type=..., color="#64748b")`. Senão, conta
   fica null.
3. Dedup por `nome + tag_id`:
   - existe `GastoFixo` ativo com mesmo `name` e `tag_id` → ignora;
   - existe inativo → reativa (`active=True`) e atualiza
     `expected_value`, `default_account_id`, `default_payment_method`,
     `due_day`, `start_year`, `start_month`;
   - senão → cria.

Retorno passa a incluir:

```json
{
  "tags": { "criadas": ..., "ignoradas": ... },
  "contas": { "criadas": ..., "ignoradas": ... },
  "gastos_fixos": { "criadas": ..., "ignoradas": ... }
}
```

### Schemas novos

- `ConfigGastoFixoItem` (export/import): `name`, `tag_name`, `tag_type`,
  `expected_value`, `default_account_name?`, `default_account_type?`,
  `default_payment_method?`, `due_day?`, `start_year`, `start_month`.
- `ConfigImportBody` ganha `gastos_fixos: List[ConfigGastoFixoItem] = []`.

## Frontend

### `frontend/src/types/api.ts`

- Adicionar `ConfigGastoFixoItem` espelhando o schema do backend.
- `ConfigsExport` ganha `gastos_fixos: ConfigGastoFixoItem[]`.
- `ConfigImportResult` ganha `gastos_fixos: { criadas: number; ignoradas: number }`.

### `frontend/src/features/import-export/import-export.tsx`

- **Export:** sem mudança na lógica — `JSON.stringify` do retorno já inclui os
  gastos fixos. Nome do arquivo continua `financex-configs.json`.
- **Import:** sem mudança na chamada — o JSON parseado inteiro já é postado.
  Ajustar o resumo de resultado pra exibir os gastos fixos
  ("X gastos fixos importados, Y ignorados").

## Testes — `backend/tests/`

- Export inclui `gastos_fixos` com tag/conta resolvidas por nome.
- Export omite gastos fixos inativos.
- Import cria gasto fixo novo e vincula tag/conta corretas.
- Import ignora duplicado (mesmo `nome+tag` ativo).
- Import reativa gasto fixo inativo e atualiza campos.
- Import **auto-cria tag faltante** (e conta faltante) e vincula.
- Round-trip: export → import em banco limpo recria o gasto fixo idêntico.
