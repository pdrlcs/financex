import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { MercadoBtc } from "@/types/api";

export function useBtcQuote() {
  return useQuery({
    queryKey: ["mercado", "btc"],
    queryFn: ({ signal }) => api.get<MercadoBtc>("/mercado/btc", undefined, signal),
    refetchInterval: 60_000, // poll a cada 60s
    staleTime: 50_000,
  });
}
