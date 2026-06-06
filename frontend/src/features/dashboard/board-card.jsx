/* ============================================================
   Financex — Board Card de gráfico (header + ⋯ + legenda)
   CardMenu (ações: excluir tags, baixar PNG/CSV), ChartCard e EmptyState.
   Unidade visual dos gráficos do Dashboard.
   Exposto em window: ChartCard, CardMenu, EmptyState
   ============================================================ */
const { useState: useStateCard, useRef: useRefCard, useEffect: useEffectCard } = React;

/* ---------- Board Card com header (título + subtítulo + ⋯) ---------- */
function CardMenu({ items }) {
  const [open, setOpen] = useStateCard(false);
  const ref = useRefCard(null);
  useEffectCard(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn-icon" onClick={() => setOpen((o) => !o)} aria-label="Ações do card">
        <Icon name="more" size={18} />
      </button>
      {open && (
        <div className="rise" style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 40,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)",
          padding: 6, minWidth: 190, animationDuration: ".14s",
        }}>
          {items.map((it, i) => (
            <button key={i} onClick={() => { it.onClick(); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                border: "none", background: "transparent", cursor: "pointer", color: "var(--text)",
                padding: "9px 10px", borderRadius: "var(--radius-sm)", fontSize: 13.5, fontWeight: 500,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <Icon name={it.icon} size={16} style={{ color: "var(--text-muted)" }} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, menu, children, span, legend, height }) {
  const ref = useRefCard(null);
  const downloadPng = () => {
    const c = ref.current && ref.current.querySelector("canvas");
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = (title || "grafico").toLowerCase().replace(/\s+/g, "-") + ".png";
    a.click();
    window.fxToast && window.fxToast("PNG baixado");
  };
  const baseMenu = [
    { icon: "download", label: "Baixar PNG", onClick: downloadPng },
    { icon: "download", label: "Baixar CSV", onClick: () => window.fxToast && window.fxToast("Exportação CSV (mock)") },
  ];
  return (
    <section ref={ref} className="board-card is-hoverable rise" style={{ gridColumn: span, minWidth: 0 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h3>
          {subtitle && <div style={{ marginTop: 3, fontSize: 12.5, color: "var(--text-muted)" }}>{subtitle}</div>}
        </div>
        <CardMenu items={(menu || []).concat(baseMenu)} />
      </header>
      {children}
      {legend && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 16, justifyContent: "center" }}>
          {legend.map((l, i) => {
            const Tag = l.onClick ? "button" : "span";
            return (
              <Tag key={i} onClick={l.onClick}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5,
                  color: "var(--text-muted)", opacity: l.off ? 0.4 : 1,
                  border: "none", background: "transparent", fontFamily: "inherit",
                  cursor: l.onClick ? "pointer" : "default", padding: 0,
                  textDecoration: l.off ? "line-through" : "none" }}>
                <span style={{ width: 10, height: 10, borderRadius: l.line ? 2 : 3, background: l.color, display: "inline-block",
                  ...(l.line ? { height: 3, width: 14 } : {}) }} />
                {l.label}
              </Tag>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div style={{ height: 300, display: "grid", placeItems: "center", textAlign: "center", color: "var(--text-muted)" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Sem movimentações neste período</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Troque o período na barra superior.</div>
      </div>
    </div>
  );
}

Object.assign(window, { ChartCard, CardMenu, EmptyState });
