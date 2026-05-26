import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { useEffect, useRef } from 'react';

import { ToastProvider } from './components/ui/ToastProvider.jsx';

import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';

import MainLayout from './layouts/MainLayout.jsx';

import LoginPage from './pages/LoginPage.jsx';

import UsuariosPage from './pages/UsuariosPage.jsx';

import PrestadoresPage from './pages/PrestadoresPage.jsx';
import EscalasPage from './pages/EscalasPage.jsx';
import TurnosPage from './pages/TurnosPage.jsx';
import RemuneracaoPage from './pages/RemuneracaoPage.jsx';
import PlantoesPage from './pages/PlantoesPage.jsx';
import GestaoPlantoesPage from './pages/GestaoPlantoesPage.jsx';
import CalendarioPage from './pages/CalendarioPage.jsx';
import ConfiguracoesPage from './pages/ConfiguracoesPage.jsx';

const TEMPO_INATIVIDADE = 15 * 60 * 1000;

function PlaceholderPage({ title }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8">
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>

      <p className="text-slate-500 mt-2">Tela em desenvolvimento.</p>
    </div>
  );
}

function ProtectedApp() {
  const { session, usuario, loading, logout } = useAuth();

  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!session) return;

    iniciarMonitoramento();

    window.addEventListener('mousemove', reiniciarTimer);
    window.addEventListener('keydown', reiniciarTimer);
    window.addEventListener('click', reiniciarTimer);

    return () => {
      limparTimer();

      window.removeEventListener('mousemove', reiniciarTimer);
      window.removeEventListener('keydown', reiniciarTimer);
      window.removeEventListener('click', reiniciarTimer);
    };
  }, [session]);

  function iniciarMonitoramento() {
    limparTimer();

    timeoutRef.current = setTimeout(async () => {
      alert('Sessão encerrada por inatividade. Faça login novamente.');

      await logout();

      localStorage.clear();
      sessionStorage.clear();

      window.location.reload();
    }, TEMPO_INATIVIDADE);
  }

  function reiniciarTimer() {
    iniciarMonitoramento();
  }

  function limparTimer() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }

  if (loading || usuario === undefined) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-600 font-semibold">
          Carregando sistema...
        </div>
      </div>
    );
  }

  if (!session || !usuario) {
    return <LoginPage />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/dashboard"
          element={<PlaceholderPage title="Dashboard" />}
        />

        <Route path="/usuarios" element={<UsuariosPage />} />

        <Route path="/prestadores" element={<PrestadoresPage />} />

        <Route path="/escalas" element={<EscalasPage />} />

        <Route path="/turnos" element={<TurnosPage />} />

        <Route path="/remuneracao" element={<RemuneracaoPage />} />

        <Route path="/plantoes" element={<PlantoesPage />} />

        <Route path="/gestao-plantoes" element={<GestaoPlantoesPage />} />

        <Route path="/calendario" element={<CalendarioPage />} />

        <Route
          path="/relatorios"
          element={<PlaceholderPage title="Relatórios" />}
        />

        <Route path="/configuracoes" element={<ConfiguracoesPage />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </MainLayout>
  );
}
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <ProtectedApp />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
