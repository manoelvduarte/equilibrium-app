'use client';

import React, { useState } from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { MOCK_PROFILES } from '@equilibrium/db';
import { Sparkles, Plus, Command, Moon, Sun, Scale, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenQuickAdd: () => void;
  onOpenNewTransaction: () => void;
  netWorthCents: number;
}

export function Header({ onOpenQuickAdd, onOpenNewTransaction, netWorthCents }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const activeProfile = MOCK_PROFILES[0]; // Alex

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Household Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xl px-3 py-1.5 rounded-xl shadow-lg shadow-emerald-500/20">
            <Scale className="w-6 h-6 stroke-[2.5]" />
            <span>Equilibrium</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800/60 border border-slate-700/60 rounded-lg text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium text-slate-200">Nosso Casa</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 font-mono">BRL (R$)</span>
          </div>
        </div>

        {/* Net Worth Badge & Controls */}
        <div className="flex items-center gap-3">
          
          {/* Net Worth Summary */}
          <div className="hidden md:flex flex-col items-end px-4 py-1 bg-slate-800/40 border border-slate-800 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Patrimônio Líquido</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              {formatCentsToBRL(netWorthCents)}
            </span>
          </div>

          {/* Quick-Add NLP Button (⌘K) */}
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition shadow-sm"
            title="Adicionar rápido em linguagem natural (⌘K)"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Quick Add</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-slate-400">
              <Command className="w-3 h-3" /> K
            </kbd>
          </button>

          {/* New Transaction Button */}
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Transação</span>
          </button>

          {/* Dark/Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700/60 rounded-xl transition"
            aria-label="Alternar Tema"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <img
              src={activeProfile.avatarUrl}
              alt={activeProfile.fullName}
              className="w-8 h-8 rounded-full border border-emerald-500/50 object-cover"
            />
          </div>

        </div>

      </div>
    </header>
  );
}
