import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardPlus, BarChart3,
  ChevronDown, FolderKanban, LogOut, KeyRound, CalendarDays,
  TrendingUp, Ambulance,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext.jsx';
import { TENANT_ID } from '../config';
import {
  carregarTemaTenant,
  defaultTheme,
  lerThemeCache,
  montarTheme,
  salvarThemeCache,
} from '../lib/tenantTheme';

const MENUS = {
  MASTER: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    {
      id: 'plantoes', icon: ClipboardPlus, label: 'Plantões',
      children: [
        { path: '/plantoes',        label: 'Gerar Plantões'     },
        { path: '/gestao-plantoes', label: 'Gestão de Plantões' },
        { path: '/calendario',      label: 'Calendário'          },
      ],
    },
    { path: '/producao',       icon: TrendingUp, label: 'Produção'        },
    { path: '/transferencias', icon: Ambulance,  label: 'Transferências'  },
    {
      id: 'cadastros', icon: FolderKanban, label: 'Cadastros',
      children: [
        { path: '/colaboradores', label: 'Colaboradores' },
        { path: '/configuracoes', label: 'Configurações' },
        { path: '/escalas',       label: 'Escalas'       },
        { path: '/prestadores',   label: 'Prestadores'   },
        { path: '/remuneracao',   label: 'Remuneração'   },
        { path: '/turnos',        label: 'Turnos'        },
        { path: '/usuarios',      label: 'Usuários'      },
      ],
    },
    { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  ],

  ADMIN: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    {
      id: 'plantoes', icon: ClipboardPlus, label: 'Plantões',
      children: [
        { path: '/plantoes',        label: 'Gerar Plantões'     },
        { path: '/gestao-plantoes', label: 'Gestão de Plantões' },
        { path: '/calendario',      label: 'Calendário'          },
      ],
    },
    { path: '/producao',       icon: TrendingUp, label: 'Produção'        },
    { path: '/transferencias', icon: Ambulance,  label: 'Transferências'  },
    {
      id: 'cadastros', icon: FolderKanban, label: 'Cadastros',
      children: [
        { path: '/colaboradores', label: 'Colaboradores' },
        { path: '/escalas',       label: 'Escalas'       },
        { path: '/prestadores',   label: 'Prestadores'   },
        { path: '/remuneracao',   label: 'Remuneração'   },
        { path: '/turnos',        label: 'Turnos'        },
      ],
    },
    { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  ],

  OPERADOR: [
    {
      id: 'plantoes', icon: ClipboardPlus, label: 'Plantões',
      children: [
        { path: '/gestao-plantoes', label: 'Gestão de Plantões' },
        { path: '/calendario',      label: 'Calendário'          },
      ],
    },
  ],

  VISUALIZADOR: [
    { path: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
    { path: '/calendario', icon: CalendarDays,     label: 'Calendário' },
  ],
};

export default function MainLayout({ children, onChangePass }) {
  const { usuario, perfil, logout, tenantId } = useAuth();
  const location = useLocation();
  const tid = tenantId || TENANT_ID;

  const [menuOpen,   setMenuOpen]   = useState(false);
  const [openGroups, setOpenGroups] = useState({ plantoes: true, cadastros: false });

  const [theme, setTheme] = useState(() => lerThemeCache(tid) || defaultTheme);

  const tabs = MENUS[perfil] || [];

  useEffect(() => {
    carregarTema();
    const fn = (e) => aplicarTheme(montarTheme(e.detail));
    window.addEventListener('tenant-theme-updated', fn);
    return () => window.removeEventListener('tenant-theme-updated', fn);
  }, [tid]);

  useEffect(() => {
    const p = location.pathname;
    if (['/usuarios','/prestadores','/escalas','/turnos','/remuneracao','/configuracoes'].includes(p))
      setOpenGroups(g => ({ ...g, cadastros: true }));
    if (['/plantoes','/gestao-plantoes','/calendario'].includes(p))
      setOpenGroups(g => ({ ...g, plantoes: true }));
  }, [location.pathname]);

  async function carregarTema() {
    const t = await carregarTemaTenant(tid);
    if (t) aplicarTheme(t);
  }

  function aplicarTheme(t) {
    setTheme(t);
    salvarThemeCache(tid, t);
  }

  function toggleGroup(id) {
    setOpenGroups(g => ({ ...g, [id]: !g[id] }));
  }

  function NavItemGroup({ item }) {
    const isOpen      = openGroups[item.id];
    const childActive = item.children?.some(c => location.pathname === c.path);
    const Icon = item.icon;
    return (
      <div>
        <button
          type="button"
          onClick={() => toggleGroup(item.id)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
          style={{
            color:           childActive ? '#FFFFFF' : theme.cores.textoClaro,
            borderLeft:      childActive ? `3px solid ${theme.cores.secundaria}` : '3px solid transparent',
            backgroundColor: childActive ? 'rgba(255,255,255,0.08)' : 'transparent',
          }}
        >
          <div className="flex items-center gap-3"><Icon size={16} /><span>{item.label}</span></div>
          <ChevronDown size={13} className={`opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="ml-4 pl-3 border-l border-white/10 space-y-0.5 mt-0.5">
            {item.children.map(child => (
              <NavLink key={child.path} to={child.path} onClick={() => setMenuOpen(false)}
                className="w-full flex items-center pl-4 pr-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color:           isActive ? '#FFFFFF' : theme.cores.textoClaro,
                  borderLeft:      isActive ? `3px solid ${theme.cores.secundaria}` : '3px solid transparent',
                })}>
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  function NavItemSimple({ item }) {
    const Icon = item.icon;
    return (
      <NavLink to={item.path} onClick={() => setMenuOpen(false)}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
        style={({ isActive }) => ({
          backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
          color:           isActive ? '#FFFFFF' : theme.cores.textoClaro,
          borderLeft:      isActive ? `3px solid ${theme.cores.secundaria}` : '3px solid transparent',
        })}>
        <Icon size={16} /><span>{item.label}</span>
      </NavLink>
    );
  }

  function Sidebar() {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: theme.cores.sidebar }}>
        <div className="bg-white shrink-0">
          <div className="p-4 flex justify-center">
            <img src={theme.logo} alt="Logo" className="max-w-[140px] max-h-[56px] object-contain" />
          </div>
          <div style={{ height: 3, backgroundColor: theme.cores.secundaria }} />
        </div>

        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto soft-scrollbar">
          <style>{`.soft-scrollbar::-webkit-scrollbar{width:4px}.soft-scrollbar::-webkit-scrollbar-thumb{background:rgba(148,163,184,.3);border-radius:99px}`}</style>
          {tabs.map(item =>
            item.children
              ? <NavItemGroup key={item.id} item={item} />
              : <NavItemSimple key={item.path} item={item} />
          )}
        </nav>

        <div style={{ height: 3, backgroundColor: theme.cores.secundaria }} />

        <div className="p-3 shrink-0">
          <div className="rounded-2xl bg-white/10 p-3 space-y-2">
            <div>
              <div className="text-sm font-semibold text-white truncate">{usuario?.nome || 'Usuário'}</div>
              <div className="text-xs truncate" style={{ color: theme.cores.textoClaro }}>{perfil || '—'}</div>
            </div>
            {onChangePass && (
              <button type="button" onClick={onChangePass}
                className="w-full rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 transition"
                style={{ background: 'rgba(255,255,255,0.10)', color: theme.cores.textoClaro, border: '1px solid rgba(255,255,255,0.15)' }}>
                <KeyRound size={12} /> Alterar senha
              </button>
            )}
            <button type="button" onClick={logout}
              className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 px-3 py-2 text-xs font-semibold text-white flex items-center justify-center gap-2 transition">
              <LogOut size={12} /> Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex" style={{ backgroundColor: theme.cores.fundo }}>
      <aside className="hidden md:flex flex-col h-screen shrink-0" style={{ width: 210 }}>
        <Sidebar />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col h-screen">
        <header className="md:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between shrink-0">
          <strong className="text-sm text-slate-800">{theme.nomeSistema}</strong>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="text-white px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: theme.cores.sidebar }}>
            Menu
          </button>
        </header>

        {menuOpen && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMenuOpen(false)} />
            <div className="md:hidden fixed left-0 top-0 bottom-0 z-50 flex flex-col" style={{ width: 230 }}>
              <Sidebar />
            </div>
          </>
        )}

        <main className="flex-1 p-4 md:p-6 overflow-y-auto soft-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}