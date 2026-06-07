import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { OrcamentoCreate, OrcamentoOut, OrcamentoUpdate } from "@/types/api";

/**
 * Orçamentos — queries + mutations (PORT_FRONTEND.md §4.7). A lista é por mês
 * (year/month). Toda mutação invalida `["orcamentos"]` e `["graphs"]` (os
 * gráficos de orçamento — G1/G2/G3 — dependem dos limites).
 */

export const orcamentosKey = ["orcamentos"] as const;

export function useOrcamentos(year: number, month: number) {
  return useQuery({
    queryKey: [...orcamentosKey, { year, month }],
    queryFn: ({ signal }) =>
      api.get<OrcamentoOut[]>("/orcamentos/", { year, month }, signal),
  });
}

export function useOrcamentoMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: orcamentosKey });
    qc.invalidateQueries({ queryKey: ["graphs"] });
  };

  const create = useMutation({
    mutationFn: (payload: OrcamentoCreate) =>
      api.post<OrcamentoOut>("/orcamentos/", payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OrcamentoUpdate }) =>
      api.put<OrcamentoOut>(`/orcamentos/${id}`, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/orcamentos/${id}`),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
