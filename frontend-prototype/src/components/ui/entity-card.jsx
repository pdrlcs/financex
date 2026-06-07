/* ============================================================
   Financex — EntityCard: card colorido de Tag/Conta
   Mostra a cor da entidade + contagem de lançamentos + ações.
   Reusado por Tags e Contas.
   Exposto em window: EntityCard
   ============================================================ */

function EntityCard({ color, title, sub, count, onEdit, onDelete }) {
  return (
    <div className="board-card is-hoverable" style={{ display: "flex", alignItems: "center", gap: 14, padding: 16 }}>
      <span style={{ width: 44, height: 44, borderRadius: 12, background: color, flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{sub}{count != null ? ` · ${count} lançamento${count === 1 ? "" : "s"}` : ""}</div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button className="btn-icon" title="Editar" onClick={onEdit}><Icon name="config" size={16} /></button>
        <button className="btn-icon" title="Excluir" onClick={onDelete} style={{ color: "var(--c-despesa)" }}><Icon name="x" size={17} /></button>
      </div>
    </div>
  );
}

Object.assign(window, { EntityCard });
