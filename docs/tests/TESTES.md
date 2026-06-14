# Gestor Financex — Plano de Testes

Documento de referência para o desenvolvimento guiado por testes (TDD). Cobre infraestrutura de testes, fixtures e casos de teste para todos os recursos do backend.

---

## Infraestrutura de testes

### Onde os testes rodam

O projeto roda via `docker-compose` (postgres + backend). Os testes devem rodar **dentro do container do backend**, conectando ao mesmo container do postgres — sem banco mockado, sem SQLite.

Comandos:

```bash
# rodar todos os testes
docker-compose exec backend pytest

# rodar um arquivo específico
docker-compose exec backend pytest tests/test_tags.py

# rodar com output verboso
docker-compose exec backend pytest -v

# rodar um teste específico
docker-compose exec backend pytest tests/test_tags.py::test_create_tag_sucesso
```

Alternativa para rodar sem o container do backend já em pé (útil em CI):

```bash
docker-compose run --rm backend pytest
```

### Banco de testes isolado

Usar um banco separado `financex_test` no mesmo container postgres, definido via variável de ambiente sobrescrita no momento do teste.

No `docker-compose.yml`, o postgres já sobe com `POSTGRES_DB=financex`. O banco `financex_test` deve ser criado uma vez:

```bash
docker-compose exec postgres psql -U financex -c "CREATE DATABASE financex_test;"
```

A `DATABASE_URL` para testes aponta para esse banco:

```
DATABASE_URL=postgresql://financex:financex@postgres:5432/financex_test
```

Isso pode ser injetado via `pytest.ini` ou via `conftest.py` antes de qualquer import de `app.database`.

### Isolamento por teste — rollback de transação

Cada teste roda dentro de uma transação que é revertida ao final, garantindo que o banco volte ao estado inicial sem precisar truncar tabelas.

```python
# tests/conftest.py
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "postgresql://financex:financex@postgres:5432/financex_test"

from app.app import app
from app.database import Base
from app.dependencies import get_db

TEST_DATABASE_URL = "postgresql://financex:financex@postgres:5432/financex_test"

engine = create_engine(TEST_DATABASE_URL)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

> **Nota**: `scope="session"` em `create_tables` garante que o schema seja criado uma vez por sessão de testes. O rollback por fixture `db` isola os dados por teste.

### Estrutura de arquivos

```
backend/tests/
├── conftest.py
├── test_tags.py
├── test_contas.py
├── test_transacoes.py
├── test_orcamentos.py
└── test_graphs.py
```

---

## Tags — `/tags`

### Modelo envolvido

`Tag`: `id`, `active`, `created_at`, `updated_at`, `name` (varchar 64), `type` (enum: `despesa | receita | investimento`), `color` (hex `#RRGGBB`).

Restrição de unicidade: `name` único entre tags **ativas** do mesmo `type`.

---

### `POST /tags` — criar tag

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 1 | Criação bem-sucedida | `name`, `type`, `color` válidos | 201 + body com `id`, `active=True`, `created_at` |
| 2 | Campo obrigatório ausente (`name`) | sem `name` | 422 |
| 3 | Campo obrigatório ausente (`type`) | sem `type` | 422 |
| 4 | Campo obrigatório ausente (`color`) | sem `color` | 422 |
| 5 | `type` com valor inválido | `type="outro"` | 422 |
| 6 | `color` fora do formato hex | `color="vermelho"` ou `color="#ZZZ"` | 422 |
| 7 | `name` duplicado no mesmo `type` entre ativas | cria duas tags com mesmo `name` e `type` | 409 na segunda |
| 8 | `name` igual mas `type` diferente | `name="Alimentação"` com `type=despesa` e depois `type=receita` | 201 nas duas (não conflita) |
| 9 | `name` igual ao de uma tag **inativa** (soft deleted) do mesmo `type` | recria nome de tag deletada | 201 (unicidade só entre ativas) |
| 10 | `name` com 64 caracteres exatos | string de 64 chars | 201 |
| 11 | `name` com 65 caracteres | string de 65 chars | 422 |

---

### `GET /tags` — listar tags

| # | Caso de uso | Query params | Esperado |
|---|-------------|-------------|----------|
| 12 | Lista todas as ativas (padrão) | — | 200 + lista com `active=True` |
| 13 | Filtro por `type` | `?type=despesa` | 200 + somente tags do tipo despesa |
| 14 | Filtro por `active=false` | `?active=false` | 200 + somente tags inativas |
| 15 | Filtro por `type` + `active=false` | `?type=receita&active=false` | 200 + inativas do tipo receita |
| 16 | Banco vazio | — | 200 + lista vazia `[]` |

---

### `GET /tags/{id}` — detalhe da tag

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 17 | Tag ativa existente | `id` válido | 200 + body completo |
| 18 | `id` inexistente | `id=99999` | 404 |
| 19 | Tag com `active=False` (soft deleted) | `id` de tag deletada | 404 |

---

### `PUT /tags/{id}` — atualizar tag

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 20 | Atualiza `name` com sucesso | novo `name` válido | 200 + body atualizado |
| 21 | Atualiza `color` com sucesso | novo `color` hex | 200 + body atualizado |
| 22 | Atualiza `type` com sucesso | novo `type` válido | 200 + body atualizado |
| 23 | Atualiza para `name` já usado por outra tag ativa do mesmo `type` | `name` duplicado | 409 |
| 24 | Atualiza para `name` de tag inativa do mesmo `type` | `name` de deletada | 200 (sem conflito) |
| 25 | `id` inexistente | `id=99999` | 404 |
| 26 | Body vazio (nenhum campo) | `{}` | 200 + body sem alterações (update parcial) |
| 27 | `color` com formato inválido | `color="#GGG123"` | 422 |

---

### `DELETE /tags/{id}` — soft delete

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 28 | Soft delete bem-sucedido | `id` de tag ativa | 204 + registro persiste com `active=False` |
| 29 | `id` inexistente | `id=99999` | 404 |
| 30 | Tag já inativa | `id` de tag com `active=False` | 404 |

---

## Contas — `/contas`

### Modelo envolvido

`Conta`: `id`, `active`, `created_at`, `updated_at`, `name` (varchar 64), `type` (enum: `banco | investimento | carteira`), `color` (hex `#RRGGBB`).

Restrição de unicidade: `name` único entre contas **ativas** (sem restrição por `type`).

---

### `POST /contas` — criar conta

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 31 | Criação bem-sucedida | `name`, `type`, `color` válidos | 201 + body |
| 32 | Campo obrigatório ausente (`name`) | sem `name` | 422 |
| 33 | Campo obrigatório ausente (`type`) | sem `type` | 422 |
| 34 | Campo obrigatório ausente (`color`) | sem `color` | 422 |
| 35 | `type` inválido | `type="poupança"` | 422 |
| 36 | `color` fora do formato hex | `color="azul"` | 422 |
| 37 | `name` duplicado entre ativas | cria duas contas com mesmo `name` | 409 na segunda |
| 38 | `name` de conta inativa (soft deleted) | recria nome de conta deletada | 201 |
| 39 | `name` com 64 caracteres | string de 64 chars | 201 |
| 40 | `name` com 65 caracteres | string de 65 chars | 422 |

---

### `GET /contas` — listar contas

| # | Caso de uso | Query params | Esperado |
|---|-------------|-------------|----------|
| 41 | Lista todas as ativas | — | 200 + lista ativas |
| 42 | Filtro por `type` | `?type=banco` | 200 + somente do tipo banco |
| 43 | Filtro por `active=false` | `?active=false` | 200 + somente inativas |
| 44 | Banco vazio | — | 200 + `[]` |

---

### `GET /contas/{id}` — detalhe da conta

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 45 | Conta ativa existente | `id` válido | 200 + body |
| 46 | `id` inexistente | `id=99999` | 404 |
| 47 | Conta com `active=False` | `id` de deletada | 404 |

---

### `PUT /contas/{id}` — atualizar conta

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 48 | Atualiza `name` | novo `name` | 200 |
| 49 | Atualiza `color` | novo `color` | 200 |
| 50 | Atualiza `type` | novo `type` | 200 |
| 51 | Atualiza para `name` de outra conta ativa | `name` duplicado | 409 |
| 52 | Atualiza para `name` de conta inativa | `name` de deletada | 200 |
| 53 | `id` inexistente | `id=99999` | 404 |
| 54 | Body vazio | `{}` | 200 + sem alterações |

---

### `DELETE /contas/{id}` — soft delete

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 55 | Soft delete bem-sucedido | `id` de conta ativa | 204 + registro com `active=False` |
| 56 | `id` inexistente | `id=99999` | 404 |
| 57 | Conta já inativa | `id` com `active=False` | 404 |

---

## Transações — `/transacoes`

### Modelo envolvido

`Transacao`: `type` (enum: `despesa | receita | investimento | retirada_investimento`), `value` (Numeric positivo), `date`, `description` (nullable), `account_id` (FK Conta, não-nulo), `tag_id` (FK Tag, nullable), `payment_method` (enum nullable: `pix | card | cash | transfer`).

**Validações de negócio:**
- `tag_id` referenciado deve ter `Tag.type` compatível com `Transacao.type`:
  - `despesa` → tag tipo `despesa`
  - `receita` → tag tipo `receita`
  - `investimento` e `retirada_investimento` → tag tipo `investimento`
- `account_id` deve referenciar uma `Conta` com `active=True`.

---

### `POST /transacoes` — criar transação

**Casos de criação bem-sucedida:**

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 58 | Cria despesa com tag e payment_method | `type=despesa`, tag tipo despesa, conta ativa | 201 |
| 59 | Cria receita com tag | `type=receita`, tag tipo receita, conta ativa | 201 |
| 60 | Cria investimento com tag | `type=investimento`, tag tipo investimento, conta ativa | 201 |
| 61 | Cria retirada_investimento com tag | `type=retirada_investimento`, tag tipo investimento, conta ativa | 201 |
| 62 | Cria transação sem `tag_id` (nullable) | sem `tag_id` | 201 |
| 63 | Cria transação sem `payment_method` (nullable) | sem `payment_method` | 201 |
| 64 | Cria transação sem `description` (nullable) | sem `description` | 201 |
| 65 | `value` com 2 casas decimais | `value=1234.56` | 201, `value` preservado |

**Campos obrigatórios ausentes:**

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 66 | Sem `type` | sem `type` | 422 |
| 67 | Sem `value` | sem `value` | 422 |
| 68 | Sem `date` | sem `date` | 422 |
| 69 | Sem `account_id` | sem `account_id` | 422 |

**Validações de domínio:**

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 70 | `type` inválido | `type="outra"` | 422 |
| 71 | `payment_method` inválido | `payment_method="boleto"` | 422 |
| 72 | `value` negativo | `value=-100` | 422 |
| 73 | `value` zero | `value=0` | 422 |
| 74 | `date` em formato inválido | `date="32/13/2026"` | 422 |

**Validações de negócio — tag incompatível:**

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 75 | Despesa com tag tipo receita | `type=despesa`, `tag_id` de tag receita | 422 |
| 76 | Despesa com tag tipo investimento | `type=despesa`, `tag_id` de tag investimento | 422 |
| 77 | Receita com tag tipo despesa | `type=receita`, `tag_id` de tag despesa | 422 |
| 78 | Investimento com tag tipo despesa | `type=investimento`, `tag_id` de tag despesa | 422 |
| 79 | Retirada_investimento com tag tipo receita | `type=retirada_investimento`, `tag_id` de tag receita | 422 |
| 80 | `tag_id` inexistente | `tag_id=99999` | 422 |

**Validações de negócio — conta:**

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 81 | `account_id` de conta inativa | `account_id` com `active=False` | 422 |
| 82 | `account_id` inexistente | `account_id=99999` | 422 |

---

### `GET /transacoes` — listar transações

| # | Caso de uso | Query params | Esperado |
|---|-------------|-------------|----------|
| 83 | Lista todas as ativas | — | 200 + lista ativas |
| 84 | Filtro por `type` | `?type=despesa` | 200 + somente despesas ativas |
| 85 | Filtro por `tag_id` | `?tag_id=1` | 200 + somente da tag |
| 86 | Filtro por `account_id` | `?account_id=1` | 200 + somente da conta |
| 87 | Filtro por `date_from` | `?date_from=2026-01-01` | 200 + somente a partir da data |
| 88 | Filtro por `date_to` | `?date_to=2026-12-31` | 200 + somente até a data |
| 89 | Filtro por intervalo de datas | `?date_from=2026-01-01&date_to=2026-03-31` | 200 + somente no intervalo |
| 90 | Filtro por `active=false` | `?active=false` | 200 + somente inativas |
| 91 | Combinação de filtros | `?type=despesa&date_from=2026-01-01&tag_id=1` | 200 + interseção dos filtros |
| 92 | Banco sem transações | — | 200 + `[]` |

---

### `GET /transacoes/{id}` — detalhe

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 93 | Transação ativa existente | `id` válido | 200 + body completo com dados de tag e conta |
| 94 | `id` inexistente | `id=99999` | 404 |
| 95 | Transação com `active=False` | `id` de deletada | 404 |

---

### `PUT /transacoes/{id}` — atualizar transação

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 96 | Atualiza `value` | novo `value` positivo | 200 |
| 97 | Atualiza `description` | nova `description` | 200 |
| 98 | Atualiza `date` | nova `date` | 200 |
| 99 | Atualiza `tag_id` para tag compatível | `tag_id` de tag com `type` correto | 200 |
| 100 | Atualiza `tag_id` para tag incompatível | `tag_id` de tag com `type` errado | 422 |
| 101 | Remove `tag_id` (seta `null`) | `tag_id=null` | 200 |
| 102 | Atualiza `payment_method` | novo `payment_method` | 200 |
| 103 | Remove `payment_method` (seta `null`) | `payment_method=null` | 200 |
| 104 | Atualiza `account_id` para conta ativa | `account_id` de conta ativa | 200 |
| 105 | Atualiza `account_id` para conta inativa | `account_id` com `active=False` | 422 |
| 106 | `id` inexistente | `id=99999` | 404 |
| 107 | Body vazio | `{}` | 200 + sem alterações |
| 108 | `value` negativo no update | `value=-50` | 422 |

---

### `DELETE /transacoes/{id}` — soft delete

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 109 | Soft delete bem-sucedido | `id` de transação ativa | 204 + registro com `active=False` |
| 110 | `id` inexistente | `id=99999` | 404 |
| 111 | Transação já inativa | `id` com `active=False` | 404 |

---

### `GET /transacoes/export/csv` — exportar CSV

| # | Caso de uso | Query params | Esperado |
|---|-------------|-------------|----------|
| 112 | Exporta todas as transações ativas | — | 200, `Content-Type: text/csv`, cabeçalho correto |
| 113 | Exporta com filtro de datas | `?date_from=2026-01-01&date_to=2026-03-31` | 200, CSV somente do intervalo |
| 114 | Exporta com filtro de `type` | `?type=despesa` | 200, CSV somente despesas |
| 115 | Sem transações no filtro | filtro sem resultados | 200, CSV com apenas o cabeçalho |
| 116 | Colunas corretas no CSV | — | `id,type,value,date,description,account,tag,payment_method` (ou equivalente definido) |

---

### `POST /transacoes/import/csv` — importar CSV

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 117 | Importa CSV válido | arquivo CSV com linhas corretas | 201 + resumo (ex: `{"importadas": 3, "erros": 0}`) |
| 118 | CSV sem cabeçalho ou cabeçalho errado | arquivo malformado | 422 |
| 119 | Linha com `type` inválido | linha com `type="outro"` | erro reportado na linha, não aborta todo import (ou 422, a definir) |
| 120 | Linha com `account` inexistente | referência a conta que não existe | erro reportado na linha |
| 121 | Linha com `tag` incompatível | tag errada para o type | erro reportado na linha |
| 122 | CSV vazio (só cabeçalho) | arquivo só com headers | 201 + `{"importadas": 0, "erros": 0}` |
| 123 | Arquivo não é CSV | envia JSON ou texto puro | 422 |

> **Decisão pendente**: no import com erros parciais, o comportamento deve ser definido antes de implementar — abortar tudo (transação atômica) ou importar as linhas válidas e reportar as inválidas. O schema de resposta dos casos 119–121 depende dessa decisão.

---

## Orçamentos — `/orcamentos`

### Modelo envolvido

`Orcamento`: `id`, `active`, `created_at`, `updated_at`, `tag_id` (FK Tag — tag deve ter `type=despesa`), `year` (int), `month` (int 1–12), `limit_value` (Numeric positivo).

**Validações de negócio:**
- `tag_id` deve referenciar uma `Tag` com `type = despesa` e `active = True`.
- Único `(tag_id, year, month)` entre orçamentos ativos.
- `limit_value > 0`; `month` entre 1 e 12.

---

### `POST /orcamentos` — criar orçamento

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 124 | Criação bem-sucedida | `tag_id` (despesa), `year`, `month`, `limit_value` válidos | 201 + body com `id`, `active=True` |
| 125 | Sem `tag_id` | sem `tag_id` | 422 |
| 126 | Sem `year` | sem `year` | 422 |
| 127 | Sem `month` | sem `month` | 422 |
| 128 | Sem `limit_value` | sem `limit_value` | 422 |
| 129 | `tag_id` de tag tipo receita | tag `type=receita` | 422 |
| 130 | `tag_id` de tag tipo investimento | tag `type=investimento` | 422 |
| 131 | `tag_id` inexistente | `tag_id=99999` | 422 |
| 132 | `tag_id` de tag inativa | tag com `active=False` | 422 |
| 133 | `month` fora de 1–12 | `month=0` ou `month=13` | 422 |
| 134 | `limit_value` negativo | `limit_value=-100` | 422 |
| 135 | `limit_value` zero | `limit_value=0` | 422 |
| 136 | Duplicado `(tag_id, year, month)` entre ativos | repete a mesma combinação | 409 na segunda |
| 137 | Mesma tag/year, `month` diferente | muda só o mês | 201 |
| 138 | Mesma combinação de um orçamento inativo (soft deleted) | recria após delete | 201 (unicidade só entre ativos) |

---

### `GET /orcamentos` — listar

| # | Caso de uso | Query params | Esperado |
|---|-------------|-------------|----------|
| 139 | Lista todos ativos | — | 200 + lista `active=True` |
| 140 | Filtro por `year` | `?year=2026` | 200 + somente do ano |
| 141 | Filtro por `month` | `?month=5` | 200 + somente do mês |
| 142 | Filtro por `tag_id` | `?tag_id=1` | 200 + somente da tag |
| 143 | Filtro por `active=false` | `?active=false` | 200 + somente inativos |
| 144 | Banco vazio | — | 200 + `[]` |

---

### `GET /orcamentos/{id}` — detalhe

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 145 | Orçamento ativo existente | `id` válido | 200 + body |
| 146 | `id` inexistente | `id=99999` | 404 |
| 147 | Orçamento com `active=False` | `id` de deletado | 404 |

---

### `PUT /orcamentos/{id}` — atualizar

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 148 | Atualiza `limit_value` | novo valor positivo | 200 |
| 149 | Atualiza para combinação `(tag_id, year, month)` já usada por outro ativo | duplicado | 409 |
| 150 | `limit_value` negativo no update | `limit_value=-50` | 422 |
| 151 | Atualiza `tag_id` para tag não-despesa | tag `type=receita` | 422 |
| 152 | `id` inexistente | `id=99999` | 404 |
| 153 | Body vazio | `{}` | 200 + sem alterações |

---

### `DELETE /orcamentos/{id}` — soft delete

| # | Caso de uso | Entrada | Esperado |
|---|-------------|---------|----------|
| 154 | Soft delete bem-sucedido | `id` de orçamento ativo | 204 + registro com `active=False` |
| 155 | `id` inexistente | `id=99999` | 404 |
| 156 | Orçamento já inativo | `id` com `active=False` | 404 |

---

## Gráficos — `/graphs`

Testes de **lógica, ótica e shape** (não exaustivos por permutação). Cada caso monta transações conhecidas e valida o JSON agregado. Filtros comuns: `date_from`, `date_to`, `granularity`, `type`, `exclude_tags`. Detalhe de cada endpoint em `GRAFICOS.md`.

### Resumo e óticas

| # | Caso de uso | Endpoint | Esperado |
|---|-------------|----------|----------|
| 157 | `saldo` = receitas − despesas (investimento **não** entra) | `/resumo` | saldo ignora investimento/retirada |
| 158 | `investido_liquido` = Σ investimento − Σ retirada_investimento | `/resumo` | valor líquido correto |
| 159 | `taxa_poupanca` null quando receitas = 0 | `/resumo` | `taxa_poupanca = null` |
| 160 | `exclude_tags` remove tag da agregação | `/por-tag?exclude_tags=...` | tag excluída não aparece nem soma no total |

### Pra onde vai (tags)

| # | Caso de uso | Endpoint | Esperado |
|---|-------------|----------|----------|
| 161 | Agrupa tags <3% em "Outros" | `/por-tag?type=despesa` | fatia `Outros` consolidada |
| 162 | Cores vêm de `Tag.color` | `/por-tag` | `backgroundColor` == cor das tags |
| 163 | Barras empilhadas por tag ao longo dos meses | `/por-tag-temporal` | um dataset por tag, labels por período |
| 164 | Ranking ordenado desc + `limit` | `/ranking-tags?limit=3` | top-N em ordem decrescente |
| 165 | Variação % vs período anterior | `/variacao-tags` | % correto + `meta.absolutos` |

### Fluxo e distribuição

| # | Caso de uso | Endpoint | Esperado |
|---|-------------|----------|----------|
| 166 | Receitas/Despesas + linha de saldo; investimento fora | `/por-mes` | datasets bar+line corretos |
| 167 | Volume bruto por conta (Σ value, sem sinais, todos os tipos) | `/por-conta` | soma absoluta por conta |
| 168 | Doughnut por `payment_method` (despesa) | `/por-metodo` | agrupado por método |

### Investimentos

| # | Caso de uso | Endpoint | Esperado |
|---|-------------|----------|----------|
| 169 | Aporte líquido por período, série por tag | `/investimentos/aporte` | uma linha por tag de investimento |
| 170 | Soma acumulada por tag | `/investimentos/acumulado` | valores monotônicos acumulados |

### Quando gasto

| # | Caso de uso | Endpoint | Esperado |
|---|-------------|----------|----------|
| 171 | Valor por dia + `max` correto (escala relativa) | `/heatmap` | `dias[]` e `max` corretos |
| 172 | Média vs total por dia da semana (`agregacao`) | `/por-dia-semana` | respeita o param |
| 173 | Mês atual acumulado; dias futuros = `null` | `/burndown` | linha para no "hoje" |
| 174 | Média de gasto por dia do mês | `/por-dia-mes` | média sobre meses do período |

### Filtros transversais

| # | Caso de uso | Endpoint | Esperado |
|---|-------------|----------|----------|
| 175 | `granularity` altera a bucketização | `/por-mes?granularity=week` | labels semanais |
| 176 | Default = mês atual quando sem `date_from/date_to` | qualquer | período = mês corrente |

### Previsão

| # | Caso de uso | Endpoint | Esperado |
|---|-------------|----------|----------|
| 177 | Projeção = ritmo diário × dias do mês | `/previsao/run-rate` | `projecao_fim_mes` coerente |
| 178 | Média móvel suaviza por janela | `/previsao/media-movel?window=3` | série suavizada |
| 179 | Tendência linear + inclinação | `/previsao/tendencia` | reta + `projecao.inclinacao` |

### Orçamento

| # | Caso de uso | Endpoint | Esperado |
|---|-------------|----------|----------|
| 180 | Orçado × realizado por categoria | `/orcamento/realizado` | datasets Orçado/Realizado corretos |
| 181 | `percent` e `status` (ok/atencao/estourado) | `/orcamento/progresso` | thresholds 70%/100% |
| 182 | Alerta quando projeção > limite | `/orcamento/alerta-estouro` | item com `dia_estouro_estimado` |

---

## Resumo por arquivo de teste

| Arquivo | Casos |
|---------|-------|
| `test_tags.py` | 1–30 |
| `test_contas.py` | 31–57 |
| `test_transacoes.py` | 58–123 |
| `test_orcamentos.py` | 124–156 |
| `test_graphs.py` | 157–182 |

---

## Fixtures auxiliares recomendadas

Além das fixtures de `conftest.py`, cada arquivo de teste pode precisar de helpers para criar dados pré-existentes:

```python
# exemplo de factory helper em test_transacoes.py
def make_tag(client, name="Alimentação", type="despesa", color="#FF0000"):
    r = client.post("/tags", json={"name": name, "type": type, "color": color})
    return r.json()

def make_conta(client, name="Nubank", type="banco", color="#820AD1"):
    r = client.post("/contas", json={"name": name, "type": type, "color": color})
    return r.json()

def make_orcamento(client, tag_id, year=2026, month=5, limit_value="1000.00"):
    r = client.post("/orcamentos", json={
        "tag_id": tag_id, "year": year, "month": month, "limit_value": limit_value
    })
    return r.json()

# para test_graphs.py: helper que cria transações com type/value/date/tag/conta controlados
def make_transacao(client, account_id, type="despesa", value="100.00",
                   date="2026-05-10", tag_id=None, payment_method=None):
    body = {"type": type, "value": value, "date": date, "account_id": account_id}
    if tag_id is not None: body["tag_id"] = tag_id
    if payment_method is not None: body["payment_method"] = payment_method
    r = client.post("/transacoes", json=body)
    return r.json()
```

Isso evita repetição e torna os testes legíveis.
