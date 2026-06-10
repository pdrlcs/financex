/**
 * Tipos espelhando os schemas Pydantic do backend (PLANEJAMENTO_BACK.md) e os
 * enums em app/models.py. Esta é a fonte de verdade do shape da API no front.
 *
 * Convenções:
 * - `value` / `limit_value` vêm como string no JSON (Decimal serializado pelo
 *   Pydantic) — mantemos como string e convertemos só na formatação/parse.
 * - datas (`date`) chegam como ISO "YYYY-MM-DD"; timestamps como ISO 8601.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export const TRANSACAO_TYPES = [
  "despesa",
  "receita",
  "investimento",
  "retirada_investimento",
  "compra_cripto",
  "venda_cripto",
] as const;
export type TransacaoType = (typeof TRANSACAO_TYPES)[number];

export const TAG_TYPES = ["despesa", "receita", "investimento"] as const;
export type TagType = (typeof TAG_TYPES)[number];

export const PAYMENT_METHODS = ["pix", "card", "cash", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CONTA_TYPES = ["banco", "investimento", "carteira"] as const;
export type ContaType = (typeof CONTA_TYPES)[number];

export const INDEXADORES = ["cdi"] as const;
export type Indexador = (typeof INDEXADORES)[number];

// ─── Campos comuns (TimestampMixin) ───────────────────────────────────────────

interface BaseEntity {
  id: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Tag ───────────────────────────────────────────────────────────────────

export interface TagOut extends BaseEntity {
  name: string;
  type: TagType;
  color: string;
}

export interface TagCreate {
  name: string;
  type: TagType;
  color: string;
}

export type TagUpdate = Partial<TagCreate>;

// ─── Conta ─────────────────────────────────────────────────────────────────

export interface ContaOut extends BaseEntity {
  name: string;
  type: ContaType;
  color: string;
  indexador: Indexador | null;
  indexador_percent: string | null;
}

export interface ContaCreate {
  name: string;
  type: ContaType;
  color: string;
  indexador?: Indexador | null;
  indexador_percent?: string | null;
}

export type ContaUpdate = Partial<ContaCreate>;

// ─── Transacao ───────────────────────────────────────────────────────────────

export interface TransacaoOut extends BaseEntity {
  type: TransacaoType;
  value: string;
  date: string;
  description: string | null;
  account_id: number;
  tag_id: number | null;
  payment_method: PaymentMethod | null;
  quantity?: string | null;
}

export interface TransacaoCreate {
  type: TransacaoType;
  value: string;
  date: string;
  description?: string | null;
  account_id: number;
  tag_id?: number | null;
  payment_method?: PaymentMethod | null;
  quantity?: string | null;
}

export type TransacaoUpdate = Partial<TransacaoCreate>;

// ─── Orcamento ─────────────────────────────────────────────────────────────

export interface OrcamentoOut extends BaseEntity {
  tag_id: number;
  year: number;
  month: number;
  limit_value: string;
}

export interface OrcamentoCreate {
  tag_id: number;
  year: number;
  month: number;
  limit_value: string;
}

export type OrcamentoUpdate = Partial<OrcamentoCreate>;

// ─── Respostas utilitárias ────────────────────────────────────────────────────

/** Resposta de POST /transacoes/import/csv. */
export interface ImportResult {
  importadas: number;
  erros: number;
}

/** Item de tag/conta no export/import de configs (sem id/timestamps). */
export interface ConfigTagItem {
  name: string;
  type: TagType;
  color: string;
}

export interface ConfigContaItem {
  name: string;
  type: ContaType;
  color: string;
}

/** Resposta de GET /configs/export (e corpo de POST /configs/import). */
export interface ConfigsExport {
  tags: ConfigTagItem[];
  contas: ConfigContaItem[];
}

/** Resposta de POST /configs/import (merge). */
export interface ConfigImportResult {
  tags: { criadas: number; ignoradas: number };
  contas: { criadas: number; ignoradas: number };
}

// ─── Mercado / Investimentos (BTC) ────────────────────────────────────────────

export interface MercadoBtc {
  available: boolean;
  price?: number;
  change_pct?: number;
  updated_at?: string | null;
  source: string;
}

export interface InvestimentoBtcResumo {
  available: boolean;
  quantidade_btc: number;
  custo_medio: number | null;
  investido_liquido: number;
  preco_atual: number | null;
  valor_atual: number | null;
  lucro_prejuizo: number | null;
  lucro_pct: number | null;
  updated_at?: string | null;
}

export interface MercadoCdi {
  available: boolean;
  annual_rate?: number;
  date?: string | null;
  source: string;
}

export interface InvestimentoCdiContaResumo {
  conta_id: number;
  conta_nome: string;
  percent: number;
  principal: number;
  rendimento: number | null;
  valor_atual: number | null;
}

export interface InvestimentoCdiResumo {
  available: boolean;
  annual_rate: number | null;
  contas: InvestimentoCdiContaResumo[];
}

export interface HealthResponse {
  status: string;
}
