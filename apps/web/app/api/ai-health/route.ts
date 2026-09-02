import { getUserFromRequest } from '@/lib/ai/auth';
import { generateTextWithFallback, MODEL_PRIMARY } from '@/lib/ai/provider';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const envOk = Boolean(apiKey && apiKey.trim().length > 0);
  const configuredModel = process.env.AI_MODEL || MODEL_PRIMARY;

  if (!envOk) {
    return Response.json(
      {
        envOk: false,
        provider: 'openrouter',
        pingOk: false,
        model: configuredModel,
        providerError: 'OPENROUTER_API_KEY não configurada em apps/web/.env.local',
      },
      { status: 500 }
    );
  }

  // Identificação do usuário (opcional para teste de saúde)
  const authContext = await getUserFromRequest(req).catch(() => null);

  console.log(`[AI Health] OpenRouter ready: configuredModel=${configuredModel} key=presente auth=${Boolean(authContext)}`);

  try {
    // Teste de geração mínima com cascata de fallback
    const result = await generateTextWithFallback({
      prompt: 'ping',
      maxTokens: 5,
    });

    return Response.json({
      envOk: true,
      provider: 'openrouter',
      pingOk: true,
      model: result.usedModel,
      authenticated: Boolean(authContext),
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
        authenticated: Boolean(authContext),
        providerError: errMsg,
      },
      { status: 502 }
    );
  }
}
