// ── Auth via REST direto — mesmo padrão do IAC ───────────────
// Sem SDK, sem onAuthStateChange, sem race conditions.
// Login → busca perfil imediatamente → estado atualizado.

import { createContext, useContext, useEffect, useState } from 'react';
import { TENANT_ID } from '../config';

const AuthContext = createContext(null);

const SB_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SCHEMA  = import.meta.env.VITE_SUPABASE_SCHEMA || 'appescala';

const SESSION_KEY = 'gestaoescala-session';

// ── Helpers REST ──────────────────────────────────────────────
function headers(token) {
  return {
    'Content-Type':   'application/json',
    apikey:           SB_KEY,
    Authorization:    `Bearer ${token || SB_KEY}`,
    'Accept-Profile': SCHEMA,
  };
}

async function restSignIn(email, password) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SB_KEY },
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error_description || d.message || 'Credenciais inválidas');
  return d;
}

async function restSignOut(token) {
  try {
    await fetch(`${SB_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
    });
  } catch {}
}

async function restUpdatePassword(token, newPass) {
  const r = await fetch(`${SB_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password: newPass, data: { must_change_password: false } }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error_description || d.message || 'Erro ao atualizar senha');
  }
}

async function buscarPerfil(token, authUserId) {
  try {
    const url = `${SB_URL}/rest/v1/usuarios?auth_user_id=eq.${authUserId}&ativo=eq.true&limit=1`;
    const r = await fetch(url, { headers: headers(token) });
    if (!r.ok) {
      console.error('[Auth] Erro buscar perfil:', r.status, await r.text());
      return null;
    }
    const data = await r.json();
    const perfil = Array.isArray(data) ? (data[0] || null) : null;
    console.log('[Auth] Perfil:', perfil?.perfil || 'não encontrado');
    return perfil;
  } catch (e) {
    console.error('[Auth] buscarPerfil falhou:', e.message);
    return null;
  }
}

// ── Persistência de sessão no localStorage ───────────────────
function salvarSessao(token, user) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user })); } catch {}
}
function lerSessao() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
function limparSessao() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [token,      setToken]      = useState(null);
  const [authUser,   setAuthUser]   = useState(null);
  const [usuario,    setUsuario]    = useState(undefined); // undefined = carregando
  const [loading,    setLoading]    = useState(true);
  const [mustChange, setMustChange] = useState(false);

  // Na montagem: verifica sessão salva no localStorage
  useEffect(() => {
    async function restaurarSessao() {
      const saved = lerSessao();
      if (!saved?.token || !saved?.user?.id) {
        setUsuario(null);
        setLoading(false);
        return;
      }

      console.log('[Auth] Restaurando sessão...');
      const perfil = await buscarPerfil(saved.token, saved.user.id);

      if (!perfil) {
        // Token expirado ou perfil não encontrado — limpa e vai pro login
        console.warn('[Auth] Sessão inválida, limpando...');
        limparSessao();
        setUsuario(null);
      } else {
        const forceChange = saved.user.user_metadata?.must_change_password === true;
        setToken(saved.token);
        setAuthUser(saved.user);
        setMustChange(forceChange);
        setUsuario(forceChange ? null : perfil);
      }
      setLoading(false);
    }
    restaurarSessao();
  }, []);

  // ── Login ────────────────────────────────────────────────
  async function login(email, senha) {
    const data = await restSignIn(email, senha);
    // data = { access_token, user, ... }
    const tok  = data.access_token;
    const user = data.user;
    const forceChange = user?.user_metadata?.must_change_password === true;

    salvarSessao(tok, user);
    setToken(tok);
    setAuthUser(user);
    setMustChange(forceChange);

    if (!forceChange) {
      const perfil = await buscarPerfil(tok, user.id);
      setUsuario(perfil);
    } else {
      setUsuario(null);
    }
  }

  // ── Logout ───────────────────────────────────────────────
  async function logout() {
    if (token) await restSignOut(token);
    limparSessao();
    setToken(null);
    setAuthUser(null);
    setUsuario(null);
    setMustChange(false);
  }

  // ── Troca de senha ───────────────────────────────────────
  async function trocarSenha(novaSenha) {
    if (!token) throw new Error('Sem sessão ativa');
    await restUpdatePassword(token, novaSenha);

    // Atualiza metadata local
    const novoUser = { ...authUser, user_metadata: { ...(authUser?.user_metadata || {}), must_change_password: false } };
    salvarSessao(token, novoUser);
    setAuthUser(novoUser);
    setMustChange(false);

    // Recarrega perfil
    if (authUser?.id) {
      const perfil = await buscarPerfil(token, authUser.id);
      setUsuario(perfil);
    }
  }

  // ── Helpers de perfil ────────────────────────────────────
  const session    = token ? { access_token: token, user: authUser } : null;
  const perfil     = usuario?.perfil || null;
  const isMaster   = perfil === 'MASTER';
  const isAdmin    = perfil === 'ADMIN' || isMaster;
  const isOperador = perfil === 'OPERADOR';
  const isVisualizador = perfil === 'VISUALIZADOR';

  return (
    <AuthContext.Provider value={{
      session, usuario, loading, mustChange,
      login, logout, trocarSenha,
      perfil, isMaster, isAdmin, isOperador, isVisualizador,
      podeGerenciarUsuarios: isMaster,
      podeAcessarCadastros:  isMaster || isAdmin,
      podeGerenciarPlantoes: isMaster || isAdmin || isOperador,
      podeConferir:          isMaster || isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
