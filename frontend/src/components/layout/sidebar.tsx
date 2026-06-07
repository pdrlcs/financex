import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { useHealth } from "@/hooks/useHealth";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { data: health, isError } = useHealth();

  // Fecha o drawer ao navegar (mobile).
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      {/* Scrim mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border bg-card",
          "transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--accent-soft)] text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -left-3 bottom-2 top-2 w-[3px] rounded-r-full bg-primary" />
                  )}
                  <Icon size={19} strokeWidth={isActive ? 2 : 1.75} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Rodapé: status da API + dica */}
        <div className="mt-auto space-y-3 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                health?.status === "ok"
                  ? "bg-receita"
                  : isError
                    ? "bg-despesa"
                    : "bg-neutro",
              )}
            />
            {health?.status === "ok"
              ? "API conectada"
              : isError
                ? "API indisponível"
                : "Verificando API…"}
          </div>

          <div className="rounded-md bg-muted p-3">
            <p className="text-[12.5px] font-semibold text-foreground">Cadastro rápido</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Use <strong>+ Nova transação</strong> na barra superior.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
