import { Navigate, Route, Routes } from "react-router-dom";

import { Shell } from "@/components/layout/shell";
import { Configuracoes } from "@/features/configuracoes/configuracoes";
import { Contas } from "@/features/contas/contas";
import { Dashboard } from "@/features/dashboard/dashboard";
import { ImportExport } from "@/features/import-export/import-export";
import { Orcamentos } from "@/features/orcamentos/orcamentos";
import { Tags } from "@/features/tags/tags";
import { Transacoes } from "@/features/transacoes/transacoes";

/**
 * Rotas do app (PORT_FRONTEND.md §4.4, PLANEJAMENTO_FRONT.md §4).
 * Shell = layout fixo (navbar + sidebar). Cada rota aninhada renderiza via
 * <Outlet /> na área de conteúdo principal.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        {/* Raiz → redireciona pro dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard com abas */}
        <Route path="dashboard" element={<Navigate to="/dashboard/visao-geral" replace />} />
        <Route path="dashboard/:tab" element={<Dashboard />} />

        {/* Features */}
        <Route path="transacoes" element={<Transacoes />} />
        <Route path="orcamentos" element={<Orcamentos />} />
        <Route path="tags" element={<Tags />} />
        <Route path="contas" element={<Contas />} />
        <Route path="import-export" element={<ImportExport />} />
        <Route path="configuracoes" element={<Configuracoes />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
