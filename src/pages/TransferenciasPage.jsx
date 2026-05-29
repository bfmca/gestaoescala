import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider.jsx';
import { TENANT_ID } from '../config';
import Button     from '../components/ui/Button.jsx';
import Card       from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { Plus, Pencil, Search, X } from 'lucide-react';
import SelectWithAdd from '../components/ui/SelectWithAdd.jsx';

const iSx = {
  width:'100%', boxSizing:'border-box', fontSize:13,
  padding:'9px 12px', border:'1.5px solid #CBD5E1',
  borderRadius:10, background:'#fff', fontFamily:'inherit', outline:'none',
};

const STATUS_STYLE = {
  SOLICITADO: { bg:'#EFF6FF', cl:'#1D4ED8' },
  REALIZADO:  { bg:'#ECFDF5', cl:'#065F46' },
  CONFERIDO:  { bg:'#F5F3FF', cl:'#5B21B6' },
};

const TIPO_LABEL = { REFERENCIA:'Referência', CONTRAREFERENCIA:'Contrarreferência' };

const formTransfIni = {
  id:null, data:new Date().toISOString().slice(0,10),
  paciente:'', cidade_origem_id:'', cidade_destino_id:'',
  hospital_destino_id:'', prestador_id:'', enfermeiro_id:'',
  motorista_id:'', tipo:'REFERENCIA', veiculo:'',
  km_inicial:'', km_final:'', valor:'',
  status:'SOLICITADO', observacoes:'',
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg:'#F1F5F9', cl:'#475569' };
  return (
    <span style={{ background:s.bg, color:s.cl, fontSize:11,
      padding:'3px 10px', borderRadius:20, fontWeight:600 }}>
      {status}
    </span>
  );
}

export default function TransferenciasPage() {
  const toast = useToast();

  // Transferências
  const [transferencias, setTransferencias] = useState([]);
  const [loadingTrans,   setLoadingTrans]   = useState(false);
  const [buscaAtivada,   setBuscaAtivada]   = useState(false);
  const [modalTransf,    setModalTransf]    = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [formTransf,     setFormTransf]     = useState(formTransfIni);
  const [detalhes,       setDetalhes]       = useState(null);
  const [buscaMedico,    setBuscaMedico]    = useState('');
  const [showMedicos,    setShowMedicos]    = useState(false);
  const [modalCidade,    setModalCidade]    = useState(false);
  const [formCidadeEdit, setFormCidadeEdit] = useState({id:null,nome:'',estado:'',valor_transferencia:''});
  const [savingCidade,   setSavingCidade]   = useState(false);

  // Filtros transferências
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(hoje.toISOString().slice(0,8)+'01');
  const [dataFim,    setDataFim]    = useState(hoje.toISOString().slice(0,10));
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroTipo,   setFiltroTipo]   = useState('todos');

  // Dados de suporte
  const [cidades,    setCidades]    = useState([]);
  const [hospitais,  setHospitais]  = useState([]);
  const [prestadores,setPrestadores]= useState([]);
  const [enfermos,   setEnfermos]   = useState([]);
  const [motoristas, setMotoristas] = useState([]);

  // Cadastros
  const [formCidade,   setFormCidade]   = useState({ id:null, nome:'', estado:'' });
  const [formHospital, setFormHospital] = useState({ id:null, nome:'', cidade_id:'' });
  const [formProf,     setFormProf]     = useState({ id:null, nome:'', cargo:'ENFERMAGEM' });
  const [savingCad,    setSavingCad]    = useState(false);

  useEffect(() => {
    buscarSupporte();
  }, []);

  async function addOuEditarCidade(cidadeData) {
    const { id, ...rest } = cidadeData;
    const payload = { ...rest, tenant_id: TENANT_ID, ativo: true };
    const { data, error } = id
      ? await supabase.from('cidades').update(payload).eq('id',id).select().single()
      : await supabase.from('cidades').insert(payload).select().single();
    if (error) throw error;
    setCidades(prev => {
      const sem = prev.filter(c=>c.id!==data.id);
      return [...sem, data].sort((a,b)=>a.nome.localeCompare(b.nome));
    });
    return data;
  }

  async function addCidade(nome) {
    return addOuEditarCidade({ nome, estado:'', valor_transferencia:null });
  }

  async function addHospital(nome) {
    const { data, error } = await supabase.from('hospitais_destino')
      .insert({ tenant_id: TENANT_ID, nome, ativo: true })
      .select().single();
    if (error) throw error;
    setHospitais(prev => [...prev, data].sort((a,b) => a.nome.localeCompare(b.nome)));
    return data;
  }

  async function buscarSupporte() {
    const [c, h, p, rh] = await Promise.all([
      supabase.from('cidades').select('id,nome,estado,valor_transferencia').eq('tenant_id',TENANT_ID).eq('ativo',true).order('nome'),
      supabase.from('hospitais_destino').select('id,nome,cidade_id,cidades:cidade_id(nome)').eq('tenant_id',TENANT_ID).eq('ativo',true).order('nome'),
      supabase.from('prestadores').select('id,nome').eq('tenant_id',TENANT_ID).eq('ativo',true).order('nome'),
      supabase.from('profissionais_rh').select('id,nome,cargo').eq('tenant_id',TENANT_ID).eq('ativo',true).order('nome'),
    ]);
    setCidades(c.data||[]);
    setHospitais(h.data||[]);
    setPrestadores(p.data||[]);
    setEnfermos((rh.data||[]).filter(x=>x.cargo==='ENFERMAGEM'));
    setMotoristas((rh.data||[]).filter(x=>x.cargo==='MOTORISTA'));
  }

  async function buscarTransferencias() {
    setLoadingTrans(true);
    try {
      let q = supabase.from('transferencias')
        .select(`*,
          origem:cidade_origem_id(nome),
          destino:cidade_destino_id(nome),
          hospital:hospital_destino_id(nome),
          medico:prestador_id(nome),
          enfermeiro:enfermeiro_id(nome),
          motorista:motorista_id(nome)
        `)
        .eq('tenant_id',TENANT_ID)
        .gte('data',dataInicio)
        .lte('data',dataFim)
        .order('data',{ascending:false});

      if (filtroStatus!=='todos') q=q.eq('status',filtroStatus);
      if (filtroTipo  !=='todos') q=q.eq('tipo',filtroTipo);

      const { data, error } = await q;
      if (error) { toast.error('Erro ao buscar',error.message); return; }
      setTransferencias(data||[]);
      setBuscaAtivada(true);
    } finally {
      setLoadingTrans(false);
    }
  }

  async function salvarTransferencia() {
    if (!formTransf.data || !formTransf.tipo || !formTransf.status) {
      toast.warning('Campos obrigatórios','Preencha data, tipo e status.');
      return;
    }
    setSaving(true);
    try {
      const { id } = formTransf;
      // Payload explícito — evita enviar campos de join (destino, medico, etc.)
      const payload = {
        tenant_id:           TENANT_ID,
        data:                formTransf.data,
        paciente:            formTransf.paciente            || null,
        tipo:                formTransf.tipo,
        status:              formTransf.status,
        cidade_origem_id:    formTransf.cidade_origem_id    || null,
        cidade_destino_id:   formTransf.cidade_destino_id   || null,
        hospital_destino_id: formTransf.hospital_destino_id || null,
        prestador_id:        formTransf.prestador_id        || null,
        enfermeiro_id:       formTransf.enfermeiro_id       || null,
        motorista_id:        formTransf.motorista_id        || null,
        veiculo:             formTransf.veiculo             || null,
        km_inicial:          formTransf.km_inicial ? Number(formTransf.km_inicial) : null,
        km_final:            formTransf.km_final   ? Number(formTransf.km_final)   : null,
        valor:               formTransf.valor      ? Number(formTransf.valor)      : null,
        observacoes:         formTransf.observacoes         || null,
      };

      const { error } = id
        ? await supabase.from('transferencias').update(payload).eq('id',id)
        : await supabase.from('transferencias').insert(payload);

      if (error) { toast.error('Erro ao salvar',error.message); return; }
      toast.success('Transferência salva');
      setModalTransf(false);
      setFormTransf(formTransfIni);
      if (buscaAtivada) buscarTransferencias();
    } finally {
      setSaving(false);
    }
  }

  async function salvarCidade() {
    if (!formCidade.nome.trim()) { toast.warning('Nome obrigatório',''); return; }
    setSavingCad(true);
    try {
      const { id, ...rest } = formCidade;
      const payload = { ...rest, tenant_id: TENANT_ID, ativo: true };
      const { error } = id
        ? await supabase.from('cidades').update(payload).eq('id',id)
        : await supabase.from('cidades').insert(payload);
      if (error) { toast.error('Erro',error.message); return; }
      toast.success('Cidade salva');
      setFormCidade({id:null,nome:'',estado:''});
      buscarSupporte();
    } finally { setSavingCad(false); }
  }

  async function salvarHospital() {
    if (!formHospital.nome.trim()) { toast.warning('Nome obrigatório',''); return; }
    setSavingCad(true);
    try {
      const { id, ...rest } = formHospital;
      const payload = { ...rest, tenant_id: TENANT_ID, ativo: true,
        cidade_id: rest.cidade_id || null };
      const { error } = id
        ? await supabase.from('hospitais_destino').update(payload).eq('id',id)
        : await supabase.from('hospitais_destino').insert(payload);
      if (error) { toast.error('Erro',error.message); return; }
      toast.success('Hospital salvo');
      setFormHospital({id:null,nome:'',cidade_id:''});
      buscarSupporte();
    } finally { setSavingCad(false); }
  }

  async function salvarProfissional() {
    if (!formProf.nome.trim()) { toast.warning('Nome obrigatório',''); return; }
    setSavingCad(true);
    try {
      const { id, ...rest } = formProf;
      const payload = { ...rest, tenant_id: TENANT_ID, ativo: true };
      const { error } = id
        ? await supabase.from('profissionais_rh').update(payload).eq('id',id)
        : await supabase.from('profissionais_rh').insert(payload);
      if (error) { toast.error('Erro',error.message); return; }
      toast.success('Profissional salvo');
      setFormProf({id:null,nome:'',cargo:'ENFERMAGEM'});
      buscarSupporte();
    } finally { setSavingCad(false); }
  }

  const kmRodado = useMemo(() => {
    const i = Number(formTransf.km_inicial||0);
    const f = Number(formTransf.km_final||0);
    return f > i ? f - i : 0;
  }, [formTransf.km_inicial, formTransf.km_final]);

  // Abas removidas — cadastros em telas dedicadas (Colaboradores)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transferências Inter-hospitalares"
        subtitle="Registro e acompanhamento de transferências de pacientes"
        actions={
<Button onClick={() => { setFormTransf(formTransfIni); setModalTransf(true); }}>
              <Plus size={15} className="mr-1.5 inline" />Nova transferência
            </Button>
        }
      />

      <Card>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data início</label>
                  <input type="date" style={iSx} value={dataInicio} onChange={e=>setDataInicio(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data fim</label>
                  <input type="date" style={iSx} value={dataFim} onChange={e=>setDataFim(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label>
                  <select style={iSx} value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
                    <option value="todos">Todos</option>
                    <option value="SOLICITADO">Solicitado</option>
                    <option value="REALIZADO">Realizado</option>
                    <option value="CONFERIDO">Conferido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo</label>
                  <select style={iSx} value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}>
                    <option value="todos">Todos</option>
                    <option value="REFERENCIA">Referência</option>
                    <option value="CONTRAREFERENCIA">Contrarreferência</option>
                  </select>
                </div>
  <button onClick={buscarTransferencias} disabled={loadingTrans}
                  className="py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition disabled:opacity-60 flex items-center justify-center gap-2">
                  <Search size={14} />{loadingTrans ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {buscaAtivada && (
                <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
                  {['SOLICITADO','REALIZADO','CONFERIDO'].map(s => (
                    <div key={s} className="bg-slate-50 rounded-xl px-4 py-2">
                      <div className="text-xs text-slate-500">{s}</div>
                      <div className="text-lg font-bold text-slate-900">
                        {transferencias.filter(t=>t.status===s).length}
                      </div>
                    </div>
                  ))}
                  <div className="bg-slate-50 rounded-xl px-4 py-2">
                    <div className="text-xs text-slate-500">Total</div>
                    <div className="text-lg font-bold text-slate-900">{transferencias.length}</div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            {!buscaAtivada ? (
              <div className="py-14 text-center text-slate-400">
                <div className="text-3xl mb-2 opacity-30">🚑</div>
                <div className="font-semibold">Selecione o período e clique em Buscar</div>
              </div>
            ) : transferencias.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <div className="font-semibold">Nenhuma transferência encontrada</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Data','Paciente','Origem → Destino','Médico','Tipo','Status',''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transferencias.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setDetalhes(t)}>
                        <td className="px-4 py-3 text-sm">{new Date(t.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 text-sm font-medium">{t.paciente||'—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {t.origem?.nome||'—'} → {t.destino?.nome||'—'}
                          {t.hospital?.nome && <div className="text-xs text-slate-400">{t.hospital.nome}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm">{t.medico?.nome||'—'}</td>
                        <td className="px-4 py-3 text-xs">{TIPO_LABEL[t.tipo]||t.tipo}</td>
                        <td className="px-4 py-3"><StatusBadge status={t.status}/></td>
                        <td className="px-4 py-3">
                          <button onClick={e => { e.stopPropagation(); setFormTransf({...t, km_inicial:t.km_inicial||'', km_final:t.km_final||'', valor:t.valor||''}); setModalTransf(true); }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
                            <Pencil size={13}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </Card>

      {/* ── Modal nova/editar transferência ── */}
      {modalTransf && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="font-extrabold text-slate-900">
                {formTransf.id ? 'Editar transferência' : 'Nova transferência'}
              </div>
              <button onClick={()=>setModalTransf(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X size={16}/>
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data *</label>
                <input type="date" style={iSx} value={formTransf.data}
                  onChange={e=>setFormTransf({...formTransf,data:e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Paciente</label>
                <input style={iSx} value={formTransf.paciente} placeholder="Nome do paciente"
                  onChange={e=>setFormTransf({...formTransf,paciente:e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo *</label>
                <select style={iSx} value={formTransf.tipo}
                  onChange={e=>setFormTransf({...formTransf,tipo:e.target.value})}>
                  <option value="REFERENCIA">Referência</option>
                  <option value="CONTRAREFERENCIA">Contrarreferência</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status *</label>
                <select style={iSx} value={formTransf.status}
                  onChange={e=>setFormTransf({...formTransf,status:e.target.value})}>
                  <option value="SOLICITADO">Solicitado</option>
                  <option value="REALIZADO">Realizado</option>
                  <option value="CONFERIDO">Conferido</option>
                </select>
              </div>
              <div>
                <SelectWithAdd
                  label="Cidade origem"
                  value={formTransf.cidade_origem_id}
                  onChange={v=>setFormTransf({...formTransf,cidade_origem_id:v})}
                  options={cidades.map(c=>({id:c.id,nome:c.nome+(c.estado?` — ${c.estado}`:'')})) }
                  onAdd={addCidade}
                  onClickAdd={()=>{ setFormCidadeEdit({id:null,nome:'',estado:'',valor_transferencia:''}); setModalCidade(true); }}
                  placeholder="Selecione..."
                />
              </div>
              <div>
                <SelectWithAdd
                  label="Cidade destino"
                  value={formTransf.cidade_destino_id}
                  onChange={v=>{
                    const cidade = cidades.find(c=>c.id===v);
                    setFormTransf({
                      ...formTransf,
                      cidade_destino_id: v,
                      valor: cidade?.valor_transferencia ? String(cidade.valor_transferencia) : formTransf.valor,
                    });
                  }}
                  options={cidades.map(c=>({id:c.id,nome:c.nome+(c.estado?` — ${c.estado}`:'')})) }
                  onAdd={addCidade}
                  onClickAdd={()=>{ setFormCidadeEdit({id:null,nome:'',estado:'',valor_transferencia:''}); setModalCidade(true); }}
                  placeholder="Selecione..."
                />
              </div>
              <div className="col-span-2">
                <SelectWithAdd
                  label="Hospital destino"
                  value={formTransf.hospital_destino_id}
                  onChange={v=>setFormTransf({...formTransf,hospital_destino_id:v})}
                  options={hospitais.map(h=>({id:h.id,nome:h.nome+(h.cidades?.nome?` — ${h.cidades.nome}`:'')})) }
                  onAdd={addHospital}
                  placeholder="Selecione..."
                />
              </div>
              <div style={{position:'relative'}}>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Médico responsável</label>
                <input
                  style={iSx}
                  placeholder="Digite para filtrar..."
                  value={buscaMedico || (formTransf.prestador_id ? (prestadores.find(p=>p.id===formTransf.prestador_id)?.nome||'') : '')}
                  onChange={e=>{
                    setBuscaMedico(e.target.value);
                    setShowMedicos(true);
                    if (!e.target.value) setFormTransf({...formTransf,prestador_id:''});
                  }}
                  onFocus={()=>setShowMedicos(true)}
                  onBlur={()=>setTimeout(()=>setShowMedicos(false),200)}
                  autoComplete="off"
                />
                {showMedicos && buscaMedico && (
                  <div style={{
                    position:'absolute',zIndex:100,top:'100%',left:0,right:0,
                    background:'#fff',border:'1.5px solid #CBD5E1',borderTop:'none',
                    borderRadius:'0 0 10px 10px',maxHeight:180,overflowY:'auto',
                    boxShadow:'0 4px 12px rgba(0,0,0,.12)',
                  }}>
                    {prestadores
                      .filter(p=>p.nome.toLowerCase().includes(buscaMedico.toLowerCase()))
                      .map(p=>(
                        <div key={p.id}
                          onMouseDown={()=>{
                            setFormTransf({...formTransf,prestador_id:p.id});
                            setBuscaMedico('');
                            setShowMedicos(false);
                          }}
                          style={{padding:'8px 12px',fontSize:13,cursor:'pointer',
                            borderBottom:'1px solid #f1f5f9'}}
                          onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                          onMouseLeave={e=>e.currentTarget.style.background='#fff'}
                        >
                          {p.nome}
                        </div>
                      ))
                    }
                    {prestadores.filter(p=>p.nome.toLowerCase().includes(buscaMedico.toLowerCase())).length===0 && (
                      <div style={{padding:'8px 12px',fontSize:12,color:'#94a3b8'}}>Nenhum resultado</div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Enfermagem</label>
                <select style={iSx} value={formTransf.enfermeiro_id}
                  onChange={e=>setFormTransf({...formTransf,enfermeiro_id:e.target.value})}>
                  <option value="">Selecione...</option>
                  {enfermos.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Motorista</label>
                <select style={iSx} value={formTransf.motorista_id}
                  onChange={e=>setFormTransf({...formTransf,motorista_id:e.target.value})}>
                  <option value="">Selecione...</option>
                  {motoristas.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Veículo</label>
                <input style={iSx} value={formTransf.veiculo} placeholder="Placa ou descrição"
                  onChange={e=>setFormTransf({...formTransf,veiculo:e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">KM inicial</label>
                <input type="number" style={iSx} value={formTransf.km_inicial} placeholder="0"
                  onChange={e=>setFormTransf({...formTransf,km_inicial:e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">KM final</label>
                <input type="number" style={iSx} value={formTransf.km_final} placeholder="0"
                  onChange={e=>setFormTransf({...formTransf,km_final:e.target.value})} />
              </div>
              {kmRodado > 0 && (
                <div className="col-span-2 bg-slate-50 rounded-xl px-4 py-2 text-sm">
                  <span className="text-slate-500">KM rodado: </span>
                  <span className="font-bold text-slate-900">{kmRodado} km</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Valor (R$)</label>
                <input type="number" step="0.01" style={iSx} value={formTransf.valor} placeholder="0,00"
                  onChange={e=>setFormTransf({...formTransf,valor:e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Observações</label>
                <input style={iSx} value={formTransf.observacoes} placeholder="Observações opcionais"
                  onChange={e=>setFormTransf({...formTransf,observacoes:e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={()=>setModalTransf(false)}>Cancelar</Button>
              <Button onClick={salvarTransferencia} disabled={saving}>
                {saving?'Salvando...':'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal gerenciar cidades e valores ── */}
      {modalCidade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="font-extrabold text-slate-900 text-sm">Cidades e valores de transferência</div>
              <button onClick={()=>setModalCidade(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={15}/></button>
            </div>
            <div className="p-5 space-y-3">
              {/* Form add/edit */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase">
                  {formCidadeEdit.id ? 'Editar cidade' : 'Nova cidade'}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input style={iSx} value={formCidadeEdit.nome} placeholder="Nome da cidade"
                      onChange={e=>setFormCidadeEdit({...formCidadeEdit,nome:e.target.value})} />
                  </div>
                  <input style={iSx} maxLength={2} value={formCidadeEdit.estado} placeholder="UF"
                    onChange={e=>setFormCidadeEdit({...formCidadeEdit,estado:e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor da transferência (R$)</label>
                  <input type="number" step="0.01" style={iSx} value={formCidadeEdit.valor_transferencia}
                    placeholder="0,00"
                    onChange={e=>setFormCidadeEdit({...formCidadeEdit,valor_transferencia:e.target.value})} />
                </div>
                <div className="flex gap-2 justify-end">
                  {formCidadeEdit.id && (
                    <button onClick={()=>setFormCidadeEdit({id:null,nome:'',estado:'',valor_transferencia:''})}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-100">
                      Cancelar
                    </button>
                  )}
                  <button
                    disabled={savingCidade || !formCidadeEdit.nome.trim()}
                    onClick={async()=>{
                      setSavingCidade(true);
                      try {
                        await addOuEditarCidade({
                          id: formCidadeEdit.id||undefined,
                          nome: formCidadeEdit.nome,
                          estado: formCidadeEdit.estado,
                          valor_transferencia: formCidadeEdit.valor_transferencia ? Number(formCidadeEdit.valor_transferencia) : null,
                        });
                        setFormCidadeEdit({id:null,nome:'',estado:'',valor_transferencia:''});
                        toast.success('Cidade salva');
                      } catch(e) { toast.error('Erro',e.message); }
                      finally { setSavingCidade(false); }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-50 hover:bg-slate-800"
                  >
                    {savingCidade ? 'Salvando...' : formCidadeEdit.id ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              </div>
              {/* Lista de cidades */}
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {cidades.map(c=>(
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{c.nome}{c.estado?` — ${c.estado}`:''}</div>
                      {c.valor_transferencia && (
                        <div className="text-xs text-emerald-600 font-semibold">
                          Valor: {Number(c.valor_transferencia).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                        </div>
                      )}
                    </div>
                    <button onClick={()=>setFormCidadeEdit({id:c.id,nome:c.nome,estado:c.estado||'',valor_transferencia:c.valor_transferencia||''})}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
                      <Pencil size={13}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal detalhes ── */}
      {detalhes && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={()=>setDetalhes(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3"
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-slate-900">Detalhes da transferência</div>
              <button onClick={()=>setDetalhes(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X size={16}/>
              </button>
            </div>
            <StatusBadge status={detalhes.status} />
            {[
              ['Data',        new Date(detalhes.data+'T12:00:00').toLocaleDateString('pt-BR')],
              ['Paciente',    detalhes.paciente||'—'],
              ['Tipo',        TIPO_LABEL[detalhes.tipo]||detalhes.tipo],
              ['Origem',      detalhes.origem?.nome||'—'],
              ['Destino',     detalhes.destino?.nome||'—'],
              ['Hospital',    detalhes.hospital?.nome||'—'],
              ['Médico',      detalhes.medico?.nome||'—'],
              ['Enfermagem',  detalhes.enfermeiro?.nome||'—'],
              ['Motorista',   detalhes.motorista?.nome||'—'],
              ['Veículo',     detalhes.veiculo||'—'],
              ['KM rodado',   detalhes.km_rodado ? `${detalhes.km_rodado} km` : '—'],
              ['Valor',       detalhes.valor ? Number(detalhes.valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—'],
              ['Observações', detalhes.observacoes||'—'],
            ].map(([k,v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-slate-100 pb-1 last:border-0">
                <span className="text-slate-500 font-medium">{k}</span>
                <span className="text-slate-900 font-semibold text-right max-w-[60%]">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}