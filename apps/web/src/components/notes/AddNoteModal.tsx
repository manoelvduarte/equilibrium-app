'use client';

import React, { useState } from 'react';
import { StickyNote, X, Plus, AlertCircle, Pin } from 'lucide-react';

export interface FinancialNote {
  id: string;
  title: string;
  content: string;
  categoryTag?: string;
  isPinned: boolean;
  createdAt: string;
  authorName?: string;
}

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (note: FinancialNote) => void;
  authorName?: string;
}

export function AddNoteModal({ isOpen, onClose, onSuccess, authorName }: AddNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryTag, setCategoryTag] = useState('Acordo do Casal');
  const [isPinned, setIsPinned] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMessage('Preencha o título e o conteúdo da anotação.');
      return;
    }

    const newNote: FinancialNote = {
      id: `note-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      categoryTag,
      isPinned,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      authorName: authorName || 'Casal',
    };

    onSuccess(newNote);
    setTitle('');
    setContent('');
    setIsPinned(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-3 sm:p-4">
      <div className="w-full max-w-md bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-md space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-brand" />
            <h2 className="font-display font-medium text-base sm:text-lg text-ink">Nova Anotação ou Acordo</h2>
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
          
          {/* Título */}
          <div className="space-y-1">
            <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
              Título da Nota
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Acordo de Gastos para Outubro, Compras de Natal"
              className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
            />
          </div>

          {/* Categoria / Tag */}
          <div className="space-y-1">
            <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
              Classificação
            </label>
            <select
              value={categoryTag}
              onChange={(e) => setCategoryTag(e.target.value)}
              className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink transition-editorial"
            >
              <option value="Acordo do Casal">Acordo do Casal</option>
              <option value="Planejamento de Viagem">Planejamento de Viagem</option>
              <option value="Lembrete de Economia">Lembrete de Economia</option>
              <option value="Contas & Assinaturas">Contas & Assinaturas</option>
              <option value="Investimentos & Futuro">Investimentos & Futuro</option>
            </select>
          </div>

          {/* Conteúdo */}
          <div className="space-y-1">
            <label className="block font-semibold uppercase tracking-[0.08em] text-ink-3 text-[10px]">
              Conteúdo / Detalhes
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva os detalhes combinados, limites, lembretes de despesas ou itens a comprar..."
              className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial resize-none"
            />
          </div>

          {/* Pinned Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="pinNote"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded border-hairline text-brand focus:ring-0 cursor-pointer"
            />
            <label htmlFor="pinNote" className="text-xs text-ink flex items-center gap-1 cursor-pointer">
              <Pin className="w-3.5 h-3.5 text-brand" />
              <span>Fixar anotação no topo</span>
            </label>
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
              <span>Salvar Nota</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
