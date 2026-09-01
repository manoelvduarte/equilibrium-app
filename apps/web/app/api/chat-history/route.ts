import { getUserFromRequest } from '@/lib/ai/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const authContext = await getUserFromRequest(req);
  if (!authContext) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data: messages } = await authContext.supabase
    .from('ai_messages')
    .select('id, role, content, tool_calls, created_at')
    .eq('household_id', authContext.profile.household_id)
    .order('created_at', { ascending: true })
    .limit(50);

  const formatted = (messages || []).map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content || '',
    toolInvocations: m.tool_calls || undefined,
    createdAt: m.created_at,
  }));

  return Response.json(formatted);
}
