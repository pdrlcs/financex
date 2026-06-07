/** Aba "Orçamento" — grupo G (orçado × realizado, progresso, alertas). */
import { GroupedBarChart } from "@/components/charts/charts";
import { AlertList, ProgressBars } from "@/components/charts/custom-viz";
import { GraphCard } from "@/features/dashboard/board-card";
import { noLabels, refYearMonth, type TabProps } from "@/features/dashboard/tab-helpers";
import { useGraph } from "@/hooks/useGraph";
import { cn } from "@/lib/utils";
import type { AlertaData, GraphData, ProgressoData } from "@/types/graphs";

export function Orcamento({ range, periodLabel }: TabProps) {
  const { year, month } = refYearMonth(range);
  const params = { year, month };

  const g3 = useGraph<AlertaData>("orcamento/alerta-estouro", params);
  const g1 = useGraph<GraphData>("orcamento/realizado", params);
  const g2 = useGraph<ProgressoData>("orcamento/progresso", params);

  const riskCount = g3.data?.alertas.length ?? 0;
  const riskBadge = (
    <span
      className={cn(
        "whitespace-nowrap rounded-full px-[11px] py-[5px] text-[12.5px] font-semibold",
      )}
      style={{
        background: riskCount ? "var(--c-despesa-soft)" : "var(--c-receita-soft)",
        color: riskCount ? "var(--c-despesa)" : "var(--c-receita)",
      }}
    >
      {riskCount ? `${riskCount} em risco` : "0 em risco"}
    </span>
  );

  return (
    <div className="charts-grid">
      <GraphCard
        title="Alertas de estouro projetado"
        subtitle={`${periodLabel} · run-rate × orçamento`}
        span={12}
        height={120}
        query={g3}
        headerAction={riskBadge}
      >
        {(d) => <AlertList alertas={d.alertas} />}
      </GraphCard>

      <GraphCard
        title="Orçado × Realizado"
        subtitle={`Limite vs. gasto real · ${periodLabel}`}
        span={7}
        height={330}
        query={g1}
        isEmpty={noLabels}
        legend={() => [
          { color: "var(--c-neutro)", label: "Orçado" },
          { color: "var(--c-despesa)", label: "Realizado ≥ orçado" },
          { color: "var(--c-receita)", label: "Realizado < orçado" },
        ]}
      >
        {(d) => <GroupedBarChart data={d} height={330} />}
      </GraphCard>

      <GraphCard
        title="Progresso do orçamento"
        subtitle={`Quanto do limite já usei · ${periodLabel}`}
        span={5}
        height={300}
        query={g2}
        isEmpty={(d) => d.itens.length === 0}
      >
        {(d) => <ProgressBars itens={d.itens} />}
      </GraphCard>
    </div>
  );
}
