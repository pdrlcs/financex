import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EntityCardProps {
  color: string;
  title: string;
  subtitle: string;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Card colorido de Tag/Conta (entity-card do protótipo): swatch da cor +
 * nome + subtítulo (tipo) + ações. A cor é a mesma usada nos gráficos.
 */
export function EntityCard({
  color,
  title,
  subtitle,
  onEdit,
  onDelete,
}: EntityCardProps) {
  return (
    <div className="board-card is-hoverable flex items-center gap-3.5 !p-4">
      <span
        className="h-11 w-11 flex-shrink-0 rounded-xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
        style={{ background: color }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{title}</div>
        <div className="text-[12.5px] text-muted-foreground">{subtitle}</div>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={`Editar ${title}`}
        >
          <Pencil size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label={`Excluir ${title}`}
          className="text-despesa hover:text-despesa"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}
