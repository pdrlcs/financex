/** Helpers compartilhados pelas abas do Dashboard. */
import type { LegendItem } from "@/features/dashboard/board-card";
import type { PeriodRange } from "@/hooks/usePeriod";
import type { GraphData } from "@/types/graphs";

export interface TabProps {
  range: PeriodRange;
  periodLabel: string;
}

/** Sem nenhuma categoria/período (gráficos temporais e de barra). */
export const noLabels = (d: GraphData) => d.labels.length === 0;

/** Sem dados na única série (doughnut: por-tag, por-conta, por-metodo). */
export const noPie = (d: GraphData) => !(d.datasets[0]?.data?.length ?? 0);

/** Legenda a partir das cores de cada série (datasets multi-série). */
export function seriesLegend(d: GraphData, opts?: { line?: boolean }): LegendItem[] {
  return d.datasets.map((s) => ({
    label: s.label ?? "",
    color: s.borderColor ?? (s.backgroundColor as string) ?? "var(--c-neutro)",
    line: opts?.line,
  }));
}

/** Legenda de doughnut: uma marca por fatia. */
export function pieLegend(d: GraphData): LegendItem[] {
  const colors = (d.datasets[0]?.backgroundColor as string[]) ?? [];
  return d.labels.map((label, i) => ({ label, color: colors[i] ?? "var(--c-neutro)" }));
}

/** Subtítulo de range temporal: "Jan/26–Jun/26" a partir dos labels. */
export function rangeSub(d: GraphData, fallback: string): string {
  if (d.labels.length > 1) return `${d.labels[0]}–${d.labels[d.labels.length - 1]}`;
  return fallback;
}

/** year/month de referência para os gráficos de orçamento (mês final do range). */
export function refYearMonth(range: PeriodRange): { year: number; month: number } {
  const ref = new Date(`${range.date_to}T00:00:00`);
  return { year: ref.getFullYear(), month: ref.getMonth() + 1 };
}
