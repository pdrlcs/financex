# Gastos Fixos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir cadastrar gastos fixos recorrentes (templates de despesa) na tela de Orçamentos e marcá-los como pagos a cada mês, gerando uma transação de despesa vinculada.

**Architecture:** Um template `GastoFixo` (soft delete) guarda os padrões da despesa. O status "pago no mês" é **derivado**: existe transação ativa com `gasto_fixo_id` naquele ano/mês ⇔ pago. Marcar como pago cria a `Transacao` despesa; desmarcar faz soft delete dela. UI vive numa aba interna da tela Orçamentos.

**Tech Stack:** FastAPI + SQLAlchemy 2 + Alembic + Postgres (backend); React + TS + Vite + React Query + RHF/Zod + shadcn/Tailwind (frontend).

**Spec de referência:** `docs/planejamentos/ADD_BTC_CDI_GASTO_FIXO.md` (§1 A, §3).

---

## Convenções do projeto (ler antes de começar)

- **Backend tests:** rodam contra um Postgres de teste (`financex_test`). Comando padrão:
  `docker compose exec backend pytest tests/<arquivo> -v` (ajuste se você roda pytest localmente com `TEST_DATABASE_URL` apontando pro seu Postgres). O `conftest.py` cria as tabelas via `Base.metadata.create_all` a partir dos models — então **os testes não dependem da migration**; a migration é só para o banco real.
- **Soft delete:** toda entidade herda `TimestampMixin` (`id, active, created_at, updated_at`). Deletar = `active=False`.
- **Frontend checks:** `cd frontend && npm run typecheck` e `npm run lint` (zero warnings).
- **Decimais** voltam como **string** no JSON (Pydantic). O front mantém string e converte só na formatação.
- **Front fala por `/api/...`** via `src/lib/api.ts` (`api.get/post/put/delete`).

## Estrutura de arquivos

**Backend**
- Modificar: `backend/app/models.py` — nova classe `GastoFixo`; coluna `gasto_fixo_id` em `Transacao`.
- Criar: `backend/app/schemas/gasto_fixo.py` — schemas Pydantic.
- Criar: `backend/app/routers/gastos_fixos.py` — router CRUD + status + pagar/desmarcar.
- Modificar: `backend/app/app.py` — registrar o router.
- Criar: `backend/migrates/versions/<rev>_gasto_fixo.py` — migration (gerada).
- Criar: `backend/tests/test_gastos_fixos.py` — testes.

**Frontend**
- Modificar: `frontend/src/types/api.ts` — tipos.
- Criar: `frontend/src/hooks/useGastosFixos.ts` — queries/mutations.
- Modificar: `frontend/src/features/orcamentos/orcamentos.tsx` — segmentado Limites|Gastos Fixos + lista.
- Criar: `frontend/src/features/orcamentos/gasto-fixo-form-dialog.tsx` — CRUD do template.
- Criar: `frontend/src/features/orcamentos/marcar-pago-dialog.tsx` — marcar como pago.

---

## Task 1: Modelo `GastoFixo` + FK em `Transacao`

**Files:**
- Modify: `backend/app/models.py`

- [ ] **Step 1: Adicionar a classe `GastoFixo` e a coluna em `Transacao`**

Em `backend/app/models.py`, dentro de `class Transacao`, logo após o bloco `payment_method` (linha ~99), adicione a coluna e o relationship:

```python
    gasto_fixo_id: Mapped[int | None] = mapped_column(
        ForeignKey("gasto_fixo.id"), nullable=True
    )

    account: Mapped["Conta"] = relationship("Conta")
    tag: Mapped["Tag | None"] = relationship("Tag")
    gasto_fixo: Mapped["GastoFixo | None"] = relationship("GastoFixo")
```

(Remova as linhas `account`/`tag` antigas para não duplicar — elas passam a ficar nesse bloco.)

No fim do arquivo, após `class Orcamento`, adicione:

```python
class GastoFixo(TimestampMixin, Base):
    __tablename__ = "gasto_fixo"

    name: Mapped[str] = mapped_column(String(64), nullable=False)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tag.id"), nullable=False)
    expected_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    default_account_id: Mapped[int | None] = mapped_column(
        ForeignKey("conta.id"), nullable=True
    )
    default_payment_method: Mapped[PaymentMethod | None] = mapped_column(
        Enum(PaymentMethod, name="payment_method"), nullable=True
    )
    due_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_year: Mapped[int] = mapped_column(Integer, nullable=False)
    start_month: Mapped[int] = mapped_column(Integer, nullable=False)

    tag: Mapped["Tag"] = relationship("Tag")
    default_account: Mapped["Conta | None"] = relationship("Conta")
```

- [ ] **Step 2: Verificar que importa sem erro**

Run: `docker compose exec backend python -c "from app import models; print(models.GastoFixo.__tablename__)"`
Expected: imprime `gasto_fixo` sem traceback.

- [ ] **Step 3: Commit**

```bash
git add backend/app/models.py
git commit -m "feat(gastos-fixos): modelo GastoFixo + Transacao.gasto_fixo_id"
```

---

## Task 2: Schemas Pydantic

**Files:**
- Create: `backend/app/schemas/gasto_fixo.py`

- [ ] **Step 1: Criar o arquivo de schemas**

```python
import datetime as _dt
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import PaymentMethod
from app.schemas.transacao import TransacaoOut


class GastoFixoCreate(BaseModel):
    name: str = Field(..., max_length=64)
    tag_id: int
    expected_value: Decimal
    default_account_id: Optional[int] = None
    default_payment_method: Optional[PaymentMethod] = None
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    start_year: int
    start_month: int = Field(..., ge=1, le=12)

    @field_validator("expected_value")
    @classmethod
    def expected_value_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("expected_value must be greater than 0")
        return v


class GastoFixoUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=64)
    tag_id: Optional[int] = None
    expected_value: Optional[Decimal] = None
    default_account_id: Optional[int] = None
    default_payment_method: Optional[PaymentMethod] = None
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    start_year: Optional[int] = None
    start_month: Optional[int] = Field(default=None, ge=1, le=12)

    @field_validator("expected_value")
    @classmethod
    def expected_value_positive(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("expected_value must be greater than 0")
        return v


class GastoFixoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    active: bool
    created_at: _dt.datetime
    updated_at: _dt.datetime
    name: str
    tag_id: int
    expected_value: Decimal
    default_account_id: Optional[int]
    default_payment_method: Optional[PaymentMethod]
    due_day: Optional[int]
    start_year: int
    start_month: int


class MarcarPagoPayload(BaseModel):
    value: Decimal
    date: _dt.date
    account_id: int
    payment_method: Optional[PaymentMethod] = None

    @field_validator("value")
    @classmethod
    def value_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("value must be greater than 0")
        return v


class GastoFixoStatusOut(BaseModel):
    gasto_fixo: GastoFixoOut
    pago: bool
    transacao: Optional[TransacaoOut] = None
```

- [ ] **Step 2: Verificar import**

Run: `docker compose exec backend python -c "from app.schemas.gasto_fixo import GastoFixoStatusOut; print('ok')"`
Expected: imprime `ok`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/gasto_fixo.py
git commit -m "feat(gastos-fixos): schemas Pydantic"
```

---

## Task 3: Router — CRUD do template (test-first)

**Files:**
- Create: `backend/app/routers/gastos_fixos.py`
- Modify: `backend/app/app.py`
- Create: `backend/tests/test_gastos_fixos.py`

- [ ] **Step 1: Escrever os testes de CRUD (falhando)**

Crie `backend/tests/test_gastos_fixos.py`:

```python
def make_tag_despesa(client, name="Moradia", color="#FF0000"):
    r = client.post("/tags", json={"name": name, "type": "despesa", "color": color})
    assert r.status_code == 201
    return r.json()


def make_tag_receita(client, name="Salário", color="#00FF00"):
    r = client.post("/tags", json={"name": name, "type": "receita", "color": color})
    assert r.status_code == 201
    return r.json()


def make_conta(client, name="Nubank", color="#820AD1"):
    r = client.post("/contas", json={"name": name, "type": "banco", "color": color})
    assert r.status_code == 201
    return r.json()


def make_gasto_fixo(client, tag_id, **over):
    body = {
        "name": "Aluguel",
        "tag_id": tag_id,
        "expected_value": "1500.00",
        "start_year": 2026,
        "start_month": 6,
    }
    body.update(over)
    return client.post("/gastos-fixos/", json=body)


def test_create_gasto_fixo_success(client):
    tag = make_tag_despesa(client)
    res = make_gasto_fixo(client, tag["id"])
    assert res.status_code == 201
    data = res.json()
    assert data["active"] is True
    assert data["name"] == "Aluguel"
    assert data["tag_id"] == tag["id"]
    assert float(data["expected_value"]) == 1500.00
    assert data["start_month"] == 6


def test_create_rejects_non_despesa_tag(client):
    tag = make_tag_receita(client)
    res = make_gasto_fixo(client, tag["id"])
    assert res.status_code == 422


def test_create_rejects_invalid_account(client):
    tag = make_tag_despesa(client)
    res = make_gasto_fixo(client, tag["id"], default_account_id=9999)
    assert res.status_code == 422


def test_list_only_active(client):
    tag = make_tag_despesa(client)
    gf = make_gasto_fixo(client, tag["id"]).json()
    client.delete(f"/gastos-fixos/{gf['id']}")
    res = client.get("/gastos-fixos/")
    assert res.status_code == 200
    assert all(g["id"] != gf["id"] for g in res.json())


def test_update_and_delete(client):
    tag = make_tag_despesa(client)
    gf = make_gasto_fixo(client, tag["id"]).json()
    r = client.put(f"/gastos-fixos/{gf['id']}", json={"expected_value": "1600.00"})
    assert r.status_code == 200
    assert float(r.json()["expected_value"]) == 1600.00
    r = client.delete(f"/gastos-fixos/{gf['id']}")
    assert r.status_code == 204
    assert client.get(f"/gastos-fixos/{gf['id']}").status_code == 404
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec backend pytest tests/test_gastos_fixos.py -v`
Expected: FAIL (404/erro — rota `/gastos-fixos/` ainda não existe).

- [ ] **Step 3: Implementar o router (CRUD)**

Crie `backend/app/routers/gastos_fixos.py`:

```python
from http import HTTPStatus
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Conta, GastoFixo, Tag, TagType
from app.schemas.gasto_fixo import (
    GastoFixoCreate,
    GastoFixoOut,
    GastoFixoUpdate,
)

router = APIRouter(prefix="/gastos-fixos", tags=["gastos-fixos"])


def _get_valid_despesa_tag(db: Session, tag_id: int) -> Tag:
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if tag is None or not tag.active:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Tag not found or inactive.",
        )
    if tag.type != TagType.despesa:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Tag must have type 'despesa'.",
        )
    return tag


def _validate_account(db: Session, account_id: int) -> Conta:
    conta = db.query(Conta).filter(Conta.id == account_id, Conta.active.is_(True)).first()
    if conta is None:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Account not found or inactive.",
        )
    return conta


def _get_active(db: Session, gid: int) -> GastoFixo:
    gf = db.query(GastoFixo).filter(GastoFixo.id == gid, GastoFixo.active.is_(True)).first()
    if gf is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="GastoFixo not found.")
    return gf


@router.get("/", response_model=List[GastoFixoOut])
def list_gastos_fixos(active: bool = True, db: Session = Depends(get_db)):
    return db.query(GastoFixo).filter(GastoFixo.active.is_(active)).all()


@router.post("/", response_model=GastoFixoOut, status_code=HTTPStatus.CREATED)
def create_gasto_fixo(payload: GastoFixoCreate, db: Session = Depends(get_db)):
    _get_valid_despesa_tag(db, payload.tag_id)
    if payload.default_account_id is not None:
        _validate_account(db, payload.default_account_id)

    gf = GastoFixo(**payload.model_dump())
    db.add(gf)
    db.commit()
    db.refresh(gf)
    return gf


@router.get("/{gasto_fixo_id}", response_model=GastoFixoOut)
def get_gasto_fixo(gasto_fixo_id: int, db: Session = Depends(get_db)):
    return _get_active(db, gasto_fixo_id)


@router.put("/{gasto_fixo_id}", response_model=GastoFixoOut)
def update_gasto_fixo(gasto_fixo_id: int, payload: GastoFixoUpdate, db: Session = Depends(get_db)):
    gf = _get_active(db, gasto_fixo_id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("tag_id") is not None:
        _get_valid_despesa_tag(db, data["tag_id"])
    if data.get("default_account_id") is not None:
        _validate_account(db, data["default_account_id"])
    for key, value in data.items():
        setattr(gf, key, value)
    db.commit()
    db.refresh(gf)
    return gf


@router.delete("/{gasto_fixo_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_gasto_fixo(gasto_fixo_id: int, db: Session = Depends(get_db)):
    gf = _get_active(db, gasto_fixo_id)
    gf.active = False
    db.commit()
```

Em `backend/app/app.py`, importe e registre o router (junto dos outros `include_router`):

```python
from app.routers import configs, contas, gastos_fixos, graphs, orcamentos, tags, transacoes
...
app.include_router(gastos_fixos.router)
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec backend pytest tests/test_gastos_fixos.py -v`
Expected: PASS (os 5 testes desta task).

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/gastos_fixos.py backend/app/app.py backend/tests/test_gastos_fixos.py
git commit -m "feat(gastos-fixos): router CRUD do template"
```

---

## Task 4: Status mensal + marcar pago + desmarcar (test-first)

**Files:**
- Modify: `backend/app/routers/gastos_fixos.py`
- Modify: `backend/tests/test_gastos_fixos.py`

- [ ] **Step 1: Escrever os testes (falhando)**

Acrescente em `backend/tests/test_gastos_fixos.py`:

```python
def _pagar(client, gid, year, month, value="1500.00", account_id=None, method="pix"):
    body = {"value": value, "date": f"{year}-{month:02d}-10", "payment_method": method}
    if account_id is not None:
        body["account_id"] = account_id
    return client.post(f"/gastos-fixos/{gid}/marcar-pago?year={year}&month={month}", json=body)


def test_status_pendente_depois_pago(client):
    tag = make_tag_despesa(client)
    conta = make_conta(client)
    gf = make_gasto_fixo(client, tag["id"], start_year=2026, start_month=6).json()

    r = client.get("/gastos-fixos/status?year=2026&month=6")
    assert r.status_code == 200
    item = next(i for i in r.json() if i["gasto_fixo"]["id"] == gf["id"])
    assert item["pago"] is False
    assert item["transacao"] is None

    pr = _pagar(client, gf["id"], 2026, 6, account_id=conta["id"])
    assert pr.status_code == 201
    tx = pr.json()
    assert tx["type"] == "despesa"
    assert tx["tag_id"] == tag["id"]
    assert tx["gasto_fixo_id"] == gf["id"]

    r = client.get("/gastos-fixos/status?year=2026&month=6")
    item = next(i for i in r.json() if i["gasto_fixo"]["id"] == gf["id"])
    assert item["pago"] is True
    assert item["transacao"]["id"] == tx["id"]


def test_status_respeita_mes_de_inicio(client):
    tag = make_tag_despesa(client)
    make_gasto_fixo(client, tag["id"], start_year=2026, start_month=6)
    # Mês anterior ao início → não aparece
    r = client.get("/gastos-fixos/status?year=2026&month=5")
    assert all(i["gasto_fixo"]["name"] != "Aluguel" for i in r.json())


def test_marcar_pago_duplicado_falha(client):
    tag = make_tag_despesa(client)
    conta = make_conta(client)
    gf = make_gasto_fixo(client, tag["id"]).json()
    assert _pagar(client, gf["id"], 2026, 6, account_id=conta["id"]).status_code == 201
    assert _pagar(client, gf["id"], 2026, 6, account_id=conta["id"]).status_code == 422


def test_desmarcar_pagamento(client):
    tag = make_tag_despesa(client)
    conta = make_conta(client)
    gf = make_gasto_fixo(client, tag["id"]).json()
    tx = _pagar(client, gf["id"], 2026, 6, account_id=conta["id"]).json()

    r = client.delete(f"/gastos-fixos/{gf['id']}/pagamento?year=2026&month=6")
    assert r.status_code == 204

    item = next(
        i for i in client.get("/gastos-fixos/status?year=2026&month=6").json()
        if i["gasto_fixo"]["id"] == gf["id"]
    )
    assert item["pago"] is False
    # transação ficou inativa, não apagada
    assert client.get(f"/transacoes/{tx['id']}").status_code == 404
    assert client.get("/transacoes/?active=false").status_code == 200
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec backend pytest tests/test_gastos_fixos.py -k "status or marcar or desmarcar" -v`
Expected: FAIL (rotas `status`/`marcar-pago`/`pagamento` não existem).

- [ ] **Step 3: Implementar as 3 rotas**

Em `backend/app/routers/gastos_fixos.py`, adicione os imports e as rotas. Atualize o import de models e schemas:

```python
from sqlalchemy import extract
from app.models import Conta, GastoFixo, Tag, TagType, Transacao, TransacaoType
from app.schemas.gasto_fixo import (
    GastoFixoCreate,
    GastoFixoOut,
    GastoFixoStatusOut,
    GastoFixoUpdate,
    MarcarPagoPayload,
)
```

Helper para achar a transação ativa de um template num mês:

```python
def _transacao_do_mes(db: Session, gid: int, year: int, month: int):
    return (
        db.query(Transacao)
        .filter(
            Transacao.gasto_fixo_id == gid,
            Transacao.active.is_(True),
            extract("year", Transacao.date) == year,
            extract("month", Transacao.date) == month,
        )
        .first()
    )
```

Rota de status (declare **antes** de `/{gasto_fixo_id}` para não colidir):

```python
@router.get("/status", response_model=List[GastoFixoStatusOut])
def status_mes(year: int, month: int, db: Session = Depends(get_db)):
    templates = (
        db.query(GastoFixo)
        .filter(
            GastoFixo.active.is_(True),
            (GastoFixo.start_year * 12 + GastoFixo.start_month) <= (year * 12 + month),
        )
        .all()
    )
    result = []
    for gf in templates:
        tx = _transacao_do_mes(db, gf.id, year, month)
        result.append({"gasto_fixo": gf, "pago": tx is not None, "transacao": tx})
    return result
```

Marcar pago / desmarcar:

```python
@router.post(
    "/{gasto_fixo_id}/marcar-pago",
    status_code=HTTPStatus.CREATED,
)
def marcar_pago(
    gasto_fixo_id: int,
    year: int,
    month: int,
    payload: MarcarPagoPayload,
    db: Session = Depends(get_db),
):
    gf = _get_active(db, gasto_fixo_id)
    _validate_account(db, payload.account_id)

    if _transacao_do_mes(db, gf.id, year, month) is not None:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Gasto fixo already paid for this month.",
        )

    tx = Transacao(
        type=TransacaoType.despesa,
        value=payload.value,
        date=payload.date,
        description=gf.name,
        account_id=payload.account_id,
        tag_id=gf.tag_id,
        payment_method=payload.payment_method,
        gasto_fixo_id=gf.id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.delete(
    "/{gasto_fixo_id}/pagamento",
    status_code=HTTPStatus.NO_CONTENT,
)
def desmarcar_pago(gasto_fixo_id: int, year: int, month: int, db: Session = Depends(get_db)):
    tx = _transacao_do_mes(db, gasto_fixo_id, year, month)
    if tx is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Payment not found.")
    tx.active = False
    db.commit()
```

> Nota: a resposta de `marcar-pago` é a transação criada. Para validar `tx["gasto_fixo_id"]` no teste, garanta que `TransacaoOut` inclui esse campo — isso é feito na Task 5.

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec backend pytest tests/test_gastos_fixos.py -v`
Expected: PASS (tudo). Se `test_status_pendente_depois_pago` falhar por `gasto_fixo_id` ausente no JSON, faça a Task 5 e rode de novo.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/gastos_fixos.py backend/tests/test_gastos_fixos.py
git commit -m "feat(gastos-fixos): status mensal, marcar pago e desmarcar"
```

---

## Task 5: Expor `gasto_fixo_id` no `TransacaoOut`

**Files:**
- Modify: `backend/app/schemas/transacao.py`

- [ ] **Step 1: Adicionar o campo ao schema de saída**

Em `backend/app/schemas/transacao.py`, na classe `TransacaoOut`, após `payment_method`:

```python
    gasto_fixo_id: Optional[int] = None
```

- [ ] **Step 2: Rodar a suíte de transações + gastos fixos**

Run: `docker compose exec backend pytest tests/test_transacoes.py tests/test_gastos_fixos.py -v`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/transacao.py
git commit -m "feat(gastos-fixos): expor gasto_fixo_id em TransacaoOut"
```

---

## Task 6: Migration Alembic

**Files:**
- Create: `backend/migrates/versions/<rev>_gasto_fixo.py` (gerada)

- [ ] **Step 1: Gerar a migration**

Run: `docker compose exec backend alembic revision --autogenerate -m "gasto_fixo + transacao.gasto_fixo_id"`
Expected: cria um arquivo em `backend/migrates/versions/`.

- [ ] **Step 2: Revisar o arquivo gerado**

Confirme que o `upgrade()` tem `op.create_table("gasto_fixo", ...)` e `op.add_column("transacao", sa.Column("gasto_fixo_id", sa.Integer(), nullable=True))` + a FK. Ajuste se o autogenerate tiver inventado drops indevidos.

- [ ] **Step 3: Aplicar no banco de dev**

Run: `docker compose exec backend alembic upgrade head`
Expected: aplica sem erro.

> Se precisar resetar o banco de dev (downgrade não dropa enums limpo): `docker compose exec postgres psql -U financex -d financex -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"` e depois `alembic upgrade head`.

- [ ] **Step 4: Commit**

```bash
git add backend/migrates/versions/
git commit -m "feat(gastos-fixos): migration gasto_fixo"
```

---

## Task 7: Tipos + hook no frontend

**Files:**
- Modify: `frontend/src/types/api.ts`
- Create: `frontend/src/hooks/useGastosFixos.ts`

- [ ] **Step 1: Adicionar os tipos**

Em `frontend/src/types/api.ts`, na interface `TransacaoOut`, adicione após `payment_method`:

```typescript
  gasto_fixo_id: number | null;
```

E ao fim do arquivo (antes de `HealthResponse`):

```typescript
// ─── Gasto Fixo ──────────────────────────────────────────────────────────────

export interface GastoFixoOut extends BaseEntity {
  name: string;
  tag_id: number;
  expected_value: string;
  default_account_id: number | null;
  default_payment_method: PaymentMethod | null;
  due_day: number | null;
  start_year: number;
  start_month: number;
}

export interface GastoFixoCreate {
  name: string;
  tag_id: number;
  expected_value: string;
  default_account_id?: number | null;
  default_payment_method?: PaymentMethod | null;
  due_day?: number | null;
  start_year: number;
  start_month: number;
}

export type GastoFixoUpdate = Partial<GastoFixoCreate>;

export interface GastoFixoStatus {
  gasto_fixo: GastoFixoOut;
  pago: boolean;
  transacao: TransacaoOut | null;
}

export interface MarcarPagoPayload {
  value: string;
  date: string;
  account_id: number;
  payment_method?: PaymentMethod | null;
}
```

- [ ] **Step 2: Criar o hook**

Crie `frontend/src/hooks/useGastosFixos.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  GastoFixoCreate,
  GastoFixoOut,
  GastoFixoStatus,
  GastoFixoUpdate,
  MarcarPagoPayload,
  TransacaoOut,
} from "@/types/api";

export const gastosFixosKey = ["gastos-fixos"] as const;

export function useGastosFixos() {
  return useQuery({
    queryKey: [...gastosFixosKey, "templates"],
    queryFn: ({ signal }) => api.get<GastoFixoOut[]>("/gastos-fixos/", undefined, signal),
  });
}

export function useGastosFixosStatus(year: number, month: number) {
  return useQuery({
    queryKey: [...gastosFixosKey, "status", { year, month }],
    queryFn: ({ signal }) =>
      api.get<GastoFixoStatus[]>("/gastos-fixos/status", { year, month }, signal),
  });
}

export function useGastoFixoMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: gastosFixosKey });
    qc.invalidateQueries({ queryKey: ["transacoes"] });
    qc.invalidateQueries({ queryKey: ["orcamentos"] });
    qc.invalidateQueries({ queryKey: ["graphs"] });
  };

  const create = useMutation({
    mutationFn: (payload: GastoFixoCreate) =>
      api.post<GastoFixoOut>("/gastos-fixos/", payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: GastoFixoUpdate }) =>
      api.put<GastoFixoOut>(`/gastos-fixos/${id}`, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/gastos-fixos/${id}`),
    onSuccess: invalidate,
  });

  const marcarPago = useMutation({
    mutationFn: ({
      id,
      year,
      month,
      payload,
    }: {
      id: number;
      year: number;
      month: number;
      payload: MarcarPagoPayload;
    }) =>
      api.post<TransacaoOut>(
        `/gastos-fixos/${id}/marcar-pago`,
        payload,
        { year, month },
      ),
    onSuccess: invalidate,
  });

  const desmarcar = useMutation({
    mutationFn: ({ id, year, month }: { id: number; year: number; month: number }) =>
      api.delete<void>(`/gastos-fixos/${id}/pagamento?year=${year}&month=${month}`),
    onSuccess: invalidate,
  });

  return { create, update, remove, marcarPago, desmarcar };
}
```

> Confirme que `api.post` aceita `(path, body, query)` — ele aceita (`src/lib/api.ts`: `post: <T>(path, body?, query?)`). O `api.delete` só recebe path, por isso a querystring vai embutida na URL em `desmarcar`.

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/api.ts frontend/src/hooks/useGastosFixos.ts
git commit -m "feat(gastos-fixos): tipos e hook no frontend"
```

---

## Task 8: Dialog de cadastro/edição do template

**Files:**
- Create: `frontend/src/features/orcamentos/gasto-fixo-form-dialog.tsx`

- [ ] **Step 1: Criar o dialog (RHF + Zod)**

Crie `frontend/src/features/orcamentos/gasto-fixo-form-dialog.tsx`. Espelha `orcamento-form-dialog.tsx` (valor em centavos, mesmos componentes shadcn):

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  ContaOut,
  GastoFixoCreate,
  GastoFixoOut,
  PaymentMethod,
  TagOut,
} from "@/types/api";
import { PAYMENT_METHODS } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Informe um nome."),
  tag_id: z.number({ message: "Selecione uma categoria." }).int(),
  valueCents: z.number().int().positive("Informe um valor maior que zero."),
  default_account_id: z.number().int().nullable(),
  default_payment_method: z.string().nullable(),
  due_day: z.number().int().min(1).max(31).nullable(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: GastoFixoOut | null;
  tagOptions: TagOut[];
  contaOptions: ContaOut[];
  year: number;
  month: number;
  submitting: boolean;
  onSubmit: (payload: GastoFixoCreate, isEdit: boolean) => void;
}

const NONE = "__none__";

export function GastoFixoFormDialog({
  open,
  onOpenChange,
  initial,
  tagOptions,
  contaOptions,
  year,
  month,
  submitting,
  onSubmit,
}: Props) {
  const isEdit = !!initial;
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      tag_id: undefined,
      valueCents: 0,
      default_account_id: null,
      default_payment_method: null,
      due_day: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: initial?.name ?? "",
      tag_id: initial?.tag_id ?? undefined,
      valueCents: initial ? Math.round(Number(initial.expected_value) * 100) : 0,
      default_account_id: initial?.default_account_id ?? null,
      default_payment_method: initial?.default_payment_method ?? null,
      due_day: initial?.due_day ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const submit = handleSubmit((values) => {
    onSubmit(
      {
        name: values.name,
        tag_id: values.tag_id,
        expected_value: (values.valueCents / 100).toFixed(2),
        default_account_id: values.default_account_id,
        default_payment_method:
          (values.default_payment_method as PaymentMethod | null) ?? null,
        due_day: values.due_day,
        start_year: initial?.start_year ?? year,
        start_month: initial?.start_month ?? month,
      },
      isEdit,
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar gasto fixo" : "Novo gasto fixo"}</DialogTitle>
          <DialogDescription>
            Despesa recorrente que você marca como paga a cada mês.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input autoFocus placeholder="Aluguel, Internet…" {...field} />
              )}
            />
            {errors.name && <p className="text-xs text-despesa">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Categoria (despesa)</Label>
            <Controller
              control={control}
              name="tag_id"
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {tagOptions.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tag_id && <p className="text-xs text-despesa">{errors.tag_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Valor esperado</Label>
            <Controller
              control={control}
              name="valueCents"
              render={({ field }) => (
                <Input
                  inputMode="numeric"
                  value={fmt.brl((field.value || 0) / 100)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    field.onChange(digits ? parseInt(digits, 10) : 0);
                  }}
                  className={cn(
                    "num h-12 text-xl font-bold tracking-tight",
                    errors.valueCents && "border-despesa",
                  )}
                />
              )}
            />
            {errors.valueCents && (
              <p className="text-xs text-despesa">{errors.valueCents.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Conta padrão</Label>
              <Controller
                control={control}
                name="default_account_id"
                render={({ field }) => (
                  <Select
                    value={field.value != null ? String(field.value) : NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Nenhuma</SelectItem>
                      {contaOptions.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Dia de vencimento</Label>
              <Controller
                control={control}
                name="due_day"
                render={({ field }) => (
                  <Input
                    inputMode="numeric"
                    placeholder="—"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "");
                      const n = d ? Math.min(31, parseInt(d, 10)) : null;
                      field.onChange(n);
                    }}
                    className="num"
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Método de pagamento padrão</Label>
            <Controller
              control={control}
              name="default_payment_method"
              render={({ field }) => (
                <Select
                  value={field.value ?? NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_METHOD_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <Check size={16} />
            {isEdit ? "Salvar alterações" : "Criar gasto fixo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/orcamentos/gasto-fixo-form-dialog.tsx
git commit -m "feat(gastos-fixos): dialog de cadastro do template"
```

---

## Task 9: Dialog "Marcar como pago"

**Files:**
- Create: `frontend/src/features/orcamentos/marcar-pago-dialog.tsx`

- [ ] **Step 1: Criar o dialog**

Crie `frontend/src/features/orcamentos/marcar-pago-dialog.tsx`:

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ContaOut, GastoFixoOut, MarcarPagoPayload, PaymentMethod } from "@/types/api";
import { PAYMENT_METHODS } from "@/types/api";

const schema = z.object({
  valueCents: z.number().int().positive("Informe um valor maior que zero."),
  date: z.string().min(1, "Informe a data."),
  account_id: z.number({ message: "Selecione a conta." }).int(),
  payment_method: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gastoFixo: GastoFixoOut | null;
  contaOptions: ContaOut[];
  year: number;
  month: number;
  submitting: boolean;
  onSubmit: (payload: MarcarPagoPayload) => void;
}

const NONE = "__none__";

export function MarcarPagoDialog({
  open,
  onOpenChange,
  gastoFixo,
  contaOptions,
  year,
  month,
  submitting,
  onSubmit,
}: Props) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open || !gastoFixo) return;
    const day = gastoFixo.due_day ?? new Date().getDate();
    const dd = String(Math.min(day, 28)).padStart(2, "0");
    reset({
      valueCents: Math.round(Number(gastoFixo.expected_value) * 100),
      date: `${year}-${String(month).padStart(2, "0")}-${dd}`,
      account_id: gastoFixo.default_account_id ?? undefined,
      payment_method: gastoFixo.default_payment_method ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gastoFixo, year, month]);

  const submit = handleSubmit((values) => {
    onSubmit({
      value: (values.valueCents / 100).toFixed(2),
      date: values.date,
      account_id: values.account_id,
      payment_method: (values.payment_method as PaymentMethod | null) ?? null,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como pago</DialogTitle>
          <DialogDescription>{gastoFixo?.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Valor pago</Label>
            <Controller
              control={control}
              name="valueCents"
              render={({ field }) => (
                <Input
                  inputMode="numeric"
                  autoFocus
                  value={fmt.brl((field.value || 0) / 100)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    field.onChange(digits ? parseInt(digits, 10) : 0);
                  }}
                  className={cn(
                    "num h-12 text-xl font-bold tracking-tight",
                    errors.valueCents && "border-despesa",
                  )}
                />
              )}
            />
            {errors.valueCents && (
              <p className="text-xs text-despesa">{errors.valueCents.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => <Input type="date" {...field} />}
              />
              {errors.date && <p className="text-xs text-despesa">{errors.date.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Método</Label>
              <Controller
                control={control}
                name="payment_method"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_METHOD_LABEL[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Conta</Label>
            <Controller
              control={control}
              name="account_id"
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {contaOptions.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.account_id && (
              <p className="text-xs text-despesa">{errors.account_id.message}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <Check size={16} />
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/orcamentos/marcar-pago-dialog.tsx
git commit -m "feat(gastos-fixos): dialog marcar como pago"
```

---

## Task 10: Integrar na tela Orçamentos (segmentado + lista)

**Files:**
- Modify: `frontend/src/features/orcamentos/orcamentos.tsx`

- [ ] **Step 1: Adicionar imports, estado de aba e os hooks**

No topo de `orcamentos.tsx`, junte aos imports existentes:

```tsx
import { Check, Pencil, Plus, Target, X } from "lucide-react";
import { useContas } from "@/hooks/useContas";
import {
  useGastoFixoMutations,
  useGastosFixos,
  useGastosFixosStatus,
} from "@/hooks/useGastosFixos";
import { Segmented } from "@/features/dashboard/segmented";
import type { GastoFixoCreate, GastoFixoOut, MarcarPagoPayload } from "@/types/api";
import { GastoFixoFormDialog } from "./gasto-fixo-form-dialog";
import { MarcarPagoDialog } from "./marcar-pago-dialog";
```

> Assinaturas já confirmadas: `Segmented<T>` recebe `{ value, options: {id,label}[], onChange: (id)=>void }` (`features/dashboard/segmented.tsx`); `useContas()` devolve um resultado React Query com `.data` (`hooks/useContas.ts`). O código abaixo usa exatamente essas formas.

Dentro do componente `Orcamentos`, após os estados existentes, adicione:

```tsx
  const [aba, setAba] = useState<"limites" | "gastos-fixos">("limites");
  const [gfFormOpen, setGfFormOpen] = useState(false);
  const [gfEdit, setGfEdit] = useState<GastoFixoOut | null>(null);
  const [gfDelete, setGfDelete] = useState<GastoFixoOut | null>(null);
  const [pagarTarget, setPagarTarget] = useState<GastoFixoOut | null>(null);
  const [desmarcarTarget, setDesmarcarTarget] = useState<GastoFixoOut | null>(null);

  const statusQuery = useGastosFixosStatus(year, month);
  const { data: contas } = useContas();
  const gf = useGastoFixoMutations();
  const despesaTagsList = despesaTags; // já calculado acima
```

- [ ] **Step 2: Adicionar handlers do gasto fixo**

Ainda dentro do componente, após os handlers existentes:

```tsx
  const handleGfSubmit = async (payload: GastoFixoCreate, isEdit: boolean) => {
    try {
      if (isEdit && gfEdit) {
        await gf.update.mutateAsync({ id: gfEdit.id, payload });
        toast.success("Gasto fixo atualizado.");
      } else {
        await gf.create.mutateAsync(payload);
        toast.success("Gasto fixo criado.");
      }
      setGfFormOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível salvar.",
      );
    }
  };

  const handlePagar = async (payload: MarcarPagoPayload) => {
    if (!pagarTarget) return;
    try {
      await gf.marcarPago.mutateAsync({ id: pagarTarget.id, year, month, payload });
      toast.success("Pagamento registrado.");
      setPagarTarget(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível registrar.",
      );
    }
  };

  const handleDesmarcar = async () => {
    if (!desmarcarTarget) return;
    try {
      await gf.desmarcar.mutateAsync({ id: desmarcarTarget.id, year, month });
      toast.success("Pagamento desmarcado.");
      setDesmarcarTarget(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível desmarcar.",
      );
    }
  };

  const handleGfDelete = async () => {
    if (!gfDelete) return;
    try {
      await gf.remove.mutateAsync(gfDelete.id);
      toast.success("Gasto fixo removido.");
      setGfDelete(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível remover.",
      );
    }
  };
```

- [ ] **Step 3: Renderizar o segmentado e a lista de gastos fixos**

Logo após o bloco do cabeçalho (`</div>` que fecha o header com o botão "Orçamento"), insira o controle de aba:

```tsx
      <div className="mb-5">
        <Segmented
          value={aba}
          onChange={(v) => setAba(v as "limites" | "gastos-fixos")}
          options={[
            { id: "limites", label: "Limites" },
            { id: "gastos-fixos", label: "Gastos Fixos" },
          ]}
        />
      </div>
```

Envolva **todo** o conteúdo atual da lista (do seletor de mês/ano até o `<OrcamentoFormDialog>`) num bloco condicional `{aba === "limites" && ( ... )}`. O seletor de mês/ano pode ficar **fora** do condicional (vale pras duas abas) — mova-o pra cima do segmentado se preferir.

Adicione o bloco da aba Gastos Fixos:

```tsx
      {aba === "gastos-fixos" && (
        <>
          <div className="mb-5 flex justify-end">
            <Button
              onClick={() => {
                setGfEdit(null);
                setGfFormOpen(true);
              }}
            >
              <Plus size={17} /> Gasto fixo
            </Button>
          </div>

          {statusQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="board-card h-[76px] animate-pulse bg-muted/40" />
              ))}
            </div>
          ) : (statusQuery.data ?? []).length === 0 ? (
            <div className="board-card flex flex-col items-center gap-3 py-14 text-center text-muted-foreground">
              <Target size={36} strokeWidth={1.25} />
              <div className="text-sm font-semibold text-foreground">
                Nenhum gasto fixo em {MONTHS_PT[month - 1]}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGfEdit(null);
                  setGfFormOpen(true);
                }}
              >
                <Plus size={15} /> Criar gasto fixo
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(statusQuery.data ?? []).map(({ gasto_fixo: g, pago, transacao }) => {
                const tag = tagMap.get(g.tag_id);
                return (
                  <div key={g.id} className="board-card is-hoverable flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      {pago ? (
                        <Check size={16} className="text-receita" />
                      ) : (
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: tag?.color ?? "var(--c-neutro)" }}
                        />
                      )}
                      {g.name}
                    </span>
                    <div className="flex items-center gap-3">
                      {pago && transacao ? (
                        <>
                          <span className="num text-sm text-muted-foreground">
                            <strong className="text-foreground">
                              {fmt.brl(transacao.value)}
                            </strong>{" "}
                            · {transacao.date}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDesmarcarTarget(g)}
                          >
                            Desmarcar
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="num text-sm text-muted-foreground">
                            {fmt.brl(g.expected_value)}
                          </span>
                          <Button size="sm" onClick={() => setPagarTarget(g)}>
                            Marcar como pago
                          </Button>
                        </>
                      )}
                      <div className="flex gap-1">
                        <button
                          type="button"
                          title="Editar"
                          aria-label="Editar gasto fixo"
                          onClick={() => {
                            setGfEdit(g);
                            setGfFormOpen(true);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          title="Remover"
                          aria-label="Remover gasto fixo"
                          onClick={() => setGfDelete(g)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-despesa/10 hover:text-despesa"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
```

Antes do `</div>` final do componente, adicione os dialogs:

```tsx
      <GastoFixoFormDialog
        open={gfFormOpen}
        onOpenChange={setGfFormOpen}
        initial={gfEdit}
        tagOptions={despesaTagsList}
        contaOptions={contas ?? []}
        year={year}
        month={month}
        submitting={gf.create.isPending || gf.update.isPending}
        onSubmit={handleGfSubmit}
      />

      <MarcarPagoDialog
        open={pagarTarget !== null}
        onOpenChange={(o) => !o && setPagarTarget(null)}
        gastoFixo={pagarTarget}
        contaOptions={contas ?? []}
        year={year}
        month={month}
        submitting={gf.marcarPago.isPending}
        onSubmit={handlePagar}
      />

      <ConfirmDialog
        open={desmarcarTarget !== null}
        onOpenChange={(o) => !o && setDesmarcarTarget(null)}
        title="Desmarcar pagamento?"
        description={
          desmarcarTarget
            ? `A transação de ${desmarcarTarget.name} em ${MONTHS_PT[month - 1]} será removida.`
            : ""
        }
        confirmLabel="Desmarcar"
        destructive
        loading={gf.desmarcar.isPending}
        onConfirm={handleDesmarcar}
      />

      <ConfirmDialog
        open={gfDelete !== null}
        onOpenChange={(o) => !o && setGfDelete(null)}
        title="Remover gasto fixo?"
        description={
          gfDelete
            ? `O template "${gfDelete.name}" será removido. As transações já registradas continuam no histórico.`
            : ""
        }
        confirmLabel="Remover"
        destructive
        loading={gf.remove.isPending}
        onConfirm={handleGfDelete}
      />
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: sem erros nem warnings.

- [ ] **Step 5: Verificar visualmente (claro e escuro)**

Suba o app (`docker compose up` ou `npm run dev` + backend) e em `/orcamentos`:
- Alterne "Limites" ↔ "Gastos Fixos".
- Crie um gasto fixo, marque como pago, confira que vira ✓ com valor/data, desmarque.
- Troque o tema (toggle existente) e confira contraste dos cards/dialogs.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/orcamentos/orcamentos.tsx
git commit -m "feat(gastos-fixos): aba na tela Orçamentos com lista e ações"
```

---

## Verificação final da feature

- [ ] Backend: `docker compose exec backend pytest -v` (suíte toda verde).
- [ ] Frontend: `cd frontend && npm run build` (tsc + vite ok).
- [ ] Manual: criar template → marcar pago → ver despesa entrar no realizado do orçamento da mesma tag (aba "Limites"); soft delete do template não some com transações antigas.
- [ ] Temas claro e escuro conferidos.
