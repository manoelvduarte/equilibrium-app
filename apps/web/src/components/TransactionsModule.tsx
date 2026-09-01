'use client';

import React, { useState } from 'react';
import { formatCentsToBRL, parseBRLToCents } from '@equilibrium/ui';
import {
  TransactionMock,
  MOCK_ACCOUNTS,
  MOCK_CATEGORIES,
  MOCK_PROFILES,
  MOCK_HISTORY,
  HistoryMock,
} from '@equilibrium/db';
import {
  Search,
  Filter,
  Trash2,
  History,
  RotateCcw,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Users,
  Tag,
  Calendar,
  X,
  Check,
  Plus,
} from 'lucide-react';

interface TransactionsModuleProps {
  transactions: TransactionMock[];
  onAddTransaction: (tx: Partial<TransactionMock>) => void;
  onUpdateTransaction: (id: string, updated: Partial<TransactionMock>) => void;
  onSoftDeleteTransaction: (id: string) => void;
  onRestoreTransaction: (id: string) => void;
}

export function TransactionsModule({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onSoftDeleteTransaction,
  onRestoreTransaction,
}: TransactionsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedHistory, setSelectedHistory] = useState<HistoryMock | null>(null);
  const [deletedToastId, setDeletedToastId] = useState<string | null>(null);

  // Filter logic
  const activeTransactions = transactions.filter((t) => !t.deletedAt);
  const filtered = activeTransactions.filter((tx) => {
    const matchSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.merchant && tx.merchant.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = selectedCategory === 'all' || tx.categoryId === selectedCategory;
    const matchAcc = selectedAccount === 'all' || tx.accountId === selectedAccount;
    return matchSearch && matchCat && matchAcc;
  });

  const handleDelete = (id: string) => {
    onSoftDeleteTransaction(id);
    setDeletedToastId(id);
    setTimeout(() => {
      setDeletedToastId((current) => (current === id ? null : current));
    }, 5000);
  };

  const handleUndo = (id: string) => {
    onRestoreTransaction(id);
    setDeletedToastId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Undo Notification */}
      {deletedToastId && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center justify-between gap-4 px-5 py-3.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 text-slate-200 text-xs font-medium">
            <Trash2 className="w-4 h-4 text-amber-400" />
            <span>Transação removida (Soft delete aplicado).</span>
          </div>
          <button
            onClick={() => handleUndo(deletedToastId)}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Desfazer (Undo)</span>
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição ou estabelecimento..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-300 text-xs font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas as Categorias</option>
            {MOCK_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-300 text-xs font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas as Contas</option>
            {MOCK_ACCOUNTS.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 uppercase text-[10px] text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Data / Descrição</th>
                <th className="px-4 py-3.5">Categoria</th>
                <th className="px-4 py-3.5">Conta</th>
                <th className="px-4 py-3.5">Rateio (Casal)</th>
                <th className="px-4 py-3.5 text-right">Valor</th>
                <th className="px-4 py-3.5 text-center">Versão</th>
                <th className="px-4 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((tx) => {
                const category = MOCK_CATEGORIES.find((c) => c.id === tx.categoryId);
                const account = MOCK_ACCOUNTS.find((a) => a.id === tx.accountId);

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    
                    {/* Descrição & Data */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl border ${
                            tx.type === 'income'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : tx.type === 'expense'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                          }`}
                        >
                          {tx.type === 'income' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : tx.type === 'expense' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowRightLeft className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                            <span>{tx.description}</span>
                            {tx.merchant && (
                              <span className="text-[10px] font-normal px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">
                                {tx.merchant}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-mono">
                            <Calendar className="w-3 h-3 text-slate-600" />
                            <span>{tx.date}</span>
                            {tx.tags.length > 0 && (
                              <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                                #{tx.tags[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="px-4 py-4">
                      {category ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 font-medium text-slate-300">
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Sem categoria</span>
                      )}
                    </td>

                    {/* Conta */}
                    <td className="px-4 py-4">
                      <span className="text-slate-300 font-medium">{account?.name || '—'}</span>
                    </td>

                    {/* Rateio Casal (Permilagem) */}
                    <td className="px-4 py-4">
                      {tx.split ? (
                        <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-lg w-fit">
                          <Users className="w-3 h-3" />
                          <span>500‰ / 500‰ (50%)</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Individual</span>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-4 text-right font-mono font-bold text-sm">
                      <span
                        className={
                          tx.type === 'income'
                            ? 'text-emerald-400'
                            : tx.type === 'expense'
                            ? 'text-slate-100'
                            : 'text-indigo-400'
                        }
                      >
                        {tx.type === 'expense' ? '-' : '+'}
                        {formatCentsToBRL(tx.amountCents)}
                      </span>
                    </td>

                    {/* Versão (Crachá interativo de Histórico) */}
                    <td className="px-4 py-4 text-center">
                      {tx.version > 1 ? (
                        <button
                          onClick={() => setSelectedHistory(MOCK_HISTORY[0])}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded font-mono text-[10px] font-bold transition"
                          title="Clique para ver histórico de alterações"
                        >
                          <History className="w-3 h-3" />
                          <span>v{tx.version}</span>
                        </button>
                      ) : (
                        <span className="font-mono text-[10px] text-slate-500">v1</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Remover transação (Soft Delete)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Drawer / Modal */}
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <History className="w-4 h-4" />
                <span>Histórico da Transação (Audit Trail)</span>
              </div>
              <button onClick={() => setSelectedHistory(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-400">Versão Anterior (v1)</span>
                <p className="font-semibold text-slate-200">{selectedHistory.snapshot.description}</p>
                <p className="font-mono text-slate-400">Valor Original: {formatCentsToBRL(selectedHistory.snapshot.amountCents)}</p>
                <p className="text-[10px] text-slate-500 font-mono">Modificado em: {selectedHistory.createdAt}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedHistory(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
