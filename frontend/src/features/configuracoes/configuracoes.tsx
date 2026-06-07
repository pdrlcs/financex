import { Moon, Palette, Sun } from "lucide-react";

import { useTheme } from "@/components/layout/theme-provider";
import { cn } from "@/lib/utils";

/**
 * Configurações (F6) — mínima por decisão do projeto (single-user, sem auth):
 * apenas aparência/tema. Espaço reservado para preferências futuras.
 */
const THEME_OPTIONS = [
  { id: "light" as const, label: "Claro", icon: Sun },
  { id: "dark" as const, label: "Escuro", icon: Moon },
];

export function Configuracoes() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl animate-rise space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Preferências do aplicativo.
        </p>
      </div>

      <section className="board-card space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Palette size={18} />
          </span>
          <div>
            <h2 className="font-semibold">Aparência</h2>
            <p className="text-[13px] text-muted-foreground">
              Escolha o tema da interface.
            </p>
          </div>
        </div>

        <div className="grid max-w-xs grid-cols-2 gap-2 rounded-md bg-muted p-1">
          {THEME_OPTIONS.map((opt) => {
            const on = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold transition-colors",
                  on
                    ? "bg-card text-primary shadow-fx-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <opt.icon size={16} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="board-card">
        <h2 className="font-semibold">Sobre</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Financex — gestor financeiro pessoal. Aplicativo single-user; sem
          autenticação por decisão do projeto.
        </p>
      </section>
    </div>
  );
}
