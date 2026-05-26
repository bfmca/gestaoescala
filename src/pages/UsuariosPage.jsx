import { useEffect, useMemo, useState } from 'react';
import { _sb } from '../lib/sb';
import { useAuth } from '../contexts/AuthContext.jsx';
import { TENANT_ID } from '../config';
import Button     from '../components/ui/Button.jsx';
import Card       from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useToast } from '../components/ui/ToastProvider.jsx';

// ── Configuração de perfis ─────────────────────────────────────
const PERFIS = [
  { value: 'ADMIN',        label: 'Admin'        },
  { value: 'OPERADOR',     label: 'Operador'     },
  { value: 'VISUALIZADOR', label: 'Visualizador' },
];

// MASTER não aparece na lista — só existe um por tenant
const PERFIL_STYLE = {
  MASTER:       { bg: '#EDE9FE', cl: '#5B21B6' },
  ADMIN:        { bg: '#E0E7FF', cl: '#3730A3' },
  OPERADOR:     { bg: '#E0F2FE', cl: '#0369A1' },
  VISUALIZADOR: { bg: '#F1F5F9', cl: '#475569' },
};

// E-mail do usuário MASTER — protegido contra edição
const EMAIL_MASTER = 'educacaobt@gmail.com';

const ini = nome => String(nome || 'U').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

function gerarSenhaProvisoria() {
  const maiusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const minusculas = 'abcdefghjkmnpqrstuvwxyz';
  const numeros    = '23456789';
  const especiais  = '!@#';
  const todos      = maiusculas + minusculas + numeros + especiais;
  const rand       = s => s[Math.floor(Math.random() * s.length)];

  let senha = rand(maiusculas) + rand(maiusculas) + rand(minusculas) + rand(minusculas)
            + rand(numeros) + rand(numeros) + rand(especiais);

  while (senha.length < 10) senha += todos[Math.floor(Math.random() * todos.length)];
  return senha.split('').sort(() => Math.random() - 0.5).join('');
}

function BadgePerfil({ perfil }) {
  const s = PERFIL_STYLE[perfil] || { bg: '#F1F5F9', cl: '#475569' };
  const l = PERFIS.find(p => p.value === perfil)?.label || perfil;
  return (
    <span style={{ background: s.bg, color: s.cl, fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {l}
    </span>
  );
}

function StatusDot({ ativo }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${ativo ? 'text-emerald-700' : 'text-slate-400'}`}>
      <span className={`w-2 h-2 rounded-full ${ativo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

const iSx = { width: '100%', fontSize: 13, padding: '9px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, background: '#fff', color: '#0F172A', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

export default function UsuariosPage() {
  const toast = useToast();
  const { session } = useAuth();
  const token = session?.access_token || null;

  const [aba,        setAba]        = useState('ativos');
  const [usuarios,   setUsuarios]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [newCred,    setNewCred]    = useState(null);
  const [resetOk,    setResetOk]    = useState(null);
  const [confirm,    setConfirm]    = useState(null); // usuário para inativar/reativar

  // Campos — novo usuário
  const [fNome,   setFNome]   = useState('');
  const [fEmail,  setFEmail]  = useState('');
  const [fPerfil, setFPerfil] = useState('OPERADOR');

  // Campos — edição
  const [eNome,   setENome]   = useState('');
  const [ePerfil, setEPerfil] = useState('OPERADOR');

  // Filtros de busca
  const [busca,        setBusca]        = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('todos');

  useEffect(() => { buscarUsuarios(); }, [aba]);

  async function buscarUsuarios() {
    setLoading(true);
    try {
      const isAtivo = aba === 'ativos';
      const data = await _sb
        .from('usuarios', token)
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('oculto', false)
        .order('nome');

      // Filtra ativos/inativos no front (pode ser null em contas recém-criadas)
      const filtrado = (data || []).filter(u =>
        isAtivo ? (u.ativo === true || u.ativo === null) : u.ativo === false
      );
      setUsuarios(filtrado);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar usuários', err?.message || 'Falha na consulta.');
    } finally {
      setLoading(false);
    }
  }

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      const texto = `${u.nome || ''} ${u.email || ''} ${u.perfil || ''}`.toLowerCase();
      const buscaOk   = !busca || texto.includes(busca.toLowerCase());
      const perfilOk  = filtroPerfil === 'todos' || u.perfil === filtroPerfil;
      return buscaOk && perfilOk;
    });
  }, [usuarios, busca, filtroPerfil]);

  // ── Criar usuário ──────────────────────────────────────────
  async function criarUsuario() {
    if (!fNome.trim() || !fEmail.trim()) {
      toast.warning('Campos obrigatórios', 'Preencha nome e e-mail.');
      return;
    }
    setSaving(true);
    try {
      const senha = gerarSenhaProvisoria();

      // 1. Cria no Supabase Auth (via REST — não afeta sessão do admin)
      const authData = await _sb.signUp(fEmail.trim().toLowerCase(), senha, {
        nome: fNome.trim(),
        perfil: fPerfil,
        must_change_password: true, // força troca no primeiro acesso
      });

      const uid = authData?.user?.id || authData?.id || authData?.data?.user?.id;

      if (!uid) {
        toast.error(
          'Usuário criado mas ID não retornado',
          'Verifique se "Confirm email" está desativado em Authentication → Providers → Email no Supabase.'
        );
        return;
      }

      // 2. Insere perfil na tabela usuarios
      await _sb.from('usuarios', token).insert({
        tenant_id:    TENANT_ID,
        auth_user_id: uid,
        nome:         fNome.trim(),
        email:        fEmail.trim().toLowerCase(),
        perfil:       fPerfil,
        oculto:       false,
        ativo:        true,
      });

      setNewCred({ nome: fNome.trim(), email: fEmail.trim().toLowerCase(), senha });
      setFNome(''); setFEmail(''); setFPerfil('OPERADOR');
      setShowForm(false);

      if (aba === 'ativos') buscarUsuarios();
      toast.success('Usuário criado', `${fNome.trim()} foi adicionado ao sistema.`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar usuário', err?.message || 'Verifique o console.');
    } finally {
      setSaving(false);
    }
  }

  // ── Salvar edição ──────────────────────────────────────────
  async function salvarEdicao(u) {
    if (u.email === EMAIL_MASTER) { setEditId(null); return; }
    if (!eNome.trim()) { toast.warning('Nome obrigatório', 'Informe o nome.'); return; }
    setSaving(true);
    try {
      await _sb
        .from('usuarios', token)
        .eq('id', u.id)
        .update({ nome: eNome.trim(), perfil: ePerfil, updated_at: new Date().toISOString() });

      setEditId(null);
      buscarUsuarios();
      toast.success('Usuário atualizado', 'Cadastro salvo com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar', err?.message || 'Verifique o console.');
    } finally {
      setSaving(false);
    }
  }

  // ── Inativar / Reativar ────────────────────────────────────
  async function alternarStatus(u) {
    if (u.email === EMAIL_MASTER) { setConfirm(null); return; }
    try {
      await _sb
        .from('usuarios', token)
        .eq('id', u.id)
        .update({ ativo: !u.ativo, updated_at: new Date().toISOString() });

      setConfirm(null);
      buscarUsuarios();
      toast.success(
        u.ativo ? 'Usuário inativado' : 'Usuário reativado',
        `${u.nome} foi ${u.ativo ? 'inativado' : 'reativado'} com sucesso.`
      );
    } catch (err) {
      console.error(err);
      toast.error('Erro ao alterar status', err?.message || '');
    }
  }

  // ── Reset de senha ─────────────────────────────────────────
  async function resetarSenha(u) {
    try {
      await _sb.sendReset(u.email);
      setResetOk(u.email);
      setTimeout(() => setResetOk(null), 4000);
      toast.success('Reset enviado', `E-mail de redefinição enviado para ${u.email}.`);
    } catch (err) {
      toast.error('Erro ao enviar reset', err?.message || '');
    }
  }

  async function copiarSenha() {
    if (!newCred?.senha) return;
    await navigator.clipboard.writeText(newCred.senha);
    toast.success('Copiado', 'Senha provisória copiada.');
  }

  const isAtivo = aba === 'ativos';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        subtitle="Gerencie os usuários autorizados, perfis de acesso e status"
        actions={
          isAtivo && (
            <Button onClick={() => { setShowForm(!showForm); setNewCred(null); }}>
              + Novo usuário
            </Button>
          )
        }
      />

      {/* ── Credenciais geradas ── */}
      {newCred && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            ✓ Usuário <strong>{newCred.nome}</strong> criado com sucesso!
          </div>
          <div className="bg-white border border-emerald-200 rounded-xl p-4 font-mono text-sm space-y-1">
            <div><span className="text-slate-500">E-mail:&nbsp;&nbsp;&nbsp;</span><strong>{newCred.email}</strong></div>
            <div>
              <span className="text-slate-500">Senha prov.: </span>
              <strong className="tracking-wider text-slate-900">{newCred.senha}</strong>
            </div>
          </div>
          <p className="text-sm text-emerald-700">
            ⚠ Compartilhe estas credenciais com segurança. O usuário deverá criar uma nova senha no primeiro acesso.
          </p>
          <div className="flex gap-3">
            <button
              onClick={copiarSenha}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
            >
              Copiar senha
            </button>
            <button
              onClick={() => setNewCred(null)}
              className="px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── Formulário novo usuário ── */}
      {showForm && (
        <Card>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
              Novo usuário
            </div>



            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome completo *</label>
                <input style={iSx} value={fNome} onChange={e => setFNome(e.target.value)} placeholder="Nome do usuário"
                  onFocus={e => e.target.style.borderColor = '#0F172A'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">E-mail *</label>
                <input style={iSx} type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="email@dominio.com"
                  onFocus={e => e.target.style.borderColor = '#0F172A'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Perfil de acesso</label>
                <select style={iSx} value={fPerfil} onChange={e => setFPerfil(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#0F172A'} onBlur={e => e.target.style.borderColor = '#CBD5E1'}>
                  {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={criarUsuario} disabled={saving || !fNome || !fEmail}>
                {saving ? 'Criando...' : 'Criar usuário'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Filtros ── */}
      <Card>
        <div className="p-4 flex flex-wrap gap-3 items-center">
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="flex-1 min-w-[200px] rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-700"
          />
          <select
            value={filtroPerfil}
            onChange={e => setFiltroPerfil(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-700"
          >
            <option value="todos">Todos os perfis</option>
            {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {(busca || filtroPerfil !== 'todos') && (
            <button
              onClick={() => { setBusca(''); setFiltroPerfil('todos'); }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-500 hover:bg-slate-50"
            >
              Limpar
            </button>
          )}
        </div>
      </Card>

      {/* ── Abas Ativo / Inativo ── */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {[{ k: 'ativos', l: 'Ativos' }, { k: 'inativos', l: 'Inativos' }].map(t => (
            <button
              key={t.k}
              onClick={() => { setAba(t.k); setEditId(null); setBusca(''); setFiltroPerfil('todos'); }}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${aba === t.k ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {t.l}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-500">
          {usuariosFiltrados.length} usuário{usuariosFiltrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Lista de usuários ── */}
      <Card>
        <div className="overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
            {usuariosFiltrados.length} usuário{usuariosFiltrados.length !== 1 ? 's' : ''} {isAtivo ? 'ativo' : 'inativo'}{usuariosFiltrados.length !== 1 ? 's' : ''}
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-400">Carregando...</div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <div className="text-4xl mb-3 opacity-30">👥</div>
              <div className="font-semibold">Nenhum usuário {isAtivo ? 'ativo' : 'inativo'} encontrado</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {usuariosFiltrados.map((u, i) => (
                <div key={u.id}>
                  {/* ── Linha do usuário ── */}
                  <div className={`p-5 ${editId === u.id ? 'bg-slate-50' : 'bg-white'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">

                      {/* Avatar + info */}
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isAtivo ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {ini(u.nome)}
                        </div>
                        <div>
                          <div className={`font-bold ${isAtivo ? 'text-slate-900' : 'text-slate-400'}`}>{u.nome}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-3 flex-wrap mt-0.5">
                            <span>{u.email}</span>
                            <StatusDot ativo={isAtivo} />
                          </div>
                        </div>
                      </div>

                      {/* Perfil + ações */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <BadgePerfil perfil={u.perfil} />

                        {isAtivo && (
                          <>
                            <button
                              onClick={() => editId === u.id ? setEditId(null) : (setEditId(u.id), setENome(u.nome), setEPerfil(u.perfil))}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                            >
                              {editId === u.id ? '✕ Cancelar' : '✏ Editar'}
                            </button>
                            <button
                              onClick={() => resetarSenha(u)}
                              disabled={resetOk === u.email}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-60"
                            >
                              {resetOk === u.email ? '✓ Enviado' : '🔑 Reset senha'}
                            </button>
                            {u.email !== EMAIL_MASTER && (
                              <button
                                onClick={() => setConfirm(u)}
                                className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 flex items-center gap-1.5"
                              >
                                🚫 Inativar
                              </button>
                            )}
                          </>
                        )}

                        {!isAtivo && u.email !== EMAIL_MASTER && (
                          <button
                            onClick={() => setConfirm(u)}
                            className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5"
                          >
                            ✓ Reativar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Edição inline ── */}
                  {editId === u.id && (
                    <div className="px-5 pb-5 pt-3 bg-slate-50 border-t border-dashed border-slate-200">
                      <div className="text-sm font-bold text-slate-700 mb-3">✏ Editar usuário</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome completo *</label>
                          <input style={iSx} value={eNome} onChange={e => setENome(e.target.value)}
                            onFocus={e => e.target.style.borderColor = '#0F172A'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Perfil de acesso</label>
                          <select style={iSx} value={ePerfil} onChange={e => setEPerfil(e.target.value)}
                            onFocus={e => e.target.style.borderColor = '#0F172A'} onBlur={e => e.target.style.borderColor = '#CBD5E1'}>
                            {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-3">
                        <Button variant="secondary" onClick={() => setEditId(null)}>Cancelar</Button>
                        <Button onClick={() => salvarEdicao(u)} disabled={saving || !eNome.trim()}>
                          {saving ? 'Salvando...' : 'Salvar alterações'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── Modal de confirmação inativar/reativar ── */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7">
            <div className="text-center mb-6">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl ${isAtivo ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                {isAtivo ? '🚫' : '✓'}
              </div>
              <div className="text-lg font-extrabold text-slate-900 mb-2">
                {isAtivo ? 'Inativar usuário?' : 'Reativar usuário?'}
              </div>
              <div className="text-sm text-slate-500 leading-relaxed">
                {isAtivo
                  ? <><strong>{confirm.nome}</strong> perderá acesso ao sistema. O histórico será mantido e o usuário poderá ser reativado a qualquer momento.</>
                  : <><strong>{confirm.nome}</strong> voltará a ter acesso ao sistema.</>
                }
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setConfirm(null)}>Cancelar</Button>
              <Button
                onClick={() => alternarStatus(confirm)}
                variant={isAtivo ? 'danger' : 'primary'}
              >
                {isAtivo ? 'Sim, inativar' : 'Sim, reativar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}