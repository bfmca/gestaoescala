import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Search,
  Eraser,
  Copy,
  Mail,
  UserX,
  UserCheck,
  KeyRound,
} from 'lucide-react';

import { _sb } from '../lib/sb';
import { useAuth } from '../contexts/AuthContext.jsx';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useToast } from '../components/ui/ToastProvider.jsx';

const TENANT_ID = '7190dac7-342c-408f-81df-890c194ccfad';
const EMAIL_MASTER = 'bfmca@hotmail.com';

const perfis = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OPERADOR', label: 'Operador' },
  { value: 'VISUALIZADOR', label: 'Visualizador' },
];

const formInicial = {
  id: null,
  nome: '',
  email: '',
  perfil: 'VISUALIZADOR',
  ativo: true,
};

export default function UsuariosPage() {
  const toast = useToast();
  const { session } = useAuth();
  const token = session?.access_token || null;

  const [usuarios, setUsuarios] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('todos');
  const [aba, setAba] = useState('ativos');

  const [form, setForm] = useState(formInicial);
  const [senhaProvisoria, setSenhaProvisoria] = useState('');

  useEffect(() => {
    buscarUsuarios();
  }, []);

  async function buscarUsuarios() {
    try {
      const data = await _sb
        .from('usuarios', token)
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('oculto', false)
        .order('nome');

      setUsuarios(data || []);
    } catch (error) {
      console.error(error);
      toast.error(
        'Erro ao carregar usuários',
        error?.message || 'Falha ao carregar.'
      );
    }
  }

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((usuario) => {
      const abaOk = aba === 'ativos' ? usuario.ativo : !usuario.ativo;

      const texto = `
        ${usuario.nome || ''}
        ${usuario.email || ''}
        ${usuario.perfil || ''}
      `.toLowerCase();

      const buscaOk = !busca || texto.includes(busca.toLowerCase());

      const perfilOk =
        filtroPerfil === 'todos' ? true : usuario.perfil === filtroPerfil;

      return abaOk && buscaOk && perfilOk;
    });
  }, [usuarios, busca, filtroPerfil, aba]);

  function novoUsuario() {
    setForm(formInicial);
    setSenhaProvisoria('');
    setModalOpen(true);
  }

  function editarUsuario(usuario) {
    if (usuario.email === EMAIL_MASTER) {
      toast.warning(
        'Usuário protegido',
        'O usuário master não pode ser editado por esta tela.'
      );
      return;
    }

    setForm({
      id: usuario.id,
      nome: usuario.nome || '',
      email: usuario.email || '',
      perfil: usuario.perfil || 'VISUALIZADOR',
      ativo: usuario.ativo,
    });

    setSenhaProvisoria('');
    setModalOpen(true);
  }

  function limparFiltros() {
    setBusca('');
    setFiltroPerfil('todos');
  }

  function gerarSenhaProvisoria() {
    const maiusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const minusculas = 'abcdefghjkmnpqrstuvwxyz';
    const numeros = '23456789';
    const especiais = '!@#';
    const todos = maiusculas + minusculas + numeros + especiais;

    let senha = '';
    senha += maiusculas[Math.floor(Math.random() * maiusculas.length)];
    senha += minusculas[Math.floor(Math.random() * minusculas.length)];
    senha += numeros[Math.floor(Math.random() * numeros.length)];
    senha += especiais[Math.floor(Math.random() * especiais.length)];

    while (senha.length < 10) {
      senha += todos[Math.floor(Math.random() * todos.length)];
    }

    return senha
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  async function salvarUsuario() {
    if (!form.nome.trim()) {
      toast.warning('Nome obrigatório', 'Informe o nome do usuário.');
      return;
    }

    if (!form.email.trim()) {
      toast.warning('E-mail obrigatório', 'Informe o e-mail do usuário.');
      return;
    }

    try {
      setSaving(true);

      if (form.id) {
        await _sb
          .from('usuarios', token)
          .update({
            nome: form.nome.trim(),
            perfil: form.perfil,
            ativo: form.ativo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', form.id);

        toast.success('Usuário atualizado', 'Cadastro salvo com sucesso.');

        setModalOpen(false);
        setForm(formInicial);
        await buscarUsuarios();
        return;
      }

      const senha = gerarSenhaProvisoria();

      const authData = await _sb.signUp(
        form.email.trim().toLowerCase(),
        senha,
        {
          nome: form.nome.trim(),
          perfil: form.perfil,
        }
      );

      const uid =
        authData?.user?.id || authData?.id || authData?.data?.user?.id;

      if (!uid) {
        toast.error(
          'Erro ao criar usuário',
          'O Supabase não retornou o ID. Confirme se a confirmação de e-mail está desativada.'
        );
        return;
      }

      await _sb.from('usuarios', token).insert({
        tenant_id: TENANT_ID,
        auth_user_id: uid,
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        perfil: form.perfil,
        oculto: false,
        ativo: true,
      });

      setSenhaProvisoria(senha);

      toast.success('Usuário criado', 'Usuário criado e vinculado ao sistema.');

      await buscarUsuarios();
    } catch (error) {
      console.error(error);

      toast.error(
        'Erro ao salvar usuário',
        error?.msg ||
          error?.message ||
          error?.error_description ||
          'Não foi possível salvar o usuário.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function alternarStatusUsuario(usuario) {
    if (usuario.email === EMAIL_MASTER) {
      toast.warning(
        'Usuário protegido',
        'O usuário master não pode ser alterado.'
      );
      return;
    }

    try {
      await _sb
        .from('usuarios', token)
        .update({
          ativo: !usuario.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', usuario.id);

      toast.success(
        usuario.ativo ? 'Usuário inativado' : 'Usuário reativado',
        `${usuario.nome} foi ${
          usuario.ativo ? 'inativado' : 'reativado'
        } com sucesso.`
      );

      await buscarUsuarios();
    } catch (error) {
      console.error(error);
      toast.error(
        'Erro ao alterar status',
        error?.message || 'Falha ao alterar usuário.'
      );
    }
  }

  async function resetarSenha(usuario) {
    try {
      const response = await fetch(`${_sb.url}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          apikey: _sb.key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: usuario.email,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw data || new Error('Erro ao solicitar reset.');
      }

      toast.success(
        'Reset enviado',
        `Foi enviado um e-mail de redefinição de senha para ${usuario.email}.`
      );
    } catch (error) {
      console.error(error);

      toast.error(
        'Erro ao resetar senha',
        error?.msg ||
          error?.message ||
          error?.error_description ||
          'Não foi possível enviar o reset.'
      );
    }
  }

  async function copiarSenha() {
    if (!senhaProvisoria) return;

    await navigator.clipboard.writeText(senhaProvisoria);

    toast.success('Senha copiada', 'A senha provisória foi copiada.');
  }

  function labelPerfil(perfil) {
    const item = perfis.find((p) => p.value === perfil);
    return item?.label || perfil;
  }

  function badgePerfil(perfil) {
    const styles = {
      ADMIN: 'bg-violet-100 text-violet-700',
      OPERADOR: 'bg-sky-100 text-sky-700',
      VISUALIZADOR: 'bg-slate-100 text-slate-700',
    };

    return (
      <span
        className={`px-4 py-2 rounded-full text-sm font-semibold ${
          styles[perfil] || 'bg-slate-100 text-slate-700'
        }`}
      >
        {labelPerfil(perfil)}
      </span>
    );
  }

  function iniciais(nome) {
    return String(nome || 'U')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        subtitle="Gerencie usuários autorizados, perfis de acesso e status"
        actions={
          <Button onClick={novoUsuario}>
            <Plus size={18} />
            Novo usuário
          </Button>
        }
      />

      <Card>
        <div className="p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Buscar usuário
              </label>

              <div className="relative">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome ou e-mail..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-10"
                />

                <Search
                  size={17}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Perfil
              </label>

              <select
                value={filtroPerfil}
                onChange={(e) => setFiltroPerfil(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5"
              >
                <option value="todos">Todos</option>

                {perfis.map((perfil) => (
                  <option key={perfil.value} value={perfil.value}>
                    {perfil.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <button
                onClick={limparFiltros}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center"
              >
                <Eraser size={16} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setAba('ativos')}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
              aba === 'ativos'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Ativos
          </button>

          <button
            onClick={() => setAba('inativos')}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
              aba === 'inativos'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Inativos
          </button>
        </div>

        <div className="text-sm text-slate-500">
          Total: {usuariosFiltrados.length} usuário(s)
        </div>
      </div>

      <Card>
        <div className="overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 text-center text-sm font-bold uppercase tracking-wide text-slate-400">
            {usuariosFiltrados.length}{' '}
            {aba === 'ativos' ? 'usuário ativo' : 'usuário inativo'}
          </div>

          <div className="divide-y divide-slate-100">
            {usuariosFiltrados.map((usuario) => (
              <div
                key={usuario.id}
                className="p-5 flex flex-col xl:flex-row xl:items-center gap-5"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
                    {iniciais(usuario.nome)}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">
                      {usuario.nome}
                    </div>

                    <div className="text-slate-500 truncate">
                      {usuario.email}
                      <span
                        className={`ml-3 font-semibold ${
                          usuario.ativo ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        • {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap xl:justify-end">
                  {badgePerfil(usuario.perfil)}

                  <button
                    onClick={() => editarUsuario(usuario)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Pencil size={15} />
                    Editar
                  </button>

                  <button
                    onClick={() => resetarSenha(usuario)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <KeyRound size={15} />
                    Reset senha
                  </button>

                  <button
                    onClick={() => alternarStatusUsuario(usuario)}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
                      usuario.ativo
                        ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {usuario.ativo ? (
                      <>
                        <UserX size={15} />
                        Inativar
                      </>
                    ) : (
                      <>
                        <UserCheck size={15} />
                        Reativar
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}

            {usuariosFiltrados.length === 0 && (
              <div className="p-10 text-center text-slate-500">
                Nenhum usuário encontrado.
              </div>
            )}
          </div>
        </div>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {form.id ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>

              <p className="text-slate-500 mt-1">
                O novo usuário será criado no Supabase Auth e vinculado a este
                sistema.
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 gap-4">
              {senhaProvisoria && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="font-semibold text-emerald-800">
                    Usuário criado com sucesso
                  </div>

                  <div className="text-sm text-emerald-700 mt-1">
                    Envie esta senha provisória ao usuário:
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <code className="bg-white border border-emerald-200 rounded-xl px-4 py-3 font-bold text-slate-900 flex-1">
                      {senhaProvisoria}
                    </code>

                    <button
                      type="button"
                      onClick={copiarSenha}
                      className="rounded-xl bg-emerald-600 text-white px-4 py-3 font-semibold flex items-center gap-2"
                    >
                      <Copy size={16} />
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nome
                </label>

                <input
                  value={form.nome}
                  disabled={!!senhaProvisoria}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nome: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  E-mail
                </label>

                <input
                  value={form.email}
                  disabled={!!form.id || !!senhaProvisoria}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Perfil
                </label>

                <select
                  value={form.perfil}
                  disabled={!!senhaProvisoria}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      perfil: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 disabled:bg-slate-100"
                >
                  {perfis.map((perfil) => (
                    <option key={perfil.value} value={perfil.value}>
                      {perfil.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.id && (
                <div
                  className={`rounded-2xl border p-4 flex items-center justify-between ${
                    form.ativo
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-rose-200 bg-rose-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      Status do usuário
                    </div>

                    <div className="text-sm text-slate-500">
                      Usuários inativos não acessam o sistema.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        ativo: !form.ativo,
                      })
                    }
                    className={`relative w-16 h-9 rounded-full transition-all duration-300 ${
                      form.ativo ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-md transition-all duration-300 ${
                        form.ativo ? 'left-8' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setForm(formInicial);
                  setSenhaProvisoria('');
                }}
              >
                Fechar
              </Button>

              {!senhaProvisoria && (
                <Button onClick={salvarUsuario}>
                  {saving ? 'Salvando...' : 'Salvar usuário'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
