'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { QuickAddModal } from '@/components/QuickAddModal';
import { TransactionsModule } from '@/components/TransactionsModule';
import { BudgetModule } from '@/components/BudgetModule';
import { DashboardModule } from '@/components/DashboardModule';
import { AIChatDrawer } from '@/components/AIChatDrawer';
import { ImportWizardModal } from '@/components/ImportWizardModal';
import { ReceiptOCRModal } from '@/components/ReceiptOCRModal';
import { GoalsDebtsModule } from '@/components/GoalsDebtsModule';
import {
  generateMockTransactions,
  TransactionMock,
  MOCK_ACCOUNTS,
} from '@equilibrium/db';
import { LayoutDashboard, Receipt, PieChart, Upload, Camera, Target } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budget' | 'goals'>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isOCROpen, setIsOCROpen] = useState(false);
  const [transactions, setTransactions] = useState<TransactionMock[]>(generateMockTransactions());

  // Calcula patrimônio líquido
  const netWorthCents = MOCK_ACCOUNTS.reduce((sum, acc) => sum + acc.balanceCents, 0);

  const handleAddTransaction = (newTx: Partial<TransactionMock>) => {
    const tx: TransactionMock = {
      id: `tx-${Date.now()}`,
      accountId: newTx.accountId || MOCK_ACCOUNTS[0].id,
      categoryId: newTx.categoryId || null,
      type: newTx.type || 'expense',
      amountCents: newTx.amountCents || 1000,
      date: newTx.date || new Date().toISOString().split('T')[0],
      description: newTx.description || 'Nova Transação',
      merchant: newTx.merchant || null,
      notes: newTx.notes || null,
      tags: newTx.tags || [],
      source: newTx.source || 'manual',
      version: 1,
      createdById: 'prof-alex-uuid',
    };

    setTransactions((prev) => [tx, ...prev]);
  };

  const handleImportBatch = (batch: Partial<TransactionMock>[]) => {
    batch.forEach((item) => handleAddTransaction(item));
  };

  const handleUpdateTransaction = (id: string, updated: Partial<TransactionMock>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updated, version: t.version + 1 } : t))
    );
  };

  const handleSoftDeleteTransaction = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, deletedAt: new Date().toISOString() } : t))
    );
  };

  const handleRestoreTransaction = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, deletedAt: null } : t))
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12">
      
      {/* Header */}
      <Header
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenNewTransaction={() => setActiveTab('transactions')}
        netWorthCents={netWorthCents}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        
        {/* Navigation Tabs & Utility Modals Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard & Insights (M4)</span>
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'transactions'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Transações (M2)</span>
            </button>

            <button
              onClick={() => setActiveTab('budget')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'budget'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Orçamento Duplo (M3)</span>
            </button>

            <button
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'goals'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Metas & Dívidas (M9)</span>
            </button>
          </div>

          {/* Import & OCR Quick Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-slate-300 transition"
              title="Importar extrato CSV, OFX ou QIF"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Importar Extrato</span>
            </button>

            <button
              onClick={() => setIsOCROpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-slate-300 transition"
              title="Digitalizar foto de recibo com OCR"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>OCR Recibo</span>
            </button>
          </div>

        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && <DashboardModule />}
        {activeTab === 'transactions' && (
          <TransactionsModule
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onSoftDeleteTransaction={handleSoftDeleteTransaction}
            onRestoreTransaction={handleRestoreTransaction}
          />
        )}
        {activeTab === 'budget' && <BudgetModule />}
        {activeTab === 'goals' && <GoalsDebtsModule />}

      </main>

      {/* Quick Add NLP Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAddTransaction={handleAddTransaction}
      />

      {/* Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportBatch={handleImportBatch}
      />

      {/* OCR Receipt Modal */}
      <ReceiptOCRModal
        isOpen={isOCROpen}
        onClose={() => setIsOCROpen(false)}
        onConfirmOCR={handleAddTransaction}
      />

      {/* AI Chat Drawer & Approval Flow */}
      <AIChatDrawer onAddTransaction={handleAddTransaction} />

    </div>
  );
}
