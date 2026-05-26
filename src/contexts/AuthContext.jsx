import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';

const AuthContext = createContext(null);

const PERFIL_CACHE_KEY  = 'gestaoescala-perfil';
const SAFETY_TIMEOUT_MS = 15000;
const QUERY_TIMEOUT_MS  = 8000;

// ── Cache de perfil no sessionStorage ────────────────────────
// Persiste durante a aba aberta — na próxima abertura já tem o
// perfil disponível sem precisar esperar a query do banco.
function lerPerfilCache(authUserId) {
  try {
    const raw = sessionStorage.getItem(PERFIL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.auth_user_id === authUserId ? parsed : null;
  } catch { return null; }
}

function salvarPerfilCache(perfil) {
  try { sessionStorage.setItem(PERFIL_CACHE_KEY, JSON.stringify(perfil)); } catch {}
}

function limparPerfilCache() {
  try { sessionStorage.removeItem(PERFIL_CACHE_KEY); } catch {}
}

// ── Query com timeout ─────────────────────────────────────────
async function queryComTimeout(promise, ms = QUERY_TIMEOUT_MS) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('query_timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

export function AuthProvider({ children }) {
  const [session,    setSession]    = useState(null);
  const [usuario,    setUsuario]    = useState(undefined); // undefined = ainda carregando
  const [loading,    setLoading]    = useState(true);
  const [mustChange, setMustChange] = useState(false);

  // Flag para evitar recarregar perfil no TOKEN_REFRESHED
  const perfilCarregado = useRef(false);

  useEffect(() => {
    let cancelado = false;

    // Garantia: libera loading após 15s em qualquer caso
    const safety = setTimeout(() => {
      if (cancelado) return;
      console.warn('[Auth] Safety timeout ativado');
      if (usuario === undefined) setUsuario(null);
      setLoading(false);
    }, SAFETY_TIMEOUT_MS);

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, sessao) => {
        if (cancelado) return;
        console.log('[Auth]', event, sessao ? '✓' : '✗');

        // ── Logout ──────────────────────────────────────────
        if (event === 'SIGNED_OUT') {
          limparPerfilCache();
          perfilCarregado.current = false;
          setSession(null);
          setUsuario(null);
          setMustChange(false);
          setLoading(false);
          clearTimeout(safety);
          return;
        }

        // ── Token renovado — apenas atualiza sessão ─────────
        // Não recarrega perfil: evita flickering e queries desnecessárias
        if (event === 'TOKEN_REFRESHED') {
          setSession(sessao);
          return;
        }

        // ── INITIAL_SESSION, SIGNED_IN, USER_UPDATED ────────
        setSession(sessao || null);

        if (sessao?.user?.id) {
          const forceChange = sessao.user.user_metadata?.must_change_password === true;
          setMustChange(forceChange);

          if (forceChange) {
            setUsuario(null);
          } else if (!perfilCarregado.current) {
            // Carrega perfil apenas uma vez por sessão
            await carregarPerfil(sessao.user.id, cancelado);
            perfilCarregado.current = true;
          }
        } else {
          perfilCarregado.current = false;
          setUsuario(null);
          setMustChange(false);
        }

        if (!cancelado) {
          clearTimeout(safety);
          setLoading(false);
        }
      }
    );

    return () => {
      cancelado = true;
      clearTimeout(safety);
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // ── Carrega perfil com cache + fallback ───────────────────
  async function carregarPerfil(authUserId, cancelado) {
    // 1. Tenta cache imediato
    const cached = lerPerfilCache(authUserId);
    if (cached) {
      console.log('[Auth] Perfil do cache:', cached.perfil);
      if (!cancelado) setUsuario(cached);
      // Atualiza em background sem bloquear a UI
      atualizarPerfilBackground(authUserId);
      return;
    }

    // 2. Busca no banco
    await buscarPerfilBanco(authUserId, cancelado);
  }

  async function buscarPerfilBanco(authUserId, cancelado) {
    try {
      console.log('[Auth] Buscando perfil no banco...');

      const { data, error } = await queryComTimeout(
        supabase
          .from('usuarios')
          .select('*')
          .eq('tenant_id', TENANT_ID)
          .eq('auth_user_id', authUserId)
          .eq('ativo', true)
          .maybeSingle()
      );

      if (error) {
        console.error('[Auth] Erro na query:', error);
        if (!cancelado) setUsuario(null);
        return;
      }

      console.log('[Auth] Perfil:', data?.perfil || 'não encontrado');
      if (!cancelado) {
        setUsuario(data || null);
        if (data) salvarPerfilCache(data);
      }
    } catch (err) {
      console.error('[Auth] Falha ao buscar perfil:', err.message);
      if (!cancelado) setUsuario(null);
    }
  }

  // Atualiza cache em background sem afetar a UI
  async function atualizarPerfilBackground(authUserId) {
    try {
      const { data } = await queryComTimeout(
        supabase
          .from('usuarios')
          .select('*')
          .eq('tenant_id', TENANT_ID)
          .eq('auth_user_id', authUserId)
          .eq('ativo', true)
          .maybeSingle()
      );
      if (data) {
        setUsuario(data);
        salvarPerfilCache(data);
        console.log('[Auth] Cache atualizado em background');
      }
    } catch { /* silencioso */ }
  }

  // ── Login ─────────────────────────────────────────────────
  async function login(email, senha) {
    perfilCarregado.current = false;
    limparPerfilCache();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) throw error;
    return data;
  }

  // ── Logout ────────────────────────────────────────────────
  async function logout() {
    perfilCarregado.current = false;
    limparPerfilCache();
    await supabase.auth.signOut();
    setSession(null);
    setUsuario(null);
    setMustChange(false);
  }

  // ── Troca de senha ────────────────────────────────────────
  async function trocarSenha(novaSenha) {
    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
      data: { must_change_password: false },
    });
    if (error) throw error;
    setMustChange(false);
  }

  // ── Helpers de perfil ─────────────────────────────────────
  const perfil         = usuario?.perfil || null;
  const isMaster       = perfil === 'MASTER';
  const isAdmin        = perfil === 'ADMIN' || isMaster;
  const isOperador     = perfil === 'OPERADOR';
  const isVisualizador = perfil === 'VISUALIZADOR';

  const podeGerenciarUsuarios = isMaster;
  const podeAcessarCadastros  = isMaster || isAdmin;
  const podeGerenciarPlantoes = isMaster || isAdmin || isOperador;
  const podeConferir          = isMaster || isAdmin;

  return (
    <AuthContext.Provider value={{
      session, usuario, loading, mustChange,
      login, logout, trocarSenha,
      perfil, isMaster, isAdmin, isOperador, isVisualizador,
      podeGerenciarUsuarios, podeAcessarCadastros,
      podeGerenciarPlantoes, podeConferir,
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
