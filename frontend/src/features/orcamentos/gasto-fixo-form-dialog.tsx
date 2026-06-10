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
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  ContaOut,
  GastoFixoCreate,
  GastoFixoOut,
  PaymentMethod,
  TagOut,
} from "@/types/api";
import { PAYMENT_METHODS } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Informe um nome."),
  tag_id: z.number({ message: "Selecione uma categoria." }).int(),
  valueCents: z.number().int().positive("Informe um valor maior que zero."),
  default_account_id: z.number().int().nullable(),
  default_payment_method: z.string().nullable(),
  due_day: z.number().int().min(1).max(31).nullable(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: GastoFixoOut | null;
  tagOptions: TagOut[];
  contaOptions: ContaOut[];
  year: number;
  month: number;
  submitting: boolean;
  onSubmit: (payload: GastoFixoCreate, isEdit: boolean) => void;
}

const NONE = "__none__";

export function GastoFixoFormDialog({
  open,
  onOpenChange,
  initial,
  tagOptions,
  contaOptions,
  year,
  month,
  submitting,
  onSubmit,
}: Props) {
  const isEdit = !!initial;
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      tag_id: undefined,
      valueCents: 0,
      default_account_id: null,
      default_payment_method: null,
      due_day: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: initial?.name ?? "",
      tag_id: initial?.tag_id ?? undefined,
      valueCents: initial ? Math.round(Number(initial.expected_value) * 100) : 0,
      default_account_id: initial?.default_account_id ?? null,
      default_payment_method: initial?.default_payment_method ?? null,
      due_day: initial?.due_day ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const submit = handleSubmit((values) => {
    onSubmit(
      {
        name: values.name,
        tag_id: values.tag_id,
        expected_value: (values.valueCents / 100).toFixed(2),
        default_account_id: values.default_account_id,
        default_payment_method:
          (values.default_payment_method as PaymentMethod | null) ?? null,
        due_day: values.due_day,
        start_year: initial?.start_year ?? year,
        start_month: initial?.start_month ?? month,
      },
      isEdit,
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar gasto fixo" : "Novo gasto fixo"}</DialogTitle>
          <DialogDescription>
            Despesa recorrente que você marca como paga a cada mês.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input autoFocus placeholder="Aluguel, Internet…" {...field} />
              )}
            />
            {errors.name && <p className="text-xs text-despesa">{errors.name.message}</p>}
          </div>

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
                    {tagOptions.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tag_id && <p className="text-xs text-despesa">{errors.tag_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Valor esperado</Label>
            <Controller
              control={control}
              name="valueCents"
              render={({ field }) => (
                <Input
                  inputMode="numeric"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Conta padrão</Label>
              <Controller
                control={control}
                name="default_account_id"
                render={({ field }) => (
                  <Select
                    value={field.value != null ? String(field.value) : NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Nenhuma</SelectItem>
                      {contaOptions.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Dia de vencimento</Label>
              <Controller
                control={control}
                name="due_day"
                render={({ field }) => (
                  <Input
                    inputMode="numeric"
                    placeholder="—"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "");
                      const n = d ? Math.min(31, parseInt(d, 10)) : null;
                      field.onChange(n);
                    }}
                    className="num"
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Método de pagamento padrão</Label>
            <Controller
              control={control}
              name="default_payment_method"
              render={({ field }) => (
                <Select
                  value={field.value ?? NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_METHOD_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <Check size={16} />
            {isEdit ? "Salvar alterações" : "Criar gasto fixo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
