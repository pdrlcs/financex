/**
 * KPIs do Dashboard (A1 — `/graphs/resumo`). Cinco cards com os números-chave do
 * período + delta vs. o período imediatamente anterior (GRAFICOS.md A1). O resumo
 * anterior é buscado em paralelo para o cálculo do delta.
 */
import {
  PiggyBank,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { graphParams, previousRange, useGraph } from "@/hooks/useGraph";
import type { PeriodRange } from "@/hooks/usePeriod";
import { fmt } from "@/lib/format";
import type { ResumoData } from "@/types/graphs";

interface KpiDef {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  soft: string;
  display: string;
  /** Variação % vs. anterior (null = sem base). */
  delta: number | null;
  /** É bom subir? (despesa: false). */
  good: boolean;
}

function Delta({ pctChange, good }: { pctChange: number | null; good: boolean }) {
  if (pctChange === null || !isFinite(pctChange)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const up = pctChange >= 0;
  const positive = pctChange === 0 ? null : good ? up : !up;
  const color =
    positive === null
      ? "var(--text-muted)"
      : positive
        ? "var(--c-receita)"
        : "var(--c-despesa)";
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center gap-1 text-[12.5px] font-semibold"
      style={{ color }}
    >
      <Icon size={14} strokeWidth={2.2} />
      {fmt.pct(Math.abs(pctChange))}
    </span>
  );
}

function KpiCard({ kpi, i }: { kpi: KpiDef; i: number }) {
  return (
    <div
      className="board-card is-hoverable animate-rise min-w-0"
      style={{ animationDelay: `${i * 45}ms` }}
    >
      <div className="mb-3.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-[7px] text-[12.5px] font-semibold text-muted-foreground">
          <span
            className="grid h-7 w-7 place-items-center rounded-lg"
            style={{ background: kpi.soft, color: kpi.color }}
          >
            <kpi.icon size={16} strokeWidth={2} />
          </span>
          {kpi.label}
        </span>
      </div>
      <div className="num text-[26px] font-bold leading-[1.1] tracking-[-0.02em]">
        {kpi.display}
      </div>
      <div className="mt-2 flex items-center gap-[7px]">
        <Delta pctChange={kpi.delta} good={kpi.good} />
        <span className="text-xs text-muted-foreground">vs. período anterior</span>
      </div>
    </div>
  );
}

function KpiSkeleton({ i }: { i: number }) {
  return (
    <div className="board-card animate-rise" style={{ animationDelay: `${i * 45}ms` }}>
      <div className="mb-3.5 h-7 w-24 animate-pulse rounded-lg bg-muted" />
      <div className="h-7 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function Kpis({ range }: { range: PeriodRange }) {
  const prev = previousRange(range);
  const cur = useGraph<ResumoData>("resumo", graphParams(range));
  const prevQ = useGraph<ResumoData>("resumo", graphParams(prev));

  if (cur.isPending) {
    return (
      <div className="kpi-grid">
        {Array.from({ length: 5 }, (_, i) => (
          <KpiSkeleton key={i} i={i} />
        ))}
      </div>
    );
  }

  if (cur.isError || !cur.data) {
    return (
      <div className="board-card text-sm text-muted-foreground">
        Não foi possível carregar o resumo do período.
      </div>
    );
  }

  const c = cur.data;
  const p = prevQ.data;
  const change = (a: number, b: number | undefined) =>
    p && b !== undefined && b !== 0 ? ((a - b) / Math.abs(b)) * 100 : null;
  // Taxa de poupança: delta em pontos percentuais (já é fração 0–1).
  const ppChange = (a: number | null, b: number | null | undefined) =>
    p && a !== null && b !== null && b !== undefined ? (a - b) * 100 : null;

  const kpis: KpiDef[] = [
    {
      key: "rec",
      label: "Receitas",
      icon: TrendingUp,
      color: "var(--c-receita)",
      soft: "var(--c-receita-soft)",
      display: fmt.brl(c.receitas),
      delta: change(c.receitas, p?.receitas),
      good: true,
    },
    {
      key: "des",
      label: "Despesas",
      icon: Wallet,
      color: "var(--c-despesa)",
      soft: "var(--c-despesa-soft)",
      display: fmt.brl(c.despesas),
      delta: change(c.despesas, p?.despesas),
      good: false,
    },
    {
      key: "sal",
      label: "Saldo",
      icon: Scale,
      color: "var(--c-saldo)",
      soft: "var(--c-saldo-soft)",
      display: fmt.brl(c.saldo),
      delta: change(c.saldo, p?.saldo),
      good: true,
    },
    {
      key: "inv",
      label: "Investido líquido",
      icon: PiggyBank,
      color: "var(--c-investimento)",
      soft: "var(--c-investimento-soft)",
      display: fmt.brl(c.investido_liquido),
      delta: change(c.investido_liquido, p?.investido_liquido),
      good: true,
    },
    {
      key: "tx",
      label: "Taxa de poupança",
      icon: TrendingUp,
      color: "var(--accent)",
      soft: "var(--accent-soft)",
      display: c.taxa_poupanca === null ? "—" : fmt.pct(c.taxa_poupanca * 100),
      delta: ppChange(c.taxa_poupanca, p?.taxa_poupanca),
      good: true,
    },
  ];

  return (
    <div className="kpi-grid">
      {kpis.map((k, i) => (
        <KpiCard key={k.key} kpi={k} i={i} />
      ))}
    </div>
  );
}
