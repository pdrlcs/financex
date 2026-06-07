/* ============================================================
   Financex — Aba "Visão geral" (grupos A · C)
   KPIs A1 + C1 (Receitas×Despesas+saldo) + B1 (doughnut) + C2 (contas).
   Exposto em window: VisaoGeral
   ============================================================ */
const { useState: useStateVisao } = React;

function VisaoGeral({ period, themeKey }) {
  const F = window.FX;
  const per = F.periodos.find((p) => p.id === period) || F.periodos[0];
  const range = per.range;
  const [excludeB1, setExcludeB1] = useStateVisao([]);

  const kpis = buildKpis(range);
  const c1 = F.c1_porMes(range);
  const b1 = F.b1_porTag(range, excludeB1);
  const c2 = F.c2_porConta(range);

  const c1Sub = c1.labels.length > 1
    ? `${c1.labels[0]}–${c1.labels[c1.labels.length - 1]} 2026`
    : per.sub;

  const b1Menu = [{
    icon: "filter",
    label: excludeB1.length ? `Excluir tags (${excludeB1.length})` : "Excluir tags",
    onClick: () => window.fxExcludeTags && window.fxExcludeTags(excludeB1, setExcludeB1),
  }];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
      {/* KPIs */}
      <div className="kpi-grid">
        {kpis.map((k, i) => <KpiCard key={k.key} kpi={k} i={i} />)}
      </div>

      {/* C1 — Receitas × Despesas + saldo */}
      <div className="charts-grid">
        <ChartCard
          title="Receitas × Despesas"
          subtitle={`Fluxo mensal · ${c1Sub}`}
          span="span 12"
          height={330}
          legend={[
            { color: "var(--c-receita)", label: "Receitas" },
            { color: "var(--c-despesa)", label: "Despesas" },
            { color: "var(--c-saldo)", label: "Saldo", line: true },
          ]}>
          <LineBarChart data={c1} themeKey={themeKey} height={330} />
        </ChartCard>

        {/* B1 — Gastos por categoria */}
        <ChartCard
          title="Gastos por categoria"
          subtitle={`Despesas · ${per.label}`}
          span="span 6"
          menu={b1Menu}
          height={300}
          legend={b1.labels.map((l, i) => ({ color: b1.colors[i], label: l }))}>
          {b1.data.length
            ? <DoughnutChart dataset={b1} centerLabel="Despesas" themeKey={themeKey} height={300} />
            : <EmptyState />}
        </ChartCard>

        {/* C2 — Volume por conta */}
        <ChartCard
          title="Volume por conta"
          subtitle={`Movimentação bruta · ${per.label}`}
          span="span 6"
          height={300}
          legend={c2.labels.map((l, i) => ({ color: c2.colors[i], label: l }))}>
          {c2.data.length
            ? <DoughnutChart dataset={c2} centerLabel="Volume" themeKey={themeKey} height={300} />
            : <EmptyState />}
        </ChartCard>
      </div>
    </div>
  );
}

Object.assign(window, { VisaoGeral });
