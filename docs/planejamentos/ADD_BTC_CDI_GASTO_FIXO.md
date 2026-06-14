# Plano de implementação — Gastos Fixos, Cripto (BTC) e CDI

> Documento de planejamento. Quem ler aqui deve saber **exatamente** o que mexer
> (backend + frontend), **o que decidir já está decidido**, qual o **custo** de cada
> parte e em **que ordem** implementar. Cada etapa é independente e testável.
>
> Stack atual (para referência): FastAPI + SQLAlchemy 2 + Alembic + Postgres no
> backend; React + TS + Vite + React Query + RHF/Zod + shadcn/Tailwind no front.
> O front fala sempre por `/api/...` (`src/lib/api.ts`). Soft delete em tudo via
> `active=False` (`TimestampMixin` em `app/models.py`). `httpx` **já está** no
> `requirements.txt` (não precisa instalar nada novo).

---

## 0. Visão geral das 3 features

| # | Feature | Onde aparece | Núcleo |
|---|---------|--------------|--------|
| **A** | **Gastos Fixos** | Tela **Orçamentos** (nova aba interna) | Template recorrente de despesa; marcar como pago **cria uma transação** vinculada |
| **B** | **Cripto / BTC** | Aba **Investimentos** do Dashboard | Novo tipo de transação com **quantidade**; valoriza `qtd × preço` (API); lucro/prejuízo por preço médio |
| **C** | **CDI** | Aba **Investimentos** do Dashboard | Conta de investimento **indexada ao CDI** (% do CDI); rende por juros compostos com a taxa atual (API) |

As três são **independentes** entre si — podem ser feitas/mergeadas em qualquer
ordem. Dentro de cada uma há etapas (backend → frontend) que **devem** seguir a
ordem listada.

---

## 1. Decisões já tomadas (não reabrir sem motivo)

### A — Gastos Fixos
1. **É um template fixo**, não um item preso a um mês. Reutilizável mês a mês.
2. **Soft delete** (como tudo): deletar = `active=False`. Nunca apaga histórico; as
   transações já geradas continuam intactas.
3. **Status é derivado, sem estado duplicado.** "Pago no mês (Y,M)" ⇔ existe uma
   `Transacao` ativa com aquele `gasto_fixo_id` naquele ano/mês. Marcar como pago =
   criar a transação vinculada. Desmarcar = soft delete dessa transação.
4. **Campos do template:** `name`, `tag_id` (despesa), `expected_value`
   **obrigatórios**; `default_account_id`, `default_payment_method`, `due_day`
   (1–31) **opcionais** (só pré-preenchem o formulário de pagamento).
5. **Recorrência a partir de um mês de início** (`start_year`, `start_month`,
   default = mês atual). Só aparece como pendente em meses ≥ início que ainda não
   têm transação. Meses anteriores ao início nunca aparecem.
6. **Conta no orçamento naturalmente:** como gera uma despesa normal com a tag, o
   valor entra no realizado do orçamento daquela tag sem tratamento especial.

### B — Cripto / BTC
7. **Compra e venda** (não só acumula). Total de BTC = Σ compras − Σ vendas.
8. **Modelo:** novos tipos `compra_cripto` e `venda_cripto` no enum `TransacaoType`
   + nova coluna `quantity` (fração de BTC) em `Transacao`. `value` = reais
   pagos/recebidos; `quantity` = BTC. Preço unitário é derivável (`value/quantity`).
9. **Lucro/prejuízo por preço médio ponderado** (padrão da Receita p/ cripto BR):
   `custo_medio = Σ(value compras) / Σ(quantity compras)`. Na venda de `q`:
   `lucro = value_recebido − q × custo_medio`.
10. **Preço via API:** AwesomeAPI `GET https://economia.awesomeapi.com.br/last/BTC-BRL`
    → campo `bid` (R$). Grátis, sem chave. Backend busca e cacheia; front faz poll.

### C — CDI
11. **Conta de investimento indexada:** uma `Conta` do tipo `investimento` pode ser
    marcada como indexada ao CDI, com um **percentual** (ex: 100%, 110%). Os aportes
    (transações `investimento`) nessa conta são o principal.
12. **Cálculo por projeção com a taxa atual** (aproximação simples, não histórico
    exato): para cada aporte,
    `montante = aporte × (1 + (cdi_anual% × percent%))^(dias_corridos/365)`.
13. **Taxa via API:** Banco Central SGS série **4389** (CDI anualizado, % a.a.)
    `GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json`
    → `[{"data":"dd/mm/aaaa","valor":"14.40"}]`. Grátis, sem chave. Cache longo (~12h).

### Transversais
14. **Sem dependências novas.** `httpx` já existe; usar para as chamadas externas.
15. **Degradação graciosa:** se a API externa cair, os endpoints de mercado
    respondem `available: false` (e/ou último valor em cache) — a UI mostra "cotação
    indisponível" em vez de quebrar.
16. **Decimais viram string no JSON** (Pydantic serializa `Decimal` como string) —
    manter a convenção já usada em `value`/`limit_value` no front (`types/api.ts`).

---

## 2. Estética do frontend (claro **e** escuro)

Toda UI nova **reusa os tokens e componentes existentes** — assim já funciona nos
dois temas automaticamente. **Nunca usar hex fixo** para cor semântica; usar as
variáveis CSS de `src/index.css` (`:root` = claro, `.dark` = escuro).

**Tokens a usar** (já definidos em ambos os temas):
- Superfícies/estrutura: classe utilitária `.board-card` (card padrão), `bg-card`,
  `bg-muted`, `border-border`, `text-foreground`, `text-muted-foreground`.
- Cores semânticas financeiras: `var(--c-despesa)` / `text-despesa` (vermelho, e
  **prejuízo**), `var(--c-receita)` / `text-receita` (verde, e **lucro**),
  `var(--c-investimento)` / `text-investimento` (roxo — usar p/ BTC/CDI),
  `var(--c-saldo)`, `var(--c-neutro)`.
- Números: classe `.num` (tabular-nums) em **todo** valor monetário/quantidade.
- Raio/sombra/densidade: `--radius-*`, `--shadow-*`, `--card-pad`, `--gutter`.

**Componentes a reusar** (não criar novos do zero):
- `@/components/ui/{button,input,label,select,dialog,badge,card,tabs}` e
  `@/components/ui/confirm-dialog`.
- `toast` de `sonner` para feedback (sucesso/erro), igual `orcamentos.tsx`.
- Ícones de `lucide-react`.
- Formatação: `@/lib/format` (`fmt.brl`, `fmt.pct`). **Adicionar** `fmt.btc` (8
  casas) e, se útil, `fmt.brl` já cobre o resto.
- Padrão de formulário: **RHF + Zod** espelhando o schema do backend, valor em
  **centavos** no input (ver `orcamento-form-dialog.tsx` como molde).
- Padrão de tela com lista: cabeçalho + seletor mês/ano + estados
  loading/erro/vazio + cards `.board-card` (ver `orcamentos.tsx` como molde).
- Padrão de aba do dashboard: `.charts-grid` + `GraphCard` (ver
  `features/dashboard/tabs/investimentos.tsx` e `board-card.tsx`).
- Controle segmentado: `features/dashboard/segmented.tsx` (reusar p/ alternar
  "Limites | Gastos Fixos" na tela Orçamentos).

---

## 3. Feature A — Gastos Fixos

### 3.1 Backend

**Modelo (`backend/app/models.py`)**
- Nova tabela `GastoFixo(TimestampMixin, Base)` — `__tablename__ = "gasto_fixo"`:
  - `name: str` (String(64), nullable=False)
  - `tag_id: int` (FK `tag.id`, nullable=False)
  - `expected_value: Decimal` (Numeric(12,2), nullable=False)
  - `default_account_id: int | None` (FK `conta.id`, nullable=True)
  - `default_payment_method: PaymentMethod | None` (Enum existente, nullable=True)
  - `due_day: int | None` (Integer, nullable=True)  ← 1–31
  - `start_year: int` (Integer, nullable=False)
  - `start_month: int` (Integer, nullable=False)
  - relationships: `tag`, `default_account`
- Em `Transacao`: adicionar `gasto_fixo_id: int | None`
  (FK `gasto_fixo.id`, nullable=True) + relationship `gasto_fixo`.

**Migration (Alembic)**
- `alembic revision --autogenerate -m "gasto_fixo + transacao.gasto_fixo_id"`,
  revisar o arquivo gerado em `backend/migrates/versions/`.
- ⚠️ Reset de dev: downgrade **não** dropa enums/tabelas limpo — para resetar o
  banco de dev use `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` e
  `alembic upgrade head` (ver memória `backend-migration-reset-gotcha`).

**Schemas (`backend/app/schemas/gasto_fixo.py`, novo)**
- `GastoFixoCreate`: name, tag_id, expected_value (>0), default_account_id?,
  default_payment_method?, due_day? (1–31), start_year, start_month (1–12).
- `GastoFixoUpdate`: todos opcionais (mesma validação condicional do padrão
  `OrcamentoUpdate`).
- `GastoFixoOut`: campos + `TimestampMixin`.
- `MarcarPagoPayload`: `value` (>0), `date`, `account_id`, `payment_method?`
  (campos que viram a transação).
- `GastoFixoStatusOut`: o template + `pago: bool` + `transacao: TransacaoOut | None`.

**Router (`backend/app/routers/gastos_fixos.py`, novo) — prefixo `/gastos-fixos`**
- Helper `_get_valid_despesa_tag` (copiar o de `orcamentos.py`).
- `GET /gastos-fixos/` — lista templates (`active=True` por padrão).
- `POST /gastos-fixos/` — cria template (valida tag despesa; valida conta se
  informada). `start_*` default = mês atual se não vier.
- `GET /gastos-fixos/{id}` / `PUT /{id}` / `DELETE /{id}` (soft delete) — padrão
  igual `orcamentos.py`.
- `GET /gastos-fixos/status?year=&month=` — **endpoint central**: retorna
  `List[GastoFixoStatusOut]` com cada template ativo cujo `(start_year,start_month)
  ≤ (year,month)`, marcando `pago`/`transacao` se existir `Transacao` ativa com
  aquele `gasto_fixo_id` naquele ano/mês.
- `POST /gastos-fixos/{id}/marcar-pago?year=&month=` (body `MarcarPagoPayload`) —
  cria a `Transacao` (`type=despesa`, `tag_id` do template, `gasto_fixo_id=id`,
  `value/date/account_id/payment_method` do body). **422** se já existe transação
  ativa daquele template naquele mês (idempotência).
- `DELETE /gastos-fixos/{id}/pagamento?year=&month=` — desmarca: soft delete da
  transação vinculada daquele mês.
- Registrar o router em `app/app.py` (`app.include_router(gastos_fixos.router)`).

**Tag/transação:** marcar pago cria despesa normal — o realizado do orçamento da
tag já soma sozinho (queries em `app/graphs/queries.py` não mudam).

**Testes (`backend/tests/test_gastos_fixos.py`, novo)** — seguir estilo de
`test_orcamentos.py`:
- CRUD do template (incl. 422 tag não-despesa, conta inválida).
- `status`: pendente antes de pagar; pago depois; respeita mês de início; não mostra
  mês < início.
- `marcar-pago`: cria transação correta, vincula `gasto_fixo_id`, 422 em duplicado.
- desmarcar: some o status pago, transação fica `active=False`.
- soft delete do template não apaga transações antigas.

### 3.2 Frontend

**Tipos (`src/types/api.ts`)** — adicionar `GastoFixoOut/Create/Update`,
`GastoFixoStatus`, `MarcarPagoPayload`. Lembrar: `expected_value`/`value` como
string.

**Hook (`src/hooks/useGastosFixos.ts`, novo)** — espelhar `useOrcamentos.ts`:
- `useGastosFixos()` (lista de templates), `useGastosFixosStatus(year, month)`.
- `useGastoFixoMutations()`: create/update/remove + `marcarPago` + `desmarcar`.
  Toda mutação invalida `["gastos-fixos"]`, `["transacoes"]`, `["orcamentos"]` e
  `["graphs"]` (porque o realizado do orçamento muda).

**Tela Orçamentos (`src/features/orcamentos/orcamentos.tsx`)**
- Adicionar um **segmentado no topo**: "Limites" (conteúdo atual) | "Gastos Fixos"
  (novo). Reusar `segmented.tsx`. O seletor de mês/ano já existente serve às duas.
- Aba "Gastos Fixos": botão "Novo gasto fixo" + lista do mês selecionado. Cada item
  num `.board-card`:
  - **Pendente:** ponto da cor da tag + nome + valor esperado em `.num` cinza +
    botão primário "Marcar como pago".
  - **Pago:** ✓ (`Check`, `text-receita`) + nome + valor pago/data/método +
    botão fantasma "Desmarcar" (`ConfirmDialog`).
  - Ações editar/remover template (ícones `Pencil`/`X`) como em `orcamentos.tsx`.
- Estados loading/erro/vazio idênticos ao padrão da tela.

**Dialogs novos (em `src/features/orcamentos/`)**
- `gasto-fixo-form-dialog.tsx` — CRUD do template (RHF+Zod, molde
  `orcamento-form-dialog.tsx`): nome, tag (select de despesa), valor esperado
  (input em centavos), conta padrão (select, opcional), método padrão (select,
  opcional), dia de vencimento (1–31, opcional), mês/ano de início (selects).
- `marcar-pago-dialog.tsx` — valor (pré-preenchido com `expected_value`), data
  (pré-preenchida com o `due_day` no mês selecionado, senão hoje), conta
  (pré-preenchida com `default_account_id`), método (pré-preenchido). Submete em
  `marcarPago`.

**Sem rota nova** — tudo dentro de `/orcamentos`.

---

## 4. Feature B — Cripto / BTC

### 4.1 Backend

**Enum + modelo (`backend/app/models.py`)**
- `TransacaoType`: adicionar `compra_cripto = "compra_cripto"` e
  `venda_cripto = "venda_cripto"`.
- `Transacao`: adicionar `quantity: Decimal | None`
  (Numeric(18,8), nullable=True) — fração de BTC.

**Migration** — alterar o enum `transacao_type` (ADD VALUE) + add coluna `quantity`.
⚠️ Alterar enum no Postgres exige `ALTER TYPE ... ADD VALUE` (autogenerate do
Alembic costuma **não** gerar isso — escrever manualmente no `upgrade()` com
`op.execute("ALTER TYPE transacao_type ADD VALUE IF NOT EXISTS 'compra_cripto'")`
e idem para `venda_cripto`). Coluna `quantity` é `op.add_column` normal.

**Schema (`backend/app/schemas/transacao.py`)**
- Adicionar `quantity: Optional[Decimal]` em Create/Update/Out.
- Validação: para `compra_cripto`/`venda_cripto`, `quantity` é **obrigatória e >0**;
  para os outros tipos, deve ser `None` (validar com `model_validator`).

**Router transações (`backend/app/routers/transacoes.py`)**
- `TAG_TYPE_COMPAT`: cripto usa tag de `investimento`
  (`compra_cripto`/`venda_cripto` → `TagType.investimento`) — ou permitir tag nula.
  Decidir e refletir no validador. (Sugestão: tag opcional, como hoje.)
- Persistir `quantity` no create/update.
- (Opcional) na `venda_cripto`, validar que não vende mais BTC do que o saldo atual
  → 422. MVP pode pular e só avisar na UI.
- CSV import/export: incluir `quantity` na lista de colunas (`CSV_FIELDNAMES`/
  `IMPORT_FIELDNAMES`) **ou** documentar que cripto fica fora do CSV no MVP.

**Serviço de cotação (`backend/app/services/quotes.py`, novo)**
- `get_btc_brl() -> dict` — `httpx.get` na AwesomeAPI, parse `BTCBRL.bid`,
  `pctChange`, `create_date`. **Cache em memória ~60s** (variável de módulo com
  timestamp). Em erro/timeout: retorna `{available: False}` (ou último cache).
- Timeout curto (ex: 5s) para não travar o request.

**Router mercado/investimentos (`backend/app/routers/investimentos.py`, novo)**
- `GET /mercado/btc` → `{available, price, change_pct, updated_at, source}`.
- `GET /investimentos/btc/resumo` → cruza transações:
  - `quantidade_btc` = Σ qty compra − Σ qty venda (ativas)
  - `investido` = Σ value compra − Σ value venda  (custo líquido em caixa) *ou*
    `custo_total` = Σ value compra; definir e documentar
  - `custo_medio` = Σ(value compra)/Σ(qty compra)
  - `preco_atual` (do serviço), `valor_atual` = quantidade_btc × preco_atual
  - `lucro_prejuizo` = valor_atual − (quantidade_btc × custo_medio);
    `lucro_pct` correspondente
  - se preço indisponível: `available: False`, devolve só os números de custo.
- (Opcional) `GET /investimentos/btc/realizado` → lucro/prejuízo já realizado das
  vendas (Σ por venda de `value − qty × custo_medio`).
- Registrar router em `app/app.py`.

**Testes** — `test_quotes`/`test_investimentos` com a chamada externa **mockada**
(monkeypatch em `get_btc_brl`); testar matemática de custo médio e
quantidade/valor/lucro. Validação de `quantity` em `test_transacoes.py`.

### 4.2 Frontend

**Tipos/constants**
- `src/types/api.ts`: `TRANSACAO_TYPES` += `compra_cripto`, `venda_cripto`;
  `TransacaoOut/Create` += `quantity?: string | null`. Novos tipos `MercadoBtc`,
  `InvestimentoBtcResumo`.
- `src/lib/constants.ts`: `TRANSACAO_TIPO_INFO` += labels/cores p/ os 2 tipos novos
  (cor `--c-investimento`); `TRANSACAO_TAG_TYPE` += mapeamento.
- `src/lib/format.ts`: `fmt.btc(n)` (8 casas, sufixo "BTC", `.num`).

**Form de transação (`src/features/transacoes/transacao-form-dialog.tsx`)**
- Quando `type ∈ {compra_cripto, venda_cripto}`: mostrar campo **Quantidade (BTC)**
  (input numérico com casas decimais) e manter valor (R$ pago/recebido), conta,
  método, data. Zod: quantity obrigatória/>0 nesses tipos. Mostrar o **preço médio
  derivado** (`value/quantity`) como dica.

**Hooks**
- `src/hooks/useMercado.ts` (novo): `useBtcQuote()` com
  `refetchInterval: 60_000` (poll). `useCdiRate()` (feature C) com `staleTime`
  longo.
- `src/hooks/useInvestimentos.ts` (novo): `useBtcResumo()`,
  `useCdiResumo()` (feature C).

**Aba Investimentos (`src/features/dashboard/tabs/investimentos.tsx`)** — adicionar
**acima** dos gráficos atuais (que permanecem):
- **Cartão de cotação BTC** (`.board-card`, `span=6`): "Bitcoin · BTC/BRL", preço
  grande em `.num`, variação do dia em verde/vermelho (`pctChange`), horário de
  atualização discreto. Estado "cotação indisponível" se `available=false`.
- **Cartão de patrimônio BTC** (`.board-card`, `span=6`): quantidade de BTC,
  custo médio, investido, valor atual, e **lucro/prejuízo** destacado
  (`text-receita` se ≥0, `text-despesa` se <0) com % entre parênteses.
- Reaproveitar `kpi`/layout existente para manter a estética.

---

## 5. Feature C — CDI

### 5.1 Backend

**Modelo (`backend/app/models.py`)** — em `Conta`:
- `indexador: str | None` (Enum novo `Indexador` com valor `cdi`, ou
  String nullable; preferir Enum `Indexador(str, enum.Enum)` p/ extensível).
  `None` = conta não indexada (comportamento atual).
- `indexador_percent: Decimal | None` (Numeric(6,2), nullable=True) — % do
  indexador (ex: 100.00, 110.00). Obrigatório quando `indexador` setado.

**Migration** — criar enum `indexador` (se Enum) + 2 colunas em `conta`.

**Schema (`backend/app/schemas/conta.py`)**
- Create/Update/Out += `indexador?`, `indexador_percent?`. Validar: se `indexador`
  presente → `indexador_percent` obrigatório/>0; e `type` deve ser `investimento`.

**Router contas** — persistir os 2 campos novos; aplicar a validação acima.

**Serviço de cotação (`backend/app/services/quotes.py`)**
- `get_cdi_anual() -> dict` — `httpx.get` na API do BCB (série 4389), parse
  `valor` (float) e `data`. **Cache ~12h**. Erro → `{available: False}`/cache.

**Router investimentos (`backend/app/routers/investimentos.py`)**
- `GET /mercado/cdi` → `{available, annual_rate, date, source}`.
- `GET /investimentos/cdi/resumo` → para cada `Conta` ativa com `indexador="cdi"`:
  - principal = Σ value das transações `investimento` ativas da conta
    (− `retirada_investimento`; ver simplificação abaixo)
  - para cada aporte: `montante = value × (1 + (cdi_anual/100 × percent/100))^(dias/365)`
  - `rendimento = Σ montante − principal`; `valor_atual = Σ montante`
  - resposta por conta: `{conta, principal, rendimento, valor_atual, percent}`.
  - **Simplificação MVP (documentada):** `retirada_investimento` abate do principal
    pelo valor nominal (sem render); aportes rendem desde a própria data. Não é o
    histórico exato do CDI diário — é projeção com a taxa atual (decisão #12).
- Registrar router (já feito na feature B).

**Testes** — matemática dos juros compostos com taxa mockada; conta sem indexador
não entra; validação dos campos novos em `test_contas.py`.

### 5.2 Frontend

**Tipos/constants**
- `src/types/api.ts`: `ContaOut/Create` += `indexador?`, `indexador_percent?`;
  novo enum `INDEXADORES = ["cdi"]`. Tipos `MercadoCdi`, `InvestimentoCdiResumo`.

**Form de conta (`src/features/contas/...`)** — quando `type=investimento`, mostrar
select "Indexador" (Nenhum | CDI) + input "% do CDI" (aparece se CDI). Validar com
Zod.

**Aba Investimentos (`investimentos.tsx`)** — adicionar:
- **Cartão de taxa CDI** (`.board-card`): "CDI", taxa anual em `.num` + data.
  Indisponível se `available=false`.
- **Cartão(es) de patrimônio CDI**: por conta indexada — principal, rendimento
  estimado (`text-receita`), valor atual, % do CDI. Usa `useCdiResumo()`.

---

## 6. Custo da alteração

Estimativa de esforço/complexidade (S=pequeno, M=médio, L=grande). Sem dependências
novas. 3 migrations no total (uma por feature). Risco concentra-se nas migrations
(enum/coluna) e nas chamadas externas (mockar nos testes).

| Feature | Backend | Frontend | Migrations | Testes | Tamanho |
|---------|---------|----------|------------|--------|---------|
| **A — Gastos Fixos** | model+schema+router (CRUD+status+pagar) | hook + segmentado + 2 dialogs na tela Orçamentos | 1 (tabela + FK) | M | **M–L** |
| **B — BTC** | enum+coluna+validação, serviço cotação, router resumo | tipos/format, quantity no form, 2 cards na aba | 1 (enum ADD VALUE + coluna) | M | **M** |
| **C — CDI** | 2 colunas em Conta, serviço cotação, router resumo | form de conta, 2 cards na aba | 1 (enum + 2 colunas) | S–M | **M** |

**Arquivos novos** (~12): `schemas/gasto_fixo.py`, `routers/gastos_fixos.py`,
`routers/investimentos.py`, `services/quotes.py`, `services/__init__.py`,
`tests/test_gastos_fixos.py`, `tests/test_investimentos.py` (+quotes);
front: `hooks/useGastosFixos.ts`, `hooks/useMercado.ts`, `hooks/useInvestimentos.ts`,
`features/orcamentos/gasto-fixo-form-dialog.tsx`,
`features/orcamentos/marcar-pago-dialog.tsx`.

**Arquivos alterados** (~10): `models.py`, `app.py`, `schemas/{transacao,conta}.py`,
`routers/{transacoes,contas}.py`; front: `types/api.ts`, `lib/constants.ts`,
`lib/format.ts`, `features/orcamentos/orcamentos.tsx`,
`features/transacoes/transacao-form-dialog.tsx`,
`features/contas/contas.tsx`, `features/dashboard/tabs/investimentos.tsx`.

**Riscos / pontos de atenção:**
- `ALTER TYPE ... ADD VALUE` não roda dentro de transação em Postgres antigo e o
  autogenerate não o emite — escrever manualmente.
- Cotações externas: sempre mockar nos testes; nunca deixar teste batendo na
  internet. Tratar timeout/erro no runtime (degradação graciosa, decisão #15).
- Preço médio com vendas: para o MVP usamos custo médio sobre **todas** as compras
  ativas (simples). Documentar essa escolha onde calcular.

---

## 7. Ordem de implementação (etapas simples)

Cada etapa: TDD (teste antes), roda a suíte (`pytest` no backend; `tsc`/lint no
front), commit pequeno. Features independentes — pode paralelizar A vs B vs C.

### Feature A — Gastos Fixos
- **A1 (back):** model `GastoFixo` + `Transacao.gasto_fixo_id` + migration.
- **A2 (back):** schemas + router (CRUD, `status`, `marcar-pago`, desmarcar) +
  registrar no app + `test_gastos_fixos.py`.
- **A3 (front):** tipos + `useGastosFixos.ts`.
- **A4 (front):** segmentado na tela Orçamentos + lista + `gasto-fixo-form-dialog`
  + `marcar-pago-dialog`.

### Feature B — BTC
- **B1 (back):** enum `compra_cripto`/`venda_cripto` + coluna `quantity` + migration
  + validação no schema/router + testes de transação.
- **B2 (back):** `services/quotes.py` (`get_btc_brl`) + `routers/investimentos.py`
  (`/mercado/btc`, `/investimentos/btc/resumo`) + testes mockados.
- **B3 (front):** tipos/constants/format + campo quantidade no form de transação.
- **B4 (front):** `useMercado.ts`/`useInvestimentos.ts` + cards BTC na aba
  Investimentos.

### Feature C — CDI
- **C1 (back):** `Conta.indexador` + `indexador_percent` + migration + validação no
  schema/router + testes de conta.
- **C2 (back):** `get_cdi_anual` + `/mercado/cdi` + `/investimentos/cdi/resumo` +
  testes mockados.
- **C3 (front):** campos indexador/% no form de conta.
- **C4 (front):** `useCdiRate`/`useCdiResumo` + cards CDI na aba Investimentos.

### Fechamento (cada feature)
- Rodar suíte completa do backend e build do front.
- Verificar nos dois temas (claro/escuro) que os cards/dialogs novos respeitam os
  tokens.
- Atualizar `docs/` se algum contrato de API mudou.
