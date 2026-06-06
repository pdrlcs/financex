/* ============================================================
   Financex — App principal (shell + estado + roteamento de contexto)
   Monta Navbar + Sidebar + o conteúdo do contexto ativo, e gerencia
   tema (light/dark), período global e o estado CRUD (mock em memória).
   Último script a carregar — dispara o ReactDOM.createRoot.
   ============================================================ */
const { useState, useEffect, useCallback } = React;

function App() {
  // tema (persistido + prefers-color-scheme no 1º acesso)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("fx-theme");
    if (saved) return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [themeKey, setThemeKey] = useState(0);
  const [period, setPeriod] = useState("jun26");
  const [context, setContext] = useState("dashboard");
  const [drawer, setDrawer] = useState(false);
  const [excludeModal, setExcludeModal] = useState(null);

  // ----- estado CRUD — clones mutáveis seeded de FX -----
  const FX = window.FX;
  const [transacoes, setTransacoes] = useState(() => FX.transacoes.slice());
  const [tagsState, setTagsState] = useState(() => ({
    despesa: FX.tags.despesa.slice(), receita: FX.tags.receita.slice(), investimento: FX.tags.investimento.slice(),
  }));
  const [contasState, setContasState] = useState(() => FX.contas.slice());
  const [txModal, setTxModal] = useState(null);       // {initial} | {}  (null=fechado)
  const [entityModal, setEntityModal] = useState(null); // {kind, initial, initialType}
  const [confirm, setConfirm] = useState(null);         // {title, message, onConfirm}

  const saveTx = (tx, isEdit) => setTransacoes((list) => isEdit ? list.map((x) => x.id === tx.id ? tx : x) : [tx, ...list]);
  const deleteTx = (tx) => setConfirm({
    title: "Excluir transação?",
    message: `“${tx.descricao}” de ${FX.fmt.brl(tx.value)} será removida (soft delete). Esta ação pode ser desfeita no back.`,
    onConfirm: () => { setTransacoes((l) => l.filter((x) => x.id !== tx.id)); window.fxToast && window.fxToast("Transação excluída"); },
  });

  const saveEntity = ({ kind, isEdit, tipo, prevType, entity }) => {
    if (kind === "tag") {
      setTagsState((st) => {
        const next = { despesa: st.despesa.slice(), receita: st.receita.slice(), investimento: st.investimento.slice() };
        if (isEdit && prevType && prevType !== tipo) next[prevType] = next[prevType].filter((t) => t.id !== entity.id);
        const arr = next[tipo];
        const i = arr.findIndex((t) => t.id === entity.id);
        if (i >= 0) arr[i] = entity; else arr.push(entity);
        return next;
      });
    } else {
      setContasState((cs) => {
        const i = cs.findIndex((c) => c.id === entity.id);
        if (i >= 0) { const n = cs.slice(); n[i] = entity; return n; }
        return [...cs, entity];
      });
    }
  };
  const deleteEntity = (kind, tagType, ent) => setConfirm({
    title: kind === "tag" ? "Excluir tag?" : "Excluir conta?",
    message: `“${ent.nome}” será removida. Transações existentes mantêm o histórico (soft delete no back).`,
    onConfirm: () => {
      if (kind === "tag") setTagsState((st) => ({ ...st, [tagType]: st[tagType].filter((t) => t.id !== ent.id) }));
      else setContasState((cs) => cs.filter((c) => c.id !== ent.id));
      window.fxToast && window.fxToast(`${kind === "tag" ? "Tag" : "Conta"} excluída`);
    },
  });

  // aplica tema (toggla .dark + persiste + rebuild dos gráficos após o paint)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("fx-theme", theme);
    const id = requestAnimationFrame(() => setThemeKey((k) => k + 1));
    return () => cancelAnimationFrame(id);
  }, [theme]);

  // wiring: excluir tags (chamado pelo CardMenu da B1)
  useEffect(() => {
    window.fxExcludeTags = (current, setter) => setExcludeModal({ current, setter });
  }, []);

  // atalho "N" → nova transação
  useEffect(() => {
    const h = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setTxModal({}); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const toggleTheme = useCallback(() => setTheme((x) => (x === "dark" ? "light" : "dark")), []);

  const ctxLabel = (SIDEBAR_ITEMS.find((s) => s.id === context) || {}).label;

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <Navbar
        theme={theme} onToggleTheme={toggleTheme}
        period={period} onPeriod={setPeriod}
        onNova={() => setTxModal({})}
        onMenu={() => setDrawer(true)}
      />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar active={context} onSelect={setContext} mobileOpen={drawer} onClose={() => setDrawer(false)} />
        <main className="fx-main">
          {context === "dashboard" && <Dashboard period={period} themeKey={themeKey} />}
          {context === "transacoes" && (
            <TransacoesScreen transacoes={transacoes} tags={tagsState} contas={contasState}
              onNew={() => setTxModal({})} onEdit={(tx) => setTxModal({ initial: tx })} onDelete={deleteTx} />
          )}
          {context === "tags" && (
            <TagsScreen tags={tagsState} transacoes={transacoes}
              onNew={(tipo) => setEntityModal({ kind: "tag", initialType: tipo })}
              onEdit={(kind, tagType, ent) => setEntityModal({ kind: "tag", initial: { entity: ent, tagType } })}
              onDelete={deleteEntity} />
          )}
          {context === "contas" && (
            <ContasScreen contas={contasState} transacoes={transacoes}
              onNew={(tipo) => setEntityModal({ kind: "conta", initialType: tipo })}
              onEdit={(kind, _t, ent) => setEntityModal({ kind: "conta", initial: { entity: ent } })}
              onDelete={deleteEntity} />
          )}
          {!["dashboard", "transacoes", "tags", "contas"].includes(context) && <ContextPlaceholder label={ctxLabel} />}
        </main>
      </div>

      {txModal && (
        <TransacaoModal initial={txModal.initial} tags={tagsState} contas={contasState}
          onSave={saveTx} onClose={() => setTxModal(null)} />
      )}
      {entityModal && (
        <TagContaModal kind={entityModal.kind} initial={entityModal.initial} initialType={entityModal.initialType}
          onSave={saveEntity} onClose={() => setEntityModal(null)} />
      )}
      {confirm && (
        <ConfirmDialog title={confirm.title} message={confirm.message}
          onConfirm={confirm.onConfirm} onClose={() => setConfirm(null)} />
      )}
      {excludeModal && (
        <ExcludeTagsModal
          current={excludeModal.current}
          onApply={(sel) => excludeModal.setter(sel)}
          onClose={() => setExcludeModal(null)}
        />
      )}
      <ToastHost />
    </div>
  );
}

/* Contextos ainda não implementados (Orçamentos, Importar/Exportar, Configurações) */
function ContextPlaceholder({ label }) {
  return (
    <div className="board-card rise" style={{ display: "grid", placeItems: "center", padding: 64, textAlign: "center" }}>
      <div style={{ maxWidth: 440 }}>
        <div style={{ width: 54, height: 54, borderRadius: 15, background: "var(--accent-soft)", color: "var(--accent)",
          display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <Icon name="transacoes" size={26} />
        </div>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>{label}</h2>
        <p style={{ margin: 0, fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
          Contexto previsto no shell (sidebar): <strong>Orçamentos</strong>, <strong>Importar/Exportar</strong> e
          <strong> Configurações</strong>. Dashboard, Transações, Tags e Contas já estão implementados.
        </p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
