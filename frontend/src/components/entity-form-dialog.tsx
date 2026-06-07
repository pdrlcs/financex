import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { ColorPicker, HEX_RE, randomPaletteColor } from "@/components/color-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TypeOption<TType extends string> {
  value: TType;
  label: string;
}

export interface EntityFormValues<TType extends string> {
  name: string;
  type: TType;
  color: string;
}

/** Entidade existente sendo editada (subset de Tag/Conta). */
export interface EntityInitial<TType extends string> {
  name: string;
  type: TType;
  color: string;
}

interface EntityFormDialogProps<TType extends string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando presente → modo edição; ausente → criação. */
  initial: EntityInitial<TType> | null;
  /** Tipo pré-selecionado ao criar (aba ativa). */
  defaultType: TType;
  typeOptions: TypeOption<TType>[];
  title: string;
  subtitle: string;
  namePlaceholder: string;
  typeHint?: string;
  previewFallback: string;
  submitting: boolean;
  onSubmit: (values: EntityFormValues<TType>) => void;
}

/**
 * Modal de Tag/Conta (tag-conta-modal do protótipo): nome + tipo + color picker
 * + pré-visualização. Compartilhado entre Tags e Contas; o `kind` muda só
 * labels e opções de tipo. Validação leve (nome obrigatório, hex válido); as
 * regras de unicidade do back chegam como erro tratado no EntityManager.
 */
export function EntityFormDialog<TType extends string>({
  open,
  onOpenChange,
  initial,
  defaultType,
  typeOptions,
  title,
  subtitle,
  namePlaceholder,
  typeHint,
  previewFallback,
  submitting,
  onSubmit,
}: EntityFormDialogProps<TType>) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TType>(defaultType);
  const [color, setColor] = useState("");
  const [touched, setTouched] = useState(false);

  // Reinicializa o form a cada abertura (criação herda a aba; edição herda a entidade).
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setType(initial?.type ?? defaultType);
    setColor(initial?.color ?? randomPaletteColor());
    setTouched(false);
  }, [open, initial, defaultType]);

  const nameError = !name.trim() ? "Informe um nome." : null;
  const colorError = !HEX_RE.test(color) ? "Cor inválida (use #RRGGBB)." : null;

  const submit = () => {
    setTouched(true);
    if (nameError || colorError) return;
    onSubmit({ name: name.trim(), type, color: color.toUpperCase() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="entity-name">Nome</Label>
            <Input
              id="entity-name"
              value={name}
              autoFocus
              placeholder={namePlaceholder}
              maxLength={64}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            {touched && nameError && (
              <p className="text-xs text-despesa">{nameError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as TType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typeHint && (
              <p className="text-xs text-muted-foreground">{typeHint}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <ColorPicker value={color} onChange={setColor} />
            {touched && colorError && (
              <p className="text-xs text-despesa">{colorError}</p>
            )}
          </div>

          {/* Pré-visualização */}
          <div className="flex items-center gap-3 rounded-md bg-muted p-3.5">
            <span
              className="h-9 w-9 flex-shrink-0 rounded-[10px]"
              style={{ background: HEX_RE.test(color) ? color : "transparent" }}
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {name.trim() || previewFallback}
              </div>
              <div className="text-xs text-muted-foreground">
                Pré-visualização
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <Check size={16} />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
