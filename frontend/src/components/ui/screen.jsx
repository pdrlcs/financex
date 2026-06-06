/* ============================================================
   Financex — Chrome de tela compartilhado (CRUD)
   ScreenHeader (título + ação) e ScreenTabs (abas internas por type).
   Reusado por Transações, Tags e Contas.
   Exposto em window: ScreenHeader, ScreenTabs
   ============================================================ */

function ScreenTabs({ tabs, active, onSelect }) {
  return (
    <div className="dash-tabs" role="tablist" style={{ marginBottom: "var(--gutter)" }}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => onSelect(t.id)}
          className={"dash-tab" + (active === t.id ? " is-active" : "")}>{t.label}</button>
      ))}
    </div>
  );
}

function ScreenHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h1>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

Object.assign(window, { ScreenHeader, ScreenTabs });
