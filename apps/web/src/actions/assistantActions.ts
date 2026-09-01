'use server';

import { createClient } from '@/lib/supabase/server';
import {
  createTransactionToolSchema,
  updateTransactionToolSchema,
  deleteTransactionToolSchema,
  categorizeTransactionsToolSchema,
  updateBudgetLimitToolSchema,
  createCategoryToolSchema,
} from '@equilibrium/ai';

export interface ExecuteApprovedToolParams {
  toolCallId: string;
  toolName: string;
  args: any;
}

export async function executeApprovedTool({ toolCallId, toolName, args }: ExecuteApprovedToolParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) {
    throw new Error('Household não encontrado');
  }

  // 1. Inserir log inicial em ai_action_logs como 'approved'
  const { data: logEntry, error: logErr } = await supabase
    .from('ai_action_logs')
    .insert({
      household_id: profile.household_id,
      user_id: profile.id,
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
    // 2. Validação e Execução de cada ferramenta
    switch (toolName) {
      case 'create_transaction': {
        const validated = createTransactionToolSchema.parse(args);
        const { data: tx, error: txErr } = await supabase
          .from('transactions')
          .insert({
            household_id: profile.household_id,
            account_id: validated.accountId,
            category_id: validated.categoryId || null,
            created_by_id: profile.id,
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
        
        // Buscar versão atual para histórico
        const { data: currentTx, error: fetchErr } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', validated.id)
          .single();

        if (fetchErr || !currentTx) throw new Error('Transação não encontrada');

        // Gravar histórico
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
              household_id: profile.household_id,
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
            household_id: profile.household_id,
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

    // 3. Atualizar log para 'executed' com resultado
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

export async function rejectToolCall({ toolCallId, toolName, args }: ExecuteApprovedToolParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) return { success: false };

  await supabase.from('ai_action_logs').insert({
    household_id: profile.household_id,
    user_id: profile.id,
    tool_name: toolName,
    params: args,
    status: 'rejected',
    result: { status: 'rejected_by_user' },
  });

  return { success: true, status: 'rejected' };
}

export async function saveUserMessage(content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) return null;

  const { data, error } = await supabase
    .from('ai_messages')
    .insert({
      household_id: profile.household_id,
      user_id: profile.id,
      role: 'user',
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar mensagem do usuário:', error);
  }

  return data;
}

export async function loadChatHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: messages } = await supabase
    .from('ai_messages')
    .select('id, role, content, tool_calls, created_at')
    .order('created_at', { ascending: true })
    .limit(50);

  return (messages || []).map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content || '',
    toolInvocations: m.tool_calls || undefined,
    createdAt: new Date(m.created_at),
  }));
}

export async function loadActionLogs() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from('ai_action_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return logs || [];
}
