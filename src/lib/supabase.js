import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rmefezikoxbawtvmvujj.supabase.co';

const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZWZlemlrb3hiYXd0dm12dWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDA5MjUsImV4cCI6MjA5NDM3NjkyNX0.aQjn8Vo6oRwBJsDo_Zv53THQrYTswlUR8FaRhVTG7J4';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'appescala',
  },

  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
