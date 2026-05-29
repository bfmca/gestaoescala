// PrestadorInput — campo de busca de prestador com filtro por digitação
// Reutilizável em qualquer tela que precise selecionar prestador

import { useRef, useState } from 'react';
import { Search } from 'lucide-react';

const iSx = {
  width:'100%', boxSizing:'border-box', fontSize:13,
  padding:'9px 12px', border:'1.5px solid #CBD5E1',
  borderRadius:10, background:'#fff', fontFamily:'inherit', outline:'none',
};

export default function PrestadorInput({
  value,           // prestador_id selecionado
  onChange,        // (id) => void
  prestadores = [],
  label,
  placeholder = 'Digite para filtrar...',
  required = false,
}) {
  const [busca,   setBusca]   = useState('');
  const [aberto,  setAberto]  = useState(false);
  const ref = useRef(null);

  const nomeAtual = prestadores.find(p => p.id === value)?.nome || '';
  const display   = aberto ? busca : (value ? nomeAtual : '');

  const filtrados = busca
    ? prestadores.filter(p =>
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.empresa||'').toLowerCase().includes(busca.toLowerCase())
      )
    : prestadores;

  function selecionar(p) {
    onChange(p.id);
    setBusca('');
    setAberto(false);
  }

  function limpar() {
    onChange('');
    setBusca('');
    setAberto(false);
  }

  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      {label && (
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
          {label}{required && ' *'}
        </label>
      )}

      <div style={{ position:'relative' }}>
        <input
          style={iSx}
          value={display}
          placeholder={value ? nomeAtual : placeholder}
          onChange={e => { setBusca(e.target.value); setAberto(true); if (!e.target.value) limpar(); }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 180)}
          autoComplete="off"
        />
        <Search size={13} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
      </div>

      {aberto && filtrados.length > 0 && (
        <div style={{
          position:'absolute', zIndex:200, top:'100%', left:0, right:0,
          background:'#fff', border:'1.5px solid #CBD5E1', borderTop:'none',
          borderRadius:'0 0 10px 10px', maxHeight:200, overflowY:'auto',
          boxShadow:'0 6px 16px rgba(0,0,0,.12)',
        }}>
          {filtrados.map(p => (
            <div
              key={p.id}
              onMouseDown={() => selecionar(p)}
              style={{
                padding:'8px 12px', fontSize:13, cursor:'pointer',
                borderBottom:'1px solid #f1f5f9',
                background: p.id === value ? '#f8fafc' : '#fff',
              }}
              onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = p.id===value?'#f8fafc':'#fff'}
            >
              <span style={{ fontWeight: p.id===value ? 700 : 400 }}>{p.nome}</span>
              {p.empresa && <span style={{ fontSize:11, color:'#94a3b8', marginLeft:6 }}>{p.empresa}</span>}
            </div>
          ))}
        </div>
      )}

      {aberto && busca && filtrados.length === 0 && (
        <div style={{
          position:'absolute', zIndex:200, top:'100%', left:0, right:0,
          background:'#fff', border:'1.5px solid #CBD5E1', borderTop:'none',
          borderRadius:'0 0 10px 10px', padding:'10px 12px',
          fontSize:12, color:'#94a3b8',
        }}>
          Nenhum prestador encontrado
        </div>
      )}
    </div>
  );
}