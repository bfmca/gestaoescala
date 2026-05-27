import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider.jsx';
import { TENANT_ID } from '../config';
import Button       from '../components/ui/Button.jsx';
import Card         from '../components/ui/Card.jsx';
import PageHeader   from '../components/ui/PageHeader.jsx';
import SelectWithAdd from '../components/ui/SelectWithAdd.jsx';
import { Plus, Pencil, Search } from 'lucide-react';

const iSx = {
  width:'100%', boxSizing:'border-box', fontSize:13,
  padding:'9px 12px', border:'1.5px solid #CBD5E1',
  borderRadius:10, background:'#fff', fontFamily:'inherit', outline:'none',
};

const CARGOS = [
  { value:'ENFERMAGEM', label:'Enfermagem' },
  { value:'MOTORISTA',  label:'Motorista'  },
  { value:'OUTRO',      label:'Outro'      },
];

const formIni = {
  id:null, nome:'', cpf:'', email:'', telefone:'',
  cargo:'ENFERMAGEM', departamento_id:'', funcao_id:'',
  setor:'', ativo:true,
};

function ini(nome) {
  return String(nome||'C').split(' ').filter(Boolean).slice(0,2)
    .map(p=>p[0]).join('').toUpperCase();
}

export default function ColaboradoresPage() {
  const toast = useToast();

  const [colaboradores,  setColaboradores]  = useState([]);
  const [departamentos,  setDepartamentos]  = useState([]);
  const [funcoes,        setFuncoes]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [modalOpen,      setModalOpen]      = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [form,           setForm]           = useState(formIni);
  const [confirmStatus,  setConfirmStatus]  = useState(null);

  // Filtros
  const [busca,         setBusca]         = useState('');
  const [filtroCargo,   setFiltroCargo]   = useState('todos');
  const [filtroDep,     setFiltroDep]     = useState('todos');
  const [aba,           setAba]           = useState('ativos');

  useEffect(() => { carregarTudo(); }, []);

  async function carregarTudo() {
    setLoading(true);
    const [colabs, deps, funs] = await Promise.all([
      supabase.from('profissionais_rh')
        .select('*, dep:departamento_id(id,nome), fun:funcao_id(id,nome)')
        .eq('tenant_id', TENANT_ID).order('nome'),
      supabase.from('departamentos').select('id,nome').eq('tenant_id',TENANT_ID).eq('ativo',true).order('nome'),
      supabase.from('funcoes').select('id,nome').eq('tenant_id',TENANT_ID).eq('ativo',true).order('nome'),
    ]);
    setColaboradores(colabs.data||[]);
    setDepartamentos(deps.data||[]);
    setFuncoes(funs.data||[]);
    setLoading(false);
  }

  // onAdd handlers para SelectWithAdd
  async function addDepartamento(nome) {
    const { data, error } = await supabase.from('departamentos')
      .insert({ tenant_id:TENANT_ID, nome, ativo:true })
      .select().single();
    if (error) throw error;
    setDepartamentos(prev => [...prev, data].sort((a,b)=>a.nome.localeCompare(b.nome)));
    return data;
  }

  async function addFuncao(nome) {
    const { data, error } = await supabase.from('funcoes')
      .insert({ tenant_id:TENANT_ID, nome, ativo:true })
      .select().single();
    if (error) throw error;
    setFuncoes(prev => [...prev, data].sort((a,b)=>a.nome.localeCompare(b.nome)));
    return data;
  }

  async function salvar() {
    if (!form.nome.trim()) { toast.warning('Campo obrigatório','Informe o nome do colaborador.'); return; }
    setSaving(true);
    try {
      const { id, ...rest } = form;
      const payload = {
        ...rest,
        tenant_id:       TENANT_ID,
        departamento_id: rest.departamento_id || null,
        funcao_id:       rest.funcao_id       || null,
      };
      const { error } = id
        ? await supabase.from('profissionais_rh').update(payload).eq('id',id)
        : await supabase.from('profissionais_rh').insert(payload);
      if (error) { toast.error('Erro ao salvar',error.message); return; }
      toast.success(id ? 'Colaborador atualizado' : 'Colaborador cadastrado');
      setModalOpen(false);
      setForm(formIni);
      carregarTudo();
    } finally { setSaving(false); }
  }

  async function alternarStatus(col) {
    const { error } = await supabase.from('profissionais_rh')
      .update({ ativo: !col.ativo }).eq('id', col.id);
    if (error) { toast.error('Erro',error.message); return; }
    toast.success(col.ativo ? 'Colaborador inativado' : 'Colaborador reativado');
    setConfirmStatus(null);
    carregarTudo();
  }

  const listagem = useMemo(() => {
    return colaboradores.filter(c => {
      const abaOk   = aba === 'ativos' ? c.ativo !== false : c.ativo === false;
      const buscaOk = !busca || c.nome?.toLowerCase().includes(busca.toLowerCase())
                             || c.cpf?.includes(busca);
      const cargoOk = filtroCargo === 'todos' || c.cargo === filtroCargo;
      const depOk   = filtroDep   === 'todos' || c.departamento_id === filtroDep;
      return abaOk && buscaOk && cargoOk && depOk;
    });
  }, [colaboradores, aba, busca, filtroCargo, filtroDep]);

  const cargoLabel = v => CARGOS.find(c=>c.value===v)?.label || v;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Colaboradores"
        subtitle="Cadastro de profissionais CLT — enfermagem, motoristas e outros"
        actions={
          <Button onClick={() => { setForm(formIni); setModalOpen(true); }}>
            <Plus size={15} className="mr-1.5 inline" />Novo colaborador
          </Button>
        }
      />

      {/* Filtros */}
      <Card>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Buscar</label>
            <div className="relative">
              <input style={iSx} value={busca} onChange={e=>setBusca(e.target.value)}
                placeholder="Nome ou CPF..." />
              <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cargo</label>
            <select style={iSx} value={filtroCargo} onChange={e=>setFiltroCargo(e.target.value)}>
              <option value="todos">Todos</option>
              {CARGOS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Departamento</label>
            <select style={iSx} value={filtroDep} onChange={e=>setFiltroDep(e.target.value)}>
              <option value="todos">Todos</option>
              {departamentos.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Abas */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {[{k:'ativos',l:'Ativos'},{k:'inativos',l:'Inativos'}].map(t=>(
            <button key={t.k} onClick={()=>setAba(t.k)}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
                aba===t.k ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-50'
              }`}>
              {t.l} ({colaboradores.filter(c=>t.k==='ativos'?c.ativo!==false:c.ativo===false).length})
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-400">{listagem.length} colaborador{listagem.length!==1?'es':''}</div>
      </div>

      {/* Lista */}
      <Card>
        {loading ? (
          <div className="p-10 text-center text-slate-400">Carregando...</div>
        ) : listagem.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <div className="text-3xl mb-2 opacity-30">👥</div>
            <div className="font-semibold">Nenhum colaborador encontrado</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {listagem.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                    ${c.ativo!==false ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {ini(c.nome)}
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${c.ativo!==false?'text-slate-900':'text-slate-400'}`}>
                      {c.nome}
                    </div>
                    <div className="text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span>{cargoLabel(c.cargo)}</span>
                      {c.dep?.nome && <span>• {c.dep.nome}</span>}
                      {c.fun?.nome && <span>• {c.fun.nome}</span>}
                      {c.setor     && <span>• {c.setor}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setForm({
                      ...formIni, ...c,
                      departamento_id: c.departamento_id||'',
                      funcao_id: c.funcao_id||'',
                    }); setModalOpen(true); }}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
                  ><Pencil size={13}/></button>
                  {c.ativo!==false ? (
                    <button onClick={()=>setConfirmStatus(c)}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                      Inativar
                    </button>
                  ) : (
                    <button onClick={()=>setConfirmStatus(c)}
                      className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                      Reativar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal add/edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="font-extrabold text-slate-900">
                {form.id ? 'Editar colaborador' : 'Novo colaborador'}
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome completo *</label>
                <input style={iSx} value={form.nome} placeholder="Nome do colaborador"
                  onChange={e=>setForm({...form,nome:e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">CPF</label>
                <input style={iSx} value={form.cpf} placeholder="000.000.000-00"
                  onChange={e=>setForm({...form,cpf:e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cargo</label>
                <select style={iSx} value={form.cargo}
                  onChange={e=>setForm({...form,cargo:e.target.value})}>
                  {CARGOS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">E-mail</label>
                <input style={iSx} type="email" value={form.email} placeholder="email@hospital.com"
                  onChange={e=>setForm({...form,email:e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Telefone</label>
                <input style={iSx} value={form.telefone} placeholder="(67) 99999-9999"
                  onChange={e=>setForm({...form,telefone:e.target.value})} />
              </div>
              <div className="col-span-2">
                <SelectWithAdd
                  label="Departamento"
                  value={form.departamento_id}
                  onChange={v=>setForm({...form,departamento_id:v})}
                  options={departamentos}
                  onAdd={addDepartamento}
                  placeholder="Selecione ou adicione..."
                />
              </div>
              <div className="col-span-2">
                <SelectWithAdd
                  label="Função"
                  value={form.funcao_id}
                  onChange={v=>setForm({...form,funcao_id:v})}
                  options={funcoes}
                  onAdd={addFuncao}
                  placeholder="Selecione ou adicione..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Setor</label>
                <input style={iSx} value={form.setor} placeholder="Setor de atuação"
                  onChange={e=>setForm({...form,setor:e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={()=>setModalOpen(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar status */}
      {confirmStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 text-center">
            <div className="text-3xl mb-3">{confirmStatus.ativo!==false ? '🚫' : '✓'}</div>
            <div className="font-extrabold text-slate-900 mb-2">
              {confirmStatus.ativo!==false ? 'Inativar colaborador?' : 'Reativar colaborador?'}
            </div>
            <p className="text-slate-500 text-sm mb-6">{confirmStatus.nome}</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={()=>setConfirmStatus(null)}>Cancelar</Button>
              <Button onClick={()=>alternarStatus(confirmStatus)}>
                {confirmStatus.ativo!==false ? 'Sim, inativar' : 'Sim, reativar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}