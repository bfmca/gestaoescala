// Utilitários compartilhados entre todos os relatórios de impressão

export const RODAPE = {
    email:    'hospitaljuliomaia@gmail.com',
    telefone: '(67) 99823-4605',
    ouvidoria:'(67) 99882-7134',
    endereco: 'R. Hélio Martinez Júnior, nº 1060 - Brasilândia/MS',
    instagram:'@hospital.julio.maia',
  };
  
  export const MESES = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];
  
  export function moeda(v) {
    return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  
  export function fmtData(d) {
    if (!d) return '—';
    return new Date(d+'T12:00:00').toLocaleDateString('pt-BR');
  }
  
  export function calcHoras(ini, fim) {
    if (!ini || !fim) return null;
    const [h1,m1] = ini.split(':').map(Number);
    const [h2,m2] = fim.split(':').map(Number);
    let mins = (h2*60+m2)-(h1*60+m1);
    if (mins<=0) mins+=1440;
    return Math.floor(mins/60);
  }
  
  export function horarioStr(ini, fim) {
    if (!ini || !fim) return '—';
    const h = calcHoras(ini, fim);
    return `${ini} às ${fim}${h ? ` (${h}h)` : ''}`;
  }
  
  export function periodoLabel(mes, ano) {
    return `${MESES[Number(mes)]}/${ano}`;
  }
  
  export const PRINT_CSS = `
    @media print {
      @page { size: A4 portrait; margin: 10mm 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; }
    body { margin:0; padding:0; font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }
  `;
  
  export function RelatorioHeader({ titulo, subtitulo, logoUrl='/logo.jpg' }) {
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:10 }}>
          <img src={logoUrl} alt="Logo" style={{ height:60, maxWidth:180, objectFit:'contain' }} />
        </div>
        <div style={{ borderTop:'2px solid #1a237e', borderBottom:'1px solid #ddd', padding:'8px 0', textAlign:'center' }}>
          <div style={{ fontSize:14, fontWeight:'bold', color:'#1a237e' }}>{titulo}</div>
          {subtitulo && <div style={{ fontSize:11, color:'#555', marginTop:3 }}>{subtitulo}</div>}
        </div>
      </div>
    );
  }
  
  export function RelatorioFooter() {
    return (
      <div style={{
        marginTop:20, borderTop:'1px solid #CBD5E1', paddingTop:8,
        display:'flex', flexWrap:'wrap', justifyContent:'space-between',
        gap:8, fontSize:9.5, color:'#555',
      }}>
        <span>✉ {RODAPE.email}</span>
        <span>📞 {RODAPE.telefone} | Ouvidoria: {RODAPE.ouvidoria}</span>
        <span>📍 {RODAPE.endereco}</span>
        <span>📷 {RODAPE.instagram}</span>
      </div>
    );
  }
  
  export function SecaoTitulo({ nome, cor='#1a237e' }) {
    return (
      <div style={{
        background: cor, color:'#fff', fontWeight:'bold',
        fontSize:11, padding:'5px 10px', textAlign:'center',
        marginTop:14, marginBottom:6, textTransform:'uppercase',
        letterSpacing:0.5,
      }}>
        {nome}
      </div>
    );
  }
  
  export function TabelaHeader({ cols }) {
    return (
      <thead>
        <tr>
          {cols.map((c,i)=>(
            <th key={i} style={{
              borderBottom:'2px solid #1a237e', padding:'5px 6px',
              textAlign: c.right ? 'right' : 'left', fontSize:11,
              fontWeight:'bold', color:'#1a237e', whiteSpace:'nowrap',
              width: c.w || 'auto',
            }}>{c.label}</th>
          ))}
        </tr>
      </thead>
    );
  }
  
  export function SubtotalRow({ label, qtd, valor, corTexto='#1a237e' }) {
    return (
      <tr style={{ background:'#f5f5f5', fontWeight:'bold' }}>
        <td colSpan={2} style={{ padding:'4px 6px', fontSize:11, color:corTexto }}>
          Total de Plantões
        </td>
        <td style={{ padding:'4px 6px', fontSize:11, textAlign:'center', color:corTexto }}>{qtd}</td>
        <td style={{ padding:'4px 6px', fontSize:11 }}></td>
        <td style={{ padding:'4px 6px', fontSize:11, textAlign:'right', fontWeight:'bold', color:corTexto }}>
          {moeda(valor)}
        </td>
      </tr>
    );
  }