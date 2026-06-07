/* ============================================================
   Financex — KPIs do Dashboard (grupo A1)
   KpiCard + Delta (comparação com período anterior) + buildKpis.
   Exposto em window: KpiCard, buildKpis
   ============================================================ */

function Delta({ pctChange, good }) {
  if (pctChange === null || !isFinite(pctChange)) {
    return <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>;
  }
  const up = pctChange >= 0;
  const positive = good === undefined ? up : (good ? up : !up); // "good" = é bom subir?
  const color = pctChange === 0 ? "var(--text-muted)" : (positive ? "var(--c-receita)" : "var(--c-despesa)");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600, color }}>
      <Icon name={up ? "trendUp" : "trendDown"} size={14} stroke={2.2} />
      {window.FX.fmt.pct(Math.abs(pctChange))}
    </span>
  );
}

function KpiCard({ kpi, i }) {
  return (
    <div className="board-card is-hoverable rise" style={{ animationDelay: (i * 45) + "ms", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600,
          color: "var(--text-muted)", textTransform: "none",
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8, background: kpi.soft, color: kpi.color,
            display: "grid", placeItems: "center",
          }}>
            <Icon name={kpi.icon} size={16} stroke={2} />
          </span>
          {kpi.label}
        </span>
      </div>
      <div className="num" style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {kpi.display}
      </div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 7 }}>
        <Delta pctChange={kpi.delta} good={kpi.good} />
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>vs. período anterior</span>
      </div>
    </div>
  );
}

function buildKpis(range) {
  const F = window.FX;
  const cur = F.resumoPeriodo(range);
  const prev = F.resumoAnterior(range);
  const change = (a, b) => (prev && b !== 0 ? ((a - b) / Math.abs(b)) * 100 : null);
  const ppChange = (a, b) => (prev ? (a - b) * 100 : null); // pontos percentuais
  return [
    { key: "rec", label: "Receitas", icon: "trendUp", color: "var(--c-receita)", soft: "var(--c-receita-soft)",
      display: F.fmt.brl(cur.receitas), delta: change(cur.receitas, prev && prev.receitas), good: true },
    { key: "des", label: "Despesas", icon: "wallet", color: "var(--c-despesa)", soft: "var(--c-despesa-soft)",
      display: F.fmt.brl(cur.despesas), delta: change(cur.despesas, prev && prev.despesas), good: false },
    { key: "sal", label: "Saldo", icon: "scale", color: "var(--c-saldo)", soft: "var(--c-saldo-soft)",
      display: F.fmt.brl(cur.saldo), delta: change(cur.saldo, prev && prev.saldo), good: true },
    { key: "inv", label: "Investido líquido", icon: "piggy", color: "var(--c-investimento)", soft: "var(--c-investimento-soft)",
      display: F.fmt.brl(cur.investido_liquido), delta: change(cur.investido_liquido, prev && prev.investido_liquido), good: true },
    { key: "tx", label: "Taxa de poupança", icon: "trendUp", color: "var(--accent)", soft: "var(--accent-soft)",
      display: cur.taxa_poupanca === null ? "—" : F.fmt.pct(cur.taxa_poupanca * 100),
      delta: prev && prev.taxa_poupanca !== null ? ppChange(cur.taxa_poupanca, prev.taxa_poupanca) : null, good: true },
  ];
}

Object.assign(window, { KpiCard, buildKpis });
