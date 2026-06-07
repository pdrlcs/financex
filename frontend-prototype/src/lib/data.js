/* ============================================================
   Financex — Dados mock (pt-BR) + helpers de formatação
   ⚠️ INVENTADO: dados de exemplo. A API real vive em /graphs.
   Exposto em window.FX
   ============================================================ */

/* ---------- Formatação pt-BR (GRAFICOS.md → Formatação) ---------- */
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1,
});
const pct = (n, dec = 1) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n) + "%";

const fmt = {
  brl: (v) => brl.format(v),
  brlCompact: (v) => brlCompact.format(v).replace("mil", "mil"),
  pct,
  // sinal explícito (+/−) para deltas
  signed: (v) => (v >= 0 ? "+" : "−") + brl.format(Math.abs(v)).replace("R$", "R$").trim(),
  signedPct: (v) => (v >= 0 ? "+" : "−") + pct(Math.abs(v)),
};

/* ---------- Entidades ---------- */
// Contas (cor definida pelo usuário — GRAFICOS.md)
const contas = [
  { id: 1, nome: "Nubank", tipo: "banco", color: "#820AD1" },
  { id: 2, nome: "Inter", tipo: "banco", color: "#FF7A00" },
  { id: 3, nome: "Itaú", tipo: "banco", color: "#EC7000" },
  { id: 4, nome: "Carteira", tipo: "carteira", color: "#6B7280" },
];

// Tags por type (cor definida pelo usuário)
const tags = {
  despesa: [
    { id: 11, nome: "Alimentação", color: "#F97316" },
    { id: 12, nome: "Moradia", color: "#0EA5E9" },
    { id: 13, nome: "Transporte", color: "#14B8A6" },
    { id: 14, nome: "Lazer", color: "#EC4899" },
    { id: 15, nome: "Saúde", color: "#84CC16" },
    { id: 16, nome: "Assinaturas", color: "#A855F7" },
    { id: 17, nome: "Educação", color: "#F59E0B" },
  ],
  receita: [
    { id: 21, nome: "Salário", color: "#16A34A" },
    { id: 22, nome: "Freelance", color: "#0891B2" },
    { id: 23, nome: "Dividendos", color: "#7C3AED" },
  ],
  investimento: [
    { id: 31, nome: "Tesouro", color: "#16A34A" },
    { id: 32, nome: "Ações", color: "#2563EB" },
    { id: 33, nome: "Cripto", color: "#F59E0B" },
    { id: 34, nome: "FIIs", color: "#DB2777" },
  ],
};

const metodos = ["Pix", "Cartão", "Dinheiro", "Transferência"];

/* ---------- Série mensal Jan–Jun 2026 ---------- */
const meses = [
  { key: "2026-01", label: "Jan", labelLong: "Janeiro 2026", dias: 31 },
  { key: "2026-02", label: "Fev", labelLong: "Fevereiro 2026", dias: 28 },
  { key: "2026-03", label: "Mar", labelLong: "Março 2026", dias: 31 },
  { key: "2026-04", label: "Abr", labelLong: "Abril 2026", dias: 30 },
  { key: "2026-05", label: "Mai", labelLong: "Maio 2026", dias: 31 },
  { key: "2026-06", label: "Jun", labelLong: "Junho 2026", dias: 30 },
];

// despesa por tag nome → [Jan..Jun]
const despesaSerie = {
  "Alimentação": [1180, 1240, 1320, 1290, 1410, 1350],
  "Moradia":     [1800, 1800, 1800, 1800, 1850, 1850],
  "Transporte":  [420, 480, 510, 460, 540, 500],
  "Lazer":       [380, 320, 450, 410, 520, 470],
  "Saúde":       [160, 420, 180, 200, 240, 210],
  "Assinaturas": [119, 119, 129, 129, 139, 139],
  "Educação":    [0, 600, 0, 0, 450, 0],
};
const receitaSerie = {
  "Salário":    [6500, 6500, 6500, 6500, 6800, 6800],
  "Freelance":  [800, 1200, 0, 1500, 900, 1100],
  "Dividendos": [120, 0, 180, 0, 210, 90],
};
const investSerie = { // aportes brutos
  "Tesouro": [500, 500, 600, 800, 700, 800],
  "Ações":   [300, 0, 400, 300, 500, 300],
  "Cripto":  [100, 200, 150, 0, 200, 150],
  "FIIs":    [200, 200, 300, 300, 300, 400],
};
const retiradaSerie = { // retiradas de investimento
  "Cripto": [0, 0, 500, 0, 0, 0],
};
// volume bruto por conta → [Jan..Jun]  (Σ value, todos os tipos, sem sinal)
const contaVolumeSerie = {
  "Nubank":   [9200, 9600, 8800, 9900, 10400, 9800],
  "Inter":    [3800, 4100, 3600, 4300, 4600, 4200],
  "Itaú":     [1900, 2000, 1700, 2200, 2300, 2100],
  "Carteira": [520, 480, 600, 540, 700, 600],
};
// gasto por método (despesa) → [Jan..Jun]
const metodoVolumeSerie = {
  "Pix":           [820, 760, 900, 880, 940, 860],
  "Cartão":        [2400, 3100, 2600, 2500, 3200, 2900],
  "Dinheiro":      [280, 360, 320, 300, 340, 310],
  "Transferência": [559, 759, 569, 609, 669, 449],
};

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

// Resumo (A1) de UM mês (índice)
function resumoMes(i) {
  const receitas = Object.values(receitaSerie).reduce((a, s) => a + s[i], 0);
  const despesas = Object.values(despesaSerie).reduce((a, s) => a + s[i], 0);
  const aportes = Object.values(investSerie).reduce((a, s) => a + s[i], 0);
  const retiradas = Object.values(retiradaSerie).reduce((a, s) => a + s[i], 0);
  const saldo = receitas - despesas;
  const investido_liquido = aportes - retiradas;
  const taxa_poupanca = receitas > 0 ? investido_liquido / receitas : null;
  return { receitas, despesas, saldo, investido_liquido, taxa_poupanca };
}

/* ---------- Períodos (seletor global da navbar) ---------- */
// range = [startIdx, endIdx] inclusivo sobre `meses`
const periodos = [
  { id: "jun26", label: "Junho 2026", sub: "01–30 jun 2026", range: [5, 5] },
  { id: "mai26", label: "Maio 2026", sub: "01–31 mai 2026", range: [4, 4] },
  { id: "3m", label: "Últimos 3 meses", sub: "abr–jun 2026", range: [3, 5] },
  { id: "6m", label: "Últimos 6 meses", sub: "jan–jun 2026", range: [0, 5] },
  { id: "ano", label: "Ano de 2026", sub: "jan–jun 2026", range: [0, 5] },
];

// Agrega o resumo (A1) sobre um range de meses
function resumoPeriodo(range) {
  const [a, b] = range;
  let receitas = 0, despesas = 0, aportes = 0, retiradas = 0;
  for (let i = a; i <= b; i++) {
    const r = resumoMes(i);
    receitas += r.receitas; despesas += r.despesas;
    aportes += r.investido_liquido; // já líquido por mês
  }
  const saldo = receitas - despesas;
  const investido_liquido = aportes;
  const taxa_poupanca = receitas > 0 ? investido_liquido / receitas : null;
  return { receitas, despesas, saldo, investido_liquido, taxa_poupanca };
}

// Período imediatamente anterior de mesmo tamanho (p/ deltas — INVENTADO p/ KPIs)
function resumoAnterior(range) {
  const [a, b] = range;
  const tam = b - a + 1;
  const pa = a - tam, pb = a - 1;
  if (pa < 0) return null; // sem histórico suficiente
  return resumoPeriodo([pa, pb]);
}

/* ---------- Datasets dos gráficos (shape Chart.js, GRAFICOS.md) ---------- */

// C1 — Receitas × Despesas + linha de saldo (sempre mostra os meses do range;
// se range for 1 mês, mostra os 6 meses do trailing p/ contexto — INVENTADO)
function c1_porMes(range) {
  let a = range[0], b = range[1];
  if (a === b) { a = Math.max(0, b - 5); } // 1 mês → trailing 6
  const idxs = [];
  for (let i = a; i <= b; i++) idxs.push(i);
  return {
    labels: idxs.map((i) => meses[i].label),
    receitas: idxs.map((i) => resumoMes(i).receitas),
    despesas: idxs.map((i) => resumoMes(i).despesas),
    saldo: idxs.map((i) => resumoMes(i).saldo),
    activeIdx: idxs.indexOf(range[1]),
  };
}

// B1 — Gastos por categoria (despesa) no período, regra "Outros" < 3%
function b1_porTag(range, excludeNames = []) {
  const [a, b] = range;
  const totals = tags.despesa
    .filter((t) => !excludeNames.includes(t.nome))
    .map((t) => {
      let v = 0;
      for (let i = a; i <= b; i++) v += (despesaSerie[t.nome] || [])[i] || 0;
      return { nome: t.nome, color: t.color, value: v };
    })
    .filter((x) => x.value > 0);
  const total = sum(totals.map((x) => x.value));
  const big = totals.filter((x) => x.value / total >= 0.03);
  const small = totals.filter((x) => x.value / total < 0.03);
  const outrosVal = sum(small.map((x) => x.value));
  big.sort((x, y) => y.value - x.value);
  const labels = big.map((x) => x.nome);
  const data = big.map((x) => x.value);
  const colors = big.map((x) => x.color);
  if (outrosVal > 0) { labels.push("Outros"); data.push(outrosVal); colors.push("#9CA3AF"); }
  return { labels, data, colors, total };
}

// C2 — Volume por conta no período (Σ value, sem sinal)
function c2_porConta(range) {
  const [a, b] = range;
  const items = contas.map((c) => {
    let v = 0;
    for (let i = a; i <= b; i++) v += (contaVolumeSerie[c.nome] || [])[i] || 0;
    return { nome: c.nome, color: c.color, value: v };
  }).filter((x) => x.value > 0);
  return {
    labels: items.map((x) => x.nome),
    data: items.map((x) => x.value),
    colors: items.map((x) => x.color),
    total: sum(items.map((x) => x.value)),
  };
}

/* ============================================================
   Diário (despesa) — gerado deterministicamente p/ E1–E5, F1.
   ⚠️ INVENTADO: distribuição diária realista (fim de semana +, pós-salário +,
   spikes esporádicos) que SOMA exatamente ao total mensal de despesa.
   ============================================================ */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const _dailyCache = {};
function dailyDespesa(monthIdx) {
  if (_dailyCache[monthIdx]) return _dailyCache[monthIdx];
  const total = Object.values(despesaSerie).reduce((a, s) => a + s[monthIdx], 0);
  const dias = meses[monthIdx].dias;
  const rng = mulberry32(monthIdx * 7919 + 17);
  const weights = [];
  for (let d = 1; d <= dias; d++) {
    const dow = new Date(2026, monthIdx, d).getDay(); // 0=dom..6=sáb
    let w = 1;
    if (dow === 0 || dow === 6) w *= 1.75; // fim de semana
    if (dow === 5) w *= 1.4;               // sexta
    if (d <= 6) w *= 1.45;                 // pós-salário
    w *= 0.5 + rng() * 1.1;                // jitter
    if (rng() > 0.9) w *= 2.4;             // gasto grande esporádico
    weights.push(w);
  }
  const wsum = weights.reduce((a, b) => a + b, 0);
  const values = weights.map((w) => +((w / wsum) * total).toFixed(2));
  _dailyCache[monthIdx] = values;
  return values;
}

// "Hoje" de demonstração: dia 18 do mês atual (jun) — ⚠️ INVENTADO p/ burndown/run-rate
const DEMO_TODAY = 18;
const CURRENT_MONTH = 5; // jun/2026
function focusMonth(range) { return range[1]; }
function todayOf(monthIdx) { return monthIdx === CURRENT_MONTH ? DEMO_TODAY : meses[monthIdx].dias; }

/* ---------- B2 — Categorias ao longo dos meses (stacked bar) ---------- */
function b2_temporal(range, excludeNames = []) {
  let a = range[0], b = range[1];
  if (a === b) a = Math.max(0, b - 5);
  const idxs = []; for (let i = a; i <= b; i++) idxs.push(i);
  const series = tags.despesa.filter((t) => !excludeNames.includes(t.nome)).map((t) => ({
    label: t.nome, color: t.color, data: idxs.map((i) => despesaSerie[t.nome][i]),
  }));
  return { labels: idxs.map((i) => meses[i].label), series };
}

/* ---------- B3 — Ranking de categorias (barra horizontal) ---------- */
function b3_ranking(range, excludeNames = []) {
  const [a, b] = range;
  const items = tags.despesa.filter((t) => !excludeNames.includes(t.nome)).map((t) => {
    let v = 0; for (let i = a; i <= b; i++) v += despesaSerie[t.nome][i];
    return { nome: t.nome, color: t.color, value: v };
  }).filter((x) => x.value > 0).sort((x, y) => y.value - x.value);
  return { labels: items.map((x) => x.nome), data: items.map((x) => x.value), colors: items.map((x) => x.color) };
}

/* ---------- B4 — Variação % vs período anterior (barra ±) ---------- */
// despesa: subiu = ruim (vermelho), caiu = bom (verde). Segue o guia de cores (§ Padrão visual).
function b4_variacao(range, excludeNames = []) {
  const [a, b] = range; const size = b - a + 1; const pa = a - size, pb = a - 1;
  const items = tags.despesa.filter((t) => !excludeNames.includes(t.nome)).map((t) => {
    let cur = 0; for (let i = a; i <= b; i++) cur += despesaSerie[t.nome][i];
    let prev = 0; if (pa >= 0) for (let i = pa; i <= pb; i++) prev += despesaSerie[t.nome][i];
    const pctv = prev > 0 ? ((cur - prev) / prev) * 100 : null;
    return { nome: t.nome, color: t.color, cur, prev, pct: pctv };
  }).filter((x) => x.pct !== null && (x.cur > 0 || x.prev > 0)).sort((x, y) => y.pct - x.pct);
  return { labels: items.map((x) => x.nome), data: items.map((x) => +x.pct.toFixed(1)), items, hasPrev: pa >= 0 };
}

/* ---------- D1 — Aporte por período (multi-linha, net por tag) ---------- */
function d1_aporte(range) {
  let a = range[0], b = range[1]; if (a === b) a = Math.max(0, b - 5);
  const idxs = []; for (let i = a; i <= b; i++) idxs.push(i);
  const series = tags.investimento.map((t) => ({
    label: t.nome, color: t.color,
    data: idxs.map((i) => (investSerie[t.nome]?.[i] || 0) - (retiradaSerie[t.nome]?.[i] || 0)),
  }));
  return { labels: idxs.map((i) => meses[i].label), series };
}

/* ---------- D2 — Patrimônio acumulado por tipo (área empilhada) ---------- */
function d2_acumulado(range) {
  const b = range[1];
  const idxs = []; for (let i = 0; i <= b; i++) idxs.push(i); // do início do ano até o fim do período
  const series = tags.investimento.map((t) => {
    let acc = 0;
    const data = idxs.map((i) => { acc += (investSerie[t.nome]?.[i] || 0) - (retiradaSerie[t.nome]?.[i] || 0); return acc; });
    return { label: t.nome, color: t.color, data };
  });
  return { labels: idxs.map((i) => meses[i].label), series };
}

/* ---------- E1 — Mapa de calor (calendário do mês foco) ---------- */
function e1_heatmap(range) {
  const m = focusMonth(range);
  const vals = dailyDespesa(m);
  const max = Math.max(...vals, 1);
  const firstDow = (new Date(2026, m, 1).getDay() + 6) % 7; // 0=seg..6=dom
  return { vals, max, firstDow, monthIdx: m, dias: meses[m].dias, label: meses[m].labelLong };
}

/* ---------- E2 — Gasto por dia da semana ---------- */
function e2_porDiaSemana(range, agg = "media") {
  const [a, b] = range;
  const sums = [0, 0, 0, 0, 0, 0, 0], counts = [0, 0, 0, 0, 0, 0, 0];
  for (let i = a; i <= b; i++) {
    dailyDespesa(i).forEach((v, idx) => {
      const col = (new Date(2026, i, idx + 1).getDay() + 6) % 7; // 0=seg
      sums[col] += v; counts[col]++;
    });
  }
  const data = sums.map((s, idx) => agg === "media" ? (counts[idx] ? +(s / counts[idx]).toFixed(2) : 0) : +s.toFixed(2));
  return { labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"], data };
}

/* ---------- E3 — Curva de queima (burndown) ---------- */
function e3_burndown(range) {
  const m = focusMonth(range), dias = meses[m].dias, today = todayOf(m);
  const cur = dailyDespesa(m);
  const atual = []; let acc = 0;
  for (let d = 0; d < dias; d++) { if (d < today) { acc += cur[d]; atual.push(+acc.toFixed(2)); } else atual.push(null); }
  // média histórica acumulada (meses anteriores cheios)
  const cums = [];
  for (let i = 0; i < m; i++) { let a = 0; cums.push(dailyDespesa(i).map((v) => (a += v))); }
  const historica = [];
  for (let d = 0; d < dias; d++) {
    let s = 0, c = 0;
    cums.forEach((cm) => { const val = cm[d] != null ? cm[d] : cm[cm.length - 1]; s += val; c++; });
    historica.push(c ? +(s / c).toFixed(2) : null);
  }
  return { labels: Array.from({ length: dias }, (_, k) => k + 1), atual, historica, today, hasHist: cums.length > 0, label: meses[m].labelLong };
}

/* ---------- E4 — Gasto por dia do mês (média) ---------- */
function e4_porDiaMes(range) {
  const [a, b] = range;
  const sums = new Array(31).fill(0), counts = new Array(31).fill(0);
  for (let i = a; i <= b; i++) dailyDespesa(i).forEach((v, idx) => { sums[idx] += v; counts[idx]++; });
  const data = sums.map((s, idx) => counts[idx] ? +(s / counts[idx]).toFixed(2) : 0);
  return { labels: Array.from({ length: 31 }, (_, k) => k + 1), data };
}

/* ---------- E5 — Gasto por método de pagamento (doughnut) ---------- */
const METODO_COLOR = { "Pix": "#10B981", "Cartão": "#3B82F6", "Dinheiro": "#84CC16", "Transferência": "#A855F7" };
function e5_porMetodo(range) {
  const [a, b] = range;
  const items = metodos.map((mname) => {
    let v = 0; for (let i = a; i <= b; i++) v += (metodoVolumeSerie[mname]?.[i] || 0);
    return { nome: mname, color: METODO_COLOR[mname], value: v };
  }).filter((x) => x.value > 0).sort((x, y) => y.value - x.value);
  return { labels: items.map((x) => x.nome), data: items.map((x) => x.value), colors: items.map((x) => x.color), total: sum(items.map((x) => x.value)) };
}

/* ---------- F1 — Run-rate (projeção fim de mês) ---------- */
function f1_runRate(range) {
  const m = focusMonth(range), dias = meses[m].dias, today = todayOf(m);
  const cur = dailyDespesa(m);
  let gasto = 0; for (let d = 0; d < today; d++) gasto += cur[d];
  const dailyRate = today > 0 ? gasto / today : 0;
  const projecao = +(dailyRate * dias).toFixed(2);
  const priors = [];
  for (let i = 0; i < m; i++) priors.push(Object.values(despesaSerie).reduce((a, s) => a + s[i], 0));
  const media = priors.length ? +(priors.reduce((a, b) => a + b, 0) / priors.length).toFixed(2) : projecao;
  const tendencia = projecao > media * 1.05 ? "acima" : projecao < media * 0.95 ? "abaixo" : "dentro";
  const labels = Array.from({ length: dias }, (_, k) => k + 1);
  const real = []; let acc = 0;
  for (let d = 0; d < dias; d++) { if (d < today) { acc += cur[d]; real.push(+acc.toFixed(2)); } else real.push(null); }
  const proj = [];
  for (let d = 0; d < dias; d++) {
    if (d < today - 1) proj.push(null);
    else proj.push(+(gasto + dailyRate * (d - (today - 1))).toFixed(2));
  }
  return { gasto_ate_agora: +gasto.toFixed(2), dia_atual: today, dias_no_mes: dias, projecao_fim_mes: projecao, media_historica: media, tendencia, labels, real, proj, partial: m === CURRENT_MONTH, label: meses[m].labelLong };
}

/* ---------- F2 — Média móvel 3m por categoria (multi-linha) ---------- */
function f2_mediaMovel(window = 3) {
  const series = tags.despesa.map((t) => {
    const s = despesaSerie[t.nome];
    const ma = s.map((_, i) => {
      const start = Math.max(0, i - window + 1), slice = s.slice(start, i + 1);
      return +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2);
    });
    return { label: t.nome, color: t.color, data: ma };
  });
  return { labels: meses.map((m) => m.label), series, window };
}

/* ---------- F3 — Tendência da despesa mensal (regressão linear) ---------- */
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function f3_tendencia(range) {
  let a = range[0], b = range[1]; if (a === b) { a = 0; b = 5; }
  const idxs = []; for (let i = a; i <= b; i++) idxs.push(i);
  const real = idxs.map((i) => Object.values(despesaSerie).reduce((s, arr) => s + arr[i], 0));
  const n = real.length, xs = idxs.map((_, k) => k);
  const xm = xs.reduce((p, q) => p + q, 0) / n, ym = real.reduce((p, q) => p + q, 0) / n;
  let num = 0, den = 0; xs.forEach((x, k) => { num += (x - xm) * (real[k] - ym); den += (x - xm) ** 2; });
  const slope = den ? num / den : 0, intercept = ym - slope * xm;
  const trend = xs.map((x) => +(intercept + slope * x).toFixed(2));
  const projN = [1, 2].map((k) => +(intercept + slope * (n - 1 + k)).toFixed(2));
  const nextLabels = [MONTH_NAMES[b + 1], MONTH_NAMES[b + 2]].filter(Boolean);
  return { labels: idxs.map((i) => meses[i].label), real, trend, nextLabels, proj: projN, slope: +slope.toFixed(1) };
}

/* ---------- G — Orçamentos (⚠️ INVENTADO: limites mensais por tag despesa) ---------- */
const orcamentos = {
  "Alimentação": 1400, "Moradia": 1900, "Transporte": 550,
  "Lazer": 450, "Saúde": 300, "Assinaturas": 150, "Educação": 500,
};
function _gastoMes(tagName, monthIdx) {
  // mês atual = parcial (proporcional a hoje); meses passados = cheio
  const full = despesaSerie[tagName][monthIdx];
  if (monthIdx === CURRENT_MONTH) return +(full * (DEMO_TODAY / meses[monthIdx].dias)).toFixed(2);
  return full;
}
function g1_realizado(range, excludeNames = []) {
  const m = focusMonth(range);
  const items = tags.despesa.filter((t) => !excludeNames.includes(t.nome) && orcamentos[t.nome]).map((t) => ({
    nome: t.nome, color: t.color, orcado: orcamentos[t.nome], realizado: despesaSerie[t.nome][m],
  }));
  return { labels: items.map((x) => x.nome), orcado: items.map((x) => x.orcado), realizado: items.map((x) => x.realizado), items, label: meses[m].labelLong };
}
function g2_progresso(range) {
  const m = focusMonth(range);
  return tags.despesa.filter((t) => orcamentos[t.nome]).map((t) => {
    const orcado = orcamentos[t.nome], gasto = _gastoMes(t.nome, m), percent = gasto / orcado;
    const status = percent >= 1 ? "estourado" : percent >= 0.7 ? "atencao" : "ok";
    return { tag: t.nome, color: t.color, orcado, gasto, percent, status };
  }).sort((a, b) => b.percent - a.percent);
}
function g3_alertas(range) {
  const m = focusMonth(range), dias = meses[m].dias, today = todayOf(m);
  const out = [];
  tags.despesa.filter((t) => orcamentos[t.nome]).forEach((t) => {
    const gasto = _gastoMes(t.nome, m), rate = today ? gasto / today : 0, proj = +(rate * dias).toFixed(2);
    const orcado = orcamentos[t.nome];
    if (proj > orcado) {
      const dia = rate > 0 ? Math.ceil(orcado / rate) : null;
      out.push({ tag: t.nome, color: t.color, orcado, gasto_atual: gasto, projecao_fim_mes: proj, dia_estouro: dia && dia <= dias ? dia : null });
    }
  });
  return out.sort((a, b) => (b.projecao_fim_mes - b.orcado) - (a.projecao_fim_mes - a.orcado));
}

/* ============================================================
   Transações individuais — ⚠️ INVENTADO: lista realista derivada
   das séries mensais (split em vários lançamentos por tag/mês).
   ============================================================ */
const DESCRICOES = {
  "Alimentação": ["Mercado Pão de Açúcar", "iFood", "Padaria do bairro", "Restaurante", "Hortifruti", "Mercado Extra"],
  "Moradia": ["Aluguel", "Condomínio", "Energia (Enel)", "Internet Vivo", "Conta de água"],
  "Transporte": ["Uber", "Posto Shell", "Estacionamento", "Bilhete único", "99 Pop"],
  "Lazer": ["Cinema", "Bar com amigos", "Show", "Viagem fim de semana", "Steam"],
  "Saúde": ["Farmácia Drogasil", "Consulta médica", "Academia", "Dentista"],
  "Assinaturas": ["Netflix", "Spotify", "Amazon Prime", "iCloud", "ChatGPT Plus"],
  "Educação": ["Curso Udemy", "Livros", "Mensalidade faculdade", "Workshop"],
  "Salário": ["Salário"],
  "Freelance": ["Projeto freelance", "Consultoria"],
  "Dividendos": ["Dividendos ITUB4", "JCP BBAS3", "Rendimento FII"],
  "Tesouro": ["Tesouro Selic", "Tesouro IPCA+"],
  "Ações": ["Compra PETR4", "Compra VALE3", "Compra WEGE3"],
  "Cripto": ["Compra BTC", "Compra ETH"],
  "FIIs": ["MXRF11", "HGLG11", "KNRI11"],
};
const TIPO_INFO = {
  despesa: { label: "Despesa", color: "#EF4444", sign: -1, cssVar: "--c-despesa" },
  receita: { label: "Receita", color: "#22C55E", sign: 1, cssVar: "--c-receita" },
  investimento: { label: "Investimento", color: "#8B5CF6", sign: -1, cssVar: "--c-investimento" },
  retirada_investimento: { label: "Retirada", color: "#3B82F6", sign: 1, cssVar: "--c-saldo" },
};
const CONTAS_POR_TIPO = { despesa: [1, 2, 4], receita: [1, 2], investimento: [3, 1], retirada_investimento: [3, 1] };

function _splitAmount(total, n, rng) {
  const w = Array.from({ length: n }, () => 0.5 + rng());
  const ws = w.reduce((a, b) => a + b, 0);
  const parts = w.map((x) => Math.round((x / ws) * total));
  parts[n - 1] += Math.round(total) - parts.reduce((a, b) => a + b, 0);
  return parts.map((p) => Math.max(1, p));
}
function _mkTx(id, mi, day, type, tag, value, contaId, metodo, descr) {
  const conta = contas.find((c) => c.id === contaId) || contas[0];
  const dd = String(day).padStart(2, "0");
  const mm = String(mi + 1).padStart(2, "0");
  return {
    id, type, value,
    date: `2026-${mm}-${dd}`, dia: day, mi, dateNum: mi * 100 + day,
    tagId: tag.id, tagNome: tag.nome, tagColor: tag.color,
    contaId: conta.id, contaNome: conta.nome, contaColor: conta.color,
    metodo, descricao: descr,
  };
}
function genTransacoes() {
  const out = []; let id = 1000;
  const rng = mulberry32(99);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  for (let mi = 0; mi <= CURRENT_MONTH; mi++) {
    const partial = mi === CURRENT_MONTH;
    const maxDay = partial ? DEMO_TODAY : meses[mi].dias;
    const factor = partial ? DEMO_TODAY / meses[mi].dias : 1;
    // despesas
    tags.despesa.forEach((t) => {
      let total = (despesaSerie[t.nome][mi] || 0) * factor;
      if (total < 1) return;
      const n = t.nome === "Moradia" ? 2 : 2 + Math.floor(rng() * 3);
      _splitAmount(total, n, rng).forEach((v) => {
        out.push(_mkTx(id++, mi, 1 + Math.floor(rng() * maxDay), "despesa", t, v, pick(CONTAS_POR_TIPO.despesa), pick(metodos), pick(DESCRICOES[t.nome])));
      });
    });
    // receitas
    tags.receita.forEach((t) => {
      const total = (receitaSerie[t.nome][mi] || 0) * (t.nome === "Salário" ? 1 : factor);
      if (total < 1) return;
      const day = t.nome === "Salário" ? 5 : 1 + Math.floor(rng() * maxDay);
      out.push(_mkTx(id++, mi, Math.min(day, maxDay), "receita", t, Math.round(total), pick(CONTAS_POR_TIPO.receita), "Transferência", pick(DESCRICOES[t.nome])));
    });
    // investimentos (aportes) + retiradas
    tags.investimento.forEach((t) => {
      const ap = (investSerie[t.nome]?.[mi] || 0) * factor;
      if (ap >= 1) out.push(_mkTx(id++, mi, 1 + Math.floor(rng() * maxDay), "investimento", t, Math.round(ap), pick(CONTAS_POR_TIPO.investimento), "Transferência", pick(DESCRICOES[t.nome])));
      const rt = (retiradaSerie[t.nome]?.[mi] || 0) * factor;
      if (rt >= 1) out.push(_mkTx(id++, mi, 1 + Math.floor(rng() * maxDay), "retirada_investimento", t, Math.round(rt), pick(CONTAS_POR_TIPO.investimento), "Transferência", "Venda " + t.nome));
    });
  }
  return out.sort((a, b) => b.dateNum - a.dateNum || b.id - a.id);
}
const transacoes = genTransacoes();

window.FX = {
  fmt, contas, tags, metodos, meses, periodos, orcamentos,
  DEMO_TODAY, CURRENT_MONTH, focusMonth, todayOf,
  transacoes, TIPO_INFO, DESCRICOES,
  resumoMes, resumoPeriodo, resumoAnterior,
  c1_porMes, b1_porTag, c2_porConta,
  b2_temporal, b3_ranking, b4_variacao,
  d1_aporte, d2_acumulado,
  e1_heatmap, e2_porDiaSemana, e3_burndown, e4_porDiaMes, e5_porMetodo,
  f1_runRate, f2_mediaMovel, f3_tendencia,
  g1_realizado, g2_progresso, g3_alertas,
};
