/* ============================================================
   Financex — Tela de Transações (tabela + filtros + paginação)
   Abas internas por type, busca/mês/tag/conta, CRUD via callbacks.
   Reusa ScreenHeader/ScreenTabs (components/ui/screen) e inputStyle.
   Exposto em window: TransacoesScreen
   ============================================================ */
const { useState: useStateTxScreen, useMemo: useMemoTxScreen } = React;

const TX_TABS = [
  { id: "todas", label: "Todas", type: null },
  { id: "despesa", label: "Despesas", type: "despesa" },
  { id: "receita", label: "Receitas", type: "receita" },
  { id: "investimento", label: "Investimentos", type: "investimento" },
  { id: "retirada_investimento", label: "Retiradas", type: "retirada_investimento" },
];
const PAGE_SIZE = 9;

function TransacoesScreen({ transacoes, tags, contas, onNew, onEdit, onDelete }) {
  const F = window.FX;
  const [tab, setTab] = useStateTxScreen("todas");
  const [busca, setBusca] = useStateTxScreen("");
  const [tagF, setTagF] = useStateTxScreen("all");
  const [contaF, setContaF] = useStateTxScreen("all");
  const [mesF, setMesF] = useStateTxScreen("all");
  const [page, setPage] = useStateTxScreen(0);

  const type = TX_TABS.find((t) => t.id === tab).type;
  const filtered = useMemoTxScreen(() => transacoes.filter((tx) => {
    if (type && tx.type !== type) return false;
    if (tagF !== "all" && String(tx.tagId) !== tagF) return false;
    if (contaF !== "all" && String(tx.contaId) !== contaF) return false;
    if (mesF !== "all" && String(tx.mi) !== mesF) return false;
    if (busca && !(`${tx.descricao} ${tx.tagNome}`.toLowerCase().includes(busca.toLowerCase()))) return false;
    return true;
  }), [transacoes, type, tagF, contaF, mesF, busca]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(curPage * PAGE_SIZE, curPage * PAGE_SIZE + PAGE_SIZE);
  const resetPage = (fn) => (v) => { fn(v); setPage(0); };

  const allTags = [...tags.despesa, ...tags.receita, ...tags.investimento];

  const selStyle = { ...window.inputStyle, width: "auto", padding: "8px 30px 8px 12px", fontSize: 13, fontWeight: 500, appearance: "none", cursor: "pointer" };
  const FilterSelect = ({ value, onChange, children }) => (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selStyle}>{children}</select>
      <Icon name="chevronDown" size={14} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
    </div>
  );

  return (
    <div>
      <ScreenHeader title="Transações" subtitle={`${filtered.length} lançamento${filtered.length === 1 ? "" : "s"} no filtro atual`}
        action={<button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={17} /> Nova transação</button>} />
      <ScreenTabs tabs={TX_TABS} active={tab} onSelect={(t) => { setTab(t); setPage(0); }} />

      {/* filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: "var(--gutter)" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={busca} onChange={(e) => resetPage(setBusca)(e.target.value)} placeholder="Buscar descrição ou tag…"
            style={{ ...window.inputStyle, paddingLeft: 36 }} />
        </div>
        <FilterSelect value={mesF} onChange={resetPage(setMesF)}>
          <option value="all">Todos os meses</option>
          {F.meses.map((m, i) => <option key={m.key} value={i}>{m.labelLong}</option>)}
        </FilterSelect>
        <FilterSelect value={tagF} onChange={resetPage(setTagF)}>
          <option value="all">Todas as tags</option>
          {allTags.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </FilterSelect>
        <FilterSelect value={contaF} onChange={resetPage(setContaF)}>
          <option value="all">Todas as contas</option>
          {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </FilterSelect>
      </div>

      {/* tabela */}
      <div className="board-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tx-table">
            <thead>
              <tr>
                <th style={{ width: 78 }}>Data</th>
                <th>Descrição</th>
                <th>Tag</th>
                <th>Conta</th>
                <th>Método</th>
                <th style={{ textAlign: "right" }}>Valor</th>
                <th style={{ width: 84, textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((tx) => {
                const ti = F.TIPO_INFO[tx.type];
                return (
                  <tr key={tx.id}>
                    <td style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: "0 3px 3px 0", background: tx.tagColor }} />
                      <span className="num" style={{ color: "var(--text-muted)", fontSize: 13 }}>{String(tx.dia).padStart(2, "0")}/{String(tx.mi + 1).padStart(2, "0")}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{tx.descricao}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, padding: "3px 9px", borderRadius: 999, background: "var(--bg-muted)" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: tx.tagColor }} />{tx.tagNome}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{tx.contaNome}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{tx.metodo}</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 700, color: `var(${ti.cssVar})`, whiteSpace: "nowrap" }}>
                      {ti.sign > 0 ? "+" : "−"}{F.fmt.brl(tx.value).replace("-", "")}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button className="btn-icon" title="Editar" onClick={() => onEdit(tx)}><Icon name="config" size={15} /></button>
                        <button className="btn-icon" title="Excluir" onClick={() => onDelete(tx)} style={{ color: "var(--c-despesa)" }}><Icon name="x" size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Nenhuma transação encontrada</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Ajuste os filtros ou crie uma nova transação.</div>
          </div>
        )}
        {filtered.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 18px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {curPage * PAGE_SIZE + 1}–{Math.min((curPage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" disabled={curPage === 0} onClick={() => setPage(curPage - 1)}
                style={{ opacity: curPage === 0 ? 0.45 : 1, cursor: curPage === 0 ? "default" : "pointer" }}>Anterior</button>
              <button className="btn btn-ghost" disabled={curPage >= totalPages - 1} onClick={() => setPage(curPage + 1)}
                style={{ opacity: curPage >= totalPages - 1 ? 0.45 : 1, cursor: curPage >= totalPages - 1 ? "default" : "pointer" }}>Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { TransacoesScreen });
