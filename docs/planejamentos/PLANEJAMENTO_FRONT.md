# Gestor Financex — Planejamento Frontend

Documento vivo do frontend. Define stack, design system, layout/navegação, padrões de
componente e as telas. Cross-ref: gráficos em `GRAFICOS.md`, API em `PLANEJAMENTO_BACK.md`.

> **Legenda de status:** ✅ decidido · 🟡 **proposto — confirmar** · ❓ pergunta aberta (ver fim).

---

## 1. Princípios de design

Norte visual: **dashboard financeiro moderno, clean e arejado**, com "boards" arredondados.
Referência estética citada pelo usuário: **Trello** (cartões, cantos arredondados, layout limpo,
hierarquia clara, muito respiro/whitespace).

- **Clean acima de tudo:** pouco ruído, muito espaço em branco, bordas suaves.
- **Tudo é card (Board Card):** cada bloco de conteúdo (gráfico, formulário, lista) vive num cartão branco arredondado com sombra suave.
- **Hierarquia por tipografia e espaço**, não por linhas/divisórias pesadas.
- **Cor com propósito:** fundo neutro; cor forte só em dados (gráficos) e ações primárias.
- **Resposta rápida:** foco no "cadastro rápido" (meta do produto) — ação de nova transação sempre a 1 clique.

---

## 2. Stack e tooling 🟡

| Camada            | Escolha proposta              | Por quê |
|-------------------|-------------------------------|---------|
| Build/dev         | **Vite**                      | padrão moderno, HMR rápido (CRA está morto) |
| Linguagem         | **TypeScript** ✅             | tipa as respostas da API; espelha os schemas Pydantic |
| Framework         | **React** ✅                  | já decidido no planejamento |
| Estilo            | **Tailwind CSS** ✅           | utility-first casa perfeito com "clean + rounded + Trello-like" |
| Componentes       | **shadcn/ui** (Radix + Tailwind) ✅ | componentes acessíveis, sem CSS pré-imposto, fáceis de arredondar/tematizar |
| Ícones            | **lucide-react**              | par natural do shadcn, traço fino e moderno |
| Roteamento        | **React Router**              | navegação entre contextos |
| Estado de servidor| **TanStack Query** (React Query) | cache, refetch e invalidação dos CRUDs e gráficos |
| Estado de UI      | **Zustand** (leve) ou URL params | filtros ativos, período, tema |
| Formulários       | **React Hook Form + Zod**     | validação no cliente espelhando as regras do back |
| Gráficos          | **react-chartjs-2 + chart.js**| Chart.js já decidido no back; + `chartjs-chart-matrix` (heatmap) |
| Datas             | **date-fns** (locale pt-BR)   | formatação e buckets de período |
| HTTP              | **fetch** + wrapper, ou axios | base URL = `http://localhost:8000` |

> CORS já liberado no back para o dev server (porta a confirmar — back assume `3000`, Vite usa `5173` por padrão ❓).

---

## 3. Design system / tokens 🟡

Tokens como CSS variables (consumidos pelo Tailwind via `theme.extend`).

### Cores

Tokens como CSS variables, **trocados por tema** (`:root` = light, `.dark` = dark). Tailwind referencia via `theme.extend.colors`.

**Acento / marca** ✅ → **`#3066BE`** (azul). Botões primários, links ativos, aba selecionada, foco.
Escolhido sobre `#3626A7` por não colidir com o violeta de investimento. No dark, usa um tom mais claro pra contraste no preto.

```
--accent          #3066BE   /* light */
--accent-dark      #5B8DE8   /* dark — clareado pra ler sobre preto */
--accent-contrast  #FFFFFF   /* texto sobre o acento */
```

**Neutros — tema LIGHT** (base do "clean", cinza Trello-ish):
```
--bg-app        #F4F5F7
--bg-surface    #FFFFFF
--bg-muted      #F1F2F4
--border        #E4E6EA
--text          #172B4D
--text-muted    #5E6C84
```

**Neutros — tema DARK** (bem dark: quase preto + superfícies escuras):
```
--bg-app        #0A0B0D   /* fundo quase preto */
--bg-surface    #15171C   /* cards levemente elevados */
--bg-muted      #1E2127   /* hovers, inputs */
--border        #2A2E37
--text          #E6E8EB
--text-muted    #9AA0AA
```

**Semânticas (dados financeiros)** — mesma intenção nos dois temas; no dark usar a variante clareada pra contraste:
```
                  light       dark
--c-receita       #22C55E     #4ADE80   /* verde — entradas / positivo */
--c-despesa       #EF4444     #F87171   /* vermelho — saídas / negativo */
--c-investimento  #8B5CF6     #A78BFA   /* violeta — aporte / patrimônio */
--c-saldo         #3B82F6     #60A5FA   /* azul — linha de saldo */
--c-neutro        #9CA3AF     #6B7280   /* cinza — "Outros", média histórica */
```

> Cores de **Tag** e **Conta** são definidas pelo usuário (hex) e mandam nos gráficos por categoria/conta — o design system não as sobrescreve. (No dark, cores muito escuras escolhidas pelo usuário podem ficar pouco legíveis sobre o preto — tratar com uma borda/contorno sutil nos elementos do gráfico.)

### Tipografia
- Fonte: **Inter** (`Inter`, fallback system-ui). Moderna, neutra, ótima pra números.
- Escala: `12 / 14 / 16 / 20 / 24 / 32`. Títulos peso 600, corpo 400, números tabulares (`font-variant-numeric: tabular-nums`) em valores.

### Forma e elevação
```
--radius-sm   8px    /* inputs, chips */
--radius-md   12px   /* botões, modais */
--radius-lg   16px   /* Board Cards */
--shadow-sm   0 1px 2px rgba(9,30,66,.08)
--shadow-md   0 4px 12px rgba(9,30,66,.10)
```
- Espaçamento: escala base 4px (padrão Tailwind). Gutter entre cards: 16–24px.

### Tema (light/dark) ✅
**Os dois no MVP.** Light (estilo Trello) + **dark "bem dark"** (fundo quase preto `#0A0B0D`, superfícies escuras, cores semânticas clareadas). Implementado via classe `.dark` na raiz (estratégia `darkMode: 'class'` do Tailwind) + CSS variables. Toggle na navbar; preferência persistida (localStorage) e respeitando `prefers-color-scheme` no primeiro acesso.

---

## 4. Layout e navegação (IA)

### Shell da aplicação

```
┌───────────────────────────────────────────────────────────┐
│ NAVBAR  [logo Financex]   [seletor de período ▾]   [+ Nova]│ ← topo, fixo
├──────────┬────────────────────────────────────────────────┤
│ SIDEBAR  │                                                  │
│ ▸ Dashboard      CONTEÚDO DO CONTEXTO                       │
│ ▸ Transações       (com abas internas quando faz sentido)  │
│ ▸ Orçamentos                                                │
│ ▸ Tags                                                      │
│ ▸ Contas                                                    │
│ ▸ Importar/Exp.                                             │
│ ▸ Configurações                                             │
└──────────┴────────────────────────────────────────────────┘
```

### Navbar (topo, fixo) ✅
- Logo / nome do app à esquerda.
- **Seletor de período global** ✅ (range + granularidade) — dirige **todos** os gráficos do Dashboard. Default: mês atual.
- Botão **primário "+ Nova transação"** → abre modal de cadastro rápido (meta central do produto).
- **Toggle de tema** (light/dark) ✅.

### Sidebar (esquerda) — contextos
Cada item é um **contexto**. Dentro de um contexto, usamos **abas** quando há subdivisões.

| Contexto         | Abas internas (proposto) |
|------------------|--------------------------|
| **Dashboard**    | mapeiam os grupos do `GRAFICOS.md`: **Visão geral** (A·C) · **Categorias** (B) · **Investimentos** (D) · **Padrões de gasto** (E) · **Previsão** (F) · **Orçamento** (G) |
| **Transações**   | por `type`: Todas · Despesas · Receitas · Investimentos · Retiradas |
| **Orçamentos**   | por mês (seletor) — sem abas, ou aba "Atual" / "Histórico" |
| **Tags**         | por `type`: Despesa · Receita · Investimento |
| **Contas**       | por `type`: Banco · Investimento · Carteira |
| **Importar/Exportar** | CSV (transações) · JSON (configs) |
| **Configurações**| geral / aparência (futuro) |

> A ideia de "sidebar com abas por contexto" do usuário vira: **sidebar = contextos; abas = subdivisões dentro do contexto.** O Dashboard é onde isso brilha — as 6 abas batem 1:1 com os grupos de gráficos A–G.

### Rotas (React Router) 🟡
```
/                       → redirect /dashboard
/dashboard/:tab         → visao-geral | categorias | investimentos | padroes | previsao | orcamento
/transacoes             → lista + filtros (?type=, ?tag=, ?conta=, ?from=, ?to=)
/orcamentos             → lista por mês
/tags                   → lista (?type=)
/contas                 → lista (?type=)
/import-export
/configuracoes
```

---

## 5. Padrões de componente

### Board Card
Cartão branco arredondado (`radius-lg`, `shadow-sm`, padding 20–24px). É a unidade visual de tudo:
gráfico, formulário, bloco de lista. Header opcional (título + ações `⋯`). Detalhe da variante
de gráfico em `GRAFICOS.md` → "Padrão visual dos gráficos".

### Tabela de transações
- Linhas com a **cor da tag** como indicador (bolinha/borda esquerda), valor com sinal/cor por `type`.
- Colunas: data · descrição · tag · conta · método · valor · ações.
- Filtros no topo (chips/dropdowns): type, tag, conta, range de datas.
- Paginação ou scroll infinito ❓. Ações por linha: editar (modal), excluir (soft delete, confirmação).

### Formulário de cadastro rápido (transação)
- Em **modal** (aberto pelo "+ Nova" da navbar) e também inline na tela de Transações.
- Campos: `type` (segmented control), `value` (input monetário pt-BR), `date` (default hoje), `account`, `tag` (filtrada pelo type via regra de compatibilidade), `payment_method`, `description`.
- Validação client-side com Zod espelhando o back (valor > 0, tag compatível com type, conta ativa).
- React Hook Form; após salvar, invalida queries de transações e gráficos (TanStack Query).

### Formulários de Tag / Conta / Orçamento
- Mesmo padrão (modal). Tag/Conta incluem **color picker** (hex) + preview.
- Orçamento: select de tag (só despesa) + mês/ano + valor.

### Filtros e seletor de período ✅
- **Período global** (navbar): presets (Mês atual, Mês passado, Últimos 3/12 meses, Ano, Personalizado) + granularidade. **Todos os gráficos do Dashboard seguem esse período** (estado global, ex: Zustand ou URL params).
- **`exclude_tags`**: controle **por card** (chips removíveis), não global — para os gastos altos/fixos não poluírem gráficos específicos (decisão registrada em `GRAFICOS.md`).

### Estados padrão
- **Loading:** skeletons (nunca spinner solto no meio do layout).
- **Empty:** ícone + frase curta + atalho de ação.
- **Erro:** toast + retry.
- **Feedback de ação:** toasts (criou/atualizou/excluiu/importou).

---

## 6. Telas por contexto

### Dashboard
Header com KPIs (A1: receitas, despesas, saldo, investido líquido, taxa de poupança) em 4–5 cards.
Abaixo, grid de Board Cards por aba (grupos A–G do `GRAFICOS.md`). Período vem da navbar.

### Transações
Tabela + filtros + CRUD em modal. Botões de **Importar/Exportar CSV** no topo (ou no contexto Import/Export).

### Orçamentos
Lista do mês selecionado: cada tag de despesa com barra de progresso (orçado × gasto, cores de status
ok/atenção/estourado — ver G2). Botão "+ Orçamento". Atalho pro gráfico de alerta de estouro.

### Tags / Contas
Grid ou lista de cards coloridos (a cor da entidade em destaque), agrupados por `type` (abas). CRUD em modal, soft delete.

### Importar/Exportar
- CSV (transações): upload com preview/resumo do import (`{importadas, erros}`); download com filtros aplicados.
- JSON (configs): exporta/importa tags + contas (merge).

### Configurações
Mínimo por ora (single-user, sem auth). Espaço pra aparência/tema no futuro.

---

## 7. Estrutura de pastas (proposta) 🟡

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx                 # router + layout shell
    ├── lib/
    │   ├── api.ts              # wrapper fetch/axios, base URL
    │   ├── format.ts          # moeda/data pt-BR
    │   └── queryClient.ts     # TanStack Query
    ├── components/
    │   ├── layout/            # Navbar, Sidebar, Shell
    │   ├── ui/                # Board Card, Button, Modal, Input… (shadcn)
    │   └── charts/            # wrappers react-chartjs-2 por tipo
    ├── features/
    │   ├── transacoes/        # tabela, form, hooks de query
    │   ├── tags/
    │   ├── contas/
    │   ├── orcamentos/
    │   └── dashboard/         # uma pasta por aba/grupo de gráfico
    ├── hooks/
    └── types/                 # tipos espelhando schemas da API
```

---

## 8. Acessibilidade e responsividade ✅

- **Desktop-first** (uso principal no notebook), **mas mobile importa** — não é só bônus. Breakpoints do Tailwind; em telas pequenas: sidebar vira drawer (hambúrguer na navbar), grids de cards empilham em 1 coluna, tabelas viram cards/scroll horizontal.
- Componentes acessíveis via Radix (foco, teclado, ARIA) — shadcn adotado.
- Contraste mínimo AA nos **dois temas**; não comunicar só por cor (ícone + texto nos estados).

---

## 9. Decisões fechadas

1. ✅ **TypeScript**.
2. ✅ **Tailwind + shadcn/ui**.
3. ✅ **Light + Dark** no MVP (dark "bem dark": fundo quase preto + cores escuras).
4. ✅ **Acento `#3066BE`** (azul).
5. ✅ **Seletor de período global** na navbar — todos os gráficos seguem.
6. ✅ **Desktop-first, mas mobile importa** (responsivo de verdade).
7. ✅ **Sidebar → abas** confirmado (incl. as 6 abas do Dashboard = grupos A–G).

### Ainda em aberto ❓

- **Logo/símbolo:** nome "Financex" mantido; usuário providencia o símbolo depois. Até lá: **wordmark** simples ("Financex" em Inter, com o acento na cor de marca).
- **Porta do dev server:** Vite usa `5173`; o back hoje libera CORS pra `3000`. Ajustar um dos dois ao implementar (provável: liberar `5173` no back).
