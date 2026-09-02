import { getUserFromRequest } from '@/lib/ai/auth';
import { generateTextWithFallback, MODEL_PRIMARY } from '@/lib/ai/provider';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: Request) {
  // 1. Guard de Autenticação Híbrida (Cookie Web ou Bearer Mobile)
  const authContext = await getUserFromRequest(req);
  if (!authContext) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const envOk = Boolean(apiKey && apiKey.trim().length > 0);

  if (!envOk) {
    return Response.json(
      {
        envOk: false,
        provider: 'openrouter',
        pingOk: false,
        model: process.env.AI_MODEL || MODEL_PRIMARY,
        providerError: 'OPENROUTER_API_KEY não encontrada em apps/web/.env.local',
      },
      { status: 500 }
    );
  }

  const configuredModel = process.env.AI_MODEL || MODEL_PRIMARY;
  console.log(`[AI Health] OpenRouter ready: configuredModel=${configuredModel} key=presente`);

  try {
    // 2. Teste de geração mínima com cascata de fallback
    const result = await generateTextWithFallback({
      prompt: 'ping',
      maxTokens: 5,
    });

    return Response.json({
      envOk: true,
      provider: 'openrouter',
      pingOk: true,
      model: result.usedModel,
      response: result.text.trim(),
      providerError: null,
    });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn('[AI Health] Falha no teste OpenRouter:', errMsg);

    return Response.json(
      {
        envOk: true,
        provider: 'openrouter',
        pingOk: false,
        model: configuredModel,
        providerError: errMsg,
      },
      { status: 502 }
    );
  }
}
