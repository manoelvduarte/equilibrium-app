'use client';

import React, { useState } from 'react';
import { createCategory } from '@/actions/financeActions';
import { Tag, X, Plus, AlertCircle, Loader2 } from 'lucide-react';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function AddCategoryModal({ isOpen, onClose, onSuccess }: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [budgetStyle, setBudgetStyle] = useState<'envelope' | 'flex' | 'fixed'>('envelope');
  const [color, setColor] = useState('#5F7461');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const colorOptions = [
    '#5F7461', // Sage
    '#A96A3C', // Terracotta
    '#23606B', // Deep Cyan
    '#B4532A', // Rust
    '#7D5E7C', // Plum
    '#4E7E8C', // Steel Blue
    '#A3874A', // Ochre
    '#6E8F6B', // Olive
    '#9C5A54', // Rosewood
    '#1C1B18', // Ink
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Informe o nome da categoria.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await createCategory({
        name: name.trim(),
        kind,
        budgetStyle,
        color,
      });

      setName('');
      onClose();
      await onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao criar categoria.');
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
            <Tag className="w-4 h-4 text-brand" />
            <h2 className="font-display font-medium text-base sm:text-lg text-ink">Nova Categoria</h2>
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
          
          {/* Nome */}
          <div className="space-y-1">
            <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
              Nome da Categoria
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Assinaturas & Streaming, Pets, Cursos"
              className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tipo */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Tipo
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink transition-editorial"
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>

            {/* Modelo de Orçamento */}
            <div className="space-y-1">
              <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
                Comportamento
              </label>
              <select
                value={budgetStyle}
                onChange={(e) => setBudgetStyle(e.target.value as any)}
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink transition-editorial"
              >
                <option value="envelope">Envelope (Limite Rígido)</option>
                <option value="flex">Flexível (Varia por mês)</option>
                <option value="fixed">Fixo (Conta recorrente)</option>
              </select>
            </div>
          </div>

          {/* Seletor de Cor Ledger */}
          <div className="space-y-1.5">
            <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
              Cor Editorial
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    color === c ? 'scale-110 border-ink shadow-sm' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
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
              className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper font-semibold rounded-[6px] transition-editorial cursor-pointer shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Criar Categoria</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
