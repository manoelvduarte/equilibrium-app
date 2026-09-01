import { getUserFromRequest } from '@/lib/ai/auth';
import { executeApprovedToolCore } from '@/lib/ai/executeTool';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const authContext = await getUserFromRequest(req);
  if (!authContext) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { toolCallId, toolName, args } = body;

    const result = await executeApprovedToolCore({
      supabase: authContext.supabase,
      userId: authContext.profile.id,
      householdId: authContext.profile.household_id,
      toolCallId,
      toolName,
      args,
    });

    return Response.json(result);
  } catch (err: any) {
    console.error('Erro na rota /api/tools/execute:', err);
    return Response.json(
      { error: err.message || 'Falha ao executar ferramenta aprovada.' },
      { status: 500 }
    );
  }
}
