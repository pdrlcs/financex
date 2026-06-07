/** Aba "Investimentos" — grupo D (aporte + patrimônio acumulado). */
import { useState } from "react";

import { MultiLineChart, StackedAreaChart } from "@/components/charts/charts";
import { GraphCard } from "@/features/dashboard/board-card";
import {
  noLabels,
  rangeSub,
  seriesLegend,
  type TabProps,
} from "@/features/dashboard/tab-helpers";
import { graphParams, useGraph } from "@/hooks/useGraph";
import { fmt } from "@/lib/format";
import type { GraphData } from "@/types/graphs";

const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>, label: string) =>
  set((h) => (h.includes(label) ? h.filter((x) => x !== label) : [...h, label]));

export function Investimentos({ range, periodLabel }: TabProps) {
  const [hideD1, setHideD1] = useState<string[]>([]);
  const [hideD2, setHideD2] = useState<string[]>([]);

  const d1 = useGraph<GraphData>("investimentos/aporte", graphParams(range));
  const d2 = useGraph<GraphData>("investimentos/acumulado", graphParams(range));

  const patrimonio =
    d2.data?.datasets.reduce((a, s) => a + (s.data[s.data.length - 1] ?? 0), 0) ?? 0;

  return (
    <div className="charts-grid">
      <GraphCard
        title="Aporte por período"
        subtitle={(d1.data && `Líquido por tipo · ${rangeSub(d1.data, periodLabel)}`) || "Líquido por tipo"}
        span={12}
        height={340}
        query={d1}
        isEmpty={noLabels}
        legend={(d) =>
          seriesLegend(d, { line: true }).map((it) => ({
            ...it,
            off: hideD1.includes(it.label),
            onClick: () => toggle(setHideD1, it.label),
          }))
        }
      >
        {(d) => <MultiLineChart data={d} hidden={hideD1} height={340} />}
      </GraphCard>

      <GraphCard
        title="Patrimônio acumulado por tipo"
        subtitle={`Investido líquido · ${fmt.brl(patrimonio)}`}
        span={12}
        height={360}
        query={d2}
        isEmpty={noLabels}
        legend={(d) =>
          seriesLegend(d).map((it) => ({
            ...it,
            off: hideD2.includes(it.label),
            onClick: () => toggle(setHideD2, it.label),
          }))
        }
      >
        {(d) => <StackedAreaChart data={d} hidden={hideD2} height={360} />}
      </GraphCard>
    </div>
  );
}
