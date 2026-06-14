# Cripto / BTC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar compras e vendas de BTC (com quantidade), valorizar o patrimônio em BTC pelo preço atual (API) e mostrar lucro/prejuízo por preço médio na aba Investimentos.

**Architecture:** Dois novos tipos de transação (`compra_cripto`, `venda_cripto`) + coluna `quantity` em `Transacao`. Um serviço busca o preço BTC/BRL (AwesomeAPI) com cache em memória; um endpoint cruza as transações com o preço para devolver quantidade, custo médio, valor atual e lucro/prejuízo. O front faz poll do preço e mostra dois cards.

**Tech Stack:** FastAPI + SQLAlchemy 2 + Alembic + Postgres; `httpx` (já é dep) para a chamada externa. React + TS + React Query + RHF/Zod.

**Spec de referência:** `docs/planejamentos/ADD_BTC_CDI_GASTO_FIXO.md` (§1 B, §4).

---

## Convenções (ler antes)

- Backend tests contra Postgres de teste: `docker compose exec backend pytest tests/<arquivo> -v`. `conftest.py` cria tabelas via `Base.metadata.create_all` — testes **não** dependem da migration.
- **Chamadas externas nunca batem na internet nos testes** — sempre `monkeypatch` no serviço de cotação.
- Decimais voltam como **string** no JSON. Front mantém string e converte na formatação.
- Frontend: `npm run typecheck` e `npm run lint` (zero warnings).

## Estrutura de arquivos

**Backend**
- Modificar: `backend/app/models.py` — enum `TransacaoType` (+2 valores), coluna `Transacao.quantity`.
- Modificar: `backend/app/schemas/transacao.py` — `quantity` + validação condicional.
- Modificar: `backend/app/routers/transacoes.py` — persistir `quantity`; tag de cripto = investimento.
- Criar: `backend/app/services/__init__.py` (vazio) e `backend/app/services/quotes.py` — cotação BTC com cache.
- Criar: `backend/app/routers/investimentos.py` — `/mercado/btc` e `/investimentos/btc/resumo`.
- Modificar: `backend/app/app.py` — registrar o router.
- Criar: migration (gerada) — enum ADD VALUE + coluna.
- Criar: `backend/tests/test_investimentos_btc.py`.
- Modificar: `backend/tests/test_transacoes.py` — validação de `quantity`.

**Frontend**
- Modificar: `frontend/src/types/api.ts` — tipos novos.
- Modificar: `frontend/src/lib/constants.ts` — labels/cores dos tipos cripto.
- Modificar: `frontend/src/lib/format.ts` — `fmt.btc`.
- Modificar: `frontend/src/features/transacoes/transacao-form-dialog.tsx` — campo Quantidade.
- Criar: `frontend/src/hooks/useMercado.ts` — cotações (poll).
- Criar: `frontend/src/hooks/useInvestimentos.ts` — resumos.
- Modificar: `frontend/src/features/dashboard/tabs/investimentos.tsx` — cards BTC.

---

## Task 1: Enum + coluna `quantity` no modelo

**Files:**
- Modify: `backend/app/models.py`

- [ ] **Step 1: Adicionar os valores ao enum e a coluna**

Em `class TransacaoType` adicione os dois valores:

```python
class TransacaoType(str, enum.Enum):
    despesa = "despesa"
    receita = "receita"
    investimento = "investimento"
    retirada_investimento = "retirada_investimento"
    compra_cripto = "compra_cripto"
    venda_cripto = "venda_cripto"
```

Em `class Transacao`, após `payment_method` (e antes dos relationships), adicione:

```python
    quantity: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 8), nullable=True
    )
```

- [ ] **Step 2: Import sanity**

Run: `docker compose exec backend python -c "from app.models import TransacaoType; print(TransacaoType.compra_cripto.value)"`
Expected: imprime `compra_cripto`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/models.py
git commit -m "feat(btc): tipos compra/venda_cripto + Transacao.quantity"
```

---

## Task 2: Validação de `quantity` no schema (test-first)

**Files:**
- Modify: `backend/app/schemas/transacao.py`
- Modify: `backend/tests/test_transacoes.py`

- [ ] **Step 1: Escrever os testes (falhando)**

Acrescente em `backend/tests/test_transacoes.py` (use os helpers de conta/tag já existentes no arquivo; se não houver helper de tag investimento, crie um inline):

```python
def _conta(client):
    r = client.post("/contas", json={"name": "Cripto", "type": "investimento", "color": "#F7931A"})
    assert r.status_code == 201
    return r.json()


def _tag_inv(client):
    r = client.post("/tags", json={"name": "Bitcoin", "type": "investimento", "color": "#F7931A"})
    assert r.status_code == 201
    return r.json()


def test_compra_cripto_requires_quantity(client):
    conta = _conta(client)
    tag = _tag_inv(client)
    res = client.post("/transacoes/", json={
        "type": "compra_cripto", "value": "1000.00", "date": "2026-06-01",
        "account_id": conta["id"], "tag_id": tag["id"],
    })
    assert res.status_code == 422


def test_compra_cripto_with_quantity_ok(client):
    conta = _conta(client)
    tag = _tag_inv(client)
    res = client.post("/transacoes/", json={
        "type": "compra_cripto", "value": "1000.00", "date": "2026-06-01",
        "account_id": conta["id"], "tag_id": tag["id"], "quantity": "0.00310000",
    })
    assert res.status_code == 201
    assert float(res.json()["quantity"]) == 0.0031


def test_despesa_rejects_quantity(client):
    conta = _conta(client)
    res = client.post("/transacoes/", json={
        "type": "despesa", "value": "50.00", "date": "2026-06-01",
        "account_id": conta["id"], "quantity": "0.001",
    })
    assert res.status_code == 422
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec backend pytest tests/test_transacoes.py -k cripto -v`
Expected: FAIL (quantity ainda não validado/persistido).

- [ ] **Step 3: Implementar `quantity` + validação no schema**

Em `backend/app/schemas/transacao.py`, importe `model_validator` e adicione `quantity` aos três schemas. No `TransacaoCreate`:

```python
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
...
class TransacaoCreate(BaseModel):
    type: TransacaoType
    value: Decimal
    date: _dt.date
    description: Optional[str] = None
    account_id: int
    tag_id: Optional[int] = None
    payment_method: Optional[PaymentMethod] = None
    quantity: Optional[Decimal] = None

    @field_validator("value")
    @classmethod
    def value_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("value must be greater than 0")
        return v

    @model_validator(mode="after")
    def check_quantity(self):
        cripto = self.type in (TransacaoType.compra_cripto, TransacaoType.venda_cripto)
        if cripto:
            if self.quantity is None or self.quantity <= 0:
                raise ValueError("quantity is required and must be > 0 for crypto transactions")
        elif self.quantity is not None:
            raise ValueError("quantity is only allowed for crypto transactions")
        return self
```

Em `TransacaoUpdate` adicione `quantity: Optional[Decimal] = None` (sem o model_validator — update é parcial). Em `TransacaoOut` adicione `quantity: Optional[Decimal]`.

- [ ] **Step 4: Persistir no router**

Em `backend/app/routers/transacoes.py`:

1. No dict `TAG_TYPE_COMPAT`, adicione as duas linhas:

```python
    TransacaoType.compra_cripto: TagType.investimento,
    TransacaoType.venda_cripto: TagType.investimento,
```

2. Em `create_transacao`, ao montar `Transacao(...)`, adicione `quantity=payload.quantity,`.

3. Em `update_transacao`, junto dos outros campos parciais, adicione:

```python
    if "quantity" in payload_dict:
        transacao.quantity = payload_dict["quantity"]
```

- [ ] **Step 5: Rodar e ver passar**

Run: `docker compose exec backend pytest tests/test_transacoes.py -v`
Expected: PASS (incluindo os de cripto, sem quebrar os existentes).

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/transacao.py backend/app/routers/transacoes.py backend/tests/test_transacoes.py
git commit -m "feat(btc): validação e persistência de quantity em transações cripto"
```

---

## Task 3: Serviço de cotação BTC

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/quotes.py`

- [ ] **Step 1: Criar o pacote services**

Crie `backend/app/services/__init__.py` vazio.

- [ ] **Step 2: Criar o serviço de cotação**

Crie `backend/app/services/quotes.py`:

```python
"""Cotações externas (BTC, CDI) com cache em memória e degradação graciosa.

Nunca lança para o caller: em erro/timeout devolve {"available": False}.
Os routers chamam `quotes.get_btc_brl()` (importando o módulo) para que os
testes possam monkeypatchar a função.
"""
import time
from typing import Optional

import httpx

_BTC_URL = "https://economia.awesomeapi.com.br/last/BTC-BRL"
_BTC_TTL = 60  # segundos
_btc_cache: Optional[dict] = None
_btc_at: float = 0.0


def get_btc_brl() -> dict:
    global _btc_cache, _btc_at
    now = time.time()
    if _btc_cache is not None and (now - _btc_at) < _BTC_TTL:
        return _btc_cache
    try:
        resp = httpx.get(_BTC_URL, timeout=5.0)
        resp.raise_for_status()
        node = resp.json()["BTCBRL"]
        data = {
            "available": True,
            "price": float(node["bid"]),
            "change_pct": float(node.get("pctChange", 0.0)),
            "updated_at": node.get("create_date"),
            "source": "awesomeapi",
        }
        _btc_cache = data
        _btc_at = now
        return data
    except Exception:
        if _btc_cache is not None:
            return _btc_cache
        return {"available": False, "source": "awesomeapi"}
```

- [ ] **Step 3: Sanity import**

Run: `docker compose exec backend python -c "from app.services import quotes; print(hasattr(quotes, 'get_btc_brl'))"`
Expected: `True`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/__init__.py backend/app/services/quotes.py
git commit -m "feat(btc): serviço de cotação BTC com cache"
```

---

## Task 4: Endpoints `/mercado/btc` e `/investimentos/btc/resumo` (test-first)

**Files:**
- Create: `backend/app/routers/investimentos.py`
- Modify: `backend/app/app.py`
- Create: `backend/tests/test_investimentos_btc.py`

- [ ] **Step 1: Escrever os testes (falhando)**

Crie `backend/tests/test_investimentos_btc.py`:

```python
import pytest

from app.services import quotes


@pytest.fixture()
def fake_btc(monkeypatch):
    monkeypatch.setattr(
        quotes, "get_btc_brl",
        lambda: {"available": True, "price": 320000.0, "change_pct": 1.5,
                 "updated_at": "2026-06-09 16:00:00", "source": "fake"},
    )


def _conta(client):
    r = client.post("/contas", json={"name": "Cripto", "type": "investimento", "color": "#F7931A"})
    return r.json()


def _tag(client):
    r = client.post("/tags", json={"name": "Bitcoin", "type": "investimento", "color": "#F7931A"})
    return r.json()


def _compra(client, conta, tag, value, qty, date="2026-06-01"):
    return client.post("/transacoes/", json={
        "type": "compra_cripto", "value": value, "date": date,
        "account_id": conta["id"], "tag_id": tag["id"], "quantity": qty,
    })


def _venda(client, conta, tag, value, qty, date="2026-06-05"):
    return client.post("/transacoes/", json={
        "type": "venda_cripto", "value": value, "date": date,
        "account_id": conta["id"], "tag_id": tag["id"], "quantity": qty,
    })


def test_mercado_btc(client, fake_btc):
    r = client.get("/mercado/btc")
    assert r.status_code == 200
    body = r.json()
    assert body["available"] is True
    assert body["price"] == 320000.0


def test_btc_resumo_sem_transacoes(client, fake_btc):
    r = client.get("/investimentos/btc/resumo")
    assert r.status_code == 200
    body = r.json()
    assert body["quantidade_btc"] == 0
    assert body["valor_atual"] == 0


def test_btc_resumo_compra_e_venda(client, fake_btc):
    conta = _conta(client)
    tag = _tag(client)
    # compra 0.01 BTC por 3000 → custo médio 300000/BTC
    _compra(client, conta, tag, "3000.00", "0.01000000")
    # vende 0.004 BTC por 1400
    _venda(client, conta, tag, "1400.00", "0.00400000")

    body = client.get("/investimentos/btc/resumo").json()
    assert round(body["quantidade_btc"], 8) == 0.006
    assert round(body["custo_medio"], 2) == 300000.0
    # valor_atual = 0.006 * 320000 = 1920
    assert round(body["valor_atual"], 2) == 1920.0
    # lucro = valor_atual - (0.006 * 300000=1800) = 120
    assert round(body["lucro_prejuizo"], 2) == 120.0


def test_btc_resumo_preco_indisponivel(client, monkeypatch):
    monkeypatch.setattr(quotes, "get_btc_brl", lambda: {"available": False, "source": "fake"})
    conta = _conta(client)
    tag = _tag(client)
    _compra(client, conta, tag, "3000.00", "0.01000000")
    body = client.get("/investimentos/btc/resumo").json()
    assert body["available"] is False
    assert round(body["quantidade_btc"], 8) == 0.01
    assert body["valor_atual"] is None
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec backend pytest tests/test_investimentos_btc.py -v`
Expected: FAIL (rotas inexistentes).

- [ ] **Step 3: Implementar o router**

Crie `backend/app/routers/investimentos.py`:

```python
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Transacao, TransacaoType
from app.services import quotes

router = APIRouter(tags=["investimentos"])


def _sum(db: Session, t_type: TransacaoType, col) -> Decimal:
    result = (
        db.query(func.coalesce(func.sum(col), 0))
        .filter(Transacao.active.is_(True), Transacao.type == t_type)
        .scalar()
    )
    return Decimal(str(result or 0))


@router.get("/mercado/btc")
def mercado_btc():
    return quotes.get_btc_brl()


@router.get("/investimentos/btc/resumo")
def btc_resumo(db: Session = Depends(get_db)):
    qty_compra = _sum(db, TransacaoType.compra_cripto, Transacao.quantity)
    qty_venda = _sum(db, TransacaoType.venda_cripto, Transacao.quantity)
    val_compra = _sum(db, TransacaoType.compra_cripto, Transacao.value)
    val_venda = _sum(db, TransacaoType.venda_cripto, Transacao.value)

    quantidade = qty_compra - qty_venda
    custo_medio = float(val_compra / qty_compra) if qty_compra > 0 else None
    investido_liquido = float(val_compra - val_venda)

    quote = quotes.get_btc_brl()
    available = bool(quote.get("available"))
    preco = quote.get("price") if available else None

    valor_atual = None
    lucro = None
    lucro_pct = None
    if preco is not None:
        valor_atual = float(quantidade) * preco
        base = float(quantidade) * custo_medio if custo_medio is not None else 0.0
        lucro = valor_atual - base
        lucro_pct = (lucro / base * 100) if base > 0 else None

    return {
        "available": available,
        "quantidade_btc": float(quantidade),
        "custo_medio": custo_medio,
        "investido_liquido": investido_liquido,
        "preco_atual": preco,
        "valor_atual": valor_atual,
        "lucro_prejuizo": lucro,
        "lucro_pct": lucro_pct,
        "updated_at": quote.get("updated_at"),
    }
```

Em `backend/app/app.py`, importe e registre:

```python
from app.routers import (
    configs, contas, graphs, investimentos, orcamentos, tags, transacoes,
)
...
app.include_router(investimentos.router)
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec backend pytest tests/test_investimentos_btc.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/investimentos.py backend/app/app.py backend/tests/test_investimentos_btc.py
git commit -m "feat(btc): endpoints mercado/btc e investimentos/btc/resumo"
```

---

## Task 5: Migration Alembic (enum ADD VALUE + coluna)

**Files:**
- Create: `backend/migrates/versions/<rev>_btc_quantity.py`

- [ ] **Step 1: Gerar a migration**

Run: `docker compose exec backend alembic revision -m "btc: compra/venda_cripto + quantity"`
(Use `revision` **sem** `--autogenerate` — o autogenerate não emite `ALTER TYPE ADD VALUE`.)

- [ ] **Step 2: Escrever upgrade/downgrade à mão**

No arquivo gerado, preencha:

```python
def upgrade() -> None:
    op.execute("ALTER TYPE transacao_type ADD VALUE IF NOT EXISTS 'compra_cripto'")
    op.execute("ALTER TYPE transacao_type ADD VALUE IF NOT EXISTS 'venda_cripto'")
    op.add_column(
        "transacao",
        sa.Column("quantity", sa.Numeric(precision=18, scale=8), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("transacao", "quantity")
    # Nota: Postgres não remove valores de enum; o downgrade deixa os valores
    # 'compra_cripto'/'venda_cripto' no tipo. Para reset total de dev use
    # DROP SCHEMA public CASCADE (ver spec §6).
```

Garanta `import sqlalchemy as sa` e `from alembic import op` no topo (o template já inclui).

- [ ] **Step 3: Aplicar no banco de dev**

Run: `docker compose exec backend alembic upgrade head`
Expected: aplica sem erro.

- [ ] **Step 4: Commit**

```bash
git add backend/migrates/versions/
git commit -m "feat(btc): migration enum cripto + quantity"
```

---

## Task 6: Tipos, format e constants no frontend

**Files:**
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/lib/constants.ts`
- Modify: `frontend/src/lib/format.ts`

- [ ] **Step 1: Tipos**

Em `frontend/src/types/api.ts`:

1. `TRANSACAO_TYPES` — adicione os dois valores:

```typescript
export const TRANSACAO_TYPES = [
  "despesa",
  "receita",
  "investimento",
  "retirada_investimento",
  "compra_cripto",
  "venda_cripto",
] as const;
```

2. Em `TransacaoOut` e `TransacaoCreate`, adicione `quantity?: string | null;`.

3. Ao fim do arquivo, antes de `HealthResponse`:

```typescript
export interface MercadoBtc {
  available: boolean;
  price?: number;
  change_pct?: number;
  updated_at?: string | null;
  source: string;
}

export interface InvestimentoBtcResumo {
  available: boolean;
  quantidade_btc: number;
  custo_medio: number | null;
  investido_liquido: number;
  preco_atual: number | null;
  valor_atual: number | null;
  lucro_prejuizo: number | null;
  lucro_pct: number | null;
  updated_at?: string | null;
}
```

- [ ] **Step 2: Constants (labels/cores dos tipos cripto)**

Em `frontend/src/lib/constants.ts`, dentro de `TRANSACAO_TIPO_INFO`, adicione:

```typescript
  compra_cripto: {
    label: "Compra cripto",
    colorVar: "--c-investimento",
    textClass: "text-investimento",
  },
  venda_cripto: {
    label: "Venda cripto",
    colorVar: "--c-investimento",
    textClass: "text-investimento",
  },
```

E em `TRANSACAO_TAG_TYPE`:

```typescript
  compra_cripto: "investimento",
  venda_cripto: "investimento",
```

- [ ] **Step 3: format**

Em `frontend/src/lib/format.ts`, dentro do objeto `fmt`, adicione:

```typescript
  /** 0,00310000 BTC */
  btc: (v: number | string): string =>
    `${new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    }).format(toNumber(v))} BTC`,
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: erros apenas onde `TRANSACAO_TIPO_INFO`/`TRANSACAO_TAG_TYPE` exigem chaves novas — que você acabou de adicionar; deve ficar **sem** erros. Se o `Segmented` do form de transação passar a ter 6 tipos, ok (ele já mapeia `TRANSACAO_TYPES`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/api.ts frontend/src/lib/constants.ts frontend/src/lib/format.ts
git commit -m "feat(btc): tipos, labels e fmt.btc no frontend"
```

---

## Task 7: Campo Quantidade no form de transação

**Files:**
- Modify: `frontend/src/features/transacoes/transacao-form-dialog.tsx`

- [ ] **Step 1: Adicionar quantity ao schema e ao form**

No `schema` Zod, adicione o campo e uma validação condicional:

```typescript
const schema = z
  .object({
    type: z.enum(TRANSACAO_TYPES),
    valueCents: z.number().int().positive("Informe um valor maior que zero."),
    date: z.string().min(1, "Informe a data."),
    account_id: z.number({ message: "Selecione uma conta." }).int(),
    tag_id: z.number({ message: "Selecione uma categoria." }).int(),
    payment_method: z.enum(PAYMENT_METHODS),
    description: z.string().max(255).optional(),
    quantity: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const cripto = v.type === "compra_cripto" || v.type === "venda_cripto";
    if (cripto) {
      const n = Number(v.quantity);
      if (!v.quantity || !Number.isFinite(n) || n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantity"],
          message: "Informe a quantidade de BTC (> 0).",
        });
      }
    }
  });
```

- [ ] **Step 2: Default + reset + submit**

No `defaultValues` e no `reset`, adicione `quantity`:

```typescript
// defaultValues
      quantity: "",
// reset
      quantity: initial?.quantity ?? "",
```

No `submit`, monte o payload incluindo quantity só nos tipos cripto:

```typescript
  const submit = handleSubmit((values) => {
    const cripto = values.type === "compra_cripto" || values.type === "venda_cripto";
    const payload: TransacaoCreate = {
      type: values.type,
      value: (values.valueCents / 100).toFixed(2),
      date: values.date,
      account_id: values.account_id,
      tag_id: values.tag_id,
      payment_method: values.payment_method,
      description: values.description?.trim() || null,
      quantity: cripto ? Number(values.quantity).toFixed(8) : null,
    };
    onSubmit(payload, isEdit);
  });
```

- [ ] **Step 3: Renderizar o campo (só p/ cripto) com preço médio derivado**

Logo após o bloco do campo "Valor" (o `</div>` que fecha o grupo Valor), adicione:

```tsx
          {(type === "compra_cripto" || type === "venda_cripto") && (
            <div className="space-y-1.5">
              <Label>Quantidade (BTC)</Label>
              <Controller
                control={control}
                name="quantity"
                render={({ field }) => (
                  <Input
                    inputMode="decimal"
                    placeholder="0.00000000"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value.replace(/[^\d.]/g, ""))
                    }
                    className={cn("num", errors.quantity && "border-despesa")}
                  />
                )}
              />
              {errors.quantity ? (
                <p className="text-xs text-despesa">{errors.quantity.message}</p>
              ) : (
                Number(watch("quantity")) > 0 &&
                watch("valueCents") > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Preço médio:{" "}
                    {fmt.brl(watch("valueCents") / 100 / Number(watch("quantity")))}
                  </p>
                )
              )}
            </div>
          )}
```

> `type` já está disponível via `const type = watch("type")`. O `watch` já é importado.

- [ ] **Step 4: Typecheck + lint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: sem erros nem warnings.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/transacoes/transacao-form-dialog.tsx
git commit -m "feat(btc): campo quantidade no form de transação cripto"
```

---

## Task 8: Hooks de mercado e investimentos

**Files:**
- Create: `frontend/src/hooks/useMercado.ts`
- Create: `frontend/src/hooks/useInvestimentos.ts`

- [ ] **Step 1: useMercado**

Crie `frontend/src/hooks/useMercado.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { MercadoBtc } from "@/types/api";

export function useBtcQuote() {
  return useQuery({
    queryKey: ["mercado", "btc"],
    queryFn: ({ signal }) => api.get<MercadoBtc>("/mercado/btc", undefined, signal),
    refetchInterval: 60_000, // poll a cada 60s
    staleTime: 50_000,
  });
}
```

- [ ] **Step 2: useInvestimentos**

Crie `frontend/src/hooks/useInvestimentos.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { InvestimentoBtcResumo } from "@/types/api";

export function useBtcResumo() {
  return useQuery({
    queryKey: ["investimentos", "btc"],
    queryFn: ({ signal }) =>
      api.get<InvestimentoBtcResumo>("/investimentos/btc/resumo", undefined, signal),
    refetchInterval: 60_000,
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useMercado.ts frontend/src/hooks/useInvestimentos.ts
git commit -m "feat(btc): hooks de cotação e resumo BTC"
```

---

## Task 9: Cards BTC na aba Investimentos

**Files:**
- Modify: `frontend/src/features/dashboard/tabs/investimentos.tsx`

- [ ] **Step 1: Adicionar os imports e os cards acima dos gráficos**

No topo de `investimentos.tsx`, junte aos imports:

```tsx
import { useBtcQuote } from "@/hooks/useMercado";
import { useBtcResumo } from "@/hooks/useInvestimentos";
import { fmt } from "@/lib/format"; // já importado — não duplicar
```

Dentro do componente `Investimentos`, antes do `return`, adicione:

```tsx
  const btc = useBtcQuote();
  const btcResumo = useBtcResumo();
  const lucro = btcResumo.data?.lucro_prejuizo ?? null;
  const lucroPositivo = (lucro ?? 0) >= 0;
```

Logo dentro do `<div className="charts-grid">`, **antes** do primeiro `<GraphCard>`, insira os dois cards:

```tsx
      {/* Cotação BTC */}
      <div className="board-card" data-span="6" style={{ gridColumn: "span 6" }}>
        <div className="text-sm font-semibold text-muted-foreground">Bitcoin · BTC/BRL</div>
        {btc.data?.available ? (
          <>
            <div className="num mt-1 text-3xl font-bold tracking-tight">
              {fmt.brl(btc.data.price ?? 0)}
            </div>
            <div
              className="num mt-1 text-sm font-semibold"
              style={{
                color:
                  (btc.data.change_pct ?? 0) >= 0
                    ? "var(--c-receita)"
                    : "var(--c-despesa)",
              }}
            >
              {fmt.signedPct(btc.data.change_pct ?? 0)} hoje
            </div>
            {btc.data.updated_at && (
              <div className="mt-1 text-xs text-muted-foreground">
                Atualizado {btc.data.updated_at}
              </div>
            )}
          </>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">Cotação indisponível.</div>
        )}
      </div>

      {/* Patrimônio BTC */}
      <div className="board-card" data-span="6" style={{ gridColumn: "span 6" }}>
        <div className="text-sm font-semibold text-muted-foreground">Meu Bitcoin</div>
        <div className="num mt-1 text-3xl font-bold tracking-tight">
          {fmt.btc(btcResumo.data?.quantidade_btc ?? 0)}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
          <span className="text-muted-foreground">Custo médio</span>
          <span className="num text-right">
            {btcResumo.data?.custo_medio != null ? fmt.brl(btcResumo.data.custo_medio) : "—"}
          </span>
          <span className="text-muted-foreground">Valor atual</span>
          <span className="num text-right">
            {btcResumo.data?.valor_atual != null ? fmt.brl(btcResumo.data.valor_atual) : "—"}
          </span>
          <span className="text-muted-foreground">Lucro/Prejuízo</span>
          <span
            className="num text-right font-semibold"
            style={{ color: lucroPositivo ? "var(--c-receita)" : "var(--c-despesa)" }}
          >
            {lucro != null ? fmt.signed(lucro) : "—"}
            {btcResumo.data?.lucro_pct != null && ` (${fmt.signedPct(btcResumo.data.lucro_pct)})`}
          </span>
        </div>
      </div>
```

> `data-span="6"` + `gridColumn: span 6` casa com as regras responsivas do `.charts-grid` (`src/index.css`): em telas ≤1180px viram largura total. Mantém a estética e o comportamento dos `GraphCard` existentes.

- [ ] **Step 2: Typecheck + lint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: sem erros nem warnings.

- [ ] **Step 3: Verificar visualmente (claro e escuro)**

Suba o app, abra `/dashboard/investimentos`:
- Cadastre uma `compra_cripto` (form de transação) com quantidade; veja o "Meu Bitcoin" refletir.
- Confira a cotação atualizando (poll 60s) e o lucro/prejuízo em verde/vermelho.
- Troque o tema e confira contraste.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/dashboard/tabs/investimentos.tsx
git commit -m "feat(btc): cards de cotação e patrimônio na aba Investimentos"
```

---

## Verificação final da feature

- [ ] Backend: `docker compose exec backend pytest -v` (suíte verde).
- [ ] Frontend: `cd frontend && npm run build`.
- [ ] Manual: compra + venda → quantidade, custo médio e lucro/prejuízo corretos; preço atualiza por poll; queda graciosa quando a API está fora (testar parando a rede/mocando erro).
- [ ] Temas claro e escuro conferidos.
