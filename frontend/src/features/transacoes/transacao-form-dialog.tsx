import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import { fmt } from "@/lib/format";
import {
  PAYMENT_METHOD_LABEL,
  TRANSACAO_TAG_TYPE,
  TRANSACAO_TIPO_INFO,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHODS,
  TRANSACAO_TYPES,
  type ContaOut,
  type PaymentMethod,
  type TagOut,
  type TransacaoCreate,
  type TransacaoOut,
  type TransacaoType,
} from "@/types/api";

/**
 * Modal de cadastro/edição de transação (F4). Cadastro rápido — a meta central
 * do produto. RHF + Zod com validações espelhando o backend
 * (schemas/transacao.py + routers/transacoes.py): valor > 0, tag compatível
 * com o type, conta ativa. As tags do select já vêm filtradas por type, então
 * a incompatibilidade é prevenida na origem.
 */

const NONE_TAG = "__none__"; // RHF/Radix não lidam bem com "" como value de Select.

const schema = z
  .object({
    type: z.enum(TRANSACAO_TYPES),
    valueCents: z
      .number()
      .int()
      .positive("Informe um valor maior que zero."),
    date: z.string().min(1, "Informe a data."),
    account_id: z.number({ message: "Selecione uma conta." }).int(),
    tag_id: z.number({ message: "Selecione uma categoria." }).int(),
    payment_method: z.enum(PAYMENT_METHODS),
    description: z.string().max(255).optional(),
    quantity: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const cripto = v.type === "compra_cripto" || v.type === "venda_cripto";
    if (cripto) {
      const n = Number(v.quantity);
      if (!v.quantity || !Number.isFinite(n) || n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantity"],
          message: "Informe a quantidade de BTC (> 0).",
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

const TX_TYPE_OPTIONS = TRANSACAO_TYPES.map((value) => ({
  value,
  // "Retirada de investimento" é longo demais p/ o segmented — encurta.
  label: value === "retirada_investimento" ? "Retirada" : TRANSACAO_TIPO_INFO[value].label,
}));

function Segmented({
  value,
  onChange,
}: {
  value: TransacaoType;
  onChange: (v: TransacaoType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 sm:grid-cols-4">
      {TX_TYPE_OPTIONS.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-sm px-1.5 py-2 text-[13px] font-semibold transition-colors",
              on
                ? "bg-card shadow-fx-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            style={on ? { color: `var(${TRANSACAO_TIPO_INFO[opt.value].colorVar})` } : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Input monetário pt-BR — opera em centavos (digita-se da direita p/ esquerda). */
function MoneyInput({
  cents,
  onCents,
  invalid,
}: {
  cents: number;
  onCents: (cents: number) => void;
  invalid?: boolean;
}) {
  return (
    <Input
      inputMode="numeric"
      autoFocus
      value={fmt.brl((cents || 0) / 100)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        onCents(digits ? parseInt(digits, 10) : 0);
      }}
      className={cn(
        "num h-12 text-xl font-bold tracking-tight",
        invalid && "border-despesa",
      )}
    />
  );
}

interface TransacaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente → edição; ausente → criação. */
  initial: TransacaoOut | null;
  tags: TagOut[];
  contas: ContaOut[];
  submitting: boolean;
  onSubmit: (payload: TransacaoCreate, isEdit: boolean) => void;
}

export function TransacaoFormDialog({
  open,
  onOpenChange,
  initial,
  tags,
  contas,
  submitting,
  onSubmit,
}: TransacaoFormDialogProps) {
  const isEdit = !!initial;
  const today = format(new Date(), "yyyy-MM-dd");

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "despesa",
      valueCents: 0,
      date: today,
      account_id: contas[0]?.id,
      tag_id: undefined,
      payment_method: "pix",
      description: "",
      quantity: "",
    },
  });

  // Reinicializa o form a cada abertura (criação zera; edição herda a transação).
  useEffect(() => {
    if (!open) return;
    reset({
      type: initial?.type ?? "despesa",
      valueCents: initial ? Math.round(Number(initial.value) * 100) : 0,
      date: initial?.date ?? today,
      account_id: initial?.account_id ?? contas[0]?.id,
      tag_id: initial?.tag_id ?? undefined,
      payment_method: initial?.payment_method ?? "pix",
      description: initial?.description ?? "",
      quantity: initial?.quantity ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const type = watch("type");
  const tagType = TRANSACAO_TAG_TYPE[type];
  const tagOptions = tags.filter((t) => t.type === tagType);

  // Ao trocar o type, descarta a tag se ela ficou incompatível.
  const tagId = watch("tag_id");
  useEffect(() => {
    if (tagId != null && !tagOptions.some((t) => t.id === tagId)) {
      setValue("tag_id", undefined as unknown as number);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const submit = handleSubmit((values) => {
    const cripto =
      values.type === "compra_cripto" || values.type === "venda_cripto";
    const payload: TransacaoCreate = {
      type: values.type,
      value: (values.valueCents / 100).toFixed(2),
      date: values.date,
      account_id: values.account_id,
      tag_id: values.tag_id,
      payment_method: values.payment_method,
      description: values.description?.trim() || null,
      quantity: cripto ? Number(values.quantity).toFixed(8) : null,
    };
    onSubmit(payload, isEdit);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar transação" : "Nova transação"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere os campos e salve."
              : "Cadastro rápido — a meta central do produto."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Segmented value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <Controller
              control={control}
              name="valueCents"
              render={({ field }) => (
                <MoneyInput
                  cents={field.value}
                  onCents={field.onChange}
                  invalid={!!errors.valueCents}
                />
              )}
            />
            {errors.valueCents && (
              <p className="text-xs text-despesa">{errors.valueCents.message}</p>
            )}
          </div>

          {/* Quantidade (só p/ cripto) */}
          {(type === "compra_cripto" || type === "venda_cripto") && (
            <div className="space-y-1.5">
              <Label>Quantidade (BTC)</Label>
              <Controller
                control={control}
                name="quantity"
                render={({ field }) => (
                  <Input
                    inputMode="decimal"
                    placeholder="0.00000000"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value.replace(/[^\d.]/g, ""))
                    }
                    className={cn("num", errors.quantity && "border-despesa")}
                  />
                )}
              />
              {errors.quantity ? (
                <p className="text-xs text-despesa">{errors.quantity.message}</p>
              ) : (
                Number(watch("quantity")) > 0 &&
                watch("valueCents") > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Preço médio:{" "}
                    {fmt.brl(watch("valueCents") / 100 / Number(watch("quantity")))}
                  </p>
                )
              )}
            </div>
          )}

          {/* Data + Conta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Data</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <Input
                    id="tx-date"
                    type="date"
                    className="cursor-pointer"
                    {...field}
                  />
                )}
              />
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
                      {contas.map((c) => (
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

          {/* Categoria (tag) + Método */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Controller
                control={control}
                name="tag_id"
                render={({ field }) => (
                  <Select
                    value={field.value != null ? String(field.value) : NONE_TAG}
                    onValueChange={(v) =>
                      field.onChange(v === NONE_TAG ? undefined : Number(v))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {tagOptions.length === 0 ? (
                        <SelectItem value={NONE_TAG} disabled>
                          Nenhuma tag compatível
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
              <Label>Método</Label>
              <Controller
                control={control}
                name="payment_method"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as PaymentMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">
              Descrição{" "}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Input
                  id="tx-desc"
                  placeholder="ex: Mercado da semana"
                  maxLength={255}
                  {...field}
                />
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
            {isEdit ? "Salvar alterações" : "Salvar transação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
