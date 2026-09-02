'use server';

import { getUserFromRequest } from '@/lib/ai/auth';
import { revalidatePath } from 'next/cache';

// ==========================================
// 1. METAS (GOALS)
// ==========================================

export interface CreateGoalParams {
  name: string;
  targetCents: number;
  currentCents?: number;
  deadline?: string | null;
  strategy?: string | null;
}

export async function createGoal(params: CreateGoalParams) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile } = authContext;

  const { data, error } = await supabase
    .from('goals')
    .insert({
      household_id: profile.household_id,
      name: params.name,
      target_cents: params.targetCents,
      deadline: params.deadline || null,
      strategy: params.strategy || JSON.stringify({ current_cents: params.currentCents || 0 }),
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar meta:', error);
    throw new Error(error.message || 'Falha ao criar meta.');
  }

  revalidatePath('/');
  return data;
}

export async function contributeToGoal(goalId: string, addCents: number) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile } = authContext;

  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('household_id', profile.household_id)
    .single();

  if (!goal) throw new Error('Meta não encontrada');

  let currentCents = 0;
  try {
    const meta = JSON.parse(goal.strategy || '{}');
    currentCents = Number(meta.current_cents || 0);
  } catch {
    currentCents = 0;
  }

  const updatedCurrent = currentCents + addCents;
  const newStrategy = JSON.stringify({ current_cents: updatedCurrent });

  const { error } = await supabase
    .from('goals')
    .update({ strategy: newStrategy })
    .eq('id', goalId);

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return { success: true, currentCents: updatedCurrent };
}

export async function deleteGoal(goalId: string) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile } = authContext;

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
    .eq('household_id', profile.household_id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return { success: true };
}

// ==========================================
// 2. DÍVIDAS (DEBTS)
// ==========================================

export interface CreateDebtParams {
  name: string;
  principalCents: number;
  aprPercent: number; // ex: 14.5% ao ano
  minPaymentCents?: number;
  strategy?: 'snowball' | 'avalanche';
}

export async function createDebt(params: CreateDebtParams) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile } = authContext;

  const aprBps = Math.round(params.aprPercent * 100); // 14.5% -> 1450 bps

  const { data, error } = await supabase
    .from('debts')
    .insert({
      household_id: profile.household_id,
      name: params.name,
      principal_cents: params.principalCents,
      apr_bps: aprBps,
      min_payment_cents: params.minPaymentCents || 0,
      strategy: params.strategy || 'avalanche',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar dívida:', error);
    throw new Error(error.message || 'Falha ao criar dívida.');
  }

  revalidatePath('/');
  return data;
}

export async function amortizeDebt(debtId: string, amountCents: number) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile } = authContext;

  const { data: debt } = await supabase
    .from('debts')
    .select('principal_cents')
    .eq('id', debtId)
    .eq('household_id', profile.household_id)
    .single();

  if (!debt) throw new Error('Dívida não encontrada');

  const newPrincipal = Math.max(0, Number(debt.principal_cents) - amountCents);

  const { error } = await supabase
    .from('debts')
    .update({ principal_cents: newPrincipal })
    .eq('id', debtId);

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return { success: true, remainingPrincipal: newPrincipal };
}

export async function deleteDebt(debtId: string) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile } = authContext;

  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', debtId)
    .eq('household_id', profile.household_id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return { success: true };
}

// ==========================================
// 3. CONTAS BANCÁRIAS (ACCOUNTS)
// ==========================================

export interface CreateAccountParams {
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'cash' | 'other';
  initialBalanceCents?: number;
  visibility?: 'private' | 'balance_only' | 'shared';
}

export async function createAccount(params: CreateAccountParams) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile } = authContext;

  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .insert({
      household_id: profile.household_id,
      name: params.name,
      type: params.type,
      visibility: params.visibility || 'shared',
      owner_id: profile.id,
      currency: 'BRL',
    })
    .select()
    .single();

  if (accErr) {
    console.error('Erro ao criar conta:', accErr);
    throw new Error(accErr.message || 'Falha ao criar conta.');
  }

  // Se houver saldo inicial > 0, cria transação de saldo de abertura
  if (params.initialBalanceCents && params.initialBalanceCents > 0) {
    await supabase.from('transactions').insert({
      household_id: profile.household_id,
      account_id: account.id,
      description: 'Saldo Inicial',
      amount_cents: params.initialBalanceCents,
      type: 'income',
      source: 'manual',
      created_by_id: profile.id,
    });
  }

  revalidatePath('/');
  return account;
}

export async function deleteAccount(accountId: string) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile } = authContext;

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId)
    .eq('household_id', profile.household_id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return { success: true };
}

// ==========================================
// 4. ORÇAMENTOS E CATEGORIAS (BUDGETS)
// ==========================================

export interface SetBudgetLimitParams {
  categoryId: string;
  month: number;
  year: number;
  limitCents: number;
}

export async function setBudgetLimit(params: SetBudgetLimitParams) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile } = authContext;

  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      {
        household_id: profile.household_id,
        category_id: params.categoryId,
        month: params.month,
        year: params.year,
        limit_cents: params.limitCents,
        envelope_cents: params.limitCents,
      },
      {
        onConflict: 'household_id,category_id,month,year',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Erro ao definir teto de orçamento:', error);
    throw new Error(error.message || 'Falha ao salvar orçamento.');
  }

  revalidatePath('/');
  return data;
}

export interface CreateCategoryParams {
  name: string;
  kind: 'expense' | 'income';
  budgetStyle: 'fixed' | 'flex' | 'envelope';
  icon?: string;
  color?: string;
}

export async function createCategory(params: CreateCategoryParams) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile } = authContext;

  const { data, error } = await supabase
    .from('categories')
    .insert({
      household_id: profile.household_id,
      name: params.name,
      kind: params.kind,
      budget_style: params.budgetStyle,
      icon: params.icon || 'tag',
      color: params.color || '#5F7461',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar categoria:', error);
    throw new Error(error.message || 'Falha ao criar categoria.');
  }

  revalidatePath('/');
  return data;
}
