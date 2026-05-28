// Relatório 1 — Serviços Prestados (contrato fixo)
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';
import {
  moeda, fmtData, periodoLabel, PRINT_CSS,
  RelatorioHeader, RelatorioFooter, MESES,
} from '../lib/relatorioUtils.jsx';

export default function ImpressaoRelatorioServicos() {
  const p       = new URLSearchParams(window.location.search);
  const prestId = p.get('prestador_id');
  const mes     = parseInt(p.get('mes'));
  const ano     = parseInt(p.get('ano'));
  const dataAssinatura = p.get('data_assinatura') || '';

  const [prestador, setPrestador] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    if (!loading && prestador) setTimeout(() => window.print(), 700);
  }, [loading, prestador]);

  async function carregar() {
    const { data } = await supabase
      .from('prestadores')
      .select('*')
      .eq('id', prestId)
      .single();
    setPrestador(data);
    setLoading(false);
  }

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Arial' }}>
      Preparando relatório...
    </div>
  );

  if (!prestador) return (
    <div style={{ padding:40, fontFamily:'Arial' }}>Prestador não encontrado.</div>
  );

  const periodo = `${mes+1}.${MESES[mes]}/${ano}`;
  const dataLocal = dataAssinatura || `Brasilândia-MS, ${new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}`;

  return (
    <div style={{ maxWidth:760, margin:'0 auto', padding:'20px 24px', background:'#fff' }}>
      <style>{PRINT_CSS}</style>

      <RelatorioHeader titulo="RELATÓRIO DE SERVIÇOS PRESTADOS" />

      {/* Dados do prestador */}
      <div style={{ marginBottom:18, fontSize:12 }}>
        <div><strong>Razão Social:</strong> {prestador.empresa || prestador.nome}</div>
        {prestador.endereco && <div><strong>Endereço:</strong> {prestador.endereco}</div>}
        {prestador.cnpj     && <div><strong>CNPJ:</strong> {prestador.cnpj}</div>}
      </div>

      {/* Tabela de serviços */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:24 }}>
        <thead>
          <tr style={{ borderTop:'2px solid #1a237e', borderBottom:'1px solid #1a237e' }}>
            <th style={{ padding:'7px 8px', textAlign:'left', fontSize:11, fontWeight:'bold', width:'20%' }}>Mês/Ano</th>
            <th style={{ padding:'7px 8px', textAlign:'left', fontSize:11, fontWeight:'bold' }}>Discriminação dos serviços</th>
            <th style={{ padding:'7px 8px', textAlign:'right', fontSize:11, fontWeight:'bold', width:'20%' }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom:'1px solid #eee' }}>
            <td style={{ padding:'8px 8px', fontSize:11, verticalAlign:'top' }}>{periodo}</td>
            <td style={{ padding:'8px 8px', fontSize:11 }}>
              {prestador.descricao_contrato || 'Serviços prestados conforme contrato'}
            </td>
            <td style={{ padding:'8px 8px', fontSize:11, textAlign:'right' }}>
              {moeda(prestador.valor_contrato)}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr style={{ borderTop:'2px solid #1a237e' }}>
            <td colSpan={2} style={{ padding:'7px 8px', textAlign:'right', fontSize:11, fontWeight:'bold' }}>
              Valor total
            </td>
            <td style={{ padding:'7px 8px', textAlign:'right', fontSize:12, fontWeight:'bold' }}>
              {moeda(prestador.valor_contrato)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Data e assinaturas */}
      <div style={{ textAlign:'right', fontSize:11, marginBottom:60 }}>
        {dataLocal}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
        <div style={{ textAlign:'center', width:'40%' }}>
          <div style={{ borderTop:'1px solid #333', paddingTop:6, fontSize:11 }}>
            Representante do Hospital
          </div>
        </div>
        <div style={{ textAlign:'center', width:'45%' }}>
          <div style={{ borderTop:'1px solid #333', paddingTop:6, fontSize:11 }}>
            <strong>{prestador.empresa || prestador.nome}</strong>
            {prestador.cnpj && <><br/>CNPJ: {prestador.cnpj}</>}
          </div>
        </div>
      </div>

      <RelatorioFooter />
    </div>
  );
}