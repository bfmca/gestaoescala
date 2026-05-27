// SelectWithAdd — select com botão + para adicionar novo item inline
// Uso:
//   <SelectWithAdd
//     label="Categoria"
//     value={form.categoria_id}
//     onChange={id => setForm({...form, categoria_id: id})}
//     options={categorias}          // [{id, nome}]
//     onAdd={async (nome) => data}  // retorna o novo item {id, nome}
//     placeholder="Selecione..."
//     required
//   />

import { useRef, useState } from 'react';
import { Plus, X, Check, Loader2 } from 'lucide-react';

const iSx = {
  flex: 1, fontSize: 13, padding: '9px 12px',
  border: '1.5px solid #CBD5E1', borderRadius: '10px 0 0 10px',
  background: '#fff', fontFamily: 'inherit', outline: 'none',
  minWidth: 0,
};

export default function SelectWithAdd({
  label, value, onChange, options = [], onAdd,
  placeholder = 'Selecione...', required = false, disabled = false,
}) {
  const [showModal, setShowModal] = useState(false);
  const [novoNome,  setNovoNome]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const inputRef = useRef(null);

  async function handleAdd() {
    if (!novoNome.trim()) { setError('Informe o nome.'); return; }
    setSaving(true);
    setError('');
    try {
      const novo = await onAdd(novoNome.trim());
      if (novo?.id) {
        onChange(novo.id);
        setNovoNome('');
        setShowModal(false);
      }
    } catch (e) {
      setError(e.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
          {label}{required && ' *'}
        </label>
      )}

      <div className="flex">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={iSx}
        >
          <option value="">{placeholder}</option>
          {options.map(o => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => { setShowModal(true); setNovoNome(''); setError(''); setTimeout(() => inputRef.current?.focus(), 50); }}
          title={`Adicionar novo ${label?.toLowerCase() || 'item'}`}
          style={{
            padding: '9px 11px',
            border: '1.5px solid #CBD5E1', borderLeft: 'none',
            borderRadius: '0 10px 10px 0',
            background: '#F8FAFC', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
        >
          <Plus size={15} color="#475569" />
        </button>
      </div>

      {/* Mini modal inline */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-sm">
                Novo{label ? ` ${label.toLowerCase()}` : ' item'}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={15} />
              </button>
            </div>

            {error && (
              <div className="text-rose-600 text-xs font-semibold bg-rose-50 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <input
              ref={inputRef}
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder={`Nome ${label ? `do ${label.toLowerCase()}` : ''}`}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-700"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !novoNome.trim()}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50 hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                {saving
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Check size={14} />
                }
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}