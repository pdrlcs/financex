import { useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Settings2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContas } from "@/hooks/useContas";
import { useTags } from "@/hooks/useTags";
import { api, ApiError } from "@/lib/api";
import { TRANSACAO_TIPO_INFO } from "@/lib/constants";
import { TRANSACAO_TYPES } from "@/types/api";
import type {
  ConfigImportResult,
  ConfigsExport,
  ImportResult,
} from "@/types/api";

const ALL = "__all__";
const CSV_HEADER = "id,type,value,date,description,account_name,tag_name,payment_method";

/** Dispara o download de um Blob no navegador. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportExport() {
  const qc = useQueryClient();
  const { data: tags = [] } = useTags();
  const { data: contas = [] } = useContas();

  // ─── Export CSV (filtros) ──────────────────────────────────────────────────
  const [type, setType] = useState<string>(ALL);
  const [tagF, setTagF] = useState<string>(ALL);
  const [contaF, setContaF] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.getBlob("/transacoes/export/csv", {
        type: type === ALL ? undefined : type,
        tag_id: tagF === ALL ? undefined : Number(tagF),
        account_id: contaF === ALL ? undefined : Number(contaF),
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      downloadBlob(blob, "transacoes.csv");
      toast.success("CSV exportado.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Falha ao exportar.");
    } finally {
      setExporting(false);
    }
  };

  // ─── Import CSV ────────────────────────────────────────────────────────────
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<ImportResult | null>(null);

  const importCsv = async (file: File) => {
    setImporting(true);
    setCsvResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await api.postForm<ImportResult>("/transacoes/import/csv", fd);
      setCsvResult(result);
      qc.invalidateQueries({ queryKey: ["transacoes"] });
      qc.invalidateQueries({ queryKey: ["graphs"] });
      if (result.erros > 0) {
        toast.warning(`${result.importadas} importadas, ${result.erros} com erro.`);
      } else {
        toast.success(`${result.importadas} transações importadas.`);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Falha ao importar o CSV.");
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  // ─── Configs (JSON) ────────────────────────────────────────────────────────
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [exportingCfg, setExportingCfg] = useState(false);
  const [importingCfg, setImportingCfg] = useState(false);
  const [cfgResult, setCfgResult] = useState<ConfigImportResult | null>(null);

  const exportConfigs = async () => {
    setExportingCfg(true);
    try {
      const data = await api.get<ConfigsExport>("/configs/export");
      downloadBlob(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
        "financex-configs.json",
      );
      toast.success("Configurações exportadas.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Falha ao exportar.");
    } finally {
      setExportingCfg(false);
    }
  };

  const importConfigs = async (file: File) => {
    setImportingCfg(true);
    setCfgResult(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ConfigsExport;
      const body = {
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        contas: Array.isArray(parsed.contas) ? parsed.contas : [],
        orcamentos: Array.isArray(parsed.orcamentos) ? parsed.orcamentos : [],
        gastos_fixos: Array.isArray(parsed.gastos_fixos) ? parsed.gastos_fixos : [],
      };
      const result = await api.post<ConfigImportResult>("/configs/import", body);
      setCfgResult(result);
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["contas"] });
      qc.invalidateQueries({ queryKey: ["orcamentos"] });
      qc.invalidateQueries({ queryKey: ["gastos-fixos"] });
      qc.invalidateQueries({ queryKey: ["graphs"] });
      toast.success("Configurações importadas.");
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Arquivo JSON inválido.");
      } else {
        toast.error(error instanceof ApiError ? error.message : "Falha ao importar.");
      }
    } finally {
      setImportingCfg(false);
      if (jsonInputRef.current) jsonInputRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar / Exportar</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Transações em CSV e configurações (tags, contas, orçamentos e gastos fixos) em JSON.
        </p>
      </div>

      {/* ─── Transações (CSV) ─── */}
      <section className="board-card space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">
            <FileSpreadsheet size={18} />
          </span>
          <div>
            <h2 className="font-semibold">Transações (CSV)</h2>
            <p className="text-[13px] text-muted-foreground">
              Exporte com os filtros aplicados ou importe um arquivo.
            </p>
          </div>
        </div>

        {/* Export */}
        <div className="space-y-3">
          <Label>Exportar</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os tipos</SelectItem>
                {TRANSACAO_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRANSACAO_TIPO_INFO[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tagF} onValueChange={setTagF}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as categorias</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={contaF} onValueChange={setContaF}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as contas</SelectItem>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">De</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Até</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={exporting}>
            <Download size={16} />
            Baixar CSV
          </Button>
        </div>

        <hr className="border-border" />

        {/* Import */}
        <div className="space-y-2.5">
          <Label>Importar</Label>
          <p className="text-[13px] text-muted-foreground">O arquivo deve ter o cabeçalho:</p>
          <code className="block overflow-x-auto whitespace-nowrap rounded bg-muted px-2 py-1.5 text-[12px]">
            {CSV_HEADER}
          </code>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
            }}
          />
          <Button
            variant="outline"
            onClick={() => csvInputRef.current?.click()}
            disabled={importing}
          >
            <Upload size={16} />
            {importing ? "Importando…" : "Escolher arquivo CSV"}
          </Button>
          {csvResult && (
            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
              <span className="num font-semibold text-receita">{csvResult.importadas}</span>{" "}
              importadas
              {csvResult.erros > 0 && (
                <>
                  {" · "}
                  <span className="num font-semibold text-despesa">{csvResult.erros}</span> com
                  erro (linhas inválidas foram ignoradas)
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─── Configurações (JSON) ─── */}
      <section className="board-card space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Settings2 size={18} />
          </span>
          <div>
            <h2 className="font-semibold">Configurações (tags, contas, orçamentos e gastos fixos)</h2>
            <p className="text-[13px] text-muted-foreground">
              Exporte como JSON; importe fazendo merge (não duplica existentes).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportConfigs} disabled={exportingCfg}>
            <Download size={16} />
            Exportar JSON
          </Button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importConfigs(f);
            }}
          />
          <Button
            variant="outline"
            onClick={() => jsonInputRef.current?.click()}
            disabled={importingCfg}
          >
            <Upload size={16} />
            {importingCfg ? "Importando…" : "Importar JSON"}
          </Button>
        </div>

        {cfgResult && (
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
            Tags:{" "}
            <span className="num font-semibold text-receita">{cfgResult.tags.criadas}</span>{" "}
            criadas, <span className="num">{cfgResult.tags.ignoradas}</span> ignoradas · Contas:{" "}
            <span className="num font-semibold text-receita">{cfgResult.contas.criadas}</span>{" "}
            criadas, <span className="num">{cfgResult.contas.ignoradas}</span> ignoradas ·
            Orçamentos:{" "}
            <span className="num font-semibold text-receita">
              {cfgResult.orcamentos.criadas}
            </span>{" "}
            criados, <span className="num">{cfgResult.orcamentos.ignoradas}</span> ignorados ·
            Gastos fixos:{" "}
            <span className="num font-semibold text-receita">
              {cfgResult.gastos_fixos.criadas}
            </span>{" "}
            criados, <span className="num">{cfgResult.gastos_fixos.ignoradas}</span> ignorados
          </div>
        )}
      </section>
    </div>
  );
}
