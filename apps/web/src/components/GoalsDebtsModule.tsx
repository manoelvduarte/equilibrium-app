'use client';

import React, { useState } from 'react';
import { formatCentsToBRL, parseBRLToCents } from '@equilibrium/ui';
import { Goal, Debt } from '@/hooks/useHouseholdData';
import { AddGoalModal } from './goals/AddGoalModal';
import { AddDebtModal } from './goals/AddDebtModal';
import { createClient } from '@/lib/supabase/client';
import { Target, TrendingDown, Plus, Trash2, ArrowUpRight, ArrowDownRight, Inbox, CheckCircle2 } from 'lucide-react';

interface GoalsDebtsModuleProps {
  goals: Goal[];
  debts: Debt[];
  onRefresh: () => Promise<void>;
}

export function GoalsDebtsModule({ goals, debts, onRefresh }: GoalsDebtsModuleProps) {
  const [debtStrategy, setDebtStrategy] = useState<'snowball' | 'avalanche'>('avalanche');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);

  // Quick contribute state
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmountStr, setContributeAmountStr] = useState('');

  // Quick amortize state
  const [amortizeDebtId, setAmortizeDebtId] = useState<string | null>(null);
  const [amortizeAmountStr, setAmortizeAmountStr] = useState('');

  const supabase = createClient();

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

  const handleContribute = async (goalId: string) => {
    const addCents = parseBRLToCents(contributeAmountStr);
    if (addCents <= 0) return;
    try {
      const targetGoal = goals.find((g) => g.id === goalId);
      const currentCents = targetGoal ? targetGoal.current_cents : 0;
      const updatedCurrent = currentCents + addCents;
      const newStrategy = JSON.stringify({ current_cents: updatedCurrent });

      const { error } = await supabase
        .from('goals')
        .update({ strategy: newStrategy })
        .eq('id', goalId);

      if (error) throw error;

      setContributeGoalId(null);
      setContributeAmountStr('');
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao aportar na meta');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Deseja excluir esta meta?')) return;
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir meta');
    }
  };

  const handleAmortize = async (debtId: string) => {
    const amountCents = parseBRLToCents(amortizeAmountStr);
    if (amountCents <= 0) return;
    try {
      const targetDebt = debts.find((d) => d.id === debtId);
      const currentPrincipal = targetDebt ? targetDebt.principal_cents : 0;
      const newPrincipal = Math.max(0, currentPrincipal - amountCents);

      const { error } = await supabase
        .from('debts')
        .update({ principal_cents: newPrincipal })
        .eq('id', debtId);

      if (error) throw error;

      setAmortizeDebtId(null);
      setAmortizeAmountStr('');
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao amortizar dívida');
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    if (!confirm('Deseja excluir esta dívida?')) return;
    try {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', debtId);

      if (error) throw error;
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir dívida');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <span className="micro-label">Planejamento Estratégico</span>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            Metas & Quitação de Dívidas
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand/90 text-paper rounded-[6px] font-semibold text-xs transition-editorial shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nova Meta</span>
          </button>
          <button
            onClick={() => setIsDebtModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-2 border border-hairline text-danger rounded-[6px] font-medium text-xs transition-editorial shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nova Dívida</span>
          </button>
        </div>
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
            <div className="p-8 bg-surface border border-hairline rounded-[12px] text-center space-y-3">
              <Inbox className="w-6 h-6 mx-auto text-ink-3" />
              <p className="font-display text-sm font-medium text-ink">Nenhuma meta cadastrada</p>
              <p className="text-xs text-ink-2">Defina objetivos como Reserva de Emergência, Viagem ou Casa Própria.</p>
              <button
                onClick={() => setIsGoalModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-paper text-xs font-semibold rounded-[6px] hover:bg-brand/90 transition-editorial cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Primeira Meta</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => {
                const percent = goal.target_cents > 0 ? Math.min(100, Math.round((goal.current_cents / goal.target_cents) * 100)) : 0;
                const isContributing = contributeGoalId === goal.id;

                return (
                  <div key={goal.id} className="p-3.5 sm:p-4 bg-surface border border-hairline rounded-[12px] shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 text-xs">
                      <div className="min-w-0">
                        <span className="font-medium text-ink text-sm block truncate">{goal.name}</span>
                        {goal.deadline && (
                          <span className="text-[10px] text-ink-3">Prazo estimado: {goal.deadline}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <span className="font-mono tnum font-semibold text-ink">
                          {formatCentsToBRL(goal.current_cents)} <span className="text-ink-3 font-normal">/ {formatCentsToBRL(goal.target_cents)}</span>
                        </span>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1 text-ink-3 hover:text-danger rounded-[4px] cursor-pointer"
                          title="Excluir meta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-ink-3 font-mono">
                        <span>Progresso</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-surface-2 border border-hairline rounded-full overflow-hidden">
                        <div className="h-full bg-brand transition-all duration-300" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    {/* Aportar Controls */}
                    {isContributing ? (
                      <div className="flex items-center gap-2 pt-2 border-t border-hairline">
                        <span className="text-xs text-ink-3 font-mono">R$</span>
                        <input
                          type="text"
                          value={contributeAmountStr}
                          onChange={(e) => setContributeAmountStr(e.target.value)}
                          placeholder="Ex: 500,00"
                          className="flex-1 p-1.5 bg-paper border border-hairline rounded-[4px] text-xs font-mono text-ink focus:outline-none focus:border-ink"
                          autoFocus
                        />
                        <button
                          onClick={() => handleContribute(goal.id)}
                          className="px-2.5 py-1 bg-brand text-paper rounded-[4px] text-xs font-semibold hover:bg-brand/90 cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => { setContributeGoalId(null); setContributeAmountStr(''); }}
                          className="px-2 py-1 bg-surface-2 text-ink rounded-[4px] text-xs hover:bg-hairline cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => setContributeGoalId(goal.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline cursor-pointer"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          <span>+ Aportar Valor</span>
                        </button>
                      </div>
                    )}

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
            <div className="p-8 bg-surface border border-hairline rounded-[12px] text-center space-y-3">
              <CheckCircle2 className="w-6 h-6 mx-auto text-brand" />
              <p className="font-display text-sm font-medium text-ink">Nenhuma dívida cadastrada</p>
              <p className="text-xs text-ink-2">O casal está livre de pendências financeiras ativas.</p>
              <button
                onClick={() => setIsDebtModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-hairline text-danger text-xs font-semibold rounded-[6px] hover:bg-hairline transition-editorial cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Financiamento ou Dívida</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDebts.map((debt, index) => {
                const isAmortizing = amortizeDebtId === debt.id;

                return (
                  <div key={debt.id} className="p-3.5 sm:p-4 bg-surface border border-hairline rounded-[12px] shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-surface-2 border border-hairline flex items-center justify-center font-mono font-bold text-[10px] text-ink-3 shrink-0">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-medium text-ink text-sm block truncate">{debt.name}</span>
                          <span className="text-[10px] text-ink-3 truncate block">
                            Juros: {(debt.interest_rate_permille / 10).toFixed(1)}% a.a. | Mínimo: {formatCentsToBRL(debt.minimum_payment_cents)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <span className="font-mono font-semibold text-danger tnum text-sm">
                          {formatCentsToBRL(debt.principal_cents)}
                        </span>
                        <button
                          onClick={() => handleDeleteDebt(debt.id)}
                          className="p-1 text-ink-3 hover:text-danger rounded-[4px] cursor-pointer"
                          title="Excluir dívida"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Amortize Controls */}
                    {isAmortizing ? (
                      <div className="flex items-center gap-2 pt-2 border-t border-hairline">
                        <span className="text-xs text-ink-3 font-mono">R$</span>
                        <input
                          type="text"
                          value={amortizeAmountStr}
                          onChange={(e) => setAmortizeAmountStr(e.target.value)}
                          placeholder="Ex: 1.000,00"
                          className="flex-1 p-1.5 bg-paper border border-hairline rounded-[4px] text-xs font-mono text-ink focus:outline-none focus:border-ink"
                          autoFocus
                        />
                        <button
                          onClick={() => handleAmortize(debt.id)}
                          className="px-2.5 py-1 bg-danger text-paper rounded-[4px] text-xs font-semibold hover:bg-danger/90 cursor-pointer"
                        >
                          Amortizar
                        </button>
                        <button
                          onClick={() => { setAmortizeDebtId(null); setAmortizeAmountStr(''); }}
                          className="px-2 py-1 bg-surface-2 text-ink rounded-[4px] text-xs hover:bg-hairline cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => setAmortizeDebtId(debt.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-danger hover:underline cursor-pointer"
                        >
                          <ArrowDownRight className="w-3 h-3" />
                          <span>- Amortizar Saldo</span>
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Modais */}
      <AddGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSuccess={onRefresh}
      />

      <AddDebtModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        onSuccess={onRefresh}
      />

    </div>
  );
}
