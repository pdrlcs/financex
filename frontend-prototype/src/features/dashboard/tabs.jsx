/* ============================================================
   Financex — Conteúdo das abas B · D · E · F · G
   Cada aba resolve o range a partir do período global.
   Exposto: CategoriasTab, InvestimentosTab, PadroesTab, PrevisaoTab, OrcamentoTab
   ============================================================ */
const { useState: useStateTab } = React;

function rangeOf(period) {
  const p = window.FX.periodos.find((x) => x.id === period) || window.FX.periodos[0];
  return { range: p.range, per: p };
}
const grid = (children, gutter) => (
  <div className="charts-grid">{children}</div>
);

/* segmented control pequeno (reuso em E2 / D toggle) */
function MiniSeg({ value, options, onChange }) {
  return (
    <div style={{ display: "inline-flex", gap: 3, padding: 3, background: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
            padding: "5px 11px", borderRadius: "var(--radius-sm)",
            background: on ? "var(--bg-surface)" : "transparent",
            color: on ? "var(--accent)" : "var(--text-muted)",
            boxShadow: on ? "var(--shadow-sm)" : "none",
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

/* ============================ B — Categorias ============================ */
function CategoriasTab({ period, themeKey }) {
  const F = window.FX;
  const { range, per } = rangeOf(period);
  const [hideB1, setHideB1] = useStateTab([]);
  const Card = window.ChartCard;

  const b1 = F.b1_porTag(range, hideB1);
  const b3 = F.b3_ranking(range);
  const b2 = F.b2_temporal(range);
  const b4 = F.b4_variacao(range);
  const b2sub = b2.labels.length > 1 ? `${b2.labels[0]}–${b2.labels[b2.labels.length - 1]} 2026` : per.label;

  const excludeMenu = [{
    icon: "filter", label: hideB1.length ? `Excluir tags (${hideB1.length})` : "Excluir tags",
    onClick: () => window.fxExcludeTags(hideB1, setHideB1),
  }];

  return (
    <div className="charts-grid">
      <Card title="Gastos por categoria" subtitle={`Despesas · ${per.label}`} span="span 5" menu={excludeMenu}
        legend={b1.labels.map((l, i) => ({ color: b1.colors[i], label: l }))} height={300}>
        {b1.data.length ? <DoughnutChart dataset={b1} centerLabel="Despesas" themeKey={themeKey} height={300} /> : <window.EmptyState />}
      </Card>

      <Card title="Ranking de categorias" subtitle={`Onde mais gastei · ${per.label}`} span="span 7" height={300}>
        {b3.data.length ? <HBarChart dataset={b3} themeKey={themeKey} height={300} /> : <window.EmptyState />}
      </Card>

      <Card title="Categorias ao longo dos meses" subtitle={`Empilhado por categoria · ${b2sub}`} span="span 12" height={340}
        legend={b2.series.map((s) => ({ color: s.color, label: s.label }))}>
        <StackedBarChart data={b2} themeKey={themeKey} height={340} />
      </Card>

      <Card title="Variação vs. período anterior" span="span 12" height={Math.max(220, b4.data.length * 34 + 40)}
        subtitle={b4.hasPrev ? "Despesa subiu (vermelho) ou caiu (verde) vs. período de mesmo tamanho" : "Sem período anterior comparável"}>
        {b4.hasPrev && b4.data.length ? <DivergingBarChart dataset={b4} themeKey={themeKey} height={Math.max(180, b4.data.length * 34)} /> : <window.EmptyState />}
      </Card>
    </div>
  );
}

/* ============================ D — Investimentos ============================ */
function InvestimentosTab({ period, themeKey }) {
  const F = window.FX;
  const { range, per } = rangeOf(period);
  const Card = window.ChartCard;
  const [hideD1, setHideD1] = useStateTab([]);
  const [hideD2, setHideD2] = useStateTab([]);

  const d1 = F.d1_aporte(range);
  const d2 = F.d2_acumulado(range);
  const patrimonio = d2.series.reduce((a, s) => a + (s.data[s.data.length - 1] || 0), 0);
  const d1sub = d1.labels.length > 1 ? `${d1.labels[0]}–${d1.labels[d1.labels.length - 1]} 2026` : per.label;

  const toggle = (setter) => (label) => setter((h) => h.includes(label) ? h.filter((x) => x !== label) : [...h, label]);

  return (
    <div className="charts-grid">
      <Card title="Aporte por período" subtitle={`Líquido por tipo · ${d1sub}`} span="span 12" height={340}
        legend={d1.series.map((s) => ({ color: s.color, label: s.label, off: hideD1.includes(s.label), onClick: () => toggle(setHideD1)(s.label) }))}>
        <MultiLineChart data={d1} hidden={hideD1} themeKey={themeKey} height={340} />
      </Card>

      <Card title="Patrimônio acumulado por tipo" span="span 12" height={360}
        subtitle={<>Investido líquido até <strong>{d2.labels[d2.labels.length - 1]}/2026</strong> · {F.fmt.brl(patrimonio)}</>}
        legend={d2.series.map((s) => ({ color: s.color, label: s.label, off: hideD2.includes(s.label), onClick: () => toggle(setHideD2)(s.label) }))}>
        <StackedAreaChart data={d2} hidden={hideD2} themeKey={themeKey} height={360} />
      </Card>
    </div>
  );
}

/* ============================ E — Padrões de gasto ============================ */
function PadroesTab({ period, themeKey }) {
  const F = window.FX;
  const { range, per } = rangeOf(period);
  const Card = window.ChartCard;
  const [agg, setAgg] = useStateTab("media");

  const e1 = F.e1_heatmap(range);
  const e2 = F.e2_porDiaSemana(range, agg);
  const e3 = F.e3_burndown(range);
  const e4 = F.e4_porDiaMes(range);
  const e5 = F.e5_porMetodo(range);

  const e2Dataset = { labels: e2.labels, data: e2.data, colors: e2.data.map(() => window.cssVar("--c-despesa")) };
  const e4Dataset = { labels: e4.labels, data: e4.data, colors: e4.data.map(() => "#F59E0B") };

  return (
    <div className="charts-grid">
      <Card title="Curva de queima (burndown)" span="span 8" height={330}
        subtitle={<>{e3.label} · acumulado vs. ritmo histórico</>}
        legend={[{ color: "var(--c-despesa)", label: "Mês atual", line: true }, { color: "var(--c-neutro)", label: "Média histórica", line: true }]}>
        <RunRateChart data={{ labels: e3.labels, real: e3.atual, proj: e3.historica }} themeKey={themeKey} height={330} />
      </Card>

      <Card title="Por método de pagamento" subtitle={`Despesas · ${per.label}`} span="span 4" height={300}
        legend={e5.labels.map((l, i) => ({ color: e5.colors[i], label: l }))}>
        {e5.data.length ? <DoughnutChart dataset={e5} centerLabel="Despesas" themeKey={themeKey} height={300} /> : <window.EmptyState />}
      </Card>

      <Card title="Gasto por dia da semana" span="span 5" height={300}
        subtitle="Revela o padrão de fim de semana"
        menu={[]}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -8, marginBottom: 8 }}>
          <MiniSeg value={agg} onChange={setAgg} options={[{ id: "media", label: "Média" }, { id: "total", label: "Total" }]} />
        </div>
        <BarChartSimple dataset={e2Dataset} themeKey={themeKey} height={250} />
      </Card>

      <Card title="Gasto por dia do mês" span="span 7" height={300}
        subtitle="Média por dia (1–31) — gasto tudo após o salário?">
        <BarChartSimple dataset={e4Dataset} themeKey={themeKey} height={258} thin />
      </Card>

      <Card title="Mapa de calor" subtitle={`Intensidade de gasto · ${e1.label}`} span="span 12">
        <HeatmapCalendar data={e1} />
      </Card>
    </div>
  );
}

/* ============================ F — Previsão ============================ */
function PrevisaoTab({ period, themeKey }) {
  const F = window.FX;
  const { range, per } = rangeOf(period);
  const Card = window.ChartCard;
  const [hideF2, setHideF2] = useStateTab([]);

  const f1 = F.f1_runRate(range);
  const f3 = F.f3_tendencia(range);
  const f2 = F.f2_mediaMovel(3);
  const toggle = (label) => setHideF2((h) => h.includes(label) ? h.filter((x) => x !== label) : [...h, label]);

  return (
    <div className="charts-grid">
      {/* F1 — run-rate: stats + linha */}
      <section className="board-card is-hoverable rise" style={{ gridColumn: "span 4" }}>
        <header style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Projeção do mês (run-rate)</h3>
          <div style={{ marginTop: 3, fontSize: 12.5, color: "var(--text-muted)" }}>{f1.label}</div>
        </header>
        <RunRateStats data={f1} />
      </section>
      <Card title="Ritmo de gasto acumulado" span="span 8" height={320}
        subtitle={<>{f1.label} · real até o dia {f1.dia_atual} + projeção até o fim</>}
        legend={[{ color: "var(--c-despesa)", label: "Real (até hoje)", line: true }, { color: "var(--c-neutro)", label: "Projeção", line: true }]}>
        <RunRateChart data={{ labels: f1.labels, real: f1.real, proj: f1.proj }} themeKey={themeKey} height={320} />
      </Card>

      <Card title="Tendência da despesa mensal" span="span 12" height={340}
        subtitle={<>Regressão linear · inclinação {f3.slope >= 0 ? "+" : ""}{window.FX.fmt.brl(f3.slope)}/mês {f3.slope >= 0 ? "(subindo)" : "(caindo)"}</>}
        legend={[{ color: "var(--c-despesa)", label: "Despesa real" }, { color: "var(--accent)", label: "Tendência + projeção", line: true }]}>
        <TrendChart data={f3} themeKey={themeKey} height={340} />
      </Card>

      <Card title="Média móvel 3 meses por categoria" span="span 12" height={340}
        subtitle="Janela móvel de 3 períodos — suaviza o ruído mês a mês"
        legend={f2.series.map((s) => ({ color: s.color, label: s.label, off: hideF2.includes(s.label), onClick: () => toggle(s.label) }))}>
        <MultiLineChart data={f2} hidden={hideF2} themeKey={themeKey} height={340} />
      </Card>

      <section className="board-card rise" style={{ gridColumn: "span 12", display: "flex", alignItems: "center", gap: 16,
        background: "var(--bg-muted)", boxShadow: "none" }}>
        <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="calendar" size={20} />
        </span>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Sazonalidade (mesmo período do ano anterior)</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Desbloqueia com 12+ meses de histórico — fase futura (F4).</div>
        </div>
      </section>
    </div>
  );
}

/* ============================ G — Orçamento ============================ */
function OrcamentoTab({ period, themeKey }) {
  const F = window.FX;
  const { range, per } = rangeOf(period);
  const Card = window.ChartCard;

  const g1 = F.g1_realizado(range);
  const g2 = F.g2_progresso(range);
  const g3 = F.g3_alertas(range);

  return (
    <div className="charts-grid">
      <section className="board-card is-hoverable rise" style={{ gridColumn: "span 12" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Alertas de estouro projetado</h3>
            <div style={{ marginTop: 3, fontSize: 12.5, color: "var(--text-muted)" }}>{g1.label} · run-rate × orçamento</div>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, padding: "5px 11px", borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0,
            background: g3.length ? "var(--c-despesa-soft)" : "var(--c-receita-soft)",
            color: g3.length ? "var(--c-despesa)" : "var(--c-receita)" }}>
            {g3.length ? `${g3.length} em risco` : "0 em risco"}
          </span>
        </header>
        <AlertList alertas={g3} />
      </section>

      <Card title="Orçado × Realizado" subtitle={`Limite vs. gasto real · ${g1.label}`} span="span 7" height={330}
        legend={[{ color: "var(--c-neutro)", label: "Orçado" }, { color: "var(--c-despesa)", label: "Realizado ≥ orçado" }, { color: "var(--c-receita)", label: "Realizado < orçado" }]}>
        <GroupedBarChart data={g1} themeKey={themeKey} height={330} />
      </Card>

      <Card title="Progresso do orçamento" subtitle={`Quanto do limite já usei · ${g1.label}`} span="span 5">
        <ProgressBars itens={g2} />
      </Card>
    </div>
  );
}

Object.assign(window, { CategoriasTab, InvestimentosTab, PadroesTab, PrevisaoTab, OrcamentoTab });
