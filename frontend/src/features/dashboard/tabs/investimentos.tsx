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
import { useBtcQuote } from "@/hooks/useMercado";
import { useBtcResumo } from "@/hooks/useInvestimentos";
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

  const btc = useBtcQuote();
  const btcResumo = useBtcResumo();
  const lucro = btcResumo.data?.lucro_prejuizo ?? null;
  const lucroPositivo = (lucro ?? 0) >= 0;

  return (
    <div className="charts-grid">
      {/* Cotação BTC */}
      <div className="board-card" data-span="6" style={{ gridColumn: "span 6" }}>
        <div className="text-sm font-semibold text-muted-foreground">Bitcoin · BTC/BRL</div>
        {btc.data?.available ? (
          <>
            <div className="num mt-1 text-3xl font-bold tracking-tight">
              {fmt.brl(btc.data.price ?? 0)}
            </div>
            <div
              className="num mt-1 text-sm font-semibold"
              style={{
                color:
                  (btc.data.change_pct ?? 0) >= 0
                    ? "var(--c-receita)"
                    : "var(--c-despesa)",
              }}
            >
              {fmt.signedPct(btc.data.change_pct ?? 0)} hoje
            </div>
            {btc.data.updated_at && (
              <div className="mt-1 text-xs text-muted-foreground">
                Atualizado {btc.data.updated_at}
              </div>
            )}
          </>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">Cotação indisponível.</div>
        )}
      </div>

      {/* Patrimônio BTC */}
      <div className="board-card" data-span="6" style={{ gridColumn: "span 6" }}>
        <div className="text-sm font-semibold text-muted-foreground">Meu Bitcoin</div>
        <div className="num mt-1 text-3xl font-bold tracking-tight">
          {fmt.btc(btcResumo.data?.quantidade_btc ?? 0)}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
          <span className="text-muted-foreground">Custo médio</span>
          <span className="num text-right">
            {btcResumo.data?.custo_medio != null ? fmt.brl(btcResumo.data.custo_medio) : "—"}
          </span>
          <span className="text-muted-foreground">Valor atual</span>
          <span className="num text-right">
            {btcResumo.data?.valor_atual != null ? fmt.brl(btcResumo.data.valor_atual) : "—"}
          </span>
          <span className="text-muted-foreground">Lucro/Prejuízo</span>
          <span
            className="num text-right font-semibold"
            style={{ color: lucroPositivo ? "var(--c-receita)" : "var(--c-despesa)" }}
          >
            {lucro != null ? fmt.signed(lucro) : "—"}
            {btcResumo.data?.lucro_pct != null && ` (${fmt.signedPct(btcResumo.data.lucro_pct)})`}
          </span>
        </div>
      </div>

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
