import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config';
import { useAuth } from '../contexts/AuthContext.jsx';

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ label, value, color = 'text-slate-900', sub }) {
  return (
    <Card>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-sm font-semibold text-slate-500 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </Card>
  );
}

export default function Dashboard() {
  const { usuario, perfil } = useAuth();

  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0, 7);
  const inicioMes = mesAtual + '-01';
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [plantoes,      setPlantoes]      = useState({ abertos:0, escalados:0, conferidos:0, hoje:0 });
  const [transferencias, setTransferencias] = useState({ total:0, solicitadas:0, realizadas:0, conferidas:0 });
  const [porDestino,    setPorDestino]    = useState([]);
  const [porMedico,     setPorMedico]     = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    try {
      const [rPlantoes, rTransf] = await Promise.all([
        supabase.from('plantoes').select('status,data').eq('tenant_id', TENANT_ID).eq('ativo', true)
          .gte('data', inicioMes).lte('data', ultimoDia),
        supabase.from('transferencias')
          .select('status,cidade_destino_id,prestador_id,destino:cidade_destino_id(nome),medico:prestador_id(nome)')
          .eq('tenant_id', TENANT_ID).gte('data', inicioMes).lte('data', ultimoDia),
      ]);

      if (rPlantoes.data) {
        const d = rPlantoes.data;
        const hj = hoje.toISOString().slice(0, 10);
        setPlantoes({
          abertos:   d.filter(p => p.status === 'ABERTO').length,
          escalados: d.filter(p => p.status === 'ESCALADO').length,
          conferidos:d.filter(p => p.status === 'CONFERIDO').length,
          hoje:      d.filter(p => p.data === hj).length,
        });
      }

      if (rTransf.data) {
        const d = rTransf.data;
        setTransferencias({
          total:       d.length,
          solicitadas: d.filter(t => t.status === 'SOLICITADO').length,
          realizadas:  d.filter(t => t.status === 'REALIZADO').length,
          conferidas:  d.filter(t => t.status === 'CONFERIDO').length,
        });

        // Agrupa por destino
        const destMap = {};
        d.forEach(t => {
          const nome = t.destino?.nome || 'Não informado';
          destMap[nome] = (destMap[nome] || 0) + 1;
        });
        setPorDestino(
          Object.entries(destMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
        );

        // Agrupa por médico
        const medMap = {};
        d.forEach(t => {
          const nome = t.medico?.nome || 'Não informado';
          medMap[nome] = (medMap[nome] || 0) + 1;
        });
        setPorMedico(
          Object.entries(medMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const mesLabel = hoje.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">
          Olá, {usuario?.nome?.split(' ')[0] || 'Usuário'} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-0.5 capitalize">{mesLabel}</p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Carregando indicadores...</div>
      ) : (
        <>
          {/* Plantões */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Plantões do mês</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Abertos"    value={plantoes.abertos}    color="text-rose-600" />
              <StatCard label="Escalados"  value={plantoes.escalados}  color="text-sky-600"  />
              <StatCard label="Conferidos" value={plantoes.conferidos} color="text-emerald-600" />
              <StatCard label="Plantões hoje" value={plantoes.hoje}    color="text-violet-600" />
            </div>
          </div>

          {/* Transferências */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Transferências do mês</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total"       value={transferencias.total}       color="text-slate-900" />
              <StatCard label="Solicitadas" value={transferencias.solicitadas} color="text-blue-600"   />
              <StatCard label="Realizadas"  value={transferencias.realizadas}  color="text-emerald-600" />
              <StatCard label="Conferidas"  value={transferencias.conferidas}  color="text-violet-600"  />
            </div>
          </div>

          {/* Por destino e por médico */}
          {(porDestino.length > 0 || porMedico.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {porDestino.length > 0 && (
                <Card>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
                    Transferências por destino
                  </div>
                  <div className="space-y-3">
                    {porDestino.map(([nome, qtd]) => {
                      const pct = transferencias.total > 0 ? Math.round((qtd / transferencias.total) * 100) : 0;
                      return (
                        <div key={nome}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700 truncate max-w-[70%]">{nome}</span>
                            <span className="text-slate-500">{qtd} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-700 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {porMedico.length > 0 && (
                <Card>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
                    Transferências por médico
                  </div>
                  <div className="space-y-3">
                    {porMedico.map(([nome, qtd]) => {
                      const pct = transferencias.total > 0 ? Math.round((qtd / transferencias.total) * 100) : 0;
                      return (
                        <div key={nome}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700 truncate max-w-[70%]">{nome}</span>
                            <span className="text-slate-500">{qtd} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}