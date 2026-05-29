import { TENANT_ID } from '../config';
import { useEffect, useMemo, useState } from 'react';

import { Search, Plus, Pencil, Filter, Eraser } from 'lucide-react';

import { supabase } from '../lib/supabase';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';


const formInicial = {
  id: null,
  nome: '',
  descricao: '',
  cor: '#0F172A',
  ativo: true,
};

export default function EscalasPage() {
  const [escalas, setEscalas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aba, setAba] = useState('ativas');

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    buscarEscalas();
  }, []);

  async function buscarEscalas() {
    const { data, error } = await supabase
      .from('escalas')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('nome');

    if (error) {
      console.error(error);
      return;
    }

    setEscalas(data || []);
  }

  const escalasFiltradas = useMemo(() => {
    return escalas.filter((escala) => {
      const abaOk = aba === 'ativas' ? escala.ativo : !escala.ativo;

      const buscaOk =
        !busca ||
        escala.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        escala.descricao?.toLowerCase().includes(busca.toLowerCase());

      const statusOk =
        filtroStatus === 'todos'
          ? true
          : filtroStatus === 'ativo'
          ? escala.ativo
          : !escala.ativo;

      return abaOk && buscaOk && statusOk;
    });
  }, [escalas, aba, busca, filtroStatus]);

  function limparFiltros() {
    setBusca('');
    setFiltroStatus('todos');
  }

  function novaEscala() {
    setForm(formInicial);
    setModalOpen(true);
  }

  function editarEscala(escala) {
    setForm({
      ...formInicial,
      ...escala,
      ordem_relatorio: escala.ordem_relatorio || 99,
      cor: escala.cor || '#0F172A',
    });

    setModalOpen(true);
  }

  async function salvarEscala() {
    if (!form.nome.trim()) {
      alert('Informe o nome da escala.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        tenant_id: TENANT_ID,
        nome: form.nome,
        descricao: form.descricao,
        cor: form.cor,
        ativo: form.ativo,
      };

      const { error } = form.id
        ? await supabase.from('escalas').update(payload).eq('id', form.id)
        : await supabase.from('escalas').insert(payload);

      if (error) {
        console.error(error);
        alert('Erro ao salvar escala.');
        return;
      }

      setModalOpen(false);
      setForm(formInicial);
      buscarEscalas();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalas"
        subtitle="Cadastre os tipos de escala utilizados na operação"
        actions={
          <Button onClick={novaEscala}>
            <Plus size={18} />
            Nova escala
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
                Buscar por nome ou descrição
              </label>

              <div className="relative">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite o nome da escala..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-10"
                />

                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="md:col-span-3">
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
            onClick={() => setAba('ativas')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              aba === 'ativas'
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Ativas ({escalas.filter((e) => e.ativo).length})
          </button>

          <button
            onClick={() => setAba('inativas')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              aba === 'inativas'
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Inativas ({escalas.filter((e) => !e.ativo).length})
          </button>
        </div>

        <div className="text-sm text-slate-500">
          Total: {escalas.length} escalas
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
                  Cor
                </th>
                <th className="text-left p-4 text-xs uppercase text-slate-500">
                  Status
                </th>
                <th className="w-20"></th>
              </tr>
            </thead>

            <tbody>
              {escalasFiltradas.map((escala) => (
                <tr key={escala.id} className="border-t border-slate-100">
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">
                      {escala.nome}
                    </div>

                    <div className="text-sm text-slate-500">
                      {escala.descricao || '-'}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-xl border border-slate-200"
                        style={{ backgroundColor: escala.cor || '#0F172A' }}
                      />

                      <span className="text-sm text-slate-600">
                        {escala.cor || '#0F172A'}
                      </span>
                    </div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        escala.ativo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {escala.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => editarEscala(escala)}
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

          {escalasFiltradas.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              Nenhuma escala encontrada.
            </div>
          )}
        </div>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {form.id ? 'Editar Escala' : 'Nova Escala'}
              </h2>

              <p className="text-slate-500 mt-1">
                Defina o nome, descrição, cor e status da escala.
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nome da escala
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

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Descrição
                </label>

                <textarea
                  rows="3"
                  value={form.descricao}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      descricao: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Ordem no consolidado
                </label>
                <input
                  type="number" min="1" max="99"
                  value={form.ordem_relatorio || 99}
                  onChange={e => setForm({ ...form, ordem_relatorio: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Ex: 1 = aparece primeiro"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Cor da escala
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
                  className={`rounded-2xl border p-4 flex items-center justify-between ${
                    form.ativo
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-rose-200 bg-rose-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      Status da escala
                    </div>

                    <div className="text-sm text-slate-500">
                      Escalas inativas permanecem no histórico, mas deixam de
                      aparecer para novos lançamentos de plantão.
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

              <Button onClick={salvarEscala}>
                {saving
                  ? 'Salvando...'
                  : form.id
                  ? 'Salvar alterações'
                  : 'Salvar escala'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}