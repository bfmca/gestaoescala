import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const TENANT_ID = '7190dac7-342c-408f-81df-890c194ccfad';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [usuario, setUsuario] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function iniciarAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        const sessaoAtual = data?.session || null;

        if (!ativo) return;

        setSession(sessaoAtual);

        if (sessaoAtual?.user?.id) {
          await carregarUsuario(sessaoAtual.user.id);
        } else {
          setUsuario(null);
        }
      } catch (error) {
        console.error('Erro ao iniciar autenticação:', error);
        setSession(null);
        setUsuario(null);
      } finally {
        if (ativo) setLoading(false);
      }
    }

    iniciarAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, novaSession) => {
        if (event === 'INITIAL_SESSION') return;

        setSession(novaSession || null);

        if (novaSession?.user?.id) {
          await carregarUsuario(novaSession.user.id);
        } else {
          setUsuario(null);
        }

        setLoading(false);
      }
    );

    return () => {
      ativo = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  async function carregarUsuario(authUserId) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('auth_user_id', authUserId)
      .eq('ativo', true)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar usuário:', error);
      setUsuario(null);
      return null;
    }

    setUsuario(data || null);
    return data || null;
  }

  async function login(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) throw error;

    setSession(data.session || null);

    if (data?.user?.id) {
      await carregarUsuario(data.user.id);
    }

    return data;
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setUsuario(null);
  }

  const isMaster = usuario?.perfil === 'MASTER';
  const isAdmin = usuario?.perfil === 'ADMIN' || isMaster;
  const isOperador = usuario?.perfil === 'OPERADOR';
  const isVisualizador = usuario?.perfil === 'VISUALIZADOR';

  return (
    <AuthContext.Provider
      value={{
        session,
        usuario,
        loading,
        login,
        logout,
        isMaster,
        isAdmin,
        isOperador,
        isVisualizador,
        perfil: usuario?.perfil || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
