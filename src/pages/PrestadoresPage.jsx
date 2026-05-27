import { TENANT_ID } from '../config';
import { useEffect, useMemo, useState } from 'react';

import { Search, Plus, Pencil, Filter, Eraser } from 'lucide-react';

import { supabase } from '../lib/supabase';

import Button from '../components/ui/Button.jsx';
import { useToast } from '../components/ui/ToastProvider.jsx';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';


const formInicial = {
  id: null,
  nome: '',
  empresa: '',
  cnpj: '',
  endereco: '',
  telefone: '',
  email: '',
  conselho: '',
  numero_conselho: '',
  uf_conselho: '',
  plantonista: true,
  contrato_fixo: false,
  valor_contrato: '',
  descricao_contrato: '',
  ativo: true,
};

export default function PrestadoresPage() {
  const toast = useToast();
  const [prestadores, setPrestadores] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aba, setAba] = useState('ativos');

  const [busca, setBusca] = useState('');
  const [filtroPlantonista, setFiltroPlantonista] = useState('todos');
  const [filtroContrato, setFiltroContrato] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCnpj, setFiltroCnpj] = useState('');

  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    buscarPrestadores();
  }, []);

  async function buscarPrestadores() {
    const { data, error } = await supabase
      .from('prestadores')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('nome');

    if (error) {
      console.error(error);
      return;
    }

    setPrestadores(data || []);
  }

  const prestadoresFiltrados = useMemo(() => {
    return prestadores.filter((p) => {
      const abaOk = aba === 'ativos' ? p.ativo : !p.ativo;

      const buscaOk =
        !busca ||
        p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        p.empresa?.toLowerCase().includes(busca.toLowerCase());

      const plantonistaOk =
        filtroPlantonista === 'todos'
          ? true
          : filtroPlantonista === 'sim'
          ? p.plantonista
          : !p.plantonista;

      const contratoOk =
        filtroContrato === 'todos'
          ? true
          : filtroContrato === 'sim'
          ? p.contrato_fixo
          : !p.contrato_fixo;

      const statusOk =
        filtroStatus === 'todos'
          ? true
          : filtroStatus === 'ativo'
          ? p.ativo
          : !p.ativo;

      const cnpjOk =
        !filtroCnpj || p.cnpj?.toLowerCase().includes(filtroCnpj.toLowerCase());

      return (
        abaOk && buscaOk && plantonistaOk && contratoOk && statusOk && cnpjOk
      );
    });
  }, [
    prestadores,
    aba,
    busca,
    filtroPlantonista,
    filtroContrato,
    filtroStatus,
    filtroCnpj,
  ]);

  function limparFiltros() {
    setBusca('');
    setFiltroPlantonista('todos');
    setFiltroContrato('todos');
    setFiltroStatus('todos');
    setFiltroCnpj('');
  }

  function novoPrestador() {
    setForm(formInicial);
    setModalOpen(true);
  }

  function editarPrestador(prestador) {
    setForm({
      ...formInicial,
      ...prestador,
      valor_contrato: prestador.valor_contrato || '',
    });
    setModalOpen(true);
  }

  async function salvarPrestador() {
    if (!form.nome.trim()) {
      toast.error('Campo obrigatório', 'Informe o nome do prestador.');
      return;
    }

    try {
      setSaving(true);

      // Remove id do payload em novos registros (deixa o banco gerar)
      const { id, ...rest } = form;
      const payload = {
        ...rest,
        tenant_id: TENANT_ID,
        valor_contrato: form.valor_contrato === '' ? 0 : Number(form.valor_contrato),
      };

      const { error } = id
        ? await supabase.from('prestadores').update(payload).eq('id', id)
        : await supabase.from('prestadores').insert(payload);

      if (error) {
        console.error('[Prestadores] Erro ao salvar:', error);
        toast.error('Erro ao salvar', error.message || 'Verifique o console.');
        return;
      }

      setModalOpen(false);
      setForm(formInicial);
      buscarPrestadores();
      toast.success('Prestador salvo', `${form.nome} foi salvo com sucesso.`);
    } catch (err) {
      console.error('[Prestadores] Exceção:', err);
      toast.error('Erro inesperado', err.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function dinheiro(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prestadores"
        subtitle="Gerencie todos os prestadores de serviço da sua organização"
        actions={
          <Button onClick={novoPrestador}>
            <Plus size={18} />
            Novo prestador
          </Button>
        }
      />

      <Card>
        <div className="p-5 md:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Filter size={18} />
            <h2 className="font-semibold text-lg text-slate-900">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Buscar por nome ou empresa
              </label>

              <div className="relative">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite o nome ou empresa..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-10"
                />

                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Plantonista
              </label>

              <select
                value={filtroPlantonista}
                onChange={(e) => setFiltroPlantonista(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="todos">Todos</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Contrato
              </label>

              <select
                value={filtroContrato}
                onChange={(e) => setFiltroContrato(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="todos">Todos</option>
                <option value="sim">Possui</option>
                <option value="nao">Não possui</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Status
              </label>

              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                CNPJ
              </label>

              <input
                value={filtroCnpj}
                onChange={(e) => setFiltroCnpj(e.target.value)}
                placeholder="Digite o CNPJ..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div className="md:col-span-1">
              <button
                onClick={limparFiltros}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <Eraser size={16} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button
            onClick={() => setAba('ativos')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              aba === 'ativos'
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Ativos ({prestadores.filter((p) => p.ativo).length})
          </button>

          <button
            onClick={() => setAba('inativos')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              aba === 'inativos'
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Inativos ({prestadores.filter((p) => !p.ativo).length})
          </button>
        </div>

        <div className="text-sm text-slate-500">
          Total: {prestadores.length} prestadores
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Nome / Empresa
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Plantonista
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Contrato
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  CNPJ
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Status
                </th>
                <th className="w-20"></th>
              </tr>
            </thead>

            <tbody>
              {prestadoresFiltrados.map((prestador) => (
                <tr key={prestador.id} className="border-t border-slate-100">
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">
                      {prestador.nome}
                    </div>
                    <div className="text-sm text-slate-500">
                      {prestador.empresa || '-'}
                    </div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        prestador.plantonista
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {prestador.plantonista ? 'Sim' : 'Não'}
                    </span>
                  </td>

                  <td className="p-4 font-medium text-slate-800">
                    {prestador.contrato_fixo
                      ? dinheiro(prestador.valor_contrato)
                      : '—'}
                  </td>

                  <td className="p-4 text-slate-600">
                    {prestador.cnpj || '-'}
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        prestador.ativo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {prestador.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => editarPrestador(prestador)}
                        className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {prestadoresFiltrados.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              Nenhum prestador encontrado.
            </div>
          )}
        </div>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {form.id ? 'Editar Prestador' : 'Novo Prestador'}
              </h2>
              <p className="text-slate-500 mt-1">
                Cadastre profissionais, empresas, contratos e habilitação para
                escala.
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nome
                </label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Empresa
                </label>
                <input
                  value={form.empresa}
                  onChange={(e) =>
                    setForm({ ...form, empresa: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  CNPJ
                </label>
                <input
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Endereço
                </label>
                <input
                  value={form.endereco}
                  onChange={(e) =>
                    setForm({ ...form, endereco: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Telefone
                </label>
                <input
                  value={form.telefone}
                  onChange={(e) =>
                    setForm({ ...form, telefone: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  E-mail
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Conselho
                </label>
                <input
                  placeholder="CRM, COREN, CRF..."
                  value={form.conselho}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      conselho: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Número do Conselho
                </label>
                <input
                  value={form.numero_conselho}
                  onChange={(e) =>
                    setForm({ ...form, numero_conselho: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  UF Conselho
                </label>
                <input
                  maxLength="2"
                  value={form.uf_conselho}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      uf_conselho: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 md:col-span-2 pt-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.plantonista}
                    onChange={(e) =>
                      setForm({ ...form, plantonista: e.target.checked })
                    }
                  />
                  Pode ser escalado em plantão
                </label>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.contrato_fixo}
                    onChange={(e) =>
                      setForm({ ...form, contrato_fixo: e.target.checked })
                    }
                  />
                  Possui contrato fixo
                </label>
              </div>

              {form.contrato_fixo && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Valor do Contrato
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.valor_contrato}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          valor_contrato: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Descrição do Contrato
                    </label>
                    <textarea
                      rows="4"
                      value={form.descricao_contrato}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          descricao_contrato: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2 mt-2">
                <div
                  className={`rounded-2xl border p-4 flex items-center justify-between ${
                    form.ativo
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-rose-200 bg-rose-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      Status do cadastro
                    </div>

                    <div className="text-sm text-slate-500">
                      Prestadores inativos permanecem no histórico, mas deixam
                      de aparecer nas escalas e filtros ativos.
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        form.ativo ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {form.ativo ? 'Ativo' : 'Inativo'}
                    </span>

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
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>

              <Button onClick={salvarPrestador}>
                {saving
                  ? 'Salvando...'
                  : form.id
                  ? 'Salvar alterações'
                  : 'Salvar prestador'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}