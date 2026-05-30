import { TENANT_ID } from '../config';
import { dispatchThemeUpdated } from '../lib/tenantTheme';
import { loadTenantBrandingRow } from '../lib/tenantBranding';
import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import ThemePreviewCard from '../components/ui/ThemePreviewCard.jsx';


function ColorField({ label, value, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <label className="block text-sm font-semibold text-slate-700 mb-3">
        {label}
      </label>

      <div
        className="h-20 rounded-xl border border-slate-300 mb-3"
        style={{
          backgroundColor: value,
        }}
      />

      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded-lg border border-slate-300"
        />

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full
            rounded-xl
            border
            border-slate-300
            px-3
            py-2
            text-sm
          "
        />
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [mensagem, setMensagem] = useState('');

  const [form, setForm] = useState({
    nome_sistema: '',
    logo_url: '',

    cor_primaria: '#0F172A',
    cor_secundaria: '#D4A62A',
    cor_fundo: '#F1F5F9',
  });

  useEffect(() => {
    carregarTenant();
  }, []);

  async function carregarTenant() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', TENANT_ID)
        .single();

      if (error) {
        console.error('ERRO AO CARREGAR TENANT:', error);

        return;
      }

      setForm({
        nome_sistema: data.nome_sistema || '',

        logo_url: data.logo_url || '',

        cor_primaria: data.cor_primaria || '#0F172A',

        cor_secundaria: data.cor_secundaria || '#D4A62A',

        cor_fundo: data.cor_fundo || '#F1F5F9',
        cidade_assinatura: data.cidade_assinatura || 'Brasilândia-MS',
        primeiro_dia_semana:  data.primeiro_dia_semana  ?? 0,
        assinante_presidente:  data.assinante_presidente  || '',
        assinante_coordenador: data.assinante_coordenador || '',
        assinante_financeiro:  data.assinante_financeiro  || '',
      });
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('tenants')
        .update({
          nome_sistema: form.nome_sistema,

          logo_url: form.logo_url,

          cor_primaria: form.cor_primaria,

          cor_secundaria: form.cor_secundaria,

          cor_fundo: form.cor_fundo,
          cidade_assinatura: form.cidade_assinatura,
          primeiro_dia_semana:  form.primeiro_dia_semana,
          assinante_presidente:  form.assinante_presidente,
          assinante_coordenador: form.assinante_coordenador,
          assinante_financeiro:  form.assinante_financeiro,
        })
        .eq('id', TENANT_ID);

      if (error) {
        console.error(error);

        setMensagem('Erro ao salvar configurações.');

        return;
      }

      window.dispatchEvent(
        new CustomEvent('tenant-theme-updated', {
          detail: form,
        })
      );

      setMensagem('Configurações salvas com sucesso!');

      setTimeout(() => {
        setMensagem('');
      }, 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-10">Carregando...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Identidade visual — sincronizada automaticamente do Painel Master (logo, cores e nome)"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                setSaving(true);
                try {
                  const row = await loadTenantBrandingRow(TENANT_ID);
                  if (row) {
                    setForm((f) => ({ ...f, ...row }));
                    dispatchThemeUpdated(row);
                    setMensagem('Identidade atualizada do Painel Master.');
                  } else {
                    setMensagem('Não foi possível carregar do Painel Master.');
                  }
                } finally {
                  setSaving(false);
                  setTimeout(() => setMensagem(''), 3000);
                }
              }}
            >
              Sincronizar do Painel
            </Button>
            <Button onClick={salvar}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        }
      />

      {mensagem && (
        <div
          className="
            mb-4
            rounded-2xl
            border
            border-emerald-200
            bg-emerald-50
            px-4
            py-3
            text-sm
            text-emerald-700
          "
        >
          {mensagem}
        </div>
      )}

      <Card>
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nome do sistema
              </label>

              <input
                type="text"
                value={form.nome_sistema}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nome_sistema: e.target.value,
                  })
                }
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-300
                  px-4
                  py-3
                "
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                URL da logo
              </label>

              <input
                type="text"
                value={form.logo_url}
                onChange={(e) =>
                  setForm({
                    ...form,
                    logo_url: e.target.value,
                  })
                }
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-300
                  px-4
                  py-3
                "
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Cores</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ColorField
                label="Cor primária"
                value={form.cor_primaria}
                onChange={(value) =>
                  setForm({
                    ...form,
                    cor_primaria: value,
                  })
                }
              />

              <ColorField
                label="Cor secundária"
                value={form.cor_secundaria}
                onChange={(value) =>
                  setForm({
                    ...form,
                    cor_secundaria: value,
                  })
                }
              />

              <ColorField
                label="Cor de fundo"
                value={form.cor_fundo}
                onChange={(value) =>
                  setForm({
                    ...form,
                    cor_fundo: value,
                  })
                }
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <ThemePreviewCard
          nomeSistema={form.nome_sistema}
          logo={form.logo_url}
          corSidebar={form.cor_primaria}
          corSecundaria={form.cor_secundaria}
          corFundo={form.cor_fundo}
        />
      </div>

      {/* ── Configurações de relatório e calendário ── */}
      <Card className="mt-6">
        <div className="p-6 space-y-5">
          <div>
            <h3 className="font-bold text-slate-800 mb-1">Configurações de relatório e calendário</h3>
            <p className="text-sm text-slate-400">Defina a cidade de assinatura dos relatórios e o primeiro dia da semana no calendário.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Cidade para assinatura dos relatórios
            </label>
            <input
              value={form.cidade_assinatura || ''}
              onChange={e => setForm({ ...form, cidade_assinatura: e.target.value })}
              placeholder="Ex: Brasilândia-MS"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Primeiro dia da semana (calendário e impressão da escala)
            </label>
            <div className="flex gap-3">
              {[{v:0, l:'Dom → Sáb (padrão)'}, {v:1, l:'Seg → Dom'}].map(op => (
                <button
                  key={op.v}
                  type="button"
                  onClick={() => setForm({ ...form, primeiro_dia_semana: op.v })}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    form.primeiro_dia_semana === op.v
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {op.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-700 text-sm mb-3">Assinantes do relatório consolidado</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { field:'assinante_financeiro',  label:'Departamento Financeiro'   },
                { field:'assinante_coordenador', label:'Coordenação Administrativa' },
                { field:'assinante_presidente',  label:'Presidente'                },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{label}</label>
                  <input
                    value={form[field] || ''}
                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                    placeholder={label}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-700"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={salvar} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar configurações'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}