/** Aba "Visão geral" — grupos A (KPIs) · C (fluxo) + B1 categorias. */
import { useState } from "react";

import { DoughnutChart, LineBarChart } from "@/components/charts/charts";
import { GraphCard } from "@/features/dashboard/board-card";
import { Kpis } from "@/features/dashboard/kpis";
import { noLabels, noPie, pieLegend, type TabProps } from "@/features/dashboard/tab-helpers";
import { graphParams, useGraph } from "@/hooks/useGraph";
import type { GraphData } from "@/types/graphs";

export function VisaoGeral({ range, periodLabel }: TabProps) {
  const [excludeB1, setExcludeB1] = useState<number[]>([]);

  const c1 = useGraph<GraphData>("por-mes", graphParams(range));
  const b1 = useGraph<GraphData>("por-tag", { ...graphParams(range, excludeB1), type: "despesa" });
  const c2 = useGraph<GraphData>("por-conta", graphParams(range));

  return (
    <div className="flex flex-col gap-[var(--gutter)]">
      <Kpis range={range} />

      <div className="charts-grid">
        <GraphCard
          title="Receitas × Despesas"
          subtitle={`Fluxo mensal · ${periodLabel}`}
          span={12}
          height={330}
          query={c1}
          isEmpty={noLabels}
          legend={() => [
            { color: "var(--c-receita)", label: "Receitas" },
            { color: "var(--c-despesa)", label: "Despesas" },
            { color: "var(--c-saldo)", label: "Saldo", line: true },
          ]}
        >
          {(d) => <LineBarChart data={d} height={330} />}
        </GraphCard>

        <GraphCard
          title="Gastos por categoria"
          subtitle={`Despesas · ${periodLabel}`}
          span={6}
          height={300}
          query={b1}
          isEmpty={noPie}
          legend={pieLegend}
          exclude={{ value: excludeB1, onChange: setExcludeB1 }}
        >
          {(d) => <DoughnutChart data={d} centerLabel="Despesas" height={300} />}
        </GraphCard>

        <GraphCard
          title="Volume por conta"
          subtitle={`Movimentação bruta · ${periodLabel}`}
          span={6}
          height={300}
          query={c2}
          isEmpty={noPie}
          legend={pieLegend}
        >
          {(d) => <DoughnutChart data={d} centerLabel="Volume" height={300} />}
        </GraphCard>
      </div>
    </div>
  );
}
