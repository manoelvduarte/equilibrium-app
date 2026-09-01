import { SupabaseClient } from '@supabase/supabase-js';
import {
  createTransactionToolSchema,
  updateTransactionToolSchema,
  deleteTransactionToolSchema,
  categorizeTransactionsToolSchema,
  updateBudgetLimitToolSchema,
  createCategoryToolSchema,
} from '@equilibrium/ai';

export interface ExecuteToolCoreParams {
  supabase: SupabaseClient;
  userId: string;
  householdId: string;
  toolCallId: string;
  toolName: string;
  args: any;
}

export async function executeApprovedToolCore({
  supabase,
  userId,
  householdId,
  toolCallId,
  toolName,
  args,
}: ExecuteToolCoreParams) {
  // 1. Inserir log inicial em ai_action_logs como 'approved'
  const { data: logEntry, error: logErr } = await supabase
    .from('ai_action_logs')
    .insert({
      household_id: householdId,
      user_id: userId,
      tool_name: toolName,
      params: args,
      status: 'approved',
    })
    .select('id')
    .single();

  if (logErr) {
    console.error('Erro ao gravar ai_action_logs:', logErr);
  }

  let executionResult: any = null;

  try {
    switch (toolName) {
      case 'create_transaction': {
        const payloadWithDefault = {
          ...args,
          date: args.date || new Date().toISOString().split('T')[0],
        };
        const validated = createTransactionToolSchema.parse(payloadWithDefault);
        const { data: tx, error: txErr } = await supabase
          .from('transactions')
          .insert({
            household_id: householdId,
            account_id: validated.accountId,
            category_id: validated.categoryId || null,
            created_by_id: userId,
            description: validated.description,
            amount_cents: validated.amountCents,
            type: validated.type,
            date: validated.date || new Date().toISOString().split('T')[0],
            merchant: validated.merchant || null,
            notes: validated.notes || null,
            tags: validated.tags || [],
            source: 'ai',
            version: 1,
          })
          .select()
          .single();

        if (txErr) throw txErr;
        executionResult = {
          message: `Transação "${tx.description}" de R$ ${(tx.amount_cents / 100).toFixed(2)} criada com sucesso sob o ID ${tx.id}.`,
          transaction: tx,
        };
        break;
      }

      case 'update_transaction': {
        const validated = updateTransactionToolSchema.parse(args);
        const { data: currentTx, error: fetchErr } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', validated.id)
          .single();

        if (fetchErr || !currentTx) throw new Error('Transação não encontrada');

        await supabase.from('transaction_history').insert({
          transaction_id: currentTx.id,
          snapshot: currentTx,
          version: currentTx.version || 1,
        });

        const updatePayload: any = {
          version: (currentTx.version || 1) + 1,
          updated_at: new Date().toISOString(),
        };
        if (validated.description !== undefined) updatePayload.description = validated.description;
        if (validated.amountCents !== undefined) updatePayload.amount_cents = validated.amountCents;
        if (validated.categoryId !== undefined) updatePayload.category_id = validated.categoryId;
        if (validated.accountId !== undefined) updatePayload.account_id = validated.accountId;
        if (validated.type !== undefined) updatePayload.type = validated.type;

        const { data: updatedTx, error: updateErr } = await supabase
          .from('transactions')
          .update(updatePayload)
          .eq('id', validated.id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        executionResult = {
          message: `Transação "${updatedTx.description}" atualizada com sucesso para versão ${updatedTx.version}.`,
          transaction: updatedTx,
        };
        break;
      }

      case 'delete_transaction': {
        const validated = deleteTransactionToolSchema.parse(args);
        const { error: delErr } = await supabase
          .from('transactions')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', validated.id);

        if (delErr) throw delErr;
        executionResult = {
          message: `Transação ${validated.id} excluída com sucesso.`,
          id: validated.id,
        };
        break;
      }

      case 'categorize_transactions': {
        const validated = categorizeTransactionsToolSchema.parse(args);
        const { error: catErr } = await supabase
          .from('transactions')
          .update({ category_id: validated.categoryId })
          .in('id', validated.transactionIds);

        if (catErr) throw catErr;
        executionResult = {
          message: `${validated.transactionIds.length} transações associadas à categoria ${validated.categoryId}.`,
        };
        break;
      }

      case 'update_budget_limit': {
        const validated = updateBudgetLimitToolSchema.parse(args);
        const { data: budget, error: budgetErr } = await supabase
          .from('budgets')
          .upsert(
            {
              household_id: householdId,
              category_id: validated.categoryId,
              month: validated.month,
              year: validated.year,
              limit_cents: validated.limitCents,
            },
            { onConflict: 'household_id,category_id,month,year' }
          )
          .select()
          .single();

        if (budgetErr) throw budgetErr;
        executionResult = {
          message: `Teto de orçamento atualizado para R$ ${(validated.limitCents / 100).toFixed(2)}.`,
          budget,
        };
        break;
      }

      case 'create_category': {
        const validated = createCategoryToolSchema.parse(args);
        const { data: cat, error: catErr } = await supabase
          .from('categories')
          .insert({
            household_id: householdId,
            name: validated.name,
            kind: validated.kind,
            icon: validated.icon,
            color: validated.color,
            budget_style: validated.budgetStyle,
          })
          .select()
          .single();

        if (catErr) throw catErr;
        executionResult = {
          message: `Categoria "${cat.name}" criada com sucesso.`,
          category: cat,
        };
        break;
      }

      default:
        throw new Error(`Ferramenta desconhecida: ${toolName}`);
    }

    if (logEntry?.id) {
      await supabase
        .from('ai_action_logs')
        .update({
          status: 'executed',
          result: executionResult,
          executed_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id);
    }

    return { success: true, result: executionResult };
  } catch (err: any) {
    if (logEntry?.id) {
      await supabase
        .from('ai_action_logs')
        .update({
          status: 'executed',
          result: { error: err.message || 'Falha na execução da tool' },
          executed_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id);
    }
    throw err;
  }
}

export async function rejectToolCallCore({
  supabase,
  userId,
  householdId,
  toolCallId,
  toolName,
  args,
}: ExecuteToolCoreParams) {
  await supabase.from('ai_action_logs').insert({
    household_id: householdId,
    user_id: userId,
    tool_name: toolName,
    params: args,
    status: 'rejected',
    result: { status: 'rejected_by_user' },
  });

  return { success: true, status: 'rejected' };
}
