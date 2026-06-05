# Gestor Financex — Planejamento Backend

Stack: **FastAPI** + **SQLAlchemy** (sync) + **PostgreSQL** + **Alembic**. Roda via `docker-compose`.

---

## Estrutura de pastas

```
backend/
├── migrates/               # alembic init migrates
├── tests/                  # pytest
├── app/
│   ├── logs/               # arquivos de log gerados em runtime
│   ├── graphs/             # queries de agregação → JSON pronto pra Chart.js
│   │   ├── __init__.py
│   │   └── queries.py
│   ├── routers/            # um arquivo por recurso
│   │   ├── __init__.py
│   │   ├── transacoes.py
│   │   ├── tags.py
│   │   ├── contas.py
│   │   ├── orcamentos.py
│   │   └── graphs.py
│   ├── schemas/            # Pydantic — input e output por recurso
│   │   ├── __init__.py
│   │   ├── transacao.py
│   │   ├── tag.py
│   │   ├── conta.py
│   │   └── orcamento.py
│   ├── app.py              # instância FastAPI, inclusão de routers, middleware
│   ├── models.py           # models SQLAlchemy (todos num arquivo só — 4 models)
│   ├── database.py         # engine, SessionLocal, Base
│   ├── dependencies.py     # get_db e outros Depends reutilizáveis
│   └── settings.py         # BaseSettings (pydantic_settings)
├── .env
├── Dockerfile
└── requirements.txt

# docker-compose.yml fica na raiz do projeto (orquestra back + front + postgres)
```

---

## Dependências (`requirements.txt`)

```
fastapi
uvicorn[standard]
sqlalchemy
alembic
psycopg2-binary
pydantic-settings
python-multipart      # upload de arquivo CSV no import
pytest
httpx                 # TestClient async
```

---

## `settings.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    log_level: str = "INFO"

    class Config:
        env_file = ".env"

settings = Settings()
```

`.env` mínimo:
```
DATABASE_URL=postgresql://financex:financex@postgres:5432/financex
```

---

## `database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.settings import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass
```

---

## `dependencies.py`

```python
from typing import Generator
from sqlalchemy.orm import Session
from app.database import SessionLocal

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Uso nos routers:
```python
db: Session = Depends(get_db)
```

---

## `models.py`

Todos os models herdam de `Base` (importado de `database.py`).

Convenções aplicadas:
- `id`: `Integer`, PK, autoincrement
- `active`: `Boolean`, default `True`, `nullable=False`
- `created_at`: `DateTime(timezone=True)`, `server_default=func.now()`
- `updated_at`: `DateTime(timezone=True)`, `server_default=func.now()`, `onupdate=func.now()`
- Enums: `sqlalchemy.Enum` com `native_enum=True` (tipo ENUM nativo no Postgres)
- Valores monetários: `Numeric(12, 2)`
- Cores: `String(7)` (`#RRGGBB`)

Enums a declarar (Python `enum.Enum`):

```
TransacaoType  → despesa | receita | investimento | retirada_investimento
TagType        → despesa | receita | investimento
PaymentMethod  → pix | card | cash | transfer
ContaType      → banco | investimento | carteira
```

Relacionamentos:
- `Transacao.account_id` → FK `conta.id`, `nullable=False`
- `Transacao.tag_id`     → FK `tag.id`, `nullable=True`
- `Orcamento.tag_id`     → FK `tag.id`, `nullable=False` (tag deve ter `type = despesa`)

Model `Orcamento` (ver `PLANEJAMENTO.md` / `GRAFICOS.md` grupo G):
- `tag_id` (FK), `year` (Integer), `month` (Integer 1–12), `limit_value` (`Numeric(12,2)`)
- Unicidade `(tag_id, year, month)` entre ativos — validar na aplicação (filtra `active=True`).

---

## `schemas/`

Cada arquivo tem três classes Pydantic:

- `XxxCreate` — campos obrigatórios para criação (input POST)
- `XxxUpdate` — todos os campos opcionais (input PUT, partial update)
- `XxxOut`    — o que a API devolve (inclui `id`, `active`, `created_at`, `updated_at`)

`XxxOut` deve ter `model_config = ConfigDict(from_attributes=True)` para funcionar com objetos SQLAlchemy.

---

## `routers/` — padrão de cada arquivo

```python
from http import HTTPStatus
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app import models, schemas

router = APIRouter(prefix="/tags", tags=["tags"])

@router.get("/", response_model=list[schemas.tag.TagOut], status_code=HTTPStatus.OK)
async def list_tags(db: Session = Depends(get_db)):
    ...

@router.post("/", response_model=schemas.tag.TagOut, status_code=HTTPStatus.CREATED)
async def create_tag(body: schemas.tag.TagCreate, db: Session = Depends(get_db)):
    ...

@router.get("/{tag_id}", response_model=schemas.tag.TagOut, status_code=HTTPStatus.OK)
async def get_tag(tag_id: int, db: Session = Depends(get_db)):
    ...

@router.put("/{tag_id}", response_model=schemas.tag.TagOut, status_code=HTTPStatus.OK)
async def update_tag(tag_id: int, body: schemas.tag.TagUpdate, db: Session = Depends(get_db)):
    ...

@router.delete("/{tag_id}", status_code=HTTPStatus.NO_CONTENT)
async def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    # soft delete: active=False
    ...
```

Regra: `HTTPException` com status codes de `http.HTTPStatus` (`HTTPStatus.NOT_FOUND`, etc.).

---

## Endpoints por router

### `/tags`
| Método | Rota        | Descrição                          |
|--------|-------------|------------------------------------|
| GET    | `/`         | listar (query: `type`, `active`)   |
| POST   | `/`         | criar                              |
| GET    | `/{id}`     | detalhe                            |
| PUT    | `/{id}`     | atualizar                          |
| DELETE | `/{id}`     | soft delete (`active=False`)       |

### `/contas`
| Método | Rota        | Descrição                          |
|--------|-------------|------------------------------------|
| GET    | `/`         | listar (query: `type`, `active`)   |
| POST   | `/`         | criar                              |
| GET    | `/{id}`     | detalhe                            |
| PUT    | `/{id}`     | atualizar                          |
| DELETE | `/{id}`     | soft delete                        |

### `/transacoes`
| Método | Rota               | Descrição                                                          |
|--------|--------------------|--------------------------------------------------------------------|
| GET    | `/`                | listar (query: `type`, `tag_id`, `account_id`, `date_from`, `date_to`, `active`) |
| POST   | `/`                | criar                                                              |
| GET    | `/{id}`            | detalhe                                                            |
| PUT    | `/{id}`            | atualizar                                                          |
| DELETE | `/{id}`            | soft delete                                                        |
| GET    | `/export/csv`      | exporta transações filtradas como CSV                              |
| POST   | `/import/csv`      | importa transações de arquivo CSV (`multipart/form-data`)          |

### `/orcamentos`
| Método | Rota      | Descrição                                           |
|--------|-----------|-----------------------------------------------------|
| GET    | `/`       | listar (query: `year`, `month`, `tag_id`, `active`) |
| POST   | `/`       | criar (valida tag `type=despesa` + unicidade)       |
| GET    | `/{id}`   | detalhe                                             |
| PUT    | `/{id}`   | atualizar                                           |
| DELETE | `/{id}`   | soft delete (`active=False`)                        |

### `/configs`
| Método | Rota      | Descrição                                           |
|--------|-----------|-----------------------------------------------------|
| GET    | `/export` | exporta tags + contas ativas como JSON              |
| POST   | `/import` | importa tags + contas de JSON (merge, não substitui)|

### `/graphs`
Catálogo completo (óticas, tipos Chart.js e shape do JSON) em `GRAFICOS.md`.
Filtros comuns: `date_from`, `date_to`, `granularity` (`day|week|month|year`, default `month`),
`type` (opcional), `exclude_tags` (CSV de ids — remove tags da agregação em todos os gráficos de tag).

| Método | Rota                            | Descrição                                          |
|--------|---------------------------------|----------------------------------------------------|
| GET    | `/resumo`                       | KPIs do período (receitas, despesas, saldo, investido líquido, taxa poupança) |
| GET    | `/por-tag`                      | gastos por categoria → doughnut (agrupa "Outros" <3%) |
| GET    | `/por-tag-temporal`             | categorias ao longo dos meses → stacked bar        |
| GET    | `/ranking-tags`                 | ranking de categorias → bar horizontal             |
| GET    | `/variacao-tags`                | variação % vs período anterior → bar (±)           |
| GET    | `/por-mes`                      | receitas × despesas + linha de saldo → bar+line    |
| GET    | `/por-conta`                    | volume movimentado por conta → doughnut            |
| GET    | `/por-metodo`                   | gasto por método de pagamento → doughnut           |
| GET    | `/investimentos/aporte`         | aporte por período por tag → multi-line            |
| GET    | `/investimentos/acumulado`      | patrimônio acumulado por tag → stacked area        |
| GET    | `/heatmap`                      | gasto por dia (calendário) → matrix                |
| GET    | `/por-dia-semana`               | gasto por dia da semana → bar                      |
| GET    | `/burndown`                     | queima do mês atual × média histórica → line dupla |
| GET    | `/por-dia-mes`                  | gasto médio por dia do mês → bar/line              |
| GET    | `/previsao/run-rate`            | projeção de fim de mês → card+line                 |
| GET    | `/previsao/media-movel`         | média móvel por categoria → multi-line             |
| GET    | `/previsao/tendencia`           | tendência linear da despesa → bar+line             |
| GET    | `/previsao/sazonalidade`        | ano atual × anterior (fase futura) → line dupla    |
| GET    | `/orcamento/realizado`          | orçado × realizado → grouped bar                   |
| GET    | `/orcamento/progresso`          | progresso por categoria → gauge/progress           |
| GET    | `/orcamento/alerta-estouro`     | alerta de estouro projetado → lista                |

---

## `graphs/queries.py`

Funções que recebem `db: Session` + filtros e retornam dicts no formato Chart.js:

```python
# formato de saída esperado pelo Chart.js
{
    "labels": ["Jan", "Fev", "Mar"],
    "datasets": [
        {
            "label": "Despesas",
            "data": [1200.00, 980.50, 1450.00],
            "backgroundColor": "#FF6384"
        }
    ]
}
```

O router `graphs.py` chama essas funções e devolve o dict direto. O front passa o JSON para `new Chart(ctx, data)` sem precisar montar nada.

Personalização via query params (ex: `?date_from=2026-01-01&date_to=2026-03-31&type=despesa`) — o backend ajusta a agregação e devolve o dataset correspondente.

---

## `app.py`

```python
from fastapi import FastAPI
from app.routers import transacoes, tags, contas, orcamentos, graphs

app = FastAPI(title="Gestor Financex")

app.include_router(tags.router,       prefix="/tags")
app.include_router(contas.router,     prefix="/contas")
app.include_router(transacoes.router, prefix="/transacoes")
app.include_router(orcamentos.router, prefix="/orcamentos")
app.include_router(graphs.router,     prefix="/graphs")
```

CORS liberado para `localhost:3000` (React dev server).

---

## Logs (`app/logs/`)

- Usar `logging` padrão do Python, configurado em `settings.py` ou `app.py`.
- Handler de arquivo gravando em `app/logs/app.log` (rotação por tamanho ou data).
- Um `logger = logging.getLogger(__name__)` por módulo.
- Logar: criação, atualização e soft delete de qualquer entidade; erros de validação; imports CSV/JSON.

---

## `docker-compose.yml` (raiz do projeto)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: financex
      POSTGRES_USER: financex
      POSTGRES_PASSWORD: financex
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - postgres
    env_file:
      - ./backend/.env
    volumes:
      - ./backend:/app
    command: uvicorn app.app:app --host 0.0.0.0 --port 8000 --reload

volumes:
  postgres_data:
```

---

## Migrations (Alembic)

```bash
# dentro de backend/
alembic init migrates
# editar migrates/env.py: apontar target_metadata = Base.metadata e usar DATABASE_URL do .env
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

---

## Testes (`tests/`)

- `pytest` + `httpx` (TestClient)
- Banco de testes: instância Postgres separada (ou schema separado) — sem mock de DB
- Um arquivo por router: `test_tags.py`, `test_contas.py`, `test_transacoes.py`
- Fixture `db` que faz rollback após cada teste (sem poluir dados entre testes)

---

## Próximos passos

1. Criar esqueleto de pastas e arquivos vazios.
2. `docker-compose.yml` + `Dockerfile` básico.
3. `settings.py` → `database.py` → `models.py` → primeira migration.
4. Schemas Pydantic (`schemas/`).
5. Routers CRUD (na ordem: `tags` → `contas` → `transacoes` → `orcamentos`).
6. Import/export CSV e JSON.
7. `graphs/queries.py` + router `/graphs` (ver `GRAFICOS.md`).
8. Logs.
9. Testes.
