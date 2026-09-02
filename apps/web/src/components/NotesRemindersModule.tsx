'use client';

import React, { useState, useEffect } from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { Profile } from '@/hooks/useHouseholdData';
import { AddNoteModal, FinancialNote } from './notes/AddNoteModal';
import { AddBillReminderModal, BillReminder } from './notes/AddBillReminderModal';
import {
  StickyNote,
  Calendar,
  Plus,
  Pin,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Users,
  AlertCircle,
  Tag,
  Check,
} from 'lucide-react';

interface NotesRemindersModuleProps {
  userProfile: Profile | null;
  partners: Profile[];
}

export function NotesRemindersModule({ userProfile, partners }: NotesRemindersModuleProps) {
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  // Notas com persistência
  const [notes, setNotes] = useState<FinancialNote[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('equilibrium-financial-notes');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'note-1',
        title: 'Acordo de Delivery & Restaurantes',
        content: 'Combinamos de manter os jantares fora e pedidos em no máximo R$ 600 por mês até a viagem de dezembro.',
        categoryTag: 'Acordo do Casal',
        isPinned: true,
        createdAt: '01/09/2026',
        authorName: 'Casal',
      },
      {
        id: 'note-2',
        title: 'Revisão do Seguro Auto',
        content: 'Cotação da renovação vence em novembro. Comparar Porto Seguro e Youse.',
        categoryTag: 'Contas & Assinaturas',
        isPinned: false,
        createdAt: '28/08/2026',
        authorName: 'Casal',
      },
    ];
  });

  // Lembretes de contas com persistência
  const [bills, setBills] = useState<BillReminder[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('equilibrium-bill-reminders');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'bill-1',
        title: 'Aluguel do Apartamento',
        amountCents: 280000,
        dueDay: 5,
        assignedTo: 'Ambos (Conjunto)',
        status: 'pending',
        category: 'Moradia & Contas',
      },
      {
        id: 'bill-2',
        title: 'Fatura Cartão de Crédito',
        amountCents: 164000,
        dueDay: 10,
        assignedTo: 'Ambos (Conjunto)',
        status: 'pending',
        category: 'Cartão & Crédito',
      },
      {
        id: 'bill-3',
        title: 'Internet Fibra 600MB',
        amountCents: 12990,
        dueDay: 15,
        assignedTo: 'Titular',
        status: 'paid',
        category: 'Assinaturas & Tech',
      },
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('equilibrium-financial-notes', JSON.stringify(notes));
    }
  }, [notes]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('equilibrium-bill-reminders', JSON.stringify(bills));
    }
  }, [bills]);

  const handleAddNote = (newNote: FinancialNote) => {
    setNotes([newNote, ...notes]);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter((n) => n.id !== noteId));
  };

  const handleTogglePin = (noteId: string) => {
    setNotes(
      notes.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleAddBill = (newBill: BillReminder) => {
    setBills([...bills, newBill]);
  };

  const handleToggleBillStatus = (billId: string) => {
    setBills(
      bills.map((b) =>
        b.id === billId ? { ...b, status: b.status === 'paid' ? 'pending' : 'paid' } : b
      )
    );
  };

  const handleDeleteBill = (billId: string) => {
    setBills(bills.filter((b) => b.id !== billId));
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const pendingBills = bills.filter((b) => b.status === 'pending');
  const paidBills = bills.filter((b) => b.status === 'paid');
  const totalPendingCents = pendingBills.reduce((acc, b) => acc + b.amountCents, 0);

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <span className="micro-label">Planejamento & Colaboração</span>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            Notas, Acordos & Lembretes
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNoteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand/90 text-paper rounded-[6px] font-semibold text-xs transition-editorial shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nova Nota / Acordo</span>
          </button>
          <button
            onClick={() => setIsBillModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-2 border border-hairline text-ink rounded-[6px] font-medium text-xs transition-editorial shadow-sm cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-brand" />
            <span>Novo Lembrete de Conta</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Coluna 1: Notas & Acordos do Casal (Cols 1–7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-2.5">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-brand" />
              <h2 className="font-display text-lg font-medium text-ink">Anotações do Casal</h2>
            </div>
            <span className="text-xs text-ink-3 font-mono">{notes.length} notas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sortedNotes.map((note) => (
              <div
                key={note.id}
                className={`p-4 rounded-[12px] border transition-editorial flex flex-col justify-between space-y-3 ${
                  note.isPinned
                    ? 'bg-surface border-brand/40 shadow-xs'
                    : 'bg-surface border-hairline shadow-xs'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-surface-2 border border-hairline rounded-[4px] text-ink-2 uppercase tracking-wide">
                      {note.categoryTag || 'Geral'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(note.id)}
                        className={`p-1 rounded-[4px] cursor-pointer ${
                          note.isPinned ? 'text-brand' : 'text-ink-3 hover:text-ink'
                        }`}
                        title={note.isPinned ? 'Desafixar nota' : 'Fixar no topo'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-ink-3 hover:text-danger rounded-[4px] cursor-pointer"
                        title="Excluir nota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-display font-medium text-sm text-ink leading-snug">
                    {note.title}
                  </h3>

                  <p className="text-xs text-ink-2 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                </div>

                <div className="pt-2 border-t border-hairline flex items-center justify-between text-[10px] text-ink-3 font-mono">
                  <span>{note.createdAt}</span>
                  <span>Por {note.authorName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 2: Contas Fixas & Vencimentos do Mês (Cols 8–12) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand" />
              <h2 className="font-display text-lg font-medium text-ink">Contas a Vencer</h2>
            </div>
            <span className="text-xs font-mono font-semibold text-danger tnum">
              Pendente: {formatCentsToBRL(totalPendingCents)}
            </span>
          </div>

          <div className="space-y-3">
            {bills.map((bill) => {
              const isPaid = bill.status === 'paid';

              return (
                <div
                  key={bill.id}
                  className={`p-3.5 bg-surface border border-hairline rounded-[10px] shadow-xs flex items-center justify-between transition-all ${
                    isPaid ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleBillStatus(bill.id)}
                      className={`w-5 h-5 rounded-[4px] border flex items-center justify-center transition-colors cursor-pointer ${
                        isPaid
                          ? 'bg-brand border-brand text-paper'
                          : 'bg-surface-2 border-hairline hover:border-ink'
                      }`}
                      title={isPaid ? 'Marcar como pendente' : 'Marcar como paga'}
                    >
                      {isPaid && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="space-y-0.5">
                      <p
                        className={`text-xs font-semibold ${
                          isPaid ? 'line-through text-ink-3' : 'text-ink'
                        }`}
                      >
                        {bill.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-ink-3 font-mono">
                        <span className="font-bold text-ink-2">Vence dia {bill.dueDay}</span>
                        <span>•</span>
                        <span>{bill.assignedTo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs font-semibold tnum ${
                        isPaid ? 'text-brand line-through' : 'text-danger'
                      }`}
                    >
                      {formatCentsToBRL(bill.amountCents)}
                    </span>
                    <button
                      onClick={() => handleDeleteBill(bill.id)}
                      className="p-1 text-ink-3 hover:text-danger rounded-[4px] cursor-pointer"
                      title="Excluir lembrete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Modais */}
      <AddNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSuccess={handleAddNote}
        authorName={userProfile?.full_name}
      />

      <AddBillReminderModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        onSuccess={handleAddBill}
      />

    </div>
  );
}
