# Gestor Financex — Planejamento

Documento vivo do planejamento inicial. Estado: modelagem fechada, pronto para começar a programar.

## Visão geral

Gestor financeiro pessoal em formato web app, focado em cadastro rápido de movimentações financeiras, visualização por gráficos e portabilidade de dados via CSV.

- **Uso**: single-user (uso pessoal). Multi-user/compartilhamento ficou para "futuro bem distante".
- **Stack**: FastAPI (backend) + React (frontend) + PostgreSQL.
- **Execução**: Docker Compose, rodando local no notebook (por enquanto, até ter infra melhor).

## Funcionalidades planejadas

1. **Tags** — classificação de transações (despesas, receitas, investimentos).
2. **CRUD de transações** — cadastro rápido de:
   - Despesas
   - Receitas
   - Investimentos
   - Retiradas de investimento
3. **Web app** — FastAPI + React.
4. **Gráficos** — área de visualização para acompanhar gastos, ganhos e investimentos ao longo do tempo. Catálogo completo (21 gráficos, óticas, endpoints e shapes) em `GRAFICOS.md`.
5. **Orçamento** *(fase 1.5)* — limite mensal de gasto por tag (despesa). Base para os gráficos de orçado×realizado, progresso e alerta de estouro projetado.
6. **Análise por LLM** *(fase 2)* — integração com alguma LLM para análises automáticas. Adiado porque só faz sentido depois de acumular alguns meses de dados.
7. **Import/export CSV** — apenas para **transações**. Baixar todas as movimentações cadastradas e alimentar o sistema com CSVs padronizados.
8. **Import/export JSON** — para **configurações**: tags e contas cadastradas (e outras configs futuras).

## Decisões já tomadas

- **Single-user**: nenhuma tabela carrega `user_id`. Sem multi-tenant, sem RLS.
- **Sem auth/login**: o app não terá tela de login. Roda local no notebook do usuário.
- **LLM é fase 2**: prioridade é construir o hábito de cadastro e acumular dados primeiro.
- **Banco**: PostgreSQL, em container do `docker-compose`.
- **Deploy**: `docker-compose` rodando local no notebook do usuário. Migração para infra dedicada fica para o futuro.
- **Formato de import/export**:
  - **CSV** apenas para **transações**.
  - **JSON** para **configurações** (tags, contas e demais configs futuras).
- **Modelagem**:
  - Tabela única `Transacao` (com campo `type`) em vez de models separados por tipo.
  - Relação `Transacao` → `Tag` é **FK simples** (uma tag por transação).
  - `Orcamento` é limite mensal por tag de **despesa** (um registro por `tag_id` + `year` + `month`).
- **Investimento nos gráficos**: nunca conta como saída no fluxo — é categoria/ótica própria (patrimônio). Detalhes em `GRAFICOS.md`.

## Modelagem de dados

### Convenções gerais

- Todos os models têm: `id` (PK, autoincrement), `active` (bool, soft delete, default `True`), `created_at`, `updated_at` (ambos `timestamptz`, default `now()`).
- Soft delete via `active=False` — nunca apaga histórico de fato.
- Valores monetários como `Numeric(12, 2)` — **nunca `float`/`real`**.
- Cores em hex `#RRGGBB` (string de 7 chars).
- Enums implementados como tipos `ENUM` nativos do PostgreSQL (via SQLAlchemy `Enum`).

### `Transacao`

Tabela única para todos os tipos de movimentação. Justificativa: ~90% dos campos são iguais, e relatórios/gráficos ficam triviais ("soma por tag no mês" funciona pra qualquer tipo).

| Campo            | Tipo                   | Nullable | Notas                                              |
|------------------|------------------------|----------|----------------------------------------------------|
| `id`             | `int` PK               | não      | autoincrement                                      |
| `active`         | `bool`                 | não      | default `True`                                     |
| `created_at`     | `timestamptz`          | não      | default `now()` — quando foi registrada            |
| `updated_at`     | `timestamptz`          | não      | default `now()`, atualiza no update                |
| `type`           | enum `TransacaoType`   | não      | `despesa`, `receita`, `investimento`, `retirada_investimento` |
| `value`          | `Numeric(12, 2)`       | não      | sempre positivo; o sinal vem do `type`             |
| `date`           | `date`                 | não      | data em que a movimentação aconteceu (≠ `created_at`) |
| `description`    | `text`                 | sim      | texto livre                                        |
| `account_id`     | `int` FK → `Conta.id`  | não      | conta de origem/destino                            |
| `tag_id`         | `int` FK → `Tag.id`    | sim      | uma tag por transação (FK simples)                 |
| `payment_method` | enum `PaymentMethod`   | sim      | `pix`, `card`, `cash`, `transfer`. Faz mais sentido em `despesa`/`receita`; nullable porque investimento/retirada nem sempre se aplicam. |

**Validações de aplicação** (não dá pra impor só no schema):

- `tag_id` referenciado deve ter `Tag.type` compatível com `Transacao.type`:
  - `despesa` → tag tipo `despesa`
  - `receita` → tag tipo `receita`
  - `investimento` e `retirada_investimento` → tag tipo `investimento`
- `account_id` deve referenciar uma `Conta` com `active=True` no momento do cadastro.

### `Tag`

| Campo        | Tipo                | Nullable | Notas                              |
|--------------|---------------------|----------|------------------------------------|
| `id`         | `int` PK            | não      | autoincrement                      |
| `active`     | `bool`              | não      | default `True`                     |
| `created_at` | `timestamptz`       | não      | default `now()`                    |
| `updated_at` | `timestamptz`       | não      | default `now()`, atualiza no update|
| `name`       | `varchar(64)`       | não      | único entre tags ativas do mesmo `type` |
| `type`       | enum `TagType`      | não      | `despesa`, `receita`, `investimento` |
| `color`      | `varchar(7)`        | não      | hex `#RRGGBB`                      |

### `Conta`

| Campo        | Tipo                | Nullable | Notas                              |
|--------------|---------------------|----------|------------------------------------|
| `id`         | `int` PK            | não      | autoincrement                      |
| `active`     | `bool`              | não      | default `True`                     |
| `created_at` | `timestamptz`       | não      | default `now()`                    |
| `updated_at` | `timestamptz`       | não      | default `now()`, atualiza no update|
| `name`       | `varchar(64)`       | não      | único entre contas ativas          |
| `type`       | enum `ContaType`    | não      | `banco`, `investimento`, `carteira`|
| `color`      | `varchar(7)`        | não      | hex `#RRGGBB`                      |

### `Orcamento`

Limite mensal de gasto por tag de despesa. Base dos gráficos de orçamento (ver `GRAFICOS.md`, grupo G).

| Campo         | Tipo                   | Nullable | Notas                                              |
|---------------|------------------------|----------|----------------------------------------------------|
| `id`          | `int` PK               | não      | autoincrement                                      |
| `active`      | `bool`                 | não      | default `True` (soft delete)                       |
| `created_at`  | `timestamptz`          | não      | default `now()`                                    |
| `updated_at`  | `timestamptz`          | não      | default `now()`, atualiza no update                |
| `tag_id`      | `int` FK → `Tag.id`    | não      | a tag referenciada deve ter `type = despesa`       |
| `year`        | `int`                  | não      | ex: 2026                                           |
| `month`       | `int`                  | não      | 1–12                                               |
| `limit_value` | `Numeric(12, 2)`       | não      | limite do mês; sempre positivo                     |

**Validações de aplicação:**

- `tag_id` deve referenciar uma `Tag` com `type = despesa` e `active = True`.
- Único `(tag_id, year, month)` entre orçamentos ativos.
- `limit_value > 0`.

### Enums

```
TransacaoType  = { despesa, receita, investimento, retirada_investimento }
TagType        = { despesa, receita, investimento }
PaymentMethod  = { pix, card, cash, transfer }
ContaType      = { banco, investimento, carteira }
```

## Próximos passos

1. Esqueleto do projeto: estrutura de pastas (backend FastAPI + frontend React) e `docker-compose.yml` com Postgres.
2. Implementar models (SQLAlchemy: `Transacao`, `Tag`, `Conta`, `Orcamento`) + migrations (Alembic).
3. Definir schema do CSV de transações (colunas, encoding, separador, formato de data) e do JSON de configs.
4. Endpoints CRUD (FastAPI) e telas básicas de cadastro (React).
5. Orçamento (CRUD `/orcamentos`) — fase 1.5.
6. Gráficos (`/graphs`) conforme `GRAFICOS.md`.
