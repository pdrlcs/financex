/**
 * Wordmark "Financex" — logo provisório até existir um símbolo
 * (PORT_FRONTEND.md §6, decisão #3: "x" na cor de marca).
 */
export function Wordmark() {
  return (
    <span className="hidden select-none text-xl font-bold tracking-tight text-foreground sm:inline">
      Finance<span className="text-primary">x</span>
    </span>
  );
}
