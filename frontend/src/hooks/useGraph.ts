import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { PeriodRange } from "@/hooks/usePeriod";

/**
 * Hook genérico para os endpoints de `/graphs` (PORT_FRONTEND.md §4.3). Todas as
 * mutations de CRUD invalidam `["graphs"]`, então qualquer gráfico se atualiza
 * quando os dados mudam. O período global e o `exclude_tags` por card entram como
 * params e fazem parte da queryKey (refetch automático ao mudar).
 */

export interface GraphParams {
  date_from?: string;
  date_to?: string;
  type?: string;
  granularity?: string;
  /** CSV de IDs de tag (ex: "1,4,9"). */
  exclude_tags?: string;
  agregacao?: string;
  limit?: number;
  window?: number;
  year?: number;
  month?: number;
}

export function useGraph<T>(endpoint: string, params: GraphParams = {}) {
  return useQuery({
    queryKey: ["graphs", endpoint, params],
    queryFn: ({ signal }) =>
      api.get<T>(`/graphs/${endpoint}`, params as Record<string, string | number>, signal),
  });
}

/** Junta range global + exclude_tags (IDs) nos params comuns de `/graphs`. */
export function graphParams(range: PeriodRange, excludeTags: number[] = []): GraphParams {
  return {
    date_from: range.date_from,
    date_to: range.date_to,
    exclude_tags: excludeTags.length ? excludeTags.join(",") : undefined,
  };
}

/**
 * Range imediatamente anterior, de mesmo tamanho (para deltas dos KPIs). Espelha
 * a lógica do backend (`variacao_tags`): se o range é um mês-calendário cheio,
 * usa o mês anterior; senão, a janela de mesma duração logo antes de date_from.
 */
export function previousRange(range: PeriodRange): PeriodRange {
  const from = new Date(`${range.date_from}T00:00:00`);
  const to = new Date(`${range.date_to}T00:00:00`);

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  const isFullMonth =
    from.getDate() === 1 &&
    to.getDate() === lastDay(to.getFullYear(), to.getMonth()) &&
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth();

  if (isFullMonth) {
    const prevMonth = from.getMonth() === 0 ? 11 : from.getMonth() - 1;
    const prevYear = from.getMonth() === 0 ? from.getFullYear() - 1 : from.getFullYear();
    return {
      date_from: iso(new Date(prevYear, prevMonth, 1)),
      date_to: iso(new Date(prevYear, prevMonth, lastDay(prevYear, prevMonth))),
    };
  }

  const dayMs = 86_400_000;
  const durationDays = Math.round((to.getTime() - from.getTime()) / dayMs) + 1;
  const prevTo = new Date(from.getTime() - dayMs);
  const prevFrom = new Date(prevTo.getTime() - (durationDays - 1) * dayMs);
  return { date_from: iso(prevFrom), date_to: iso(prevTo) };
}
