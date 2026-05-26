import { TENANT_ID } from '../config';
import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext.jsx';


const defaultTheme = {
  nomeSistema: 'Gestão de Processos',
  logo: 'https://placehold.co/180x70/ffffff/0f172a?text=LOGO',
  corFundo: '#F1F5F9',
  corPrimaria: '#0F2A4D',
  corSecundaria: '#D4A62A',
};

export default function LoginPage() {
  const { login } = useAuth();

  const [theme, setTheme] = useState(defaultTheme);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarTema();
  }, []);

  async function carregarTema() {
    const { data, error } = await supabase
      .from('tenants')
      .select('nome_sistema, logo_url, cor_primaria, cor_secundaria, cor_fundo')
      .eq('id', TENANT_ID)
      .single();

    if (error || !data) return;

    setTheme({
      nomeSistema: data.nome_sistema || defaultTheme.nomeSistema,
      logo: data.logo_url || defaultTheme.logo,
      corFundo: data.cor_fundo || defaultTheme.corFundo,
      corPrimaria: data.cor_primaria || defaultTheme.corPrimaria,
      corSecundaria: data.cor_secundaria || defaultTheme.corSecundaria,
    });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');

    if (!email || !senha) {
      setErro('Informe e-mail e senha.');
      return;
    }

    try {
      setLoading(true);
      await login(email, senha);
    } catch (error) {
      console.error(error);
      setErro('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.corFundo,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#FFFFFF',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.18)',
          border: '1px solid #E2E8F0',
        }}
      >
        <div
          style={{
            background: theme.corPrimaria,
            padding: 32,
            color: '#FFFFFF',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 18,
              padding: 18,
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <img
              src={theme.logo}
              alt="Logo"
              style={{
                maxWidth: 190,
                maxHeight: 85,
                objectFit: 'contain',
              }}
            />
          </div>

          <div
            style={{
              height: 4,
              background: theme.corSecundaria,
              borderRadius: 999,
              marginBottom: 22,
            }}
          />

          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              margin: 0,
            }}
          >
            {theme.nomeSistema}
          </h1>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              fontSize: 14,
              color: '#CBD5E1',
              lineHeight: 1.5,
            }}
          >
            Informe seu usuário e senha para acessar o sistema.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          style={{
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {erro && (
            <div
              style={{
                background: '#FFF1F2',
                border: '1px solid #FECDD3',
                color: '#BE123C',
                borderRadius: 14,
                padding: '12px 14px',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {erro}
            </div>
          )}

          <div>
            <label style={labelStyle}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@empresa.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 14,
              padding: '14px 18px',
              background: theme.corPrimaria,
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.65 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <LogIn size={18} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 14,
  fontWeight: 700,
  color: '#334155',
  marginBottom: 8,
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #CBD5E1',
  borderRadius: 14,
  padding: '13px 14px',
  fontSize: 15,
  outline: 'none',
  background: '#FFFFFF',
};
