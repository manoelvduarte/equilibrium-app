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
    <header className="border-b border-hairline bg-paper/90 sticky top-0 z-40 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Household Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-surface border border-hairline rounded-[6px] text-ink font-bold text-base shadow-sm">
            <Scale className="w-4 h-4 text-brand stroke-[2]" />
            <span className="font-display tracking-tight">Equilibrium</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-surface-2 border border-hairline rounded-[4px] text-xs text-ink-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
            <span className="font-medium text-ink">{householdName}</span>
            <span className="text-ink-3">|</span>
            <span className="text-ink-3 font-mono text-[11px]">BRL (R$)</span>
          </div>
        </div>

        {/* Actions & Profile Controls */}
        <div className="flex items-center gap-2.5">
          
          {/* Net Worth Summary Badge */}
          <div className="hidden md:flex flex-col items-end px-3 py-1 bg-surface border border-hairline rounded-[6px]">
            <span className="micro-label">Patrimônio Líquido</span>
            <span className="text-xs font-semibold font-mono text-ink tnum">
              {formatCentsToBRL(netWorthCents)}
            </span>
          </div>

          {/* Quick-Add Button (⌘K) */}
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-2 border border-hairline rounded-[6px] text-xs font-medium text-ink transition-editorial cursor-pointer shadow-sm"
            title="Adicionar rápido (⌘K)"
          >
            <span className="hidden sm:inline">Adicionar Rápido</span>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-surface-2 border border-hairline rounded-[4px] text-[10px] font-mono text-ink-3">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>

          {/* New Transaction Button */}
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand hover:bg-brand/90 text-paper rounded-[6px] font-semibold text-xs transition-editorial cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Transação</span>
          </button>

          {/* Invite Partner Button */}
          <button
            onClick={onOpenInvite}
            className="p-1.5 text-ink-2 hover:text-ink bg-surface hover:bg-surface-2 border border-hairline rounded-[6px] transition-editorial cursor-pointer"
            title="Convidar parceiro para o casal"
            aria-label="Convidar parceiro"
          >
            <UserPlus className="w-4 h-4 stroke-[1.5]" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-ink-2 hover:text-ink bg-surface hover:bg-surface-2 border border-hairline rounded-[6px] transition-editorial cursor-pointer"
            aria-label="Alternar Tema Claro/Escuro"
            title={isDarkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-warning stroke-[1.5]" /> : <Moon className="w-4 h-4 stroke-[1.5]" />}
          </button>

          {/* User Initials Avatar & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-hairline">
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
    </header>
  );
}
