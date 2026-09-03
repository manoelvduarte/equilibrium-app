'use client';

import React, { useState } from 'react';
import { parseBRLToCents } from '@equilibrium/ui';
import { createClient } from '@/lib/supabase/client';
import { TrendingDown, X, Plus, AlertCircle, Loader2 } from 'lucide-react';

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function AddDebtModal({ isOpen, onClose, onSuccess }: AddDebtModalProps) {
  const [name, setName] = useState('');
  const [principalStr, setPrincipalStr] = useState('');
  const [aprPercent, setAprPercent] = useState('');
  const [minPaymentStr, setMinPaymentStr] = useState('');
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Informe a identificação da dívida.');
      return;
    }

    const principalCents = parseBRLToCents(principalStr);
    if (principalCents <= 0) {
      setErrorMessage('Informe o saldo devedor principal maior que zero.');
      return;
    }

    const aprNum = parseFloat(aprPercent.replace(',', '.')) || 0;
    const minPaymentCents = minPaymentStr ? parseBRLToCents(minPaymentStr) : 0;
    const aprBps = Math.round(aprNum * 100);

    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        throw new Error('Sessão expirada. Por favor, recarregue a página ou faça login novamente.');
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single();

      if (profErr || !profile?.household_id) {
        throw new Error('Perfil não associado a uma conta familiar.');
      }

      const { error: insertError } = await supabase
        .from('debts')
        .insert({
          household_id: profile.household_id,
          name: name.trim(),
          principal_cents: principalCents,
          apr_bps: aprBps,
          min_payment_cents: minPaymentCents,
          strategy,
        });

      if (insertError) {
        throw insertError;
      }

      setName('');
      setPrincipalStr('');
      setAprPercent('');
      setMinPaymentStr('');
      onClose();
      await onSuccess();
    } catch (err: any) {
      console.error('Erro ao cadastrar dívida:', err);
      setErrorMessage(err.message || 'Falha ao cadastrar dívida.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-3 sm:p-4">
      <div className="w-full max-w-md bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-md space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-danger" />
            <h2 className="font-display font-medium text-base sm:text-lg text-ink">Nova Dívida ou Financiamento</h2>
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
          <div className="p-2.5 bg-surface-2 border border-hairline rounded-[6px] flex items-center gap-2 text-xs text-danger">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Nome da Dívida */}
          <div className="space-y-1">
            <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
              Identificação do Débito
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Financiamento Imobiliário, Cartão, Empréstimo"
              className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Saldo Devedor Principal */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Saldo Devedor (€ / R$)
              </label>
              <input
                type="text"
                required
                value={principalStr}
                onChange={(e) => setPrincipalStr(e.target.value)}
                placeholder="Ex: 5.000,00"
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
              />
            </div>

            {/* Taxa de Juros a.a. */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Taxa de Juros Anual (%)
              </label>
              <input
                type="text"
                value={aprPercent}
                onChange={(e) => setAprPercent(e.target.value)}
                placeholder="Ex: 8.5"
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Parcela Mínima */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Parcela Mensal Mínima (€ / R$)
              </label>
              <input
                type="text"
                value={minPaymentStr}
                onChange={(e) => setMinPaymentStr(e.target.value)}
                placeholder="Ex: 250,00"
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
              />
            </div>

            {/* Estratégia de Priorização */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Método de Quitação
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as any)}
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink transition-editorial"
              >
                <option value="avalanche">Avalanche (Maior Juro Primeiro)</option>
                <option value="snowball">Bola de Neve (Menor Saldo Primeiro)</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
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
              className="flex items-center gap-1.5 px-4 py-2 bg-danger hover:bg-danger/90 disabled:opacity-50 text-paper font-semibold rounded-[6px] transition-editorial cursor-pointer shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Cadastrar Dívida</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
