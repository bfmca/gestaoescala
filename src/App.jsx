import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

import { ToastProvider }           from './components/ui/ToastProvider.jsx';
import { AuthProvider, useAuth }   from './contexts/AuthContext.jsx';
import MainLayout                  from './layouts/MainLayout.jsx';
import LoginPage                   from './pages/LoginPage.jsx';

import UsuariosPage        from './pages/UsuariosPage.jsx';
import PrestadoresPage     from './pages/PrestadoresPage.jsx';
import EscalasPage         from './pages/EscalasPage.jsx';
import TurnosPage          from './pages/TurnosPage.jsx';
import RemuneracaoPage     from './pages/RemuneracaoPage.jsx';
import PlantoesPage        from './pages/PlantoesPage.jsx';
import GestaoPlantoesPage  from './pages/GestaoPlantoesPage.jsx';
import CalendarioPage      from './pages/CalendarioPage.jsx';
import ConfiguracoesPage   from './pages/ConfiguracoesPage.jsx';
import Dashboard           from './pages/Dashboard.jsx';
import ProducaoPage        from './pages/ProducaoPage.jsx';
import ColaboradoresPage   from './pages/ColaboradoresPage.jsx';
import TransferenciasPage  from './pages/TransferenciasPage.jsx';
import ImpressaoEscalaPage from './pages/ImpressaoEscalaPage.jsx';

const TEMPO_INATIVIDADE = 15 * 60 * 1000;

const HOME_POR_PERFIL = {
  MASTER:       '/gestao-plantoes',
  ADMIN:        '/gestao-plantoes',
  OPERADOR:     '/gestao-plantoes',
  VISUALIZADOR: '/calendario',
};

const ROUTE_PERFIS = {
  '/dashboard':       ['MASTER', 'ADMIN', 'VISUALIZADOR'],
  '/usuarios':        ['MASTER'],
  '/prestadores':     ['MASTER', 'ADMIN'],
  '/escalas':         ['MASTER', 'ADMIN'],
  '/turnos':          ['MASTER', 'ADMIN'],
  '/remuneracao':     ['MASTER', 'ADMIN'],
  '/configuracoes':   ['MASTER'],
  '/plantoes':        ['MASTER', 'ADMIN'],
  '/gestao-plantoes': ['MASTER', 'ADMIN', 'OPERADOR'],
  '/calendario':      ['MASTER', 'ADMIN', 'OPERADOR', 'VISUALIZADOR'],
  '/colaboradores':   ['MASTER', 'ADMIN'],
  '/producao':        ['MASTER', 'ADMIN', 'OPERADOR'],
  '/transferencias':  ['MASTER', 'ADMIN', 'OPERADOR'],
  '/relatorios':      ['MASTER', 'ADMIN'],
};

function ChangePasswordScreen({ isForced }) {
  const { trocarSenha, logout } = useAuth();
  const [p1, setP1]         = useState('');
  const [p2, setP2]         = useState('');
  const [err, setErr]       = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setErr('');
    if (p1.length < 8) { setErr('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (p1 !== p2)      { setErr('As senhas não coincidem.'); return; }
    try {
      setSaving(true);
      await trocarSenha(p1);
    } catch (e) {
      setErr(e.message || 'Erro ao atualizar senha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-8 text-white">
          <div className="text-xl font-extrabold mb-1">
            {isForced ? 'Defina sua senha' : 'Alterar senha'}
          </div>
          <p className="text-slate-400 text-sm">
            {isForced ? 'Primeiro acesso — crie uma senha com pelo menos 8 caracteres.' : 'Digite sua nova senha abaixo.'}
          </p>
        </div>
        <div className="p-8 space-y-4">
          {err && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-sm font-semibold">{err}</div>}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nova senha *</label>
            <input type="password" value={p1} onChange={e => setP1(e.target.value)} placeholder="Mínimo 8 caracteres"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-700" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Confirmar senha *</label>
            <input type="password" value={p2} onChange={e => setP2(e.target.value)} placeholder="Repita a senha"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-700" />
          </div>
          <div className="flex gap-3 pt-1">
            {!isForced && (
              <button onClick={logout} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                Cancelar
              </button>
            )}
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-60 hover:bg-slate-800 transition">
              {saving ? 'Salvando...' : isForced ? 'Confirmar senha' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Rota({ path, element }) {
  const { perfil } = useAuth();
  const permitidos = ROUTE_PERFIS[path] || [];
  if (!perfil || !permitidos.includes(perfil)) {
    return <Navigate to={HOME_POR_PERFIL[perfil] || '/gestao-plantoes'} replace />;
  }
  return element;
}

function ProtectedApp() {
  const { session, usuario, loading, mustChange, perfil, logout } = useAuth();
  const timeoutRef    = useRef(null);
  const redirected    = useRef(false);
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (!session) return;
    const reset = () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        alert('Sessão encerrada por inatividade.');
        await logout();
      }, TEMPO_INATIVIDADE);
    };
    reset();
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown',   reset);
    window.addEventListener('click',     reset);
    return () => {
      clearTimeout(timeoutRef.current);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown',   reset);
      window.removeEventListener('click',     reset);
    };
  }, [session, logout]);

  if (loading || usuario === undefined) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
        <div className="text-slate-400 text-sm">Carregando...</div>
      </div>
    );
  }

  if (!session) return <LoginPage />;
  if (!usuario && !mustChange) return <LoginPage />;
  if (mustChange)   return <ChangePasswordScreen isForced />;
  if (changingPass) return <ChangePasswordScreen isForced={false} />;

  const home = HOME_POR_PERFIL[perfil] || '/gestao-plantoes';

  return (
    <MainLayout onChangePass={() => setChangingPass(true)}>
      <Routes>
        <Route path="/"                element={<Navigate to={home} replace />} />
        <Route path="/dashboard"       element={<Rota path="/dashboard"       element={<Dashboard />} />} />
        <Route path="/usuarios"        element={<Rota path="/usuarios"        element={<UsuariosPage />} />} />
        <Route path="/prestadores"     element={<Rota path="/prestadores"     element={<PrestadoresPage />} />} />
        <Route path="/escalas"         element={<Rota path="/escalas"         element={<EscalasPage />} />} />
        <Route path="/turnos"          element={<Rota path="/turnos"          element={<TurnosPage />} />} />
        <Route path="/remuneracao"     element={<Rota path="/remuneracao"     element={<RemuneracaoPage />} />} />
        <Route path="/plantoes"        element={<Rota path="/plantoes"        element={<PlantoesPage />} />} />
        <Route path="/gestao-plantoes" element={<Rota path="/gestao-plantoes" element={<GestaoPlantoesPage />} />} />
        <Route path="/calendario"      element={<Rota path="/calendario"      element={<CalendarioPage />} />} />
        <Route path="/configuracoes"   element={<Rota path="/configuracoes"   element={<ConfiguracoesPage />} />} />
        <Route path="/colaboradores" element={<Rota path="/colaboradores" element={<ColaboradoresPage />} />} />
        <Route path="/producao"       element={<Rota path="/producao"       element={<ProducaoPage />} />} />
        <Route path="/transferencias" element={<Rota path="/transferencias" element={<TransferenciasPage />} />} />
        <Route path="/relatorios"      element={<Rota path="/relatorios"      element={
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>
            <p className="text-slate-500 mt-2 text-sm">Em desenvolvimento.</p>
          </div>
        } />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/imprimir-escala" element={<ImpressaoEscalaPage />} />
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}