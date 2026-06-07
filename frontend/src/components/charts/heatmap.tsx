/**
 * E1 — Mapa de calor de gastos (GRAFICOS.md). Render em grid CSS (sem plugin
 * matrix), 7 colunas Seg→Dom, intensidade relativa ao período (value / max). O
 * backend devolve só os dias com despesa; aqui montamos a grade contínua do
 * range e preenchemos o resto com zero.
 */
import { fmt } from "@/lib/format";
import type { HeatmapData } from "@/types/graphs";

import { cssVar, hexA } from "./chart-setup";

const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Offset Monday-first: 0 = segunda … 6 = domingo. */
function mondayOffset(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function cellColor(t: number): string {
  if (t <= 0.001) return "var(--bg-muted)";
  return hexA(cssVar("--c-despesa") || "#EF4444", 0.12 + t * 0.78);
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

  // Células: vazios de alinhamento + um quadrado por dia do range.
  const cells: ({ key: string; day: number; value: number } | null)[] = [];
  for (let i = 0; i < mondayOffset(from); i++) cells.push(null);
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    cells.push({ key: iso, day: d.getDate(), value: valueByDate.get(iso) ?? 0 });
  }

  const intensity = (v: number) => (data.max > 0 ? v / data.max : 0);

  return (
    <div>
      <div className="grid grid-cols-7 gap-[7px]">
        {DOW.map((d) => (
          <div
            key={d}
            className="pb-0.5 text-center text-[11px] font-semibold text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((c, i) =>
          c === null ? (
            <div key={`e${i}`} />
          ) : (
            <div
              key={c.key}
              title={`${c.key} — ${fmt.brl(c.value)}`}
              className="num flex aspect-square items-start justify-end rounded-lg border border-border p-[5px] text-[10.5px] font-semibold transition-transform hover:scale-[1.08]"
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
      <div className="mt-4 flex items-center justify-end gap-2 text-[11.5px] text-muted-foreground">
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
