import { Check } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Paleta padrão (portada do protótipo) — atalhos para cores comuns. */
export const PALETTE = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#84CC16",
  "#22C55E",
  "#14B8A6",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#EC4899",
  "#820AD1",
  "#6B7280",
] as const;

export const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** Cor aleatória da paleta — usada como padrão ao criar uma entidade nova. */
// eslint-disable-next-line react-refresh/only-export-components
export function randomPaletteColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/**
 * Color picker (color-picker do protótipo): swatches da paleta + input nativo
 * de cor + campo hex livre. A cor define a aparência da entidade nos gráficos.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {PALETTE.map((c) => {
          const on = c.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              title={c}
              aria-label={`Cor ${c}`}
              aria-pressed={on}
              className={cn(
                "relative h-7 w-7 rounded-md transition-transform hover:scale-110",
                on
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                  : "ring-1 ring-border",
              )}
              style={{ background: c }}
            >
              {on && (
                <Check
                  size={15}
                  strokeWidth={3}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white"
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          value={HEX_RE.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          aria-label="Seletor de cor"
          className="h-9 w-10 cursor-pointer rounded-md border border-input bg-muted p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="num w-28 uppercase"
          maxLength={7}
          aria-label="Cor em hexadecimal"
        />
      </div>
    </div>
  );
}
