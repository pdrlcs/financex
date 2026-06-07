import { Moon, Sun } from "lucide-react";

import { useTheme } from "./theme-provider";

/** Alterna light/dark (persistido no localStorage pelo ThemeProvider). */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
