/* ============================================================
   Financex — Primitivas de modal e formulário (UI compartilhada)
   • ModalShell — overlay + card de modal (Esc, scroll lock)
   • Field, Select, inputStyle — campos de formulário
   Exposto em window: ModalShell, Field, Select, inputStyle
   ============================================================ */
const { useEffect: useEffectModal } = React;

/* ---------- Shell de modal ---------- */
function ModalShell({ title, subtitle, onClose, children, footer, width = 480 }) {
  useEffectModal(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, []);
  return (
    <div onMouseDown={onClose} style={{
      position: "fixed", inset: 0, zIndex: 150, background: "rgba(9,30,66,.48)",
      backdropFilter: "blur(2px)", display: "grid", placeItems: "center", padding: 16,
      animation: "rise .18s ease both",
    }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="board-card" style={{
        width: "100%", maxWidth: width, boxShadow: "var(--shadow-md)", padding: 0,
        maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 12, padding: "20px 22px 14px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</h2>
            {subtitle && <div style={{ marginTop: 3, fontSize: 13, color: "var(--text-muted)" }}>{subtitle}</div>}
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar"><Icon name="x" size={18} /></button>
        </header>
        <div style={{ padding: 22, overflowY: "auto" }}>{children}</div>
        {footer && <footer style={{ display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "14px 22px", borderTop: "1px solid var(--border)" }}>{footer}</footer>}
      </div>
    </div>
  );
}

/* ---------- Campos ---------- */
function Field({ label, error, children, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{label}</span>
      {children}
      {error
        ? <span style={{ display: "block", fontSize: 12, color: "var(--c-despesa)", marginTop: 5 }}>{error}</span>
        : hint ? <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 5 }}>{hint}</span> : null}
    </label>
  );
}
const inputStyle = {
  width: "100%", fontFamily: "inherit", fontSize: 14, color: "var(--text)",
  background: "var(--bg-muted)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)", padding: "10px 12px", outline: "none",
};

function Select({ value, onChange, children }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, appearance: "none", paddingRight: 34, cursor: "pointer" }}>
        {children}
      </select>
      <Icon name="chevronDown" size={15} style={{ position: "absolute", right: 11, top: "50%",
        transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
    </div>
  );
}

Object.assign(window, { ModalShell, Field, Select, inputStyle });
