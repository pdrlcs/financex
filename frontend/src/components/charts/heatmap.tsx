/**
 * E1 — Mapa de calor de gastos (GRAFICOS.md). Um mini-calendário por mês do
 * range (cabeçalho Seg→Dom em cima, semanas descendo), lado a lado: até 3 por
 * linha, centralizados quando sobra espaço. Intensidade relativa ao período
 * (value / max). O backend devolve só os dias com despesa; os demais ficam zero.
 */
import { fmt } from "@/lib/format";
import type { HeatmapData } from "@/types/graphs";

import { cssVar, hexA } from "./chart-setup";

const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Offset Monday-first: 0 = segunda … 6 = domingo. */
function mondayOffset(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function cellColor(t: number): string {
  if (t <= 0.001) return "var(--bg-muted)";
  return hexA(cssVar("--c-despesa") || "#EF4444", 0.12 + t * 0.78);
}

type Cell = { key: string; day: number; value: number } | null;

/** Células de um mês: vazios de alinhamento + um quadrado por dia. */
function monthCells(
  year: number,
  month: number,
  valueByDate: Map<string, number>,
): Cell[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Cell[] = [];
  for (let i = 0; i < mondayOffset(first); i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ key: iso, day, value: valueByDate.get(iso) ?? 0 });
  }
  return cells;
}

/** Um mini-calendário (header de dias + grade do mês). */
function MonthGrid({
  label,
  cells,
  intensity,
}: {
  label: string;
  cells: Cell[];
  intensity: (v: number) => number;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-1.5 text-center text-[12px] font-semibold capitalize">
        {label}
      </div>
      <div
        className="grid grid-cols-7 gap-[6px]"
        style={{ gridTemplateColumns: "repeat(7, 30px)" }}
      >
        {DOW.map((d) => (
          <div
            key={d}
            className="pb-0.5 text-center text-[10px] font-semibold text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((c, i) =>
          c === null ? (
            <div key={`e${i}`} className="h-[30px]" />
          ) : (
            <div
              key={c.key}
              title={`${c.key} — ${fmt.brl(c.value)}`}
              className="num flex h-[30px] items-start justify-end rounded-md border border-border p-[3px] text-[9px] font-semibold transition-transform hover:scale-[1.12]"
              style={{
                background: cellColor(intensity(c.value)),
                color: intensity(c.value) > 0.55 ? "#fff" : "var(--text-muted)",
              }}
            >
              {c.day}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function Heatmap({
  data,
  dateFrom,
  dateTo,
}: {
  data: HeatmapData;
  dateFrom: string;
  dateTo: string;
}) {
  const valueByDate = new Map(data.dias.map((d) => [d.date, d.value]));
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);

  // Lista de meses tocados pelo range (1º dia de cada mês, do início ao fim).
  const months: { year: number; month: number }[] = [];
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const lastMonth = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= lastMonth) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const intensity = (v: number) => (data.max > 0 ? v / data.max : 0);

  return (
    <div>
      {/* max-w comporta exatamente 3 meses (246px cada + gap); flex-wrap +
          justify-center fazem o restante centralizar quando sobra espaço. */}
      <div className="mx-auto flex max-w-[802px] flex-wrap justify-center gap-x-8 gap-y-6">
        {months.map(({ year, month }) => (
          <MonthGrid
            key={`${year}-${month}`}
            label={`${MONTHS[month]} ${year}`}
            cells={monthCells(year, month, valueByDate)}
            intensity={intensity}
          />
        ))}
      </div>
      <div className="mt-6 flex items-center justify-end gap-2 text-[11.5px] text-muted-foreground">
        <span>Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span
            key={t}
            className="h-4 w-4 rounded-[5px] border border-border"
            style={{ background: cellColor(t) }}
          />
        ))}
        <span>Mais · até {fmt.brl(data.max)}/dia</span>
      </div>
    </div>
  );
}
