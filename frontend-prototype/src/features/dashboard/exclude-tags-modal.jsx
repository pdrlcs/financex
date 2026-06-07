/* ============================================================
   Financex — Modal "Excluir tags" (exclude_tags por card)
   Remove categorias da agregação de um card específico (não global).
   Reusa ModalShell (components/ui/modal).
   Exposto em window: ExcludeTagsModal
   ============================================================ */
const { useState: useStateExcl } = React;

function ExcludeTagsModal({ current, onApply, onClose }) {
  const [sel, setSel] = useStateExcl(current);
  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const ModalShell = window.ModalShell;
  return (
    <ModalShell title="Excluir tags do gráfico" width={420}
      subtitle="Remove categorias da agregação deste card (não afeta os outros)." onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={() => { onApply([]); onClose(); }}>Limpar</button>
        <button className="btn btn-primary" onClick={() => { onApply(sel); onClose(); }}>Aplicar</button>
      </>}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {window.FX.tags.despesa.map((t) => {
          const on = sel.includes(t.nome);
          return (
            <button key={t.id} onClick={() => toggle(t.nome)} style={{
              display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
              padding: "7px 12px", borderRadius: 999, fontSize: 13, fontWeight: 500, fontFamily: "inherit",
              border: "1px solid " + (on ? "var(--accent)" : "var(--border)"),
              background: on ? "var(--accent-soft)" : "var(--bg-surface)",
              color: on ? "var(--accent)" : "var(--text)",
            }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: t.color }} />
              {t.nome}
              {on && <Icon name="x" size={13} />}
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}

Object.assign(window, { ExcludeTagsModal });
