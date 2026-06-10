import {
  ArrowLeftRight,
  LayoutDashboard,
  Settings,
  Tags,
  Target,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type {
  ContaType,
  PaymentMethod,
  TagType,
  TransacaoType,
} from "@/types/api";

/**
 * Metadados de UI derivados dos enums do backend (PORT_FRONTEND.md §2: o que
 * sobrevive do data.js são enums/labels). Cada cor referencia um token CSS
 * semântico (src/index.css), nunca um hex fixo — assim segue o tema.
 */

interface TipoInfo {
  label: string;
  /** Token de cor semântica (var CSS). */
  colorVar: string;
  /** Classe Tailwind de cor de texto (mapeada no tailwind.config.ts). */
  textClass: string;
}

export const TRANSACAO_TIPO_INFO: Record<TransacaoType, TipoInfo> = {
  despesa: { label: "Despesa", colorVar: "--c-despesa", textClass: "text-despesa" },
  receita: { label: "Receita", colorVar: "--c-receita", textClass: "text-receita" },
  investimento: {
    label: "Investimento",
    colorVar: "--c-investimento",
    textClass: "text-investimento",
  },
  retirada_investimento: {
    label: "Retirada de investimento",
    colorVar: "--c-investimento",
    textClass: "text-investimento",
  },
  compra_cripto: {
    label: "Compra cripto",
    colorVar: "--c-investimento",
    textClass: "text-investimento",
  },
  venda_cripto: {
    label: "Venda cripto",
    colorVar: "--c-investimento",
    textClass: "text-investimento",
  },
};

export const TAG_TIPO_INFO: Record<TagType, TipoInfo> = {
  despesa: TRANSACAO_TIPO_INFO.despesa,
  receita: TRANSACAO_TIPO_INFO.receita,
  investimento: TRANSACAO_TIPO_INFO.investimento,
};

/**
 * Compatibilidade type de transação → type de tag exigido. Espelha
 * TAG_TYPE_COMPAT do backend (routers/transacoes.py): retirada de investimento
 * usa tags de investimento. Usado pelo modal p/ filtrar as tags do select.
 */
export const TRANSACAO_TAG_TYPE: Record<TransacaoType, TagType> = {
  despesa: "despesa",
  receita: "receita",
  investimento: "investimento",
  retirada_investimento: "investimento",
  compra_cripto: "investimento",
  venda_cripto: "investimento",
};

export const CONTA_TIPO_LABEL: Record<ContaType, string> = {
  banco: "Banco",
  investimento: "Investimento",
  carteira: "Carteira",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
  transfer: "Transferência",
};

// ─── Navegação (sidebar) — PLANEJAMENTO_FRONT.md §4 ───────────────────────────

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { to: "/orcamentos", label: "Orçamentos", icon: Target },
  { to: "/tags", label: "Tags", icon: Tags },
  { to: "/contas", label: "Contas", icon: Wallet },
  { to: "/import-export", label: "Importar / Exportar", icon: Upload },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

// ─── Abas do Dashboard — batem 1:1 com os grupos do GRAFICOS.md (A–G) ─────────

export interface DashboardTab {
  slug: string;
  label: string;
}

// ─── Meses (pt-BR) — usados nos seletores de mês (Orçamentos) ─────────────────

export const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const DASHBOARD_TABS: DashboardTab[] = [
  { slug: "visao-geral", label: "Visão geral" },
  { slug: "categorias", label: "Categorias" },
  { slug: "investimentos", label: "Investimentos" },
  { slug: "padroes", label: "Padrões" },
  { slug: "previsao", label: "Previsão" },
  { slug: "orcamento", label: "Orçamento" },
];
