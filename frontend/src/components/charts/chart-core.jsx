/* ============================================================
   Financex — Núcleo dos gráficos Chart.js (theme-aware)
   Helpers e infra compartilhados por todos os wrappers:
   lê as CSS variables (tokens) e reconstrói os gráficos quando
   o tema muda. Render via Chart.js UMD (window.Chart).
   Exposto em window: ChartCanvas, cssVar, baseOptions
   ============================================================ */
const { useRef, useEffect } = React;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Plugin: escreve o total no centro do doughnut (GRAFICOS.md → "total no centro")
const centerTextPlugin = {
  id: "centerText",
  afterDraw(chart, args, opts) {
    if (!opts || !opts.text) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = opts.subColor || "#5E6C84";
    ctx.font = "500 12px Inter, sans-serif";
    ctx.fillText(opts.sub || "Total", cx, cy - 14);
    ctx.fillStyle = opts.color || "#172B4D";
    ctx.font = "700 21px Inter, sans-serif";
    ctx.fillText(opts.text, cx, cy + 8);
    ctx.restore();
  },
};
if (window.Chart && !window.__fxCenterReg) {
  window.Chart.register(centerTextPlugin);
  window.__fxCenterReg = true;
}

const brlTip = (v) => window.FX.fmt.brl(v);

/* Base de opções comum (moldura theme-aware) */
function baseOptions() {
  const tick = cssVar("--chart-tick");
  const grid = cssVar("--chart-grid");
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    layout: { padding: { top: 4 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cssVar("--chart-tooltip-bg"),
        titleColor: cssVar("--chart-tooltip-text"),
        bodyColor: cssVar("--chart-tooltip-text"),
        borderColor: cssVar("--border"),
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        boxPadding: 6,
        titleFont: { family: "Inter", weight: "600", size: 13 },
        bodyFont: { family: "Inter", size: 13 },
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: tick, font: { family: "Inter", size: 12 } },
      },
      y: {
        grid: { color: grid },
        border: { display: false },
        ticks: {
          color: tick,
          font: { family: "Inter", size: 12 },
          callback: (v) => window.FX.fmt.brlCompact(v),
        },
      },
    },
  };
}

/* Generic canvas: recebe builder(themeKey) → {type?, data, options}; rebuild on key change */
function ChartCanvas({ build, deps = [], themeKey, height }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;
    const cfg = build();
    chartRef.current = new window.Chart(canvasRef.current.getContext("2d"), cfg);
    return () => { if (chartRef.current) chartRef.current.destroy(); };
    // eslint-disable-next-line
  }, [themeKey, ...deps]);

  return (
    <div style={{ position: "relative", height: height || 300, width: "100%" }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

Object.assign(window, { ChartCanvas, cssVar, baseOptions });
