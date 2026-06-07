/**
 * Infra Chart.js compartilhada por todos os wrappers (GRAFICOS.md → Padrão
 * visual). Registra os controllers/elementos/escalas usados, lê os tokens CSS
 * (theme-aware) e expõe o plugin de texto central do doughnut. Render via
 * react-chartjs-2; a troca de tema força remount (key) para reler as vars.
 */
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  type ChartType,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  type Plugin,
  Tooltip,
} from "chart.js";

import { fmt } from "@/lib/format";

ChartJS.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

/** Lê um token CSS (`--algo`) resolvido no tema atual. */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** hex → rgba com alpha (para preenchimentos e bordas suaves). */
export function hexA(hex: string, a: number): string {
  const h = (hex || "#000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export const FONT = "Inter, system-ui, sans-serif";

/** Opções base (moldura theme-aware): grade, eixos, tooltip pt-BR. */
export function baseOptions(): ChartOptions {
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
        usePointStyle: true,
        titleFont: { family: FONT, weight: 600, size: 13 },
        bodyFont: { family: FONT, size: 13 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: tick, font: { family: FONT, size: 12 } },
      },
      y: {
        grid: { color: grid },
        border: { display: false },
        ticks: {
          color: tick,
          font: { family: FONT, size: 12 },
          callback: (v) => fmt.brlCompact(Number(v)),
        },
      },
    },
  };
}

/** Opções do plugin de texto central (registrado abaixo). */
export interface CenterTextOptions {
  text: string;
  sub: string;
  color: string;
  subColor: string;
}

/** Escreve o total no centro do doughnut (GRAFICOS.md → "total no centro"). */
export const centerTextPlugin: Plugin<"doughnut"> = {
  id: "centerText",
  afterDraw(chart) {
    const opts = chart.options.plugins?.centerText as CenterTextOptions | undefined;
    if (!opts?.text) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = opts.subColor;
    ctx.font = `500 12px ${FONT}`;
    ctx.fillText(opts.sub, cx, cy - 14);
    ctx.fillStyle = opts.color;
    ctx.font = `700 21px ${FONT}`;
    ctx.fillText(opts.text, cx, cy + 8);
    ctx.restore();
  },
};

ChartJS.register(centerTextPlugin);

// Augmenta o tipo das opções de plugin p/ aceitar `centerText`.
declare module "chart.js" {
  // TType faz parte da assinatura original da interface (não usado aqui).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    centerText?: CenterTextOptions;
  }
}
