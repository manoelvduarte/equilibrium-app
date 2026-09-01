import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/ai/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
  // 1. Guard de Autenticação (Bearer token ou Cookie)
  const authContext = await getUserFromRequest(req);
  if (!authContext) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'GOOGLE_GENERATIVE_AI_API_KEY não configurada' },
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

    // Limpar prefixo data:image/jpeg;base64, se presente
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '').trim();
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    if (imageBuffer.length > 5 * 1024 * 1024) {
      return Response.json(
        { error: 'A imagem excede o tamanho máximo de 5MB.' },
        { status: 413 }
      );
    }

    const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';

    const prompt = `Você é o extrator de notas fiscais e comprovantes do Equilibrium.
Analise a imagem deste recibo/comprovante e extraia:
1. merchant: Nome fantasia do estabelecimento ou empresa emissora (ex: "Pão de Açúcar", "Posto Shell", "Restaurante Mocotó"). Se ilegível, null.
2. date: Data da transação no formato YYYY-MM-DD. Se ilegível, null.
3. total: Valor TOTAL pago em reais como número float (ex: 89.90, 150.00). Se ilegível, null.
4. items: Lista de itens comprados no formato [{ description, total }].

Responda APENAS um objeto JSON válido, sem blocos markdown extras.
Exemplo de resposta:
{"merchant": "Supermercado Extra", "date": "2026-08-10", "total": 124.50, "items": [{"description": "Arroz 5kg", "total": 29.90}]}`;

    const { text } = await generateText({
      model: google(modelName),
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
    });

    // Parse JSON resiliente
    let cleanJson = text.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    }

    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(cleanJson);
    } catch {
      // Fallback: tentar extrair JSON por regex
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
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
    console.error('Erro no processamento OCR:', err);
    return Response.json(
      { error: err.message || 'Falha ao processar OCR da imagem.' },
      { status: 500 }
    );
  }
}
