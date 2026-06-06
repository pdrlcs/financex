# Reorganização do frontend Financex — Design

**Data:** 2026-06-05
**Escopo:** Reorganizar `frontend/` para espelhar a estrutura planejada em
`PLANEJAMENTO_FRONT.md §7`, mantendo o protótipo browser-Babel funcionando.
Inclui remoção do painel de tweaks e setup de Docker para servir o estático.

## Contexto

`frontend/` é um **protótipo de arquivos estáticos**, não um projeto Vite/TS:

- React, Chart.js e `@babel/standalone` vêm de **CDN**; o Babel transpila os
  `.jsx` **no navegador, em runtime**.
- Não há `import/export`. Cada arquivo define componentes e os pendura em
  `window` via `Object.assign(window, {...})` no fim. Funções e `const` de topo
  ficam no **escopo léxico global compartilhado** entre todos os `<script>`.
- A **ordem das `<script>` no `Financex.html`** é a ordem de dependência em
  *eval time*. A maioria das referências entre arquivos é em *render time*
  (lazy), então a ordem entre componentes é flexível; o que importa é que tudo
  carregue **antes** do render (disparado só no último script).
- Estilos são **CSS variables puras** (`styles/tokens.css` + `styles/layout.css`),
  não Tailwind.
- Estado atual: tudo plano em `frontend/app/*.jsx` + `frontend/styles/`.

**Decisão de escopo:** mantém-se o stack browser-Babel (opção "A"). NÃO há
migração para Vite/TypeScript/Tailwind/shadcn — isso seria uma tarefa própria
futura. Esta tarefa só reorganiza a *taxonomia de pastas* e divide os arquivos
mistos por responsabilidade.

### Estado quebrado pré-existente

O `Financex.html` referencia `tweaks-panel.jsx`, e o `main.jsx` usa
`useTweaks`/`TweaksPanel`/`TweakSection`/`TweakColor`/`TweakSlider`/`TweakRadio`.
O painel de tweaks é um **scaffold genérico de prototipagem** (fala com um host
externo via `postMessage`), sem nada específico do Financex. A remoção dele
(ver §4) conserta o app de quebra — esta será a primeira vez que ele roda servido
por HTTP de fato.

## 1. Estrutura de pastas alvo

```
frontend/
├── index.html                       # renomeado de Financex.html (serve em /)
├── Dockerfile
├── .dockerignore
├── styles/
│   ├── tokens.css
│   └── layout.css
└── src/
    ├── app.jsx                       # App + ReactDOM render (de main.jsx, SEM tweaks) — último a carregar
    ├── lib/
    │   └── data.js                   # window.FX (mock + fmt)
    ├── components/
    │   ├── ui/
    │   │   ├── icons.jsx             # Icon
    │   │   ├── modal.jsx             # ModalShell, Field, Select, inputStyle
    │   │   ├── toast.jsx             # ToastHost
    │   │   ├── confirm-dialog.jsx    # ConfirmDialog
    │   │   ├── screen.jsx            # ScreenHeader, ScreenTabs (chrome de tela compartilhado)
    │   │   └── entity-card.jsx       # EntityCard (compartilhado Tags/Contas)
    │   ├── layout/
    │   │   └── shell.jsx             # Navbar, Sidebar, Wordmark, PeriodSelector, ThemeToggle, SIDEBAR_ITEMS
    │   └── charts/
    │       ├── chart-core.jsx        # cssVar, baseOptions, ChartCanvas, plugin centerText
    │       ├── chart-types.jsx       # wrappers Chart.js + hexA + BarChartSimple
    │       └── custom-viz.jsx        # HeatmapCalendar, ProgressBars, AlertList, RunRateStats
    └── features/
        ├── dashboard/
        │   ├── board-card.jsx        # ChartCard, CardMenu, EmptyState
        │   ├── kpis.jsx              # KpiCard, Delta, buildKpis
        │   ├── visao-geral.jsx       # VisaoGeral
        │   ├── tabs.jsx              # Categorias/Investimentos/Padroes/Previsao/Orcamento + MiniSeg
        │   ├── dashboard.jsx         # Dashboard, DashTabs, DASH_TABS, TabPlaceholder, TAB_COMPONENTS
        │   └── exclude-tags-modal.jsx # ExcludeTagsModal (exclude por card)
        ├── transacoes/
        │   ├── transacoes-screen.jsx # TransacoesScreen, TX_TABS, PAGE_SIZE
        │   └── transacao-modal.jsx   # TransacaoModal, NovaTransacaoModal, Segmented, MoneyInput, TX_TYPES
        ├── tags/
        │   ├── tags-screen.jsx       # TagsScreen, TAG_TABS
        │   └── tag-conta-modal.jsx   # TagContaModal, ColorPicker, PALETTE, *_TYPE_OPTS (usado tb por Contas)
        └── contas/
            └── contas-screen.jsx     # ContasScreen, CONTA_TABS
```

### Desvios conscientes do §7 (e por quê)

- **`src/`** como raiz do código; `styles/` e `index.html` ficam fora (são o
  "index.html"/CSS global do protótipo).
- **Sem** `hooks/`, `types/`, `lib/api.ts`, `lib/queryClient.ts` — só fazem
  sentido no stack Vite/TS, que não é o caso. `lib/` existe mas só guarda `data.js`.
- **Peças cross-feature** vão para `components/ui/` (`ScreenHeader/Tabs`,
  `EntityCard`) ou ficam no arquivo da feature "dona" e são reusadas via `window`
  (`tag-conta-modal` em `tags/`, usado também por `contas/`). `ExcludeTagsModal`
  é coisa de dashboard (exclude por card), então mora em `features/dashboard/`.
- **`board-card.jsx`** (ChartCard/CardMenu/EmptyState) fica em `dashboard/`
  porque é onde nasce e é mais usado.
- **`.jsx`** mantido (não `.tsx`) — não há TypeScript no protótipo.
- Cada arquivo preserva seu `Object.assign(window, {...})` como **interface
  pública do módulo**.

## 2. Mapeamento dos splits (de → para)

Arquivos que serão **divididos** por responsabilidade:

**`app/modal.jsx` →**
- `ToastHost` → `components/ui/toast.jsx`
- `ModalShell, Field, Select, inputStyle` → `components/ui/modal.jsx`
- `TransacaoModal, NovaTransacaoModal, Segmented, MoneyInput, TX_TYPES` → `features/transacoes/transacao-modal.jsx`
- `ExcludeTagsModal` → `features/dashboard/exclude-tags-modal.jsx`

**`app/crud.jsx` →**
- `ScreenHeader, ScreenTabs` → `components/ui/screen.jsx`
- `EntityCard` → `components/ui/entity-card.jsx`
- `TransacoesScreen, TX_TABS, PAGE_SIZE` → `features/transacoes/transacoes-screen.jsx`
- `TagsScreen, TAG_TABS` → `features/tags/tags-screen.jsx`
- `ContasScreen, CONTA_TABS` → `features/contas/contas-screen.jsx`
- `TagContaModal, ColorPicker, PALETTE, TAG_TYPE_OPTS, CONTA_TYPE_OPTS` → `features/tags/tag-conta-modal.jsx`
- `ConfirmDialog` → `components/ui/confirm-dialog.jsx`

**`app/dashboard.jsx` →**
- `ChartCard, CardMenu, EmptyState` → `features/dashboard/board-card.jsx`
- `KpiCard, Delta, buildKpis` → `features/dashboard/kpis.jsx`
- `VisaoGeral` → `features/dashboard/visao-geral.jsx`
- `Dashboard, DashTabs, DASH_TABS, TabPlaceholder, TAB_COMPONENTS` → `features/dashboard/dashboard.jsx`

**`app/charts.jsx` →**
- `cssVar, baseOptions, ChartCanvas, centerTextPlugin, brlTip` → `components/charts/chart-core.jsx`
- `LineBarChart, DoughnutChart` → `components/charts/chart-types.jsx`

Arquivos que serão **movidos inteiros** (sem split):

- `app/charts2.jsx` → mesclado em `components/charts/chart-types.jsx` (todos os
  wrappers + `hexA`).
- `app/tabs.jsx` → `features/dashboard/tabs.jsx`. `BarChartSimple` (wrapper
  Chart.js) migra para `components/charts/chart-types.jsx`.
- `app/custom_viz.jsx` → `components/charts/custom-viz.jsx`.
- `app/shell.jsx` → `components/layout/shell.jsx`.
- `app/icons.jsx` → `components/ui/icons.jsx`.
- `app/data.js` → `lib/data.js`.
- `app/main.jsx` → `src/app.jsx` (com remoção dos tweaks — §4).

A pasta `app/` e o `tweaks-panel.jsx` são removidos ao fim.

## 3. Ordem de carregamento (`index.html`)

`<head>` mantém React + ReactDOM + Babel + Chart.js (CDN) e os dois CSS.

Regras de ordem que importam:
1. `lib/data.js` primeiro (plain JS, define `window.FX`).
2. `components/charts/chart-core.jsx` antes de `chart-types.jsx` e `custom-viz.jsx`
   (usam `baseOptions`/`cssVar`/`ChartCanvas` em escopo léxico global).
3. `components/ui/modal.jsx` antes dos modais de feature (usam `ModalShell`/`Field`/`Select`).
4. `src/app.jsx` **por último** (dispara `ReactDOM.createRoot`).

Ordem proposta das `<script>`, agrupada por pasta:

```
src/lib/data.js                              (plain <script>)
src/components/ui/icons.jsx
src/components/ui/modal.jsx
src/components/ui/toast.jsx
src/components/ui/confirm-dialog.jsx
src/components/ui/screen.jsx
src/components/ui/entity-card.jsx
src/components/layout/shell.jsx
src/components/charts/chart-core.jsx
src/components/charts/chart-types.jsx
src/components/charts/custom-viz.jsx
src/features/dashboard/board-card.jsx
src/features/dashboard/kpis.jsx
src/features/dashboard/visao-geral.jsx
src/features/dashboard/tabs.jsx
src/features/dashboard/dashboard.jsx
src/features/dashboard/exclude-tags-modal.jsx
src/features/transacoes/transacao-modal.jsx
src/features/transacoes/transacoes-screen.jsx
src/features/tags/tag-conta-modal.jsx
src/features/tags/tags-screen.jsx
src/features/contas/contas-screen.jsx
src/app.jsx
```

Todos os `.jsx` carregam com `type="text/babel"`; `data.js` é `<script>` comum.

## 4. Remoção dos tweaks

`tweaks-panel.jsx` é deletado do projeto final. De `src/app.jsx` (ex-`main.jsx`)
remove-se:

- `useTweaks`, `TWEAK_DEFAULTS`
- o `useEffect` que reescreve CSS vars em runtime (`--accent`, `--accent-soft`,
  `--radius-lg/md`, `--shadow-sm/md`, `--card-pad`, `--gutter`)
- os mapas `SHADOWS`, `SHADOWS_DARK`, `DENSITY`
- os helpers `hexToRgb`, `lighten`, `softRgba`
- o bloco JSX `<TweaksPanel>...</TweaksPanel>`

**Justificativa:** `tokens.css` já define todos esses valores como defaults
(`--accent: #3066BE`, `--radius-lg: 16px`, sombras "suave", `--card-pad: 22px`,
`--gutter: 20px`) e o `.dark` já deriva o acento clareado (`#5B8DE8`). Logo, a
remoção do override em runtime mantém o resultado visual **idêntico**.

O **toggle de tema light/dark permanece** (não faz parte dos tweaks): estado
`theme`, `localStorage` `fx-theme`, `prefers-color-scheme`, a classe `.dark` no
`<html>` e o rebuild dos gráficos via `themeKey`.

## 5. Docker (servir o estático)

O app são arquivos estáticos servidos por HTTP (obrigatório — `file://` quebra o
`fetch` do Babel). Container = servidor de estático apontando para `frontend/`.

**`frontend/Dockerfile`** (nginx alpine):

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
```

`index.html` (renomeado de `Financex.html`) é servido em `/` automaticamente: a
config default do `nginx:alpine` já aponta para `/usr/share/nginx/html` com
`index index.html;`. **Nenhum `nginx.conf` custom é necessário.**

**`frontend/.dockerignore`:** `Dockerfile`, `.dockerignore`, `*.md` de notas,
qualquer artefato local.

**Uso:**

```
cd frontend
docker build -t financex-front .
docker run -p 8080:80 financex-front   # http://localhost:8080
```

**Dependência de CDN:** React/Babel/Chart.js/fonte Inter vêm de CDN em runtime,
então o **navegador** precisa de internet. Rodar 100% offline exigiria
vendorizar essas libs em `frontend/vendor/` — **fora do escopo** desta tarefa.

## 6. Verificação

Após a reorganização, abrir `index.html` servido por HTTP (Playwright + um
servidor estático local, ou o próprio container) e confirmar:

1. Renderiza sem erros no console.
2. Dashboard: troca entre as 6 abas (Visão geral, Categorias, Investimentos,
   Padrões, Previsão, Orçamento) e os gráficos aparecem.
3. Seletor de período altera os gráficos.
4. Toggle de tema light/dark funciona e os gráficos reconstroem.
5. Sidebar: navega para Transações/Tags/Contas; CRUD em modal abre.
6. Build e run do container nginx servem o app em `http://localhost:8080`.

## Não-objetivos

- Migração para Vite/TypeScript/Tailwind/shadcn.
- Conversão de inline-styles para classes.
- Integração com a API real / TanStack Query.
- Vendorização de CDN para offline.
- Implementar contextos placeholder (Orçamentos, Importar/Exportar, Configurações).
```