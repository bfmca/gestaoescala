import { TENANT_ID } from '../config';
import { useEffect, useMemo, useState } from 'react';

import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Filter,
  Eraser,
  Printer,
  Search,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useToast } from '../components/ui/ToastProvider.jsx';


const meses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const statusConfig = {
  ABERTO: {
    label: 'Aberto',
    className: 'bg-rose-100 text-rose-700',
  },
  ESCALADO: {
    label: 'Escalado',
    className: 'bg-sky-100 text-sky-700',
  },
  CONFERIDO: {
    label: 'Conferido',
    className: 'bg-emerald-100 text-emerald-700',
  },
  PAGO: {
    label: 'Pago',
    className: 'bg-violet-100 text-violet-700',
  },
  CANCELADO: {
    label: 'Cancelado',
    className: 'bg-slate-200 text-slate-700',
  },
};

export default function CalendarioPage() {
  const toast = useToast();

  const hoje = new Date();

  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());

  const [plantoes, setPlantoes] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [prestadores, setPrestadores] = useState([]);

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroEscala, setFiltroEscala] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPrestador, setFiltroPrestador] = useState('todos');
  const [buscaAtivada, setBuscaAtivada] = useState(false);

  const [plantaoSelecionado, setPlantaoSelecionado] = useState(null);
  const [modalImpressao, setModalImpressao] = useState(false);
  const [escalaSelecionadaImp, setEscalaSelecionadaImp] = useState('');
  const [editandoPrestador, setEditandoPrestador] = useState(false);
  const [buscaPrestador, setBuscaPrestador] = useState('');

  useEffect(() => {
    // Carrega dados de suporte (escalas, prestadores) sempre
    buscarEscalas();
    buscarPrestadores();
  }, []);

  // Ao mudar mês: recarrega plantões apenas se já havia buscado antes
  useEffect(() => {
    if (buscaAtivada) buscarPlantoes();
  }, [ano, mes]);

  async function buscarPlantoes() {
    const dataInicio = new Date(ano, mes, 1);
    const dataFim = new Date(ano, mes + 1, 0);

    const inicio = dataInicio.toISOString().slice(0, 10);
    const fim = dataFim.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('plantoes')
      .select(
        `
        *,
        escalas:escala_id (
          id,
          nome,
          cor
        ),
        turnos:turno_id (
          id,
          nome,
          sigla,
          cor,
          ordem
        ),
        prestadores:prestador_id (
          id,
          nome,
          empresa
        )
      `
      )
      .eq('tenant_id', TENANT_ID)
      .eq('ativo', true)
      .gte('data', inicio)
      .lte('data', fim);

    if (error) {
      console.error(error);
      toast.error('Erro ao carregar calendário', error.message);
      return;
    }

    const ordenados = (data || []).sort((a, b) => {
      if (a.data !== b.data) {
        return a.data.localeCompare(b.data);
      }

      return (a.turnos?.ordem || 0) - (b.turnos?.ordem || 0);
    });

    setPlantoes(ordenados);
    setBuscaAtivada(true);
  }

  async function buscarEscalas() {
    const { data, error } = await supabase
      .from('escalas')
      .select('id, nome')
      .eq('tenant_id', TENANT_ID)
      .order('nome');

    if (error) {
      console.error(error);
      return;
    }

    setEscalas(data || []);
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
      console.error(error);
      toast.error('Erro ao carregar prestadores', error.message);
      return;
    }

    setPrestadores(data || []);
  }

  const prestadoresFiltrados = useMemo(() => {
    const termo = buscaPrestador.toLowerCase();

    return prestadores.filter((prestador) => {
      const texto = `
        ${prestador.nome || ''}
        ${prestador.empresa || ''}
      `.toLowerCase();

      return texto.includes(termo);
    });
  }, [prestadores, buscaPrestador]);

  const plantoesFiltrados = useMemo(() => {
    return plantoes.filter((plantao) => {
      const escalaOk =
        filtroEscala === 'todos' ? true : plantao.escala_id === filtroEscala;

      const statusOk =
        filtroStatus === 'todos' ? true : plantao.status === filtroStatus;

      const prestadorOk =
        filtroPrestador === 'todos' ? true : plantao.prestador_id === filtroPrestador;

      return escalaOk && statusOk && prestadorOk;
    });
  }, [plantoes, filtroEscala, filtroStatus, filtroPrestador]);

  const diasCalendario = useMemo(() => {
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);

    const dias = [];
    const inicioSemana = primeiroDia.getDay();
    const totalDias = ultimoDia.getDate();

    for (let i = 0; i < inicioSemana; i++) {
      dias.push(null);
    }

    for (let dia = 1; dia <= totalDias; dia++) {
      const data = new Date(ano, mes, dia);
      const dataTexto = data.toISOString().slice(0, 10);

      dias.push({
        dia,
        data: dataTexto,
        plantoes: plantoesFiltrados.filter((p) => p.data === dataTexto),
      });
    }

    while (dias.length % 7 !== 0) {
      dias.push(null);
    }

    return dias;
  }, [ano, mes, plantoesFiltrados]);

  function mesAnterior() {
    if (mes === 0) {
      setMes(11);
      setAno(ano - 1);
      return;
    }

    setMes(mes - 1);
  }

  function proximoMes() {
    if (mes === 11) {
      setMes(0);
      setAno(ano + 1);
      return;
    }

    setMes(mes + 1);
  }

  function irParaHoje() {
    const agora = new Date();
    setAno(agora.getFullYear());
    setMes(agora.getMonth());
  }

  function limparFiltros() {
    setFiltroEscala('todos');
    setFiltroStatus('todos');
    setFiltroPrestador('todos');
  }

  function abrirDetalhesPlantao(plantao) {
    setPlantaoSelecionado(plantao);
    setEditandoPrestador(false);
    setBuscaPrestador(plantao.prestadores?.nome || '');
  }

  function fecharModal() {
    setPlantaoSelecionado(null);
    setEditandoPrestador(false);
    setBuscaPrestador('');
  }

  async function selecionarPrestador(prestador) {
    if (!plantaoSelecionado) return;

    const novoStatus =
      plantaoSelecionado.status === 'ABERTO'
        ? 'ESCALADO'
        : plantaoSelecionado.status;

    const { error } = await supabase
      .from('plantoes')
      .update({
        prestador_id: prestador.id,
        status: novoStatus,
      })
      .eq('id', plantaoSelecionado.id);

    if (error) {
      toast.error('Erro ao vincular prestador', error.message);
      return;
    }

    toast.success(
      'Prestador vinculado',
      `${prestador.nome} foi vinculado ao plantão.`
    );

    await buscarPlantoes();

    setPlantaoSelecionado({
      ...plantaoSelecionado,
      prestador_id: prestador.id,
      prestadores: prestador,
      status: novoStatus,
    });

    setBuscaPrestador(prestador.nome);
    setEditandoPrestador(false);
  }

  async function manterADefinir() {
    setEditandoPrestador(false);
    setBuscaPrestador(plantaoSelecionado?.prestadores?.nome || '');
  }

  async function limparPrestador() {
    if (!plantaoSelecionado) return;

    const novoStatus =
      plantaoSelecionado.status === 'ESCALADO'
        ? 'ABERTO'
        : plantaoSelecionado.status;

    const { error } = await supabase
      .from('plantoes')
      .update({
        prestador_id: null,
        status: novoStatus,
      })
      .eq('id', plantaoSelecionado.id);

    if (error) {
      toast.error('Erro ao remover prestador', error.message);
      return;
    }

    toast.success('Prestador removido', 'O plantão voltou para A definir.');

    await buscarPlantoes();

    setPlantaoSelecionado({
      ...plantaoSelecionado,
      prestador_id: null,
      prestadores: null,
      status: novoStatus,
    });

    setBuscaPrestador('');
    setEditandoPrestador(false);
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

  function statusBadge(status) {
    const config = statusConfig[status] || {
      label: status,
      className: 'bg-slate-100 text-slate-700',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${config.className}`}
      >
        {config.label}
      </span>
    );
  }

  function totalPorStatus(status) {
    return plantoesFiltrados.filter((p) => p.status === status).length;
  }


  function abrirModalImpressao() {
    // Pré-seleciona o filtro atual se houver
    setEscalaSelecionadaImp(filtroEscala !== 'todos' ? filtroEscala : (escalas[0]?.id || ''));
    setModalImpressao(true);
  }

  function confirmarImpressao() {
    if (!escalaSelecionadaImp) return;
    const escala = escalas.find(e => e.id === escalaSelecionadaImp);
    const params = new URLSearchParams({
      ano,
      mes,
      escala_id:   escalaSelecionadaImp,
      escala_nome: escala?.nome || 'Escala',
    });
    setModalImpressao(false);
    window.open(`/imprimir-escala?${params}`, '_blank');
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário"
        subtitle="Visualize os plantões por mês, escala, turno e status"
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={abrirModalImpressao}>
              <Printer size={14} style={{marginRight:4,display:'inline',verticalAlign:'middle'}} />Imprimir
            </Button>
            <Button variant="secondary" onClick={irParaHoje}>
              Hoje
            </Button>
          </div>
        }
      />

      <Card>
        <div className="p-4 md:p-5">
          <button
            onClick={() => setMostrarFiltros(f => !f)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-500" />
              <span className="font-semibold text-slate-900">Filtros</span>
              {(filtroEscala !== 'todos' || filtroStatus !== 'todos' || filtroPrestador !== 'todos') && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">ativos</span>
              )}
            </div>
            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform ${mostrarFiltros ? 'rotate-180' : ''}`}
            />
          </button>

          {mostrarFiltros && (
            <>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-slate-600 mb-2">Escala</label>
                <select
                  value={filtroEscala}
                  onChange={(e) => setFiltroEscala(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="todos">Todas</option>
                  {escalas.map((escala) => (
                    <option key={escala.id} value={escala.id}>{escala.nome}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-slate-600 mb-2">Profissional</label>
                <select
                  value={filtroPrestador}
                  onChange={(e) => setFiltroPrestador(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="todos">Todos</option>
                  {prestadores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}{p.empresa ? ` — ${p.empresa}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-slate-600 mb-2">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="todos">Todos</option>
                  <option value="ABERTO">Aberto</option>
                  <option value="ESCALADO">Escalado</option>
                  <option value="CONFERIDO">Conferido</option>
                  <option value="PAGO">Pago</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
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
            <div className="flex justify-end pt-2">
              <button
                onClick={buscarPlantoes}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition flex items-center gap-2"
              >
                <Search size={15} /> Buscar
              </button>
            </div>
          </>
          )}
        </div>
      </Card>

      {mostrarFiltros && buscaAtivada && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><div className="p-3"><div className="text-xs text-slate-500">Aberto</div><div className="text-xl font-bold text-rose-700">{totalPorStatus('ABERTO')}</div></div></Card>
          <Card><div className="p-3"><div className="text-xs text-slate-500">Escalado</div><div className="text-xl font-bold text-sky-700">{totalPorStatus('ESCALADO')}</div></div></Card>
          <Card><div className="p-3"><div className="text-xs text-slate-500">Conferido</div><div className="text-xl font-bold text-emerald-700">{totalPorStatus('CONFERIDO')}</div></div></Card>
          <Card><div className="p-3"><div className="text-xs text-slate-500">Pago</div><div className="text-xl font-bold text-violet-700">{totalPorStatus('PAGO')}</div></div></Card>
          <Card><div className="p-3"><div className="text-xs text-slate-500">Cancelado</div><div className="text-xl font-bold text-slate-700">{totalPorStatus('CANCELADO')}</div></div></Card>
        </div>
      )}

      <Card>
        <div className="p-5 md:p-6">
          {!buscaAtivada ? (
            <div className="py-16 text-center text-slate-400">
              <div className="text-3xl mb-3 opacity-30">📅</div>
              <div className="font-semibold text-slate-500">Selecione os filtros e clique em Buscar</div>
              <div className="text-sm mt-1">Abra o painel de filtros acima para carregar o calendário</div>
            </div>
          ) : (
          <>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={mesAnterior}
              className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-3">
              <CalendarDays size={22} className="text-slate-500" />

              <h2 className="text-2xl font-bold text-slate-900">
                {meses[mes]} / {ano}
              </h2>
            </div>

            <button
              onClick={proximoMes}
              className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 border border-slate-200 rounded-2xl overflow-hidden">
            {diasSemana.map((dia) => (
              <div
                key={dia}
                className="bg-slate-50 p-3 text-center text-xs font-bold text-slate-500 uppercase border-b border-slate-200"
              >
                {dia}
              </div>
            ))}

            {diasCalendario.map((item, index) => (
              <div
                key={index}
                className={`min-h-[150px] p-3 border-b border-r border-slate-200 ${
                  item ? 'bg-white' : 'bg-slate-50'
                }`}
              >
                {item && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-700">
                        {item.dia}
                      </div>

                      {item.plantoes.length > 0 && (
                        <div className="text-xs text-slate-400 font-semibold">
                          {item.plantoes.length}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {item.plantoes.slice(0, 4).map((plantao) => (
                        <button
                          key={plantao.id}
                          onClick={() => abrirDetalhesPlantao(plantao)}
                          className="w-full text-left rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition overflow-hidden"
                        >
                          <div
                            className="h-1"
                            style={{
                              backgroundColor:
                                plantao.escalas?.cor || '#0F172A',
                            }}
                          />

                          <div className="p-2">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    plantao.turnos?.cor || '#CBD5E1',
                                }}
                              />

                              <div className="font-semibold text-xs text-slate-800 truncate">
                                {plantao.turnos?.nome || '-'}
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-500 truncate">
                              {plantao.prestadores?.nome || 'A definir'}
                            </div>

                            <div className="mt-1">
                              {statusBadge(plantao.status)}
                            </div>
                          </div>
                        </button>
                      ))}

                      {item.plantoes.length > 4 && (
                        <div className="text-xs text-slate-400 font-semibold text-center">
                          + {item.plantoes.length - 4} plantões
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          </>
          )}
        </div>
      </Card>

      {plantaoSelecionado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                Detalhes do Plantão
              </h2>

              <p className="text-slate-500 mt-1">
                Visualização rápida do plantão selecionado.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">Data</div>
                  <div className="font-bold text-slate-900">
                    {formatarData(plantaoSelecionado.data)}
                  </div>
                </div>

                {statusBadge(plantaoSelecionado.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">Escala</div>
                  <div className="font-bold text-slate-900">
                    {plantaoSelecionado.escalas?.nome || '-'}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">Turno</div>
                  <div className="font-bold text-slate-900">
                    {plantaoSelecionado.turnos?.nome || '-'}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 md:col-span-2 relative">
                  <div className="text-sm text-slate-500 mb-1">Prestador</div>

                  {!editandoPrestador ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          plantaoSelecionado.status === 'PAGO' ||
                          plantaoSelecionado.status === 'CANCELADO'
                        ) {
                          return;
                        }

                        setEditandoPrestador(true);
                        setBuscaPrestador(
                          plantaoSelecionado.prestadores?.nome || ''
                        );
                      }}
                      className={`font-bold text-left hover:underline ${
                        plantaoSelecionado.prestadores?.nome
                          ? 'text-slate-900'
                          : 'text-amber-600'
                      }`}
                    >
                      {plantaoSelecionado.prestadores?.nome || 'A definir'}
                    </button>
                  ) : (
                    <div className="relative">
                      <input
                        autoFocus
                        value={buscaPrestador}
                        onChange={(e) => setBuscaPrestador(e.target.value)}
                        placeholder="Digite parte do nome do prestador..."
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white"
                      />

                      <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl max-h-72 overflow-y-auto">
                        <button
                          type="button"
                          onClick={manterADefinir}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
                        >
                          <div className="font-semibold text-slate-700">
                            Manter como A definir
                          </div>
                          <div className="text-sm text-slate-500">
                            Fechar sem alterar o plantão
                          </div>
                        </button>

                        {plantaoSelecionado.prestadores?.nome && (
                          <button
                            type="button"
                            onClick={limparPrestador}
                            className="w-full text-left px-4 py-3 hover:bg-rose-50 border-b border-slate-100"
                          >
                            <div className="font-semibold text-rose-700">
                              Remover prestador
                            </div>
                            <div className="text-sm text-slate-500">
                              Voltar o plantão para A definir
                            </div>
                          </button>
                        )}

                        {prestadoresFiltrados.slice(0, 30).map((prestador) => (
                          <button
                            key={prestador.id}
                            type="button"
                            onClick={() => selecionarPrestador(prestador)}
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

                        {prestadoresFiltrados.length === 0 && (
                          <div className="p-4 text-sm text-slate-500">
                            Nenhum prestador encontrado.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {plantaoSelecionado.prestadores?.empresa &&
                    !editandoPrestador && (
                      <div className="text-sm text-slate-500 mt-1">
                        {plantaoSelecionado.prestadores.empresa}
                      </div>
                    )}
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 md:col-span-2">
                  <div className="text-sm text-slate-500">Valor</div>
                  <div className="font-bold text-slate-900">
                    {dinheiro(plantaoSelecionado.valor)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end">
              <Button variant="secondary" onClick={fecharModal}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal selecao de escala para impressao */}
      {modalImpressao && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7">
            <div className="text-lg font-extrabold text-slate-900 mb-1">Imprimir escala</div>
            <p className="text-slate-500 text-sm mb-5">
              Selecione a escala e o mês que deseja imprimir.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Escala *
                </label>
                <select
                  value={escalaSelecionadaImp}
                  onChange={e => setEscalaSelecionadaImp(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-700"
                >
                  <option value="">Selecione uma escala...</option>
                  {escalas.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600">
                Período: <strong>{meses[mes]}/{ano}</strong>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalImpressao(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarImpressao}
                disabled={!escalaSelecionadaImp}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-40 hover:bg-slate-800 transition"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}