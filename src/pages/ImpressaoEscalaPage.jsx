// ── Impressão de escala mensal — modelo PDF do hospital ────────
// Acessado via botão no CalendarioPage, abre em nova aba e imprime

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function ImpressaoEscalaPage() {
  // Lê parâmetros da URL: ?ano=2026&mes=4&escala_id=xxx&escala_nome=Pronto+Socorro
  const params  = new URLSearchParams(window.location.search);
  const ano     = parseInt(params.get('ano')  || new Date().getFullYear());
  const mes     = parseInt(params.get('mes')  || new Date().getMonth());
  const escId   = params.get('escala_id')   || '';
  const escNome = params.get('escala_nome') || 'Escala';

  const [plantoes,  setPlantoes]  = useState([]);
  const [turnos,    setTurnos]    = useState([]);
  const [tenant,    setTenant]    = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([carregar(), buscarTurnos(), buscarTenant()]).then(() => {
      setLoading(false);
    });
  }, []);

  // Dispara impressão automática quando carregar
  // Filtra turnos para mostrar apenas os que aparecem nos plantões da escala
  const turnosFiltrados = useMemo(() => {
    if (!turnos.length || !plantoes.length) return turnos;
    const turnosUsados = new Set(plantoes.map(p => p.turno_id).filter(Boolean));
    const filtered = turnos.filter(t => turnosUsados.has(t.id));
    return filtered.length > 0 ? filtered : turnos;
  }, [turnos, plantoes]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading]);

  async function carregar() {
    const inicio = new Date(ano, mes, 1).toISOString().slice(0, 10);
    const fim    = new Date(ano, mes + 1, 0).toISOString().slice(0, 10);

    const query = supabase
      .from('plantoes')
      .select('*, turnos:turno_id(id,nome,ordem), prestadores:prestador_id(id,nome)')
      .eq('tenant_id', TENANT_ID)
      .eq('ativo', true)
      .gte('data', inicio)
      .lte('data', fim)
      .not('status', 'eq', 'CANCELADO');

    if (escId) query.eq('escala_id', escId);

    const { data } = await query;
    setPlantoes(data || []);
  }

  async function buscarTurnos() {
    const { data } = await supabase
      .from('turnos')
      .select('id, nome, ordem')
      .eq('tenant_id', TENANT_ID)
      .eq('ativo', true)
      .order('ordem');
    setTurnos(data || []);
  }

  async function buscarTenant() {
    const { data } = await supabase
      .from('tenants')
      .select('nome_sistema, logo_url')
      .eq('id', TENANT_ID)
      .single();
    setTenant(data);
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', fontFamily:'Arial, sans-serif', color:'#555' }}>
      Preparando impressão...
    </div>
  );

  // Monta estrutura de semanas
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia   = new Date(ano, mes + 1, 0);
  const totalDias   = ultimoDia.getDate();

  // Agrupa plantões: { 'YYYY-MM-DD': { turno_id: [prestador_nome, ...] } }
  const mapa = {};
  for (const p of plantoes) {
    if (!mapa[p.data]) mapa[p.data] = {};
    const tid = p.turno_id;
    if (!mapa[p.data][tid]) mapa[p.data][tid] = [];
    if (p.prestadores?.nome) mapa[p.data][tid].push(p.prestadores.nome);
  }

  // Monta semanas (arrays de 7 dias, null = dia fora do mês)
  const semanas = [];
  let semanaAtual = new Array(7).fill(null);
  for (let d = 1; d <= totalDias; d++) {
    const data = new Date(ano, mes, d);
    const dow  = data.getDay(); // 0=Dom
    semanaAtual[dow] = d;
    if (dow === 6 || d === totalDias) {
      semanas.push([...semanaAtual]);
      semanaAtual = new Array(7).fill(null);
    }
  }

  const titulo = `${escNome.toUpperCase()} - ${MESES[mes].toUpperCase()}/${ano}`;
  const logoUrl = tenant?.logo_url || '/logo.jpg';

  // Estilos inline para impressão
  const th = {
    background: '#1a237e', color: '#fff', padding: '4px 3px',
    fontSize: 10, fontWeight: 700, textAlign: 'center',
    border: '1px solid #ccc',
  };
  const td = {
    border: '1px solid #ddd', padding: '2px 3px',
    fontSize: 9, verticalAlign: 'top', minHeight: 16,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  };
  const tdTurno = {
    ...td, fontWeight: 700, background: '#f5f5f5',
    fontSize: 9, whiteSpace: 'nowrap', textAlign: 'left',
    width: 46, color: '#1a237e',
  };
  const tdNum = {
    ...td, textAlign: 'center', fontWeight: 700,
    background: '#e8eaf6', color: '#1a237e', fontSize: 10,
  };
  const tdVazio = { ...td, background: '#fafafa' };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '12px 16px',
      maxWidth: 900, margin: '0 auto', background: '#fff' }}>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @media screen {
          body { background: #eee; }
          .print-wrap { box-shadow: 0 2px 12px rgba(0,0,0,.2); padding: 20px; background: #fff; }
        }
      `}</style>

      <div className="print-wrap">
        {/* Cabeçalho */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:12, gap:16 }}>
          <img src={logoUrl} alt="Logo"
            style={{ height:64, maxWidth:180, objectFit:'contain' }}
            onError={e => e.target.style.display='none'} />
          <div style={{ flex:1, textAlign:'center' }}>
            <div style={{ fontSize:16, fontWeight:800, color:'#1a237e', letterSpacing:.5 }}>
              {titulo}
            </div>
            <div style={{ fontSize:12, color:'#555', marginTop:3, fontWeight:600,
              letterSpacing:1, textTransform:'uppercase' }}>
              Escala de Plantões
            </div>
          </div>
        </div>

        {/* Tabela */}
        <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...th, width:52 }}>Turno</th>
              {DIAS_SEMANA.map(d => (
                <th key={d} style={th}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semanas.map((semana, si) => (
              <>
                {/* Linha de números dos dias */}
                <tr key={`num-${si}`}>
                  <td style={{ ...td, background:'#e8eaf6' }} />
                  {semana.map((dia, di) => (
                    <td key={di} style={dia ? tdNum : tdVazio}>
                      {dia || ''}
                    </td>
                  ))}
                </tr>

                {/* Linhas de turno */}
                {turnosFiltrados.map(turno => (
                  <tr key={`${si}-${turno.id}`}>
                    <td style={tdTurno}>{turno.nome}</td>
                    {semana.map((dia, di) => {
                      if (!dia) return <td key={di} style={tdVazio} />;
                      const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
                      const nomes   = mapa[dataStr]?.[turno.id] || [];
                      return (
                        <td key={di} style={td}>
                          {nomes.map((n, i) => (
                            <div key={i} style={{ fontSize:9.5, lineHeight:1.4 }}>
                              {n.startsWith('Dr') ? n : `Dr(a). ${n}`}
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

        {/* Rodapé */}
        <div style={{ marginTop:24, borderTop:'1px solid #ddd', paddingTop:16,
          display:'flex', justifyContent:'space-between', fontSize:10, color:'#888' }}>
          <span>Gerado em {new Date().toLocaleDateString('pt-BR')}</span>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:10, color:'#555', marginBottom:4}}>Responsável pela escala</div>
            <div style={{borderTop:'1px solid #555', width:240, margin:'0 auto'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
}