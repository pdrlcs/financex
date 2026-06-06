/* ============================================================
   Financex — Modal de Tag/Conta (color picker + preview)
   Compartilhado por Tags e Contas (kind = "tag" | "conta").
   Reusa ModalShell/Field/Select/inputStyle.
   Exposto em window: TagContaModal
   ============================================================ */
const { useState: useStateTagConta } = React;

const PALETTE = ["#EF4444", "#F97316", "#F59E0B", "#84CC16", "#22C55E", "#14B8A6", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#EC4899", "#820AD1", "#6B7280"];

function ColorPicker({ value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {PALETTE.map((c) => {
          const on = c.toLowerCase() === (value || "").toLowerCase();
          return (
            <button key={c} type="button" onClick={() => onChange(c)} title={c}
              style={{ width: 30, height: 30, borderRadius: 9, background: c, cursor: "pointer",
                border: on ? "2px solid var(--text)" : "2px solid transparent",
                outline: on ? "none" : "1px solid var(--border)", outlineOffset: -1, position: "relative" }}>
              {on && <Icon name="check" size={15} stroke={3} style={{ color: "#fff", position: "absolute", top: 5, left: 5 }} />}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg-muted)", cursor: "pointer", padding: 3 }} />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="num"
          style={{ ...window.inputStyle, width: 120, textTransform: "uppercase" }} />
      </div>
    </div>
  );
}

const TAG_TYPE_OPTS = [["despesa", "Despesa"], ["receita", "Receita"], ["investimento", "Investimento"]];
const CONTA_TYPE_OPTS = [["banco", "Banco"], ["investimento", "Investimento"], ["carteira", "Carteira"]];

function TagContaModal({ kind, initial, initialType, onClose, onSave }) {
  const isTag = kind === "tag";
  const isEdit = !!(initial && initial.entity);
  const [nome, setNome] = useStateTagConta(isEdit ? initial.entity.nome : "");
  const [color, setColor] = useStateTagConta(isEdit ? initial.entity.color : PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  const [tipo, setTipo] = useStateTagConta(isEdit ? (isTag ? initial.tagType : initial.entity.tipo) : (initialType || (isTag ? "despesa" : "banco")));
  const [touched, setTouched] = useStateTagConta(false);
  const err = !nome.trim() ? "Informe um nome." : null;

  const submit = () => {
    setTouched(true);
    if (err) return;
    onSave({ kind, isEdit, tipo, prevType: isEdit ? (isTag ? initial.tagType : null) : null,
      entity: { id: isEdit ? initial.entity.id : Date.now(), nome: nome.trim(), color, ...(isTag ? {} : { tipo }) } });
    onClose();
    window.fxToast && window.fxToast(`${isTag ? "Tag" : "Conta"} ${isEdit ? "atualizada" : "criada"}`);
  };

  const Sel = window.Select;
  return (
    <window.ModalShell width={440} onClose={onClose}
      title={`${isEdit ? "Editar" : "Nova"} ${isTag ? "tag" : "conta"}`}
      subtitle={isTag ? "A cor aparece nos gráficos por categoria." : "A cor aparece nos gráficos por conta."}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit}><Icon name="check" size={16} /> Salvar</button>
      </>}>
      <window.Field label="Nome" error={touched ? err : null}>
        <input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus
          placeholder={isTag ? "ex: Alimentação" : "ex: Nubank"} style={window.inputStyle} />
      </window.Field>
      <window.Field label="Tipo" hint={isTag ? "Define com quais transações a tag é compatível." : null}>
        <Sel value={tipo} onChange={setTipo}>
          {(isTag ? TAG_TYPE_OPTS : CONTA_TYPE_OPTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Sel>
      </window.Field>
      <window.Field label="Cor">
        <ColorPicker value={color} onChange={setColor} />
      </window.Field>
      {/* preview */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, padding: 14, borderRadius: "var(--radius-md)", background: "var(--bg-muted)" }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: color, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{nome.trim() || (isTag ? "Nome da tag" : "Nome da conta")}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Pré-visualização</div>
        </div>
      </div>
    </window.ModalShell>
  );
}

Object.assign(window, { TagContaModal });
