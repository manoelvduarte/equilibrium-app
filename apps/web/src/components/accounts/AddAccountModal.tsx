'use client';

import React, { useState } from 'react';
import { parseBRLToCents } from '@equilibrium/ui';
import { createAccount } from '@/actions/financeActions';
import { Landmark, X, Plus, AlertCircle, Loader2 } from 'lucide-react';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function AddAccountModal({ isOpen, onClose, onSuccess }: AddAccountModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'checking' | 'savings' | 'credit_card' | 'investment' | 'cash'>('checking');
  const [initialBalanceStr, setInitialBalanceStr] = useState('');
  const [visibility, setVisibility] = useState<'shared' | 'private' | 'balance_only'>('shared');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Informe o nome da conta ou banco.');
      return;
    }

    const initialBalanceCents = initialBalanceStr ? parseBRLToCents(initialBalanceStr) : 0;

    setLoading(true);
    setErrorMessage(null);

    try {
      await createAccount({
        name: name.trim(),
        type,
        initialBalanceCents,
        visibility,
      });

      setName('');
      setInitialBalanceStr('');
      onClose();
      await onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao cadastrar conta.');
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
            <Landmark className="w-4 h-4 text-brand" />
            <h2 className="font-display font-medium text-base sm:text-lg text-ink">Adicionar Nova Conta</h2>
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
          
          {/* Nome da Conta */}
          <div className="space-y-1">
            <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
              Nome da Conta / Instituição
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank, Itaú Conjunta, Inter, Carteira, C6 Bank"
              className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tipo de Conta */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Tipo de Conta
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink transition-editorial"
              >
                <option value="checking">Conta Corrente</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="investment">Investimentos</option>
                <option value="savings">Poupança</option>
                <option value="cash">Dinheiro em Espécie</option>
              </select>
            </div>

            {/* Saldo Inicial */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Saldo Inicial (R$)
              </label>
              <input
                type="text"
                value={initialBalanceStr}
                onChange={(e) => setInitialBalanceStr(e.target.value)}
                placeholder="0,00"
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
              />
            </div>
          </div>

          {/* Visibilidade do Casal */}
          <div className="space-y-1">
            <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
              Compartilhamento no Casal
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink transition-editorial"
            >
              <option value="shared">Conjunta (Totalmente visível e compartilhada)</option>
              <option value="balance_only">Semi-privada (Apenas o saldo entra no patrimônio)</option>
              <option value="private">Privada (Exclusiva do titular)</option>
            </select>
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
              className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper font-semibold rounded-[6px] transition-editorial cursor-pointer shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Criar Conta</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
