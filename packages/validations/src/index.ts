import { z } from 'zod';

// 1. Validador Estrito de Centavos Inteiros (NUNCA FLOAT/DECIMAL)
export const amountCentsSchema = z
  .number({
    required_error: 'O valor em centavos é obrigatório',
    invalid_type_error: 'O valor deve ser um número inteiro',
  })
  .int('Valores monetários devem ser centavos inteiros')
  .positive('O valor deve ser estritamente positivo (> 0)');

// 2. Helper de Distribuição de Resto para Permilagem (‰)
// Regra: O primeiro parceiro (index 0) recebe o resto da divisão inteira de centavos.
export function calculateSplitCents(
  amountCents: number,
  ratios: Record<string, number>
): Record<string, number> {
  const profileIds = Object.keys(ratios);
  if (profileIds.length === 0) return {};

  const result: Record<string, number> = {};
  let otherProfilesSum = 0;

  // Calcula o valor dos perfis a partir do segundo (index 1 até N-1)
  for (let i = 1; i < profileIds.length; i++) {
    const profileId = profileIds[i];
    const share = Math.floor((amountCents * ratios[profileId]) / 1000);
    result[profileId] = share;
    otherProfilesSum += share;
  }

  // O primeiro parceiro (index 0) recebe a diferença inteira restante
  const firstProfileId = profileIds[0];
  result[firstProfileId] = amountCents - otherProfilesSum;

  return result;
}

// 3. Schema de Transação
export const transactionSchema = z.object({
  accountId: z.string().uuid('ID de conta inválido'),
  transferToAccountId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  type: z.enum(['income', 'expense', 'transfer'], {
    required_error: 'Selecione o tipo de transação',
  }),
  amountCents: amountCentsSchema,
  currency: z.string().default('BRL'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  merchant: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  receiptUrl: z.string().url().optional().nullable(),
  split: z
    .object({
      ratios: z.record(z.string(), z.number().int().min(0).max(1000)),
    })
    .optional()
    .nullable(),
  source: z.enum(['manual', 'csv', 'ofx', 'qif', 'pluggy', 'ai', 'ocr']).default('manual'),
});

export const updateTransactionSchema = transactionSchema.partial().extend({
  id: z.string().uuid('ID da transação inválido'),
});

// 4. Schema de Conta Financeira
export const accountSchema = z.object({
  name: z.string().min(1, 'Nome da conta é obrigatório'),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'cash']),
  visibility: z.enum(['private', 'balance_only', 'shared']).default('shared'),
  institution: z.string().optional().nullable(),
  currency: z.string().default('BRL'),
  ownerId: z.string().uuid().optional().nullable(), // null = conjunta
});

// 5. Schema de Orçamento
export const budgetSchema = z.object({
  categoryId: z.string().uuid('ID de categoria inválido'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024),
  limitCents: z.number().int().min(0),
  envelopeCents: z.number().int().min(0).default(0),
  rollover: z.boolean().default(false),
});

// 6. Schema de Convite
export const inviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
});
