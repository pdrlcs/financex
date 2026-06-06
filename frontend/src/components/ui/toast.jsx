/* ============================================================
   Financex — Toasts (feedback de ação)
   Registra window.fxToast e renderiza a fila de toasts.
   Exposto em window: ToastHost, fxToast
   ============================================================ */
const { useState: useStateToast, useEffect: useEffectToast } = React;

function ToastHost() {
  const [toasts, setToasts] = useStateToast([]);
  useEffectToast(() => {
    window.fxToast = (msg, kind = "ok") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, msg, kind }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
    };
  }, []);
  return (
    <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map((t) => (
        <div key={t.id} className="rise board-card" style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          boxShadow: "var(--shadow-md)", animationDuration: ".2s", minWidth: 220,
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 999, flexShrink: 0,
            background: t.kind === "ok" ? "var(--c-receita-soft)" : "var(--c-despesa-soft)",
            color: t.kind === "ok" ? "var(--c-receita)" : "var(--c-despesa)",
            display: "grid", placeItems: "center",
          }}>
            <Icon name="check" size={14} stroke={2.4} />
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { ToastHost });
