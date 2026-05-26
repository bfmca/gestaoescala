import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';

const AuthContext = createContext(null);

const PERFIL_CACHE_KEY  = 'gestaoescala-perfil';
const SAFETY_TIMEOUT_MS = 15000;
const QUERY_TIMEOUT_MS  = 8000;

function lerPerfilCache(authUserId) {
  try {
    const raw = sessionStorage.getItem(PERFIL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.auth_user_id === authUserId ? parsed : null;
  } catch { return null; }
}
function salvarPerfilCache(p) {
  try { sessionStorage.setItem(PERFIL_CACHE_KEY, JSON.stringify(p)); } catch {}
}
function limparPerfilCache() {
  try { sessionStorage.removeItem(PERFIL_CACHE_KEY); } catch {}
}
async function queryComTimeout(promise, ms = QUERY_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('query_timeout')), ms))
  ]);
}

export function AuthProvider({ children }) {
  const [session,    setSession]    = useState(null);
  const [usuario,    setUsuario]    = useState(undefined);
  const [loading,    setLoading]    = useState(true);
  const [mustChange, setMustChange] = useState(false);
  const perfilCarregado = useRef(false);

  useEffect(() => {
    let cancelado = false;

    const safety = setTimeout(() => {
      if (cancelado) return;
      console.warn('[Auth] Safety timeout');
      if (usuario === undefined) setUsuario(null);
      setLoading(false);
    }, SAFETY_TIMEOUT_MS);

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, sessao) => {
        if (cancelado) return;
        console.log('[Auth]', event, sessao ? '✓' : '✗');

        if (event === 'SIGNED_OUT') {
          limparPerfilCache();
          perfilCarregado.current = false;
          setSession(null); setUsuario(null); setMustChange(false);
          setLoading(false); clearTimeout(safety);
          return;
        }
        if (event === 'TOKEN_REFRESHED') { setSession(sessao); return; }

        setSession(sessao || null);

        if (sessao?.user?.id) {
          const forceChange = sessao.user.user_metadata?.must_change_password === true;
          setMustChange(forceChange);
          if (forceChange) {
            setUsuario(null);
          } else if (!perfilCarregado.current) {
            await carregarPerfil(sessao.user.id, cancelado);
            perfilCarregado.current = true;
          }
        } else {
          perfilCarregado.current = false;
          setUsuario(null); setMustChange(false);
        }

        if (!cancelado) { clearTimeout(safety); setLoading(false); }
      }
    );

    return () => { cancelado = true; clearTimeout(safety); listener?.subscription?.unsubscribe(); };
  }, []);

  async function carregarPerfil(authUserId, cancelado) {
    const cached = lerPerfilCache(authUserId);
    if (cached) {
      console.log('[Auth] Cache:', cached.perfil);
      if (!cancelado) setUsuario(cached);
      atualizarPerfilBackground(authUserId);
      return;
    }
    await buscarPerfilBanco(authUserId, cancelado);
  }

  async function buscarPerfilBanco(authUserId, cancelado) {
    try {
      console.log('[Auth] Buscando perfil...');

      // Busca por auth_user_id — sem filtro tenant_id
      // (evita falha quando tenant_id estiver NULL no registro)
      const { data, error } = await queryComTimeout(
        supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', authUserId)
          .eq('ativo', true)
          .maybeSingle()
      );

      if (error) {
        console.error('[Auth] Erro query:', error);
        // Se retornou erro de permissão, tenta sem schema explícito
        await buscarPerfilFallback(authUserId, cancelado);
        return;
      }

      console.log('[Auth] Perfil:', data?.perfil || 'não encontrado');
      if (!cancelado) {
        setUsuario(data || null);
        if (data) salvarPerfilCache(data);
      }
    } catch (err) {
      console.error('[Auth] Falha:', err.message);
      if (!cancelado) setUsuario(null);
    }
  }

  // Fallback: tenta via REST direto sem SDK (contorna problemas de schema)
  async function buscarPerfilFallback(authUserId, cancelado) {
    try {
      console.log('[Auth] Tentando fallback REST...');
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/usuarios?auth_user_id=eq.${authUserId}&ativo=eq.true&limit=1`;
      const res = await fetch(url, {
        headers: {
          apikey:           import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization:    `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Accept-Profile': import.meta.env.VITE_SUPABASE_SCHEMA || 'appescala',
        },
      });
      const json = await res.json();
      const data = Array.isArray(json) ? json[0] : null;
      console.log('[Auth] Fallback:', data?.perfil || 'não encontrado', json);
      if (!cancelado) {
        setUsuario(data || null);
        if (data) salvarPerfilCache(data);
      }
    } catch (err) {
      console.error('[Auth] Fallback falhou:', err.message);
      if (!cancelado) setUsuario(null);
    }
  }

  async function atualizarPerfilBackground(authUserId) {
    try {
      const { data } = await queryComTimeout(
        supabase.from('usuarios').select('*').eq('auth_user_id', authUserId).eq('ativo', true).maybeSingle()
      );
      if (data) { setUsuario(data); salvarPerfilCache(data); }
    } catch {}
  }

  async function login(email, senha) {
    perfilCarregado.current = false;
    limparPerfilCache();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
    return data;
  }

  async function logout() {
    perfilCarregado.current = false;
    limparPerfilCache();
    await supabase.auth.signOut();
    setSession(null); setUsuario(null); setMustChange(false);
  }

  async function trocarSenha(novaSenha) {
    const { error } = await supabase.auth.updateUser({ password: novaSenha, data: { must_change_password: false } });
    if (error) throw error;
    setMustChange(false);
  }

  const perfil         = usuario?.perfil || null;
  const isMaster       = perfil === 'MASTER';
  const isAdmin        = perfil === 'ADMIN' || isMaster;
  const isOperador     = perfil === 'OPERADOR';
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
