/* ============================================================
   Financex — Tela de Contas (cards coloridos por type)
   Abas: Banco · Investimento · Carteira. CRUD via callbacks.
   Reusa ScreenHeader/ScreenTabs/EntityCard.
   Exposto em window: ContasScreen
   ============================================================ */
const { useState: useStateContasScreen } = React;

const CONTA_TABS = [
  { id: "banco", label: "Banco" },
  { id: "investimento", label: "Investimento" },
  { id: "carteira", label: "Carteira" },
];

function ContasScreen({ contas, transacoes, onNew, onEdit, onDelete }) {
  const [tab, setTab] = useStateContasScreen("banco");
  const list = contas.filter((c) => c.tipo === tab);
  const count = (id) => transacoes.filter((t) => t.contaId === id).length;
  const tipoLabel = { banco: "Banco", investimento: "Investimento", carteira: "Carteira" };
  return (
    <div>
      <ScreenHeader title="Contas" subtitle={`${contas.length} contas · cor define a aparência nos gráficos`}
        action={<button className="btn btn-primary" onClick={() => onNew(tab)}><Icon name="plus" size={17} /> Nova conta</button>} />
      <ScreenTabs tabs={CONTA_TABS} active={tab} onSelect={setTab} />
      <div className="entity-grid">
        {list.map((c) => (
          <EntityCard key={c.id} color={c.color} title={c.nome} sub={tipoLabel[c.tipo]} count={count(c.id)}
            onEdit={() => onEdit("conta", null, c)} onDelete={() => onDelete("conta", null, c)} />
        ))}
        {list.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 14, padding: 12 }}>Nenhuma conta deste tipo.</div>}
      </div>
    </div>
  );
}

Object.assign(window, { ContasScreen });
