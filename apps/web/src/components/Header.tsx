'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCentsToCurrency } from '@equilibrium/ui';
import { Scale, Plus, Command, Moon, Sun, UserPlus, LogOut, Bell, Heart, Coins } from 'lucide-react';
import { Profile, Category, Transaction, Budget, Goal, Debt } from '@/hooks/useHouseholdData';
import { NotificationsModal } from './notifications/NotificationsModal';

interface HeaderProps {
  onOpenQuickAdd: () => void;
  onOpenNewTransaction: () => void;
  onOpenInvite: () => void;
  netWorthCents: number;
  householdName: string;
  userProfile: Profile | null;
  categories?: Category[];
  transactions?: Transaction[];
  budgets?: Budget[];
  goals?: Goal[];
  debts?: Debt[];
}

export function Header({
  onOpenQuickAdd,
  onOpenNewTransaction,
  onOpenInvite,
  netWorthCents,
  householdName,
  userProfile,
  categories = [],
  transactions = [],
  budgets = [],
  goals = [],
  debts = [],
}: HeaderProps) {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currency, setCurrency] = useState<'EUR' | 'BRL'>('EUR');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Light mode padrão primário
    const savedTheme = localStorage.getItem('equilibrium-theme');
    const isDark = savedTheme === 'dark';
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Moeda padrão EUR
    const savedCurr = localStorage.getItem('zero7nove-currency') as 'EUR' | 'BRL';
    if (savedCurr === 'BRL' || savedCurr === 'EUR') {
      setCurrency(savedCurr);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('equilibrium-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('equilibrium-theme', 'light');
    }
  };

  const handleCurrencyChange = (curr: 'EUR' | 'BRL') => {
    setCurrency(curr);
    localStorage.setItem('zero7nove-currency', curr);
    // Dispara evento customizado para atualizar formatadores da página se necessário
    window.dispatchEvent(new CustomEvent('currency-change', { detail: curr }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="border-b border-hairline bg-paper/95 backdrop-blur-sm sticky top-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4">
        
        {/* Row 1 (<md) or Left Side (>=md): Brand Zero7Nove, Nossas Contas & Controls */}
        <div className="flex items-center justify-between gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-hairline rounded-[6px] text-ink font-bold text-sm sm:text-base shadow-xs">
              <Heart className="w-4 h-4 text-brand fill-brand/20 stroke-brand stroke-[2]" />
              <div className="flex items-baseline gap-1">
                <span className="font-display tracking-tight text-ink font-semibold">Zero7Nove</span>
                <span className="font-mono text-[9px] text-ink-3 font-normal">07•09</span>
              </div>
            </div>

            {/* Tag Nossas Contas */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-surface-2 border border-hairline rounded-[4px] text-[11px] sm:text-xs text-ink-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0 animate-pulse"></span>
              <span className="font-medium text-ink">Nossas Contas</span>
            </div>
          </div>

          {/* User Controls on Mobile (Right of Row 1) */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* Currency Selector Mobile */}
            <div className="flex items-center p-0.5 bg-surface-2 border border-hairline rounded-[6px] text-[10px] font-mono">
              <button
                onClick={() => handleCurrencyChange('EUR')}
                className={`px-1.5 py-0.5 rounded-[4px] font-semibold transition-editorial cursor-pointer ${
                  currency === 'EUR' ? 'bg-surface text-ink shadow-2xs font-bold' : 'text-ink-3 hover:text-ink'
                }`}
              >
                €
              </button>
              <button
                onClick={() => handleCurrencyChange('BRL')}
                className={`px-1.5 py-0.5 rounded-[4px] font-semibold transition-editorial cursor-pointer ${
                  currency === 'BRL' ? 'bg-surface text-ink shadow-2xs font-bold' : 'text-ink-3 hover:text-ink'
                }`}
              >
                R$
              </button>
            </div>

            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="p-1.5 text-ink-2 hover:text-ink bg-surface border border-hairline rounded-[4px] relative"
              title="Notificações e Alertas"
              aria-label="Notificações e Alertas"
            >
              <Bell className="w-3.5 h-3.5 stroke-[1.5]" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand rounded-full" />
            </button>

            <button
              onClick={onOpenInvite}
              className="p-1 text-ink-2 hover:text-ink bg-surface border border-hairline rounded-[4px]"
              title="Convidar parceiro"
              aria-label="Convidar parceiro"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-1 text-ink-2 hover:text-ink bg-surface border border-hairline rounded-[4px]"
              aria-label="Alternar Tema Claro/Escuro"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-warning stroke-[1.5]" /> : <Moon className="w-3.5 h-3.5 stroke-[1.5]" />}
            </button>

            {/* Foto do Casal no Mobile */}
            <div
              className="w-6 h-6 rounded-full overflow-hidden border border-brand/40 shadow-xs flex items-center justify-center bg-surface-2 ml-1"
              title={userProfile?.full_name || 'Manoel & Amor'}
            >
              <img
                src="/couple/couple-home.jpg"
                alt="Casal"
                className="w-full h-full object-cover"
              />
            </div>

            <button
              onClick={handleLogout}
              className="p-1 text-ink-3 hover:text-danger rounded-[4px]"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          </div>
        </div>

        {/* Row 2 (<md) or Right Side (>=md): Net worth, Quick Add, Currency & Transactions */}
        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto pt-1 md:pt-0 border-t md:border-t-0 border-hairline/60">
          
          {/* Net Worth Summary Badge */}
          <div className="flex items-center md:flex-col md:items-end gap-1.5 md:gap-0 px-2.5 py-1 bg-surface border border-hairline rounded-[6px]">
            <span className="micro-label text-[9px] sm:text-[10px]">Patrimônio:</span>
            <span className="text-xs font-semibold font-mono text-ink tnum">
              {formatCentsToCurrency(netWorthCents, currency)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Desktop Currency Selector (€ EUR / R$ BRL) */}
            <div className="hidden sm:flex items-center p-0.5 bg-surface-2 border border-hairline rounded-[6px] text-[10px] font-mono">
              <button
                onClick={() => handleCurrencyChange('EUR')}
                className={`px-2 py-1 rounded-[4px] font-semibold transition-editorial cursor-pointer ${
                  currency === 'EUR' ? 'bg-surface text-ink shadow-2xs font-bold' : 'text-ink-3 hover:text-ink'
                }`}
                title="Visualizar em Euros (€)"
              >
                € EUR
              </button>
              <button
                onClick={() => handleCurrencyChange('BRL')}
                className={`px-2 py-1 rounded-[4px] font-semibold transition-editorial cursor-pointer ${
                  currency === 'BRL' ? 'bg-surface text-ink shadow-2xs font-bold' : 'text-ink-3 hover:text-ink'
                }`}
                title="Visualizar em Reais (R$)"
              >
                R$ BRL
              </button>
            </div>

            {/* Quick-Add Button (⌘K) */}
            <button
              onClick={onOpenQuickAdd}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-surface hover:bg-surface-2 border border-hairline rounded-[6px] text-xs font-medium text-ink transition-editorial cursor-pointer shadow-sm"
              title="Adicionar rápido (⌘K)"
            >
              <span className="hidden sm:inline">Adicionar</span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-surface-2 border border-hairline rounded-[4px] text-[10px] font-mono text-ink-3">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            </button>

            {/* New Transaction Button */}
            <button
              onClick={onOpenNewTransaction}
              className="flex items-center gap-1 px-3 sm:px-3.5 py-1.5 bg-brand hover:bg-brand/90 text-paper rounded-[6px] font-semibold text-xs transition-editorial cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Transação</span>
            </button>

            {/* Desktop-only Notification, Invite, Theme & Couple Avatar */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-hairline">
              <button
                onClick={() => setIsNotificationsOpen(true)}
                className="p-1.5 text-ink-2 hover:text-ink bg-surface hover:bg-surface-2 border border-hairline rounded-[6px] transition-editorial cursor-pointer relative"
                title="Central de Notificações & Alertas"
                aria-label="Notificações"
              >
                <Bell className="w-4 h-4 stroke-[1.5]" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-brand rounded-full animate-pulse" />
              </button>

              <button
                onClick={onOpenInvite}
                className="p-1.5 text-ink-2 hover:text-ink bg-surface hover:bg-surface-2 border border-hairline rounded-[6px] transition-editorial cursor-pointer"
                title="Convidar parceiro para o casal"
                aria-label="Convidar parceiro"
              >
                <UserPlus className="w-4 h-4 stroke-[1.5]" />
              </button>

              <button
                onClick={toggleTheme}
                className="p-1.5 text-ink-2 hover:text-ink bg-surface hover:bg-surface-2 border border-hairline rounded-[6px] transition-editorial cursor-pointer"
                aria-label="Alternar Tema Claro/Escuro"
                title={isDarkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-warning stroke-[1.5]" /> : <Moon className="w-4 h-4 stroke-[1.5]" />}
              </button>

              {/* Foto do Casal no Desktop */}
              <div
                className="w-7 h-7 rounded-full overflow-hidden border border-brand/40 shadow-xs flex items-center justify-center bg-surface-2"
                title={userProfile?.full_name || 'Manoel & Amor'}
              >
                <img
                  src="/couple/couple-home.jpg"
                  alt="Casal"
                  className="w-full h-full object-cover"
                />
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 text-ink-3 hover:text-danger rounded-[4px] transition-editorial cursor-pointer"
                title="Sair da conta"
                aria-label="Encerrar sessão"
              >
                <LogOut className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Modal de Notificações */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        categories={categories}
        transactions={transactions}
        budgets={budgets}
        goals={goals}
        debts={debts}
      />
    </header>
  );
}
