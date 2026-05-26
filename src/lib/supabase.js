// ── Cliente Supabase oficial ─────────────────────────────────
// Credenciais APENAS via variáveis de ambiente — nunca hardcode aqui.

import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const supabase = createClient(config.supabase.url, config.supabase.key, {
  db: {
    schema: config.supabase.schema,
  },
  auth: {
    persistSession: true,       // Mantém sessão após refresh de página
    autoRefreshToken: true,     // Renova token automaticamente antes de expirar
    detectSessionInUrl: false,
    storageKey: 'gestaoescala-auth',
  },
});
