'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Account {
  id: string;
  name: string;
  type: string;
  visibility: 'private' | 'balance_only' | 'shared';
  owner_id: string | null;
  balance_cents: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'fixed' | 'flex' | 'envelope';
}

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  household_id: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount_cents: number;
  type: 'income' | 'expense' | 'transfer';
  occurred_at: string;
  account_id: string;
  category_id: string | null;
  created_by_profile_id: string | null;
  deleted_at: string | null;
  account?: { name: string };
  category?: { name: string; icon: string; color: string };
  creator?: { full_name: string };
}

export interface Budget {
  id: string;
  category_id: string;
  month: number;
  year: number;
  limit_cents: number;
  category?: Category;
}

export interface Goal {
  id: string;
  name: string;
  target_cents: number;
  current_cents: number;
  target_date: string | null;
  category: 'emergency' | 'retirement' | 'custom';
}

export interface Debt {
  id: string;
  name: string;
  principal_cents: number;
  interest_rate_permille: number;
  minimum_payment_cents: number;
  due_date: string | null;
}

export interface HouseholdSummary {
  householdName: string;
  userProfile: Profile | null;
  partners: Profile[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  debts: Debt[];
  netWorthCents: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useHouseholdData(): HouseholdSummary {
  const [loading, setLoading] = useState(true);
  const [householdName, setHouseholdName] = useState('Nosso Casa');
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [partners, setPartners] = useState<Profile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Perfil atual
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setUserProfile(profileData);

        // 2. Household & Parceiros
        const { data: householdData } = await supabase
          .from('households')
          .select('name')
          .eq('id', profileData.household_id)
          .single();

        if (householdData) {
          setHouseholdName(householdData.name);
        }

        const { data: partnersData } = await supabase
          .from('profiles')
          .select('*')
          .eq('household_id', profileData.household_id);

        if (partnersData) {
          setPartners(partnersData);
        }
      }

      // 3. Contas e Saldos da view account_balances
      const { data: accData } = await supabase
        .from('accounts')
        .select('id, name, type, visibility, owner_id');

      const { data: balancesData } = await supabase
        .from('account_balances')
        .select('account_id, balance_cents');

      const balancesMap = new Map<string, number>();
      balancesData?.forEach((b: any) => balancesMap.set(b.account_id, Number(b.balance_cents)));

      if (accData) {
        const enrichedAccounts: Account[] = accData.map((a: any) => ({
          ...a,
          balance_cents: balancesMap.get(a.id) || 0,
        }));
        setAccounts(enrichedAccounts);
      }

      // 4. Categorias
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (catData && catData.length > 0) {
        setCategories(catData);
      } else {
        // Se ainda não houver categorias no banco, insere o conjunto base
        const defaultCategories = [
          { name: 'Moradia', icon: 'home', color: '#5F7461', type: 'fixed' as const },
          { name: 'Mercado', icon: 'shopping-cart', color: '#A96A3C', type: 'envelope' as const },
          { name: 'Restaurantes', icon: 'utensils', color: '#B4532A', type: 'flex' as const },
          { name: 'Transporte', icon: 'car', color: '#23606B', type: 'flex' as const },
          { name: 'Lazer', icon: 'plane', color: '#7D5E7C', type: 'flex' as const },
          { name: 'Tecnologia', icon: 'laptop', color: '#4E7E8C', type: 'fixed' as const },
          { name: 'Utilidades', icon: 'zap', color: '#A3874A', type: 'fixed' as const },
          { name: 'Saúde', icon: 'heart-pulse', color: '#6E8F6B', type: 'flex' as const },
          { name: 'Salário', icon: 'banknote', color: '#9C5A54', type: 'fixed' as const },
          { name: 'Outros', icon: 'tag', color: '#5C6B7A', type: 'flex' as const },
        ];

        if (profileData?.household_id) {
          await supabase.from('categories').insert(
            defaultCategories.map((c) => ({
              ...c,
              household_id: profileData.household_id,
            }))
          );
          const { data: insertedCats } = await supabase.from('categories').select('*').order('name');
          if (insertedCats) setCategories(insertedCats);
        }
      }

      // 5. Transações
      const { data: txData } = await supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount_cents,
          type,
          occurred_at,
          account_id,
          category_id,
          created_by_profile_id,
          deleted_at,
          accounts:account_id ( name ),
          categories:category_id ( name, icon, color ),
          profiles:created_by_profile_id ( full_name )
        `)
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false });

      if (txData) {
        const mappedTx: Transaction[] = txData.map((t: any) => ({
          id: t.id,
          description: t.description,
          amount_cents: t.amount_cents,
          type: t.type,
          occurred_at: t.occurred_at,
          account_id: t.account_id,
          category_id: t.category_id,
          created_by_profile_id: t.created_by_profile_id,
          deleted_at: t.deleted_at,
          account: t.accounts,
          category: t.categories,
          creator: t.profiles,
        }));
        setTransactions(mappedTx);
      }

      // 6. Orçamentos (Budgets)
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*, categories:category_id ( id, name, icon, color, type )');

      if (budgetData) {
        setBudgets(budgetData.map((b: any) => ({ ...b, category: b.categories })));
      }

      // 7. Metas (Goals)
      const { data: goalData } = await supabase.from('goals').select('*').order('created_at');
      if (goalData) setGoals(goalData);

      // 8. Dívidas (Debts)
      const { data: debtData } = await supabase.from('debts').select('*').order('created_at');
      if (debtData) setDebts(debtData);

    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription na tabela transactions
  useEffect(() => {
    const channel = supabase
      .channel('realtime_transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData]);

  const netWorthCents = accounts.reduce((acc, curr) => acc + (curr.balance_cents || 0), 0);

  return {
    householdName,
    userProfile,
    partners,
    accounts,
    categories,
    transactions,
    budgets,
    goals,
    debts,
    netWorthCents,
    loading,
    refetch: fetchData,
  };
}
