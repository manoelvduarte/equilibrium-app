import { getUserFromRequest } from '@/lib/ai/auth';
import { rejectToolCallCore } from '@/lib/ai/executeTool';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const authContext = await getUserFromRequest(req);
  if (!authContext) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { toolCallId, toolName, args } = body;

    const result = await rejectToolCallCore({
      supabase: authContext.supabase,
      userId: authContext.profile.id,
      householdId: authContext.profile.household_id,
      toolCallId,
      toolName,
      args,
    });

    return Response.json(result);
  } catch (err: any) {
    console.error('Erro na rota /api/tools/reject:', err);
    return Response.json(
      { error: err.message || 'Falha ao rejeitar ferramenta.' },
      { status: 500 }
    );
  }
}
