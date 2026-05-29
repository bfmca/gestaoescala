import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';
import { PRINT_CSS, RelatorioFooter } from '../lib/relatorioUtils.jsx';

const DIAS_SEMANA_DOM = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DIAS_SEMANA_SEG = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function ImpressaoEscalaPage() {
  const params  = new URLSearchParams(window.location.search);
  const ano     = parseInt(params.get('ano')  || new Date().getFullYear());
  const mes     = parseInt(params.get('mes')  || new Date().getMonth());
  const escId   = params.get('escala_id')   || '';
  const escNome = params.get('escala_nome') || 'Escala';

  const [plantoes,  setPlantoes]  = useState([]);
  const [turnos,    setTurnos]    = useState([]);
  const [tenant,    setTenant]    = useState(null);
  const [prestMap,  setPrestMap]  = useState({});
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([carregar(), buscarTurnos(), buscarTenant()]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) setTimeout(() => window.print(), 500);
  }, [loading]);

  async function carregar() {
    const inicio = new Date(ano, mes, 1).toISOString().slice(0, 10);
    const fim    = new Date(ano, mes + 1, 0).toISOString().slice(0, 10);

    let q = supabase
      .from('plantoes')
      .select('*, turnos:turno_id(id,nome,ordem), prestadores:prestador_id(id,nome,cor)')
      .eq('tenant_id', TENANT_ID)
      .eq('ativo', true)
      .gte('data', inicio)
      .lte('data', fim)
      .not('status', 'eq', 'CANCELADO');

    if (escId) q = q.eq('escala_id', escId);
    const { data } = await q;

    // Mapa de cor por nome do prestador
    const pm = {};
    (data||[]).forEach(p => {
      if (p.prestadores?.nome) pm[p.prestadores.nome] = p.prestadores.cor || null;
    });
    setPrestMap(pm);
    setPlantoes(data || []);
  }

  async function buscarTurnos() {
    const { data } = await supabase
      .from('turnos')
      .select('id,nome,ordem')
      .eq('tenant_id', TENANT_ID)
      .eq('ativo', true)
      .order('ordem');
    setTurnos(data || []);
  }

  async function buscarTenant() {
    const { data } = await supabase
      .from('tenants')
      .select('nome_sistema,logo_url,primeiro_dia_semana')
      .eq('id', TENANT_ID)
      .single();
    setTenant(data);
  }

  const primeiroDiaSemana = tenant?.primeiro_dia_semana || 0; // 0=Dom, 1=Seg
  const DIAS_SEMANA = primeiroDiaSemana === 1 ? DIAS_SEMANA_SEG : DIAS_SEMANA_DOM;

  const turnosFiltrados = useMemo(() => {
    if (!turnos.length || !plantoes.length) return turnos;
    const usados = new Set(plantoes.map(p => p.turno_id).filter(Boolean));
    const f = turnos.filter(t => usados.has(t.id));
    return f.length > 0 ? f : turnos;
  }, [turnos, plantoes]);

  // Mapa plantões: data → turno_id → [{nome, cor}]
  const mapa = useMemo(() => {
    const m = {};
    plantoes.forEach(p => {
      if (!m[p.data]) m[p.data] = {};
      const tid = p.turno_id;
      if (!m[p.data][tid]) m[p.data][tid] = [];
      if (p.prestadores?.nome) {
        m[p.data][tid].push({ nome: p.prestadores.nome, cor: p.prestadores.cor || null });
      }
    });
    return m;
  }, [plantoes]);

  // Semanas com ajuste do primeiro dia
  const semanas = useMemo(() => {
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const semanas = [];
    let semanaAtual = new Array(7).fill(null);

    for (let d = 1; d <= totalDias; d++) {
      const data = new Date(ano, mes, d);
      const dowNativo = data.getDay(); // 0=Dom
      // Ajusta para o primeiro dia configurado
      const dow = primeiroDiaSemana === 1 ? (dowNativo + 6) % 7 : dowNativo;
      semanaAtual[dow] = d;
      if (dow === 6 || d === totalDias) {
        semanas.push([...semanaAtual]);
        semanaAtual = new Array(7).fill(null);
      }
    }
    return semanas;
  }, [ano, mes, primeiroDiaSemana]);

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'Arial,sans-serif',color:'#555' }}>
      Preparando impressão...
    </div>
  );

  const titulo = `${escNome.toUpperCase()} - ${MESES[mes].toUpperCase()}/${ano}`;
  const logoUrl = tenant?.logo_url || '/logo.jpg';

  const th = {
    background:'#282878',color:'#fff',padding:'4px 3px',
    fontSize:10,fontWeight:700,textAlign:'center',border:'1px solid #ccc',
  };
  const td  = { border:'1px solid #ddd',padding:'2px 3px',fontSize:9,verticalAlign:'top',minHeight:16,whiteSpace:'pre-wrap',wordBreak:'break-word' };
  const tdTurno = { ...td,fontWeight:700,background:'#f5f5f5',fontSize:9,whiteSpace:'nowrap',textAlign:'left',width:46,color:'#282878' };
  const tdNum   = { ...td,textAlign:'center',fontWeight:700,background:'#e8eaf6',color:'#282878',fontSize:10 };
  const tdVazio = { ...td,background:'#fafafa' };

  return (
    <div style={{ fontFamily:'Arial,sans-serif',padding:'12px 16px',maxWidth:900,margin:'0 auto',background:'#fff' }}>
      <style>{PRINT_CSS}</style>
      <style>{'@media print { @page { size: A4 landscape; margin: 10mm 12mm; } }'}</style>

      {/* Cabeçalho */}
      <div style={{ display:'flex',alignItems:'center',marginBottom:12,gap:16 }}>
        <img src={logoUrl} alt="Logo" style={{ height:64,maxWidth:180,objectFit:'contain' }}
          onError={e=>e.target.style.display='none'} />
        <div style={{ flex:1,textAlign:'center' }}>
          <div style={{ fontSize:16,fontWeight:800,color:'#282878',letterSpacing:.5 }}>{titulo}</div>
          <div style={{ fontSize:12,color:'#555',marginTop:3,fontWeight:600,letterSpacing:1,textTransform:'uppercase' }}>
            Escala de Plantões
          </div>
        </div>
      </div>

      {/* Tabela */}
      <table style={{ width:'100%',borderCollapse:'collapse',tableLayout:'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...th,width:46 }}>Turno</th>
            {DIAS_SEMANA.map(d => <th key={d} style={th}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana, si) => (
            <>
              {/* Linha dos números dos dias */}
              <tr key={`num-${si}`}>
                <td style={{ ...td,background:'#e8eaf6' }} />
                {semana.map((dia, di) => (
                  <td key={di} style={dia ? tdNum : tdVazio}>{dia || ''}</td>
                ))}
              </tr>
              {/* Linhas por turno */}
              {turnosFiltrados.map(turno => (
                <tr key={`${si}-${turno.id}`}>
                  <td style={tdTurno}>{turno.nome}</td>
                  {semana.map((dia, di) => {
                    if (!dia) return <td key={di} style={tdVazio} />;
                    const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
                    const itens = mapa[dataStr]?.[turno.id] || [];
                    return (
                      <td key={di} style={td}>
                        {itens.map((item, i) => (
                          <div key={i} style={{ fontSize:8.5,lineHeight:1.3,color:item.cor||'#111' }}>
                            {item.nome.startsWith('Dr') ? item.nome : `Dr(a). ${item.nome}`}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>

      {/* Rodapé assinatura */}
      <div style={{ marginTop:24,paddingTop:16,display:'flex',justifyContent:'space-between',fontSize:10,color:'#888' }}>
        <span>Gerado em {new Date().toLocaleDateString('pt-BR')}</span>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:10,color:'#555',marginBottom:4 }}>Responsável pela escala</div>
          <div style={{ borderTop:'1px solid #555',width:240,margin:'0 auto' }}></div>
        </div>
      </div>

      {/* Rodapé hospital */}
      <RelatorioFooter />
    </div>
  );
}