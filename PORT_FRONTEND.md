# Gestor Financex — Port do Frontend para a stack-alvo

**Data:** 2026-06-06
**Escopo:** Reconstruir o `frontend/` (hoje protótipo browser-Babel) na stack definida
em `PLANEJAMENTO_FRONT.md §2`, ligado à API real do backend, e construir as três telas
ainda inexistentes (Orçamentos, Importar/Exportar, Configurações).

Cross-ref: stack/design system/telas em `PLANEJAMENTO_FRONT.md`, API em
`PLANEJAMENTO_BACK.md`, gráficos em `GRAFICOS.md`, estado do protótipo em
`docs/superpowers/specs/2026-06-05-reorg-frontend-design.md`.

---

## 1. Premissas

- O **backend** (`PLANEJAMENTO_BACK.md`) já estará **construído e rodando** em
  `http://localhost:8000` **antes** de começar o port. Este documento é guardado agora
  para orientar o trabalho depois que o backend existir.
- O **design visual está congelado**: o protótipo atual é a referência de layout/UX.
  Isto é uma **migração técnica + construção das telas faltantes**, não um redesign.
- Stack-alvo (`PLANEJAMENTO_FRONT.md §2`): **Vite + TypeScript + React + Tailwind CSS +
  shadcn/ui + lucide-react + React Router + TanStack Query + React Hook Form + Zod +
  react-chartjs-2 + chart.js + chartjs-chart-matrix + date-fns**.
- Profundidade do shadcn: **rip-and-replace** — os primitivos hand-rolled do protótipo
  são substituídos pelos equivalentes shadcn.

---

## 2. Estratégia geral: rebuild greenfield, protótipo como referência

O protótipo browser-Babel **não compartilha tooling** com Vite/TS (sem build step, sem
`import/export`, componentes pendurados em `window`, Chart.js/React via CDN). Não existe
port incremental real: cria-se um **projeto Vite novo** em `frontend/` e reconstrói-se
cada peça usando o protótipo como referência de layout e comportamento.

### O destino da lógica do `lib/data.js`

Boa parte do `data.js` atual é **lógica de agregação de gráfico** (`b1_porTag`,
`b2_temporal`, `e3_burndown`, `g2_progresso`, etc.). Essa responsabilidade **passa a ser
do backend** (router `/graphs` + `graphs/queries.py`). No port:

- Os componentes de gráfico **deixam de calcular** e passam a **só consumir** o JSON
  pronto dos endpoints `/graphs` (shape já documentado em `GRAFICOS.md`).
- Do `data.js` sobrevivem apenas:
  - **Formatação pt-BR** (`fmt.brl`, `pct`, `signed`…) → `src/lib/format.ts`.
  - **Enums / metadados de tipo** (`TIPO_INFO`, labels de `payment_method`) → `src/types/`
    + `src/lib/constants.ts`.
- Todo o restante (séries mock, `genTransacoes`, geradores determinísticos) é
  **descartado** — os dados vêm da API.

### Preservação do protótipo

O protótipo atual é movido para `frontend-prototype/` (ou mantido apenas no histórico
git) como referência visual até o port ser validado. Não é servido nem buildado.

---

## 3. Arquitetura de pastas

Segue `PLANEJAMENTO_FRONT.md §7`, agora completo (com TS):

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── components.json            # config do shadcn
├── Dockerfile                 # multi-stage: build estático → nginx
├── .dockerignore
└── src/
    ├── main.tsx               # ReactDOM + providers (QueryClient, Router, Theme)
    ├── App.tsx                # rotas + layout shell
    ├── index.css              # @tailwind + CSS vars (tokens) + base
    ├── lib/
    │   ├── api.ts             # wrapper fetch tipado, baseURL
    │   ├── format.ts          # moeda/data/percentual pt-BR
    │   ├── queryClient.ts     # TanStack Query
    │   ├── constants.ts       # enums de UI, labels, paletas
    │   └── utils.ts           # cn() (clsx + tailwind-merge)
    ├── types/                 # tipos espelhando schemas Pydantic + shapes /graphs
    │   ├── api.ts             # TagOut, ContaOut, TransacaoOut, OrcamentoOut, enums
    │   └── graphs.ts          # shapes Chart.js de cada endpoint /graphs
    ├── hooks/
    │   ├── useTags.ts · useContas.ts · useTransacoes.ts · useOrcamentos.ts
    │   ├── useGraph.ts        # hook genérico p/ endpoints de /graphs
    │   └── usePeriod.ts       # lê/escreve o período global na URL
    ├── components/
    │   ├── ui/                # primitivos shadcn (button, dialog, select, …)
    │   ├── layout/            # Navbar, Sidebar, Shell, PeriodSelector, ThemeToggle
    │   └── charts/            # wrappers react-chartjs-2 + viz custom
    └── features/
        ├── dashboard/         # 1 arquivo por aba/grupo de gráfico (A–G)
        ├── transacoes/
        ├── tags/
        ├── contas/
        ├── orcamentos/        # NOVA
        ├── import-export/     # NOVA
        └── configuracoes/     # NOVA
```

---

## 4. Camadas / módulos

### 4.1 Tooling
- Vite + React + TS; path alias `@/` → `src/`.
- ESLint + Prettier.
- `shadcn init` (gera `components.json`, `lib/utils.ts`).
- **Dockerfile multi-stage**: estágio Node builda (`npm run build` → `/dist`); estágio
  `nginx:alpine` serve o estático. Substitui o Dockerfile atual (que servia os `.jsx`
  crus). O `docker-compose.yml` da raiz passa a buildar esse front e expô-lo.

### 4.2 Design system
- `tokens.css` atual → CSS variables no `src/index.css`, mantendo os mesmos nomes
  (`--bg-app`, `--bg-surface`, `--accent`, `--c-receita`, `--c-despesa`,
  `--c-investimento`, `--c-saldo`, `--c-neutro`, `--radius-*`, `--shadow-*`).
- `tailwind.config.ts` referencia os tokens via `theme.extend` (cores, radius, shadow).
- **Reconciliação shadcn:** as variáveis que o shadcn espera (`--background`,
  `--foreground`, `--primary`, `--muted`, `--border`, `--card`, `--ring`…) são
  **definidas em termos dos tokens Financex** — uma única fonte de verdade. Sem dois
  sistemas de cor concorrentes.
- `darkMode: 'class'`; classe `.dark` na raiz; tema "bem dark" (`--bg-app #0A0B0D`) e
  cores semânticas clareadas conforme `PLANEJAMENTO_FRONT.md §3`.
- Fonte **Inter** (via `@fontsource/inter` ou link), `tabular-nums` em valores.

### 4.3 Camada de dados
- `types/api.ts`: tipos espelhando os schemas Pydantic `*Out` e os enums
  (`TransacaoType`, `TagType`, `PaymentMethod`, `ContaType`).
- `lib/api.ts`: wrapper `fetch` tipado, `baseURL = http://localhost:8000`, tratamento de
  erro padronizado (lança erro tipado consumido pelos estados de erro da UI).
- `lib/queryClient.ts`: instância TanStack Query (staleTime, retry).
- Hooks por recurso (`useTags`, `useContas`, `useTransacoes`, `useOrcamentos`) com
  queries + mutations e **invalidação** (criar/editar/excluir transação invalida também
  as queries de `/graphs`).
- `useGraph` genérico tipado por endpoint para os 21 gráficos.

### 4.4 Shell / layout / navegação
- **Navbar** (topo, fixo): wordmark "Financex" (acento na cor de marca), **PeriodSelector
  global**, botão primário **"+ Nova transação"** (abre modal), **ThemeToggle**.
- **Sidebar**: contextos (Dashboard, Transações, Orçamentos, Tags, Contas,
  Importar/Exportar, Configurações). Em mobile vira drawer (hambúrguer).
- **Rotas** (React Router) conforme `PLANEJAMENTO_FRONT.md §4`:
  `/` → `/dashboard`; `/dashboard/:tab`; `/transacoes`; `/orcamentos`; `/tags`;
  `/contas`; `/import-export`; `/configuracoes`.
- **Estado de UI:**
  - **Período global** → **URL search params** (compartilhável, sobrevive a refresh;
    `usePeriod` encapsula leitura/escrita). Todos os gráficos do Dashboard seguem.
  - **Tema** → React Context + `localStorage` (`fx-theme`) + `prefers-color-scheme` no
    primeiro acesso.
  - **`exclude_tags`** → estado local **por card** (não global).

### 4.5 Primitivos UI (shadcn — rip-and-replace)
`Button`, `Card` (base do **Board Card**), `Dialog` (modais de CRUD), `AlertDialog`
(confirmação de soft delete), `Select`, `Input`, `Tabs` (abas de contexto/dashboard),
`Badge`, `Popover`, **Sonner** (toasts de feedback), `Form` (integração RHF + Zod).
Os hand-rolled (`modal.jsx`, `toast.jsx`, `confirm-dialog.jsx`, `entity-card.jsx`,
`screen.jsx`) são substituídos pelos equivalentes shadcn + componentes finos por cima.

### 4.6 Charts
- Wrappers `react-chartjs-2` por tipo em `components/charts/`: `DoughnutChart`,
  `BarChart`, `LineChart`, `StackedBarChart`, `StackedAreaChart`, `MixedBarLineChart`.
- `chartjs-chart-matrix` para o heatmap (E1).
- Viz custom (não-Chart.js) consumindo `/graphs`: `KpiCards` (A1), `ProgressBars` (G2),
  `AlertList` (G3), `RunRateStats` (F1).
- Anatomia "Board Card" e regras de formatação/cores/estados conforme
  `GRAFICOS.md → Padrão visual dos gráficos`. `maintainAspectRatio: false`, altura
  controlada pelo card. Gráficos reconstroem ao trocar de tema (`themeKey`).

### 4.7 Features
- **dashboard/** — 6 abas mapeando os grupos do `GRAFICOS.md` (A·C / B / D / E / F / G),
  KPIs no topo, grid de Board Cards, `exclude_tags` por card. Período vem da navbar.
- **transacoes/** — tabela (cor da tag, valor com sinal/cor por type, colunas data ·
  descrição · tag · conta · método · valor · ações), filtros (type, tag, conta, range),
  paginação, modal CRUD (RHF + Zod **espelhando as regras do back**: valor > 0, tag
  compatível com type, conta ativa).
- **tags/ · contas/** — grid de cards coloridos por `type` (abas), modal CRUD com
  **color picker** (hex) + preview, soft delete.
- **orcamentos/ (nova)** — lista do mês selecionado: cada tag de despesa com barra de
  progresso (orçado × gasto, status ok/atenção/estourado — G2), botão "+ Orçamento"
  (select de tag despesa + mês/ano + valor), atalho pro alerta de estouro (G3).
  `PLANEJAMENTO_FRONT.md §6`.
- **import-export/ (nova)** — CSV (transações): upload com preview/resumo
  (`{importadas, erros}`) e download com filtros aplicados; JSON (configs):
  exporta/importa tags + contas (merge). `PLANEJAMENTO_FRONT.md §6`.
  > Depende da decisão pendente sobre import parcial (ver §6).
- **configuracoes/ (nova)** — mínima (single-user, sem auth): aparência/tema.

### 4.8 Estados padrão & polish
- **Loading:** skeletons com o shape do conteúdo (nunca spinner solto).
- **Empty:** ícone + frase curta + atalho de ação.
- **Erro:** toast + retry.
- **Feedback:** toasts em criar/atualizar/excluir/importar.
- **Responsivo:** desktop-first, mas mobile de verdade — sidebar→drawer, grids
  empilham, tabela→cards/scroll horizontal.
- **A11y:** contraste AA nos dois temas; não comunicar só por cor (ícone + texto).

---

## 5. Fases de implementação

Cada fase é entregável e verificável de forma independente.

| Fase | Conteúdo | Critério de pronto |
|------|----------|--------------------|
| ✅ **F1 — Scaffold & design system** | Vite/TS, Tailwind, shadcn init, tokens+tema, Inter, Dockerfile multi-stage | **CONCLUÍDA (2026-06-06).** App em branco roda; `npm run build`+`tsc`+`lint` passam; light/dark trocam corretamente (verificado com screenshots nos dois temas). |
| ✅ **F2 — Camada de dados & shell** | `types/`, `api.ts`, `queryClient`, Navbar+Sidebar+rotas, PeriodSelector, ThemeToggle | **CONCLUÍDA (2026-06-06).** `tsc`+`lint`+`build` passam sem erros; navegação entre todas as rotas funciona; `useHealth` checa `/api/health`; sidebar com indicator de status da API; drawer mobile; PeriodSelector via URL search params. |
| ✅ **F3 — Tags & Contas** | primitivos shadcn + CRUD real (grid, modal, color picker, soft delete) | **CONCLUÍDA (2026-06-06).** Primitivos shadcn hand-written (button, card, dialog, input, label, select, tabs, badge, confirm-dialog) mapeados aos tokens; hooks `useTags`/`useContas` (TanStack Query, mutations + invalidação de `["tags"]`/`["contas"]`+`["graphs"]`); componentes compartilhados (EntityCard, ColorPicker, EntityFormDialog, EntityManager genérico). `tsc`+`lint`(0 warnings)+`build` passam. **CRUD ponta-a-ponta verificado** no navegador (Playwright) contra o backend real: criar/editar/excluir (soft delete) de Tags e criar Conta, com toasts, invalidação e validação; light **e** dark OK. |
| ✅ **F4 — Transações** | tabela, filtros, modal CRUD (RHF+Zod), "+ Nova" da navbar | **CONCLUÍDA (2026-06-06).** Hook `useTransacoes` (filtros type/tag/conta/range como query params ao back; busca textual + paginação client-side; mutations invalidando `["transacoes"]`+`["graphs"]`). Modal CRUD com **RHF + Zod** espelhando o back (valor>0, tag compatível filtrada por type, conta ativa): segmented de tipo, money input pt-BR em centavos, data, conta, categoria, método, descrição. **Provider global** (`TransacaoDialogProvider`) renderiza o modal uma vez e liga o "+ Nova transação" da navbar **e** o da tela ao mesmo formulário. Tabela com chip de categoria colorido, valor com sinal/cor por type, abas por type, paginação, soft delete com confirmação. `tsc`+`lint`(0 warnings)+`build` passam. **CRUD ponta-a-ponta verificado** no navegador (Playwright/chromium) contra o backend real: criar (toast + linha), validação Zod bloqueando submit, editar (reflete na tabela), filtro por aba, soft delete; light **e** dark OK. |
| ✅ **F5 — Dashboard** | wrappers de chart + 6 abas consumindo `/graphs` + KPIs + exclude-tags por card | **CONCLUÍDA (2026-06-07).** Infra Chart.js theme-aware (`chart-setup.ts` registra controllers + plugin de texto central; remonta via `key={theme}`); wrappers react-chartjs-2 (`charts.tsx`: doughnut, bar+line, stacked bar, h-bar, diverging, multi-line, stacked area, trend, double-line, grouped, bar simples) + heatmap CSS + viz custom (progress G2, alertas G3, run-rate F1). Hook genérico `useGraph` + `graphParams`/`previousRange` (deltas dos KPIs). `GraphCard` liga `useQuery` aos 3 estados (skeleton/empty/erro) + legenda + menu (excluir tags via diálogo, baixar PNG). 6 abas (A·C / B / D / E / F / G) consomem `/graphs` com período global (URL) e `exclude_tags` por card. `tsc`+`lint`(0 warnings)+`build` passam. **Verificado no navegador (Playwright/chromium) contra o backend real** com ~123 transações semeadas em 6 meses: todas as 6 abas renderizam os gráficos, KPIs com delta, burndown/run-rate/tendência, orçado×realizado + progresso + alertas; segmented (média/total) e legenda-toggle funcionam; light **e** dark reconstroem os gráficos; sem erros de console. Fix de bug: eixo de categoria do gráfico horizontal não herda mais o formatador de moeda do eixo Y. |
| ✅ **F6 — Telas novas** | Orçamentos, Importar/Exportar, Configurações | **CONCLUÍDA (2026-06-07).** **Orçamentos:** hook `useOrcamentos` (lista por mês + mutations invalidando `["orcamentos"]`+`["graphs"]`); tela com seletor mês/ano, resumo (realizado×orçado), cards de progresso por categoria (cor da tag + barra + status ok/atenção/estourado, mesclando `/orcamentos` editável com `/graphs/orcamento/progresso`), modal CRUD (RHF+Zod espelhando o back: tag de despesa, limite>0, único por tag/mês — tags já usadas no mês ficam fora do select de criação), soft delete. **Importar/Exportar:** CSV de transações — export com filtros (tipo/tag/conta/range) via `getBlob`, import via `postForm` mostrando `{importadas, erros}` (contrato real do back: import parcial, ignora linhas inválidas — diverge da decisão #2 que não foi implementada no back); JSON de configs — export e import (merge) com resumo `{criadas, ignoradas}`. **Configurações:** mínima (aparência/tema claro/escuro + "sobre"), conforme §4.7. `tsc`+`lint`(0 warnings)+`build` passam. **Verificado no navegador (Playwright/chromium) contra o backend real:** criar orçamento (card aparece), import CSV (2 importadas · 1 com erro, toast), round-trip de configs JSON (merge sem duplicar); sem erros de console. |
| ✅ **F7 — Polish & verificação** | estados (loading/empty/erro), responsivo, a11y, docker build, smoke test | **CONCLUÍDA (2026-06-07).** Auditoria de polish (§4.8): estados loading/empty/erro+retry e toasts já completos e consistentes nos features (board-card do Dashboard, EntityManager de Tags/Contas, Transações, Orçamentos). Polish de build: `manualChunks` no `vite.config.ts` separa `charts` (chart.js+matrix+wrapper, ~185 kB) e `react-vendor` (~181 kB) do bundle principal (409 kB) — some o aviso de chunk >500 kB. **Checklist §7 verificado:** (1) `tsc`+`lint`(0 warnings)+`build` passam; (8) **`docker compose up --build` integrado** — os 3 containers sobem, **só o frontend publica porta** (8080→80) e o backend fica interno (`:8000` recusa no host — decisão #1 confirmada), nginx serve o SPA e faz proxy `/api/*`→`backend:8000` (`/api/health`→`{"status":"ok"}`, `/api/tags/` retorna dados, `/graphs/*` alimenta os charts); (2) app monta no browser contra o stack dockerizado (screenshot headless: navbar+sidebar "API conectada"+KPIs+Chart.js renderizando); (2) SPA fallback de rota profunda (`/transacoes`) renderiza; (4) Dashboard com KPIs+deltas e gráficos de `/graphs`; (7) **responsivo** mobile (390px): sidebar→drawer (hambúrguer), tabela com scroll horizontal. CRUD (3), import/export (5) e toggle light/dark+rebuild de charts (6) verificados ponta-a-ponta em F3–F6. Nota: o redirect 307 de FastAPI (barra final) não afeta o app — o `api.ts` já usa barra final nas coleções (`/tags/`, `/contas/`…). |

Ordem deliberada: Tags/Contas (CRUD mais simples) **antes** de Transações para validar o
padrão de CRUD/modal/mutation; Dashboard depois que há dados reais para alimentar
`/graphs`; telas novas por último porque exigem UI desenhada do zero.

---

## 6. Decisões pendentes / dependências

> **Resolvidas (2026-06-06):** ver bloco abaixo. As decisões originais ficam registradas
> em itálico para histórico.

- ✅ **Arquitetura de rede / CORS:** *o backend libera `localhost:3000`; o Vite usa `5173`.*
  **Resolução:** o frontend fala **sempre por caminho relativo `/api/...`** e nunca chama
  a URL absoluta do backend. Em Docker, o **nginx do container do frontend** é o único a
  publicar porta (`8080:80`) e faz **reverse proxy `/api/` → `backend:8000`**; o backend
  não publica porta no host. Em dev local, o **proxy do Vite** reescreve `/api` →
  `http://localhost:8000`. Em ambos os modos as requisições são same-origin, então **CORS
  deixa de ser necessário** pela UI. (decisão #1 do usuário.)
- ⏳ **Import CSV parcial:** **Resolução:** **abortar tudo** ao encontrar erro e reportar a
  **linha problemática** na resposta (não importa parciais). Define o schema de erro da
  tela de Importar (F6). (decisão #2 do usuário.)
- ✅ **Logo/símbolo:** usar **wordmark** "Financex" (Inter, "x" na cor de marca) até existir
  um símbolo. (decisão #3 do usuário.)
- ✅ **Dev server vs Docker:** **Docker é a prioridade** (`docker-compose.yml`: só o
  frontend exposto). Rodar **local também é suportado**: `docker-compose.dev.yml` publica
  a porta do backend para o Vite (HMR) alcançá-la. (decisão #4 do usuário.)

---

## 7. Verificação (ao fim do port)

1. `npm run build` e `tsc` passam sem erros.
2. App sobe e navega por todas as rotas da sidebar.
3. CRUD real (criar/editar/excluir) de Tags, Contas, Transações e Orçamentos contra o
   backend, com toasts e invalidação atualizando as telas.
4. Dashboard: as 6 abas renderizam os gráficos com dados de `/graphs`; o PeriodSelector
   e o `exclude_tags` por card alteram os gráficos.
5. Importar/Exportar: CSV (transações) e JSON (configs) funcionam ponta-a-ponta.
6. Toggle light/dark funciona e os gráficos reconstroem.
7. Responsivo: sidebar vira drawer, grids empilham, tabela adapta em telas pequenas.
8. `docker build` do front + `docker-compose up` servem o app integrado ao backend.

---

## 8. Não-objetivos

- Multi-user / autenticação (single-user é decisão fechada do projeto).
- Análise por LLM (fase 2 do produto).
- Vendorizar libs para uso 100% offline.
- Redesign visual — o design do protótipo é a referência a preservar.
- Mudar o contrato da API (shapes de `/graphs` e schemas seguem como planejados).
