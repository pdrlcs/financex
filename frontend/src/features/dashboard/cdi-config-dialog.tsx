import { Check } from "lucide-react";
import { useEffect, useState } from "react";

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
import type { ContaOut, ContaUpdate } from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: ContaOut | null;
  submitting: boolean;
  onSubmit: (id: number, payload: ContaUpdate) => void;
}

export function CdiConfigDialog({ open, onOpenChange, conta, submitting, onSubmit }: Props) {
  const [indexado, setIndexado] = useState(false);
  const [percent, setPercent] = useState("");

  useEffect(() => {
    if (!open || !conta) return;
    setIndexado(conta.indexador === "cdi");
    setPercent(conta.indexador_percent ?? "");
  }, [open, conta]);

  const submit = () => {
    if (!conta) return;
    onSubmit(
      conta.id,
      indexado
        ? { indexador: "cdi", indexador_percent: Number(percent || "0").toFixed(2) }
        : { indexador: null, indexador_percent: null },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Indexador da conta</DialogTitle>
          <DialogDescription>{conta?.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Indexador</Label>
            <Select
              value={indexado ? "cdi" : "none"}
              onValueChange={(v) => setIndexado(v === "cdi")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="cdi">CDI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {indexado && (
            <div className="space-y-1.5">
              <Label>% do CDI</Label>
              <Input
                inputMode="decimal"
                placeholder="100"
                value={percent}
                onChange={(e) => setPercent(e.target.value.replace(/[^\d.]/g, ""))}
                className="num"
              />
              <p className="text-xs text-muted-foreground">
                Ex.: 100 = rende 100% do CDI; 110 = 110% do CDI.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || (indexado && !(Number(percent) > 0))}
          >
            <Check size={16} /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
