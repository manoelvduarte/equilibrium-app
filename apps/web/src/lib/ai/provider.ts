import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';

export const MODEL_PRIMARY = 'nvidia/nemotron-3.5-lightning:free';
export const MODEL_FALLBACK_1 = 'nvidia/nemotron-3-super-120b-a12b:free';
export const MODEL_FALLBACK_2 = 'openrouter/free';
export const MODEL_FALLBACK_3 = 'dots-studio/dots-3-note-preview:free';

export const MODEL_FALLBACKS = [
  MODEL_FALLBACK_1,
  MODEL_FALLBACK_2,
  MODEL_FALLBACK_3,
];

/**
 * Cria a instância do provider OpenAI configurada para o OpenRouter.
 */
export function getOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY não configurada em apps/web/.env.local');
  }

  return createOpenAI({
    baseURL,
    apiKey,
    headers: {
      'HTTP-Referer': 'https://equilibrium.app',
      'X-Title': 'Equilibrium - Finanças de Casal',
    },
  });
}

/**
 * Retorna o modelo de chat pronto para uso no Vercel AI SDK.
 */
export function getChatModel(modelOverride?: string) {
  const openrouter = getOpenRouterProvider();
  const modelId = modelOverride || process.env.AI_MODEL || MODEL_PRIMARY;
  return openrouter(modelId);
}

/**
 * Executa streamText com cascata de fallback automática para modelos gratuitos da OpenRouter.
 */
export async function streamTextWithFallback(
  params: Omit<Parameters<typeof streamText>[0], 'model'> & { model?: any }
): Promise<ReturnType<typeof streamText>> {
  const configuredModel = process.env.AI_MODEL || MODEL_PRIMARY;
  const modelsToTry = [
    configuredModel,
    ...MODEL_FALLBACKS.filter((m) => m !== configuredModel),
  ];

  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModelId = modelsToTry[i];
    try {
      console.log(`[AI Provider] Iniciando stream com model="${currentModelId}" (tentativa ${i + 1}/${modelsToTry.length})...`);
      const modelInstance = getChatModel(currentModelId);
      const result = streamText({
        ...params,
        model: modelInstance,
      });

      return result;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[AI Provider] Falha com model="${currentModelId}":`, errMsg);

      const isRecoverableError =
        errMsg.includes('404') ||
        errMsg.toLowerCase().includes('not found') ||
        errMsg.includes('429') ||
        errMsg.toLowerCase().includes('rate limit') ||
        errMsg.toLowerCase().includes('unsupported') ||
        errMsg.toLowerCase().includes('provider returned error') ||
        errMsg.toLowerCase().includes('invalid');

      if (!isRecoverableError && i === 0) {
        // Erro fatal não recuperável (ex: auth 401)
        throw err;
      }
    }
  }

  throw lastError || new Error('Todos os modelos de fallback da OpenRouter falharam.');
}

/**
 * Executa generateText com cascata de fallback automática para modelos gratuitos da OpenRouter.
 */
export async function generateTextWithFallback(
  params: Omit<Parameters<typeof generateText>[0], 'model'> & { model?: any }
): Promise<Awaited<ReturnType<typeof generateText>> & { usedModel: string }> {
  const configuredModel = process.env.AI_MODEL || MODEL_PRIMARY;
  const modelsToTry = [
    configuredModel,
    ...MODEL_FALLBACKS.filter((m) => m !== configuredModel),
  ];

  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModelId = modelsToTry[i];
    try {
      console.log(`[AI Provider] Testando generateText com model="${currentModelId}"...`);
      const modelInstance = getChatModel(currentModelId);
      const result = await generateText({
        ...params,
        model: modelInstance,
      });

      return { ...result, usedModel: currentModelId };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[AI Provider] Falha com model="${currentModelId}":`, errMsg);

      const isRecoverable =
        errMsg.includes('404') ||
        errMsg.toLowerCase().includes('not found') ||
        errMsg.includes('429') ||
        errMsg.toLowerCase().includes('rate limit') ||
        errMsg.toLowerCase().includes('unsupported') ||
        errMsg.toLowerCase().includes('provider returned error') ||
        errMsg.toLowerCase().includes('invalid');

      if (!isRecoverable && i === 0) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Todos os modelos de fallback da OpenRouter falharam.');
}
