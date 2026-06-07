/* ============================================================
   Financex — Visualizações custom (HTML/CSS, theme-aware)
   E1 HeatmapCalendar · G2 ProgressBars · G3 AlertList · F1 RunRateStats
   Exposto em window
   ============================================================ */

/* E1 — Mapa de calor estilo calendário (sem plugin matrix — grid CSS) */
function HeatmapCalendar({ data }) {
  const F = window.FX;
  const cells = [];
  for (let i = 0; i < data.firstDow; i++) cells.push(null); // offset início
  for (let d = 1; d <= data.dias; d++) cells.push(d);
  const intensity = (v) => (data.max > 0 ? v / data.max : 0);
  // cor: mistura accent-soft → c-despesa conforme intensidade
  const cellColor = (t) => {
    if (t <= 0.001) return "var(--bg-muted)";
    const a = 0.12 + t * 0.78;
    return window.hexA(getComputedStyle(document.documentElement).getPropertyValue("--c-despesa").trim() || "#EF4444", a);
  };
  const dow = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 7 }}>
        {dow.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", paddingBottom: 2 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={"e" + i} />;
          const v = data.vals[d - 1] || 0;
          const t = intensity(v);
          return (
            <div key={d} title={`${String(d).padStart(2, "0")} — ${F.fmt.brl(v)}`}
              style={{
                aspectRatio: "1 / 1", borderRadius: 8, background: cellColor(t),
                border: "1px solid var(--border)", position: "relative", cursor: "default",
                display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: 5,
                transition: "transform .12s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>
              <span className="num" style={{ fontSize: 10.5, fontWeight: 600, color: t > 0.55 ? "#fff" : "var(--text-muted)" }}>{d}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span key={t} style={{ width: 16, height: 16, borderRadius: 5, background: cellColor(t), border: "1px solid var(--border)" }} />
        ))}
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Mais · até {F.fmt.brl(data.max)}/dia</span>
      </div>
    </div>
  );
}

/* G2 — Barras de progresso por categoria (gauge nativo) */
const STATUS_INFO = {
  ok: { color: "var(--c-receita)", label: "No ritmo" },
  atencao: { color: "#F59E0B", label: "Atenção" },
  estourado: { color: "var(--c-despesa)", label: "Estourado" },
};
function ProgressBars({ itens }) {
  const F = window.FX;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {itens.map((it) => {
        const si = STATUS_INFO[it.status];
        const pct = Math.min(it.percent, 1);
        const over = it.percent > 1;
        return (
          <div key={it.tag}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7, gap: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: it.color }} />
                {it.tag}
              </span>
              <span className="num" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                <strong style={{ color: "var(--text)" }}>{F.fmt.brl(it.gasto)}</strong> / {F.fmt.brl(it.orcado)}
              </span>
            </div>
            <div style={{ position: "relative", height: 9, borderRadius: 999, background: "var(--bg-muted)", overflow: "hidden" }}>
              <div style={{
                position: "absolute", inset: 0, width: (pct * 100) + "%",
                background: si.color, borderRadius: 999, transition: "width .5s cubic-bezier(.22,1,.36,1)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, gap: 10 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: si.color, whiteSpace: "nowrap" }}>{si.label}</span>
              <span className="num" style={{ fontSize: 11.5, color: over ? "var(--c-despesa)" : "var(--text-muted)", fontWeight: over ? 700 : 500, whiteSpace: "nowrap" }}>
                {F.fmt.pct(it.percent * 100, 0)}{over ? " · acima do limite" : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* G3 — Lista de alertas de estouro projetado (badges) */
function AlertList({ alertas }) {
  const F = window.FX;
  if (!alertas.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 4px", color: "var(--text-muted)" }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--c-receita-soft)", color: "var(--c-receita)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="check" size={18} stroke={2.4} />
        </span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Tudo sob controle</div>
          <div style={{ fontSize: 13 }}>Nenhuma categoria projeta estourar o orçamento neste mês.</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {alertas.map((a) => (
        <div key={a.tag} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "13px 15px",
          borderRadius: "var(--radius-md)", background: "var(--c-despesa-soft)",
          border: "1px solid " + window.hexA(getComputedStyle(document.documentElement).getPropertyValue("--c-despesa").trim() || "#EF4444", 0.28),
        }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: a.color, flexShrink: 0,
            display: "grid", placeItems: "center", color: "#fff" }}>
            <Icon name="trendUp" size={18} stroke={2.4} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {a.tag} pode estourar{a.dia_estouro ? <> no dia <span className="num">{a.dia_estouro}</span></> : ""}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              Projeção <span className="num" style={{ fontWeight: 600, color: "var(--c-despesa)" }}>{F.fmt.brl(a.projecao_fim_mes)}</span>
              {" "}vs. orçado <span className="num">{F.fmt.brl(a.orcado)}</span>
              {" · "}gasto até agora <span className="num">{F.fmt.brl(a.gasto_atual)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* F1 — Stats do run-rate (3 números + chip de tendência) */
const TEND_INFO = {
  acima: { color: "var(--c-despesa)", label: "Acima da média", icon: "trendUp" },
  dentro: { color: "var(--text-muted)", label: "Dentro da média", icon: "scale" },
  abaixo: { color: "var(--c-receita)", label: "Abaixo da média", icon: "trendDown" },
};
function RunRateStats({ data }) {
  const F = window.FX;
  const ti = TEND_INFO[data.tendencia];
  const Stat = ({ label, value, sub, big, color }) => (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5 }}>{label}</div>
      <div className="num" style={{ fontSize: big ? 28 : 20, fontWeight: 700, letterSpacing: "-0.02em", color: color || "var(--text)", lineHeight: 1.05 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <Stat label="Projeção de fim de mês" big value={F.fmt.brl(data.projecao_fim_mes)}
        color={ti.color}
        sub={<>com base em <span className="num">{data.dia_atual}</span>/{data.dias_no_mes} dias</>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Stat label="Gasto até hoje" value={F.fmt.brl(data.gasto_ate_agora)} />
        <Stat label="Média histórica" value={F.fmt.brl(data.media_historica)} />
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
        padding: "8px 13px", borderRadius: 999, background: "var(--bg-muted)", color: ti.color, fontSize: 13, fontWeight: 600 }}>
        <Icon name={ti.icon} size={16} stroke={2.2} />
        {ti.label}
      </div>
    </div>
  );
}

Object.assign(window, { HeatmapCalendar, ProgressBars, AlertList, RunRateStats });
