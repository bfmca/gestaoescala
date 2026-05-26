export const config = {
  env: __APP_ENV__,

  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY,
    schema: import.meta.env.VITE_SUPABASE_SCHEMA || 'appescala',
  },

  tenantId: '7190dac7-342c-408f-81df-890c194ccfad',
};

if (!config.supabase.url || !config.supabase.key) {
  throw new Error('Variáveis Supabase não configuradas.');
}
