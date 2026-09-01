import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ueraistkgvdvxgsiwwhh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcmFpc3RrZ3Zkdnhnc2l3d2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODYyMDYsImV4cCI6MjEwMzg2MjIwNn0.21zyOqz6tIrwDkqVOhNbQuDWPl5D9M_BfFp3_va52MM';

export interface AuthenticatedUserContext {
  user: { id: string; email?: string };
  profile: { id: string; full_name: string; household_id: string };
  supabase: SupabaseClient;
}

/**
 * Autentica uma requisição HTTP suportando tanto header "Authorization: Bearer <token>" (Mobile)
 * quanto cookies de sessão (@supabase/ssr para Web).
 */
export async function getUserFromRequest(req: Request): Promise<AuthenticatedUserContext | null> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');

  // 1. Bearer Token (Mobile React Native)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, household_id')
        .eq('id', user.id)
        .single();

      if (!profile?.household_id) return null;

      return {
        user: { id: user.id, email: user.email },
        profile,
        supabase,
      };
    }
  }

  // 2. Cookies de Sessão Web (@supabase/ssr)
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, household_id')
      .eq('id', user.id)
      .single();

    if (!profile?.household_id) return null;

    return {
      user: { id: user.id, email: user.email },
      profile,
      supabase,
    };
  } catch (err) {
    console.error('Erro na autenticação por cookies:', err);
    return null;
  }
}
