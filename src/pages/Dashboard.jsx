import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Dashboard() {
  const { usuario, perfil } = useAuth();
  const [stats, setStats] = useState({ abertos: 0, escalados: 0, conferidos: 0, hoje: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregarStats(); }, []);

  async function carregarStats() {
    try {
      const { data } = await supabase
        .from('plantoes')
        .select('status, data')
        .eq('tenant_id', TENANT_ID)
        .eq('ativo', true);

      if (data) {
        const hoje = new Date().toISOString().slice(0, 10);
        setStats({
          abertos:    data.filter(p => p.status === 'ABERTO').length,
          escalados:  data.filter(p => p.status === 'ESCALADO').length,
          conferidos: data.filter(p => p.status === 'CONFERIDO').length,
          hoje:       data.filter(p => p.data === hoje).length,
        });
      }
    } catch (e) {
      console.error('[Dashboard]', e);
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    { label: 'Abertos', value: stats.abertos,    color: 'bg-rose-50  border-rose-200  text-rose-700'     },
    { label: 'Escalados', value: stats.escalados, color: 'bg-sky-50   border-sky-200   text-sky-700'      },
    { label: 'Conferidos', value: stats.conferidos, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { label: 'Plantões hoje', value: stats.hoje,  color: 'bg-violet-50 border-violet-200 text-violet-700' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Olá, {usuario?.nome?.split(' ')[0] || 'Usuário'} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Perfil: {perfil} · Visão geral dos plantões</p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Carregando...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(c => (
            <div key={c.label} className={`rounded-2xl border p-5 ${c.color}`}>
              <div className="text-3xl font-extrabold">{c.value}</div>
              <div className="text-sm font-semibold mt-1 opacity-80">{c.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
