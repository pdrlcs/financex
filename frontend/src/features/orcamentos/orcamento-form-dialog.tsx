import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

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
import { MONTHS_PT } from "@/lib/constants";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrcamentoCreate, OrcamentoOut, TagOut } from "@/types/api";

/**
 * Modal de cadastro/edição de orçamento (F6). RHF + Zod espelhando o backend
 * (schemas/orcamento.py + routers/orcamentos.py): tag de despesa, limit_value > 0,
 * um orçamento ativo por tag. O orçamento é um template: vale do mês de início
 * (a tela atual, na criação) em diante. As tags já vêm filtradas por despesa e,
 * na criação, sem as que já têm orçamento. Na edição o início não muda.
 */

const schema = z.object({
  tag_id: z.number({ message: "Selecione uma categoria." }).int(),
  valueCents: z.number().int().positive("Informe um valor maior que zero."),
});

type FormValues = z.infer<typeof schema>;

interface OrcamentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente → edição; ausente → criação. */
  initial: OrcamentoOut | null;
  /** Tags de despesa disponíveis (já filtradas pelo chamador). */
  tagOptions: TagOut[];
  year: number;
  month: number;
  submitting: boolean;
  onSubmit: (payload: OrcamentoCreate, isEdit: boolean) => void;
}

export function OrcamentoFormDialog({
  open,
  onOpenChange,
  initial,
  tagOptions,
  year,
  month,
  submitting,
  onSubmit,
}: OrcamentoFormDialogProps) {
  const isEdit = !!initial;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tag_id: undefined, valueCents: 0 },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      tag_id: initial?.tag_id ?? undefined,
      valueCents: initial ? Math.round(Number(initial.limit_value) * 100) : 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const submit = handleSubmit((values) => {
    onSubmit(
      {
        tag_id: values.tag_id,
        start_year: year,
        start_month: month,
        limit_value: (values.valueCents / 100).toFixed(2),
      },
      isEdit,
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Limite de gasto da categoria (vale para todos os meses)."
              : `Limite de gasto a partir de ${MONTHS_PT[month - 1]} de ${year} (vale para todos os meses seguintes).`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Categoria (despesa)</Label>
            <Controller
              control={control}
              name="tag_id"
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {tagOptions.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        Nenhuma categoria disponível
                      </SelectItem>
                    ) : (
                      tagOptions.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tag_id && (
              <p className="text-xs text-despesa">{errors.tag_id.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Limite mensal</Label>
            <Controller
              control={control}
              name="valueCents"
              render={({ field }) => (
                <Input
                  inputMode="numeric"
                  autoFocus
                  value={fmt.brl((field.value || 0) / 100)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    field.onChange(digits ? parseInt(digits, 10) : 0);
                  }}
                  className={cn(
                    "num h-12 text-xl font-bold tracking-tight",
                    errors.valueCents && "border-despesa",
                  )}
                />
              )}
            />
            {errors.valueCents && (
              <p className="text-xs text-despesa">{errors.valueCents.message}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <Check size={16} />
            {isEdit ? "Salvar alterações" : "Criar orçamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
