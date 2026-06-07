/**
 * Board Card — unidade visual dos gráficos do Dashboard (GRAFICOS.md → Anatomia
 * do Board Card). Header (título + subtítulo + menu ⋯), área do gráfico com os 3
 * estados (loading/empty/erro) e legenda custom. `GraphCard` liga um
 * `useQuery` aos estados e renderiza o conteúdo a partir dos dados.
 */
import type { UseQueryResult } from "@tanstack/react-query";
import { Download, Filter, Inbox, MoreHorizontal, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTags } from "@/hooks/useTags";
import { cn } from "@/lib/utils";
import type { TagType } from "@/types/api";

export interface LegendItem {
  color: string;
  label: string;
  /** Renderiza a marca como traço (linha) em vez de quadrado. */
  line?: boolean;
  /** Série desligada (riscada). */
  off?: boolean;
  /** Torna a legenda clicável (toggle de série). */
  onClick?: () => void;
}

export interface ExcludeConfig {
  value: number[];
  onChange: (ids: number[]) => void;
  /** Tipo de tag oferecido no seletor (default despesa). */
  tagType?: TagType;
}

// ─── Estados do card ──────────────────────────────────────────────────────────

function StateBox({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground"
      style={{ height }}
    >
      {children}
    </div>
  );
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="animate-pulse rounded-md bg-muted"
      style={{ height }}
      aria-label="Carregando gráfico"
    />
  );
}

function EmptyState({ height }: { height: number }) {
  return (
    <StateBox height={height}>
      <Inbox size={32} strokeWidth={1.25} />
      <div>
        <div className="text-sm font-semibold text-foreground">
          Sem movimentações neste período
        </div>
        <div className="mt-0.5 text-[13px]">Troque o período na barra superior.</div>
      </div>
    </StateBox>
  );
}

function ErrorState({ height, onRetry }: { height: number; onRetry: () => void }) {
  return (
    <StateBox height={height}>
      <div className="text-sm font-semibold text-foreground">Erro ao carregar</div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw size={15} /> Tentar de novo
      </Button>
    </StateBox>
  );
}

// ─── Menu de ações (⋯) ────────────────────────────────────────────────────────

function CardMenu({
  onDownloadPng,
  exclude,
  onOpenExclude,
}: {
  onDownloadPng: () => void;
  exclude?: ExcludeConfig;
  onOpenExclude?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const items = [
    ...(exclude
      ? [
          {
            icon: Filter,
            label: exclude.value.length
              ? `Excluir tags (${exclude.value.length})`
              : "Excluir tags",
            onClick: () => onOpenExclude?.(),
          },
        ]
      : []),
    { icon: Download, label: "Baixar PNG", onClick: onDownloadPng },
  ];

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ações do card"
      >
        <MoreHorizontal size={18} />
      </Button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[190px] animate-rise rounded-md border border-border bg-popover p-1.5 shadow-fx-md">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => {
                it.onClick();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-[13.5px] font-medium text-foreground hover:bg-muted"
            >
              <it.icon size={16} className="text-muted-foreground" />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Diálogo "Excluir tags" ───────────────────────────────────────────────────

function ExcludeTagsDialog({
  open,
  onClose,
  config,
}: {
  open: boolean;
  onClose: () => void;
  config: ExcludeConfig;
}) {
  const { data: tags = [] } = useTags();
  const [sel, setSel] = useState<number[]>(config.value);
  const tagType = config.tagType ?? "despesa";

  useEffect(() => {
    if (open) setSel(config.value);
  }, [open, config.value]);

  const options = tags.filter((t) => t.type === tagType);
  const toggle = (id: number) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir tags do gráfico</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Remove categorias da agregação deste card (não afeta os outros).
          </p>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {options.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma tag disponível.</p>
          )}
          {options.map((t) => {
            const on = sel.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium",
                  on
                    ? "border-primary bg-[var(--accent-soft)] text-primary"
                    : "border-border bg-card text-foreground",
                )}
              >
                <span
                  className="h-[9px] w-[9px] rounded-full"
                  style={{ background: t.color }}
                />
                {t.name}
                {on && <X size={13} />}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              config.onChange([]);
              onClose();
            }}
          >
            Limpar
          </Button>
          <Button
            onClick={() => {
              config.onChange(sel);
              onClose();
            }}
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Legenda ──────────────────────────────────────────────────────────────────

function Legend({ items }: { items: LegendItem[] }) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
      {items.map((l, i) => {
        const Tag = l.onClick ? "button" : "span";
        return (
          <Tag
            key={`${l.label}-${i}`}
            onClick={l.onClick}
            className={cn(
              "inline-flex items-center gap-[7px] text-[12.5px] text-muted-foreground",
              l.onClick && "cursor-pointer",
              l.off && "line-through opacity-40",
            )}
          >
            <span
              className="inline-block"
              style={{
                width: l.line ? 14 : 10,
                height: l.line ? 3 : 10,
                borderRadius: l.line ? 2 : 3,
                background: l.color,
              }}
            />
            {l.label}
          </Tag>
        );
      })}
    </div>
  );
}

// ─── Card presentacional ──────────────────────────────────────────────────────

export interface ChartCardProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Colunas no grid de 12 (desktop). */
  span: number;
  legend?: LegendItem[];
  exclude?: ExcludeConfig;
  /** Ação extra renderizada no canto direito do header (ex: segmented). */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  span,
  legend,
  exclude,
  headerAction,
  children,
}: ChartCardProps) {
  const ref = useRef<HTMLElement>(null);
  const [excludeOpen, setExcludeOpen] = useState(false);

  const downloadPng = () => {
    const canvas = ref.current?.querySelector("canvas");
    if (!canvas) {
      toast.error("Este card não tem gráfico para exportar.");
      return;
    }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
    toast.success("PNG baixado");
  };

  return (
    <section
      ref={ref}
      data-span={span}
      className="board-card is-hoverable animate-rise min-w-0"
      style={{ gridColumn: `span ${span}` }}
    >
      <header className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-[-0.01em]">{title}</h3>
          {subtitle && (
            <div className="mt-[3px] text-[12.5px] text-muted-foreground">{subtitle}</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerAction}
          <CardMenu
            onDownloadPng={downloadPng}
            exclude={exclude}
            onOpenExclude={() => setExcludeOpen(true)}
          />
        </div>
      </header>
      {children}
      {legend && legend.length > 0 && <Legend items={legend} />}
      {exclude && (
        <ExcludeTagsDialog
          open={excludeOpen}
          onClose={() => setExcludeOpen(false)}
          config={exclude}
        />
      )}
    </section>
  );
}

// ─── GraphCard — Card + estados ligados ao useQuery ───────────────────────────

export interface GraphCardProps<T> extends Omit<ChartCardProps, "children" | "legend"> {
  query: UseQueryResult<T>;
  /** Altura da área de conteúdo (gráficos têm altura fixa; custom = auto). */
  height: number;
  /** Considera o resultado "vazio" (mostra EmptyState). */
  isEmpty?: (data: T) => boolean;
  /** Legenda derivada dos dados. */
  legend?: (data: T) => LegendItem[];
  children: (data: T) => React.ReactNode;
}

export function GraphCard<T>({
  query,
  height,
  isEmpty,
  legend,
  children,
  ...cardProps
}: GraphCardProps<T>) {
  let content: React.ReactNode;
  let legendItems: LegendItem[] | undefined;

  if (query.isPending) {
    content = <ChartSkeleton height={height} />;
  } else if (query.isError) {
    content = <ErrorState height={height} onRetry={() => query.refetch()} />;
  } else if (isEmpty?.(query.data)) {
    content = <EmptyState height={height} />;
  } else {
    content = children(query.data);
    legendItems = legend?.(query.data);
  }

  return (
    <ChartCard {...cardProps} legend={legendItems}>
      {content}
    </ChartCard>
  );
}
