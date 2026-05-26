import { TENANT_ID } from '../config';
import { useEffect, useMemo, useState } from 'react';

import { Search, Plus, Pencil, Filter, Eraser } from 'lucide-react';

import { supabase } from '../lib/supabase';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';


const formInicial = {
  id: null,
  escala_id: '',
  turno_id: '',
  valor: '',
  observacao: '',
  ativo: true,
};

export default function RemuneracaoPage() {
  const [remuneracoes, setRemuneracoes] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [turnos, setTurnos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('ativos');

  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    await Promise.all([buscarRemuneracoes(), buscarEscalas(), buscarTurnos()]);
  }

  async function buscarRemuneracoes() {
    const { data, error } = await supabase
      .from('remuneracoes')
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
        )
      `
      )
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setRemuneracoes(data || []);
  }

  async function buscarEscalas() {
    const { data, error } = await supabase
      .from('escalas')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error(error);
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
      console.error(error);
      return;
    }

    setTurnos(data || []);
  }

  const remuneracoesFiltradas = useMemo(() => {
    return remuneracoes.filter((item) => {
      const abaOk = aba === 'ativos' ? item.ativo : !item.ativo;

      const texto = `
        ${item.escalas?.nome || ''}
        ${item.turnos?.nome || ''}
        ${item.turnos?.sigla || ''}
        ${item.observacao || ''}
      `.toLowerCase();

      const buscaOk = !busca || texto.includes(busca.toLowerCase());

      return abaOk && buscaOk;
    });
  }, [remuneracoes, aba, busca]);

  function limparFiltros() {
    setBusca('');
  }

  function novaRemuneracao() {
    setForm(formInicial);
    setModalOpen(true);
  }

  function editarRemuneracao(item) {
    setForm({
      id: item.id,
      escala_id: item.escala_id || '',
      turno_id: item.turno_id || '',
      valor: item.valor || '',
      observacao: item.observacao || '',
      ativo: item.ativo,
    });

    setModalOpen(true);
  }

  async function salvarRemuneracao() {
    if (!form.escala_id) {
      alert('Selecione a escala.');
      return;
    }

    if (!form.turno_id) {
      alert('Selecione o turno.');
      return;
    }

    if (form.valor === '' || Number(form.valor) < 0) {
      alert('Informe um valor válido.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        tenant_id: TENANT_ID,
        escala_id: form.escala_id,
        turno_id: form.turno_id,
        valor: Number(form.valor),
        observacao: form.observacao,
        ativo: form.ativo,
      };

      const { error } = form.id
        ? await supabase.from('remuneracoes').update(payload).eq('id', form.id)
        : await supabase.from('remuneracoes').insert(payload);

      if (error) {
        console.error(error);

        if (
          error.message?.includes('duplicate key') ||
          error.code === '23505'
        ) {
          alert('Já existe remuneração cadastrada para esta escala e turno.');
          return;
        }

        alert('Erro ao salvar remuneração.');
        return;
      }

      setModalOpen(false);
      setForm(formInicial);
      buscarRemuneracoes();
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
        title="Remuneração"
        subtitle="Defina o valor de cada combinação entre escala e turno"
        actions={
          <Button onClick={novaRemuneracao}>
            <Plus size={18} />
            Nova remuneração
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
            <div className="md:col-span-6">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Buscar por escala, turno ou observação
              </label>

              <div className="relative">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite para buscar..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-10"
                />

                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
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
            Ativas ({remuneracoes.filter((r) => r.ativo).length})
          </button>

          <button
            onClick={() => setAba('inativos')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              aba === 'inativos'
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Inativas ({remuneracoes.filter((r) => !r.ativo).length})
          </button>
        </div>

        <div className="text-sm text-slate-500">
          Total: {remuneracoes.length} remunerações
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Escala
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Turno
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Valor
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Status
                </th>
                <th className="w-20"></th>
              </tr>
            </thead>

            <tbody>
              {remuneracoesFiltradas.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-xl"
                        style={{
                          backgroundColor: item.escalas?.cor || '#0F172A',
                        }}
                      />

                      <div>
                        <div className="font-semibold text-slate-800">
                          {item.escalas?.nome || '-'}
                        </div>

                        <div className="text-sm text-slate-500">
                          {item.observacao || '-'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="font-medium text-slate-800">
                      {item.turnos?.nome || '-'}
                    </div>

                    <div className="text-sm text-slate-500">
                      {item.turnos?.sigla || '-'}
                    </div>
                  </td>

                  <td className="p-4 font-semibold text-slate-900">
                    {dinheiro(item.valor)}
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.ativo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {item.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => editarRemuneracao(item)}
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

          {remuneracoesFiltradas.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              Nenhuma remuneração encontrada.
            </div>
          )}
        </div>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {form.id ? 'Editar Remuneração' : 'Nova Remuneração'}
              </h2>

              <p className="text-slate-500 mt-1">
                Configure o valor pago para uma escala e turno.
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Turno
                </label>

                <select
                  value={form.turno_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      turno_id: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">Selecione...</option>

                  {turnos.map((turno) => (
                    <option key={turno.id} value={turno.id}>
                      {turno.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Valor
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      valor: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Observação
                </label>

                <textarea
                  rows="3"
                  value={form.observacao}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      observacao: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

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
                      Status da remuneração
                    </div>

                    <div className="text-sm text-slate-500">
                      Remunerações inativas permanecem no histórico, mas deixam
                      de ser utilizadas em novos lançamentos.
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        form.ativo ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {form.ativo ? 'Ativa' : 'Inativa'}
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

              <Button onClick={salvarRemuneracao}>
                {saving
                  ? 'Salvando...'
                  : form.id
                  ? 'Salvar alterações'
                  : 'Salvar remuneração'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
