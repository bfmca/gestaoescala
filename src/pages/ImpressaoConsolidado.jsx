// Relatório 3 — Consolidado Mensal de Serviços Médicos
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';
import {
  moeda, periodoLabel, PRINT_CSS,
  RelatorioHeader, RelatorioFooter, MESES,
} from '../lib/relatorioUtils.jsx';

const thS = {
  padding:'4px 8px', fontSize:11, fontWeight:'bold',
  borderBottom:'1px solid #333', textAlign:'left',
};
const tdS = { padding:'4px 8px', fontSize:11, borderBottom:'1px solid #eee' };

function SecaoHeader({ titulo }) {
  return (
    <tr>
      <td colSpan={2} style={{
        background:'#1a237e',color:'#fff',fontWeight:'bold',
        fontSize:11,padding:'5px 8px',textAlign:'center',
        textTransform:'uppercase',letterSpacing:.5,
      }}>
        {titulo}
      </td>
    </tr>
  );
}

function SubtotalRow({ label, valor }) {
  return (
    <tr style={{background:'#f0f0f0',fontWeight:'bold'}}>
      <td style={{...tdS,borderBottom:'2px solid #1a237e'}}>{label}</td>
      <td style={{...tdS,textAlign:'right',borderBottom:'2px solid #1a237e',color:'#1a237e'}}>
        {moeda(valor)}
      </td>
    </tr>
  );
}

export default function ImpressaoConsolidado() {
  const p   = new URLSearchParams(window.location.search);
  const mes = parseInt(p.get('mes'));
  const ano = parseInt(p.get('ano'));

  const inicio = `${ano}-${String(mes+1).padStart(2,'0')}-01`;
  const fim    = new Date(ano,mes+1,0).toISOString().slice(0,10);

  const [dadosEscalas,  setDadosEscalas]  = useState([]); // plantoes por escala+prestador
  const [dadosTransf,   setDadosTransf]   = useState([]); // transferencias por prestador
  const [dadosProd,     setDadosProd]     = useState([]); // producao por prestador+categoria
  const [dadosContratos,setDadosContratos]= useState([]); // prestadores com contrato
  const [remuneracoes,  setRemuneracoes]  = useState([]);
  const [escalas,       setEscalas]       = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(()=>{ carregar(); },[]);
  useEffect(()=>{
    if (!loading) setTimeout(()=>window.print(), 900);
  },[loading]);

  async function carregar() {
    const [rPl, rTransf, rProd, rPrest, rRem, rEsc] = await Promise.all([
      // Plantões confirmados com prestador e escala
      supabase.from('plantoes')
        .select('escala_id,prestador_id,turno_id,prestadores:prestador_id(nome,empresa,cnpj),escalas:escala_id(id,nome)')
        .eq('tenant_id',TENANT_ID).in('status',['CONFERIDO','PAGO'])
        .gte('data',inicio).lte('data',fim).eq('ativo',true),

      // Transferências realizadas por prestador
      supabase.from('transferencias')
        .select('prestador_id,valor,medico:prestador_id(nome,empresa)')
        .eq('tenant_id',TENANT_ID).eq('status','REALIZADO')
        .gte('data',inicio).lte('data',fim),

      // Produção por prestador e categoria
      supabase.from('producao_prestadores')
        .select('prestador_id,valor,prestadores:prestador_id(nome,empresa),categoria:categoria_id(nome)')
        .eq('tenant_id',TENANT_ID)
        .gte('data',inicio).lte('data',fim),

      // Prestadores com contrato fixo
      supabase.from('prestadores')
        .select('id,nome,empresa,cnpj,valor_contrato,categoria_contrato:categoria_contrato_id(id,nome,ordem)')
        .eq('tenant_id',TENANT_ID).eq('contrato_fixo',true).eq('ativo',true),

      // Remuneraçoes
      supabase.from('remuneracoes').select('escala_id,turno_id,valor').eq('tenant_id',TENANT_ID),

      // Escalas ordenadas
      supabase.from('escalas').select('id,nome,cor').eq('tenant_id',TENANT_ID).eq('ativo',true).order('nome'),
    ]);

    setDadosEscalas(rPl.data||[]);
    setDadosTransf(rTransf.data||[]);
    setDadosProd(rProd.data||[]);
    setDadosContratos(rPrest.data||[]);
    setRemuneracoes(rRem.data||[]);
    setEscalas(rEsc.data||[]);
    setLoading(false);
  }

  const remMap = useMemo(()=>{
    const m={};
    remuneracoes.forEach(r=>{
      if(!m[r.escala_id]) m[r.escala_id]={};
      m[r.escala_id][r.turno_id]=Number(r.valor||0);
    });
    return m;
  },[remuneracoes]);

  // Por escala: { escala_id: { escala, prestadores: {id: {nome,empresa,valor}} } }
  const porEscala = useMemo(()=>{
    const map={};
    dadosEscalas.forEach(p=>{
      const eid=p.escala_id, pid=p.prestador_id;
      if(!map[eid]) map[eid]={ escala:p.escalas, prestadores:{} };
      if(!map[eid].prestadores[pid])
        map[eid].prestadores[pid]={ nome:p.prestadores?.empresa||p.prestadores?.nome||'—', valor:0 };
      map[eid].prestadores[pid].valor += remMap[eid]?.[p.turno_id]||0;
    });
    // Ordena pela ordem das escalas
    return escalas.map(e=>map[e.id]).filter(Boolean);
  },[dadosEscalas, escalas, remMap]);

  // Transferências por prestador
  const transferenciasPorPrest = useMemo(()=>{
    const map={};
    dadosTransf.forEach(t=>{
      const nome=t.medico?.empresa||t.medico?.nome||'—';
      if(!map[nome]) map[nome]=0;
      map[nome]+=Number(t.valor||0);
    });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
  },[dadosTransf]);

  // Produção agrupada por prestador
  const producaoPorPrest = useMemo(()=>{
    const map={};
    dadosProd.forEach(p=>{
      const nome=p.prestadores?.empresa||p.prestadores?.nome||'—';
      if(!map[nome]) map[nome]=0;
      map[nome]+=Number(p.valor||0);
    });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
  },[dadosProd]);

  // Contratos agrupados por categoria
  const contratosPorCat = useMemo(()=>{
    const map={};
    dadosContratos.forEach(p=>{
      const cat=p.categoria_contrato?.nome||'Outros Contratos';
      const ord=p.categoria_contrato?.ordem||99;
      if(!map[cat]) map[cat]={ ordem:ord, itens:[] };
      map[cat].itens.push({ nome:p.empresa||p.nome, valor:Number(p.valor_contrato||0) });
    });
    return Object.entries(map)
      .sort((a,b)=>a[1].ordem-b[1].ordem)
      .map(([nome,v])=>({ nome, ...v }));
  },[dadosContratos]);

  // Totais por seção para o total geral
  const totalEscalas   = porEscala.reduce((s,e)=>s+Object.values(e.prestadores).reduce((ss,p)=>ss+p.valor,0),0);
  const totalTransf    = dadosTransf.reduce((s,t)=>s+Number(t.valor||0),0);
  const totalProd      = dadosProd.reduce((s,p)=>s+Number(p.valor||0),0);
  const totalContratos = dadosContratos.reduce((s,p)=>s+Number(p.valor_contrato||0),0);
  const totalGeral     = totalEscalas+totalTransf+totalProd+totalContratos;

  const periodo = periodoLabel(mes, ano);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Arial'}}>
      Preparando consolidado...
    </div>
  );

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'20px 24px',background:'#fff'}}>
      <style>{PRINT_CSS}</style>

      <RelatorioHeader
        titulo="RELATÓRIO MENSAL DE SERVIÇOS MÉDICOS"
        subtitulo={`Competência: ${periodo}`}
      />

      <table style={{width:'100%',borderCollapse:'collapse',marginBottom:16}}>
        <tbody>

          {/* ── SEÇÕES POR ESCALA ── */}
          {porEscala.map(grupo=>{
            const prests = Object.values(grupo.prestadores).sort((a,b)=>a.nome.localeCompare(b.nome));
            const subTotal = prests.reduce((s,p)=>s+p.valor,0);
            if (prests.length===0) return null;
            return (
              <>
                <SecaoHeader key={'h-'+grupo.escala?.id} titulo={grupo.escala?.nome||'Escala'} />
                {prests.map((p,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                    <td style={tdS}>{p.nome}</td>
                    <td style={{...tdS,textAlign:'right'}}>
                      {p.valor>0 ? moeda(p.valor) : <span style={{color:'#999'}}>-</span>}
                    </td>
                  </tr>
                ))}
                <SubtotalRow label={`SUB-TOTAL — ${grupo.escala?.nome}`} valor={subTotal} />
              </>
            );
          })}

          {/* ── SOBREAVISO / TRANSFERÊNCIAS ── */}
          {transferenciasPorPrest.length>0 && (
            <>
              <SecaoHeader titulo="SOBREAVISO / TRANSFERÊNCIAS" />
              {transferenciasPorPrest.map(([nome,val],i)=>(
                <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                  <td style={tdS}>{nome}</td>
                  <td style={{...tdS,textAlign:'right'}}>
                    {val>0 ? moeda(val) : <span style={{color:'#999'}}>-</span>}
                  </td>
                </tr>
              ))}
              <SubtotalRow label="SUB-TOTAL — SOBREAVISO/TRANSFERÊNCIAS" valor={totalTransf} />
            </>
          )}

          {/* ── PARTICULARES E CONVÊNIOS ── */}
          {producaoPorPrest.length>0 && (
            <>
              <SecaoHeader titulo="PARTICULARES E CONVÊNIOS" />
              {producaoPorPrest.map(([nome,val],i)=>(
                <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                  <td style={tdS}>{nome}</td>
                  <td style={{...tdS,textAlign:'right'}}>
                    {val>0 ? moeda(val) : <span style={{color:'#999'}}>-</span>}
                  </td>
                </tr>
              ))}
              <SubtotalRow label="SUB-TOTAL — PARTICULARES E CONVÊNIOS" valor={totalProd} />
            </>
          )}

          {/* ── CATEGORIAS DE CONTRATO (Especialidades, Autônomos, Consultoria...) ── */}
          {contratosPorCat.map((cat,ci)=>(
            <>
              <SecaoHeader key={'ch-'+ci} titulo={cat.nome} />
              {cat.itens.sort((a,b)=>a.nome.localeCompare(b.nome)).map((item,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                  <td style={tdS}>{item.nome}</td>
                  <td style={{...tdS,textAlign:'right'}}>
                    {item.valor>0 ? moeda(item.valor) : <span style={{color:'#999'}}>-</span>}
                  </td>
                </tr>
              ))}
              <SubtotalRow label={`SUB-TOTAL — ${cat.nome.toUpperCase()}`} valor={cat.itens.reduce((s,i)=>s+i.valor,0)} />
            </>
          ))}

          {/* ── TOTAL GERAL ── */}
          <tr style={{background:'#1a237e'}}>
            <td style={{padding:'8px',fontSize:13,fontWeight:'bold',color:'#fff'}}>TOTAL GERAL</td>
            <td style={{padding:'8px',fontSize:13,fontWeight:'bold',color:'#fff',textAlign:'right'}}>
              {moeda(totalGeral)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Assinaturas */}
      <div style={{textAlign:'left',fontSize:11,marginBottom:40}}>
        Brasilândia MS, {new Date(fim+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}.
      </div>
      <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
        {[
          'Setor Financeiro',
          'Coordenadora Administrativa',
          'Presidente',
        ].map(cargo=>(
          <div key={cargo} style={{textAlign:'center',minWidth:160}}>
            <div style={{borderTop:'1px solid #333',paddingTop:6,fontSize:11}}>{cargo}</div>
          </div>
        ))}
      </div>

      <RelatorioFooter />
    </div>
  );
}