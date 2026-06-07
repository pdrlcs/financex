import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./api";

/**
 * Instância única do TanStack Query (PORT_FRONTEND.md §4.3).
 * - staleTime de 30s: evita refetch agressivo entre navegações.
 * - não refaz retry em erros 4xx (input inválido não melhora repetindo).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
