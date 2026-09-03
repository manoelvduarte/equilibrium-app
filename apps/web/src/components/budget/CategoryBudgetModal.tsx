'use client';

import React, { useState, useEffect } from 'react';
import { parseBRLToCents, formatCentsToCurrency } from '@equilibrium/ui';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/hooks/useHouseholdData';
import { X, Check, AlertCircle, Loader2, SlidersHorizontal } from 'lucide-react';

interface CategoryBudgetModalProps {
  isOpen: boolean;
  category: Category | null;
  currentLimitCents: number;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function CategoryBudgetModal({
  isOpen,
  category,
  currentLimitCents,
  onClose,
  onSuccess,
}: CategoryBudgetModalProps) {
  const [valueStr, setValueStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && category) {
      setValueStr(currentLimitCents > 0 ? (currentLimitCents / 100).toFixed(2).replace('.', ',') : '');
      setErrorMessage(null);
    }
  }, [isOpen, category, currentLimitCents]);

  if (!isOpen || !category) return null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const isFixed = category.budget_style === 'fixed';
  const isEnvelope = category.budget_style === 'envelope';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitCents = parseBRLToCents(valueStr);
    if (limitCents < 0) {
      setErrorMessage('Informe um valor válido.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada. Faça login novamente.');

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single();

      if (profErr || !profile?.household_id) {
        throw new Error('Perfil familiar não encontrado.');
      }

      const { error: upsertErr } = await supabase
        .from('budgets')
        .upsert(
          {
            household_id: profile.household_id,
            category_id: category.id,
            month: currentMonth,
            year: currentYear,
            limit_cents: limitCents,
            envelope_cents: limitCents,
          },
          {
            onConflict: 'household_id,category_id,month,year',
          }
        );

      if (upsertErr) throw upsertErr;

      onClose();
      await onSuccess();
    } catch (err: any) {
      console.error('Erro ao salvar valor da categoria:', err);
      setErrorMessage(err.message || 'Falha ao salvar valor da categoria.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-3 sm:p-4">
      <div className="w-full max-w-md bg-surface border border-hairline rounded-[12px] p-5 sm:p-6 shadow-md space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: category.color || '#5F7461' }}
            />
            <div>
              <span className="micro-label text-[9px] block">
                {isFixed ? 'Custo Fixo / Parcela' : isEnvelope ? 'Envelope Rígido' : 'Estilo Flexível'}
              </span>
              <h2 className="font-display font-medium text-base sm:text-lg text-ink leading-tight">
                {category.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-3 hover:text-ink rounded-[4px] transition-editorial cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative description */}
        <div className="p-3 bg-surface-2 border border-hairline rounded-[8px] text-xs text-ink-2 leading-relaxed">
          {isFixed && (
            <p>
              Esta categoria é de <strong>Custo Fixo</strong>. Digite o valor exato da parcela mensal ou conta contratada (ex: valor da parcela do carro, aluguel, condomínio).
            </p>
          )}
          {isEnvelope && (
            <p>
              Esta categoria usa <strong>Envelope Rígido</strong>. Defina quanto dinheiro o casal quer disponibilizar para esta finalidade no mês (ex: alimentação e mercado).
            </p>
          )}
          {!isFixed && !isEnvelope && (
            <p>
              Esta categoria é de <strong>Estilo Flexível</strong>. Defina um teto máximo de gastos desejado para lazer, passeios ou conveniências.
            </p>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-2.5 bg-surface-2 border border-hairline rounded-[6px] flex items-center gap-2 text-xs text-danger">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="block micro-label">
              {isFixed ? 'Valor da Parcela Mensal (€ / R$)' : 'Teto Orçamentário Mensal (€ / R$)'}
            </label>
            <input
              type="text"
              autoFocus
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              placeholder="Ex: 350,00"
              className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-base font-mono font-semibold text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-surface-2 hover:bg-hairline text-ink rounded-[6px] font-medium transition-editorial cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper font-semibold rounded-[6px] transition-editorial cursor-pointer shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isFixed ? 'Salvar Valor da Parcela' : 'Salvar Teto Mensal'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
