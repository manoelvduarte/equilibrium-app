'use client';

import React, { useState } from 'react';
import { parseBRLToCents, formatCentsToBRL } from '@equilibrium/ui';
import { setBudgetLimit } from '@/actions/financeActions';
import { Category } from '@/hooks/useHouseholdData';
import { PieChart, X, Check, AlertCircle, Loader2 } from 'lucide-react';

interface EditBudgetModalProps {
  isOpen: boolean;
  categories: Category[];
  currentLimits: Map<string, number>;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function EditBudgetModal({
  isOpen,
  categories,
  currentLimits,
  onClose,
  onSuccess,
}: EditBudgetModalProps) {
  const [limitsMap, setLimitsMap] = useState<{ [categoryId: string]: string }>(() => {
    const init: { [categoryId: string]: string } = {};
    categories.forEach((c) => {
      const existing = currentLimits.get(c.id) || 150000;
      init[c.id] = (existing / 100).toFixed(2).replace('.', ',');
    });
    return init;
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const promises = categories.map((cat) => {
        const valStr = limitsMap[cat.id] || '0';
        const limitCents = parseBRLToCents(valStr);
        return setBudgetLimit({
          categoryId: cat.id,
          month: currentMonth,
          year: currentYear,
          limitCents,
        });
      });

      await Promise.all(promises);
      onClose();
      await onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao salvar tetos orçamentários.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-brand" />
            <h2 className="font-display font-medium text-base sm:text-lg text-ink">Ajustar Tetos de Orçamento</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-3 hover:text-ink rounded-[4px] transition-editorial cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-2.5 bg-surface-2 border border-hairline rounded-[6px] flex items-center gap-2 text-xs text-danger my-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-3 py-3 text-xs">
          <p className="text-ink-2 text-[11px]">
            Defina o limite máximo de gastos mensais para cada categoria do casal.
          </p>

          <div className="space-y-2 divide-y divide-hairline">
            {categories.filter(c => c.kind === 'expense').map((cat) => (
              <div key={cat.id} className="pt-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color || '#5F7461' }}
                  />
                  <div>
                    <span className="font-medium text-ink block">{cat.name}</span>
                    <span className="text-[10px] text-ink-3 capitalize">Modelo: {cat.budget_style}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-ink-3 font-mono text-xs">R$</span>
                  <input
                    type="text"
                    value={limitsMap[cat.id] ?? ''}
                    onChange={(e) =>
                      setLimitsMap((prev) => ({
                        ...prev,
                        [cat.id]: e.target.value,
                      }))
                    }
                    placeholder="1.500,00"
                    className="w-28 p-1.5 bg-paper border border-hairline rounded-[4px] text-xs font-mono text-ink text-right focus:outline-none focus:border-ink transition-editorial"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-hairline flex-shrink-0">
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
              <span>Salvar Tetos</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
