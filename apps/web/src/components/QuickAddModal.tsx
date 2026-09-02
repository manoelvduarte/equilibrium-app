'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCentsToBRL, parseNaturalInput } from '@equilibrium/ui';
import { Account, Category, Profile } from '@/hooks/useHouseholdData';
import { Command, X, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  accounts: Account[];
  categories: Category[];
  userProfile: Profile | null;
}

export function QuickAddModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  userProfile,
}: QuickAddModalProps) {
  const [inputStr, setInputStr] = useState('');
  const [parsedDesc, setParsedDesc] = useState('');
  const [parsedCents, setParsedCents] = useState(0);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultAccount = accounts[0]?.id || '';
  const defaultCategory = categories[0]?.id || '';
  const activeAccountId = selectedAccount || defaultAccount;
  const activeCategoryId = selectedCategory || defaultCategory;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputStr(val);

    const parsed = parseNaturalInput(val);
    setParsedDesc(parsed.description);
    setParsedCents(parsed.amountCents);
    setType(parsed.type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedCents <= 0) {
      setError('Por favor, digite a descrição e o valor (Ex: Almoço 45,50).');
      return;
    }
    if (!userProfile?.household_id) {
      setError('Household não identificado. Faça login novamente.');
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      // Se não houver conta selecionada, busca ou cria a conta principal
      let accountIdToUse = activeAccountId;
      if (!accountIdToUse) {
        const { data: firstAcc } = await supabase
          .from('accounts')
          .select('id')
          .eq('household_id', userProfile.household_id)
          .limit(1)
          .single();
        if (firstAcc) {
          accountIdToUse = firstAcc.id;
        } else {
          const { data: createdAcc } = await supabase
            .from('accounts')
            .insert({
              household_id: userProfile.household_id,
              name: 'Conta Principal',
              type: 'checking',
              visibility: 'shared',
              owner_id: userProfile.id,
            })
            .select()
            .single();
          if (createdAcc) accountIdToUse = createdAcc.id;
        }
      }

      const { error: insertError } = await supabase.from('transactions').insert({
        household_id: userProfile.household_id,
        account_id: accountIdToUse,
        category_id: activeCategoryId || null,
        created_by_id: userProfile.id,
        description: parsedDesc || inputStr || 'Despesa rápida',
        amount_cents: parsedCents,
        type: type,
        date: new Date().toISOString().split('T')[0],
      });

      if (insertError) throw insertError;

      setInputStr('');
      setParsedCents(0);
      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar transação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-md space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-brand" />
            <h2 className="font-display font-medium text-base sm:text-lg text-ink">Adicionar Rápido (⌘K)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-3 hover:text-ink rounded-[4px] transition-editorial cursor-pointer"
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

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* NLP Input Field */}
          <div className="space-y-1">
            <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
              Digite em linguagem natural
            </label>
            <input
              type="text"
              autoFocus
              value={inputStr}
              onChange={handleInputChange}
              placeholder="Ex: Almoço 45,50, Mercado 180, Salário 8000"
              className="w-full px-3.5 py-2.5 bg-paper border border-hairline rounded-[6px] text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
            />
            <p className="text-[11px] text-ink-3">
              Dica: O sistema extrai automaticamente a descrição e o valor.
            </p>
          </div>

          {/* Realtime Parsing Preview */}
          {parsedCents > 0 && (
            <div className="p-3 bg-surface-2 border border-hairline rounded-[6px] space-y-2">
              <span className="font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Pré-visualização do Registro
              </span>
              <div className="flex items-center justify-between text-xs font-semibold text-ink">
                <span>{parsedDesc || 'Transação'}</span>
                <span className={`font-mono text-sm tnum ${type === 'income' ? 'text-brand' : 'text-danger'}`}>
                  {type === 'income' ? '+' : '−'} {formatCentsToBRL(parsedCents)}
                </span>
              </div>
            </div>
          )}

          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            
            {/* Account Select */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">Conta</label>
              <select
                value={activeAccountId}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-2.5 py-2 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink"
              >
                {accounts.length > 0 ? (
                  accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.visibility === 'shared' ? 'Conjunta' : 'Privada'})
                    </option>
                  ))
                ) : (
                  <option value="">Conta Corrente Principal</option>
                )}
              </select>
            </div>

            {/* Category Select */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">Categoria</label>
              <select
                value={activeCategoryId}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-2 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink"
              >
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="">Alimentação & Mercado</option>
                    <option value="">Moradia & Contas</option>
                    <option value="">Transporte</option>
                    <option value="">Lazer & Restaurantes</option>
                  </>
                )}
              </select>
            </div>

          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-ink-2 hover:text-ink transition-editorial cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || parsedCents <= 0}
              className="px-4 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper font-semibold text-xs rounded-[6px] shadow-sm flex items-center gap-1.5 transition-editorial cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>Confirmar e Salvar</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
