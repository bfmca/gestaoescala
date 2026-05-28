import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider.jsx';
import { TENANT_ID } from '../config';
import Card       from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import SelectWithAdd from '../components/ui/SelectWithAdd.jsx';
import { FileText, Stethoscope, BarChart3, AlertTriangle } from 'lucide-react';
import { MESES } from '../lib/relatorioUtils.jsx';

const iSx = {
  width:'100%', boxSizing:'border-box', fontSize:13,
  padding:'9px 12px', border:'1.5px solid #CBD5E1',
  borderRadius:10, background:'#fff', fontFamily:'inherit', outline:'none',
};

const hoje = new Date();

export default function RelatoriosPage() {
  const toast = useToast();
  const [prestadores, setPrestadores] = useState([]);
  const [contratados, setContratados] = useState([]);
  const [cidadeTenant, setCidadeTenant] = useState('Brasilândia-MS');

  // Relatório 1 — Contrato
  const [r1Prest,   setR1Prest]   = useState('');
  const [r1Mes,     setR1Mes]     = useState(hoje.getMonth());
  const [r1Ano,     setR1Ano]     = useState(hoje.getFullYear());
  const [r1DataRaw, setR1DataRaw] = useState(hoje.toISOString().slice(0,10));

  // Relatório 2 — Por prestador
  const [r2Prest,    setR2Prest]    = useState('');
  const [r2Mes,      setR2Mes]      = useState(hoje.getMonth());
  const [r2Ano,      setR2Ano]      = useState(hoje.getFullYear());
  const [naoConf,    setNaoConf]    = useState(null); // qtd plantões não confirmados
  const [loadingChk, setLoadingChk] = useState(false);

  // Relatório 3 — Consolidado
  const [r3Mes,  setR3Mes]  = useState(hoje.getMonth());
  const [r3Ano,  setR3Ano]  = useState(hoje.getFullYear());

  const anos = [hoje.getFullYear()-1, hoje.getFullYear(), hoje.getFullYear()+1];

  useEffect(()=>{ buscarPrestadores(); },[]);

  async function buscarPrestadores() {
    const [plantonistas, comContrato, ten] = await Promise.all([
      // Relatório 2: apenas plantonistas
      supabase.from('prestadores').select('id,nome,empresa')
        .eq('tenant_id',TENANT_ID).eq('ativo',true).eq('plantonista',true).order('nome'),
      // Relatório 1: apenas contrato fixo
      supabase.from('prestadores').select('id,nome,empresa')
        .eq('tenant_id',TENANT_ID).eq('contrato_fixo',true).eq('ativo',true).order('nome'),
      // Cidade para assinatura
      supabase.from('tenants').select('cidade_assinatura')
        .eq('id',TENANT_ID).single(),
    ]);
    setPrestadores(plantonistas.data||[]);
    setContratados(comContrato.data||[]);
    if (ten.data?.cidade_assinatura) setCidadeTenant(ten.data.cidade_assinatura);
  }

  async function verificarNaoConfirmados() {
    if (!r2Prest) return;
    setLoadingChk(true);
    const inicio = `${r2Ano}-${String(r2Mes+1).padStart(2,'0')}-01`;
    const fim    = new Date(r2Ano,r2Mes+1,0).toISOString().slice(0,10);

    const { count } = await supabase.from('plantoes')
      .select('*',{count:'exact',head:true})
      .eq('tenant_id',TENANT_ID)
      .eq('prestador_id',r2Prest)
      .in('status',['ABERTO','ESCALADO'])
      .gte('data',inicio).lte('data',fim)
      .eq('ativo',true);

    setNaoConf(count||0);
    setLoadingChk(false);
  }

  useEffect(()=>{
    setNaoConf(null);
    if (r2Prest) verificarNaoConfirmados();
  },[r2Prest, r2Mes, r2Ano]);

  function abrirR1() {
    if (!r1Prest) { toast.warning('Selecione o prestador',''); return; }
    const d = new Date(r1DataRaw + 'T12:00:00');
    const dataFormatada = `${cidadeTenant}, ${d.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}`;
    const params = new URLSearchParams({
      prestador_id: r1Prest,
      mes: r1Mes,
      ano: r1Ano,
      data_assinatura: dataFormatada,
    });
    window.open(`/imprimir-relatorio-servicos?${params}`, '_blank');
  }

  function abrirR2() {
    if (!r2Prest) { toast.warning('Selecione o prestador',''); return; }
    const params = new URLSearchParams({ prestador_id:r2Prest, mes:r2Mes, ano:r2Ano });
    window.open(`/imprimir-relatorio-medico?${params}`, '_blank');
  }

  function abrirR3() {
    const params = new URLSearchParams({ mes:r3Mes, ano:r3Ano });
    window.open(`/imprimir-consolidado?${params}`, '_blank');
  }

  function MesAnoSelect({ mes, ano, setMes, setAno }) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mês</label>
          <select style={iSx} value={mes} onChange={e=>setMes(Number(e.target.value))}>
            {MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ano</label>
          <select style={iSx} value={ano} onChange={e=>setAno(Number(e.target.value))}>
            {anos.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios"
        subtitle="Geração de relatórios de serviços, produção e consolidado mensal"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* ── RELATÓRIO 1 — CONTRATO ── */}
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
                <FileText size={16} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Serviços Prestados</div>
                <div className="text-xs text-slate-400">Relatório de contrato</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prestador *</label>
              <select style={iSx} value={r1Prest} onChange={e=>setR1Prest(e.target.value)}>
                <option value="">Selecione...</option>
                {contratados.map(p=>(
                  <option key={p.id} value={p.id}>{p.empresa||p.nome}</option>
                ))}
              </select>
            </div>

            <MesAnoSelect mes={r1Mes} ano={r1Ano} setMes={setR1Mes} setAno={setR1Ano} />

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Data de assinatura
              </label>
              <input type="date" style={iSx} value={r1DataRaw}
                onChange={e=>setR1DataRaw(e.target.value)} />
              <div className="text-xs text-slate-400 mt-1">
                {r1DataRaw && `${cidadeTenant}, ${new Date(r1DataRaw+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}`}
              </div>
            </div>

            <button onClick={abrirR1}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition">
              Gerar relatório
            </button>
          </div>
        </Card>

        {/* ── RELATÓRIO 2 — SERVIÇOS MÉDICOS ── */}
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center">
                <Stethoscope size={16} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Serviços Médicos</div>
                <div className="text-xs text-slate-400">Por prestador — plantões, transf. e produção</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prestador *</label>
              <select style={iSx} value={r2Prest} onChange={e=>setR2Prest(e.target.value)}>
                <option value="">Selecione...</option>
                {prestadores.map(p=>(
                  <option key={p.id} value={p.id}>{p.nome}{p.empresa?` — ${p.empresa}`:''}</option>
                ))}
              </select>
            </div>

            <MesAnoSelect mes={r2Mes} ano={r2Ano} setMes={setR2Mes} setAno={setR2Ano} />

            {/* Aviso de plantões não confirmados */}
            {r2Prest && naoConf !== null && (
              naoConf > 0 ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-amber-800 font-bold text-xs">
                      {naoConf} plantão{naoConf>1?'ões':''} não confirmado{naoConf>1?'s':''}
                    </div>
                    <div className="text-amber-700 text-xs mt-0.5">
                      Esses plantões não aparecerão no relatório. Confirme-os na Gestão de Plantões antes de emitir.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-700 text-xs font-semibold">
                  ✓ Todos os plantões do período estão confirmados
                </div>
              )
            )}

            <button onClick={abrirR2} disabled={!r2Prest}
              className="w-full py-2.5 rounded-xl bg-blue-700 text-white font-bold text-sm hover:bg-blue-800 transition disabled:opacity-40">
              Gerar relatório
            </button>
          </div>
        </Card>

        {/* ── RELATÓRIO 3 — CONSOLIDADO ── */}
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center">
                <BarChart3 size={16} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Consolidado Mensal</div>
                <div className="text-xs text-slate-400">Todos os serviços do período</div>
              </div>
            </div>

            <MesAnoSelect mes={r3Mes} ano={r3Ano} setMes={setR3Mes} setAno={setR3Ano} />

            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
              <div>✓ Plantões por escala (confirmados)</div>
              <div>✓ Sobreaviso / Transferências</div>
              <div>✓ Particulares e Convênios</div>
              <div>✓ Especialidades, Autônomos e Consultoria</div>
            </div>

            <button onClick={abrirR3}
              className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 transition">
              Gerar relatório
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}