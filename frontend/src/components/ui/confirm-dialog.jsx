/* ============================================================
   Financex — ConfirmDialog: diálogo de confirmação (excluir etc.)
   Reusa ModalShell (components/ui/modal).
   Exposto em window: ConfirmDialog
   ============================================================ */

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }) {
  return (
    <window.ModalShell width={400} title={title} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { onConfirm(); onClose(); }}
          style={{ background: "var(--c-despesa)" }}><Icon name="x" size={16} /> {confirmLabel || "Excluir"}</button>
      </>}>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55 }}>{message}</p>
    </window.ModalShell>
  );
}

Object.assign(window, { ConfirmDialog });
