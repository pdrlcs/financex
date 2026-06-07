/** Segmented control compacto (toggle de agregação/visão dentro de um card). */
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex gap-[3px] rounded-md bg-muted p-[3px]">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-sm px-[11px] py-[5px] text-[12.5px] font-semibold transition-colors",
              on
                ? "bg-card text-primary shadow-fx-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
