import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Reconciliação shadcn ↔ tokens Financex (PORT_FRONTEND.md §4.2).
 *
 * Os tokens são hex (definidos em src/index.css como CSS vars, trocados por
 * tema). Mapeamos os nomes de cor que o shadcn/ui espera (background, card,
 * primary, muted, border…) diretamente para as vars Financex — uma única
 * fonte de verdade, sem o wrapper hsl() do template padrão do shadcn.
 */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // shadcn — mapeados aos tokens Financex
        background: "var(--bg-app)",
        foreground: "var(--text)",
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--accent)",
        card: {
          DEFAULT: "var(--bg-surface)",
          foreground: "var(--text)",
        },
        popover: {
          DEFAULT: "var(--bg-surface)",
          foreground: "var(--text)",
        },
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-contrast)",
        },
        secondary: {
          DEFAULT: "var(--bg-muted)",
          foreground: "var(--text)",
        },
        muted: {
          DEFAULT: "var(--bg-muted)",
          foreground: "var(--text-muted)",
        },
        // shadcn "accent" = cor de hover/realce neutro (não é a marca)
        accent: {
          DEFAULT: "var(--bg-muted)",
          foreground: "var(--text)",
        },
        destructive: {
          DEFAULT: "var(--c-despesa)",
          foreground: "#FFFFFF",
        },

        // Semânticas Financex (dados financeiros)
        receita: "var(--c-receita)",
        despesa: "var(--c-despesa)",
        investimento: "var(--c-investimento)",
        saldo: "var(--c-saldo)",
        neutro: "var(--c-neutro)",

        // Marca, exposto também como brand-* p/ clareza onde "accent" colidir
        brand: {
          DEFAULT: "var(--accent)",
          contrast: "var(--accent-contrast)",
        },
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      boxShadow: {
        "fx-sm": "var(--shadow-sm)",
        "fx-md": "var(--shadow-md)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        rise: "rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
