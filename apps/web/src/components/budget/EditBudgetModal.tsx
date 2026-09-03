'use client';

import React, { useState, useEffect } from 'react';
import { parseBRLToCents, formatCentsToBRL } from '@equilibrium/ui';
import { createClient } from '@/lib/supabase/client';
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
  const [limitsMap, setLimitsMap] = useState<{ [categoryId: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicializa com os limites reais (se não tiver limite, deixa vazio ou 0,00)
  useEffect(() => {
    if (isOpen) {
      const init: { [categoryId: string]: string } = {};
      categories.forEach((c) => {
        const existing = currentLimits.get(c.id);
        init[c.id] = existing && existing > 0 ? (existing / 100).toFixed(2).replace('.', ',') : '';
      });
      setLimitsMap(init);
      setErrorMessage(null);
    }
  }, [isOpen, categories, currentLimits]);

  if (!isOpen) return null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Prepara os registros para upsert único no Supabase
      const recordsToUpsert = categories
        .filter((cat) => cat.kind === 'expense')
        .map((cat) => {
          const valStr = limitsMap[cat.id] || '0';
          const limitCents = parseBRLToCents(valStr);
          return {
            household_id: profile.household_id,
            category_id: cat.id,
            month: currentMonth,
            year: currentYear,
            limit_cents: limitCents,
            envelope_cents: limitCents,
          };
        });

      const { error: upsertErr } = await supabase
        .from('budgets')
        .upsert(recordsToUpsert, {
          onConflict: 'household_id,category_id,month,year',
        });

      if (upsertErr) throw upsertErr;

      onClose();
      await onSuccess();
    } catch (err: any) {
      console.error('Erro ao salvar tetos:', err);
      setErrorMessage(err.message || 'Falha ao salvar tetos orçamentários.');
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.kind === 'expense');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-brand" />
            <h2 className="font-display font-medium text-base sm:text-lg text-ink">
              Definir Tetos e Valores Mensais
            </h2>
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
          <p className="text-ink-2 text-[11px] leading-relaxed">
            Defina o valor da parcela (ex: <strong>Prestação Bibi</strong>) ou o teto máximo que o casal planeja gastar em cada categoria para este mês.
          </p>

          <div className="space-y-2 divide-y divide-hairline">
            {expenseCategories.map((cat) => {
              const isFixed = cat.budget_style === 'fixed';
              const isEnvelope = cat.budget_style === 'envelope';

              return (
                <div key={cat.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#5F7461' }}
                    />
                    <div className="min-w-0">
                      <span className="font-medium text-ink truncate block text-xs">{cat.name}</span>
                      <span className="text-[10px] text-ink-3">
                        {isFixed ? 'Custo Fixo / Parcela' : isEnvelope ? 'Envelope Rígido' : 'Estilo Flexível'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-ink-3 text-[11px]">€ / R$</span>
                    <input
                      type="text"
                      value={limitsMap[cat.id] || ''}
                      onChange={(e) => setLimitsMap({ ...limitsMap, [cat.id]: e.target.value })}
                      placeholder="0,00"
                      className="w-28 p-1.5 bg-paper border border-hairline rounded-[4px] text-xs font-mono font-medium text-ink text-right focus:outline-none focus:border-ink transition-editorial"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline flex-shrink-0">
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
              <span>Salvar Todos os Tetos</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
