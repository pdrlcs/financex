import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  TransacaoCreate,
  TransacaoOut,
  TransacaoType,
  TransacaoUpdate,
} from "@/types/api";

/**
 * Transações — queries + mutations (PORT_FRONTEND.md §4.3). Os filtros
 * estruturais (type, tag, conta, range de datas) vão como query params ao back
 * (`GET /transacoes/`); busca textual e paginação ficam no cliente. Toda
 * mutação invalida `["transacoes"]` (todas as variações de filtro) e também
 * `["graphs"]` — criar/editar/excluir transação muda as agregações.
 */

export type TransacaoFilters = {
  type?: TransacaoType;
  tag_id?: number;
  account_id?: number;
  date_from?: string;
  date_to?: string;
  // Índice compatível com o tipo Query do wrapper api.
  [key: string]: string | number | undefined;
};

export const transacoesKey = ["transacoes"] as const;

export function useTransacoes(filters: TransacaoFilters) {
  return useQuery({
    queryKey: [...transacoesKey, filters],
    queryFn: ({ signal }) =>
      api.get<TransacaoOut[]>("/transacoes/", filters, signal),
    // Mantém a lista anterior visível enquanto refaz a query ao trocar filtro.
    placeholderData: keepPreviousData,
  });
}

export function useTransacaoMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: transacoesKey });
    qc.invalidateQueries({ queryKey: ["graphs"] });
  };

  const create = useMutation({
    mutationFn: (payload: TransacaoCreate) =>
      api.post<TransacaoOut>("/transacoes/", payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TransacaoUpdate }) =>
      api.put<TransacaoOut>(`/transacoes/${id}`, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/transacoes/${id}`),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
