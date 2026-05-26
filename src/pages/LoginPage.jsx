import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext.jsx';
import { TENANT_ID } from '../config';

const THEME_CACHE_KEY = `gestaoescala-theme-${TENANT_ID}`;

const defaultTheme = {
  nomeSistema:   'Gestão Escalas',
  logo:          '/logo.jpg',
  corFundo:      '#F1F5F9',
  corPrimaria:   '#282878',
  corSecundaria: '#00B4DC',
};

function lerThemeCache() {
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw);
    return {
      nomeSistema:   t.nomeSistema          || defaultTheme.nomeSistema,
      logo:          t.logo                 || defaultTheme.logo,
      corFundo:      t.cores?.fundo         || defaultTheme.corFundo,
      corPrimaria:   t.cores?.sidebar       || defaultTheme.corPrimaria,
      corSecundaria: t.cores?.secundaria    || defaultTheme.corSecundaria,
    };
  } catch { return null; }
}

export default function LoginPage() {
  const { login } = useAuth();
  const [theme,   setTheme]   = useState(() => lerThemeCache() || defaultTheme);
  const [email,   setEmail]   = useState('');
  const [senha,   setSenha]   = useState('');
  const [loading, setLoading] = useState(false);
  const [erro,    setErro]    = useState('');

  useEffect(() => {
    async function atualizarTema() {
      try {
        // Tenta via SDK primeiro
        const { data, error } = await supabase
          .from('tenants')
          .select('nome_sistema, logo_url, cor_primaria, cor_secundaria, cor_fundo')
          .eq('id', TENANT_ID)
          .single();

        if (error) {
          // Fallback: REST direto com anon key
          const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tenants?id=eq.${TENANT_ID}&limit=1`;
          const res = await fetch(url, {
            headers: {
              apikey:           import.meta.env.VITE_SUPABASE_ANON_KEY,
              Authorization:    `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Accept-Profile': import.meta.env.VITE_SUPABASE_SCHEMA || 'appescala',
            },
          });
          const json = await res.json();
          const d = Array.isArray(json) ? json[0] : null;
          if (d) aplicarTema(d);
          return;
        }

        if (data) aplicarTema(data);
      } catch (err) {
        console.warn('[Login] Tema não carregado:', err.message);
      }
    }

    function aplicarTema(d) {
      const novoTheme = {
        nomeSistema:   d.nome_sistema   || defaultTheme.nomeSistema,
        logo:          d.logo_url       || defaultTheme.logo,
        corFundo:      d.cor_fundo      || defaultTheme.corFundo,
        corPrimaria:   d.cor_primaria   || defaultTheme.corPrimaria,
        corSecundaria: d.cor_secundaria || defaultTheme.corSecundaria,
      };
      setTheme(novoTheme);
      try {
        localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({
          nomeSistema: novoTheme.nomeSistema,
          logo:        novoTheme.logo,
          cores: {
            fundo:      novoTheme.corFundo,
            sidebar:    novoTheme.corPrimaria,
            secundaria: novoTheme.corSecundaria,
            textoClaro: '#CBD5E1',
          },
        }));
      } catch {}
    }

    atualizarTema();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    if (!email || !senha) { setErro('Informe e-mail e senha.'); return; }
    try {
      setLoading(true);
      await login(email, senha);
    } catch {
      setErro('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.corFundo, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#FFFFFF', borderRadius: 24,
        overflow: 'hidden', boxShadow: '0 20px 45px rgba(15,23,42,0.18)', border: '1px solid #E2E8F0' }}>

        <div style={{ background: theme.corPrimaria, padding: 32, color: '#FFFFFF' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 18,
            display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <img src={theme.logo} alt="Logo"
              style={{ maxWidth: 190, maxHeight: 85, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
          </div>
          <div style={{ height: 4, background: theme.corSecundaria, borderRadius: 999, marginBottom: 22 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{theme.nomeSistema}</h1>
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 13, color: '#CBD5E1', lineHeight: 1.5 }}>
            Informe seu usuário e senha para acessar o sistema.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {erro && (
            <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3',
              color: '#BE123C', borderRadius: 14, padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>
              {erro}
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 7 }}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seuemail@empresa.com"
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #CBD5E1',
                borderRadius: 14, padding: '12px 14px', fontSize: 13, outline: 'none',
                background: '#FFFFFF', fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 7 }}>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #CBD5E1',
                borderRadius: 14, padding: '12px 14px', fontSize: 13, outline: 'none',
                background: '#FFFFFF', fontFamily: 'inherit' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', border: 'none',
            borderRadius: 14, padding: '13px 18px', background: theme.corPrimaria,
            color: '#FFFFFF', fontWeight: 800, fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogIn size={16} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
