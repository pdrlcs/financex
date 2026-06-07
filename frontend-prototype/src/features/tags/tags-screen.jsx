/* ============================================================
   Financex — Tela de Tags (cards coloridos por type)
   Abas: Despesa · Receita · Investimento. CRUD via callbacks.
   Reusa ScreenHeader/ScreenTabs/EntityCard.
   Exposto em window: TagsScreen
   ============================================================ */
const { useState: useStateTagsScreen } = React;

const TAG_TABS = [
  { id: "despesa", label: "Despesa" },
  { id: "receita", label: "Receita" },
  { id: "investimento", label: "Investimento" },
];

function TagsScreen({ tags, transacoes, onNew, onEdit, onDelete }) {
  const [tab, setTab] = useStateTagsScreen("despesa");
  const list = tags[tab] || [];
  const count = (id) => transacoes.filter((t) => t.tagId === id).length;
  const total = tags.despesa.length + tags.receita.length + tags.investimento.length;
  return (
    <div>
      <ScreenHeader title="Tags" subtitle={`${total} categorias · cor define a aparência nos gráficos`}
        action={<button className="btn btn-primary" onClick={() => onNew(tab)}><Icon name="plus" size={17} /> Nova tag</button>} />
      <ScreenTabs tabs={TAG_TABS} active={tab} onSelect={setTab} />
      <div className="entity-grid">
        {list.map((t) => (
          <EntityCard key={t.id} color={t.color} title={t.nome} sub="Tag" count={count(t.id)}
            onEdit={() => onEdit("tag", tab, t)} onDelete={() => onDelete("tag", tab, t)} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { TagsScreen });
