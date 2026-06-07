import { format, parseISO } from "date-fns";
import { Pencil, Plus, RotateCw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContas } from "@/hooks/useContas";
import { usePeriod } from "@/hooks/usePeriod";
import { useTags } from "@/hooks/useTags";
import {
  useTransacaoMutations,
  useTransacoes,
  type TransacaoFilters,
} from "@/hooks/useTransacoes";
import { ApiError } from "@/lib/api";
import { PAYMENT_METHOD_LABEL, TRANSACAO_TIPO_INFO } from "@/lib/constants";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransacaoOut, TransacaoType } from "@/types/api";

import { useTransacaoDialog } from "./transacao-dialog-context";

const ALL = "__all__";
const PAGE_SIZE = 12;

const TYPE_TABS: { value: string; label: string; type?: TransacaoType }[] = [
  { value: "todas", label: "Todas" },
  { value: "despesa", label: "Despesas", type: "despesa" },
  { value: "receita", label: "Receitas", type: "receita" },
  { value: "investimento", label: "Investimentos", type: "investimento" },
  { value: "retirada_investimento", label: "Retiradas", type: "retirada_investimento" },
];

/** Direção no caixa: define o sinal exibido no valor. */
const TX_SIGN: Record<TransacaoType, "+" | "−"> = {
  receita: "+",
  despesa: "−",
  investimento: "−",
  retirada_investimento: "+",
};

export function Transacoes() {
  const { openNew, openEdit } = useTransacaoDialog();
  const { range, options, periodo } = usePeriod();
  const { remove } = useTransacaoMutations();

  const { data: tags } = useTags();
  const { data: contas } = useContas();

  const [tab, setTab] = useState("todas");
  const [tagF, setTagF] = useState<string>(ALL);
  const [contaF, setContaF] = useState<string>(ALL);
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<TransacaoOut | null>(null);

  const activeType = TYPE_TABS.find((t) => t.value === tab)?.type;

  // Filtros estruturais → query params do back. Período vem da navbar.
  const filters: TransacaoFilters = {
    type: activeType,
    tag_id: tagF === ALL ? undefined : Number(tagF),
    account_id: contaF === ALL ? undefined : Number(contaF),
    date_from: range.date_from,
    date_to: range.date_to,
  };
  const { data, isLoading, isError, isFetching, refetch } = useTransacoes(filters);

  // Mapas de lookup (cor/nome) para tags e contas.
  const tagMap = useMemo(
    () => new Map((tags ?? []).map((t) => [t.id, t])),
    [tags],
  );
  const contaMap = useMemo(
    () => new Map((contas ?? []).map((c) => [c.id, c])),
    [contas],
  );

  // Busca textual (descrição + nome da tag) é client-side.
  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const rows = (data ?? [])
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
    if (!q) return rows;
    return rows.filter((tx) => {
      const tagName = tx.tag_id != null ? (tagMap.get(tx.tag_id)?.name ?? "") : "";
      return `${tx.description ?? ""} ${tagName}`.toLowerCase().includes(q);
    });
  }, [data, busca, tagMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(
    curPage * PAGE_SIZE,
    curPage * PAGE_SIZE + PAGE_SIZE,
  );

  // Qualquer mudança de filtro volta à primeira página.
  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };

  const periodLabel =
    options.find((o) => o.id === periodo)?.label ?? "período atual";

  const allTags = tags ?? [];
  const allContas = contas ?? [];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast.success("Transação excluída.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível excluir a transação.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl animate-rise">
      {/* Cabeçalho */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filtered.length} lançamento{filtered.length === 1 ? "" : "s"} ·{" "}
            <span className="font-medium text-foreground">{periodLabel}</span>
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={17} />
          Nova transação
        </Button>
      </div>

      {/* Abas por tipo */}
      <Tabs value={tab} onValueChange={resetPage(setTab)}>
        <TabsList className="flex-wrap">
          {TYPE_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[180px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={busca}
            onChange={(e) => resetPage(setBusca)(e.target.value)}
            placeholder="Buscar descrição ou categoria…"
            className="pl-9"
          />
        </div>
        <Select value={tagF} onValueChange={resetPage(setTagF)}>
          <SelectTrigger className="w-auto min-w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as categorias</SelectItem>
            {allTags.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={contaF} onValueChange={resetPage(setContaF)}>
          <SelectTrigger className="w-auto min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as contas</SelectItem>
            {allContas.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-fx-sm">
        {isError ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
            <p className="text-sm">Não foi possível carregar as transações.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RotateCw size={15} />
              Tentar de novo
            </Button>
          </div>
        ) : isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[52px] animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center gap-1.5 text-center text-muted-foreground">
            <p className="text-sm font-semibold text-foreground">
              Nenhuma transação encontrada
            </p>
            <p className="text-sm">Ajuste os filtros ou o período.</p>
            <button
              type="button"
              onClick={openNew}
              className="mt-1 text-sm font-medium text-primary hover:underline"
            >
              + Nova transação
            </button>
          </div>
        ) : (
          <div className={cn("overflow-x-auto", isFetching && "opacity-60")}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="w-[78px] px-4 py-2.5 font-semibold">Data</th>
                  <th className="px-4 py-2.5 font-semibold">Descrição</th>
                  <th className="px-4 py-2.5 font-semibold">Categoria</th>
                  <th className="px-4 py-2.5 font-semibold">Conta</th>
                  <th className="px-4 py-2.5 font-semibold">Método</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                  <th className="w-[88px] px-4 py-2.5 text-right font-semibold">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((tx) => {
                  const info = TRANSACAO_TIPO_INFO[tx.type];
                  const tag = tx.tag_id != null ? tagMap.get(tx.tag_id) : undefined;
                  const conta = contaMap.get(tx.account_id);
                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <td className="relative px-4 py-2.5">
                        <span
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
                          style={{ background: tag?.color ?? "var(--c-neutro)" }}
                        />
                        <span className="num text-[13px] text-muted-foreground">
                          {format(parseISO(tx.date), "dd/MM")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {tx.description || (
                          <span className="text-muted-foreground">
                            {tag?.name ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {tag ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: tag.color }}
                            />
                            {tag.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Sem categoria
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                        {conta?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                        {tx.payment_method
                          ? PAYMENT_METHOD_LABEL[tx.payment_method]
                          : "—"}
                      </td>
                      <td
                        className="num whitespace-nowrap px-4 py-2.5 text-right font-bold"
                        style={{ color: `var(${info.colorVar})` }}
                      >
                        {TX_SIGN[tx.type]}
                        {fmt.brl(tx.value).replace("-", "")}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            title="Editar"
                            aria-label="Editar transação"
                            onClick={() => openEdit(tx)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            title="Excluir"
                            aria-label="Excluir transação"
                            onClick={() => setDeleteTarget(tx)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-despesa/10 hover:text-despesa"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="num text-[13px] text-muted-foreground">
              {curPage * PAGE_SIZE + 1}–
              {Math.min((curPage + 1) * PAGE_SIZE, filtered.length)} de{" "}
              {filtered.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={curPage === 0}
                onClick={() => setPage(curPage - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={curPage >= totalPages - 1}
                onClick={() => setPage(curPage + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmação de exclusão (soft delete) */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir transação?"
        description={
          deleteTarget
            ? `Lançamento de ${fmt.brl(deleteTarget.value)} em ${format(parseISO(deleteTarget.date), "dd/MM/yyyy")} será removido.`
            : ""
        }
        confirmLabel="Excluir"
        destructive
        loading={remove.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
