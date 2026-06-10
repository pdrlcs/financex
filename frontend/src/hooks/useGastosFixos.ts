import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  GastoFixoCreate,
  GastoFixoOut,
  GastoFixoStatus,
  GastoFixoUpdate,
  MarcarPagoPayload,
  TransacaoOut,
} from "@/types/api";

export const gastosFixosKey = ["gastos-fixos"] as const;

export function useGastosFixos() {
  return useQuery({
    queryKey: [...gastosFixosKey, "templates"],
    queryFn: ({ signal }) => api.get<GastoFixoOut[]>("/gastos-fixos/", undefined, signal),
  });
}

export function useGastosFixosStatus(year: number, month: number) {
  return useQuery({
    queryKey: [...gastosFixosKey, "status", { year, month }],
    queryFn: ({ signal }) =>
      api.get<GastoFixoStatus[]>("/gastos-fixos/status", { year, month }, signal),
  });
}

export function useGastoFixoMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: gastosFixosKey });
    qc.invalidateQueries({ queryKey: ["transacoes"] });
    qc.invalidateQueries({ queryKey: ["orcamentos"] });
    qc.invalidateQueries({ queryKey: ["graphs"] });
  };

  const create = useMutation({
    mutationFn: (payload: GastoFixoCreate) =>
      api.post<GastoFixoOut>("/gastos-fixos/", payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: GastoFixoUpdate }) =>
      api.put<GastoFixoOut>(`/gastos-fixos/${id}`, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete<void>(`/gastos-fixos/${id}`),
    onSuccess: invalidate,
  });

  const marcarPago = useMutation({
    mutationFn: ({
      id,
      year,
      month,
      payload,
    }: {
      id: number;
      year: number;
      month: number;
      payload: MarcarPagoPayload;
    }) =>
      api.post<TransacaoOut>(
        `/gastos-fixos/${id}/marcar-pago`,
        payload,
        { year, month },
      ),
    onSuccess: invalidate,
  });

  const desmarcar = useMutation({
    mutationFn: ({ id, year, month }: { id: number; year: number; month: number }) =>
      api.delete<void>(`/gastos-fixos/${id}/pagamento?year=${year}&month=${month}`),
    onSuccess: invalidate,
  });

  return { create, update, remove, marcarPago, desmarcar };
}
