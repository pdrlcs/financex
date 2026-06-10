import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { InvestimentoBtcResumo } from "@/types/api";

export function useBtcResumo() {
  return useQuery({
    queryKey: ["investimentos", "btc"],
    queryFn: ({ signal }) =>
      api.get<InvestimentoBtcResumo>("/investimentos/btc/resumo", undefined, signal),
    refetchInterval: 60_000,
  });
}
