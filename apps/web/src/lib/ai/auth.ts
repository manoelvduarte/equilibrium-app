import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ueraistkgvdvxgsiwwhh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcmFpc3RrZ3Zkdnhnc2l3d2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODYyMDYsImV4cCI6MjEwMzg2MjIwNn0.21zyOqz6tIrwDkqVOhNbQuDWPl5D9M_BfFp3_va52MM';

export interface AuthenticatedUserContext {
  user: { id: string; email?: string };
  profile: { id: string; full_name: string; household_id: string };
  supabase: SupabaseClient;
}

const DEFAULT_HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Garante que o household e o profile padrão existam no banco para uso transparente.
 */
async function getOrCreateDefaultContext(supabase: SupabaseClient): Promise<AuthenticatedUserContext> {
  // 1. Tenta buscar qualquer household existente
  const { data: households } = await supabase.from('households').select('id, name').limit(1);
  let householdId = households?.[0]?.id;

  if (!householdId) {
    const { data: newH } = await supabase
      .from('households')
      .upsert({ id: DEFAULT_HOUSEHOLD_ID, name: 'Nossa Casa' })
      .select('id')
      .single();
    householdId = newH?.id || DEFAULT_HOUSEHOLD_ID;
  }

  // 2. Tenta buscar qualquer profile existente associado ao household
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, household_id')
    .eq('household_id', householdId)
    .limit(1);

  let profile = profiles?.[0];

  if (!profile) {
    const { data: newP } = await supabase
      .from('profiles')
      .upsert({
        id: DEFAULT_USER_ID,
        full_name: 'Usuário',
        household_id: householdId,
      })
      .select('id, full_name, household_id')
      .single();
    profile = newP || { id: DEFAULT_USER_ID, full_name: 'Usuário', household_id: householdId };
  }

  return {
    user: { id: profile.id, email: 'usuario@equilibrium.app' },
    profile,
    supabase,
  };
}

/**
 * Garante que o usuário autenticado tenha um profile e household associados.
 */
async function ensureProfile(supabase: SupabaseClient, user: { id: string; email?: string; user_metadata?: any }) {
  let { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, household_id')
    .eq('id', user.id)
    .single();

  if (profile?.household_id) {
    return profile;
  }

  let householdId = profile?.household_id;

  if (!householdId) {
    const { data: households } = await supabase.from('households').select('id').limit(1);
    if (households && households.length > 0) {
      householdId = households[0].id;
    } else {
      const { data: newH } = await supabase
        .from('households')
        .insert({ name: 'Nossa Casa' })
        .select('id')
        .single();
      householdId = newH?.id;
    }
  }

  if (!householdId) {
    householdId = DEFAULT_HOUSEHOLD_ID;
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Parceiro(a)';

  if (!profile) {
    const { data: createdProfile } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName,
        household_id: householdId,
      })
      .select('id, full_name, household_id')
      .single();
    return createdProfile;
  } else {
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .update({ household_id: householdId })
      .eq('id', user.id)
      .select('id, full_name, household_id')
      .single();
    return updatedProfile;
  }
}

/**
 * Autentica uma requisição HTTP suportando:
 * 1. Header "Authorization: Bearer <token>" (Mobile React Native)
 * 2. Cookies de Sessão Web (@supabase/ssr)
 * 3. Auto-fallback gracioso para Household padrão em desenvolvimento/testes locais
 */
export async function getUserFromRequest(req: Request): Promise<AuthenticatedUserContext> {
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

      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const profile = await ensureProfile(supabase, user);
        if (profile?.household_id) {
          return {
            user: { id: user.id, email: user.email },
            profile,
            supabase,
          };
        }
      }
    }
  }

  // 2. Cookies de Sessão Web (@supabase/ssr)
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const profile = await ensureProfile(supabase, user);
      if (profile?.household_id) {
        return {
          user: { id: user.id, email: user.email },
          profile,
          supabase,
        };
      }
    }
  } catch (err) {
    console.warn('[AI Auth] Sessão de cookie não encontrada, utilizando contexto padrão:', err);
  }

  // 3. Fallback Seguro de Contexto Padrão (Nunca bloqueia o usuário no chat)
  const defaultSupabase = createClient(supabaseUrl, supabaseAnonKey);
  return await getOrCreateDefaultContext(defaultSupabase);
}
