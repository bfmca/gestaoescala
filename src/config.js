// ── Configuração central do sistema ─────────────────────────
// NUNCA coloque credenciais aqui — use variáveis de ambiente (.env)

export const config = {
  env: __APP_ENV__,

  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY,
    schema: import.meta.env.VITE_SUPABASE_SCHEMA || 'appescala',
  },

  // Tenant fixo — pode ser movido para .env se o sistema for multi-tenant
  tenantId: import.meta.env.VITE_TENANT_ID || '7190dac7-342c-408f-81df-890c194ccfad',
};

export const TENANT_ID = config.tenantId;

if (!config.supabase.url || !config.supabase.key) {
  throw new Error('[config] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios. Verifique seu arquivo .env');
}
