/** Aba "Categorias" — grupo B (pra onde meu dinheiro vai). */
import { useState } from "react";

import {
  DivergingBarChart,
  DoughnutChart,
  HBarChart,
  StackedBarChart,
} from "@/components/charts/charts";
import { GraphCard } from "@/features/dashboard/board-card";
import {
  noLabels,
  noPie,
  pieLegend,
  rangeSub,
  seriesLegend,
  type TabProps,
} from "@/features/dashboard/tab-helpers";
import { graphParams, useGraph } from "@/hooks/useGraph";
import type { GraphData, VariacaoData } from "@/types/graphs";

export function Categorias({ range, periodLabel }: TabProps) {
  const [excludeB1, setExcludeB1] = useState<number[]>([]);

  const b1 = useGraph<GraphData>("por-tag", { ...graphParams(range, excludeB1), type: "despesa" });
  const b3 = useGraph<GraphData>("ranking-tags", { ...graphParams(range), type: "despesa" });
  const b2 = useGraph<GraphData>("por-tag-temporal", { ...graphParams(range), type: "despesa" });
  const b4 = useGraph<VariacaoData>("variacao-tags", { ...graphParams(range), type: "despesa" });

  return (
    <div className="charts-grid">
      <GraphCard
        title="Gastos por categoria"
        subtitle={`Despesas · ${periodLabel}`}
        span={5}
        height={300}
        query={b1}
        isEmpty={noPie}
        legend={pieLegend}
        exclude={{ value: excludeB1, onChange: setExcludeB1 }}
      >
        {(d) => <DoughnutChart data={d} centerLabel="Despesas" height={300} />}
      </GraphCard>

      <GraphCard
        title="Ranking de categorias"
        subtitle={`Onde mais gastei · ${periodLabel}`}
        span={7}
        height={300}
        query={b3}
        isEmpty={noLabels}
      >
        {(d) => <HBarChart data={d} height={300} />}
      </GraphCard>

      <GraphCard
        title="Categorias ao longo dos meses"
        subtitle={(b2.data && `Empilhado por categoria · ${rangeSub(b2.data, periodLabel)}`) || "Empilhado por categoria"}
        span={12}
        height={340}
        query={b2}
        isEmpty={noLabels}
        legend={(d) => seriesLegend(d)}
      >
        {(d) => <StackedBarChart data={d} height={340} />}
      </GraphCard>

      <GraphCard
        title="Variação vs. período anterior"
        subtitle="Despesa subiu (vermelho) ou caiu (verde) vs. período de mesmo tamanho"
        span={12}
        height={Math.max(220, (b4.data?.labels.length ?? 3) * 34 + 40)}
        query={b4}
        isEmpty={noLabels}
      >
        {(d) => (
          <DivergingBarChart data={d} height={Math.max(180, d.labels.length * 34)} />
        )}
      </GraphCard>
    </div>
  );
}
