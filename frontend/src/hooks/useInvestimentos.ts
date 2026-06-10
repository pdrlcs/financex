import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { InvestimentoBtcResumo, InvestimentoCdiResumo } from "@/types/api";

export function useBtcResumo() {
  return useQuery({
    queryKey: ["investimentos", "btc"],
    queryFn: ({ signal }) =>
      api.get<InvestimentoBtcResumo>("/investimentos/btc/resumo", undefined, signal),
    refetchInterval: 60_000,
  });
}

export function useCdiResumo() {
  return useQuery({
    queryKey: ["investimentos", "cdi"],
    queryFn: ({ signal }) =>
      api.get<InvestimentoCdiResumo>("/investimentos/cdi/resumo", undefined, signal),
  });
}
