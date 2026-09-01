import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { getUserFromRequest } from '@/lib/ai/auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: Request) {
  // 1. Guard de Autenticação Híbrida (Cookie Web ou Bearer Mobile)
  const authContext = await getUserFromRequest(req);
  if (!authContext) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const envOk = Boolean(apiKey && apiKey.trim().length > 0);

  if (!envOk) {
    return Response.json(
      {
        envOk: false,
        pingOk: false,
        model: process.env.AI_MODEL || 'gemini-2.5-flash',
        providerError: 'GOOGLE_GENERATIVE_AI_API_KEY não encontrada em apps/web/.env.local',
      },
      { status: 500 }
    );
  }

  let modelName = process.env.AI_MODEL || 'gemini-2.5-flash';
  console.log(`[AI Health] AI ready: model=${modelName} key=presente`);

  try {
    // 2. Teste de geração mínima (Ping)
    const { text } = await generateText({
      model: google(modelName),
      prompt: 'ping',
      maxTokens: 5,
    });

    return Response.json({
      envOk: true,
      pingOk: true,
      model: modelName,
      response: text.trim(),
      providerError: null,
    });
  } catch (primaryErr: any) {
    const primaryErrMsg = primaryErr?.message || String(primaryErr);
    console.warn(`[AI Health] Falha no modelo principal ${modelName}:`, primaryErrMsg);

    // 3. Fallback para gemini-2.0-flash se for erro de modelo (404/not found)
    if (
      modelName !== 'gemini-2.0-flash' &&
      (primaryErrMsg.includes('404') ||
        primaryErrMsg.toLowerCase().includes('not found') ||
        primaryErrMsg.toLowerCase().includes('unsupported'))
    ) {
      try {
        console.log('[AI Health] Tentando fallback para gemini-2.0-flash...');
        const { text: fallbackText } = await generateText({
          model: google('gemini-2.0-flash'),
          prompt: 'ping',
          maxTokens: 5,
        });

        return Response.json({
          envOk: true,
          pingOk: true,
          model: 'gemini-2.0-flash (fallback)',
          response: fallbackText.trim(),
          providerError: null,
        });
      } catch (fallbackErr: any) {
        return Response.json(
          {
            envOk: true,
            pingOk: false,
            model: 'gemini-2.0-flash',
            providerError: fallbackErr?.message || String(fallbackErr),
          },
          { status: 502 }
        );
      }
    }

    return Response.json(
      {
        envOk: true,
        pingOk: false,
        model: modelName,
        providerError: primaryErrMsg,
      },
      { status: 502 }
    );
  }
}
