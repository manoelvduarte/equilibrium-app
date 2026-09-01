import { z } from 'zod';
import { transactionSchema, updateTransactionSchema, amountCentsSchema } from '@equilibrium/validations';

// 1. Ferramentas de Leitura (Sem approval)
export const getFinancialSummarySchema = z.object({
  period: z.enum(['month', 'year', '30d']).default('month'),
});

export const queryAnalyticsSchema = z.object({
  question: z.string().min(1, 'A pergunta de análise é obrigatória'),
  dimension: z.enum(['category', 'merchant', 'profile']).default('category'),
});

export const projectCashFlowSchema = z.object({
  months: z.enum(['3', '6', '12']).default('3'),
});

export const generateReportSchema = z.object({
  period: z.string().min(1),
  type: z.enum(['monthly_closing', 'couple_split']).default('monthly_closing'),
});

// 2. Ferramentas de Mutação (Com aprovação prévia obrigatória: needsApproval = true)
export const createTransactionToolSchema = transactionSchema;

export const updateTransactionToolSchema = updateTransactionSchema;

export const deleteTransactionToolSchema = z.object({
  id: z.string().uuid('ID da transação inválido'),
  reason: z.string().optional(),
});

export const categorizeTransactionsToolSchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1),
  categoryId: z.string().uuid(),
});

export const updateBudgetLimitToolSchema = z.object({
  categoryId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024),
  limitCents: amountCentsSchema,
});

export const createCategoryToolSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['expense', 'income']),
  icon: z.string().default('💰'),
  color: z.string().default('#64748b'),
  budgetStyle: z.enum(['envelope', 'flex', 'fixed']).default('flex'),
});

export interface EquilibriumAIToolConfig {
  needsApproval: boolean;
  description: string;
}

export const AI_TOOL_METADATA: Record<string, EquilibriumAIToolConfig> = {
  // Leitura
  get_financial_summary: { needsApproval: false, description: 'Obtém o resumo financeiro do período.' },
  query_analytics: { needsApproval: false, description: 'Consulta dados agregados de inteligência financeira.' },
  project_cash_flow: { needsApproval: false, description: 'Projeta fluxo de caixa futuro.' },
  generate_report: { needsApproval: false, description: 'Gera relatórios de fechamento ou divisão de casal.' },
  
  // Mutação (approval = true)
  create_transaction: { needsApproval: true, description: 'Cria uma nova transação financeira.' },
  update_transaction: { needsApproval: true, description: 'Atualiza uma transação existente com histórico.' },
  delete_transaction: { needsApproval: true, description: 'Aplica soft delete em uma transação.' },
  categorize_transactions: { needsApproval: true, description: 'Categoriza transações em lote.' },
  update_budget_limit: { needsApproval: true, description: 'Altera o teto do orçamento de uma categoria.' },
  create_category: { needsApproval: true, description: 'Cria uma nova categoria no household.' },
};
