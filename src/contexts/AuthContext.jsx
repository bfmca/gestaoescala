import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';
import { consumeSsoFromUrl } from '../lib/tenantBranding';
import { carregarTemaTenant } from '../lib/tenantTheme';

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
    headers: {
      'Content-Type': 'application/json',
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
    },
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
    if (!r.ok) return null;
    const data = await r.json();
    return Array.isArray(data) ? (data[0] || null) : null;
  } catch { return null; }
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

// ── Sincroniza token com o SDK (para queries das páginas) ─────
async function sincronizarSDK(token, refreshToken) {
  try {
    await supabase.auth.setSession({
      access_token:  token,
      refresh_token: refreshToken || '',
    });
  } catch {}
}

function resolveTenantId(perfil) {
  return perfil?.tenant_id || TENANT_ID;
}

async function aplicarBrandingTenant(tenantId) {
  if (!tenantId) return;
  try {
    await carregarTemaTenant(tenantId, { checkModule: false });
  } catch (err) {
    console.warn('[Auth] branding:', err.message);
  }
}

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [token,      setToken]      = useState(null);
  const [authUser,   setAuthUser]   = useState(null);
  const [usuario,    setUsuario]    = useState(undefined);
  const [loading,    setLoading]    = useState(true);
  const [mustChange, setMustChange] = useState(false);

  async function finalizarSessao(tok, ref, user, perfil) {
    const forceChange = user?.user_metadata?.must_change_password === true;
    setToken(tok);
    setAuthUser(user);
    setMustChange(forceChange);
    setUsuario(forceChange ? null : perfil);

    if (!forceChange && perfil) {
      await aplicarBrandingTenant(resolveTenantId(perfil));
    }
  }

  useEffect(() => {
    // Escuta eventos do SDK — especialmente PASSWORD_RECOVERY
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] SDK event:', event);

        if (event === 'PASSWORD_RECOVERY') {
          // Usuário clicou no link de reset — mostra tela de nova senha
          const tok = session.access_token;
          const ref = session.refresh_token || '';
          await sincronizarSDK(tok, ref);
          salvarSessao(tok, ref, session.user);
          setToken(tok);
          setAuthUser(session.user);
          setMustChange(true);
          setUsuario(null);
          setLoading(false);
          // Limpa o hash da URL para não redirecionar novamente
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    );

    // Restaura sessão salva no localStorage
    async function restaurar() {
      const saved = lerSessao();
      if (!saved?.token || !saved?.user?.id) {
        setUsuario(null);
        setLoading(false);
        return;
      }
      await sincronizarSDK(saved.token, saved.refreshToken);
      const perfil = await buscarPerfil(saved.token, saved.user.id);
      if (!perfil) {
        limparSessao();
        await supabase.auth.signOut();
        setUsuario(null);
      } else {
        await finalizarSessao(saved.token, saved.refreshToken, saved.user, perfil);
      }
      setLoading(false);
    }

    async function bootstrap() {
      const hash = window.location.hash;

      if (hash.includes('type=recovery')) {
        console.log('[Auth] Recovery token detectado na URL');
        setTimeout(() => {
          setLoading(prev => { if (prev) { setUsuario(null); return false; } return prev; });
        }, 5000);
        return;
      }

      try {
        const ssoSession = await consumeSsoFromUrl();
        if (ssoSession) {
          const tok = ssoSession.access_token;
          const ref = ssoSession.refresh_token || '';
          salvarSessao(tok, ref, ssoSession.user);
          await sincronizarSDK(tok, ref);
          const perfil = await buscarPerfil(tok, ssoSession.user.id);
          if (perfil) {
            await finalizarSessao(tok, ref, ssoSession.user, perfil);
          } else {
            setToken(tok);
            setAuthUser(ssoSession.user);
            setUsuario(null);
            await aplicarBrandingTenant(TENANT_ID);
          }
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('[Auth] SSO:', err.message);
      }

      await restaurar();
    }

    bootstrap();

    return () => listener?.subscription?.unsubscribe();
  }, []);

  // ── Login ─────────────────────────────────────────────────
  async function login(email, senha) {
    const data = await restSignIn(email, senha);
    const tok  = data.access_token;
    const ref  = data.refresh_token || '';
    const user = data.user;
    const forceChange = user?.user_metadata?.must_change_password === true;

    await sincronizarSDK(tok, ref);
    salvarSessao(tok, ref, user);
    setToken(tok);
    setAuthUser(user);
    setMustChange(forceChange);

    if (!forceChange) {
      const perfil = await buscarPerfil(tok, user.id);
      setUsuario(perfil);
      await aplicarBrandingTenant(resolveTenantId(perfil));
    } else {
      setUsuario(null);
    }
  }

  // ── Logout ────────────────────────────────────────────────
  async function logout() {
    if (token) await restSignOut(token);
    limparSessao();
    await supabase.auth.signOut();
    setToken(null);
    setAuthUser(null);
    setUsuario(null);
    setMustChange(false);
  }

  // ── Troca de senha ────────────────────────────────────────
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

  const tenantId         = resolveTenantId(usuario);
  const session        = token ? { access_token: token, user: authUser } : null;
  const perfil         = usuario?.perfil || null;
  const isMaster       = perfil === 'MASTER';
  const isAdmin        = perfil === 'ADMIN' || isMaster;
  const isOperador     = perfil === 'OPERADOR';
  const isVisualizador = perfil === 'VISUALIZADOR';

  return (
    <AuthContext.Provider value={{
      session, usuario, tenantId, loading, mustChange,
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