import { useEffect, useMemo, useState } from 'react';

import { Search, Plus, Pencil, Filter, Eraser } from 'lucide-react';

import { supabase } from '../lib/supabase';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';

const TENANT_ID = '7190dac7-342c-408f-81df-890c194ccfad';

const formInicial = {
  id: null,
  nome: '',
  sigla: '',
  hora_inicio: '',
  hora_fim: '',
  ordem: 0,
  cor: '#0F172A',
  ativo: true,
};

export default function TurnosPage() {
  const [turnos, setTurnos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('ativos');

  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    buscarTurnos();
  }, []);

  async function buscarTurnos() {
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('ordem', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setTurnos(data || []);
  }

  const turnosFiltrados = useMemo(() => {
    return turnos.filter((turno) => {
      const abaOk = aba === 'ativos' ? turno.ativo : !turno.ativo;

      const buscaOk =
        !busca || turno.nome?.toLowerCase().includes(busca.toLowerCase());

      return abaOk && buscaOk;
    });
  }, [turnos, busca, aba]);

  function novoTurno() {
    setForm(formInicial);
    setModalOpen(true);
  }

  function editarTurno(turno) {
    setForm({
      ...formInicial,
      ...turno,
    });

    setModalOpen(true);
  }

  async function salvarTurno() {
    if (!form.nome.trim()) {
      alert('Informe o nome do turno.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        tenant_id: TENANT_ID,
        nome: form.nome,
        sigla: form.sigla,
        hora_inicio: form.hora_inicio || null,
        hora_fim: form.hora_fim || null,
        ordem: Number(form.ordem || 0),
        cor: form.cor,
        ativo: form.ativo,
      };

      const { error } = form.id
        ? await supabase.from('turnos').update(payload).eq('id', form.id)
        : await supabase.from('turnos').insert(payload);

      if (error) {
        console.error(error);
        alert('Erro ao salvar turno.');
        return;
      }

      setModalOpen(false);
      setForm(formInicial);

      buscarTurnos();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turnos"
        subtitle="Cadastre os turnos utilizados nas escalas"
        actions={
          <Button onClick={novoTurno}>
            <Plus size={18} />
            Novo turno
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
                Buscar turno
              </label>

              <div className="relative">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite o nome do turno..."
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
                onClick={() => setBusca('')}
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-300
                  px-4
                  py-3
                  text-sm
                  font-semibold
                  text-slate-600
                  hover:bg-slate-50
                  flex
                  items-center
                  justify-center
                "
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
            className={`
              px-6
              py-3
              rounded-xl
              font-semibold
              transition-all

              ${
                aba === 'ativos'
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200'
              }
            `}
          >
            Ativos ({turnos.filter((t) => t.ativo).length})
          </button>

          <button
            onClick={() => setAba('inativos')}
            className={`
              px-6
              py-3
              rounded-xl
              font-semibold
              transition-all

              ${
                aba === 'inativos'
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200'
              }
            `}
          >
            Inativos ({turnos.filter((t) => !t.ativo).length})
          </button>
        </div>

        <div className="text-sm text-slate-500">
          Total: {turnos.length} turnos
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Turno
                </th>

                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Horário
                </th>

                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Ordem
                </th>

                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Status
                </th>

                <th className="w-20"></th>
              </tr>
            </thead>

            <tbody>
              {turnosFiltrados.map((turno) => (
                <tr key={turno.id} className="border-t border-slate-100">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl"
                        style={{
                          backgroundColor: turno.cor || '#0F172A',
                        }}
                      />

                      <div>
                        <div className="font-semibold text-slate-800">
                          {turno.nome}
                        </div>

                        <div className="text-sm text-slate-500">
                          {turno.sigla || '-'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-slate-700">
                    {turno.hora_inicio || '--:--'} até{' '}
                    {turno.hora_fim || '--:--'}
                  </td>

                  <td className="p-4 text-slate-700">{turno.ordem}</td>

                  <td className="p-4">
                    <span
                      className={`
                        px-3
                        py-1
                        rounded-full
                        text-xs
                        font-semibold

                        ${
                          turno.ativo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }
                      `}
                    >
                      {turno.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => editarTurno(turno)}
                        className="
                          h-10
                          w-10
                          rounded-xl
                          border
                          border-slate-200
                          flex
                          items-center
                          justify-center
                          hover:bg-slate-100
                        "
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {form.id ? 'Editar Turno' : 'Novo Turno'}
              </h2>

              <p className="text-slate-500 mt-1">
                Configure horários e parâmetros dos turnos.
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nome do turno
                </label>

                <input
                  value={form.nome}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nome: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Sigla
                </label>

                <input
                  value={form.sigla}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sigla: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Hora início
                </label>

                <input
                  type="time"
                  value={form.hora_inicio}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hora_inicio: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Hora fim
                </label>

                <input
                  type="time"
                  value={form.hora_fim}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hora_fim: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Ordem
                </label>

                <input
                  type="number"
                  value={form.ordem}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ordem: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Cor
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.cor}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cor: e.target.value,
                      })
                    }
                    className="h-12 w-16 rounded-xl border border-slate-300"
                  />

                  <input
                    value={form.cor}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cor: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>
              </div>

              <div className="md:col-span-2 mt-2">
                <div
                  className={`
                    rounded-2xl
                    border
                    p-4
                    flex
                    items-center
                    justify-between

                    ${
                      form.ativo
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-rose-200 bg-rose-50'
                    }
                  `}
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      Status do turno
                    </div>

                    <div className="text-sm text-slate-500">
                      Turnos inativos permanecem no histórico, mas deixam de
                      aparecer em novos lançamentos.
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`
                        text-sm
                        font-semibold

                        ${form.ativo ? 'text-emerald-700' : 'text-rose-700'}
                      `}
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
                      className={`
                        relative
                        w-16
                        h-9
                        rounded-full
                        transition-all
                        duration-300

                        ${form.ativo ? 'bg-emerald-500' : 'bg-slate-300'}
                      `}
                    >
                      <div
                        className={`
                          absolute
                          top-1
                          h-7
                          w-7
                          rounded-full
                          bg-white
                          shadow-md
                          transition-all
                          duration-300

                          ${form.ativo ? 'left-8' : 'left-1'}
                        `}
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

              <Button onClick={salvarTurno}>
                {saving
                  ? 'Salvando...'
                  : form.id
                  ? 'Salvar alterações'
                  : 'Salvar turno'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
