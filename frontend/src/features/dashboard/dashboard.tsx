import { Link, Navigate, useLocation, useParams } from "react-router-dom";

import { usePeriod } from "@/hooks/usePeriod";
import { DASHBOARD_TABS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Categorias } from "./tabs/categorias";
import { Investimentos } from "./tabs/investimentos";
import { Orcamento } from "./tabs/orcamento";
import { Padroes } from "./tabs/padroes";
import { Previsao } from "./tabs/previsao";
import { VisaoGeral } from "./tabs/visao-geral";
import type { TabProps } from "./tab-helpers";

/** Mapeia cada slug de aba (DASHBOARD_TABS) ao seu componente (grupos A–G). */
const TAB_COMPONENTS: Record<string, (props: TabProps) => React.ReactNode> = {
  "visao-geral": VisaoGeral,
  categorias: Categorias,
  investimentos: Investimentos,
  padroes: Padroes,
  previsao: Previsao,
  orcamento: Orcamento,
};

export function Dashboard() {
  const { tab } = useParams<{ tab: string }>();
  const { search } = useLocation();
  const { range, periodo, options } = usePeriod();

  const validTab = DASHBOARD_TABS.find((t) => t.slug === tab);
  if (!validTab) {
    return <Navigate to={`/dashboard/${DASHBOARD_TABS[0].slug}${search}`} replace />;
  }

  const periodLabel = options.find((o) => o.id === periodo)?.label ?? "";
  const TabComponent = TAB_COMPONENTS[validTab.slug];

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Abas — preservam o ?periodo na navegação (SPA) */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {DASHBOARD_TABS.map((t) => {
          const active = t.slug === validTab.slug;
          return (
            <Link
              key={t.slug}
              to={`/dashboard/${t.slug}${search}`}
              className={cn(
                "relative -mb-px whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition-colors",
                active
                  ? "text-primary after:absolute after:inset-x-2.5 after:-bottom-px after:h-[2.5px] after:rounded-t after:bg-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <TabComponent range={range} periodLabel={periodLabel} />
    </div>
  );
}
