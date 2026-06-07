import * as Popover from "@radix-ui/react-popover";
import { Calendar, Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import { usePeriod } from "@/hooks/usePeriod";
import { cn } from "@/lib/utils";

/**
 * Seletor de período global da navbar (PORT_FRONTEND.md §4.4). Dirige todos os
 * gráficos do Dashboard via search params da URL. Usa Radix Popover (a11y de
 * teclado/foco prontos); os primitivos shadcn finos entram na F3.
 */
export function PeriodSelector() {
  const { periodo, setPeriodo, options } = usePeriod();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === periodo) ?? options[0];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-10 min-w-[168px] items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors hover:bg-muted"
        >
          <span className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            <span className="font-semibold">{current.label}</span>
          </span>
          <ChevronDown
            size={15}
            className={cn(
              "text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-[60] w-[230px] rounded-md border border-border bg-popover p-1.5 shadow-fx-md animate-rise"
        >
          <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Período
          </div>
          {options.map((opt) => {
            const active = opt.id === periodo;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPeriodo(opt.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-sm px-2.5 py-2 text-left transition-colors",
                  active
                    ? "bg-[var(--accent-soft)] text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {opt.label}
                  {active && <Check size={15} />}
                </span>
                <span className="num text-xs text-muted-foreground">{opt.sub}</span>
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
