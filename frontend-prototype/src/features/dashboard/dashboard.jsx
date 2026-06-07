/* ============================================================
   Financex — Dashboard: header + abas (grupos A–G do GRAFICOS.md)
   Resolve a aba ativa e delega para a aba correspondente.
   Exposto em window: Dashboard, DASH_TABS
   ============================================================ */
const { useState: useStateDashboard } = React;

/* Abas do Dashboard = grupos A–G do GRAFICOS.md (doc §4) */
const DASH_TABS = [
  { id: "visao-geral", label: "Visão geral", grupos: "A · C" },
  { id: "categorias", label: "Categorias", grupos: "B" },
  { id: "investimentos", label: "Investimentos", grupos: "D" },
  { id: "padroes", label: "Padrões de gasto", grupos: "E" },
  { id: "previsao", label: "Previsão", grupos: "F" },
  { id: "orcamento", label: "Orçamento", grupos: "G" },
];

function DashTabs({ active, onSelect }) {
  return (
    <div className="dash-tabs" role="tablist">
      {DASH_TABS.map((t) => {
        const on = t.id === active;
        return (
          <button key={t.id} role="tab" aria-selected={on} onClick={() => onSelect(t.id)}
            className={"dash-tab" + (on ? " is-active" : "")}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* Placeholder p/ abas ainda não implementadas */
function TabPlaceholder({ tab }) {
  const t = DASH_TABS.find((x) => x.id === tab);
  return (
    <div className="board-card rise" style={{ display: "grid", placeItems: "center", padding: 56, textAlign: "center" }}>
      <div style={{ maxWidth: 420 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent)",
          display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <Icon name="dashboard" size={24} />
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600 }}>{t ? t.label : "Em breve"}</h3>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Aba do grupo <strong>{t ? t.grupos : ""}</strong> do catálogo de gráficos.
        </p>
      </div>
    </div>
  );
}

const TAB_COMPONENTS = {
  "visao-geral": (p) => <VisaoGeral {...p} />,
  "categorias": (p) => (window.CategoriasTab ? <window.CategoriasTab {...p} /> : null),
  "investimentos": (p) => (window.InvestimentosTab ? <window.InvestimentosTab {...p} /> : null),
  "padroes": (p) => (window.PadroesTab ? <window.PadroesTab {...p} /> : null),
  "previsao": (p) => (window.PrevisaoTab ? <window.PrevisaoTab {...p} /> : null),
  "orcamento": (p) => (window.OrcamentoTab ? <window.OrcamentoTab {...p} /> : null),
};

function Dashboard({ period, themeKey }) {
  const [tab, setTab] = useStateDashboard(() => localStorage.getItem("fx-tab") || "visao-geral");
  const selectTab = (t) => { localStorage.setItem("fx-tab", t); setTab(t); };
  const render = TAB_COMPONENTS[tab];
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Dashboard</h1>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>Sua visão financeira do período selecionado.</p>
      </div>
      <DashTabs active={tab} onSelect={selectTab} />
      <div key={tab} style={{ marginTop: "var(--gutter)" }}>
        {render ? render({ period, themeKey }) : <TabPlaceholder tab={tab} />}
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, DASH_TABS });
