/**
 * Shapes de saída dos endpoints `/graphs` (GRAFICOS.md + app/graphs/queries.py).
 * O backend já devolve no padrão Chart.js; aqui só tipamos o contrato. Valores
 * monetários nos gráficos chegam como `number` (float), diferente dos schemas
 * `*Out` de CRUD onde Decimal vira string.
 */

/** Dataset genérico no padrão Chart.js. */
export interface GraphDataset {
  label?: string;
  data: (number | null)[];
  type?: "bar" | "line";
  backgroundColor?: string | string[];
  borderColor?: string;
}

/** Resposta padrão labels + datasets (a maioria dos endpoints). */
export interface GraphData {
  labels: string[];
  datasets: GraphDataset[];
}

// ─── A1 — Resumo / KPIs ───────────────────────────────────────────────────────

export interface ResumoData {
  receitas: number;
  despesas: number;
  saldo: number;
  investido_liquido: number;
  /** 0–1; null quando receitas = 0. */
  taxa_poupanca: number | null;
}

// ─── B4 — Variação (meta com absolutos por tag) ───────────────────────────────

export interface VariacaoData extends GraphData {
  meta: {
    absolutos: Record<string, { atual: number; anterior: number }>;
  };
}

// ─── E1 — Heatmap ─────────────────────────────────────────────────────────────

export interface HeatmapDay {
  date: string;
  value: number;
}

export interface HeatmapData {
  dias: HeatmapDay[];
  max: number;
}

// ─── F1 — Run-rate ────────────────────────────────────────────────────────────

export interface RunRateData {
  gasto_ate_agora: number;
  dia_atual: number;
  dias_no_mes: number;
  projecao_fim_mes: number;
}

// ─── F3 — Tendência ───────────────────────────────────────────────────────────

export interface TendenciaData extends GraphData {
  projecao: {
    inclinacao: number;
    proximo_mes: number | null;
    dois_meses: number | null;
  };
}

// ─── G2 — Progresso do orçamento ──────────────────────────────────────────────

export type OrcamentoStatus = "ok" | "atencao" | "estourado";

export interface ProgressoItem {
  tag: string;
  limit_value: number;
  realizado: number;
  percentual: number;
  status: OrcamentoStatus;
}

export interface ProgressoData {
  itens: ProgressoItem[];
}

// ─── G3 — Alerta de estouro ───────────────────────────────────────────────────

export interface AlertaItem {
  tag: string;
  limit_value: number;
  realizado: number;
  projecao_fim_mes: number;
  excesso_projetado: number;
}

export interface AlertaData {
  alertas: AlertaItem[];
}
