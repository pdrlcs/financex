import { Plus, RotateCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EntityCard } from "@/components/entity-card";
import {
  EntityFormDialog,
  type EntityFormValues,
  type TypeOption,
} from "@/components/entity-form-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api";

/** Shape mínimo compartilhado por TagOut e ContaOut. */
interface EntityBase<TType extends string> {
  id: number;
  name: string;
  type: TType;
  color: string;
}

/** Textos pt-BR por tipo de entidade. */
interface KindCopy {
  newLabel: string;
  noun: string; // "tag" | "conta"
  countLabel: (n: number) => string;
  formNew: string;
  formEdit: string;
  formSubtitle: string;
  namePlaceholder: string;
  typeHint?: string;
  previewFallback: string;
  emptyHint: string;
}

const COPY: Record<"tag" | "conta", KindCopy> = {
  tag: {
    newLabel: "Nova tag",
    noun: "Tag",
    countLabel: (n) => `${n} ${n === 1 ? "categoria" : "categorias"}`,
    formNew: "Nova tag",
    formEdit: "Editar tag",
    formSubtitle: "A cor aparece nos gráficos por categoria.",
    namePlaceholder: "ex: Alimentação",
    typeHint: "Define com quais transações a tag é compatível.",
    previewFallback: "Nome da tag",
    emptyHint: "Crie a primeira tag deste tipo.",
  },
  conta: {
    newLabel: "Nova conta",
    noun: "Conta",
    countLabel: (n) => `${n} ${n === 1 ? "conta" : "contas"}`,
    formNew: "Nova conta",
    formEdit: "Editar conta",
    formSubtitle: "A cor aparece nos gráficos por conta.",
    namePlaceholder: "ex: Nubank",
    previewFallback: "Nome da conta",
    emptyHint: "Crie a primeira conta deste tipo.",
  },
};

/** Erro vindo do back → mensagem pt-BR amigável. */
function errorToMessage(kind: "tag" | "conta", error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return kind === "tag"
        ? "Já existe uma tag com esse nome e tipo."
        : "Já existe uma conta com esse nome.";
    }
    return error.message;
  }
  return "Não foi possível concluir a operação.";
}

interface EntityManagerProps<TType extends string> {
  kind: "tag" | "conta";
  typeOptions: TypeOption<TType>[];
  typeLabel: Record<TType, string>;
  items: EntityBase<TType>[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onCreate: (values: EntityFormValues<TType>) => Promise<unknown>;
  onUpdate: (id: number, values: EntityFormValues<TType>) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
  submitting: boolean;
  deleting: boolean;
}

/**
 * Tela genérica de Tags/Contas (tags-screen e contas-screen do protótipo):
 * cabeçalho + abas por tipo + grid de cards coloridos + CRUD (modal de
 * criar/editar, confirmação de soft delete), com toasts e estados de
 * loading/empty/erro. O `kind` parametriza apenas textos e opções de tipo.
 */
export function EntityManager<TType extends string>({
  kind,
  typeOptions,
  typeLabel,
  items,
  isLoading,
  isError,
  onRetry,
  onCreate,
  onUpdate,
  onDelete,
  submitting,
  deleting,
}: EntityManagerProps<TType>) {
  const copy = COPY[kind];
  const [tab, setTab] = useState<TType>(typeOptions[0].value);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EntityBase<TType> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EntityBase<TType> | null>(
    null,
  );

  const total = items?.length ?? 0;
  const list = (items ?? []).filter((it) => it.type === tab);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (item: EntityBase<TType>) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleSubmit = async (values: EntityFormValues<TType>) => {
    try {
      if (editing) {
        await onUpdate(editing.id, values);
        toast.success(`${copy.noun} atualizada.`);
      } else {
        await onCreate(values);
        toast.success(`${copy.noun} criada.`);
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(errorToMessage(kind, error));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
      toast.success(`${copy.noun} excluída.`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(errorToMessage(kind, error));
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-rise">
      {/* Cabeçalho */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {kind === "tag" ? "Tags" : "Contas"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {copy.countLabel(total)} · a cor define a aparência nos gráficos
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={17} />
          {copy.newLabel}
        </Button>
      </div>

      {/* Abas por tipo */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TType)}>
        <TabsList>
          {typeOptions.map((opt) => (
            <TabsTrigger key={opt.value} value={opt.value}>
              {opt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Conteúdo */}
      <div className="mt-4">
        {isError ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border text-muted-foreground">
            <p className="text-sm">Não foi possível carregar.</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCw size={15} />
              Tentar de novo
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[76px] animate-pulse rounded-lg border border-border bg-muted/60"
              />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-center text-muted-foreground">
            <p className="text-sm">
              Nenhuma {copy.noun.toLowerCase()} de{" "}
              {typeLabel[tab].toLowerCase()}.
            </p>
            <button
              type="button"
              onClick={openNew}
              className="text-sm font-medium text-primary hover:underline"
            >
              {copy.emptyHint}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((item) => (
              <EntityCard
                key={item.id}
                color={item.color}
                title={item.name}
                subtitle={typeLabel[item.type]}
                onEdit={() => openEdit(item)}
                onDelete={() => setDeleteTarget(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      <EntityFormDialog<TType>
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        defaultType={editing?.type ?? tab}
        typeOptions={typeOptions}
        title={editing ? copy.formEdit : copy.formNew}
        subtitle={copy.formSubtitle}
        namePlaceholder={copy.namePlaceholder}
        typeHint={copy.typeHint}
        previewFallback={copy.previewFallback}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      {/* Confirmação de exclusão (soft delete) */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Excluir ${copy.noun.toLowerCase()}?`}
        description={
          deleteTarget
            ? `"${deleteTarget.name}" será desativada. As transações já lançadas são mantidas.`
            : ""
        }
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
