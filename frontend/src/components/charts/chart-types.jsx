/* ============================================================
   Financex — Wrappers Chart.js (theme-aware) por tipo de gráfico
   Reusa baseOptions/cssVar/ChartCanvas/brlTip de chart-core.jsx.
   Grupos A–G do GRAFICOS.md.
   Exposto: LineBarChart, DoughnutChart, StackedBarChart, HBarChart,
            DivergingBarChart, MultiLineChart, StackedAreaChart, TrendChart,
            RunRateChart, GroupedBarChart, BarChartSimple, hexA
   ============================================================ */

function hexA(hex, a) {
  const h = (hex || "#000").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* C1 — Receitas × Despesas (barras agrupadas) + linha de saldo */
function LineBarChart({ data, themeKey, height }) {
  const build = () => {
    const cRec = cssVar("--c-receita");
    const cDes = cssVar("--c-despesa");
    const cSal = cssVar("--c-saldo");
    const opts = baseOptions();
    opts.scales.x.grid.display = false;
    return {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [
          {
            type: "bar", label: "Receitas", data: data.receitas,
            backgroundColor: cRec, borderRadius: 6, maxBarThickness: 26, order: 2,
          },
          {
            type: "bar", label: "Despesas", data: data.despesas,
            backgroundColor: cDes, borderRadius: 6, maxBarThickness: 26, order: 2,
          },
          {
            type: "line", label: "Saldo", data: data.saldo,
            borderColor: cSal, backgroundColor: cSal,
            borderWidth: 2.5, tension: 0.35, order: 1,
            pointRadius: 3, pointHoverRadius: 5,
            pointBackgroundColor: cssVar("--bg-surface"),
            pointBorderColor: cSal, pointBorderWidth: 2,
          },
        ],
      },
      options: {
        ...opts,
        plugins: {
          ...opts.plugins,
          tooltip: {
            ...opts.plugins.tooltip,
            callbacks: { label: (c) => ` ${c.dataset.label}: ${brlTip(c.parsed.y)}` },
          },
        },
      },
    };
  };
  return <ChartCanvas build={build} themeKey={themeKey} height={height}
    deps={[data.labels.join(), data.receitas.join(), data.saldo.join()]} />;
}

/* Doughnut genérico (B1 categorias, C2 contas) com total no centro */
function DoughnutChart({ dataset, centerLabel, themeKey, height }) {
  const build = () => {
    const border = cssVar("--chart-elem-border");
    return {
      type: "doughnut",
      data: {
        labels: dataset.labels,
        datasets: [{
          data: dataset.data,
          backgroundColor: dataset.colors,
          borderColor: cssVar("--bg-surface"),
          borderWidth: 2,
          hoverBorderColor: border,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",
        plugins: {
          legend: { display: false },
          centerText: {
            text: window.FX.fmt.brlCompact(dataset.total),
            sub: centerLabel || "Total",
            color: cssVar("--text"),
            subColor: cssVar("--text-muted"),
          },
          tooltip: {
            backgroundColor: cssVar("--chart-tooltip-bg"),
            titleColor: cssVar("--chart-tooltip-text"),
            bodyColor: cssVar("--chart-tooltip-text"),
            borderColor: cssVar("--border"),
            borderWidth: 1, padding: 12, cornerRadius: 10, boxPadding: 6, usePointStyle: true,
            titleFont: { family: "Inter", weight: "600", size: 13 },
            bodyFont: { family: "Inter", size: 13 },
            callbacks: {
              label: (c) => {
                const tot = c.dataset.data.reduce((a, b) => a + b, 0);
                const p = tot > 0 ? (c.parsed / tot) * 100 : 0;
                return ` ${c.label}: ${brlTip(c.parsed)} (${window.FX.fmt.pct(p)})`;
              },
            },
          },
        },
      },
    };
  };
  return <ChartCanvas build={build} themeKey={themeKey} height={height}
    deps={[dataset.labels.join(), dataset.data.join()]} />;
}

/* B2 — barras empilhadas por categoria no tempo */
function StackedBarChart({ data, themeKey, height }) {
  const build = () => {
    const opts = baseOptions();
    opts.scales.x.stacked = true;
    opts.scales.y.stacked = true;
    opts.plugins.tooltip.callbacks = { label: (c) => ` ${c.dataset.label}: ${brlTip(c.parsed.y)}` };
    return {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: data.series.map((s) => ({
          label: s.label, data: s.data, backgroundColor: s.color,
          borderRadius: 3, maxBarThickness: 46,
        })),
      },
      options: opts,
    };
  };
  return <ChartCanvas build={build} themeKey={themeKey} height={height}
    deps={[data.labels.join(), data.series.map((s) => s.label + s.data.join()).join()]} />;
}

/* B3 — barra horizontal ordenada (cores de tag) */
function HBarChart({ dataset, themeKey, height, valueFmt }) {
  const build = () => {
    const opts = baseOptions();
    opts.indexAxis = "y";
    opts.scales.x.grid = { color: cssVar("--chart-grid") };
    opts.scales.x.ticks.callback = (v) => (valueFmt === "pct" ? window.FX.fmt.pct(v) : window.FX.fmt.brlCompact(v));
    opts.scales.y.grid = { display: false };
    opts.scales.y.ticks.callback = function (v) { return this.getLabelForValue(v); };
    opts.plugins.tooltip.callbacks = {
      label: (c) => " " + (valueFmt === "pct" ? window.FX.fmt.signedPct(c.parsed.x) : brlTip(c.parsed.x)),
    };
    return {
      type: "bar",
      data: {
        labels: dataset.labels,
        datasets: [{
          data: dataset.data, backgroundColor: dataset.colors,
          borderRadius: 5, maxBarThickness: 26,
        }],
      },
      options: opts,
    };
  };
  return <ChartCanvas build={build} themeKey={themeKey} height={height}
    deps={[dataset.labels.join(), dataset.data.join()]} />;
}

/* B4 — barra ± (variação). despesa: subiu=vermelho, caiu=verde */
function DivergingBarChart({ dataset, themeKey, height }) {
  const build = () => {
    const up = cssVar("--c-despesa"), down = cssVar("--c-receita");
    const opts = baseOptions();
    opts.indexAxis = "y";
    opts.scales.x.grid = { color: cssVar("--chart-grid") };
    opts.scales.x.ticks.callback = (v) => window.FX.fmt.signedPct(v);
    opts.scales.y.grid = { display: false };
    opts.scales.y.ticks.callback = function (v) { return this.getLabelForValue(v); };
    opts.plugins.tooltip.callbacks = {
      label: (c) => {
        const it = dataset.items[c.dataIndex];
        return [` Variação: ${window.FX.fmt.signedPct(c.parsed.x)}`,
          `   ${window.FX.fmt.brl(it.prev)} → ${window.FX.fmt.brl(it.cur)}`];
      },
    };
    return {
      type: "bar",
      data: {
        labels: dataset.labels,
        datasets: [{
          data: dataset.data,
          backgroundColor: dataset.data.map((v) => (v >= 0 ? up : down)),
          borderRadius: 5, maxBarThickness: 24,
        }],
      },
      options: opts,
    };
  };
  return <ChartCanvas build={build} themeKey={themeKey} height={height}
    deps={[dataset.labels.join(), dataset.data.join()]} />;
}

/* D1 / F2 — multi-linha (uma série por tag), com hidden toggle */
function MultiLineChart({ data, hidden = [], themeKey, height, area }) {
  const build = () => {
    const opts = baseOptions();
    opts.plugins.tooltip.callbacks = { label: (c) => ` ${c.dataset.label}: ${brlTip(c.parsed.y)}` };
    return {
      type: "line",
      data: {
        labels: data.labels,
        datasets: data.series.map((s) => ({
          label: s.label, data: s.data,
          borderColor: s.color,
          backgroundColor: area ? hexA(s.color, 0.12) : s.color,
          borderWidth: 2.5, tension: 0.35, fill: !!area,
          pointRadius: 2.5, pointHoverRadius: 5,
          pointBackgroundColor: cssVar("--bg-surface"), pointBorderColor: s.color, pointBorderWidth: 2,
          hidden: hidden.includes(s.label),
        })),
      },
      options: opts,
    };
  };
  return <ChartCanvas build={build} themeKey={themeKey} height={height}
    deps={[data.labels.join(), data.series.map((s) => s.label + s.data.join()).join(), hidden.join()]} />;
}

/* D2 — área empilhada (patrimônio acumulado) */
function StackedAreaChart({ data, hidden = [], themeKey, height }) {
  const build = () => {
    const opts = baseOptions();
    opts.scales.y.stacked = true;
    opts.plugins.tooltip.callbacks = { label: (c) => ` ${c.dataset.label}: ${brlTip(c.parsed.y)}` };
    return {
      type: "line",
      data: {
        labels: data.labels,
        datasets: data.series.map((s) => ({
          label: s.label, data: s.data,
          borderColor: s.color, backgroundColor: hexA(s.color, 0.55),
          borderWidth: 1.5, tension: 0.3, fill: true,
          pointRadius: 0, pointHoverRadius: 4,
          hidden: hidden.includes(s.label),
        })),
      },
      options: opts,
    };
  };
  return <ChartCanvas build={build} themeKey={themeKey} height={height}
    deps={[data.labels.join(), data.series.map((s) => s.label + s.data.join()).join(), hidden.join()]} />;
}

/* F3 — tendência: barras (despesa real) + linha de tendência + projeção tracejada */
function TrendChart({ data, themeKey, height }) {
  const build = () => {
    const cDes = cssVar("--c-despesa"), cTrend = cssVar("--accent"), cNeutro = cssVar("--c-neutro");
    const opts = baseOptions();
    opts.plugins.tooltip.callbacks = { label: (c) => ` ${c.dataset.label}: ${brlTip(c.parsed.y)}` };
    const labels = data.labels.concat(data.nextLabels);
    const realPad = data.real.concat(data.nextLabels.map(() => null));
    const trendFull = data.trend.concat(data.proj);
    // projeção: liga do último ponto de tendência aos futuros
    const projOnly = labels.map((_, i) => (i >= data.real.length - 1 ? trendFull[i] : null));
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          { type: "bar", label: "Despesa real", data: realPad, backgroundColor: hexA(cDes, 0.85), borderRadius: 5, maxBarThickness: 38, order: 3 },
          { type: "line", label: "Tendência", data: data.trend.concat(data.nextLabels.map(() => null)), borderColor: cTrend, borderWidth: 2.5, tension: 0, pointRadius: 0, order: 1 },
          { type: "line", label: "Projeção", data: projOnly, borderColor: cTrend, borderDash: [6, 5], borderWidth: 2.5, tension: 0, pointRadius: 3, pointBackgroundColor: cssVar("--bg-surface"), pointBorderColor: cTrend, order: 2 },
        ],
      },
      options: opts,
    };
  };
  return <ChartCanvas build={build} themeKey={themeKey} height={height}
    deps={[data.labels.join(), data.real.join(), data.proj.join()]} />;
}

/* F1 — linha real (sólida) + projeção (tracejada) do mês atual */
function RunRateChart({ data, themeKey, height }) {
  const build = () => {
    const cDes = cssVar("--c-despesa"), cNeutro = cssVar("--c-neutro");
    const opts = baseOptions();
    opts.scales.x.ticks.callback = function (val, i) { const lbl = this.getLabelForValue(val); return i % 2 === 0 ? lbl : ""; };
    opts.plugins.tooltip.callbacks = { label: (c) => (c.parsed.y == null ? null : ` ${c.dataset.label}: ${brlTip(c.parsed.y)}`) };
    return {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          { label: "Real (até hoje)", data: data.real, borderColor: cDes, backgroundColor: hexA(cDes, 0.10), borderWidth: 2.5, tension: 0.3, fill: true, pointRadius: 0, pointHoverRadius: 4, spanGaps: false },
          { label: "Projeção", data: data.proj, borderColor: cNeutro, borderDash: [6, 5], borderWidth: 2, tension: 0.2, pointRadius: 0, pointHoverRadius: 4 },
        ],
      },
      options: opts,
    };
  };
  return <ChartCanvas build={build} themeKey={themeKey} height={height}
    deps={[data.labels.join(), data.real.join(), data.proj.join()]} />;
}

/* G1 — barras agrupadas Orçado × Realizado (realizado vermelho se ≥ orçado) */
function GroupedBarChart({ data, themeKey, height }) {
  const build = () => {
    const cNeutro = cssVar("--c-neutro"), cBad = cssVar("--c-despesa"), cGood = cssVar("--c-receita");
    const opts = baseOptions();
    opts.plugins.tooltip.callbacks = { label: (c) => ` ${c.dataset.label}: ${brlTip(c.parsed.y)}` };
    return {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [
          { label: "Orçado", data: data.orcado, backgroundColor: hexA(cNeutro, 0.55), borderRadius: 5, maxBarThickness: 30 },
          { label: "Realizado", data: data.realizado, borderRadius: 5, maxBarThickness: 30,
            backgroundColor: data.realizado.map((v, i) => (v >= data.orcado[i] ? cBad : cGood)) },
        ],
      },
      options: opts,
    };
  };
  return <ChartCanvas build={build} themeKey={themeKey} height={height}
    deps={[data.labels.join(), data.orcado.join(), data.realizado.join()]} />;
}

/* barra vertical simples (E2/E4) — usa cor semântica despesa */
function BarChartSimple({ dataset, themeKey, height, thin }) {
  const build = () => {
    const opts = baseOptions();
    opts.plugins.tooltip.callbacks = { label: (c) => " " + window.FX.fmt.brl(c.parsed.y) };
    return {
      type: "bar",
      data: { labels: dataset.labels, datasets: [{ data: dataset.data, backgroundColor: dataset.colors, borderRadius: thin ? 2 : 6, maxBarThickness: thin ? 10 : 40 }] },
      options: opts,
    };
  };
  return <ChartCanvas build={build} themeKey={themeKey} height={height} deps={[dataset.labels.join(), dataset.data.join()]} />;
}

Object.assign(window, {
  LineBarChart, DoughnutChart, StackedBarChart, HBarChart, DivergingBarChart,
  MultiLineChart, StackedAreaChart, TrendChart, RunRateChart, GroupedBarChart,
  BarChartSimple, hexA,
});
