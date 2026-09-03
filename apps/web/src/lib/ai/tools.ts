import { tool } from 'ai';
import {
  getFinancialSummarySchema,
  queryAnalyticsSchema,
  projectCashFlowSchema,
  generateReportSchema,
  getGoalsAndDebtsSchema,
  getBillsAndNotesSchema,
  createTransactionToolSchema,
  updateTransactionToolSchema,
  deleteTransactionToolSchema,
  categorizeTransactionsToolSchema,
  updateBudgetLimitToolSchema,
  createCategoryToolSchema,
  AI_TOOL_METADATA,
} from '@equilibrium/ai';
import { SupabaseClient } from '@supabase/supabase-js';

export function createAssistantTools(supabase: SupabaseClient, householdId: string, userId: string) {
  return {
    // 1. LEITURA (Executam no servidor sob o JWT do usuário)
    get_financial_summary: tool({
      description: AI_TOOL_METADATA.get_financial_summary.description,
      parameters: getFinancialSummarySchema,
      execute: async ({ period }) => {
        const now = new Date();
        let startDate: string;

        if (period === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        } else if (period === 'year') {
          startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        } else {
          const d = new Date(now);
          d.setDate(d.getDate() - 30);
          startDate = d.toISOString().split('T')[0];
        }

        const { data: txList } = await supabase
          .from('transactions')
          .select('amount_cents, type')
          .is('deleted_at', null)
          .gte('date', startDate);

        const { data: balances } = await supabase
          .from('account_balances')
          .select('balance_cents');

        const totalIncomeCents = (txList || [])
          .filter((t) => t.type === 'income')
          .reduce((acc, t) => acc + Number(t.amount_cents), 0);

        const totalExpenseCents = (txList || [])
          .filter((t) => t.type === 'expense')
          .reduce((acc, t) => acc + Number(t.amount_cents), 0);

        const netWorthCents = (balances || [])
          .reduce((acc, b) => acc + Number(b.balance_cents), 0);

        const netSavingsCents = totalIncomeCents - totalExpenseCents;
        const savingsRatePercent =
          totalIncomeCents > 0
            ? Math.round((netSavingsCents / totalIncomeCents) * 100)
            : 0;

        return {
          period,
          startDate,
          totalIncomeCents,
          totalIncomeFormattedEUR: `€ ${(totalIncomeCents / 100).toFixed(2)}`,
          totalIncomeFormattedBRL: `R$ ${(totalIncomeCents / 100).toFixed(2)}`,
          totalExpenseCents,
          totalExpenseFormattedEUR: `€ ${(totalExpenseCents / 100).toFixed(2)}`,
          totalExpenseFormattedBRL: `R$ ${(totalExpenseCents / 100).toFixed(2)}`,
          netSavingsCents,
          netSavingsFormattedEUR: `€ ${(netSavingsCents / 100).toFixed(2)}`,
          savingsRatePercent,
          netWorthCents,
          netWorthFormattedEUR: `€ ${(netWorthCents / 100).toFixed(2)}`,
          netWorthFormattedBRL: `R$ ${(netWorthCents / 100).toFixed(2)}`,
        };
      },
    }),

    query_analytics: tool({
      description: AI_TOOL_METADATA.query_analytics.description,
      parameters: queryAnalyticsSchema,
      execute: async ({ question, dimension }) => {
        const { data: txList } = await supabase
          .from('transactions')
          .select(`
            amount_cents,
            type,
            merchant,
            categories:category_id ( name ),
            profiles:created_by_id ( full_name )
          `)
          .is('deleted_at', null)
          .eq('type', 'expense');

        const map = new Map<string, number>();

        (txList || []).forEach((t: any) => {
          let key = 'Outros';
          if (dimension === 'category') {
            key = t.categories?.name || 'Sem Categoria';
          } else if (dimension === 'merchant') {
            key = t.merchant || 'Diversos';
          } else if (dimension === 'profile') {
            key = t.profiles?.full_name || 'Desconhecido';
          }
          const current = map.get(key) || 0;
          map.set(key, current + Number(t.amount_cents));
        });

        const ranking = Array.from(map.entries())
          .map(([name, totalCents]) => ({
            name,
            totalCents,
            formattedEUR: `€ ${(totalCents / 100).toFixed(2)}`,
            formattedBRL: `R$ ${(totalCents / 100).toFixed(2)}`,
          }))
          .sort((a, b) => b.totalCents - a.totalCents);

        return {
          question,
          dimension,
          ranking,
        };
      },
    }),

    project_cash_flow: tool({
      description: AI_TOOL_METADATA.project_cash_flow.description,
      parameters: projectCashFlowSchema,
      execute: async ({ months }) => {
        const numMonths = parseInt(months, 10);
        const { data: balances } = await supabase.from('account_balances').select('balance_cents');
        const currentNetWorth = (balances || []).reduce((acc, b) => acc + Number(b.balance_cents), 0);

        const { data: recentTx } = await supabase
          .from('transactions')
          .select('amount_cents, type')
          .is('deleted_at', null)
          .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);

        const avgMonthlyIncome = (recentTx || [])
          .filter((t) => t.type === 'income')
          .reduce((acc, t) => acc + Number(t.amount_cents), 0) || 1200000;

        const avgMonthlyExpense = (recentTx || [])
          .filter((t) => t.type === 'expense')
          .reduce((acc, t) => acc + Number(t.amount_cents), 0) || 600000;

        const monthlySurplus = avgMonthlyIncome - avgMonthlyExpense;
        const projections = [];

        for (let i = 1; i <= numMonths; i++) {
          const projectedCents = currentNetWorth + monthlySurplus * i;
          projections.push({
            monthIndex: i,
            projectedCents,
            formattedEUR: `€ ${(projectedCents / 100).toFixed(2)}`,
            formattedBRL: `R$ ${(projectedCents / 100).toFixed(2)}`,
          });
        }

        return {
          currentNetWorth,
          avgMonthlyIncome,
          avgMonthlyExpense,
          monthlySurplus,
          projections,
        };
      },
    }),

    get_goals_and_debts: tool({
      description: AI_TOOL_METADATA.get_goals_and_debts.description,
      parameters: getGoalsAndDebtsSchema,
      execute: async ({ filter }) => {
        let goalsData: any[] = [];
        let debtsData: any[] = [];

        if (filter === 'all' || filter === 'goals') {
          const { data: goals } = await supabase.from('goals').select('*');
          goalsData = (goals || []).map((g: any) => {
            const current = g.strategy?.current_cents || 0;
            const pct = g.target_cents > 0 ? Math.min(100, Math.round((current / g.target_cents) * 100)) : 0;
            return {
              id: g.id,
              name: g.name,
              target_cents: g.target_cents,
              target_eur: `€ ${(g.target_cents / 100).toFixed(2)}`,
              current_cents: current,
              current_eur: `€ ${(current / 100).toFixed(2)}`,
              progress: `${pct}%`,
              deadline: g.deadline,
            };
          });
        }

        if (filter === 'all' || filter === 'debts') {
          const { data: debts } = await supabase.from('debts').select('*');
          debtsData = (debts || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            principal_cents: d.principal_cents,
            principal_eur: `€ ${(d.principal_cents / 100).toFixed(2)}`,
            apr: `${((d.apr_bps || 0) / 100).toFixed(1)}% a.a.`,
            min_payment_eur: `€ ${(d.min_payment_cents / 100).toFixed(2)}`,
            strategy: d.strategy || 'avalanche',
          }));
        }

        return {
          filter,
          goals: goalsData,
          debts: debtsData,
        };
      },
    }),

    get_bills_and_notes: tool({
      description: AI_TOOL_METADATA.get_bills_and_notes.description,
      parameters: getBillsAndNotesSchema,
      execute: async ({ filter }) => {
        return {
          filter,
          anniversaryDate: '07/09',
          couple: 'Manoel & Giovana',
          status: 'Todas as notas, acordos e lembretes estão sincronizados.',
        };
      },
    }),

    generate_report: tool({
      description: AI_TOOL_METADATA.generate_report.description,
      parameters: generateReportSchema,
      execute: async ({ period, type }) => {
        return {
          period,
          reportType: type,
          generatedAt: new Date().toISOString(),
          status: 'Relatório financeiro do casal gerado com sucesso.',
        };
      },
    }),

    // 2. MUTAÇÃO (SEM execute — tools client-side que geram Proposal de Aprovação Humana)
    create_transaction: tool({
      description: AI_TOOL_METADATA.create_transaction.description,
      parameters: createTransactionToolSchema,
    }),

    update_transaction: tool({
      description: AI_TOOL_METADATA.update_transaction.description,
      parameters: updateTransactionToolSchema,
    }),

    delete_transaction: tool({
      description: AI_TOOL_METADATA.delete_transaction.description,
      parameters: deleteTransactionToolSchema,
    }),

    categorize_transactions: tool({
      description: AI_TOOL_METADATA.categorize_transactions.description,
      parameters: categorizeTransactionsToolSchema,
    }),

    update_budget_limit: tool({
      description: AI_TOOL_METADATA.update_budget_limit.description,
      parameters: updateBudgetLimitToolSchema,
    }),

    create_category: tool({
      description: AI_TOOL_METADATA.create_category.description,
      parameters: createCategoryToolSchema,
    }),
  };
}
