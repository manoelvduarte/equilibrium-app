import dotenv from 'dotenv';
import path from 'path';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

async function testGemini() {
  console.log('=== TESTE DE CONEXÃO COM GOOGLE GEMINI ===\n');

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Nenhuma chave de API encontrada em apps/web/.env.local');
    return;
  }

  const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';

  try {
    console.log(`Testando modelo ${modelName}...`);
    const { text } = await generateText({
      model: google(modelName),
      prompt: 'ping',
      maxTokens: 5,
    });
    console.log(`✓ Resposta de ${modelName}:`, text.trim());
  } catch (err: any) {
    console.warn(`[Diag] Falha em ${modelName}:`, err.message);
  }
}

testGemini();
