import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider.jsx';
import { TENANT_ID } from '../config';
import Button        from '../components/ui/Button.jsx';
import Card          from '../components/ui/Card.jsx';
import PageHeader    from '../components/ui/PageHeader.jsx';
import PrestadorInput from '../components/ui/PrestadorInput.jsx';
import { Plus, Pencil, Trash2, Search, ClipboardList, X } from 'lucide-react';

const iSx = {
  width:'100%', boxSizing:'border-box', fontSize:13,
  padding:'9px 12px', border:'1.5px solid #CBD5E1',
  borderRadius:10, background:'#fff', fontFamily:'inherit', outline:'none',
};

const formIni = {
  id:null, prestador_id:'', procedimento_id:'', data:new Date().toISOString().slice(0,10),
  quantidade:1, valor:'', observacoes:'',
};

const procIni = { id:null, descricao:'', convenio:'', valor_unitario:'' };

function moeda(v) {
  return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

export default function ProducaoPage() {
  const toast = useToast();

  const [lancamentos,    setLancamentos]    = useState([]);
  const [prestadores,    setPrestadores]    = useState([]);
  const [procedimentos,  setProcedimentos]  = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [buscaAtivada,   setBuscaAtivada]   = useState(false);

  // Modais
  const [modalLanc,    setModalLanc]    = useState(false);
  const [modalProc,    setModalProc]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [savingProc,   setSavingProc]   = useState(false);
  const [confirmDel,   setConfirmDel]   = useState(null);

  // Forms
  const [form,         setForm]         = useState(formIni);
  const [formProc,     setFormProc]     = useState(procIni);

  // Filtros
  const hoje = new Date();
  const [dataInicio,   setDataInicio]   = useState(hoje.toISOString().slice(0,8)+'01');
  const [dataFim,      setDataFim]      = useState(hoje.toISOString().slice(0,10));
  const [filtroPrest,  setFiltroPrest]  = useState('');

  useEffect(() => { buscarPrestadores(); buscarProcedimentos(); }, []);

  async function buscarPrestadores() {
    const { data } = await supabase
      .from('prestadores').select('id,nome,empresa')
      .eq('tenant_id', TENANT_ID).eq('ativo',true).order('nome');
    setPrestadores(data||[]);
  }

  async function buscarProcedimentos() {
    const { data } = await supabase
      .from('procedimentos').select('*')
      .eq('tenant_id', TENANT_ID).eq('ativo',true).order('descricao');
    setProcedimentos(data||[]);
  }

  async function buscar() {
    setLoading(true);
    try {
      let q = supabase
        .from('producao_prestadores')
        .select(`*, 
          prestadores:prestador_id(id,nome,empresa),
          procedimento:procedimento_id(id,descricao,convenio,valor_unitario)
        `)
        .eq('tenant_id', TENANT_ID)
        .gte('data', dataInicio).lte('data', dataFim)
        .order('data', { ascending:false });

      if (filtroPrest) q = q.eq('prestador_id', filtroPrest);
      const { data, error } = await q;
      if (error) { toast.error('Erro ao buscar', error.message); return; }
      setLancamentos(data||[]);
      setBuscaAtivada(true);
    } finally { setLoading(false); }
  }

  // ── Seleciona procedimento e auto-preenche valor ──
  function selecionarProcedimento(procId) {
    const proc = procedimentos.find(p=>p.id===procId);
    const qtd  = Number(form.quantidade||1);
    const total = proc ? (qtd * Number(proc.valor_unitario||0)).toFixed(2) : '';
    setForm({ ...form, procedimento_id: procId, valor: total });
  }

  // Recalcula valor total quando quantidade muda
  function atualizarQuantidade(qtd) {
    const proc = procedimentos.find(p=>p.id===form.procedimento_id);
    const total = proc ? (Number(qtd||1) * Number(proc.valor_unitario||0)).toFixed(2) : form.valor;
    setForm({ ...form, quantidade: qtd, valor: total });
  }

  async function salvarLancamento() {
    if (!form.prestador_id || !form.procedimento_id || !form.data) {
      toast.warning('Campos obrigatórios','Preencha prestador, procedimento e data.');
      return;
    }
    setSaving(true);
    try {
      const { id, ...rest } = form;
      const payload = {
        ...rest,
        tenant_id:  TENANT_ID,
        quantidade: Number(form.quantidade||1),
        valor:      Number(form.valor||0),
      };
      const { error } = id
        ? await supabase.from('producao_prestadores').update(payload).eq('id',id)
        : await supabase.from('producao_prestadores').insert(payload);
      if (error) { toast.error('Erro ao salvar', error.message); return; }
      toast.success('Lançamento salvo');
      setModalLanc(false);
      setForm(formIni);
      if (buscaAtivada) buscar();
    } finally { setSaving(false); }
  }

  async function excluir(id) {
    const { error } = await supabase.from('producao_prestadores').delete().eq('id',id);
    if (error) { toast.error('Erro ao excluir', error.message); return; }
    toast.success('Lançamento excluído');
    setConfirmDel(null);
    if (buscaAtivada) buscar();
  }

  async function salvarProcedimento() {
    if (!formProc.descricao.trim()) { toast.warning('Descrição obrigatória',''); return; }
    setSavingProc(true);
    try {
      const { id, ...rest } = formProc;
      const payload = {
        ...rest, tenant_id: TENANT_ID, ativo:true,
        valor_unitario: Number(rest.valor_unitario||0),
      };
      const { error } = id
        ? await supabase.from('procedimentos').update(payload).eq('id',id)
        : await supabase.from('procedimentos').insert(payload);
      if (error) { toast.error('Erro ao salvar', error.message); return; }
      toast.success('Procedimento salvo');
      setFormProc(procIni);
      buscarProcedimentos();
    } finally { setSavingProc(false); }
  }

  async function inativarProcedimento(proc) {
    await supabase.from('procedimentos').update({ ativo:false }).eq('id',proc.id);
    toast.success('Procedimento removido');
    buscarProcedimentos();
  }

  const totalPeriodo = useMemo(()=>
    lancamentos.reduce((s,l)=>s+Number(l.valor||0),0), [lancamentos]);

  const procAtual = procedimentos.find(p=>p.id===form.procedimento_id);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Produção dos Prestadores"
        subtitle="Lançamento de procedimentos, atendimentos particulares e convênios"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setFormProc(procIni); setModalProc(true); }}>
              <ClipboardList size={15} className="mr-1.5 inline" />Procedimentos
            </Button>
            <Button onClick={() => { setForm(formIni); setModalLanc(true); }}>
              <Plus size={15} className="mr-1.5 inline" />Novo lançamento
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <Card>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data início</label>
            <input type="date" style={iSx} value={dataInicio} onChange={e=>setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data fim</label>
            <input type="date" style={iSx} value={dataFim} onChange={e=>setDataFim(e.target.value)} />
          </div>
          <div>
            <PrestadorInput
              label="Prestador"
              value={filtroPrest}
              onChange={setFiltroPrest}
              prestadores={prestadores}
              placeholder="Todos os prestadores"
            />
          </div>
          <button onClick={buscar} disabled={loading}
            className="py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition disabled:opacity-60 flex items-center justify-center gap-2">
            <Search size={14}/>{loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {buscaAtivada && (
          <div className="px-4 pb-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
            <div className="bg-slate-50 rounded-xl p-3 min-w-[140px]">
              <div className="text-xs text-slate-500">Total do período</div>
              <div className="text-lg font-extrabold text-slate-900">{moeda(totalPeriodo)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 min-w-[100px]">
              <div className="text-xs text-slate-500">Lançamentos</div>
              <div className="text-lg font-extrabold text-slate-900">{lancamentos.length}</div>
            </div>
          </div>
        )}
      </Card>

      {/* Tabela */}
      <Card>
        {!buscaAtivada ? (
          <div className="py-14 text-center text-slate-400">
            <div className="text-3xl mb-2 opacity-30">📋</div>
            <div className="font-semibold">Selecione o período e clique em Buscar</div>
          </div>
        ) : lancamentos.length===0 ? (
          <div className="py-14 text-center text-slate-400 font-semibold">Nenhum lançamento encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Data','Prestador','Procedimento','Convênio','Qtd','Valor',''].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lancamentos.map(l=>(
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{new Date(l.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-sm font-medium">{l.prestadores?.nome||'—'}</td>
                    <td className="px-4 py-3 text-sm">{l.procedimento?.descricao||'—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {l.procedimento?.convenio && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          {l.procedimento.convenio}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">{l.quantidade||1}</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-700">{moeda(l.valor)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={()=>{ setForm({
                          ...formIni,...l,
                          quantidade:l.quantidade||1, valor:l.valor||'',
                        }); setModalLanc(true); }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
                          <Pencil size={13}/>
                        </button>
                        <button onClick={()=>setConfirmDel(l)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Modal novo/editar lançamento ── */}
      {modalLanc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="font-extrabold text-slate-900">{form.id ? 'Editar lançamento' : 'Novo lançamento'}</div>
              <button onClick={()=>setModalLanc(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={15}/></button>
            </div>
            <div className="p-6 space-y-4">

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data *</label>
                <input type="date" style={iSx} value={form.data}
                  onChange={e=>setForm({...form,data:e.target.value})} />
              </div>

              <PrestadorInput
                label="Prestador *"
                value={form.prestador_id}
                onChange={v=>setForm({...form,prestador_id:v})}
                prestadores={prestadores}
                required
              />

              {/* Procedimento */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Procedimento *</label>
                <select style={iSx} value={form.procedimento_id}
                  onChange={e=>selecionarProcedimento(e.target.value)}>
                  <option value="">Selecione...</option>
                  {procedimentos.map(p=>(
                    <option key={p.id} value={p.id}>
                      {p.descricao}{p.convenio?` — ${p.convenio}`:''} | {moeda(p.valor_unitario)}
                    </option>
                  ))}
                </select>
                {procAtual && (
                  <div className="mt-1.5 text-xs text-slate-400 flex gap-3">
                    {procAtual.convenio && <span>Convênio: <strong>{procAtual.convenio}</strong></span>}
                    <span>Valor unitário: <strong>{moeda(procAtual.valor_unitario)}</strong></span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quantidade *</label>
                  <input type="number" min="1" style={iSx} value={form.quantidade}
                    onChange={e=>atualizarQuantidade(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Valor total (R$)
                    {procAtual && <span className="text-slate-400 normal-case ml-1 font-normal">auto</span>}
                  </label>
                  <input type="number" step="0.01" style={iSx} value={form.valor}
                    onChange={e=>setForm({...form,valor:e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Observações</label>
                <textarea rows={2} style={{...iSx,resize:'vertical'}} value={form.observacoes}
                  placeholder="Observações opcionais..."
                  onChange={e=>setForm({...form,observacoes:e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={()=>setModalLanc(false)}>Cancelar</Button>
              <Button onClick={salvarLancamento} disabled={saving}>
                {saving?'Salvando...':'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal gerenciar procedimentos ── */}
      {modalProc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="font-extrabold text-slate-900">Procedimentos</div>
              <button onClick={()=>{ setModalProc(false); setFormProc(procIni); }} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={15}/></button>
            </div>

            {/* Form add/edit */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase">
                {formProc.id ? 'Editar procedimento' : 'Novo procedimento'}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição *</label>
                <input style={iSx} value={formProc.descricao} placeholder="Descrição do procedimento"
                  onChange={e=>setFormProc({...formProc,descricao:e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Convênio</label>
                  <input style={iSx} value={formProc.convenio} placeholder="Ex: Unimed, SUS, Particular"
                    onChange={e=>setFormProc({...formProc,convenio:e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Valor unitário (R$) *</label>
                  <input type="number" step="0.01" min="0" style={iSx} value={formProc.valor_unitario}
                    placeholder="0,00"
                    onChange={e=>setFormProc({...formProc,valor_unitario:e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {formProc.id && (
                  <button onClick={()=>setFormProc(procIni)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-100">
                    Cancelar
                  </button>
                )}
                <button onClick={salvarProcedimento} disabled={savingProc||!formProc.descricao.trim()}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-50 hover:bg-slate-800">
                  {savingProc?'Salvando...':formProc.id?'Salvar':'Adicionar'}
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {procedimentos.length===0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">Nenhum procedimento cadastrado</div>
              ) : procedimentos.map(p=>(
                <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{p.descricao}</div>
                    <div className="text-xs text-slate-400 flex gap-3 mt-0.5">
                      {p.convenio && <span>{p.convenio}</span>}
                      <span className="text-emerald-600 font-semibold">{moeda(p.valor_unitario)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={()=>setFormProc({id:p.id,descricao:p.descricao,convenio:p.convenio||'',valor_unitario:p.valor_unitario||''})}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"><Pencil size={12}/></button>
                    <button onClick={()=>inativarProcedimento(p)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"><X size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 text-center">
            <div className="text-3xl mb-3">🗑️</div>
            <div className="font-extrabold text-slate-900 mb-2">Excluir lançamento?</div>
            <p className="text-slate-500 text-sm mb-6">
              {confirmDel.prestadores?.nome} — {moeda(confirmDel.valor)}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={()=>setConfirmDel(null)}>Cancelar</Button>
              <Button onClick={()=>excluir(confirmDel.id)}>Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}