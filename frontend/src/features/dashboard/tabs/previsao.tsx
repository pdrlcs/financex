/** Aba "Previsão" — grupo F (como me comportar). */
import { CalendarRange } from "lucide-react";
import { useState } from "react";

import { MultiLineChart, TrendChart } from "@/components/charts/charts";
import { RunRateStats } from "@/components/charts/custom-viz";
import { GraphCard } from "@/features/dashboard/board-card";
import {
  noLabels,
  seriesLegend,
  type TabProps,
} from "@/features/dashboard/tab-helpers";
import { graphParams, useGraph } from "@/hooks/useGraph";
import { fmt } from "@/lib/format";
import type { GraphData, RunRateData, TendenciaData } from "@/types/graphs";

const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>, label: string) =>
  set((h) => (h.includes(label) ? h.filter((x) => x !== label) : [...h, label]));

export function Previsao({ range }: TabProps) {
  const [hideF2, setHideF2] = useState<string[]>([]);

  const f1 = useGraph<RunRateData>("previsao/run-rate", {});
  const f3 = useGraph<TendenciaData>("previsao/tendencia", graphParams(range));
  const f2 = useGraph<GraphData>("previsao/media-movel", {
    ...graphParams(range),
    type: "despesa",
    window: 3,
  });

  const slope = f3.data?.projecao.inclinacao ?? 0;
  const trendSub = `Regressão linear · inclinação ${slope >= 0 ? "+" : "−"}${fmt.brl(
    Math.abs(slope),
  )}/mês ${slope >= 0 ? "(subindo)" : "(caindo)"}`;

  return (
    <div className="charts-grid">
      <GraphCard
        title="Projeção do mês (run-rate)"
        subtitle="Ritmo de gasto extrapolado até o fim do mês"
        span={4}
        height={260}
        query={f1}
      >
        {(d) => <RunRateStats data={d} />}
      </GraphCard>

      <GraphCard
        title="Tendência da despesa mensal"
        subtitle={trendSub}
        span={8}
        height={320}
        query={f3}
        isEmpty={noLabels}
        legend={() => [
          { color: "var(--c-despesa)", label: "Despesa real" },
          { color: "var(--accent)", label: "Tendência + projeção", line: true },
        ]}
      >
        {(d) => <TrendChart data={d} height={320} />}
      </GraphCard>

      <GraphCard
        title="Média móvel 3 meses por categoria"
        subtitle="Janela móvel de 3 períodos — suaviza o ruído mês a mês"
        span={12}
        height={340}
        query={f2}
        isEmpty={noLabels}
        legend={(d) =>
          seriesLegend(d, { line: true }).map((it) => ({
            ...it,
            off: hideF2.includes(it.label),
            onClick: () => toggle(setHideF2, it.label),
          }))
        }
      >
        {(d) => <MultiLineChart data={d} hidden={hideF2} height={340} />}
      </GraphCard>

      <section
        className="board-card animate-rise flex items-center gap-4"
        style={{ gridColumn: "span 12", background: "var(--bg-muted)", boxShadow: "none" }}
      >
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px]"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <CalendarRange size={20} />
        </span>
        <div>
          <div className="text-[14.5px] font-semibold">
            Sazonalidade (mesmo período do ano anterior)
          </div>
          <div className="text-[13px] text-muted-foreground">
            Desbloqueia com 12+ meses de histórico — fase futura (F4).
          </div>
        </div>
      </section>
    </div>
  );
}
