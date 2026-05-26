import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import {
  LayoutDashboard,
  ClipboardPlus,
  BarChart3,
  ChevronDown,
  FolderKanban,
  LogOut,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext.jsx';

const TENANT_ID = '7190dac7-342c-408f-81df-890c194ccfad';

const defaultTheme = {
  nomeSistema: 'Escala Médica',
  logo: 'https://placehold.co/180x70/ffffff/0f172a?text=LOGO',
  cores: {
    fundo: '#F1F5F9',
    sidebar: '#0F172A',
    secundaria: '#D4A62A',
    textoClaro: '#CBD5E1',
  },
};

export default function MainLayout({ children }) {
  const { usuario, perfil, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [cadastrosOpen, setCadastrosOpen] = useState(true);
  const [plantoesOpen, setPlantoesOpen] = useState(true);
  const [theme, setTheme] = useState(defaultTheme);

  useEffect(() => {
    carregarTema();

    function atualizarTema(event) {
      const dados = event.detail;

      setTheme({
        nomeSistema: dados.nome_sistema || defaultTheme.nomeSistema,
        logo: dados.logo_url || defaultTheme.logo,
        cores: {
          fundo: dados.cor_fundo || defaultTheme.cores.fundo,
          sidebar: dados.cor_primaria || defaultTheme.cores.sidebar,
          secundaria: dados.cor_secundaria || defaultTheme.cores.secundaria,
          textoClaro: '#CBD5E1',
        },
      });
    }

    window.addEventListener('tenant-theme-updated', atualizarTema);

    return () => {
      window.removeEventListener('tenant-theme-updated', atualizarTema);
    };
  }, []);

  async function carregarTema() {
    const { data, error } = await supabase
      .from('tenants')
      .select('nome_sistema, logo_url, cor_primaria, cor_secundaria, cor_fundo')
      .eq('id', TENANT_ID)
      .single();

    if (error) {
      console.error('Erro ao carregar tema:', error);
      return;
    }

    setTheme({
      nomeSistema: data.nome_sistema || defaultTheme.nomeSistema,
      logo: data.logo_url || defaultTheme.logo,
      cores: {
        fundo: data.cor_fundo || defaultTheme.cores.fundo,
        sidebar: data.cor_primaria || defaultTheme.cores.sidebar,
        secundaria: data.cor_secundaria || defaultTheme.cores.secundaria,
        textoClaro: '#CBD5E1',
      },
    });
  }

  async function sairSistema() {
    await logout();
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }

  function GroupButton({ icon: Icon, label, open, onClick }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-semibold transition-all hover:bg-white/10"
        style={{ color: '#FFFFFF' }}
      >
        <div className="flex items-center gap-3">
          <Icon size={19} />
          <span>{label}</span>
        </div>

        <ChevronDown
          size={17}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
    );
  }

  function MainLink({ to, icon: Icon, label, onClick }) {
    return (
      <NavLink
        to={to}
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all"
        style={({ isActive }) => ({
          backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
          color: isActive ? '#FFFFFF' : theme.cores.textoClaro,
          borderLeft: isActive
            ? `3px solid ${theme.cores.secundaria}`
            : '3px solid transparent',
        })}
      >
        <Icon size={19} />
        <span>{label}</span>
      </NavLink>
    );
  }

  function SubLink({ to, label, onClick }) {
    return (
      <NavLink
        to={to}
        onClick={onClick}
        className="w-full flex items-center pl-5 pr-3 py-2.5 rounded-xl text-[14px] font-medium transition-all"
        style={({ isActive }) => ({
          backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
          color: isActive ? '#FFFFFF' : theme.cores.textoClaro,
          borderLeft: isActive
            ? `3px solid ${theme.cores.secundaria}`
            : '3px solid transparent',
        })}
      >
        <span className="ml-4">{label}</span>
      </NavLink>
    );
  }

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ backgroundColor: theme.cores.fundo }}
    >
      <style>
        {`
          .soft-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }

          .soft-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }

          .soft-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.35);
            border-radius: 999px;
          }

          .soft-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(148, 163, 184, 0.55);
          }

          .soft-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
          }
        `}
      </style>

      <div className="flex h-screen">
        <aside
          className="hidden md:flex text-white flex-col h-screen shrink-0"
          style={{
            width: '220px',
            minWidth: '220px',
            maxWidth: '220px',
            backgroundColor: theme.cores.sidebar,
          }}
        >
          <div className="bg-white shrink-0">
            <div className="p-6 flex justify-center">
              <img
                src={theme.logo}
                alt="Logo"
                className="max-w-[150px] max-h-[70px] object-contain"
              />
            </div>

            <div
              style={{
                height: '3px',
                backgroundColor: theme.cores.secundaria,
              }}
            />
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto soft-scrollbar">
            <MainLink
              to="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
            />

            <GroupButton
              icon={FolderKanban}
              label="Cadastros"
              open={cadastrosOpen}
              onClick={() => setCadastrosOpen(!cadastrosOpen)}
            />

            {cadastrosOpen && (
              <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
                <SubLink to="/usuarios" label="Usuários" />
                <SubLink to="/prestadores" label="Prestadores" />
                <SubLink to="/escalas" label="Escalas" />
                <SubLink to="/turnos" label="Turnos" />
                <SubLink to="/remuneracao" label="Remuneração" />
                <SubLink to="/configuracoes" label="Configurações" />
              </div>
            )}

            <GroupButton
              icon={ClipboardPlus}
              label="Plantões"
              open={plantoesOpen}
              onClick={() => setPlantoesOpen(!plantoesOpen)}
            />

            {plantoesOpen && (
              <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
                <SubLink to="/plantoes" label="Gerar Plantões" />
                <SubLink to="/gestao-plantoes" label="Gestão de Plantões" />
                <SubLink to="/calendario" label="Calendário" />
              </div>
            )}

            <MainLink to="/relatorios" icon={BarChart3} label="Relatórios" />
          </nav>

          <div
            className="shrink-0"
            style={{
              height: '3px',
              backgroundColor: theme.cores.secundaria,
            }}
          />

          <div className="p-4 shrink-0">
            <div className="rounded-2xl bg-white/10 p-4 space-y-3">
              <div>
                <div className="text-sm font-semibold truncate">
                  {usuario?.nome || 'Usuário'}
                </div>
                <div
                  className="text-xs"
                  style={{ color: theme.cores.textoClaro }}
                >
                  {perfil || 'Perfil'}
                </div>
              </div>

              <button
                type="button"
                onClick={sairSistema}
                className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col h-screen">
          <header className="md:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between shrink-0">
            <strong>{theme.nomeSistema}</strong>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-white px-4 py-2 rounded-lg"
              style={{ backgroundColor: theme.cores.sidebar }}
            >
              Menu
            </button>
          </header>

          {menuOpen && (
            <div
              className="md:hidden text-white p-4 space-y-1 shrink-0"
              style={{ backgroundColor: theme.cores.sidebar }}
            >
              <MainLink
                to="/dashboard"
                icon={LayoutDashboard}
                label="Dashboard"
                onClick={() => setMenuOpen(false)}
              />

              <SubLink
                to="/usuarios"
                label="Usuários"
                onClick={() => setMenuOpen(false)}
              />
              <SubLink
                to="/prestadores"
                label="Prestadores"
                onClick={() => setMenuOpen(false)}
              />
              <SubLink
                to="/escalas"
                label="Escalas"
                onClick={() => setMenuOpen(false)}
              />
              <SubLink
                to="/turnos"
                label="Turnos"
                onClick={() => setMenuOpen(false)}
              />
              <SubLink
                to="/remuneracao"
                label="Remuneração"
                onClick={() => setMenuOpen(false)}
              />
              <SubLink
                to="/configuracoes"
                label="Configurações"
                onClick={() => setMenuOpen(false)}
              />
              <SubLink
                to="/plantoes"
                label="Gerar Plantões"
                onClick={() => setMenuOpen(false)}
              />
              <SubLink
                to="/gestao-plantoes"
                label="Gestão de Plantões"
                onClick={() => setMenuOpen(false)}
              />
              <SubLink
                to="/calendario"
                label="Calendário"
                onClick={() => setMenuOpen(false)}
              />

              <MainLink
                to="/relatorios"
                icon={BarChart3}
                label="Relatórios"
                onClick={() => setMenuOpen(false)}
              />

              <button
                type="button"
                onClick={sairSistema}
                className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 px-3 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition mt-3"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}

          <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-auto soft-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
