import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

/**
 * Shell principal: navbar fixa no topo, sidebar à esquerda (drawer no mobile),
 * conteúdo do contexto ativo via <Outlet /> (React Router).
 */
export function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <Navbar onOpenMenu={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto bg-background p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
