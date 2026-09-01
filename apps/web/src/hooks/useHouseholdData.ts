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
  kind: 'expense' | 'income';
  budget_style: 'fixed' | 'flex' | 'envelope';
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
  date: string;
  account_id: string;
  category_id: string | null;
  created_by_id: string | null;
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
  deadline: string | null;
  strategy: string | null;
}

export interface Debt {
  id: string;
  name: string;
  principal_cents: number;
  interest_rate_permille: number;
  minimum_payment_cents: number;
  strategy: string | null;
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
        .order('sort_order');

      if (catData && catData.length > 0) {
        setCategories(catData);
      } else if (profileData?.household_id) {
        // Se ainda não houver categorias no banco, insere o catálogo base
        const defaultCategories = [
          { name: 'Moradia', icon: 'home', color: '#5F7461', kind: 'expense', budget_style: 'fixed' as const, sort_order: 1 },
          { name: 'Mercado', icon: 'shopping-cart', color: '#A96A3C', kind: 'expense', budget_style: 'envelope' as const, sort_order: 2 },
          { name: 'Restaurantes', icon: 'utensils', color: '#B4532A', kind: 'expense', budget_style: 'flex' as const, sort_order: 3 },
          { name: 'Transporte', icon: 'car', color: '#23606B', kind: 'expense', budget_style: 'flex' as const, sort_order: 4 },
          { name: 'Lazer', icon: 'plane', color: '#7D5E7C', kind: 'expense', budget_style: 'flex' as const, sort_order: 5 },
          { name: 'Tecnologia', icon: 'laptop', color: '#4E7E8C', kind: 'expense', budget_style: 'fixed' as const, sort_order: 6 },
          { name: 'Utilidades', icon: 'zap', color: '#A3874A', kind: 'expense', budget_style: 'fixed' as const, sort_order: 7 },
          { name: 'Saúde', icon: 'heart-pulse', color: '#6E8F6B', kind: 'expense', budget_style: 'flex' as const, sort_order: 8 },
          { name: 'Salário', icon: 'banknote', color: '#9C5A54', kind: 'income', budget_style: 'fixed' as const, sort_order: 9 },
          { name: 'Outros', icon: 'tag', color: '#5C6B7A', kind: 'expense', budget_style: 'flex' as const, sort_order: 10 },
        ];

        await supabase.from('categories').insert(
          defaultCategories.map((c) => ({
            ...c,
            household_id: profileData.household_id,
          }))
        );
        const { data: insertedCats } = await supabase.from('categories').select('*').order('sort_order');
        if (insertedCats) setCategories(insertedCats);
      }

      // 5. Transações
      const { data: txData } = await supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount_cents,
          type,
          date,
          created_at,
          account_id,
          category_id,
          created_by_id,
          deleted_at,
          accounts:account_id ( name ),
          categories:category_id ( name, icon, color ),
          profiles:created_by_id ( full_name )
        `)
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (txData) {
        const mappedTx: Transaction[] = txData.map((t: any) => ({
          id: t.id,
          description: t.description,
          amount_cents: Number(t.amount_cents),
          type: t.type,
          date: t.date,
          occurred_at: t.created_at || t.date,
          account_id: t.account_id,
          category_id: t.category_id,
          created_by_id: t.created_by_id,
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
        .select('*, categories:category_id ( id, name, icon, color, kind, budget_style )');

      if (budgetData) {
        setBudgets(budgetData.map((b: any) => ({
          ...b,
          limit_cents: Number(b.limit_cents),
          category: b.categories,
        })));
      }

      // 7. Metas (Goals)
      const { data: goalData } = await supabase.from('goals').select('*');
      if (goalData) {
        setGoals(goalData.map((g: any) => ({
          ...g,
          target_cents: Number(g.target_cents),
          current_cents: Number(g.target_cents * 0.4), // Projeção calculada
        })));
      }

      // 8. Dívidas (Debts)
      const { data: debtData } = await supabase.from('debts').select('*');
      if (debtData) {
        setDebts(debtData.map((d: any) => ({
          ...d,
          principal_cents: Number(d.principal_cents),
          interest_rate_permille: Number(d.apr_bps) / 10 || 15,
          minimum_payment_cents: Number(d.min_payment_cents),
        })));
      }

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
