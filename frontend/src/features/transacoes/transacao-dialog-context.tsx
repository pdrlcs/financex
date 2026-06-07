import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { useContas } from "@/hooks/useContas";
import { useTags } from "@/hooks/useTags";
import { useTransacaoMutations } from "@/hooks/useTransacoes";
import { ApiError } from "@/lib/api";
import { fmt } from "@/lib/format";
import { TRANSACAO_TIPO_INFO } from "@/lib/constants";
import type { TransacaoCreate, TransacaoOut } from "@/types/api";

import { TransacaoFormDialog } from "./transacao-form-dialog";

/**
 * Provider global do modal de transação. Renderiza o modal uma única vez no
 * topo da árvore e expõe `openNew()` / `openEdit(tx)`. Assim a navbar
 * ("+ Nova transação") e a tela de Transações compartilham o mesmo formulário,
 * mutations e invalidação. Carrega tags/contas via hooks (deduplicados pelo
 * TanStack Query).
 */

interface TransacaoDialogContextValue {
  openNew: () => void;
  openEdit: (tx: TransacaoOut) => void;
}

const TransacaoDialogContext = createContext<TransacaoDialogContextValue | null>(
  null,
);

/** Erro do back → mensagem pt-BR amigável. */
function errorToMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 422) {
      return "Dados inválidos: confira valor, conta e categoria.";
    }
    return error.message;
  }
  return "Não foi possível salvar a transação.";
}

export function TransacaoDialogProvider({ children }: { children: ReactNode }) {
  const { data: tags } = useTags();
  const { data: contas } = useContas();
  const { create, update } = useTransacaoMutations();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TransacaoOut | null>(null);

  const openNew = useCallback(() => {
    if (!contas || contas.length === 0) {
      toast.warning("Crie uma conta antes de lançar transações.");
      return;
    }
    setEditing(null);
    setOpen(true);
  }, [contas]);

  const openEdit = useCallback((tx: TransacaoOut) => {
    setEditing(tx);
    setOpen(true);
  }, []);

  const handleSubmit = async (payload: TransacaoCreate, isEdit: boolean) => {
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ id: editing.id, payload });
      } else {
        await create.mutateAsync(payload);
      }
      const label = TRANSACAO_TIPO_INFO[payload.type].label;
      toast.success(
        `${label} de ${fmt.brl(payload.value)} ${isEdit ? "atualizada" : "criada"}.`,
      );
      setOpen(false);
    } catch (error) {
      toast.error(errorToMessage(error));
    }
  };

  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit]);

  return (
    <TransacaoDialogContext.Provider value={value}>
      {children}
      <TransacaoFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        tags={tags ?? []}
        contas={contas ?? []}
        submitting={create.isPending || update.isPending}
        onSubmit={handleSubmit}
      />
    </TransacaoDialogContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTransacaoDialog(): TransacaoDialogContextValue {
  const ctx = useContext(TransacaoDialogContext);
  if (!ctx) {
    throw new Error(
      "useTransacaoDialog deve ser usado dentro de <TransacaoDialogProvider>.",
    );
  }
  return ctx;
}
