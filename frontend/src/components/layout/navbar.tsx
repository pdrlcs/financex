import { Menu, Plus } from "lucide-react";

import { useTransacaoDialog } from "@/features/transacoes/transacao-dialog-context";

import { PeriodSelector } from "./period-selector";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./wordmark";

interface NavbarProps {
  onOpenMenu: () => void;
}

/**
 * Navbar fixa (PORT_FRONTEND.md §4.4): wordmark, PeriodSelector global, botão
 * "+ Nova transação" e ThemeToggle. O hambúrguer só aparece no mobile (abre o
 * drawer da sidebar). O botão "+ Nova transação" abre o modal global de
 * cadastro (TransacaoDialogProvider).
 */
export function Navbar({ onOpenMenu }: NavbarProps) {
  const { openNew } = useTransacaoDialog();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-2 border-b border-border bg-card px-3 transition-colors sm:gap-4 sm:px-5">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu size={20} />
      </button>

      <Wordmark />

      <div className="flex-1" />

      <PeriodSelector />

      <button
        type="button"
        onClick={openNew}
        aria-label="Nova transação"
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-primary px-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 sm:px-4"
      >
        <Plus size={17} />
        <span className="hidden sm:inline">Nova transação</span>
      </button>

      <ThemeToggle />
    </header>
  );
}
