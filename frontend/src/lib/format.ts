/**
 * Formatação pt-BR (GRAFICOS.md → Formatação). Sobrevivente do `data.js` do
 * protótipo (PORT_FRONTEND.md §2). Valores monetários chegam da API como
 * string (Decimal) — as funções aceitam number | string e fazem o parse.
 */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

function toNumber(v: number | string): number {
  return typeof v === "number" ? v : Number(v);
}

export const fmt = {
  /** R$ 1.234,56 */
  brl: (v: number | string): string => brl.format(toNumber(v)),

  /** R$ 1,2 mil — para eixos de gráfico e KPIs apertados. */
  brlCompact: (v: number | string): string => brlCompact.format(toNumber(v)),

  /** 12,5% */
  pct: (n: number, dec = 1): string =>
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    }).format(n) + "%",

  /** Sinal explícito (+/−) para deltas monetários. Usa o minus tipográfico. */
  signed: (v: number | string): string => {
    const n = toNumber(v);
    return (n >= 0 ? "+" : "−") + brl.format(Math.abs(n));
  },

  /** Sinal explícito (+/−) para deltas percentuais. */
  signedPct: (n: number, dec = 1): string =>
    (n >= 0 ? "+" : "−") + fmt.pct(Math.abs(n), dec),

  /** 0,00310000 BTC */
  btc: (v: number | string): string =>
    `${new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    }).format(toNumber(v))} BTC`,
};
