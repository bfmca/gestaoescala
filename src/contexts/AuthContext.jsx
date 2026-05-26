import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';

const AuthContext = createContext(null);

const SB_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SCHEMA  = import.meta.env.VITE_SUPABASE_SCHEMA || 'appescala';

const SESSION_KEY = 'gestaoescala-session';

// ── REST helpers ──────────────────────────────────────────────
async function restSignIn(email, password) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SB_KEY },
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error_description || d.message || 'Credenciais inválidas');
  return d; // { access_token, refresh_token, user, ... }
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
    const r = await fetch(url, {
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${token}`,
        'Accept-Profile': SCHEMA,
      },
    });
    if (!r.ok) { console.error('[Auth] buscarPerfil:', r.status); return null; }
    const data = await r.json();
    return Array.isArray(data) ? (data[0] || null) : null;
  } catch (e) {
    console.error('[Auth] buscarPerfil erro:', e.message);
    return null;
  }
}

// ── Persistência ──────────────────────────────────────────────
function salvarSessao(token, refreshToken, user) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ token, refreshToken, user })); } catch {}
}
function lerSessao() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
function limparSessao() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// ── Sincroniza token com o SDK do Supabase ────────────────────
// Isso faz com que supabase.from('tabela') nas páginas use o token
// correto em vez de rodar como anon
async function sincronizarSDK(token, refreshToken) {
  try {
    await supabase.auth.setSession({
      access_token:  token,
      refresh_token: refreshToken || '',
    });
  } catch (e) {
    console.warn('[Auth] sincronizarSDK falhou:', e.message);
  }
}

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [token,      setToken]      = useState(null);
  const [authUser,   setAuthUser]   = useState(null);
  const [usuario,    setUsuario]    = useState(undefined);
  const [loading,    setLoading]    = useState(true);
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    async function restaurar() {
      const saved = lerSessao();
      if (!saved?.token || !saved?.user?.id) {
        setUsuario(null);
        setLoading(false);
        return;
      }
      // Sincroniza SDK antes de buscar perfil (queries das páginas funcionam)
      await sincronizarSDK(saved.token, saved.refreshToken);

      const perfil = await buscarPerfil(saved.token, saved.user.id);
      if (!perfil) {
        limparSessao();
        await supabase.auth.signOut();
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
    restaurar();
  }, []);

  async function login(email, senha) {
    const data = await restSignIn(email, senha);
    const tok  = data.access_token;
    const ref  = data.refresh_token || '';
    const user = data.user;
    const forceChange = user?.user_metadata?.must_change_password === true;

    // Sincroniza SDK ANTES de qualquer query nas páginas
    await sincronizarSDK(tok, ref);

    salvarSessao(tok, ref, user);
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

  async function logout() {
    if (token) await restSignOut(token);
    limparSessao();
    await supabase.auth.signOut();
    setToken(null);
    setAuthUser(null);
    setUsuario(null);
    setMustChange(false);
  }

  async function trocarSenha(novaSenha) {
    if (!token) throw new Error('Sem sessão ativa');
    await restUpdatePassword(token, novaSenha);
    const novoUser = {
      ...authUser,
      user_metadata: { ...(authUser?.user_metadata || {}), must_change_password: false },
    };
    salvarSessao(token, null, novoUser);
    setAuthUser(novoUser);
    setMustChange(false);
    if (authUser?.id) {
      const perfil = await buscarPerfil(token, authUser.id);
      setUsuario(perfil);
    }
  }

  const session      = token ? { access_token: token, user: authUser } : null;
  const perfil       = usuario?.perfil || null;
  const isMaster     = perfil === 'MASTER';
  const isAdmin      = perfil === 'ADMIN' || isMaster;
  const isOperador   = perfil === 'OPERADOR';
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