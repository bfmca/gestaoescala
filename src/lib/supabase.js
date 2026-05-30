import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const supabase = createClient(config.supabase.url, config.supabase.key, {
  db: {
    schema: config.supabase.schema,
  },
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,   // necessário para capturar token de reset de senha
    storageKey:         'gestaoescala-auth',
  },
});

/** Branding cadastrado no Painel Master (schema public) */
export const supabasePublic = createClient(config.supabase.url, config.supabase.key, {
  db: { schema: 'public' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'gestaoescala-auth',
  },
});