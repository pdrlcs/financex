/**
 * Visualizações custom (não-Chart.js) consumindo `/graphs`: G2 ProgressBars,
 * G3 AlertList, F1 RunRateStats (GRAFICOS.md §4.6). HTML/CSS theme-aware.
 */
import { Check, Scale, TrendingUp } from "lucide-react";

import { fmt } from "@/lib/format";
import type {
  AlertaItem,
  OrcamentoStatus,
  ProgressoItem,
  RunRateData,
} from "@/types/graphs";

const STATUS_INFO: Record<OrcamentoStatus, { color: string; label: string }> = {
  ok: { color: "var(--c-receita)", label: "No ritmo" },
  atencao: { color: "#F59E0B", label: "Atenção" },
  estourado: { color: "var(--c-despesa)", label: "Estourado" },
};

/** G2 — barras de progresso por categoria (gauge nativo). */
export function ProgressBars({ itens }: { itens: ProgressoItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      {itens.map((it) => {
        const si = STATUS_INFO[it.status];
        const frac = Math.min(it.percentual / 100, 1);
        const over = it.percentual > 100;
        return (
          <div key={it.tag}>
            <div className="mb-[7px] flex items-center justify-between gap-2.5">
              <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold">
                <span
                  className="h-[9px] w-[9px] rounded-full"
                  style={{ background: si.color }}
                />
                {it.tag}
              </span>
              <span className="num text-[13px] text-muted-foreground">
                <strong className="text-foreground">{fmt.brl(it.realizado)}</strong> /{" "}
                {fmt.brl(it.limit_value)}
              </span>
            </div>
            <div className="relative h-[9px] overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                style={{ width: `${frac * 100}%`, background: si.color }}
              />
            </div>
            <div className="mt-1.5 flex justify-between gap-2.5 text-[11.5px]">
              <span className="font-semibold" style={{ color: si.color }}>
                {si.label}
              </span>
              <span
                className="num whitespace-nowrap"
                style={{
                  color: over ? "var(--c-despesa)" : "var(--text-muted)",
                  fontWeight: over ? 700 : 500,
                }}
              >
                {fmt.pct(it.percentual, 0)}
                {over ? " · acima do limite" : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** G3 — lista de alertas de estouro projetado (badges). */
export function AlertList({ alertas }: { alertas: AlertaItem[] }) {
  if (!alertas.length) {
    return (
      <div className="flex items-center gap-3 px-1 py-4 text-muted-foreground">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
          style={{ background: "var(--c-receita-soft)", color: "var(--c-receita)" }}
        >
          <Check size={18} strokeWidth={2.4} />
        </span>
        <div>
          <div className="text-sm font-semibold text-foreground">Tudo sob controle</div>
          <div className="text-[13px]">
            Nenhuma categoria projeta estourar o orçamento neste mês.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {alertas.map((a) => (
        <div
          key={a.tag}
          className="flex items-center gap-3.5 rounded-md px-[15px] py-[13px]"
          style={{
            background: "var(--c-despesa-soft)",
            border: "1px solid var(--c-despesa-soft)",
          }}
        >
          <span
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] text-white"
            style={{ background: "var(--c-despesa)" }}
          >
            <TrendingUp size={18} strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{a.tag} pode estourar o orçamento</div>
            <div className="text-[12.5px] text-muted-foreground">
              Projeção{" "}
              <span className="num font-semibold" style={{ color: "var(--c-despesa)" }}>
                {fmt.brl(a.projecao_fim_mes)}
              </span>{" "}
              vs. orçado <span className="num">{fmt.brl(a.limit_value)}</span> · gasto até agora{" "}
              <span className="num">{fmt.brl(a.realizado)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** F1 — stats do run-rate (projeção + gasto + progresso do mês). */
export function RunRateStats({ data }: { data: RunRateData }) {
  const overPace = data.projecao_fim_mes > 0; // sem média histórica no contrato atual
  const frac = data.dias_no_mes > 0 ? data.dia_atual / data.dias_no_mes : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-[5px] text-[12.5px] font-semibold text-muted-foreground">
          Projeção de fim de mês
        </div>
        <div
          className="num text-[28px] font-bold leading-[1.05] tracking-[-0.02em]"
          style={{ color: overPace ? "var(--c-despesa)" : "var(--text)" }}
        >
          {fmt.brl(data.projecao_fim_mes)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          com base em <span className="num">{data.dia_atual}</span>/{data.dias_no_mes} dias
        </div>
      </div>

      <div>
        <div className="mb-[5px] text-[12.5px] font-semibold text-muted-foreground">
          Gasto até hoje
        </div>
        <div className="num text-xl font-bold leading-[1.05] tracking-[-0.02em]">
          {fmt.brl(data.gasto_ate_agora)}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Progresso do mês</span>
          <span className="num">{fmt.pct(frac * 100, 0)}</span>
        </div>
        <div className="relative h-[9px] overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
            style={{ width: `${frac * 100}%`, background: "var(--accent)" }}
          />
        </div>
      </div>

      <div
        className="inline-flex items-center gap-2 self-start rounded-full px-3 py-2 text-[13px] font-semibold"
        style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}
      >
        <Scale size={16} strokeWidth={2.2} />
        Ritmo diário projetado para {data.dias_no_mes} dias
      </div>
    </div>
  );
}
