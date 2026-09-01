'use client';

import React, { useState } from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { Goal, Debt } from '@/hooks/useHouseholdData';
import { Target, TrendingDown, Shield, CheckCircle2, Inbox } from 'lucide-react';

interface GoalsDebtsModuleProps {
  goals: Goal[];
  debts: Debt[];
}

export function GoalsDebtsModule({ goals, debts }: GoalsDebtsModuleProps) {
  const [debtStrategy, setDebtStrategy] = useState<'snowball' | 'avalanche'>('avalanche');

  const totalGoalsTarget = goals.reduce((acc, g) => acc + g.target_cents, 0);
  const totalGoalsCurrent = goals.reduce((acc, g) => acc + g.current_cents, 0);
  const totalDebts = debts.reduce((acc, d) => acc + d.principal_cents, 0);

  // Ordenação de dívidas conforme estratégia escolhida
  const sortedDebts = [...debts].sort((a, b) => {
    if (debtStrategy === 'snowball') {
      return a.principal_cents - b.principal_cents; // Menor saldo primeiro
    }
    return b.interest_rate_permille - a.interest_rate_permille; // Maior taxa primeiro (Avalanche)
  });

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="border-b border-hairline pb-4">
        <span className="micro-label">Planejamento Estratégico</span>
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
          Metas & Quitação de Dívidas
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Metas Patrimoniais */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-2.5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-brand" />
              <h2 className="font-display text-lg font-medium text-ink">Metas do Casal</h2>
            </div>
            <span className="text-xs font-mono font-medium text-brand tnum">
              {formatCentsToBRL(totalGoalsCurrent)} / {formatCentsToBRL(totalGoalsTarget)}
            </span>
          </div>

          {goals.length === 0 ? (
            <div className="p-8 bg-surface border border-hairline rounded-[12px] text-center space-y-2">
              <Inbox className="w-6 h-6 mx-auto text-ink-3" />
              <p className="font-display text-sm font-medium text-ink">Nenhuma meta cadastrada</p>
              <p className="text-xs text-ink-2">Defina objetivos como Reserva de Emergência ou Viagem.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => {
                const percent = Math.min(100, Math.round((goal.current_cents / goal.target_cents) * 100));
                return (
                  <div key={goal.id} className="p-4 bg-surface border border-hairline rounded-[12px] shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ink">{goal.name}</span>
                      <span className="font-mono tnum text-ink-2">
                        {formatCentsToBRL(goal.current_cents)} / {formatCentsToBRL(goal.target_cents)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-brand" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quitação de Dívidas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-danger" />
              <h2 className="font-display text-lg font-medium text-ink">Estratégia de Dívidas</h2>
            </div>
            
            {/* Strategy Switcher */}
            <div className="flex items-center bg-surface border border-hairline rounded-[6px] p-0.5 text-xs">
              <button
                onClick={() => setDebtStrategy('avalanche')}
                className={`px-2 py-0.5 rounded-[4px] font-medium transition-editorial ${
                  debtStrategy === 'avalanche' ? 'bg-surface-2 text-ink shadow-sm' : 'text-ink-3 hover:text-ink'
                }`}
              >
                Avalanche (Juros)
              </button>
              <button
                onClick={() => setDebtStrategy('snowball')}
                className={`px-2 py-0.5 rounded-[4px] font-medium transition-editorial ${
                  debtStrategy === 'snowball' ? 'bg-surface-2 text-ink shadow-sm' : 'text-ink-3 hover:text-ink'
                }`}
              >
                Bola de Neve
              </button>
            </div>
          </div>

          {debts.length === 0 ? (
            <div className="p-8 bg-surface border border-hairline rounded-[12px] text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 mx-auto text-brand" />
              <p className="font-display text-sm font-medium text-ink">Nenhuma dívida ativa</p>
              <p className="text-xs text-ink-2">O household está livre de pendências financeiras.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDebts.map((debt, index) => (
                <div key={debt.id} className="p-4 bg-surface border border-hairline rounded-[12px] shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-surface-2 border border-hairline flex items-center justify-center font-mono font-bold text-[10px] text-ink-3">
                        #{index + 1}
                      </span>
                      <span className="font-medium text-ink">{debt.name}</span>
                    </div>
                    <span className="font-mono font-medium text-danger tnum">
                      {formatCentsToBRL(debt.principal_cents)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-ink-3">
                    <span>Taxa: {(debt.interest_rate_permille / 10).toFixed(1)}% a.m.</span>
                    <span>Pagamento Mínimo: {formatCentsToBRL(debt.minimum_payment_cents)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
