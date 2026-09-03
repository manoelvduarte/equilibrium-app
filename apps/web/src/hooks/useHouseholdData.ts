'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'cash' | 'other';
  balance_cents: number;
  visibility: 'private' | 'balance_only' | 'shared';
  owner_id: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: 'income' | 'expense';
  budget_style: 'fixed' | 'flex' | 'envelope';
  sort_order: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount_cents: number;
  type: 'income' | 'expense' | 'transfer';
  date: string;
  occurred_at: string;
  account_id: string;
  category_id: string | null;
  created_by_id: string;
  deleted_at: string | null;
  source: string;
  account?: {
    name: string;
  };
  category?: {
    name: string;
    icon: string;
    color: string;
  };
  creator?: {
    full_name: string;
  };
}

export interface Budget {
  id: string;
  category_id: string;
  limit_cents: number;
  envelope_cents: number;
  month: number;
  year: number;
  category?: Category;
}

export interface Goal {
  id: string;
  name: string;
  target_cents: number;
  current_cents: number;
  deadline?: string | null;
  strategy?: string | null;
}

export interface Debt {
  id: string;
  name: string;
  principal_cents: number;
  interest_rate_permille: number;
  minimum_payment_cents: number;
  strategy: 'snowball' | 'avalanche';
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  household_id: string;
}

export interface HouseholdSummary {
  loading: boolean;
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
  refetch: () => Promise<void>;
}

export function useHouseholdData(): HouseholdSummary {
  const [loading, setLoading] = useState(true);
  const [householdName, setHouseholdName] = useState('Nossa Casa');
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
          const rawName = householdData.name;
          const cleanName = rawName === 'Nosso Casa' ? 'Nossa Casa' : (rawName || 'Nossa Casa');
          setHouseholdName(cleanName);
        }

        const { data: partnersData } = await supabase
          .from('profiles')
          .select('*')
          .eq('household_id', profileData.household_id);

        if (partnersData) {
          setPartners(partnersData);
        }
      }

      // 3. Contas e Saldos
      const { data: accData } = await supabase
        .from('accounts')
        .select('id, name, type, visibility, owner_id');

      if (accData && accData.length > 0) {
        const { data: balancesData } = await supabase
          .from('account_balances')
          .select('account_id, balance_cents');

        const balancesMap = new Map<string, number>();
        balancesData?.forEach((b: any) => balancesMap.set(b.account_id, Number(b.balance_cents)));

        const enrichedAccounts: Account[] = accData.map((a: any) => ({
          ...a,
          balance_cents: balancesMap.get(a.id) || 0,
        }));
        setAccounts(enrichedAccounts);
      } else if (profileData?.household_id) {
        // Auto-seed de Contas Iniciais
        const defaultAccounts = [
          { name: 'Conta Principal (Salário & Contas)', type: 'checking' as const, visibility: 'shared' as const, currency: 'EUR', household_id: profileData.household_id, owner_id: profileData.id },
          { name: 'Cartão Conjunto (Dia a Dia)', type: 'credit' as const, visibility: 'shared' as const, currency: 'EUR', household_id: profileData.household_id, owner_id: profileData.id },
          { name: 'Reserva de Emergência & Viagens', type: 'investment' as const, visibility: 'shared' as const, currency: 'EUR', household_id: profileData.household_id, owner_id: profileData.id },
        ];

        const { data: insertedAccs } = await supabase
          .from('accounts')
          .insert(defaultAccounts)
          .select();

        if (insertedAccs) {
          setAccounts(insertedAccs.map((a: any) => ({ ...a, balance_cents: 0 })));
        }
      }

      // 4. Categorias
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (catData && catData.length > 0) {
        setCategories(catData);
      } else if (profileData?.household_id) {
        // Auto-seed de Categorias Base
        const defaultCategories = [
          { name: 'Moradia & Aluguel', icon: 'home', color: '#5F7461', kind: 'expense', budget_style: 'fixed' as const, sort_order: 1 },
          { name: 'Alimentação & Mercado', icon: 'shopping-cart', color: '#A96A3C', kind: 'expense', budget_style: 'envelope' as const, sort_order: 2 },
          { name: 'Restaurantes & Delivery', icon: 'utensils', color: '#B4532A', kind: 'expense', budget_style: 'flex' as const, sort_order: 3 },
          { name: 'Transporte & Combustível', icon: 'car', color: '#23606B', kind: 'expense', budget_style: 'flex' as const, sort_order: 4 },
          { name: 'Lazer & Cultura', icon: 'plane', color: '#7D5E7C', kind: 'expense', budget_style: 'flex' as const, sort_order: 5 },
          { name: 'Tecnologia & Assinaturas', icon: 'laptop', color: '#4E7E8C', kind: 'expense', budget_style: 'fixed' as const, sort_order: 6 },
          { name: 'Contas & Utilidades', icon: 'zap', color: '#A3874A', kind: 'expense', budget_style: 'fixed' as const, sort_order: 7 },
          { name: 'Saúde & Farmácia', icon: 'heart-pulse', color: '#6E8F6B', kind: 'expense', budget_style: 'flex' as const, sort_order: 8 },
          { name: 'Salário & Renda Principal', icon: 'banknote', color: '#9C5A54', kind: 'income', budget_style: 'fixed' as const, sort_order: 9 },
          { name: 'Rendimentos & Investimentos', icon: 'tag', color: '#5C6B7A', kind: 'income', budget_style: 'flex' as const, sort_order: 10 },
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
          source,
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
          source: t.source || 'manual',
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
        setGoals(goalData.map((g: any) => {
          let currentCents = 0;
          try {
            const meta = JSON.parse(g.strategy || '{}');
            currentCents = Number(meta.current_cents || 0);
          } catch {
            currentCents = 0;
          }
          return {
            ...g,
            target_cents: Number(g.target_cents),
            current_cents: currentCents,
          };
        }));
      }

      // 8. Dívidas (Debts)
      const { data: debtData } = await supabase.from('debts').select('*');
      if (debtData) {
        setDebts(debtData.map((d: any) => ({
          ...d,
          principal_cents: Number(d.principal_cents),
          interest_rate_permille: Number(d.apr_bps) / 10 || 15,
          minimum_payment_cents: Number(d.min_payment_cents),
          strategy: d.strategy || 'avalanche',
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('realtime_all_finances')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debts' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData]);

  const netWorthCents = accounts.reduce((acc, curr) => acc + (curr.balance_cents || 0), 0);

  return {
    loading,
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
    refetch: fetchData,
  };
}
