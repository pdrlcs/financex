import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { HealthResponse } from "@/types/api";

/**
 * Checa a conectividade com a API (`GET /api/health`). Usado pelo indicador de
 * status na sidebar — prova que o proxy (Vite/nginx) e o backend respondem.
 */
export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api.get<HealthResponse>("/health", undefined, signal),
    // Re-checa periodicamente para refletir o backend caindo/voltando.
    refetchInterval: 30_000,
    retry: false,
  });
}
