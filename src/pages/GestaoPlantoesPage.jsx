import { useEffect, useMemo, useState } from 'react';

import {
  Search,
  Pencil,
  Filter,
  Eraser,
  XCircle,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext.jsx';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useToast } from '../components/ui/ToastProvider.jsx';

import { TENANT_ID } from '../config';



const statusOptions = [
  { value: 'ABERTO', label: 'Aberto' },
  { value: 'ESCALADO', label: 'Escalado' },
  { value: 'CONFERIDO', label: 'Conferido' },
  { value: 'PAGO', label: 'Pago' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const formInicial = {
  id: null,
  data: '',
  escala_nome: '',
  turno_nome: '',
  prestador_id: '',
  valor: 0,
  status: 'ABERTO',
  observacao: '',
};

export default function GestaoPlantoesPage() {
  const { podeConferir } = useAuth();
  const toast = useToast();

  const [plantoes, setPlantoes] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [escalas, setEscalas] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [buscaAtivada, setBuscaAtivada] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroEscala, setFiltroEscala] = useState('todos');
  const [dataInicio, setDataInicio] = useState('2026-05-01');
  const [dataFim, setDataFim] = useState('2026-05-31');

  const [form, setForm] = useState(formInicial);

  const [plantaoEditandoPrestador, setPlantaoEditandoPrestador] =
    useState(null);
  const [buscaPrestadorLinha, setBuscaPrestadorLinha] = useState('');


  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    // Plantões só carregam ao clicar Buscar — evita carga desnecessária
    await Promise.all([buscarPrestadores(), buscarEscalas()]);
  }

  async function buscarPlantoes() {
    let query = supabase
      .from('plantoes')
      .select(`
        *,
        escalas:escala_id (id, nome, cor),
        turnos:turno_id (id, nome, sigla, cor, ordem),
        prestadores:prestador_id (id, nome, empresa)
      `)
      .eq('tenant_id', TENANT_ID)
      .eq('ativo', true);

    // Aplica filtros server-side para reduzir volume de dados
    if (dataInicio) query = query.gte('data', dataInicio);
    if (dataFim)    query = query.lte('data', dataFim);
    if (filtroEscala !== 'todos') query = query.eq('escala_id', filtroEscala);
    if (filtroStatus !== 'todos') query = query.eq('status', filtroStatus);

    const { data, error } = await query.order('data').order('id');

    if (error) {
      toast.error('Erro ao carregar plantões', error.message);
      return;
    }

    const ordenados = (data || []).sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return (a.turnos?.ordem || 0) - (b.turnos?.ordem || 0);
    });

    setPlantoes(ordenados);
    setBuscaAtivada(true);
  }

  async function buscarPrestadores() {
    const { data, error } = await supabase
      .from('prestadores')
      .select('id, nome, empresa')
      .eq('tenant_id', TENANT_ID)
      .eq('ativo', true)
      .eq('plantonista', true)
      .order('nome');

    if (error) {
      toast.error('Erro ao carregar prestadores', error.message);
      return;
    }

    setPrestadores(data || []);
  }

  async function buscarEscalas() {
    const { data } = await supabase
      .from('escalas')
      .select('id, nome')
      .eq('tenant_id', TENANT_ID)
      .order('nome');

    setEscalas(data || []);
  }

  const plantoesFiltrados = useMemo(() => {
    return plantoes.filter((plantao) => {
      const texto = `
        ${plantao.escalas?.nome || ''}
        ${plantao.turnos?.nome || ''}
        ${plantao.prestadores?.nome || ''}
        ${plantao.status || ''}
      `.toLowerCase();

      const buscaOk = !busca || texto.includes(busca.toLowerCase());

      const statusOk =
        filtroStatus === 'todos' ? true : plantao.status === filtroStatus;

      const escalaOk =
        filtroEscala === 'todos' ? true : plantao.escala_id === filtroEscala;

      const dataInicioOk = !dataInicio || plantao.data >= dataInicio;
      const dataFimOk = !dataFim || plantao.data <= dataFim;

      return buscaOk && statusOk && escalaOk && dataInicioOk && dataFimOk;
    });
  }, [plantoes, busca, filtroStatus, filtroEscala, dataInicio, dataFim]);

  const prestadoresFiltradosLinha = useMemo(() => {
    const termo = buscaPrestadorLinha.toLowerCase();

    return prestadores.filter((prestador) => {
      const texto = `
        ${prestador.nome || ''}
        ${prestador.empresa || ''}
      `.toLowerCase();

      return texto.includes(termo);
    });
  }, [prestadores, buscaPrestadorLinha]);

  function limparFiltros() {
    setBusca('');
    setFiltroStatus('todos');
    setFiltroEscala('todos');
    setDataInicio('');
    setDataFim('');
  }

  function editarPlantao(plantao) {
    setForm({
      id: plantao.id,
      data: plantao.data,
      escala_nome: plantao.escalas?.nome || '',
      turno_nome: plantao.turnos?.nome || '',
      prestador_id: plantao.prestador_id || '',
      valor: plantao.valor || 0,
      status: plantao.status || 'ABERTO',
      observacao: plantao.observacao || '',
    });

    setModalOpen(true);
  }

  function abrirSeletorPrestador(plantao) {
    if (plantao.status === 'PAGO' || plantao.status === 'CANCELADO') return;

    setPlantaoEditandoPrestador(plantao.id);
    setBuscaPrestadorLinha(plantao.prestadores?.nome || '');
  }

  async function selecionarPrestadorNaLinha(plantao, prestador) {
    const novoStatus =
      plantao.status === 'ABERTO' ? 'ESCALADO' : plantao.status;

    const { error } = await supabase
      .from('plantoes')
      .update({
        prestador_id: prestador.id,
        status: novoStatus,
      })
      .eq('id', plantao.id);

    if (error) {
      toast.error('Erro ao vincular prestador', error.message);
      return;
    }

    setPlantaoEditandoPrestador(null);
    setBuscaPrestadorLinha('');
    await buscarPlantoes();

    toast.success(
      'Prestador vinculado',
      `${prestador.nome} foi vinculado ao plantão.`
    );
  }

  async function salvarPlantao() {
    if (!form.id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('plantoes')
        .update({
          observacao: form.observacao || null,
        })
        .eq('id', form.id);

      if (error) {
        toast.error('Erro ao salvar plantão', error.message);
        return;
      }

      await buscarPlantoes();

      toast.success(
        'Plantão atualizado',
        'As informações do plantão foram salvas com sucesso.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function atualizarStatusDireto(id, status, titulo) {
    const { error } = await supabase
      .from('plantoes')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar plantão', error.message);
      return;
    }

    await buscarPlantoes();

    toast.success(titulo, `Status alterado para ${labelStatus(status)}.`);
  }

  async function acaoRapidaPlantao(plantao) {
    if (!podeConferir) {
      toast.warning(
        'Acesso restrito',
        'Somente admin ou financeiro podem executar esta ação.'
      );
      return;
    }

    if (plantao.status === 'ESCALADO') {
      await atualizarStatusDireto(plantao.id, 'CONFERIDO', 'Plantão conferido');
      return;
    }

    if (plantao.status === 'CONFERIDO') {
      await atualizarStatusDireto(
        plantao.id,
        'ESCALADO',
        'Conferência desfeita'
      );
    }
  }

  async function atualizarStatus(novoStatus) {
    if (!form.id) return;

    const { error } = await supabase
      .from('plantoes')
      .update({
        status: novoStatus,
        observacao: form.observacao || null,
      })
      .eq('id', form.id);

    if (error) {
      toast.error('Erro ao atualizar status', error.message);
      return;
    }

    setForm({ ...form, status: novoStatus });
    await buscarPlantoes();

    toast.success(
      'Status atualizado',
      `Plantão alterado para ${labelStatus(novoStatus)}.`
    );
  }

  function formatarData(data) {
    if (!data) return '-';
    return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR');
  }

  function dinheiro(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function labelStatus(status) {
    const item = statusOptions.find((s) => s.value === status);
    return item?.label || status;
  }

  function statusBadge(status) {
    const styles = {
      ABERTO: 'bg-rose-100 text-rose-700',
      ESCALADO: 'bg-sky-100 text-sky-700',
      CONFERIDO: 'bg-emerald-100 text-emerald-700',
      PAGO: 'bg-violet-100 text-violet-700',
      CANCELADO: 'bg-slate-200 text-slate-700',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          styles[status] || 'bg-slate-100 text-slate-600'
        }`}
      >
        {labelStatus(status)}
      </span>
    );
  }

  function renderToggleConferido(plantao) {
    if (!podeConferir) return null;

    if (
      plantao.status === 'ABERTO' ||
      plantao.status === 'CANCELADO' ||
      plantao.status === 'PAGO'
    ) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={() => acaoRapidaPlantao(plantao)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
          plantao.status === 'CONFERIDO' ? 'bg-emerald-500' : 'bg-rose-400'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${
            plantao.status === 'CONFERIDO' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    );
  }

  function renderAcaoPrincipalModal() {
    if (form.status === 'CANCELADO') {
      return (
        <Button
          variant="secondary"
          onClick={() =>
            atualizarStatus(form.prestador_id ? 'ESCALADO' : 'ABERTO')
          }
        >
          <RotateCcw size={17} />
          Reativar plantão
        </Button>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Plantões"
        subtitle="Vincule prestadores, acompanhe status e faça a conferência operacional dos plantões"
      />

      <Card>
        <div className="p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <span className="font-semibold text-slate-900">Filtros</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Buscar
              </label>

              <div className="relative">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Escala, turno ou prestador..."
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
                Status
              </label>

              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="todos">Todos</option>

                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Escala
              </label>

              <select
                value={filtroEscala}
                onChange={(e) => setFiltroEscala(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="todos">Todas</option>

                {escalas.map((escala) => (
                  <option key={escala.id} value={escala.id}>
                    {escala.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Data início
              </label>

              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Data fim
              </label>

              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div className="md:col-span-1">
              <button
                onClick={limparFiltros}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center"
              >
                <Eraser size={16} />
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={buscarPlantoes}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition flex items-center gap-2"
            >
              <Search size={15} /> Buscar
            </button>
          </div>
        </div>
      </Card>

      {buscaAtivada && (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statusOptions.map((status) => (
          <Card key={status.value}>
            <div className="p-3">
              <div className="text-xs text-slate-500">{status.label}</div>
              <div className="text-xl font-bold text-slate-900">
                {plantoes.filter((plantao) => plantao.status === status.value).length}
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}

      <Card>
        <div className="overflow-x-visible">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Data
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Escala
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Turno
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Prestador
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Valor
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Status
                </th>
                <th className="text-center p-4 text-xs uppercase text-slate-500">
                  Conferido
                </th>
                <th className="w-20"></th>
              </tr>
            </thead>

            <tbody>
              {plantoesFiltrados.map((plantao) => (
                <tr key={plantao.id} className="border-t border-slate-100">
                  <td className="p-4 font-medium text-slate-800">
                    {formatarData(plantao.data)}
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-xl"
                        style={{
                          backgroundColor: plantao.escalas?.cor || '#0F172A',
                        }}
                      />

                      <span className="font-medium text-slate-800">
                        {plantao.escalas?.nome || '-'}
                      </span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: plantao.turnos?.cor || '#CBD5E1',
                        }}
                      />

                      <span className="text-slate-700">
                        {plantao.turnos?.nome || '-'}
                      </span>
                    </div>
                  </td>

                  <td className="p-4 min-w-[260px] relative">
                    {plantaoEditandoPrestador === plantao.id ? (
                      <div className="relative">
                        <input
                          autoFocus
                          value={buscaPrestadorLinha}
                          onChange={(e) =>
                            setBuscaPrestadorLinha(e.target.value)
                          }
                          placeholder="Digite o nome do prestador..."
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                        />

                        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl max-h-72 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setPlantaoEditandoPrestador(null);
                              setBuscaPrestadorLinha('');
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
                          >
                            <div className="font-semibold text-slate-700">
                              Manter como A definir
                            </div>
                            <div className="text-sm text-slate-500">
                              Fechar sem alterar o plantão
                            </div>
                          </button>

                          {prestadoresFiltradosLinha
                            .slice(0, 30)
                            .map((prestador) => (
                              <button
                                key={prestador.id}
                                type="button"
                                onClick={() =>
                                  selecionarPrestadorNaLinha(plantao, prestador)
                                }
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                              >
                                <div className="font-semibold text-slate-800">
                                  {prestador.nome}
                                </div>

                                {prestador.empresa && (
                                  <div className="text-sm text-slate-500">
                                    {prestador.empresa}
                                  </div>
                                )}
                              </button>
                            ))}

                          {prestadoresFiltradosLinha.length === 0 && (
                            <div className="p-4 text-sm text-slate-500">
                              Nenhum prestador encontrado.
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setPlantaoEditandoPrestador(null);
                            setBuscaPrestadorLinha('');
                          }}
                          className="text-xs text-slate-400 hover:text-slate-700 mt-2"
                        >
                          cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => abrirSeletorPrestador(plantao)}
                        className={`text-left font-semibold hover:underline ${
                          plantao.prestadores?.nome
                            ? 'text-slate-700'
                            : 'text-amber-600'
                        }`}
                      >
                        {plantao.prestadores?.nome || 'A definir'}
                      </button>
                    )}
                  </td>

                  <td className="p-4 font-semibold text-slate-900">
                    {dinheiro(plantao.valor)}
                  </td>

                  <td className="p-4">{statusBadge(plantao.status)}</td>

                  <td className="p-4 text-center">
                    {renderToggleConferido(plantao)}
                  </td>

                  <td className="p-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => editarPlantao(plantao)}
                        className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                        title="Editar plantão"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!buscaAtivada && (
            <div className="p-10 text-center text-slate-400">
              <div className="text-3xl mb-3 opacity-30">🔍</div>
              <div className="font-semibold text-slate-500">Selecione os filtros e clique em Buscar</div>
              <div className="text-sm mt-1">Use os filtros acima para carregar os plantões</div>
            </div>
          )}
          {buscaAtivada && plantoesFiltrados.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              Nenhum plantão encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                Editar Plantão
              </h2>

              <p className="text-slate-500 mt-1">
                Edite observações, cancele ou reative o plantão.
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500">Status atual</div>
                    <div className="mt-1">{statusBadge(form.status)}</div>
                  </div>

                  {form.status !== 'CANCELADO' && form.status !== 'PAGO' && (
                    <button
                      type="button"
                      onClick={() => atualizarStatus('CANCELADO')}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center gap-2"
                    >
                      <XCircle size={17} />
                      Cancelar plantão
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Data
                </label>

                <input
                  value={formatarData(form.data)}
                  readOnly
                  className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Valor
                </label>

                <input
                  value={dinheiro(form.valor)}
                  readOnly
                  className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Escala
                </label>

                <input
                  value={form.escala_nome}
                  readOnly
                  className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Turno
                </label>

                <input
                  value={form.turno_nome}
                  readOnly
                  className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Observação
                </label>

                <textarea
                  rows="3"
                  value={form.observacao}
                  disabled={form.status === 'PAGO'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      observacao: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 flex-wrap">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Fechar
              </Button>

              {form.status !== 'PAGO' && (
                <Button variant="secondary" onClick={salvarPlantao}>
                  {saving ? 'Salvando...' : 'Salvar observação'}
                </Button>
              )}

              {renderAcaoPrincipalModal()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}