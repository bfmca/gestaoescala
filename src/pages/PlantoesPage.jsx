import { TENANT_ID } from '../config';
import { useEffect, useMemo, useState } from 'react';

import {
  CalendarDays,
  CheckCircle2,
  Plus,
  RefreshCw,
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

const diasSemana = [
  { key: 'gerar_domingo', label: 'Domingo', jsDay: 0 },
  { key: 'gerar_segunda', label: 'Segunda', jsDay: 1 },
  { key: 'gerar_terca', label: 'Terça', jsDay: 2 },
  { key: 'gerar_quarta', label: 'Quarta', jsDay: 3 },
  { key: 'gerar_quinta', label: 'Quinta', jsDay: 4 },
  { key: 'gerar_sexta', label: 'Sexta', jsDay: 5 },
  { key: 'gerar_sabado', label: 'Sábado', jsDay: 6 },
];

const formInicial = {
  nome: '',
  escala_id: '',
  data_inicio: '',
  data_fim: '',
  turnos_ids: [],
  prestador_id: '',
  gerar_domingo: false,
  gerar_segunda: true,
  gerar_terca: true,
  gerar_quarta: true,
  gerar_quinta: true,
  gerar_sexta: true,
  gerar_sabado: false,
};

export default function PlantoesPage() {
  const toast = useToast();

  const [escalas, setEscalas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [plantoes, setPlantoes] = useState([]);
  const [geracoes, setGeracoes] = useState([]);

  const [form, setForm] = useState(formInicial);
  const [gerando, setGerando] = useState(false);

  const [buscaPrestador, setBuscaPrestador] = useState('');
  const [prestadorDropdownOpen, setPrestadorDropdownOpen] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    gerarNomeAutomatico();
  }, [form.escala_id, form.data_inicio, escalas]);

  function gerarNomeAutomatico() {
    if (!form.escala_id || !form.data_inicio) return;

    const escala = escalas.find((e) => e.id === form.escala_id);
    if (!escala) return;

    const data = new Date(`${form.data_inicio}T00:00:00`);
    const nome = `${meses[data.getMonth()]}/${data.getFullYear()} - ${
      escala.nome
    }`;

    setForm((prev) => ({
      ...prev,
      nome,
    }));
  }

  async function carregarDados() {
    await Promise.all([
      buscarEscalas(),
      buscarTurnos(),
      buscarPrestadores(),
      buscarPlantoes(),
      buscarGeracoes(),
    ]);
  }

  async function buscarEscalas() {
    const { data, error } = await supabase
      .from('escalas')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      toast.error('Erro ao carregar escalas', error.message);
      return;
    }

    setEscalas(data || []);
  }

  async function buscarTurnos() {
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar turnos', error.message);
      return;
    }

    setTurnos(data || []);
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

  async function buscarPlantoes() {
    const { data, error } = await supabase
      .from('plantoes')
      .select(
        `
        *,
        escalas:escala_id (
          nome
        ),
        turnos:turno_id (
          nome,
          cor,
          ordem
        ),
        prestadores:prestador_id (
          nome
        )
      `
      )
      .eq('tenant_id', TENANT_ID)
      .order('data', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar plantões', error.message);
      return;
    }

    const ordenados = (data || []).sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return (a.turnos?.ordem || 0) - (b.turnos?.ordem || 0);
    });

    setPlantoes(ordenados);
  }

  async function buscarGeracoes() {
    const { data, error } = await supabase
      .from('geracoes_plantoes')
      .select(
        `
        *,
        escalas:escala_id (
          nome
        )
      `
      )
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar gerações', error.message);
      return;
    }

    setGeracoes(data || []);
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

  const previa = useMemo(() => {
    if (!form.data_inicio || !form.data_fim) return [];
    if (!form.escala_id) return [];
    if (form.turnos_ids.length === 0) return [];

    const inicio = new Date(`${form.data_inicio}T00:00:00`);
    const fim = new Date(`${form.data_fim}T00:00:00`);

    if (fim < inicio) return [];

    const diasSelecionados = diasSemana
      .filter((dia) => form[dia.key])
      .map((dia) => dia.jsDay);

    const linhas = [];
    const cursor = new Date(inicio);

    while (cursor <= fim) {
      if (diasSelecionados.includes(cursor.getDay())) {
        form.turnos_ids.forEach((turnoId) => {
          const turno = turnos.find((t) => t.id === turnoId);

          linhas.push({
            data: cursor.toISOString().slice(0, 10),
            turno_id: turnoId,
            turno_nome: turno?.nome || '',
          });
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return linhas;
  }, [form, turnos]);

  function alternarTurno(turnoId) {
    const existe = form.turnos_ids.includes(turnoId);

    setForm({
      ...form,
      turnos_ids: existe
        ? form.turnos_ids.filter((id) => id !== turnoId)
        : [...form.turnos_ids, turnoId],
    });
  }

  function selecionarPrestador(prestador) {
    setForm({
      ...form,
      prestador_id: prestador.id,
    });

    setBuscaPrestador(prestador.nome);
    setPrestadorDropdownOpen(false);
  }

  function limparPrestador() {
    setForm({
      ...form,
      prestador_id: '',
    });

    setBuscaPrestador('');
    setPrestadorDropdownOpen(false);
  }

  async function buscarValorRemuneracao(escalaId, turnoId) {
    const { data, error } = await supabase
      .from('remuneracoes')
      .select('valor')
      .eq('tenant_id', TENANT_ID)
      .eq('escala_id', escalaId)
      .eq('turno_id', turnoId)
      .eq('ativo', true)
      .maybeSingle();

    if (error) {
      console.error(error);
      return 0;
    }

    return data?.valor || 0;
  }

  async function verificarDuplicidades() {
    const duplicados = [];

    for (const item of previa) {
      const { data, error } = await supabase
        .from('plantoes')
        .select('id')
        .eq('tenant_id', TENANT_ID)
        .eq('data', item.data)
        .eq('escala_id', form.escala_id)
        .eq('turno_id', item.turno_id)
        .maybeSingle();

      if (error) {
        console.error(error);
        continue;
      }

      if (data) {
        duplicados.push(item);
      }
    }

    return duplicados;
  }

  async function gerarPlantoes() {
    if (!form.escala_id) {
      toast.warning(
        'Selecione uma escala',
        'Informe a escala antes de gerar os plantões.'
      );
      return;
    }

    if (!form.data_inicio || !form.data_fim) {
      toast.warning('Informe o período', 'Preencha a data inicial e final.');
      return;
    }

    if (form.turnos_ids.length === 0) {
      toast.warning(
        'Selecione ao menos um turno',
        'Escolha os turnos que devem ser gerados.'
      );
      return;
    }

    if (previa.length === 0) {
      toast.warning(
        'Nenhum plantão previsto',
        'Revise os dias da semana, período e turnos selecionados.'
      );
      return;
    }

    try {
      setGerando(true);

      const duplicados = await verificarDuplicidades();

      if (duplicados.length > 0) {
        toast.warning(
          'Plantões já existentes',
          `Já existem ${duplicados.length} plantão(ões) para esta escala, período e turno.`
        );
        return;
      }

      const { data: geracao, error: erroGeracao } = await supabase
        .from('geracoes_plantoes')
        .insert({
          tenant_id: TENANT_ID,
          nome: form.nome,
          escala_id: form.escala_id,
          data_inicio: form.data_inicio,
          data_fim: form.data_fim,
          gerar_domingo: form.gerar_domingo,
          gerar_segunda: form.gerar_segunda,
          gerar_terca: form.gerar_terca,
          gerar_quarta: form.gerar_quarta,
          gerar_quinta: form.gerar_quinta,
          gerar_sexta: form.gerar_sexta,
          gerar_sabado: form.gerar_sabado,
          status: 'GERADO',
        })
        .select()
        .single();

      if (erroGeracao) {
        toast.error('Erro ao criar lote', erroGeracao.message);
        return;
      }

      const linhas = [];

      for (const item of previa) {
        const valor = await buscarValorRemuneracao(
          form.escala_id,
          item.turno_id
        );

        linhas.push({
          tenant_id: TENANT_ID,
          geracao_id: geracao.id,
          data: item.data,
          data_plantao: item.data,
          escala_id: form.escala_id,
          turno_id: item.turno_id,
          prestador_id: form.prestador_id || null,
          valor,
          status: form.prestador_id ? 'ESCALADO' : 'ABERTO',
          ativo: true,
        });
      }

      const { error } = await supabase.from('plantoes').insert(linhas);

      if (error) {
        await supabase.from('geracoes_plantoes').delete().eq('id', geracao.id);

        toast.error('Erro ao gerar plantões', error.message);
        return;
      }

      await carregarDados();

      toast.success(
        'Plantões gerados com sucesso',
        form.prestador_id
          ? `Foram criados ${linhas.length} plantões já vinculados ao prestador padrão.`
          : `Foram criados ${linhas.length} plantões em aberto.`
      );

      setForm(formInicial);
      setBuscaPrestador('');
      setPrestadorDropdownOpen(false);
    } finally {
      setGerando(false);
    }
  }

  function formatarHora(hora) {
    if (!hora) return '--:--';
    return String(hora).slice(0, 5);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plantões"
        subtitle="Geração automática de plantões"
        actions={
          <Button onClick={gerarPlantoes}>
            {gerando ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Plus size={18} />
                Gerar plantões
              </>
            )}
          </Button>
        }
      />

      <Card>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <CalendarDays size={20} />
            <h2 className="text-xl font-bold text-slate-900">
              Configuração da geração
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nome da geração
              </label>

              <input
                value={form.nome}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Escala
              </label>

              <select
                value={form.escala_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    escala_id: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="">Selecione...</option>

                {escalas.map((escala) => (
                  <option key={escala.id} value={escala.id}>
                    {escala.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Data início
                </label>

                <input
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      data_inicio: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Data fim
                </label>

                <input
                  type="date"
                  value={form.data_fim}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      data_fim: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>
            </div>

            <div className="md:col-span-2 relative">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Prestador padrão da geração
              </label>

              <div className="relative">
                <input
                  value={buscaPrestador}
                  onFocus={() => setPrestadorDropdownOpen(true)}
                  onChange={(e) => {
                    setBuscaPrestador(e.target.value);
                    setPrestadorDropdownOpen(true);

                    if (!e.target.value) {
                      setForm({
                        ...form,
                        prestador_id: '',
                      });
                    }
                  }}
                  placeholder="Opcional: digite parte do nome do prestador..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-10"
                />

                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              {form.prestador_id && (
                <button
                  type="button"
                  onClick={limparPrestador}
                  className="text-xs text-slate-400 hover:text-slate-700 mt-2"
                >
                  Remover prestador padrão
                </button>
              )}

              {prestadorDropdownOpen && (
                <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    onClick={limparPrestador}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
                  >
                    <div className="font-semibold text-slate-700">
                      Gerar sem prestador
                    </div>
                    <div className="text-sm text-slate-500">
                      Os plantões serão criados como Aberto / A definir
                    </div>
                  </button>

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
              )}

              <div className="text-xs text-slate-500 mt-2">
                Se um prestador padrão for selecionado, os plantões serão
                criados diretamente como Escalado.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Dias da semana
            </label>

            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              {diasSemana.map((dia) => (
                <button
                  key={dia.key}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      [dia.key]: !form[dia.key],
                    })
                  }
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                    form[dia.key]
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {dia.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Turnos
            </label>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {turnos.map((turno) => {
                const selecionado = form.turnos_ids.includes(turno.id);

                return (
                  <button
                    key={turno.id}
                    type="button"
                    onClick={() => alternarTurno(turno.id)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                      selecionado
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 w-5 rounded-md shrink-0"
                        style={{
                          backgroundColor: turno.cor || '#0F172A',
                        }}
                      />

                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {turno.nome}
                        </div>

                        <div
                          className={`text-xs ${
                            selecionado ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {formatarHora(turno.hora_inicio)} até{' '}
                          {formatarHora(turno.hora_fim)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={20} />

              <h2 className="text-xl font-bold text-slate-900">
                Prévia da geração
              </h2>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 mb-4">
              <div className="text-sm text-slate-500">Total previsto</div>

              <div className="text-4xl font-bold text-slate-900 mt-1">
                {previa.length}
              </div>

              <div className="text-sm text-slate-500 mt-1">
                plantões serão gerados
              </div>

              <div className="mt-4 text-sm">
                {form.prestador_id ? (
                  <span className="text-sky-700 font-semibold">
                    Serão criados como Escalado
                  </span>
                ) : (
                  <span className="text-rose-700 font-semibold">
                    Serão criados como Aberto
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
              {previa.slice(0, 80).map((item, index) => (
                <div
                  key={`${item.data}-${item.turno_id}-${index}`}
                  className="py-3"
                >
                  <div className="font-semibold text-slate-800">
                    {formatarData(item.data)}
                  </div>

                  <div className="text-sm text-slate-500">
                    {item.turno_nome}
                  </div>
                </div>
              ))}

              {previa.length === 0 && (
                <div className="py-8 text-center text-slate-500">
                  Configure os campos para visualizar a prévia.
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="xl:col-span-2 space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Últimas gerações
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 text-xs uppercase text-slate-500">
                        Geração
                      </th>
                      <th className="text-left p-4 text-xs uppercase text-slate-500">
                        Escala
                      </th>
                      <th className="text-left p-4 text-xs uppercase text-slate-500">
                        Período
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {geracoes.slice(0, 5).map((g) => (
                      <tr key={g.id} className="border-t border-slate-100">
                        <td className="p-4 font-semibold text-slate-800">
                          {g.nome}
                        </td>

                        <td className="p-4 text-slate-600">
                          {g.escalas?.nome}
                        </td>

                        <td className="p-4 text-slate-600">
                          {formatarData(g.data_inicio)} até{' '}
                          {formatarData(g.data_fim)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {geracoes.length === 0 && (
                  <div className="p-10 text-center text-slate-500">
                    Nenhuma geração realizada.
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Plantões gerados
              </h2>

              <div className="overflow-x-auto">
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
                    </tr>
                  </thead>

                  <tbody>
                    {plantoes.slice(0, 20).map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="p-4 font-medium text-slate-800">
                          {formatarData(p.data)}
                        </td>

                        <td className="p-4 text-slate-600">
                          {p.escalas?.nome}
                        </td>

                        <td className="p-4 text-slate-600">{p.turnos?.nome}</td>

                        <td className="p-4 text-slate-600">
                          {p.prestadores?.nome || 'A definir'}
                        </td>

                        <td className="p-4 font-semibold text-slate-900">
                          {dinheiro(p.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {plantoes.length === 0 && (
                  <div className="p-10 text-center text-slate-500">
                    Nenhum plantão gerado.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}