import { generateText } from 'ai';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/ai/auth';
import { getOpenRouterProvider } from '@/lib/ai/provider';

export const runtime = 'nodejs';
export const maxDuration = 60;

const OCR_MODELS_CASCADE = [
  process.env.OCR_MODEL || 'minimax/minimax-m3:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'dots-studio/dots-3-note-preview:free',
  'openrouter/free',
];

const ocrOutputSchema = z.object({
  merchant: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  total: z.number().nullable().optional(),
  items: z
    .array(
      z.object({
        description: z.string(),
        total: z.number().optional(),
      })
    )
    .optional(),
});

export async function POST(req: Request) {
  // 1. Autenticação Híbrida (Bearer token Mobile ou Cookie Web)
  const authContext = await getUserFromRequest(req);
  if (!authContext) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'OPENROUTER_API_KEY não configurada em apps/web/.env.local' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return Response.json(
        { error: 'Imagem base64 inválida ou não informada.' },
        { status: 400 }
      );
    }

    // Limpar prefixo data:image/...;base64, se presente
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '').trim();
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    if (imageBuffer.length > 5 * 1024 * 1024) {
      return Response.json(
        { error: 'A imagem excede o tamanho máximo de 5MB.' },
        { status: 413 }
      );
    }

    const prompt = `Você é o extrator de notas fiscais e comprovantes do Equilibrium.
Analise a imagem deste recibo/comprovante e extraia:
1. merchant: Nome fantasia do estabelecimento ou empresa emissora (ex: "Pão de Açúcar", "Posto Shell", "Restaurante Mocotó"). Se ilegível ou ausente, null.
2. date: Data da transação no formato YYYY-MM-DD. Se ilegível ou ausente, null.
3. total: Valor TOTAL pago em reais como número float (ex: 89.90, 150.00). Se ilegível ou ausente, null.
4. items: Lista de itens comprados no formato [{ description, total }].

Responda APENAS um objeto JSON válido, sem blocos markdown extras.
Exemplo:
{"merchant": "Supermercado Extra", "date": "2026-08-10", "total": 124.50, "items": [{"description": "Arroz 5kg", "total": 29.90}]}`;

    const openrouter = getOpenRouterProvider();
    let lastError: any = null;
    let extractedText = '';

    // Cascata de modelos Vision
    for (let i = 0; i < OCR_MODELS_CASCADE.length; i++) {
      const modelId = OCR_MODELS_CASCADE[i];
      try {
        console.log(`[OCR Route] Processando imagem com model="${modelId}" (tentativa ${i + 1}/${OCR_MODELS_CASCADE.length})...`);
        const result = await generateText({
          model: openrouter(modelId),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image', image: imageBuffer },
              ],
            },
          ],
          temperature: 0.1,
          maxTokens: 500,
        });

        extractedText = result.text.trim();
        if (extractedText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[OCR Route] Falha no modelo ${modelId}:`, err.message || err);
      }
    }

    if (!extractedText) {
      throw lastError || new Error('Nenhum modelo Vision da OpenRouter conseguiu processar a imagem.');
    }

    // Parse JSON resiliente
    let cleanJson = extractedText;
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    }

    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        return Response.json(
          { error: 'Não foi possível extrair dados estruturados da imagem.', raw: extractedText },
          { status: 422 }
        );
      }
    }

    const validated = ocrOutputSchema.safeParse(parsedResult);
    const data = validated.success ? validated.data : parsedResult;

    const totalFloat = typeof data.total === 'number' ? data.total : null;
    const totalCents = totalFloat !== null ? Math.round(Math.abs(totalFloat) * 100) : null;

    return Response.json({
      merchant: data.merchant || null,
      date: data.date || null,
      totalCents: totalCents && totalCents > 0 ? totalCents : null,
      items: (data.items || []).map((i: any) => ({
        description: i.description || 'Item',
        totalCents: typeof i.total === 'number' ? Math.round(Math.abs(i.total) * 100) : null,
      })),
    });
  } catch (err: any) {
    console.error('[OCR Route] Erro final:', err);
    return Response.json(
      { error: err.message || 'Falha ao processar OCR da imagem.' },
      { status: 500 }
    );
  }
}
