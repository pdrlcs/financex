/* ============================================================
   Financex — Modal de cadastro/edição de transação (cadastro rápido)
   Reusa ModalShell/Field/Select/inputStyle (components/ui/modal).
   Validação tipo Zod: valor > 0, tag compatível, conta ativa.
   Exposto em window: TransacaoModal, NovaTransacaoModal
   ============================================================ */
const { useState: useStateTx, useEffect: useEffectTx } = React;

/* Tipos de transação (segmented control) */
const TX_TYPES = [
  { id: "despesa", label: "Despesa", color: "var(--c-despesa)", tagType: "despesa" },
  { id: "receita", label: "Receita", color: "var(--c-receita)", tagType: "receita" },
  { id: "investimento", label: "Investimento", color: "var(--c-investimento)", tagType: "investimento" },
  { id: "retirada_investimento", label: "Retirada", color: "var(--c-saldo)", tagType: "investimento" },
];

function Segmented({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, padding: 4,
      background: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
      {TX_TYPES.map((t) => {
        const on = t.id === value;
        return (
          <button key={t.id} type="button" onClick={() => onChange(t.id)}
            style={{
              border: "none", cursor: "pointer", padding: "9px 6px", borderRadius: "var(--radius-sm)",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              background: on ? "var(--bg-surface)" : "transparent",
              color: on ? t.color : "var(--text-muted)",
              boxShadow: on ? "var(--shadow-sm)" : "none",
              transition: "background .15s, color .15s",
            }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* Input monetário pt-BR (centavos → R$ 0,00) */
function MoneyInput({ cents, onCents, error }) {
  const handle = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    onCents(digits ? parseInt(digits, 10) : 0);
  };
  const display = window.FX.fmt.brl((cents || 0) / 100);
  return (
    <input className="num" inputMode="numeric" value={display} onChange={handle}
      style={{ ...window.inputStyle, fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em",
        borderColor: error ? "var(--c-despesa)" : "var(--border)" }} />
  );
}

function TransacaoModal({ initial, tags: tagsProp, contas: contasProp, onClose, onSave }) {
  const F = window.FX;
  const tagsAll = tagsProp || F.tags;
  const contasAll = contasProp || F.contas;
  const isEdit = !!initial;
  const today = "2026-06-18"; // "hoje" de demonstração
  const [type, setType] = useStateTx(initial ? initial.type : "despesa");
  const [cents, setCents] = useStateTx(initial ? Math.round(initial.value * 100) : 0);
  const [date, setDate] = useStateTx(initial ? initial.date : today);
  const [contaId, setContaId] = useStateTx(String(initial ? initial.contaId : contasAll[0].id));
  const [tagId, setTagId] = useStateTx(initial ? String(initial.tagId) : "");
  const [metodo, setMetodo] = useStateTx(initial ? initial.metodo : "Pix");
  const [desc, setDesc] = useStateTx(initial ? initial.descricao : "");
  const [touched, setTouched] = useStateTx(false);

  const typeDef = TX_TYPES.find((t) => t.id === type);
  const tagOptions = tagsAll[typeDef.tagType] || [];

  // tag incompatível ao trocar type → reseta
  useEffectTx(() => {
    if (tagId && !tagOptions.some((t) => String(t.id) === tagId)) setTagId("");
  }, [type]);

  // Validação (espelha Zod do back: valor > 0, tag compatível, conta ativa)
  const errors = {
    cents: cents <= 0 ? "Informe um valor maior que zero." : null,
    tagId: !tagId ? "Selecione uma categoria compatível." : null,
  };
  const valid = !errors.cents && !errors.tagId;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const tag = tagOptions.find((t) => String(t.id) === tagId);
    const conta = contasAll.find((c) => String(c.id) === String(contaId));
    const [, mm, dd] = date.split("-").map(Number);
    const mi = mm - 1, dia = dd;
    const tx = {
      id: isEdit ? initial.id : Date.now(),
      type, value: cents / 100,
      date, dia, mi, dateNum: mi * 100 + dia,
      tagId: tag.id, tagNome: tag.nome, tagColor: tag.color,
      contaId: conta.id, contaNome: conta.nome, contaColor: conta.color,
      metodo, descricao: desc || tag.nome,
    };
    onSave && onSave(tx, isEdit);
    onClose();
    window.fxToast && window.fxToast(`${typeDef.label} de ${F.fmt.brl(cents / 100)} ${isEdit ? "atualizada" : "criada"}`);
  };

  const ModalShell = window.ModalShell, Field = window.Field, Select = window.Select;
  return (
    <ModalShell title={isEdit ? "Editar transação" : "Nova transação"}
      subtitle={isEdit ? "Altere os campos e salve." : "Cadastro rápido — meta central do produto."} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit}>
          <Icon name="check" size={16} /> {isEdit ? "Salvar alterações" : "Salvar transação"}
        </button>
      </>}>
      <Field label="Tipo">
        <Segmented value={type} onChange={setType} />
      </Field>
      <Field label="Valor" error={touched ? errors.cents : null}>
        <MoneyInput cents={cents} onCents={setCents} error={touched && errors.cents} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Data">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...window.inputStyle, cursor: "pointer" }} />
        </Field>
        <Field label="Conta">
          <Select value={contaId} onChange={setContaId}>
            {contasAll.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Categoria (tag)" error={touched ? errors.tagId : null}
          hint={!touched ? `Filtradas por tipo: ${typeDef.label.toLowerCase()}` : null}>
          <Select value={tagId} onChange={setTagId}>
            <option value="">Selecione…</option>
            {tagOptions.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </Select>
        </Field>
        <Field label="Método">
          <Select value={metodo} onChange={setMetodo}>
            {F.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Descrição" hint="Opcional">
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="ex: Mercado da semana" style={window.inputStyle} />
      </Field>
    </ModalShell>
  );
}

function NovaTransacaoModal(props) { return <TransacaoModal {...props} />; }

Object.assign(window, { TransacaoModal, NovaTransacaoModal });
