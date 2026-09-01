import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface MobileAccount {
  id: string;
  name: string;
  type: string;
  visibility: 'private' | 'balance_only' | 'shared';
  owner_id: string | null;
  balance_cents: number;
}

export interface MobileCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: 'expense' | 'income';
  budget_style: 'fixed' | 'flex' | 'envelope';
}

export interface MobileProfile {
  id: string;
  full_name: string;
  email: string | null;
  household_id: string;
}

export interface MobileTransaction {
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
  source?: 'manual' | 'csv' | 'ofx' | 'ai' | 'ocr';
  account?: { name: string };
  category?: { name: string; icon: string; color: string };
}

export interface MobileHouseholdSummary {
  householdName: string;
  userProfile: MobileProfile | null;
  partners: MobileProfile[];
  accounts: MobileAccount[];
  categories: MobileCategory[];
  transactions: MobileTransaction[];
  netWorthCents: number;
  monthlyIncomeCents: number;
  monthlyExpenseCents: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useHouseholdDataMobile(): MobileHouseholdSummary {
  const [loading, setLoading] = useState(true);
  const [householdName, setHouseholdName] = useState('Nosso Casa');
  const [userProfile, setUserProfile] = useState<MobileProfile | null>(null);
  const [partners, setPartners] = useState<MobileProfile[]>([]);
  const [accounts, setAccounts] = useState<MobileAccount[]>([]);
  const [categories, setCategories] = useState<MobileCategory[]>([]);
  const [transactions, setTransactions] = useState<MobileTransaction[]>([]);

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

        // 2. Household
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

      // 3. Contas e Saldos
      const { data: accData } = await supabase
        .from('accounts')
        .select('id, name, type, visibility, owner_id');

      const { data: balancesData } = await supabase
        .from('account_balances')
        .select('account_id, balance_cents');

      const balancesMap = new Map<string, number>();
      balancesData?.forEach((b: any) => balancesMap.set(b.account_id, Number(b.balance_cents)));

      if (accData) {
        const enrichedAccounts: MobileAccount[] = accData.map((a: any) => ({
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

      if (catData) {
        setCategories(catData);
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
          categories:category_id ( name, icon, color )
        `)
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (txData) {
        const mappedTx: MobileTransaction[] = txData.map((t: any) => ({
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
        }));
        setTransactions(mappedTx);
      }

    } catch (err) {
      console.error('Erro ao buscar dados mobile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription na tabela transactions
  useEffect(() => {
    const channel = supabase
      .channel('mobile_realtime_tx')
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
  }, [fetchData]);

  const netWorthCents = accounts.reduce((acc, curr) => acc + (curr.balance_cents || 0), 0);

  // Calcular despesas e receitas do mês corrente
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const monthlyTransactions = transactions.filter((t) => t.date?.startsWith(currentMonthPrefix));

  const monthlyIncomeCents = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount_cents, 0);

  const monthlyExpenseCents = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount_cents, 0);

  return {
    householdName,
    userProfile,
    partners,
    accounts,
    categories,
    transactions,
    netWorthCents,
    monthlyIncomeCents,
    monthlyExpenseCents,
    loading,
    refetch: fetchData,
  };
}
