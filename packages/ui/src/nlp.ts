import { parseBRLToCents } from './formatters';

export interface ParsedNaturalInput {
  description: string;
  amountCents: number;
  type: 'income' | 'expense';
}

/**
 * Parser NLP resiliente para strings em linguagem natural como:
 * - "Almoço 45,50" -> { description: "Almoço", amountCents: 4550, type: "expense" }
 * - "Mercado Pão de Açúcar 180" -> { description: "Mercado Pão de Açúcar", amountCents: 18000, type: "expense" }
 * - "Salário 8000" -> { description: "Salário", amountCents: 800000, type: "income" }
 * - "Pix Recebido 1250,00" -> { description: "Pix Recebido", amountCents: 125000, type: "income" }
 */
export function parseNaturalInput(text: string): ParsedNaturalInput {
  if (!text || text.trim().length === 0) {
    return {
      description: '',
      amountCents: 0,
      type: 'expense',
    };
  }

  const raw = text.trim();

  // 1. Regex para extrair números monetários no final ou no meio
  // Captura formatos como: 45,50 | 180 | 8.000,00 | 1,250.00 | R$ 120 | $ 50
  const match = raw.match(/(?:R\$\s*|\$\s*)?(\d+(?:[.,]\d+)?|\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d{1,3}(?:,\d{3})*(?:\.\d{2}))(?:\s*$|\s+)/i);

  let amountCents = 0;
  let description = raw;

  if (match) {
    const matchedNumberStr = match[1];
    amountCents = parseBRLToCents(matchedNumberStr);

    // Remove o número da descrição
    description = raw.replace(match[0], '').replace(/\s+/g, ' ').trim();
  }

  // 2. Detecção de Tipo (Receita vs Despesa)
  const lowerDesc = raw.toLowerCase();
  const isIncome =
    lowerDesc.includes('salário') ||
    lowerDesc.includes('salario') ||
    lowerDesc.includes('rendimento') ||
    lowerDesc.includes('dividendo') ||
    lowerDesc.includes('recebido') ||
    lowerDesc.includes('reembolso') ||
    lowerDesc.includes('venda') ||
    lowerDesc.includes('entrada') ||
    lowerDesc.includes('pix recebido');

  return {
    description: description || 'Transação',
    amountCents,
    type: isIncome ? 'income' : 'expense',
  };
}
