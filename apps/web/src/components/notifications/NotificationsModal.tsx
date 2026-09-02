'use client';

import React, { useState } from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { Category, Transaction, Budget, Goal, Debt } from '@/hooks/useHouseholdData';
import { Bell, X, AlertTriangle, CheckCircle2, Calendar, Target, Info, Check } from 'lucide-react';

export interface NotificationItem {
  id: string;
  type: 'budget' | 'bill' | 'goal' | 'ai';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
  timestamp: string;
  read: boolean;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  debts: Debt[];
}

export function NotificationsModal({
  isOpen,
  onClose,
  categories,
  transactions,
  budgets,
  goals,
  debts,
}: NotificationsModalProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('equilibrium-read-notifications');
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  if (!isOpen) return null;

  // Gerar notificações dinâmicas baseadas nos dados reais do casal
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const generatedNotifications: NotificationItem[] = [];

  // 1. Alertas de Orçamento
  const currentMonthExpenses = transactions.filter((t) => {
    const d = new Date(t.occurred_at);
    return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const budgetMap = new Map<string, number>();
  budgets.forEach((b) => budgetMap.set(b.category_id, b.limit_cents));

  categories.filter(c => c.kind === 'expense').forEach((cat) => {
    const spentCents = currentMonthExpenses
      .filter((t) => t.category_id === cat.id)
      .reduce((acc, t) => acc + t.amount_cents, 0);
    const limitCents = budgetMap.get(cat.id) || 150000;

    if (spentCents > limitCents) {
      generatedNotifications.push({
        id: `budget-over-${cat.id}`,
        type: 'budget',
        title: `Teto Ultrapassado: ${cat.name}`,
        description: `Gastos de ${formatCentsToBRL(spentCents)} ultrapassaram o teto mensal de ${formatCentsToBRL(limitCents)}.`,
        severity: 'danger',
        timestamp: 'Hoje',
        read: readIds.has(`budget-over-${cat.id}`),
      });
    } else if (spentCents >= limitCents * 0.8) {
      generatedNotifications.push({
        id: `budget-warn-${cat.id}`,
        type: 'budget',
        title: `Alerta de 80%: ${cat.name}`,
        description: `Você já consumiu ${( (spentCents / limitCents) * 100 ).toFixed(0)}% do orçamento de ${cat.name}.`,
        severity: 'warning',
        timestamp: 'Hoje',
        read: readIds.has(`budget-warn-${cat.id}`),
      });
    }
  });

  // 2. Alertas de Metas
  goals.forEach((g) => {
    if (g.target_cents > 0) {
      const pct = (g.current_cents / g.target_cents) * 100;
      if (pct >= 100) {
        generatedNotifications.push({
          id: `goal-complete-${g.id}`,
          type: 'goal',
          title: `Meta Conquistada: ${g.name}! 🎉`,
          description: `Parabéns! O casal atingiu o valor total de ${formatCentsToBRL(g.target_cents)}.`,
          severity: 'success',
          timestamp: 'Recente',
          read: readIds.has(`goal-complete-${g.id}`),
        });
      } else if (pct >= 50) {
        generatedNotifications.push({
          id: `goal-half-${g.id}`,
          type: 'goal',
          title: `Metade do Caminho: ${g.name}`,
          description: `O objetivo atingiu ${pct.toFixed(0)}% (${formatCentsToBRL(g.current_cents)} guardados).`,
          severity: 'info',
          timestamp: 'Recente',
          read: readIds.has(`goal-half-${g.id}`),
        });
      }
    }
  });

  // 3. Notificação do Assistente IA & Dívidas
  if (debts.length > 0) {
    generatedNotifications.push({
      id: 'debt-strategy-active',
      type: 'ai',
      title: 'Estratégia de Quitação Ativa',
      description: `O sistema calculou a ordem ideal de quitação para suas ${debts.length} dívidas ativas.`,
      severity: 'info',
      timestamp: 'Sistema',
      read: readIds.has('debt-strategy-active'),
    });
  }

  // Notificação de boas-vindas padrão se não houver alertas
  if (generatedNotifications.length === 0) {
    generatedNotifications.push({
      id: 'welcome-equilibrium',
      type: 'ai',
      title: 'Tudo em Ordem no Casal',
      description: 'Nenhum teto ultrapassado e todas as movimentações estão em conformidade com o planejamento.',
      severity: 'success',
      timestamp: 'Hoje',
      read: readIds.has('welcome-equilibrium'),
    });
  }

  const markAsRead = (id: string) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('equilibrium-read-notifications', JSON.stringify(Array.from(updated)));
    }
  };

  const markAllAsRead = () => {
    const updated = new Set(readIds);
    generatedNotifications.forEach((n) => updated.add(n.id));
    setReadIds(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('equilibrium-read-notifications', JSON.stringify(Array.from(updated)));
    }
  };

  const filteredNotifications = generatedNotifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const unreadCount = generatedNotifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[85vh] bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand" />
            <h2 className="font-display font-medium text-base sm:text-lg text-ink">Central de Alertas & Notificações</h2>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 bg-danger text-paper text-[10px] font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-3 hover:text-ink rounded-[4px] transition-editorial cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between py-2 border-b border-hairline text-xs flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-[4px] font-medium transition-editorial ${
                filter === 'all' ? 'bg-surface-2 text-ink font-semibold' : 'text-ink-3 hover:text-ink'
              }`}
            >
              Todas ({generatedNotifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-[4px] font-medium transition-editorial ${
                filter === 'unread' ? 'bg-surface-2 text-ink font-semibold' : 'text-ink-3 hover:text-ink'
              }`}
            >
              Não lidas ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] text-brand hover:underline font-medium cursor-pointer"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* List of Notifications */}
        <div className="flex-1 overflow-y-auto divide-y divide-hairline py-2 space-y-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-3 space-y-2">
              <CheckCircle2 className="w-6 h-6 mx-auto text-brand" />
              <p>Nenhuma notificação nesta visualização.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`py-3 px-2 flex items-start justify-between gap-3 rounded-[6px] transition-colors cursor-pointer ${
                  notif.read ? 'opacity-70 hover:bg-surface-2/40' : 'bg-surface-2/30 hover:bg-surface-2/70 font-medium'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {notif.severity === 'danger' && <AlertTriangle className="w-4 h-4 text-danger" />}
                    {notif.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-warning" />}
                    {notif.severity === 'success' && <CheckCircle2 className="w-4 h-4 text-brand" />}
                    {notif.severity === 'info' && <Info className="w-4 h-4 text-brand" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink">{notif.title}</span>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-ink-2 font-normal leading-relaxed">{notif.description}</p>
                    <span className="text-[10px] text-ink-3 font-mono block">{notif.timestamp}</span>
                  </div>
                </div>

                {!notif.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notif.id);
                    }}
                    className="p-1 text-ink-3 hover:text-brand rounded-[4px]"
                    title="Marcar como lida"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
