/* ============================================================
   Financex — Shell: Navbar + Sidebar
   Exposto em window: Navbar, Sidebar, Wordmark, PeriodSelector
   ============================================================ */
const { useState: useStateShell, useRef: useRefShell, useEffect: useEffectShell } = React;

/* Wordmark "Financex" — acento na cor de marca (logo provisório, doc §9) */
function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, userSelect: "none" }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, background: "var(--accent)",
        display: "grid", placeItems: "center", flexShrink: 0,
        boxShadow: "var(--shadow-sm)",
      }}>
        {/* marca provisória: dois "ticks" empilhados (não é o logo final) */}
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
          stroke="var(--accent-contrast)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14l4-4 4 3 7-7" />
          <path d="M4 20l4-3 4 2 7-6" opacity="0.55" />
        </svg>
      </div>
      <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>
        Financ<span style={{ color: "var(--accent)" }}>e</span>x
      </span>
    </div>
  );
}

/* Seletor de período global (dirige todos os gráficos do Dashboard) */
function PeriodSelector({ value, onChange }) {
  const [open, setOpen] = useStateShell(false);
  const ref = useRefShell(null);
  useEffectShell(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const cur = window.FX.periodos.find((p) => p.id === value) || window.FX.periodos[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)}
        style={{ minWidth: 168, justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="calendar" size={16} style={{ color: "var(--text-muted)" }} />
          <span style={{ fontWeight: 600 }}>{cur.label}</span>
        </span>
        <Icon name="chevronDown" size={15} style={{
          color: "var(--text-muted)", transition: "transform .18s",
          transform: open ? "rotate(180deg)" : "none",
        }} />
      </button>
      {open && (
        <div className="rise" style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 60,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)",
          padding: 6, minWidth: 230, animationDuration: ".16s",
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em",
            color: "var(--text-muted)", padding: "8px 10px 4px",
          }}>Período</div>
          {window.FX.periodos.map((p) => {
            const active = p.id === value;
            return (
              <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1,
                  width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                  background: active ? "var(--accent-soft)" : "transparent",
                  borderRadius: "var(--radius-sm)", padding: "8px 10px",
                  color: active ? "var(--accent)" : "var(--text)",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-muted)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>
                  {p.label}
                  {active && <Icon name="check" size={15} />}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.sub}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === "dark";
  return (
    <button className="btn-icon" onClick={onToggle} aria-label="Alternar tema"
      title={dark ? "Tema claro" : "Tema escuro"}
      style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", width: 40, height: 40, justifyContent: "center", display: "inline-flex", alignItems: "center" }}>
      <Icon name={dark ? "sun" : "moon"} size={18} />
    </button>
  );
}

function Navbar({ theme, onToggleTheme, period, onPeriod, onNova, onMenu }) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50, height: 64,
      background: "var(--bg-surface)", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: 16, padding: "0 20px",
      transition: "background-color .25s ease, border-color .25s ease",
    }}>
      <button className="btn-icon nav-burger" onClick={onMenu} aria-label="Menu"
        style={{ display: "none" }}>
        <Icon name="menu" size={20} />
      </button>
      <Wordmark />
      <div style={{ flex: 1 }} />
      <PeriodSelector value={period} onChange={onPeriod} />
      <button className="btn btn-primary nav-nova" onClick={onNova}>
        <Icon name="plus" size={17} />
        <span className="nova-label">Nova transação</span>
      </button>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}

/* Sidebar — contextos (PLANEJAMENTO_FRONT.md §4) */
const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "transacoes", label: "Transações", icon: "transacoes" },
  { id: "orcamentos", label: "Orçamentos", icon: "orcamentos" },
  { id: "tags", label: "Tags", icon: "tags" },
  { id: "contas", label: "Contas", icon: "contas" },
  { id: "importar", label: "Importar / Exportar", icon: "importar" },
  { id: "config", label: "Configurações", icon: "config" },
];

function Sidebar({ active, onSelect, mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && <div className="sidebar-scrim" onClick={onClose} />}
      <aside className={"fx-sidebar" + (mobileOpen ? " is-open" : "")}>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "16px 12px" }}>
          {SIDEBAR_ITEMS.map((it) => {
            const isActive = it.id === active;
            return (
              <button key={it.id} onClick={() => { onSelect(it.id); onClose && onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  border: "none", cursor: "pointer", textAlign: "left",
                  padding: "10px 12px", borderRadius: "var(--radius-md)",
                  fontSize: 14, fontWeight: isActive ? 600 : 500,
                  background: isActive ? "var(--accent-soft)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  position: "relative", transition: "background .15s, color .15s",
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "var(--bg-muted)"; e.currentTarget.style.color = "var(--text)"; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; } }}>
                {isActive && <span style={{
                  position: "absolute", left: -12, top: 8, bottom: 8, width: 3,
                  background: "var(--accent)", borderRadius: "0 3px 3px 0",
                }} />}
                <Icon name={it.icon} size={19} stroke={isActive ? 2 : 1.75} />
                <span>{it.label}</span>
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", padding: 16 }}>
          <div className="board-card" style={{ padding: 14, background: "var(--bg-muted)", border: "none", boxShadow: "none" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>
              Cadastro rápido
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
              Use <strong>+ Nova transação</strong> ou tecle <kbd className="kbd">N</kbd> a qualquer momento.
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { Navbar, Sidebar, Wordmark, PeriodSelector, SIDEBAR_ITEMS });
