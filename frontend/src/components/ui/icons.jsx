/* ============================================================
   Financex — Ícones (estilo lucide: traço fino, 24x24, stroke)
   Exposto em window.Icon — <Icon name="..." size={18} />
   ============================================================ */
const FX_ICONS = {
  dashboard: ['<rect width="7" height="9" x="3" y="3" rx="1"/>','<rect width="7" height="5" x="14" y="3" rx="1"/>','<rect width="7" height="9" x="14" y="12" rx="1"/>','<rect width="7" height="5" x="3" y="16" rx="1"/>'],
  transacoes: ['<path d="m16 3 4 4-4 4"/>','<path d="M20 7H4"/>','<path d="m8 21-4-4 4-4"/>','<path d="M4 17h16"/>'],
  orcamentos: ['<path d="M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/>','<path d="M3 10h18"/>','<circle cx="16.5" cy="14.5" r="1.5"/>'],
  tags: ['<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>','<circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>'],
  contas: ['<line x1="3" x2="21" y1="22" y2="22"/>','<line x1="6" x2="6" y1="18" y2="11"/>','<line x1="10" x2="10" y1="18" y2="11"/>','<line x1="14" x2="14" y1="18" y2="11"/>','<line x1="18" x2="18" y1="18" y2="11"/>','<polygon points="12 2 20 7 4 7"/>'],
  importar: ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>','<polyline points="17 8 12 3 7 8"/>','<line x1="12" x2="12" y1="3" y2="15"/>'],
  config: ['<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>','<circle cx="12" cy="12" r="3"/>'],
  plus: ['<path d="M5 12h14"/>','<path d="M12 5v14"/>'],
  sun: ['<circle cx="12" cy="12" r="4"/>','<path d="M12 2v2"/>','<path d="M12 20v2"/>','<path d="m4.93 4.93 1.41 1.41"/>','<path d="m17.66 17.66 1.41 1.41"/>','<path d="M2 12h2"/>','<path d="M20 12h2"/>','<path d="m6.34 17.66-1.41 1.41"/>','<path d="m19.07 4.93-1.41 1.41"/>'],
  moon: ['<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'],
  chevronDown: ['<path d="m6 9 6 6 6-6"/>'],
  more: ['<circle cx="12" cy="12" r="1"/>','<circle cx="19" cy="12" r="1"/>','<circle cx="5" cy="12" r="1"/>'],
  search: ['<circle cx="11" cy="11" r="8"/>','<path d="m21 21-4.3-4.3"/>'],
  calendar: ['<path d="M8 2v4"/>','<path d="M16 2v4"/>','<rect width="18" height="18" x="3" y="4" rx="2"/>','<path d="M3 10h18"/>'],
  trendUp: ['<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>','<polyline points="16 7 22 7 22 13"/>'],
  trendDown: ['<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>','<polyline points="16 17 22 17 22 11"/>'],
  wallet: ['<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>','<path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>'],
  piggy: ['<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/>','<path d="M2 9v1c0 1.1.9 2 2 2h1"/>','<path d="M16 11h.01"/>'],
  scale: ['<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>','<path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>','<path d="M7 21h10"/>','<path d="M12 3v18"/>','<path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>'],
  download: ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>','<polyline points="7 10 12 15 17 10"/>','<line x1="12" x2="12" y1="15" y2="3"/>'],
  filter: ['<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'],
  x: ['<path d="M18 6 6 18"/>','<path d="m6 6 12 12"/>'],
  menu: ['<line x1="4" x2="20" y1="6" y2="6"/>','<line x1="4" x2="20" y1="12" y2="12"/>','<line x1="4" x2="20" y1="18" y2="18"/>'],
  check: ['<path d="M20 6 9 17l-5-5"/>'],
};

function Icon({ name, size = 18, stroke = 1.75, style, className }) {
  const paths = FX_ICONS[name] || [];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} className={className}
      dangerouslySetInnerHTML={{ __html: paths.join("") }}
    />
  );
}

Object.assign(window, { Icon });
