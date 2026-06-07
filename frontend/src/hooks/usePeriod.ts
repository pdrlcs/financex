import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Período global do Dashboard (PORT_FRONTEND.md §4.4). Vive nos search params
 * da URL (`?periodo=<id>`) — compartilhável e sobrevive a refresh. Resolve para
 * um range `{ date_from, date_to }` (ISO "YYYY-MM-DD") consumido pelos
 * endpoints `/graphs`.
 */

export type PeriodId = "mes-atual" | "mes-anterior" | "3m" | "6m" | "ano";

export interface PeriodOption {
  id: PeriodId;
  label: string;
  /** Subtítulo descritivo, calculado sobre a data atual. */
  sub: string;
}

export interface PeriodRange {
  date_from: string;
  date_to: string;
}

const DEFAULT_PERIOD: PeriodId = "mes-atual";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Calcula o range de cada preset relativo à data informada. */
function resolveRange(id: PeriodId, now: Date): PeriodRange {
  switch (id) {
    case "mes-anterior": {
      const ref = subMonths(now, 1);
      return { date_from: iso(startOfMonth(ref)), date_to: iso(endOfMonth(ref)) };
    }
    case "3m":
      return {
        date_from: iso(startOfMonth(subMonths(now, 2))),
        date_to: iso(endOfMonth(now)),
      };
    case "6m":
      return {
        date_from: iso(startOfMonth(subMonths(now, 5))),
        date_to: iso(endOfMonth(now)),
      };
    case "ano":
      return { date_from: iso(startOfYear(now)), date_to: iso(endOfYear(now)) };
    case "mes-atual":
    default:
      return { date_from: iso(startOfMonth(now)), date_to: iso(endOfMonth(now)) };
  }
}

function buildOptions(now: Date): PeriodOption[] {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const monthLabel = (d: Date) => capitalize(format(d, "LLLL 'de' yyyy"));
  const range = (id: PeriodId) => {
    const r = resolveRange(id, now);
    return `${format(new Date(r.date_from), "dd/MM")} – ${format(new Date(r.date_to), "dd/MM/yyyy")}`;
  };

  return [
    { id: "mes-atual", label: monthLabel(now), sub: range("mes-atual") },
    { id: "mes-anterior", label: monthLabel(subMonths(now, 1)), sub: range("mes-anterior") },
    { id: "3m", label: "Últimos 3 meses", sub: range("3m") },
    { id: "6m", label: "Últimos 6 meses", sub: range("6m") },
    { id: "ano", label: `Ano de ${format(now, "yyyy")}`, sub: range("ano") },
  ];
}

function parsePeriod(value: string | null): PeriodId {
  const valid: PeriodId[] = ["mes-atual", "mes-anterior", "3m", "6m", "ano"];
  return valid.includes(value as PeriodId) ? (value as PeriodId) : DEFAULT_PERIOD;
}

export function usePeriod() {
  const [searchParams, setSearchParams] = useSearchParams();
  const periodo = parsePeriod(searchParams.get("periodo"));

  // Data de referência fixada por render — evita recomputar ranges a cada chamada.
  const now = useMemo(() => new Date(), []);
  const options = useMemo(() => buildOptions(now), [now]);
  const range = useMemo(() => resolveRange(periodo, now), [periodo, now]);

  const setPeriodo = useCallback(
    (next: PeriodId) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === DEFAULT_PERIOD) {
            params.delete("periodo");
          } else {
            params.set("periodo", next);
          }
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { periodo, setPeriodo, range, options };
}
