'use client';

import React from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { Target, Flame, TrendingDown, ArrowUpRight, Award, ShieldAlert } from 'lucide-react';

export function GoalsDebtsModule() {
  const goals = [
    { id: 'g1', name: 'Viagem Japão 2027', targetCents: 3500000, currentCents: 2100000, deadline: '2027-04-01' },
    { id: 'g2', name: 'Troca de Carro Híbrido', targetCents: 8000000, currentCents: 4500000, deadline: '2027-12-01' },
  ];

  const debts = [
    { id: 'd1', name: 'Financiamento Imobiliário', principalCents: 24500000, aprBps: 980, minPaymentCents: 245000, strategy: 'avalanche' },
    { id: 'd2', name: 'Empréstimo Reformas', principalCents: 1800000, aprBps: 1250, minPaymentCents: 35000, strategy: 'snowball' },
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Metas do Casal */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-base">
            <Target className="w-5 h-5 text-emerald-400" />
            <span>Metas Compartilhadas do Casal (Goals)</span>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded font-mono">
            2 Metas Ativas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const pct = Math.round((g.currentCents / g.targetCents) * 100);
            return (
              <div key={g.id} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-sm">{g.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Prazo: {g.deadline}</span>
                </div>

                <div className="flex justify-between font-mono text-xs">
                  <span className="text-emerald-400 font-bold">{formatCentsToBRL(g.currentCents)}</span>
                  <span className="text-slate-400">Meta: {formatCentsToBRL(g.targetCents)}</span>
                </div>

                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Progresso do Aporte</span>
                  <span className="font-bold font-mono text-emerald-400">{pct}% Concluído</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Gestão de Dívidas (Snowball vs Avalanche) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-base">
            <Flame className="w-5 h-5 text-amber-400" />
            <span>Gestão Estratégica de Dívidas (Debts)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">Avalanche Mode</span>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">Snowball Mode</span>
          </div>
        </div>

        <div className="space-y-3">
          {debts.map((d) => (
            <div key={d.id} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 text-sm">{d.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold ${d.strategy === 'avalanche' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    Estratégia {d.strategy}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                  <span>Juros: <strong className="text-amber-400 font-bold">{(d.aprBps / 100).toFixed(2)}% a.a.</strong></span>
                  <span>•</span>
                  <span>Parcela Mínima: <strong className="text-slate-200">{formatCentsToBRL(d.minPaymentCents)}</strong></span>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Saldo Devedor</span>
                <p className="text-lg font-bold text-rose-400">{formatCentsToBRL(d.principalCents)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
