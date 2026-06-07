import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ContaCreate, ContaOut, ContaUpdate } from "@/types/api";

/**
 * Contas — queries + mutations (PORT_FRONTEND.md §4.3). Mesma estratégia das
 * tags: uma query traz todas as contas ativas; a tela agrupa por `type`. Toda
 * mutação invalida `["contas"]` e `["graphs"]` (cor/nome de conta muda gráficos).
 */

export const contasKey = ["contas"] as const;

export function useContas() {
  return useQuery({
    queryKey: contasKey,
    queryFn: ({ signal }) => api.get<ContaOut[]>("/contas/", undefined, signal),
  });
}

export function useContaMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: contasKey });
    qc.invalidateQueries({ queryKey: ["graphs"] });
  };

  const create = useMutation({
    mutationFn: (payload: ContaCreate) =>
      api.post<ContaOut>("/contas/", payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ContaUpdate }) =>
      api.put<ContaOut>(`/contas/${id}`, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/contas/${id}`),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
