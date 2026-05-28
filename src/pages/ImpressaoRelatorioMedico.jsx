// Relatório 2 — Serviços Médicos por Prestador
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';
import {
  moeda, fmtData, horarioStr, periodoLabel, calcHoras,
  PRINT_CSS, RelatorioHeader, RelatorioFooter, MESES,
} from '../lib/relatorioUtils.jsx';

const thS = {
  padding:'5px 6px', fontSize:11, fontWeight:'bold',
  borderBottom:'1px solid #ccc', textAlign:'left', whiteSpace:'nowrap',
};
const tdS = { padding:'4px 6px', fontSize:11, borderBottom:'1px solid #eee' };

export default function ImpressaoRelatorioMedico() {
  const p       = new URLSearchParams(window.location.search);
  const prestId = p.get('prestador_id');
  const mes     = parseInt(p.get('mes'));
  const ano     = parseInt(p.get('ano'));

  const inicio = `${ano}-${String(mes+1).padStart(2,'0')}-01`;
  const fim    = new Date(ano,mes+1,0).toISOString().slice(0,10);

  const [prestador,    setPrestador]    = useState(null);
  const [plantoes,     setPlantoes]     = useState([]);
  const [transferencias,setTransferencias]=useState([]);
  const [producao,     setProducao]     = useState([]);
  const [remuneracoes, setRemuneracoes] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(()=>{ carregar(); },[]);
  useEffect(()=>{
    if (!loading) setTimeout(()=>window.print(), 800);
  },[loading]);

  async function carregar() {
    const [rPrest, rPl, rTransf, rProd, rRem] = await Promise.all([
      supabase.from('prestadores').select('*').eq('id',prestId).single(),

      supabase.from('plantoes')
        .select('data,escala_id,turno_id,status,escalas:escala_id(id,nome,cor),turnos:turno_id(id,nome,hora_inicio,hora_fim,ordem)')
        .eq('tenant_id',TENANT_ID).eq('prestador_id',prestId)
        .in('status',['CONFERIDO','PAGO'])
        .gte('data',inicio).lte('data',fim)
        .eq('ativo',true).order('data'),

      supabase.from('transferencias')
        .select('data,paciente,valor,destino:cidade_destino_id(nome),hospital:hospital_destino_id(nome)')
        .eq('tenant_id',TENANT_ID).eq('prestador_id',prestId)
        .eq('status','REALIZADO')
        .gte('data',inicio).lte('data',fim)
        .order('data'),

      supabase.from('producao_prestadores')
        .select('data,valor,categoria:categoria_id(nome)')
        .eq('tenant_id',TENANT_ID).eq('prestador_id',prestId)
        .gte('data',inicio).lte('data',fim)
        .order('data'),

      supabase.from('remuneracoes')
        .select('escala_id,turno_id,valor')
        .eq('tenant_id',TENANT_ID),
    ]);

    setPrestador(rPrest.data);
    setPlantoes(rPl.data||[]);
    setTransferencias(rTransf.data||[]);
    setProducao(rProd.data||[]);
    setRemuneracoes(rRem.data||[]);
    setLoading(false);
  }

  // Mapa de remuneração: remMap[escala_id][turno_id] = valor
  const remMap = useMemo(()=>{
    const m = {};
    remuneracoes.forEach(r=>{
      if (!m[r.escala_id]) m[r.escala_id]={};
      m[r.escala_id][r.turno_id] = Number(r.valor||0);
    });
    return m;
  },[remuneracoes]);

  // Agrupa plantões por escala
  const porEscala = useMemo(()=>{
    const map = {};
    plantoes.forEach(p=>{
      const key = p.escala_id;
      if (!map[key]) map[key]={ escala: p.escalas, itens:[] };
      const valor = remMap[p.escala_id]?.[p.turno_id] || 0;
      map[key].itens.push({ ...p, valor });
    });
    // Ordena por nome da escala
    return Object.values(map).sort((a,b)=>(a.escala?.nome||'').localeCompare(b.escala?.nome||''));
  },[plantoes, remMap]);

  // Totais por escala para o resumo
  const resumo = useMemo(()=>[
    ...porEscala.map(e=>({
      label: e.escala?.nome||'Escala',
      qtd: e.itens.length,
      valor: e.itens.reduce((s,i)=>s+i.valor,0),
    })),
    transferencias.length>0 && {
      label: 'Transferências Realizadas',
      qtd: transferencias.length,
      valor: transferencias.reduce((s,t)=>s+Number(t.valor||0),0),
    },
    ...Object.entries(
      producao.reduce((m,p)=>{
        const cat=p.categoria?.nome||'Produção';
        if(!m[cat]) m[cat]={qtd:0,valor:0};
        m[cat].qtd++; m[cat].valor+=Number(p.valor||0);
        return m;
      },{})
    ).map(([label,v])=>({label,...v})),
  ].filter(Boolean),[porEscala, transferencias, producao]);

  const totalGeral = resumo.reduce((s,r)=>s+r.valor,0);
  const totalQtd   = resumo.reduce((s,r)=>s+r.qtd,0);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Arial'}}>
      Preparando relatório...
    </div>
  );

  if (!prestador) return <div style={{padding:40,fontFamily:'Arial'}}>Prestador não encontrado.</div>;

  const periodo = `${mes+1}.${MESES[mes]}/${ano}`;
  const mesAno = periodoLabel(mes, ano);

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'20px 24px',background:'#fff'}}>
      <style>{PRINT_CSS}</style>

      <RelatorioHeader titulo="RELATÓRIO DE SERVIÇOS MÉDICOS" />

      {/* Cabeçalho do prestador */}
      <div style={{marginBottom:16,fontSize:12}}>
        <div><strong>Médico:</strong> {prestador.nome}</div>
        {prestador.empresa && <div><strong>Razão Social:</strong> {prestador.empresa}</div>}
        <div><strong>Mês/Ano:</strong> {periodo}</div>
      </div>

      {/* ── SEÇÕES POR ESCALA ── */}
      {porEscala.map(grupo=>{
        const cor = grupo.escala?.cor || '#1a237e';
        const total = grupo.itens.reduce((s,i)=>s+i.valor,0);
        return (
          <div key={grupo.escala?.id} style={{marginBottom:12}}>
            <div style={{background:cor,color:'#fff',fontWeight:'bold',fontSize:11,
              padding:'5px 10px',textAlign:'center',textTransform:'uppercase',letterSpacing:.5}}>
              {grupo.escala?.nome||'Escala'}
            </div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Data','Turno','Horário','Valor'].map(h=>(
                    <th key={h} style={{...thS,textAlign:h==='Valor'?'right':'left'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupo.itens.map((item,i)=>(
                  <tr key={i}>
                    <td style={tdS}>{fmtData(item.data)}</td>
                    <td style={tdS}>{item.turnos?.nome||'—'}</td>
                    <td style={tdS}>{horarioStr(item.turnos?.hora_inicio, item.turnos?.hora_fim)}</td>
                    <td style={{...tdS,textAlign:'right'}}>{moeda(item.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:'#f5f5f5',fontWeight:'bold'}}>
                  <td colSpan={2} style={{padding:'4px 6px',fontSize:11,color:cor}}>Total de Plantões</td>
                  <td style={{padding:'4px 6px',fontSize:11,textAlign:'center',color:cor}}>{grupo.itens.length}</td>
                  <td style={{padding:'4px 6px',fontSize:11,textAlign:'right',fontWeight:'bold',color:cor}}>
                    {moeda(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}

      {/* ── TRANSFERÊNCIAS ── */}
      {transferencias.length>0 && (
        <div style={{marginBottom:12}}>
          <div style={{background:'#37474f',color:'#fff',fontWeight:'bold',fontSize:11,
            padding:'5px 10px',textAlign:'center',textTransform:'uppercase',letterSpacing:.5}}>
            TRANSFERÊNCIAS
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['Data','Paciente','Destino','Valor'].map(h=>(
                  <th key={h} style={{...thS,textAlign:h==='Valor'?'right':'left'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transferencias.map((t,i)=>(
                <tr key={i}>
                  <td style={tdS}>{fmtData(t.data)}</td>
                  <td style={tdS}>{t.paciente||'—'}</td>
                  <td style={tdS}>{t.destino?.nome||t.hospital?.nome||'—'}</td>
                  <td style={{...tdS,textAlign:'right'}}>{moeda(t.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:'#f5f5f5',fontWeight:'bold'}}>
                <td colSpan={2} style={{padding:'4px 6px',fontSize:11,color:'#37474f'}}>Total de Transferências</td>
                <td style={{padding:'4px 6px',fontSize:11,textAlign:'center',color:'#37474f'}}>{transferencias.length}</td>
                <td style={{padding:'4px 6px',fontSize:11,textAlign:'right',fontWeight:'bold',color:'#37474f'}}>
                  {moeda(transferencias.reduce((s,t)=>s+Number(t.valor||0),0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── PRODUÇÃO ── */}
      {producao.length>0 && (
        <div style={{marginBottom:12}}>
          <div style={{background:'#2e7d32',color:'#fff',fontWeight:'bold',fontSize:11,
            padding:'5px 10px',textAlign:'center',textTransform:'uppercase',letterSpacing:.5}}>
            PARTICULARES E CONVÊNIOS
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['Data','Categoria','Valor'].map(h=>(
                  <th key={h} style={{...thS,textAlign:h==='Valor'?'right':'left'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {producao.map((item,i)=>(
                <tr key={i}>
                  <td style={tdS}>{fmtData(item.data)}</td>
                  <td style={tdS}>{item.categoria?.nome||'—'}</td>
                  <td style={{...tdS,textAlign:'right'}}>{moeda(item.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:'#f5f5f5',fontWeight:'bold'}}>
                <td colSpan={2} style={{padding:'4px 6px',fontSize:11,color:'#2e7d32'}}>Total</td>
                <td style={{padding:'4px 6px',fontSize:11,textAlign:'right',fontWeight:'bold',color:'#2e7d32'}}>
                  {moeda(producao.reduce((s,p)=>s+Number(p.valor||0),0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── RESUMO GERAL ── */}
      <div style={{marginTop:16}}>
        <div style={{background:'#1a237e',color:'#fff',fontWeight:'bold',fontSize:11,
          padding:'5px 10px',textAlign:'center',textTransform:'uppercase',letterSpacing:.5}}>
          RESUMO GERAL
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={thS}>Serviço Prestado</th>
              <th style={{...thS,textAlign:'center'}}>Quantidade</th>
              <th style={{...thS,textAlign:'right'}}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {resumo.map((r,i)=>(
              <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                <td style={tdS}>{r.label}</td>
                <td style={{...tdS,textAlign:'center'}}>{r.qtd}</td>
                <td style={{...tdS,textAlign:'right'}}>{moeda(r.valor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{borderTop:'2px solid #1a237e',background:'#f5f5f5',fontWeight:'bold'}}>
              <td style={{padding:'5px 6px',fontSize:11}}>Total</td>
              <td style={{padding:'5px 6px',fontSize:11,textAlign:'center'}}>{totalQtd}</td>
              <td style={{padding:'5px 6px',fontSize:12,textAlign:'right',color:'#1a237e'}}>{moeda(totalGeral)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Data e assinaturas */}
      <div style={{textAlign:'right',fontSize:11,margin:'24px 0 40px'}}>
        Brasilândia-MS, {new Date(fim+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}
      </div>
      <div style={{display:'flex',justifyContent:'space-between'}}>
        <div style={{textAlign:'center',width:'38%'}}>
          <div style={{borderTop:'1px solid #333',paddingTop:6,fontSize:11}}>
            Representante do Hospital
          </div>
        </div>
        <div style={{textAlign:'center',width:'50%'}}>
          <div style={{borderTop:'1px solid #333',paddingTop:6,fontSize:11}}>
            <strong>{prestador.empresa||prestador.nome}</strong>
            {prestador.cnpj && <><br/>CNPJ: {prestador.cnpj}</>}
          </div>
        </div>
      </div>

      <RelatorioFooter />
    </div>
  );
}