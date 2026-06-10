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
import type { ContaOut, GastoFixoOut, MarcarPagoPayload, PaymentMethod } from "@/types/api";
import { PAYMENT_METHODS } from "@/types/api";

const schema = z.object({
  valueCents: z.number().int().positive("Informe um valor maior que zero."),
  date: z.string().min(1, "Informe a data."),
  account_id: z.number({ message: "Selecione a conta." }).int(),
  payment_method: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gastoFixo: GastoFixoOut | null;
  contaOptions: ContaOut[];
  year: number;
  month: number;
  submitting: boolean;
  onSubmit: (payload: MarcarPagoPayload) => void;
}

const NONE = "__none__";

export function MarcarPagoDialog({
  open,
  onOpenChange,
  gastoFixo,
  contaOptions,
  year,
  month,
  submitting,
  onSubmit,
}: Props) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open || !gastoFixo) return;
    const day = gastoFixo.due_day ?? new Date().getDate();
    const dd = String(Math.min(day, 28)).padStart(2, "0");
    reset({
      valueCents: Math.round(Number(gastoFixo.expected_value) * 100),
      date: `${year}-${String(month).padStart(2, "0")}-${dd}`,
      account_id: gastoFixo.default_account_id ?? undefined,
      payment_method: gastoFixo.default_payment_method ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gastoFixo, year, month]);

  const submit = handleSubmit((values) => {
    onSubmit({
      value: (values.valueCents / 100).toFixed(2),
      date: values.date,
      account_id: values.account_id,
      payment_method: (values.payment_method as PaymentMethod | null) ?? null,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como pago</DialogTitle>
          <DialogDescription>{gastoFixo?.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Valor pago</Label>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => <Input type="date" {...field} />}
              />
              {errors.date && <p className="text-xs text-despesa">{errors.date.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Método</Label>
              <Controller
                control={control}
                name="payment_method"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
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

          <div className="space-y-1.5">
            <Label>Conta</Label>
            <Controller
              control={control}
              name="account_id"
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {contaOptions.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.account_id && (
              <p className="text-xs text-despesa">{errors.account_id.message}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <Check size={16} />
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
