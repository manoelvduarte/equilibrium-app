'use client';

import React, { useState, useEffect } from 'react';
import { useHouseholdData } from '@/hooks/useHouseholdData';
import { Header } from '@/components/Header';
import { DashboardModule } from '@/components/DashboardModule';
import { TransactionsModule } from '@/components/TransactionsModule';
import { BudgetModule } from '@/components/BudgetModule';
import { GoalsDebtsModule } from '@/components/GoalsDebtsModule';
import { QuickAddModal } from '@/components/QuickAddModal';
import { InvitePartnerModal } from '@/components/InvitePartnerModal';
import { AssistantDrawer } from '@/components/assistant/AssistantDrawer';
import { LayoutDashboard, Receipt, PieChart, Target } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budget' | 'goals'>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const {
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
    refetch,
  } = useHouseholdData();

  // Atalho global ⌘K para Quick Add
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickAddOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      
      {/* Header com dados reais e avatar */}
      <Header
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenNewTransaction={() => {
          setActiveTab('transactions');
          setIsNewTxOpen(true);
        }}
        onOpenInvite={() => setIsInviteOpen(true)}
        netWorthCents={netWorthCents}
        householdName={householdName}
        userProfile={userProfile}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Navigation Tabs (Sem códigos M2/M3) */}
        <nav className="flex items-center gap-1 border-b border-hairline pb-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] font-medium transition-editorial cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-surface text-ink border border-hairline shadow-sm'
                : 'text-ink-2 hover:text-ink hover:bg-surface-2'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] font-medium transition-editorial cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-surface text-ink border border-hairline shadow-sm'
                : 'text-ink-2 hover:text-ink hover:bg-surface-2'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Transações</span>
            {transactions.length > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 bg-surface-2 rounded-[4px] text-ink-3">
                {transactions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] font-medium transition-editorial cursor-pointer ${
              activeTab === 'budget'
                ? 'bg-surface text-ink border border-hairline shadow-sm'
                : 'text-ink-2 hover:text-ink hover:bg-surface-2'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Orçamento Duplo</span>
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] font-medium transition-editorial cursor-pointer ${
              activeTab === 'goals'
                ? 'bg-surface text-ink border border-hairline shadow-sm'
                : 'text-ink-2 hover:text-ink hover:bg-surface-2'
            }`}
          >
            <Target className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Metas & Dívidas</span>
          </button>
        </nav>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-20 bg-surface-2 border border-hairline rounded-[12px]" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 h-72 bg-surface-2 border border-hairline rounded-[12px]" />
              <div className="lg:col-span-4 h-72 bg-surface-2 border border-hairline rounded-[12px]" />
            </div>
          </div>
        )}

        {/* Active Tab View */}
        {!loading && (
          <>
            {activeTab === 'dashboard' && (
              <DashboardModule
                accounts={accounts}
                categories={categories}
                transactions={transactions}
                partners={partners}
                netWorthCents={netWorthCents}
                onOpenNewTransaction={() => {
                  setActiveTab('transactions');
                  setIsNewTxOpen(true);
                }}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsModule
                accounts={accounts}
                categories={categories}
                transactions={transactions}
                userProfile={userProfile}
                onRefresh={refetch}
                isNewModalOpen={isNewTxOpen}
                onCloseNewModal={() => setIsNewTxOpen(false)}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetModule
                categories={categories}
                transactions={transactions}
                budgets={budgets}
                onOpenNewTransaction={() => {
                  setActiveTab('transactions');
                  setIsNewTxOpen(true);
                }}
              />
            )}

            {activeTab === 'goals' && (
              <GoalsDebtsModule
                goals={goals}
                debts={debts}
              />
            )}
          </>
        )}

      </main>

      {/* Quick Add Modal (⌘K) */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={refetch}
        accounts={accounts}
        categories={categories}
        userProfile={userProfile}
      />

      {/* Invite Partner Modal */}
      <InvitePartnerModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        userProfile={userProfile}
      />

      {/* Assistente IA Real com Tool Calling e Aprovação Humana */}
      <AssistantDrawer onActionExecuted={refetch} />

    </div>
  );
}
