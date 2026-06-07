/** Aba "Padrões" — grupo E (quando eu gasto mais). */
import { useState } from "react";

import {
  BarChartSimple,
  DoubleLineChart,
  DoughnutChart,
} from "@/components/charts/charts";
import { Heatmap } from "@/components/charts/heatmap";
import { GraphCard } from "@/features/dashboard/board-card";
import { Segmented } from "@/features/dashboard/segmented";
import { noPie, type TabProps } from "@/features/dashboard/tab-helpers";
import { graphParams, useGraph } from "@/hooks/useGraph";
import type { GraphData, HeatmapData } from "@/types/graphs";

type Agg = "media" | "total";

export function Padroes({ range, periodLabel }: TabProps) {
  const [agg, setAgg] = useState<Agg>("media");

  const e1 = useGraph<HeatmapData>("heatmap", graphParams(range));
  const e2 = useGraph<GraphData>("por-dia-semana", { ...graphParams(range), agregacao: agg });
  const e3 = useGraph<GraphData>("burndown", {});
  const e4 = useGraph<GraphData>("por-dia-mes", graphParams(range));
  const e5 = useGraph<GraphData>("por-metodo", graphParams(range));

  return (
    <div className="charts-grid">
      <GraphCard
        title="Curva de queima (burndown)"
        subtitle="Mês atual · acumulado vs. ritmo histórico"
        span={8}
        height={330}
        query={e3}
        legend={() => [
          { color: "var(--c-despesa)", label: "Mês atual", line: true },
          { color: "var(--c-neutro)", label: "Média histórica", line: true },
        ]}
      >
        {(d) => <DoubleLineChart data={d} height={330} />}
      </GraphCard>

      <GraphCard
        title="Por método de pagamento"
        subtitle={`Despesas · ${periodLabel}`}
        span={4}
        height={300}
        query={e5}
        isEmpty={noPie}
        legend={(d) =>
          d.labels.map((label, i) => ({
            label,
            color: (d.datasets[0]?.backgroundColor as string[])?.[i] ?? "var(--c-neutro)",
          }))
        }
      >
        {(d) => <DoughnutChart data={d} centerLabel="Despesas" height={300} />}
      </GraphCard>

      <GraphCard
        title="Gasto por dia da semana"
        subtitle="Revela o padrão de fim de semana"
        span={5}
        height={258}
        query={e2}
        headerAction={
          <Segmented
            value={agg}
            onChange={setAgg}
            options={[
              { id: "media", label: "Média" },
              { id: "total", label: "Total" },
            ]}
          />
        }
      >
        {(d) => <BarChartSimple data={d} color="--c-despesa" height={258} />}
      </GraphCard>

      <GraphCard
        title="Gasto por dia do mês"
        subtitle="Média por dia (1–31) — gasto tudo após o salário?"
        span={7}
        height={258}
        query={e4}
      >
        {(d) => <BarChartSimple data={d} color="#F59E0B" thin height={258} />}
      </GraphCard>

      <GraphCard
        title="Mapa de calor"
        subtitle={`Intensidade de gasto · ${periodLabel}`}
        span={12}
        height={260}
        query={e1}
      >
        {(d) => <Heatmap data={d} dateFrom={range.date_from} dateTo={range.date_to} />}
      </GraphCard>
    </div>
  );
}
