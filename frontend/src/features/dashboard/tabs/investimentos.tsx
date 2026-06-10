/** Aba "Investimentos" — grupo D (aporte + patrimônio acumulado). */
import { Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MultiLineChart, StackedAreaChart } from "@/components/charts/charts";
import { CdiConfigDialog } from "@/features/dashboard/cdi-config-dialog";
import { GraphCard } from "@/features/dashboard/board-card";
import {
  noLabels,
  rangeSub,
  seriesLegend,
  type TabProps,
} from "@/features/dashboard/tab-helpers";
import { graphParams, useGraph } from "@/hooks/useGraph";
import { useContaMutations, useContas } from "@/hooks/useContas";
import { useBtcQuote, useCdiRate } from "@/hooks/useMercado";
import { useBtcResumo, useCdiResumo } from "@/hooks/useInvestimentos";
import { fmt } from "@/lib/format";
import type { ContaOut, ContaUpdate } from "@/types/api";
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

  const cdi = useCdiRate();
  const cdiResumo = useCdiResumo();
  const { data: contas } = useContas();
  const contaMut = useContaMutations();
  const [cfgConta, setCfgConta] = useState<ContaOut | null>(null);

  const contasInvest = (contas ?? []).filter((c) => c.type === "investimento");

  const handleCdiSubmit = async (id: number, payload: ContaUpdate) => {
    try {
      await contaMut.update.mutateAsync({ id, payload });
      toast.success("Indexador atualizado.");
      setCfgConta(null);
    } catch {
      toast.error("Não foi possível salvar o indexador.");
    }
  };

  const resumoByConta = new Map(
    (cdiResumo.data?.contas ?? []).map((r) => [r.conta_id, r]),
  );

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

      {/* Taxa CDI */}
      <div className="board-card" data-span="6" style={{ gridColumn: "span 6" }}>
        <div className="text-sm font-semibold text-muted-foreground">CDI</div>
        {cdi.data?.available ? (
          <>
            <div className="num mt-1 text-3xl font-bold tracking-tight">
              {fmt.pct(cdi.data.annual_rate ?? 0, 2)} a.a.
            </div>
            {cdi.data.date && (
              <div className="mt-1 text-xs text-muted-foreground">Em {cdi.data.date}</div>
            )}
          </>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">Taxa indisponível.</div>
        )}
      </div>

      {/* Patrimônio CDI por conta */}
      <div className="board-card" data-span="6" style={{ gridColumn: "span 6" }}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-muted-foreground">Rende CDI</div>
        </div>
        <div className="space-y-2">
          {contasInvest.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta de investimento. Crie uma em Contas.
            </p>
          )}
          {contasInvest.map((c) => {
            const r = resumoByConta.get(c.id);
            const indexada = c.indexador === "cdi";
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <div className="font-medium">{c.name}</div>
                  {indexada ? (
                    <div className="num text-xs text-muted-foreground">
                      {Number(c.indexador_percent)}% do CDI
                      {r?.valor_atual != null && ` · ${fmt.brl(r.valor_atual)}`}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Sem indexador</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {indexada && r?.rendimento != null && (
                    <span className="num text-sm font-semibold text-receita">
                      {fmt.signed(r.rendimento)}
                    </span>
                  )}
                  <button
                    type="button"
                    title="Configurar indexador"
                    aria-label="Configurar indexador"
                    onClick={() => setCfgConta(c)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Settings2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
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

      <CdiConfigDialog
        open={cfgConta !== null}
        onOpenChange={(o) => !o && setCfgConta(null)}
        conta={cfgConta}
        submitting={contaMut.update.isPending}
        onSubmit={handleCdiSubmit}
      />
    </div>
  );
}
