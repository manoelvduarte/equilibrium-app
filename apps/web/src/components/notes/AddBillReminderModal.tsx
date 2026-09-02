'use client';

import React, { useState } from 'react';
import { parseBRLToCents } from '@equilibrium/ui';
import { Calendar, X, Plus, AlertCircle } from 'lucide-react';

export interface BillReminder {
  id: string;
  title: string;
  amountCents: number;
  dueDay: number; // Dia do mês (1 a 31)
  assignedTo: string; // 'Ambos' | 'Titular' | 'Parceiro'
  status: 'pending' | 'paid';
  category?: string;
}

interface AddBillReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bill: BillReminder) => void;
}

export function AddBillReminderModal({ isOpen, onClose, onSuccess }: AddBillReminderModalProps) {
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDay, setDueDay] = useState('10');
  const [assignedTo, setAssignedTo] = useState('Ambos (Conjunto)');
  const [category, setCategory] = useState('Contas & Utilidades');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Informe a descrição da conta a pagar.');
      return;
    }

    const amountCents = parseBRLToCents(amountStr);
    if (amountCents <= 0) {
      setErrorMessage('Informe um valor válido em reais.');
      return;
    }

    const parsedDueDay = parseInt(dueDay, 10);
    if (isNaN(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
      setErrorMessage('O dia de vencimento deve estar entre 1 e 31.');
      return;
    }

    const newBill: BillReminder = {
      id: `bill-${Date.now()}`,
      title: title.trim(),
      amountCents,
      dueDay: parsedDueDay,
      assignedTo,
      status: 'pending',
      category,
    };

    onSuccess(newBill);
    setTitle('');
    setAmountStr('');
    setDueDay('10');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-3 sm:p-4">
      <div className="w-full max-w-md bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-md space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand" />
            <h2 className="font-display font-medium text-base sm:text-lg text-ink">Novo Lembrete de Conta Fixa</h2>
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
              Descrição da Conta / Boleto
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Aluguel, Condomínio, Fatura Nubank, Internet Fibra"
              className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Valor */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Valor Estimado (R$)
              </label>
              <input
                type="text"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="Ex: 1.850,00"
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
              />
            </div>

            {/* Dia de Vencimento */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Dia do Vencimento
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs font-mono text-ink focus:outline-none focus:border-ink transition-editorial"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Responsável */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Quem Paga
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink transition-editorial"
              >
                <option value="Ambos (Conjunto)">Ambos (Conta Conjunta)</option>
                <option value="Titular">Titular</option>
                <option value="Parceiro(a)">Parceiro(a)</option>
              </select>
            </div>

            {/* Categoria */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink transition-editorial"
              >
                <option value="Moradia & Contas">Moradia & Contas</option>
                <option value="Cartão & Crédito">Cartão & Crédito</option>
                <option value="Assinaturas & Tech">Assinaturas & Tech</option>
                <option value="Educação & Cursos">Educação & Cursos</option>
                <option value="Saúde & Seguros">Saúde & Seguros</option>
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
              className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand/90 text-paper font-semibold rounded-[6px] transition-editorial cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Lembrete</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
