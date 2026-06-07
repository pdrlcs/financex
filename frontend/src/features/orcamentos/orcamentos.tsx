import { Pencil, Plus, Target, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGraph } from "@/hooks/useGraph";
import { useOrcamentoMutations, useOrcamentos } from "@/hooks/useOrcamentos";
import { useTags } from "@/hooks/useTags";
import { ApiError } from "@/lib/api";
import { MONTHS_PT } from "@/lib/constants";
import { fmt } from "@/lib/format";
import type { OrcamentoCreate, OrcamentoOut } from "@/types/api";
import type { OrcamentoStatus, ProgressoData } from "@/types/graphs";

import { OrcamentoFormDialog } from "./orcamento-form-dialog";

const STATUS_INFO: Record<OrcamentoStatus, { color: string; label: string }> = {
  ok: { color: "var(--c-receita)", label: "No ritmo" },
  atencao: { color: "#F59E0B", label: "Atenção" },
  estourado: { color: "var(--c-despesa)", label: "Estourado" },
};

const now = new Date();
const YEARS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

/** Junta o orçamento (editável) com o realizado/status do gráfico de progresso. */
interface Row {
  orcamento: OrcamentoOut;
  tagName: string;
  tagColor: string;
  limit: number;
  realizado: number;
  percentual: number;
  status: OrcamentoStatus;
}

export function Orcamentos() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrcamentoOut | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrcamentoOut | null>(null);

  const orcamentos = useOrcamentos(year, month);
  const progresso = useGraph<ProgressoData>("orcamento/progresso", { year, month });
  const { data: tags } = useTags();
  const { create, update, remove } = useOrcamentoMutations();

  const tagMap = useMemo(() => new Map((tags ?? []).map((t) => [t.id, t])), [tags]);
  const despesaTags = useMemo(() => (tags ?? []).filter((t) => t.type === "despesa"), [tags]);

  // Merge orçamento + progresso (por nome de tag, único por tipo).
  const rows: Row[] = useMemo(() => {
    const progByTag = new Map(
      (progresso.data?.itens ?? []).map((it) => [it.tag, it]),
    );
    return (orcamentos.data ?? []).map((o) => {
      const tag = tagMap.get(o.tag_id);
      const tagName = tag?.name ?? `Tag #${o.tag_id}`;
      const prog = progByTag.get(tagName);
      const limit = Number(o.limit_value);
      return {
        orcamento: o,
        tagName,
        tagColor: tag?.color ?? "var(--c-neutro)",
        limit,
        realizado: prog?.realizado ?? 0,
        percentual: prog ? prog.percentual : 0,
        status: prog?.status ?? "ok",
      };
    });
  }, [orcamentos.data, progresso.data, tagMap]);

  const totalOrcado = rows.reduce((a, r) => a + r.limit, 0);
  const totalRealizado = rows.reduce((a, r) => a + r.realizado, 0);

  // Na criação, oferece só tags de despesa ainda sem orçamento no mês.
  const usedTagIds = new Set((orcamentos.data ?? []).map((o) => o.tag_id));
  const createOptions = despesaTags.filter((t) => !usedTagIds.has(t.id));
  const editOptions = editTarget
    ? despesaTags.filter((t) => !usedTagIds.has(t.id) || t.id === editTarget.tag_id)
    : despesaTags;

  const openNew = () => {
    setEditTarget(null);
    setFormOpen(true);
  };
  const openEdit = (o: OrcamentoOut) => {
    setEditTarget(o);
    setFormOpen(true);
  };

  const handleSubmit = async (payload: OrcamentoCreate, isEdit: boolean) => {
    try {
      if (isEdit && editTarget) {
        await update.mutateAsync({ id: editTarget.id, payload });
        toast.success("Orçamento atualizado.");
      } else {
        await create.mutateAsync(payload);
        toast.success("Orçamento criado.");
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível salvar o orçamento.",
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast.success("Orçamento removido.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível remover o orçamento.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-rise">
      {/* Cabeçalho */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Limites de gasto por categoria ·{" "}
            <span className="font-medium text-foreground">
              {MONTHS_PT[month - 1]} de {year}
            </span>
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={17} />
          Orçamento
        </Button>
      </div>

      {/* Seletor de mês/ano + resumo */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2.5">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS_PT.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-auto min-w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {rows.length > 0 && (
          <div className="num text-sm text-muted-foreground">
            Realizado{" "}
            <strong className="text-foreground">{fmt.brl(totalRealizado)}</strong> de{" "}
            {fmt.brl(totalOrcado)} orçado
          </div>
        )}
      </div>

      {/* Lista */}
      {orcamentos.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="board-card h-[92px] animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : orcamentos.isError ? (
        <div className="board-card flex flex-col items-center gap-3 py-10 text-muted-foreground">
          <p className="text-sm">Não foi possível carregar os orçamentos.</p>
          <Button variant="outline" size="sm" onClick={() => orcamentos.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="board-card flex flex-col items-center gap-3 py-14 text-center text-muted-foreground">
          <Target size={36} strokeWidth={1.25} />
          <div>
            <div className="text-sm font-semibold text-foreground">
              Nenhum orçamento em {MONTHS_PT[month - 1]}
            </div>
            <div className="mt-0.5 text-sm">
              Defina um limite de gasto para uma categoria de despesa.
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openNew}>
            <Plus size={15} /> Criar orçamento
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const si = STATUS_INFO[r.status];
            const frac = Math.min(r.percentual / 100, 1);
            const over = r.percentual > 100;
            return (
              <div key={r.orcamento.id} className="board-card is-hoverable">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: r.tagColor }}
                    />
                    {r.tagName}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="num text-sm text-muted-foreground">
                      <strong className="text-foreground">{fmt.brl(r.realizado)}</strong> /{" "}
                      {fmt.brl(r.limit)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Editar"
                        aria-label="Editar orçamento"
                        onClick={() => openEdit(r.orcamento)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        title="Remover"
                        aria-label="Remover orçamento"
                        onClick={() => setDeleteTarget(r.orcamento)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-despesa/10 hover:text-despesa"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                    style={{ width: `${frac * 100}%`, background: si.color }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[12px]">
                  <span className="font-semibold" style={{ color: si.color }}>
                    {si.label}
                  </span>
                  <span
                    className="num"
                    style={{
                      color: over ? "var(--c-despesa)" : "var(--text-muted)",
                      fontWeight: over ? 700 : 500,
                    }}
                  >
                    {fmt.pct(r.percentual, 0)}
                    {over ? " · acima do limite" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <OrcamentoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarget}
        tagOptions={editTarget ? editOptions : createOptions}
        year={year}
        month={month}
        submitting={create.isPending || update.isPending}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remover orçamento?"
        description={
          deleteTarget
            ? `O limite de ${fmt.brl(deleteTarget.limit_value)} para ${
                tagMap.get(deleteTarget.tag_id)?.name ?? "esta categoria"
              } em ${MONTHS_PT[month - 1]} será removido.`
            : ""
        }
        confirmLabel="Remover"
        destructive
        loading={remove.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
