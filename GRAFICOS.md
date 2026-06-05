# Gestor Financex — Catálogo de Gráficos

Documento vivo. Define **todos** os gráficos do sistema: objetivo, ótica, endpoint,
tipo de Chart.js, filtros aceitos e o shape exato do JSON de saída.

Complementa `PLANEJAMENTO.md` e `PLANEJAMENTO_BACK.md` (router `/graphs` + `graphs/queries.py`).

---

## Conceitos transversais

### As duas óticas

Toda decisão de gráfico cai numa destas:

1. **Fluxo (DRE pessoal)** — quanto entrou × quanto saiu × quanto sobrou.
   `investimento` **NÃO** é saída aqui: é movimentação para patrimônio, categoria própria.
2. **Patrimônio (net worth)** — quanto está acumulado investido =
   Σ`investimento` − Σ`retirada_investimento`, acumulado no tempo.

### Efeito de cada `type` no caixa

| `type`                  | Caixa | Conta no fluxo como |
|-------------------------|:-----:|---------------------|
| `receita`               |  +    | entrada             |
| `despesa`               |  −    | saída               |
| `investimento`          |  −    | **movimentação** (categoria própria, não-saída) |
| `retirada_investimento` |  +    | **movimentação** (categoria própria, não-entrada) |

### Filtros comuns (query params)

Todos os endpoints de `/graphs` aceitam:

| Param          | Tipo                          | Default        | Notas |
|----------------|-------------------------------|----------------|-------|
| `date_from`    | `date` (ISO `YYYY-MM-DD`)     | início do mês atual | |
| `date_to`      | `date` (ISO)                  | fim do mês atual    | |
| `granularity`  | `day \| week \| month \| year`| `month`        | bucketização temporal |
| `type`         | `TransacaoType` (opcional)    | —              | filtra por tipo de movimentação |
| `exclude_tags` | lista de `int` (CSV: `1,4,9`) | vazio          | **remove tags da agregação** — para gastos altos/fixos não poluírem. Vale em TODOS os gráficos que tocam tags |

> **Período padrão = mês atual.** O usuário pode trocar para semana, mês, ano ou range
> personalizado pela UI; isso só ajusta `date_from`/`date_to`/`granularity`.

### Formato de saída

Padrão Chart.js, pronto pra `new Chart(ctx, data)`:

```json
{
  "labels": ["Jan", "Fev", "Mar"],
  "datasets": [
    { "label": "Despesas", "data": [1200.00, 980.50, 1450.00], "backgroundColor": "#FF6384" }
  ]
}
```

Cores vêm sempre de `Tag.color` / `Conta.color` (consistência automática).
Gráficos que fogem do shape padrão (heatmap, gauge, KPIs) têm o shape documentado no próprio item.

### Dependências de frontend (plugins Chart.js)

| Gráfico            | Plugin extra              |
|--------------------|---------------------------|
| Mapa de calor      | `chartjs-chart-matrix`    |
| Gauge / progresso  | `chartjs-gauge` (ou barra horizontal nativa) |
| Demais             | Chart.js core             |

---

## Padrão visual dos gráficos (frontend)

> Define como **todo** gráfico é renderizado, para manter consistência. O design system
> geral (cores, tokens, layout) vive em `PLANEJAMENTO_FRONT.md`; aqui ficam só as regras
> específicas de gráfico. Render via `react-chartjs-2` (`<Chart>`, `<Doughnut>`, etc.).

### Anatomia do "Board Card"

Todo gráfico vive dentro de um **Board Card** — o cartão arredondado padrão do app:

```
┌─────────────────────────────────────────────┐
│  Título do gráfico            [⋯ ações]      │  ← header: título + menu (excluir tags, baixar PNG)
│  Subtítulo: período aplicado                 │  ← ex: "Maio 2026" / "01–31 mai 2026"
│                                              │
│            [ área do gráfico ]               │  ← altura fixa por tipo (ver abaixo)
│                                              │
│  ● Legenda   ● Legenda   ● Legenda           │  ← legenda custom quando aplicável
└─────────────────────────────────────────────┘
```

- Cartão: fundo branco, cantos arredondados (`radius-lg` / 16px), sombra suave, padding 20–24px.
- Header com título (peso 600) + subtítulo do período aplicado.
- Menu de ações (`⋯`): **excluir tags** (multiselect de chips, alimenta `exclude_tags`), **baixar PNG/CSV**.
- Filtros que pertencem ao card (não globais): `exclude_tags`, `type` (quando o gráfico permite trocar), `agregacao`.

### Altura e responsividade

| Tipo de gráfico        | Altura sugerida | Grid (desktop) |
|------------------------|-----------------|----------------|
| KPI cards (A1)         | auto            | 4 colunas      |
| doughnut / pie         | 280–320px       | 1/3 da largura |
| bar / line / area      | 320–360px       | 1/2 ou full    |
| heatmap (calendário)   | auto (semanas)  | full           |
| burndown / temporal    | 320–360px       | full           |

- `maintainAspectRatio: false` + container com altura fixa (cartão controla o tamanho).
- Mobile: tudo empilha em 1 coluna; legendas vão pra baixo.

### Formatação (pt-BR)

- **Moeda:** `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` → `R$ 1.234,56`.
  Usar em tooltips, eixos Y e KPIs.
- **Percentual:** 1 casa decimal → `30,0%` (variação, taxa de poupança, progresso).
- **Datas/labels:** `dd/MM`, `MMM` (jan, fev…), `MMM/yy` conforme `granularity`.
- **Eixo Y monetário:** abreviar valores grandes (`R$ 1,2 mil`) quando couber.

### Cores — duas fontes

1. **Cores de entidade** (categoria/conta): vêm de `Tag.color` / `Conta.color`. Usar **sempre**
   que o dataset é por tag ou conta (doughnut por categoria, ranking, empilhados, investimentos).
2. **Cores semânticas** (fixas do design system): usar quando o dataset é por *natureza* do valor.

| Papel                  | Token        | Uso |
|------------------------|--------------|-----|
| Receita / positivo     | `--c-receita`     | barras de receita, variação que caiu (gasto menor = bom) |
| Despesa / negativo     | `--c-despesa`     | barras de despesa, estouro, variação que subiu |
| Investimento           | `--c-investimento`| séries de aporte/patrimônio |
| Saldo                  | `--c-saldo`       | linha de saldo |
| Neutro / "Outros"      | `--c-neutro`      | fatia "Outros", média histórica, grade |

> Tokens definidos em `PLANEJAMENTO_FRONT.md` (são **theme-aware**: trocam entre light/dark).

**Adaptação a tema (light/dark):** a "moldura" do gráfico — grade, eixos, labels, legendas e
borda dos elementos — usa tokens neutros (`--text-muted`, `--border`), então acompanha o tema
automaticamente. As cores **semânticas** usam a variante clareada no dark. Cores de Tag/Conta
muito escuras ganham um contorno sutil (`--border`) para não sumir no fundo quase preto.

### Estados do card

Todo gráfico trata 3 estados, dentro do mesmo Board Card:

- **Loading:** skeleton com o shape do gráfico (não spinner solto).
- **Vazio (sem dados no período):** ilustração/ícone + texto "Sem movimentações neste período" + atalho pra trocar o período.
- **Erro:** mensagem curta + botão "Tentar de novo".

### Tooltips e legendas

- Tooltip sempre formata valor em R$ e mostra a label da série.
- Legendas custom (HTML) quando precisar de chips clicáveis (ligar/desligar série) — ex: multi-linha de investimentos.
- Doughnut: total no centro (valor agregado do período).

---

## A. Cabeçalho / KPIs

### A1. Resumo do período — `GET /graphs/resumo`

- **Objetivo:** cards de cabeçalho com os números-chave do período.
- **Ótica:** fluxo + patrimônio.
- **Tipo:** cards (não é Chart.js).
- **Filtros:** `date_from`, `date_to`, `exclude_tags`.

```json
{
  "receitas": 5000.00,
  "despesas": 3200.00,
  "saldo": 1800.00,
  "investido_liquido": 1200.00,
  "taxa_poupanca": 0.24
}
```

- `saldo` = receitas − despesas (investimento fora).
- `investido_liquido` = Σ investimento − Σ retirada_investimento.
- `taxa_poupanca` = investido_liquido / receitas (0–1; null se receitas=0).

---

## B. Pra onde meu dinheiro vai (tags)

### B1. Gastos por categoria — `GET /graphs/por-tag`

- **Objetivo:** ver proporcionalmente onde mais se gasta (ou recebe/investe).
- **Ótica:** fluxo. **Só faz sentido com `type` fixo** (despesa, receita ou investimento).
- **Tipo:** doughnut.
- **Filtros:** `date_from`, `date_to`, `type` (default `despesa`), `exclude_tags`.
- **Regra "Outros":** tags abaixo de **3%** do total viram uma única fatia `"Outros"` (cor cinza `#9CA3AF`).

```json
{
  "labels": ["Alimentação", "Transporte", "Lazer", "Outros"],
  "datasets": [{
    "data": [1200.00, 600.00, 450.00, 180.00],
    "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56", "#9CA3AF"]
  }]
}
```

### B2. Categorias ao longo dos meses — `GET /graphs/por-tag-temporal`

- **Objetivo:** ver qual categoria cresceu/encolheu (o doughnut esticado no tempo).
- **Ótica:** fluxo.
- **Tipo:** barras empilhadas (stacked bar).
- **Filtros:** comuns + `type` (default `despesa`), `granularity`, `exclude_tags`.

```json
{
  "labels": ["Jan", "Fev", "Mar"],
  "datasets": [
    { "label": "Alimentação", "data": [1200, 1100, 1350], "backgroundColor": "#FF6384" },
    { "label": "Transporte",  "data": [600, 650, 580],     "backgroundColor": "#36A2EB" }
  ]
}
```

### B3. Ranking de categorias — `GET /graphs/ranking-tags`

- **Objetivo:** resposta direta a "onde mais gastei no período".
- **Ótica:** fluxo.
- **Tipo:** barra horizontal, ordenada desc.
- **Filtros:** comuns + `type` (default `despesa`), `exclude_tags`, `limit` (opcional, top-N).

```json
{
  "labels": ["Alimentação", "Transporte", "Lazer"],
  "datasets": [{
    "data": [1200.00, 600.00, 450.00],
    "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"]
  }]
}
```

### B4. Variação mês a mês por categoria — `GET /graphs/variacao-tags`

- **Objetivo:** o insight — "Alimentação subiu 30% vs mês anterior".
- **Ótica:** fluxo.
- **Tipo:** barra (positivo verde / negativo vermelho).
- **Filtros:** comuns + `type` (default `despesa`), `exclude_tags`. Compara o período atual contra o **período imediatamente anterior de mesmo tamanho**.

```json
{
  "labels": ["Alimentação", "Transporte", "Lazer"],
  "datasets": [{
    "label": "Variação %",
    "data": [30.0, -8.5, 12.0],
    "backgroundColor": ["#22C55E", "#EF4444", "#22C55E"]
  }],
  "meta": {
    "periodo_atual":   { "from": "2026-05-01", "to": "2026-05-31" },
    "periodo_anterior":{ "from": "2026-04-01", "to": "2026-04-30" },
    "absolutos": { "Alimentação": {"atual": 1350, "anterior": 1038} }
  }
}
```

---

## C. Fluxo temporal

### C1. Receitas × Despesas por período — `GET /graphs/por-mes`

- **Objetivo:** o gráfico de hábito — entrou vs saiu, com saldo.
- **Ótica:** fluxo.
- **Tipo:** barras agrupadas (Receita/Despesa) + **linha de saldo** sobreposta.
- **Filtros:** comuns + `granularity` (default `month`), `exclude_tags`.

```json
{
  "labels": ["Jan", "Fev", "Mar"],
  "datasets": [
    { "type": "bar",  "label": "Receitas", "data": [5000, 5200, 4800], "backgroundColor": "#22C55E" },
    { "type": "bar",  "label": "Despesas", "data": [3200, 3500, 3100], "backgroundColor": "#EF4444" },
    { "type": "line", "label": "Saldo",    "data": [1800, 1700, 1700], "borderColor": "#3B82F6" }
  ]
}
```

### C2. Volume por conta — `GET /graphs/por-conta`

- **Objetivo:** distribuição do volume movimentado por conta.
- **Ótica:** volume bruto (Σ value, **sem sinais**, todos os tipos).
- **Tipo:** doughnut.
- **Filtros:** comuns + `type` (opcional), `exclude_tags`.

```json
{
  "labels": ["Nubank", "Inter", "Carteira"],
  "datasets": [{
    "data": [8200.00, 3100.00, 450.00],
    "backgroundColor": ["#820AD1", "#FF7A00", "#6B7280"]
  }]
}
```

---

## D. Investimentos

Linhas/áreas onde **cada série = uma tag de investimento** (Tesouro, Ações, Cripto…).

### D1. Aporte por período — `GET /graphs/investimentos/aporte`

- **Objetivo:** ver no que venho aportando ao longo do tempo e como isso muda.
- **Ótica:** fluxo de aporte (Σ `investimento` − Σ `retirada_investimento` por período, por tag).
- **Tipo:** multi-linha (uma linha por tag).
- **Filtros:** comuns + `granularity`, `exclude_tags`.

```json
{
  "labels": ["Jan", "Fev", "Mar"],
  "datasets": [
    { "label": "Tesouro", "data": [500, 500, 800], "borderColor": "#16A34A" },
    { "label": "Ações",   "data": [300, 0, 400],   "borderColor": "#2563EB" },
    { "label": "Cripto",  "data": [100, 200, 150], "borderColor": "#F59E0B" }
  ]
}
```

### D2. Patrimônio acumulado por tipo — `GET /graphs/investimentos/acumulado`

- **Objetivo:** onde o dinheiro está parado (bola de neve por tipo).
- **Ótica:** patrimônio — soma acumulada de (investimento − retirada) por tag, do início até cada ponto.
- **Tipo:** área empilhada (stacked area). Total da pilha = patrimônio investido líquido.
- **Filtros:** comuns + `granularity`, `exclude_tags`.

```json
{
  "labels": ["Jan", "Fev", "Mar"],
  "datasets": [
    { "label": "Tesouro", "data": [500, 1000, 1800], "backgroundColor": "#16A34A", "fill": true },
    { "label": "Ações",   "data": [300, 300, 700],   "backgroundColor": "#2563EB", "fill": true },
    { "label": "Cripto",  "data": [100, 300, 450],   "backgroundColor": "#F59E0B", "fill": true }
  ]
}
```

---

## E. Quando eu gasto mais

### E1. Mapa de calor (calendário) — `GET /graphs/heatmap`

- **Objetivo:** painel estilo calendário; quanto mais gasto no dia, mais forte a cor.
- **Ótica:** fluxo (só `despesa`).
- **Tipo:** matriz/heatmap (`chartjs-chart-matrix`).
- **Escala:** **relativa ao período exibido** (dia mais caro = cor máxima); tooltip mostra o valor real em R$.
- **Filtros:** `date_from`, `date_to`, `exclude_tags`.

```json
{
  "dias": [
    { "date": "2026-05-01", "value": 0.00 },
    { "date": "2026-05-02", "value": 142.50 },
    { "date": "2026-05-03", "value": 38.00 }
  ],
  "max": 142.50
}
```

> Front normaliza a intensidade por `value / max`.

### E2. Gasto por dia da semana — `GET /graphs/por-dia-semana`

- **Objetivo:** revelar o padrão de fim de semana.
- **Ótica:** fluxo (`despesa`).
- **Tipo:** barras Seg→Dom.
- **Filtros:** comuns + `exclude_tags`, `agregacao` (`total` | `media`, default `media`).

```json
{
  "labels": ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"],
  "datasets": [{ "label": "Gasto médio", "data": [80,75,90,85,140,210,160], "backgroundColor": "#EF4444" }]
}
```

### E3. Curva de queima (burndown) — `GET /graphs/burndown`

- **Objetivo:** o mais acionável — gasto acumulado do mês atual vs ritmo histórico.
- **Ótica:** fluxo (`despesa`).
- **Tipo:** linha dupla (mês atual × média acumulada dos meses anteriores).
- **Filtros:** `exclude_tags` (mês de referência = `date_from`/`date_to` do mês atual).

```json
{
  "labels": [1,2,3,"…",31],
  "datasets": [
    { "label": "Mês atual",       "data": [50,120,180,"…",null],  "borderColor": "#EF4444" },
    { "label": "Média histórica", "data": [40,95,160,"…",3100],   "borderColor": "#9CA3AF", "borderDash": [5,5] }
  ]
}
```

> Dias futuros do mês atual = `null` (linha para no "hoje").

### E4. Gasto por dia do mês — `GET /graphs/por-dia-mes`

- **Objetivo:** "gasto tudo logo depois que cai o salário?" (o divertido 😄).
- **Ótica:** fluxo (`despesa`).
- **Tipo:** barra/linha por dia (1–31), média sobre os meses do período.
- **Filtros:** comuns + `exclude_tags`.

```json
{
  "labels": [1,2,3,"…",31],
  "datasets": [{ "label": "Gasto médio no dia", "data": [320,280,90,"…",60], "backgroundColor": "#F59E0B" }]
}
```

### E5. Gasto por método de pagamento — `GET /graphs/por-metodo`

- **Objetivo:** dependência de cartão/dinheiro/pix.
- **Ótica:** fluxo (`despesa`).
- **Tipo:** doughnut por `payment_method`.
- **Filtros:** comuns + `exclude_tags`.

```json
{
  "labels": ["Pix","Cartão","Dinheiro","Transferência"],
  "datasets": [{ "data": [800,1900,300,200], "backgroundColor": ["#10B981","#3B82F6","#84CC16","#A855F7"] }]
}
```

---

## F. Previsão / como me comportar

> Previsão exige histórico. Endpoints desenhados agora; ligam conforme os dados acumulam.
> Cada item marca o **mínimo de meses** para virar confiável.

### F1. Projeção de fim de mês (run-rate) — `GET /graphs/previsao/run-rate`

- **Funciona com:** 1 mês. **Ótica:** fluxo (`despesa`).
- **Lógica:** extrapola o gasto acumulado atual pelo ritmo diário; compara com a média histórica.
- **Tipo:** card + linha projetada (tracejada a partir de hoje).
- **Filtros:** `exclude_tags`.

```json
{
  "gasto_ate_agora": 1000.00,
  "dia_atual": 10,
  "dias_no_mes": 31,
  "projecao_fim_mes": 3100.00,
  "media_historica": 2800.00,
  "tendencia": "acima"
}
```

### F2. Média móvel 3 meses por categoria — `GET /graphs/previsao/media-movel`

- **Funciona com:** ~3 meses. **Ótica:** fluxo.
- **Tipo:** linha suavizada por tag (janela móvel de 3 períodos).
- **Filtros:** comuns + `type` (default `despesa`), `exclude_tags`, `window` (default 3).
- **Shape:** padrão multi-linha (uma série por tag).

### F3. Tendência da despesa mensal — `GET /graphs/previsao/tendencia`

- **Funciona com:** ~4–6 meses. **Ótica:** fluxo.
- **Lógica:** regressão linear simples sobre a despesa total mensal → "subindo ou caindo?".
- **Tipo:** dispersão/linha + reta de tendência (+ projeção dos próximos N períodos).

```json
{
  "labels": ["Jan","Fev","Mar","Abr","Mai"],
  "datasets": [
    { "type": "bar",  "label": "Despesa real",  "data": [3000,3200,3100,3400,3300] },
    { "type": "line", "label": "Tendência",      "data": [3050,3150,3250,3350,3450], "borderColor": "#EF4444" }
  ],
  "projecao": { "proximos": ["Jun","Jul"], "valores": [3550, 3650], "inclinacao": 100.0 }
}
```

### F4. Sazonalidade (mesmo período ano anterior) — `GET /graphs/previsao/sazonalidade`

- **Funciona com:** 12+ meses. **Status:** fase futura.
- **Tipo:** linha ano atual × ano anterior, sobrepostas.

---

## G. Orçamento (fase 1.5)

> **Novo escopo.** Destrava "como me comportar no futuro": compara realizado contra um alvo.

### G0. Model `Orcamento`

| Campo         | Tipo                   | Nullable | Notas |
|---------------|------------------------|----------|-------|
| `id`          | `int` PK               | não      | autoincrement |
| `active`      | `bool`                 | não      | default `True` (soft delete) |
| `created_at`  | `timestamptz`          | não      | default `now()` |
| `updated_at`  | `timestamptz`          | não      | default `now()`, onupdate |
| `tag_id`      | `int` FK → `Tag.id`    | não      | **tag deve ter `type = despesa`** |
| `year`        | `int`                  | não      | ex: 2026 |
| `month`       | `int`                  | não      | 1–12 |
| `limit_value` | `Numeric(12, 2)`       | não      | limite do mês; positivo |

- **Unicidade:** um orçamento por `(tag_id, year, month)` entre ativos.
- **Validação:** `tag.type == despesa` (orçamento é só para gastos); `limit_value > 0`.
- CRUD em `/orcamentos` (mesmo padrão dos demais routers: GET list/detalhe, POST, PUT, DELETE soft).

### G1. Orçado × Realizado — `GET /graphs/orcamento/realizado`

- **Objetivo:** comparar limite vs gasto real por categoria no mês.
- **Tipo:** barras lado a lado.
- **Filtros:** `year`, `month` (default mês atual), `exclude_tags`.

```json
{
  "labels": ["Alimentação", "Transporte", "Lazer"],
  "datasets": [
    { "label": "Orçado",    "data": [1200, 700, 500], "backgroundColor": "#9CA3AF" },
    { "label": "Realizado", "data": [1350, 580, 520], "backgroundColor": ["#EF4444","#22C55E","#EF4444"] }
  ]
}
```

> Realizado fica vermelho quando ≥ orçado, verde quando abaixo.

### G2. Progresso do orçamento — `GET /graphs/orcamento/progresso`

- **Objetivo:** "já usei 80% do orçamento de Alimentação".
- **Tipo:** barras de progresso / gauge por categoria.
- **Filtros:** `year`, `month`, `exclude_tags`.

```json
{
  "itens": [
    { "tag": "Alimentação", "color": "#FF6384", "orcado": 1200, "gasto": 960, "percent": 0.80, "status": "atencao" },
    { "tag": "Transporte",  "color": "#36A2EB", "orcado": 700,  "gasto": 200, "percent": 0.29, "status": "ok" }
  ]
}
```

> `status`: `ok` (<70%), `atencao` (70–99%), `estourado` (≥100%).

### G3. Alerta de estouro projetado — `GET /graphs/orcamento/alerta-estouro`

- **Objetivo:** cruzar orçamento com run-rate — "no ritmo atual você estoura Lazer no dia 22".
- **Tipo:** lista de alertas (badges na UI).
- **Filtros:** `year`, `month`, `exclude_tags`.

```json
{
  "alertas": [
    { "tag": "Lazer", "orcado": 500, "gasto_atual": 380, "projecao_fim_mes": 620, "dia_estouro_estimado": 22 }
  ]
}
```

---

## Mapa: gráfico → endpoint

| # | Gráfico                         | Endpoint                              | Chart.js            |
|---|---------------------------------|---------------------------------------|---------------------|
| A1| Resumo (KPIs)                   | `/graphs/resumo`                      | cards               |
| B1| Gastos por categoria            | `/graphs/por-tag`                     | doughnut            |
| B2| Categorias no tempo             | `/graphs/por-tag-temporal`            | stacked bar         |
| B3| Ranking de categorias           | `/graphs/ranking-tags`                | bar horizontal      |
| B4| Variação mês a mês por categoria| `/graphs/variacao-tags`               | bar (±)             |
| C1| Receitas × Despesas             | `/graphs/por-mes`                     | bar + line          |
| C2| Volume por conta                | `/graphs/por-conta`                   | doughnut            |
| D1| Aporte por período              | `/graphs/investimentos/aporte`        | multi-line          |
| D2| Patrimônio acumulado            | `/graphs/investimentos/acumulado`     | stacked area        |
| E1| Mapa de calor                   | `/graphs/heatmap`                     | matrix              |
| E2| Gasto por dia da semana         | `/graphs/por-dia-semana`              | bar                 |
| E3| Curva de queima (burndown)      | `/graphs/burndown`                    | line dupla          |
| E4| Gasto por dia do mês            | `/graphs/por-dia-mes`                 | bar/line            |
| E5| Por método de pagamento         | `/graphs/por-metodo`                  | doughnut            |
| F1| Run-rate (projeção fim de mês)  | `/graphs/previsao/run-rate`           | card + line         |
| F2| Média móvel por categoria       | `/graphs/previsao/media-movel`        | multi-line          |
| F3| Tendência da despesa            | `/graphs/previsao/tendencia`          | bar + line          |
| F4| Sazonalidade (futuro)           | `/graphs/previsao/sazonalidade`       | line dupla          |
| G1| Orçado × realizado              | `/graphs/orcamento/realizado`         | grouped bar         |
| G2| Progresso do orçamento          | `/graphs/orcamento/progresso`         | gauge/progress      |
| G3| Alerta de estouro projetado     | `/graphs/orcamento/alerta-estouro`    | lista/badges        |

---

## Pendências a refletir nos outros docs

- [x] `PLANEJAMENTO.md`: adicionar `Orcamento` à modelagem e citar orçamento nas funcionalidades.
- [x] `PLANEJAMENTO_BACK.md`: model `Orcamento`, router `/orcamentos`, expandir tabela de `/graphs`.
- [x] `TESTES.md`: casos de teste para `/orcamentos` e para os endpoints de `/graphs`.
- [x] `E5 (por-metodo)` confirmado no MVP.
