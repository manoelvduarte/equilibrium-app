'use client';

import React, { useState, useEffect } from 'react';
import { formatCentsToBRL, parseBRLToCents } from '@equilibrium/ui';
import { Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { TransactionMock, MOCK_ACCOUNTS, MOCK_CATEGORIES } from '@equilibrium/db';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Partial<TransactionMock>) => void;
}

export function QuickAddModal({ isOpen, onClose, onAddTransaction }: QuickAddModalProps) {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<{
    description: string;
    amountCents: number;
    type: 'expense' | 'income';
    categoryId: string;
    accountId: string;
  } | null>(null);

  // Esc listener para abrir/fechar com ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Parser local síncrono em linguagem natural
  useEffect(() => {
    if (!input.trim()) {
      setParsed(null);
      return;
    }

    const text = input.trim();
    // Procura por valores numéricos tipo 12,50 ou 12.50 ou 120
    const matchVal = text.match(/(\d+[.,]?\d*)/);
    const amountCents = matchVal ? parseBRLToCents(matchVal[1]) : 0;
    
    // Descrição remove o valor numérico
    const description = text.replace(/(\d+[.,]?\d*)/, '').trim() || 'Nova Transação';

    // Inferência rápida de tipo e categoria
    const isIncomeKeyword = /salario|salário|freelance|receita|pix recebido/i.test(text);
    const type: 'expense' | 'income' = isIncomeKeyword ? 'income' : 'expense';

    let categoryId = MOCK_CATEGORIES[1].id; // default supermercado/groceries
    if (/café|almoço|jantar|restaurante|pizzaria|burger/i.test(text)) {
      categoryId = MOCK_CATEGORIES[2].id; // dining
    } else if (/aluguel|condominio|casa|luz|agua/i.test(text)) {
      categoryId = MOCK_CATEGORIES[0].id; // housing
    } else if (isIncomeKeyword) {
      categoryId = MOCK_CATEGORIES[6].id; // salary
    }

    setParsed({
      description: description.charAt(0).toUpperCase() + description.slice(1),
      amountCents: amountCents > 0 ? amountCents : 1250, // fallback R$ 12,50
      type,
      categoryId,
      accountId: MOCK_ACCOUNTS[0].id,
    });
  }, [input]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed) return;

    onAddTransaction({
      description: parsed.description,
      amountCents: parsed.amountCents,
      type: parsed.type,
      categoryId: parsed.categoryId,
      accountId: parsed.accountId,
      date: new Date().toISOString().split('T')[0],
      source: 'manual',
      tags: ['quick-add'],
    });

    setInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Quick Add em Linguagem Natural</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Digite ex: <span className="text-slate-200 font-mono">"Café expresso 12,50"</span> ou <span className="text-slate-200 font-mono">"Almoço 45"</span>
            </label>
            <input
              type="text"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite o gasto ou receita..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium text-base"
            />
          </div>

          {/* Parsed Preview Card */}
          {parsed && (
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Inferencia Automática:</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${parsed.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {parsed.type === 'income' ? 'Receita' : 'Despesa'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-sm">{parsed.description}</span>
                <span className="font-mono font-bold text-emerald-400 text-base">
                  {formatCentsToBRL(parsed.amountCents)}
                </span>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!parsed}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20"
            >
              <span>Criar Transação</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
