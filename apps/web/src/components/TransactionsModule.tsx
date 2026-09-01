'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCentsToBRL, formatRelativeDate, parseBRLToCents, CategoryIcon } from '@equilibrium/ui';
import { Account, Category, Profile, Transaction } from '@/hooks/useHouseholdData';
import {
  Plus,
  Trash2,
  Undo2,
  Inbox,
  Filter,
  ArrowRight,
  X,
  AlertCircle,
} from 'lucide-react';

interface TransactionsModuleProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  userProfile: Profile | null;
  onRefresh: () => Promise<void>;
  isNewModalOpen?: boolean;
  onCloseNewModal?: () => void;
}

export function TransactionsModule({
  accounts,
  categories,
  transactions,
  userProfile,
  onRefresh,
  isNewModalOpen = false,
  onCloseNewModal,
}: TransactionsModuleProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [deletedTx, setDeletedTx] = useState<Transaction | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  // Form State
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const showModal = isNewModalOpen || internalModalOpen;

  const handleCloseModal = () => {
    setInternalModalOpen(false);
    onCloseNewModal?.();
    setDescription('');
    setAmountStr('');
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseBRLToCents(amountStr);
    if (cents <= 0) {
      setError('Informe um valor válido em reais.');
      return;
    }
    if (!accountId || !userProfile?.household_id) {
      setError('Selecione uma conta válida.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('transactions').insert({
        household_id: userProfile.household_id,
        account_id: accountId,
        category_id: categoryId || null,
        created_by_id: userProfile.id,
        description,
        amount_cents: cents,
        type,
        date: occurredAt,
      });

      if (insertError) throw insertError;

      await onRefresh();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Falha ao criar transação.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tx: Transaction) => {
    try {
      const { error: delError } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', tx.id);

      if (delError) throw delError;

      setDeletedTx(tx);
      await onRefresh();

      if (undoTimer) clearTimeout(undoTimer);
      const timer = setTimeout(() => {
        setDeletedTx(null);
      }, 5000);
      setUndoTimer(timer);
    } catch (err: any) {
      console.error('Erro ao excluir transação:', err);
    }
  };

  const handleUndo = async () => {
    if (!deletedTx) return;
    try {
      await supabase
        .from('transactions')
        .update({ deleted_at: null })
        .eq('id', deletedTx.id);

      setDeletedTx(null);
      if (undoTimer) clearTimeout(undoTimer);
      await onRefresh();
    } catch (err) {
      console.error('Erro ao restaurar transação:', err);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (selectedFilter !== 'all' && t.type !== selectedFilter) return false;
    if (selectedCategory !== 'all' && t.category_id !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <span className="micro-label">Extrato do Casal</span>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            Transações
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Chips */}
          <div className="flex items-center bg-surface border border-hairline rounded-[6px] p-0.5 text-xs">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-[4px] font-medium transition-editorial ${
                selectedFilter === 'all'
                  ? 'bg-surface-2 text-ink shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedFilter('expense')}
              className={`px-2.5 py-1 rounded-[4px] font-medium transition-editorial ${
                selectedFilter === 'expense'
                  ? 'bg-surface-2 text-ink shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Despesas
            </button>
            <button
              onClick={() => setSelectedFilter('income')}
              className={`px-2.5 py-1 rounded-[4px] font-medium transition-editorial ${
                selectedFilter === 'income'
                  ? 'bg-surface-2 text-ink shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Receitas
            </button>
          </div>

          <button
            onClick={() => setInternalModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand/90 text-paper rounded-[6px] font-semibold text-xs transition-editorial shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nova Transação</span>
          </button>
        </div>
      </div>

      {/* Undo Toast Notification */}
      {deletedTx && (
        <div className="fixed bottom-6 right-6 z-50 p-3 bg-surface border border-hairline rounded-[8px] shadow-lg flex items-center justify-between gap-4 max-w-sm">
          <div className="text-xs text-ink">
            Transação <strong className="font-medium">"{deletedTx.description}"</strong> excluída.
          </div>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 px-2.5 py-1 bg-surface-2 hover:bg-hairline text-brand rounded-[4px] text-xs font-semibold transition-editorial cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Desfazer (5s)</span>
          </button>
        </div>
      )}

      {/* Table Section */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 bg-surface border border-hairline rounded-[12px] text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-surface-2 border border-hairline flex items-center justify-center mx-auto text-ink-3">
            <Inbox className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="font-display text-base font-medium text-ink">Nenhuma movimentação encontrada</p>
            <p className="text-xs text-ink-2">Ajuste os filtros ou registre uma nova transação.</p>
          </div>
          <button
            onClick={() => setInternalModalOpen(true)}
            className="px-3.5 py-1.5 bg-surface-2 hover:bg-hairline text-ink rounded-[6px] text-xs font-medium transition-editorial cursor-pointer"
          >
            Adicionar Transação
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-hairline rounded-[12px] overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hairline bg-surface-2/60 text-ink-3">
                <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.08em] text-[10px]">Data</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.08em] text-[10px]">Descrição</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.08em] text-[10px]">Categoria</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.08em] text-[10px]">Conta</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.08em] text-[10px] text-right">Valor</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.08em] text-[10px] text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="h-12 hover:bg-surface-2 transition-editorial group">
                  <td className="py-2.5 px-4 font-mono text-ink-3 text-[11px] whitespace-nowrap">
                    {formatRelativeDate(tx.occurred_at)}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-ink">
                    {tx.description}
                  </td>
                  <td className="py-2.5 px-4 text-ink-2">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface-2 border border-hairline rounded-[4px] text-[11px]">
                      <CategoryIcon name={tx.category?.icon || 'tag'} size={12} className="text-ink-2" />
                      <span>{tx.category?.name || 'Geral'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-ink-3 text-[11px]">
                    {tx.account?.name || 'Principal'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-medium text-xs tnum whitespace-nowrap">
                    <span className={tx.type === 'income' ? 'text-brand' : 'text-danger'}>
                      {tx.type === 'income' ? '+' : '−'}{formatCentsToBRL(tx.amount_cents)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(tx)}
                      className="p-1 text-ink-3 hover:text-danger opacity-0 group-hover:opacity-100 transition-editorial cursor-pointer rounded-[4px]"
                      title="Excluir transação"
                      aria-label="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nova Transação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
          <div className="w-full max-w-lg bg-surface border border-hairline rounded-[12px] p-6 shadow-md space-y-4">
            
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand stroke-[2.5]" />
                <h2 className="font-display font-medium text-lg text-ink">Nova Transação</h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 text-ink-3 hover:text-ink rounded-[4px] transition-editorial"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-surface-2 border border-hairline rounded-[6px] flex items-center gap-2 text-xs text-danger">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5">
              
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-surface-2 border border-hairline rounded-[6px]">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-1.5 text-xs font-semibold rounded-[4px] transition-editorial ${
                    type === 'expense'
                      ? 'bg-surface text-danger shadow-sm'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  Despesa (−)
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-1.5 text-xs font-semibold rounded-[4px] transition-editorial ${
                    type === 'income'
                      ? 'bg-surface text-brand shadow-sm'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  Receita (+)
                </button>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block micro-label">Descrição</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Supermercado Pão de Açúcar"
                  className="w-full px-3 py-2 bg-paper border border-hairline rounded-[6px] text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block micro-label">Valor (R$)</label>
                  <input
                    type="text"
                    required
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-paper border border-hairline rounded-[6px] text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial font-mono tnum"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block micro-label">Data</label>
                  <input
                    type="date"
                    required
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-hairline rounded-[6px] text-sm text-ink focus:outline-none focus:border-ink transition-editorial font-mono"
                  />
                </div>
              </div>

              {/* Account & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block micro-label">Conta</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block micro-label">Categoria</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-2 text-xs font-medium text-ink-2 hover:text-ink transition-editorial"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper font-semibold text-xs rounded-[6px] shadow-sm flex items-center gap-1.5 transition-editorial cursor-pointer"
                >
                  <span>{loading ? 'Salvando...' : 'Salvar Transação'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
