import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { MercadoBtc, MercadoCdi } from "@/types/api";

export function useBtcQuote() {
  return useQuery({
    queryKey: ["mercado", "btc"],
    queryFn: ({ signal }) => api.get<MercadoBtc>("/mercado/btc", undefined, signal),
    refetchInterval: 60_000, // poll a cada 60s
    staleTime: 50_000,
  });
}

export function useCdiRate() {
  return useQuery({
    queryKey: ["mercado", "cdi"],
    queryFn: ({ signal }) => api.get<MercadoCdi>("/mercado/cdi", undefined, signal),
    staleTime: 6 * 3600_000, // 6h — CDI muda no máximo 1x/dia
  });
}
