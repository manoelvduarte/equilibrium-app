'use client';

import React from 'react';
import { formatCentsToBRL, CategoryIcon } from '@equilibrium/ui';
import { Category, Transaction, Budget } from '@/hooks/useHouseholdData';
import { PieChart, AlertTriangle, CheckCircle2, Inbox } from 'lucide-react';

interface BudgetModuleProps {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  onOpenNewTransaction: () => void;
}

export function BudgetModule({
  categories,
  transactions,
  budgets,
  onOpenNewTransaction,
}: BudgetModuleProps) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Despesas do mês corrente
  const currentMonthExpenses = transactions.filter((t) => {
    const d = new Date(t.occurred_at);
    return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Mapeamento de orçamento por categoria (se não existir registro explícito, usa padrão de teto de R$ 1.500)
  const budgetMap = new Map<string, number>();
  budgets.forEach((b) => budgetMap.set(b.category_id, b.limit_cents));

  const budgetCategories = categories.map((cat) => {
    const spentCents = currentMonthExpenses
      .filter((t) => t.category_id === cat.id)
      .reduce((acc, t) => acc + t.amount_cents, 0);

    const limitCents = budgetMap.get(cat.id) || 150000; // R$ 1.500,00 default
    const percentage = Math.min(100, Math.round((spentCents / limitCents) * 100));
    const isOver = spentCents > limitCents;
    const isWarning = percentage >= 80 && !isOver;

    return {
      ...cat,
      spentCents,
      limitCents,
      percentage,
      isOver,
      isWarning,
    };
  });

  const totalBudgetLimit = budgetCategories.reduce((acc, c) => acc + c.limitCents, 0);
  const totalBudgetSpent = budgetCategories.reduce((acc, c) => acc + c.spentCents, 0);
  const totalPercentage = Math.min(100, Math.round((totalBudgetSpent / totalBudgetLimit) * 100));

  const envelopeCategories = budgetCategories.filter((c) => c.budget_style === 'envelope');
  const flexCategories = budgetCategories.filter((c) => c.budget_style === 'flex');
  const fixedCategories = budgetCategories.filter((c) => c.budget_style === 'fixed');

  return (
    <div className="space-y-8">
      
      {/* Header & Global Progress */}
      <div className="border-b border-hairline pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="micro-label">Planejamento Duplo</span>
            <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
              Orçamento do Casal
            </h1>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm tnum text-ink">
            <span>{formatCentsToBRL(totalBudgetSpent)}</span>
            <span className="text-ink-3">/</span>
            <span className="text-ink-2">{formatCentsToBRL(totalBudgetLimit)}</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-surface-2 border border-hairline rounded-[4px] text-brand">
              {totalPercentage}%
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-2 bg-surface-2 border border-hairline rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              totalPercentage > 90 ? 'bg-danger' : totalPercentage > 75 ? 'bg-warning' : 'bg-brand'
            }`}
            style={{ width: `${totalPercentage}%` }}
          />
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="p-12 bg-surface border border-hairline rounded-[12px] text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-surface-2 border border-hairline flex items-center justify-center mx-auto text-ink-3">
            <Inbox className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="font-display text-base font-medium text-ink">Nenhuma categoria cadastrada</p>
            <p className="text-xs text-ink-2">Cadastre suas primeiras categorias para acompanhar os limites.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Seção 1: Envelope (Mercado, Gastos Essenciais) */}
          <div className="bg-surface border border-hairline rounded-[12px] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <div>
                <span className="micro-label">Modelo Envelope</span>
                <h2 className="font-display text-base font-medium text-ink">Essenciais & Rotina</h2>
              </div>
              <span className="text-[10px] font-mono text-ink-3 bg-surface-2 px-2 py-0.5 rounded-[4px]">YNAB</span>
            </div>

            <div className="space-y-3.5">
              {envelopeCategories.map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-surface-2 border border-hairline rounded-[4px] text-ink-2">
                        <CategoryIcon name={cat.icon} size={13} />
                      </div>
                      <span className="font-medium text-ink">{cat.name}</span>
                    </div>
                    <span className="font-mono tnum text-ink-2">
                      {formatCentsToBRL(cat.spentCents)} / {formatCentsToBRL(cat.limitCents)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.isOver ? 'bg-danger' : cat.isWarning ? 'bg-warning' : 'bg-brand'}`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 2: Flex (Restaurantes, Lazer, Variáveis) */}
          <div className="bg-surface border border-hairline rounded-[12px] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <div>
                <span className="micro-label">Modelo Flexível</span>
                <h2 className="font-display text-base font-medium text-ink">Estilo de Vida</h2>
              </div>
              <span className="text-[10px] font-mono text-ink-3 bg-surface-2 px-2 py-0.5 rounded-[4px]">Monarch</span>
            </div>

            <div className="space-y-3.5">
              {flexCategories.map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-surface-2 border border-hairline rounded-[4px] text-ink-2">
                        <CategoryIcon name={cat.icon} size={13} />
                      </div>
                      <span className="font-medium text-ink">{cat.name}</span>
                    </div>
                    <span className="font-mono tnum text-ink-2">
                      {formatCentsToBRL(cat.spentCents)} / {formatCentsToBRL(cat.limitCents)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.isOver ? 'bg-danger' : cat.isWarning ? 'bg-warning' : 'bg-brand'}`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 3: Fixed (Moradia, Assinaturas, Fixos) */}
          <div className="bg-surface border border-hairline rounded-[12px] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <div>
                <span className="micro-label">Despesas Fixas</span>
                <h2 className="font-display text-base font-medium text-ink">Compromissos Recorrentes</h2>
              </div>
              <span className="text-[10px] font-mono text-ink-3 bg-surface-2 px-2 py-0.5 rounded-[4px]">Contratos</span>
            </div>

            <div className="space-y-3.5">
              {fixedCategories.map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-surface-2 border border-hairline rounded-[4px] text-ink-2">
                        <CategoryIcon name={cat.icon} size={13} />
                      </div>
                      <span className="font-medium text-ink">{cat.name}</span>
                    </div>
                    <span className="font-mono tnum text-ink-2">
                      {formatCentsToBRL(cat.spentCents)} / {formatCentsToBRL(cat.limitCents)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.isOver ? 'bg-danger' : cat.isWarning ? 'bg-warning' : 'bg-brand'}`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
