'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCentsToBRL } from '@equilibrium/ui';
import { Scale, Plus, Command, Moon, Sun, UserPlus, LogOut } from 'lucide-react';
import { Profile } from '@/hooks/useHouseholdData';

interface HeaderProps {
  onOpenQuickAdd: () => void;
  onOpenNewTransaction: () => void;
  onOpenInvite: () => void;
  netWorthCents: number;
  householdName: string;
  userProfile: Profile | null;
}

export function Header({
  onOpenQuickAdd,
  onOpenNewTransaction,
  onOpenInvite,
  netWorthCents,
  householdName,
  userProfile,
}: HeaderProps) {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'EQ';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="border-b border-hairline bg-paper/95 backdrop-blur-sm sticky top-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4">
        
        {/* Row 1 (<md) or Left Side (>=md): Brand, Household & User Controls */}
        <div className="flex items-center justify-between gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-hairline rounded-[6px] text-ink font-bold text-sm sm:text-base shadow-sm">
              <Scale className="w-4 h-4 text-brand stroke-[2]" />
              <span className="font-display tracking-tight">Equilibrium</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-surface-2 border border-hairline rounded-[4px] text-[11px] sm:text-xs text-ink-2 max-w-[130px] sm:max-w-none truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0"></span>
              <span className="font-medium text-ink truncate">{householdName}</span>
            </div>
          </div>

          {/* User Controls on Mobile (Right of Row 1) */}
          <div className="flex md:hidden items-center gap-1.5">
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

            <div
              className="w-6 h-6 rounded-full bg-surface-2 border border-hairline flex items-center justify-center font-semibold text-[10px] text-ink ml-1"
              title={userProfile?.full_name || 'Usuário'}
            >
              {getInitials(userProfile?.full_name)}
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

        {/* Row 2 (<md) or Right Side (>=md): Net worth, Quick Add & Transactions */}
        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto pt-1 md:pt-0 border-t md:border-t-0 border-hairline/60">
          
          {/* Net Worth Summary Badge */}
          <div className="flex items-center md:flex-col md:items-end gap-1.5 md:gap-0 px-2.5 py-1 bg-surface border border-hairline rounded-[6px]">
            <span className="micro-label text-[9px] sm:text-[10px]">Patrimônio:</span>
            <span className="text-xs font-semibold font-mono text-ink tnum">
              {formatCentsToBRL(netWorthCents)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
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

            {/* Desktop-only Invite, Theme & Avatar Controls */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-hairline">
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

              <div
                className="w-7 h-7 rounded-full bg-surface-2 border border-hairline flex items-center justify-center font-semibold text-[11px] text-ink"
                title={userProfile?.full_name || 'Usuário'}
              >
                {getInitials(userProfile?.full_name)}
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
    </header>
  );
}
