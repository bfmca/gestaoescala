import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider.jsx';
import { TENANT_ID } from '../config';
import Button     from '../components/ui/Button.jsx';
import Card       from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import SelectWithAdd from '../components/ui/SelectWithAdd.jsx';

const iSx = {
  width: '100%', boxSizing: 'border-box', fontSize: 13,
  padding: '9px 12px', border: '1.5px solid #CBD5E1',
  borderRadius: 10, background: '#fff', fontFamily: 'inherit',
  outline: 'none',
};

const formIni = {
  id: null, prestador_id: '', categoria_id: '',
  data: new Date().toISOString().slice(0,10),
  valor: '', observacoes: '',
};

function moeda(v) {
  return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

export default function ProducaoPage() {
  const toast = useToast();

  const [lancamentos,  setLancamentos]  = useState([]);
  const [prestadores,  setPrestadores]  = useState([]);
  const [categorias,   setCategorias]   = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [buscaAtivada, setBuscaAtivada] = useState(false);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState(formIni);
  const [confirmDel,   setConfirmDel]   = useState(null);

  // Filtros
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(hoje.toISOString().slice(0,8)+'01');
  const [dataFim,    setDataFim]    = useState(hoje.toISOString().slice(0,10));
  const [filtroPrest, setFiltroPrest] = useState('todos');
  const [filtroCat,   setFiltroCat]   = useState('todos');

  useEffect(() => {
    buscarPrestadores();
    buscarCategorias();
  }, []);

  async function buscarPrestadores() {
    const { data } = await supabase
      .from('prestadores').select('id,nome,empresa')
      .eq('tenant_id', TENANT_ID).eq('ativo', true).order('nome');
    setPrestadores(data || []);
  }

  async function buscarCategorias() {
    const { data } = await supabase
      .from('categorias_producao').select('id,nome')
      .eq('tenant_id', TENANT_ID).eq('ativo', true).order('nome');
    setCategorias(data || []);
  }

  async function addCategoria(nome) {
    const { data, error } = await supabase.from('categorias_producao')
      .insert({ tenant_id: TENANT_ID, nome, ativo: true })
      .select().single();
    if (error) throw error;
    setCategorias(prev => [...prev, data].sort((a,b) => a.nome.localeCompare(b.nome)));
    return data;
  }

  async function buscar() {
    setLoading(true);
    try {
      let q = supabase
        .from('producao_prestadores')
        .select(`*, prestadores:prestador_id(id,nome,empresa), categorias:categoria_id(id,nome)`)
        .eq('tenant_id', TENANT_ID)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false });

      if (filtroPrest !== 'todos') q = q.eq('prestador_id', filtroPrest);
      if (filtroCat   !== 'todos') q = q.eq('categoria_id', filtroCat);

      const { data, error } = await q;
      if (error) { toast.error('Erro ao buscar', error.message); return; }
      setLancamentos(data || []);
      setBuscaAtivada(true);
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    if (!form.prestador_id || !form.categoria_id || !form.data || !form.valor) {
      toast.warning('Campos obrigatórios', 'Preencha prestador, categoria, data e valor.');
      return;
    }
    setSaving(true);
    try {
      const { id, ...rest } = form;
      const payload = {
        ...rest,
        tenant_id: TENANT_ID,
        valor: Number(form.valor),
      };
      const { error } = id
        ? await supabase.from('producao_prestadores').update(payload).eq('id', id)
        : await supabase.from('producao_prestadores').insert(payload);

      if (error) { toast.error('Erro ao salvar', error.message); return; }
      toast.success('Lançamento salvo');
      setModalOpen(false);
      setForm(formIni);
      if (buscaAtivada) buscar();
    } finally {
      setSaving(false);
    }
  }

  async function excluir(id) {
    const { error } = await supabase.from('producao_prestadores').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir', error.message); return; }
    toast.success('Lançamento excluído');
    setConfirmDel(null);
    if (buscaAtivada) buscar();
  }

  const totalPeriodo = useMemo(() =>
    lancamentos.reduce((s, l) => s + Number(l.valor || 0), 0),
  [lancamentos]);

  const totalPorCategoria = useMemo(() => {
    const map = {};
    lancamentos.forEach(l => {
      const nome = l.categorias?.nome || 'Sem categoria';
      map[nome] = (map[nome] || 0) + Number(l.valor || 0);
    });
    return Object.entries(map).sort((a,b) => b[1]-a[1]);
  }, [lancamentos]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Produção dos Prestadores"
        subtitle="Lançamento de atendimentos particulares e convênios"
        actions={
          <Button onClick={() => { setForm(formIni); setModalOpen(true); }}>
            <Plus size={15} className="mr-1.5 inline" />Novo lançamento
          </Button>
        }
      />

      {/* Filtros */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data início</label>
              <input type="date" style={iSx} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data fim</label>
              <input type="date" style={iSx} value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prestador</label>
              <select style={iSx} value={filtroPrest} onChange={e => setFiltroPrest(e.target.value)}>
                <option value="todos">Todos</option>
                {prestadores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <SelectWithAdd
                label="Categoria"
                value={filtroCat === 'todos' ? '' : filtroCat}
                onChange={v => setFiltroCat(v || 'todos')}
                options={[{id:'todos', nome:'Todas'}, ...categorias]}
                onAdd={addCategoria}
                placeholder="Todas"
              />
            </div>
            <div>
              <button
                onClick={buscar}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Search size={14} /> {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {/* Totais rápidos */}
          {buscaAtivada && (
            <div className="flex flex-wrap gap-3 pt-1 border-t border-slate-100">
              <div className="flex-1 min-w-[140px] bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500">Total do período</div>
                <div className="text-lg font-extrabold text-slate-900">{moeda(totalPeriodo)}</div>
              </div>
              {totalPorCategoria.map(([nome, total]) => (
                <div key={nome} className="flex-1 min-w-[140px] bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-500">{nome}</div>
                  <div className="text-base font-bold text-slate-700">{moeda(total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        {!buscaAtivada ? (
          <div className="py-14 text-center text-slate-400">
            <div className="text-3xl mb-2 opacity-30">📋</div>
            <div className="font-semibold">Selecione o período e clique em Buscar</div>
          </div>
        ) : lancamentos.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <div className="font-semibold">Nenhum lançamento encontrado</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Data','Prestador','Categoria','Valor','Obs.',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lancamentos.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{new Date(l.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-sm font-medium">{l.prestadores?.nome || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                        {l.categorias?.nome || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-700">{moeda(l.valor)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{l.observacoes || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => { setForm({...l, valor: l.valor}); setModalOpen(true); }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
                        ><Pencil size={13}/></button>
                        <button
                          onClick={() => setConfirmDel(l)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                        ><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal novo/editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200">
              <div className="text-base font-extrabold text-slate-900">
                {form.id ? 'Editar lançamento' : 'Novo lançamento'}
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data *</label>
                  <input type="date" style={iSx} value={form.data}
                    onChange={e => setForm({...form, data: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Valor (R$) *</label>
                  <input type="number" step="0.01" min="0" style={iSx}
                    placeholder="0,00" value={form.valor}
                    onChange={e => setForm({...form, valor: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prestador *</label>
                <select style={iSx} value={form.prestador_id}
                  onChange={e => setForm({...form, prestador_id: e.target.value})}>
                  <option value="">Selecione...</option>
                  {prestadores.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome}{p.empresa ? ` — ${p.empresa}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <SelectWithAdd
                  label="Categoria"
                  value={form.categoria_id}
                  onChange={v => setForm({...form, categoria_id: v})}
                  options={categorias}
                  onAdd={addCategoria}
                  placeholder="Selecione..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Observações</label>
                <textarea rows={2} style={{...iSx, resize:'vertical'}}
                  placeholder="Observações opcionais..."
                  value={form.observacoes}
                  onChange={e => setForm({...form, observacoes: e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 text-center">
            <div className="text-3xl mb-3">🗑️</div>
            <div className="font-extrabold text-slate-900 mb-2">Excluir lançamento?</div>
            <p className="text-slate-500 text-sm mb-6">
              {confirmDel.prestadores?.nome} — {confirmDel.categorias?.nome} — {moeda(confirmDel.valor)}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setConfirmDel(null)}>Cancelar</Button>
              <Button variant="danger" onClick={() => excluir(confirmDel.id)}>Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}