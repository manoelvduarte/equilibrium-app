'use client';

import React, { useState } from 'react';
import { parseBRLToCents } from '@equilibrium/ui';
import { createGoal } from '@/actions/financeActions';
import { Target, X, Plus, AlertCircle, Loader2 } from 'lucide-react';

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function AddGoalModal({ isOpen, onClose, onSuccess }: AddGoalModalProps) {
  const [name, setName] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [currentStr, setCurrentStr] = useState('');
  const [deadlineTo, setDeadlineTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Informe o nome da meta.');
      return;
    }

    const targetCents = parseBRLToCents(targetStr);
    if (targetCents <= 0) {
      setErrorMessage('Informe um valor alvo válido.');
      return;
    }

    const currentCents = currentStr ? parseBRLToCents(currentStr) : 0;

    setLoading(true);
    setErrorMessage(null);

    try {
      await createGoal({
        name: name.trim(),
        targetCents,
        currentCents,
        deadline: deadlineTo || null,
      });

      setName('');
      setTargetStr('');
      setCurrentStr('');
      setDeadlineTo('');
      onClose();
      await onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao salvar meta.');
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
            <Target className="w-4 h-4 text-brand" />
            <h2 className="font-display font-medium text-base sm:text-lg text-ink">Nova Meta do Casal</h2>
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
          
          {/* Nome da Meta */}
          <div className="space-y-1">
            <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
              Nome do Objetivo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Reserva de Emergência, Viagem Europa, Entrada Apartamento"
              className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Valor Alvo */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Valor Alvo (R$)
              </label>
              <input
                type="text"
                required
                value={targetStr}
                onChange={(e) => setTargetStr(e.target.value)}
                placeholder="Ex: 30.000,00"
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
              />
            </div>

            {/* Saldo Atual */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Saldo Inicial Já Guardado (R$)
              </label>
              <input
                type="text"
                value={currentStr}
                onChange={(e) => setCurrentStr(e.target.value)}
                placeholder="Ex: 5.000,00"
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
              />
            </div>
          </div>

          {/* Prazo / Data Limite */}
          <div className="space-y-1">
            <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
              Data Alvo Estimada (Opcional)
            </label>
            <input
              type="date"
              value={deadlineTo}
              onChange={(e) => setDeadlineTo(e.target.value)}
              className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs font-mono text-ink focus:outline-none focus:border-ink transition-editorial"
            />
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
              <span>Criar Meta</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
