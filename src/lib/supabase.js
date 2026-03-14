import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL ou Anon Key não configurados no .env');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from: () => ({ select: () => Promise.resolve({ data: null, error: 'Supabase not configured' }) }),
      auth: { 
          getSession: () => Promise.resolve({ data: { session: null } }), 
          signInAnonymously: () => Promise.resolve({ data: null, error: 'Supabase not configured' }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), // Mock para onAuthStateChange
          signInWithPassword: () => Promise.resolve({ data: null, error: 'Supabase not configured' }),
          signUp: () => Promise.resolve({ data: null, error: 'Supabase not configured' }),
          resetPasswordForEmail: () => Promise.resolve({ data: null, error: 'Supabase not configured' })
      }
    };

/**
 * Helper para verificar conexão e buscar dados iniciais
 */
export const checkSupabaseConnection = async () => {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseAnonKey },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('Supabase conectado com sucesso!');
    return true;
  } catch (err) {
    console.error('Erro ao conectar Supabase:', err instanceof Error ? err.message : String(err));
    return false;
  }
};
