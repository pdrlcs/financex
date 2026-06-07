/**
 * Wrappers react-chartjs-2 por tipo de gráfico (GRAFICOS.md, grupos A–G). Cada
 * um lê os tokens via cssVar e remonta ao trocar de tema (`key={theme}`), então
 * a moldura e as cores semânticas acompanham light/dark. Consomem direto o JSON
 * dos endpoints `/graphs` (não calculam agregação — isso é do backend).
 */
import type { ChartData, ChartOptions } from "chart.js";
import { useMemo } from "react";
import { Bar, Chart, Doughnut, Line } from "react-chartjs-2";

import { useTheme } from "@/components/layout/theme-provider";
import { fmt } from "@/lib/format";
import type { GraphData, TendenciaData, VariacaoData } from "@/types/graphs";

import { baseOptions, cssVar, hexA } from "./chart-setup";

function ChartBox({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", height, width: "100%" }}>{children}</div>
  );
}

/** Doughnut genérico (B1 categorias, C2 contas, E5 método) com total no centro. */
export function DoughnutChart({
  data,
  centerLabel,
  height,
}: {
  data: GraphData;
  centerLabel: string;
  height: number;
}) {
  const { theme } = useTheme();
  const ds = data.datasets[0];
  const colors = (ds?.backgroundColor as string[]) ?? [];
  const total = (ds?.data ?? []).reduce<number>((a, b) => a + (b ?? 0), 0);

  const chartData = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: data.labels,
      datasets: [
        {
          data: (ds?.data ?? []).map((v) => v ?? 0),
          backgroundColor: colors,
          borderColor: cssVar("--bg-surface"),
          borderWidth: 2,
          hoverBorderColor: cssVar("--chart-elem-border"),
          hoverOffset: 6,
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, theme],
  );

  const options = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "66%",
      plugins: {
        legend: { display: false },
        centerText: {
          text: fmt.brlCompact(total),
          sub: centerLabel,
          color: cssVar("--text"),
          subColor: cssVar("--text-muted"),
        },
        tooltip: {
          ...baseOptions().plugins!.tooltip,
          callbacks: {
            label: (c) => {
              const arr = c.dataset.data as number[];
              const tot = arr.reduce((a, b) => a + b, 0);
              const p = tot > 0 ? (Number(c.parsed) / tot) * 100 : 0;
              return ` ${c.label}: ${fmt.brl(Number(c.parsed))} (${fmt.pct(p)})`;
            },
          },
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total, centerLabel, theme],
  );

  return (
    <ChartBox height={height}>
      <Doughnut key={theme} data={chartData} options={options} />
    </ChartBox>
  );
}

/** C1 — Receitas × Despesas (barras agrupadas) + linha de saldo. */
export function LineBarChart({ data, height }: { data: GraphData; height: number }) {
  const { theme } = useTheme();
  const pick = (label: string) => data.datasets.find((d) => d.label === label)?.data ?? [];

  const chartData = useMemo<ChartData>(() => {
    const cRec = cssVar("--c-receita");
    const cDes = cssVar("--c-despesa");
    const cSal = cssVar("--c-saldo");
    return {
      labels: data.labels,
      datasets: [
        {
          type: "bar" as const,
          label: "Receitas",
          data: pick("Receitas"),
          backgroundColor: cRec,
          borderRadius: 6,
          maxBarThickness: 26,
          order: 2,
        },
        {
          type: "bar" as const,
          label: "Despesas",
          data: pick("Despesas"),
          backgroundColor: cDes,
          borderRadius: 6,
          maxBarThickness: 26,
          order: 2,
        },
        {
          type: "line" as const,
          label: "Saldo",
          data: pick("Saldo"),
          borderColor: cSal,
          backgroundColor: cSal,
          borderWidth: 2.5,
          tension: 0.35,
          order: 1,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: cssVar("--bg-surface"),
          pointBorderColor: cSal,
          pointBorderWidth: 2,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, theme]);

  const options = useMemo<ChartOptions>(() => {
    const o = baseOptions();
    o.plugins!.tooltip!.callbacks = {
      label: (c) => ` ${c.dataset.label}: ${fmt.brl(Number(c.parsed.y))}`,
    };
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <ChartBox height={height}>
      <Chart key={theme} type="bar" data={chartData} options={options} />
    </ChartBox>
  );
}

/** B2 — barras empilhadas por categoria no tempo. */
export function StackedBarChart({ data, height }: { data: GraphData; height: number }) {
  const { theme } = useTheme();
  const chartData = useMemo<ChartData<"bar">>(
    () => ({
      labels: data.labels,
      datasets: data.datasets.map((s) => ({
        label: s.label,
        data: s.data.map((v) => v ?? 0),
        backgroundColor: (s.backgroundColor as string) ?? s.borderColor,
        borderRadius: 3,
        maxBarThickness: 46,
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, theme],
  );

  const options = useMemo<ChartOptions<"bar">>(() => {
    const o = baseOptions() as ChartOptions<"bar">;
    o.scales!.x!.stacked = true;
    o.scales!.y!.stacked = true;
    o.plugins!.tooltip!.callbacks = {
      label: (c) => ` ${c.dataset.label}: ${fmt.brl(Number(c.parsed.y))}`,
    };
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <ChartBox height={height}>
      <Bar key={theme} data={chartData} options={options} />
    </ChartBox>
  );
}

/** B3 — barra horizontal ordenada (cores de tag). */
export function HBarChart({ data, height }: { data: GraphData; height: number }) {
  const { theme } = useTheme();
  const ds = data.datasets[0];
  const chartData = useMemo<ChartData<"bar">>(
    () => ({
      labels: data.labels,
      datasets: [
        {
          data: (ds?.data ?? []).map((v) => v ?? 0),
          backgroundColor: (ds?.backgroundColor as string[]) ?? [],
          borderRadius: 5,
          maxBarThickness: 26,
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, theme],
  );

  const options = useMemo<ChartOptions<"bar">>(() => {
    const tick = cssVar("--chart-tick");
    const o = baseOptions() as ChartOptions<"bar">;
    o.indexAxis = "y";
    // Eixo X = valor (R$); eixo Y = categorias (rótulos da própria escala).
    o.scales!.x!.grid = { color: cssVar("--chart-grid") };
    o.scales!.x!.ticks = { color: tick, callback: (v) => fmt.brlCompact(Number(v)) };
    o.scales!.y!.grid = { display: false };
    o.scales!.y!.ticks = {
      color: tick,
      callback(value) {
        return this.getLabelForValue(Number(value));
      },
    };
    o.plugins!.tooltip!.callbacks = { label: (c) => ` ${fmt.brl(Number(c.parsed.x))}` };
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <ChartBox height={height}>
      <Bar key={theme} data={chartData} options={options} />
    </ChartBox>
  );
}

/** B4 — barra ± (variação). Despesa: subiu = vermelho, caiu = verde. */
export function DivergingBarChart({ data, height }: { data: VariacaoData; height: number }) {
  const { theme } = useTheme();
  const ds = data.datasets[0];
  const chartData = useMemo<ChartData<"bar">>(() => {
    const up = cssVar("--c-despesa");
    const down = cssVar("--c-receita");
    return {
      labels: data.labels,
      datasets: [
        {
          data: (ds?.data ?? []).map((v) => v ?? 0),
          backgroundColor: (ds?.data ?? []).map((v) => ((v ?? 0) >= 0 ? up : down)),
          borderRadius: 5,
          maxBarThickness: 24,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, theme]);

  const options = useMemo<ChartOptions<"bar">>(() => {
    const tick = cssVar("--chart-tick");
    const o = baseOptions() as ChartOptions<"bar">;
    o.indexAxis = "y";
    o.scales!.x!.grid = { color: cssVar("--chart-grid") };
    o.scales!.x!.ticks = { color: tick, callback: (v) => fmt.signedPct(Number(v)) };
    o.scales!.y!.grid = { display: false };
    o.scales!.y!.ticks = {
      color: tick,
      callback(value) {
        return this.getLabelForValue(Number(value));
      },
    };
    o.plugins!.tooltip!.callbacks = {
      label: (c) => {
        const abs = data.meta.absolutos[String(c.label)];
        const head = ` Variação: ${fmt.signedPct(Number(c.parsed.x))}`;
        return abs ? [head, `   ${fmt.brl(abs.anterior)} → ${fmt.brl(abs.atual)}`] : head;
      },
    };
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, theme]);

  return (
    <ChartBox height={height}>
      <Bar key={theme} data={chartData} options={options} />
    </ChartBox>
  );
}

/** D1 / F2 — multi-linha (uma série por tag), com toggle por legenda. */
export function MultiLineChart({
  data,
  hidden = [],
  area = false,
  height,
}: {
  data: GraphData;
  hidden?: string[];
  area?: boolean;
  height: number;
}) {
  const { theme } = useTheme();
  const chartData = useMemo<ChartData<"line">>(
    () => ({
      labels: data.labels,
      datasets: data.datasets.map((s) => {
        const color = s.borderColor ?? (s.backgroundColor as string);
        return {
          label: s.label,
          data: s.data,
          borderColor: color,
          backgroundColor: area ? hexA(color, 0.12) : color,
          borderWidth: 2.5,
          tension: 0.35,
          fill: area,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          pointBackgroundColor: cssVar("--bg-surface"),
          pointBorderColor: color,
          pointBorderWidth: 2,
          hidden: hidden.includes(s.label ?? ""),
        };
      }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, hidden, area, theme],
  );

  const options = useMemo<ChartOptions<"line">>(() => {
    const o = baseOptions() as ChartOptions<"line">;
    o.plugins!.tooltip!.callbacks = {
      label: (c) => ` ${c.dataset.label}: ${fmt.brl(Number(c.parsed.y))}`,
    };
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <ChartBox height={height}>
      <Line key={theme} data={chartData} options={options} />
    </ChartBox>
  );
}

/** D2 — área empilhada (patrimônio acumulado). */
export function StackedAreaChart({
  data,
  hidden = [],
  height,
}: {
  data: GraphData;
  hidden?: string[];
  height: number;
}) {
  const { theme } = useTheme();
  const chartData = useMemo<ChartData<"line">>(
    () => ({
      labels: data.labels,
      datasets: data.datasets.map((s) => {
        const color = s.borderColor ?? (s.backgroundColor as string);
        return {
          label: s.label,
          data: s.data,
          borderColor: color,
          backgroundColor: hexA(color, 0.55),
          borderWidth: 1.5,
          tension: 0.3,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          hidden: hidden.includes(s.label ?? ""),
        };
      }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, hidden, theme],
  );

  const options = useMemo<ChartOptions<"line">>(() => {
    const o = baseOptions() as ChartOptions<"line">;
    o.scales!.y!.stacked = true;
    o.plugins!.tooltip!.callbacks = {
      label: (c) => ` ${c.dataset.label}: ${fmt.brl(Number(c.parsed.y))}`,
    };
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <ChartBox height={height}>
      <Line key={theme} data={chartData} options={options} />
    </ChartBox>
  );
}

/** F3 — tendência: barras (despesa real) + linha de tendência/projeção. */
export function TrendChart({ data, height }: { data: TendenciaData; height: number }) {
  const { theme } = useTheme();
  const real = data.datasets.find((d) => d.label === "Despesa real")?.data ?? [];
  const trend = data.datasets.find((d) => d.label === "Tendência")?.data ?? [];
  const nReal = real.filter((v) => v !== null).length;

  const chartData = useMemo<ChartData>(() => {
    const cDes = cssVar("--c-despesa");
    const cTrend = cssVar("--accent");
    // Tendência histórica (sólida) até o último mês real; projeção (tracejada) depois.
    const trendSolid = trend.map((v, i) => (i <= nReal - 1 ? v : null));
    const trendProj = trend.map((v, i) => (i >= nReal - 1 ? v : null));
    return {
      labels: data.labels,
      datasets: [
        {
          type: "bar" as const,
          label: "Despesa real",
          data: real,
          backgroundColor: hexA(cDes, 0.85),
          borderRadius: 5,
          maxBarThickness: 38,
          order: 3,
        },
        {
          type: "line" as const,
          label: "Tendência",
          data: trendSolid,
          borderColor: cTrend,
          borderWidth: 2.5,
          tension: 0,
          pointRadius: 0,
          spanGaps: false,
          order: 1,
        },
        {
          type: "line" as const,
          label: "Projeção",
          data: trendProj,
          borderColor: cTrend,
          borderDash: [6, 5],
          borderWidth: 2.5,
          tension: 0,
          pointRadius: 3,
          pointBackgroundColor: cssVar("--bg-surface"),
          pointBorderColor: cTrend,
          spanGaps: false,
          order: 2,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, theme]);

  const options = useMemo<ChartOptions>(() => {
    const o = baseOptions();
    o.plugins!.tooltip!.callbacks = {
      label: (c) =>
        c.parsed.y == null ? "" : ` ${c.dataset.label}: ${fmt.brl(Number(c.parsed.y))}`,
    };
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <ChartBox height={height}>
      <Chart key={theme} type="bar" data={chartData} options={options} />
    </ChartBox>
  );
}

/** G1 — barras agrupadas Orçado × Realizado (realizado vermelho se ≥ orçado). */
export function GroupedBarChart({ data, height }: { data: GraphData; height: number }) {
  const { theme } = useTheme();
  const orcado = data.datasets.find((d) => d.label === "Orçado")?.data ?? [];
  const realizado = data.datasets.find((d) => d.label === "Realizado")?.data ?? [];

  const chartData = useMemo<ChartData<"bar">>(() => {
    const cNeutro = cssVar("--c-neutro");
    const cBad = cssVar("--c-despesa");
    const cGood = cssVar("--c-receita");
    return {
      labels: data.labels,
      datasets: [
        {
          label: "Orçado",
          data: orcado.map((v) => v ?? 0),
          backgroundColor: hexA(cNeutro, 0.55),
          borderRadius: 5,
          maxBarThickness: 30,
        },
        {
          label: "Realizado",
          data: realizado.map((v) => v ?? 0),
          backgroundColor: realizado.map((v, i) =>
            (v ?? 0) >= (orcado[i] ?? 0) ? cBad : cGood,
          ),
          borderRadius: 5,
          maxBarThickness: 30,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, theme]);

  const options = useMemo<ChartOptions<"bar">>(() => {
    const o = baseOptions() as ChartOptions<"bar">;
    o.plugins!.tooltip!.callbacks = {
      label: (c) => ` ${c.dataset.label}: ${fmt.brl(Number(c.parsed.y))}`,
    };
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, theme]);

  return (
    <ChartBox height={height}>
      <Bar key={theme} data={chartData} options={options} />
    </ChartBox>
  );
}

/** D-/E3 — linha dupla: série sólida (atual) + tracejada (média histórica). */
export function DoubleLineChart({
  data,
  solidColor = "--c-despesa",
  dashedColor = "--c-neutro",
  height,
}: {
  data: GraphData;
  solidColor?: string;
  dashedColor?: string;
  height: number;
}) {
  const { theme } = useTheme();
  const chartData = useMemo<ChartData<"line">>(() => {
    const cSolid = cssVar(solidColor);
    const cDash = cssVar(dashedColor);
    const [a, b] = data.datasets;
    return {
      labels: data.labels,
      datasets: [
        {
          label: a?.label,
          data: a?.data ?? [],
          borderColor: cSolid,
          backgroundColor: hexA(cSolid, 0.1),
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: false,
        },
        {
          label: b?.label,
          data: b?.data ?? [],
          borderColor: cDash,
          borderDash: [6, 5],
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, solidColor, dashedColor, theme]);

  const options = useMemo<ChartOptions<"line">>(() => {
    const o = baseOptions() as ChartOptions<"line">;
    o.scales!.x!.ticks = {
      ...o.scales!.x!.ticks,
      callback(value, index) {
        const lbl = this.getLabelForValue(Number(value));
        return index % 2 === 0 ? lbl : "";
      },
    };
    o.plugins!.tooltip!.callbacks = {
      label: (c) =>
        c.parsed.y == null ? "" : ` ${c.dataset.label}: ${fmt.brl(Number(c.parsed.y))}`,
    };
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <ChartBox height={height}>
      <Line key={theme} data={chartData} options={options} />
    </ChartBox>
  );
}

/** Barra vertical simples (E2 dia da semana / E4 dia do mês), cor por caller. */
export function BarChartSimple({
  data,
  color,
  thin = false,
  height,
}: {
  data: GraphData;
  /** Token CSS (`--algo`) ou hex direto. */
  color: string;
  thin?: boolean;
  height: number;
}) {
  const { theme } = useTheme();
  const ds = data.datasets[0];
  const chartData = useMemo<ChartData<"bar">>(
    () => ({
      labels: data.labels,
      datasets: [
        {
          data: (ds?.data ?? []).map((v) => v ?? 0),
          backgroundColor: color.startsWith("--") ? cssVar(color) : color,
          borderRadius: thin ? 2 : 6,
          maxBarThickness: thin ? 10 : 40,
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, color, thin, theme],
  );

  const options = useMemo<ChartOptions<"bar">>(() => {
    const o = baseOptions() as ChartOptions<"bar">;
    o.plugins!.tooltip!.callbacks = { label: (c) => ` ${fmt.brl(Number(c.parsed.y))}` };
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <ChartBox height={height}>
      <Bar key={theme} data={chartData} options={options} />
    </ChartBox>
  );
}
