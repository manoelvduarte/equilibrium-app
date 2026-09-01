'use client';

import React from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { MOCK_CATEGORIES } from '@equilibrium/db';
import { Target, AlertTriangle, AlertCircle, CheckCircle2, TrendingUp, Layers, RefreshCw } from 'lucide-react';

export function BudgetModule() {
  const envelopeCategories = MOCK_CATEGORIES.filter((c) => c.budgetStyle === 'envelope');
  const flexCategories = MOCK_CATEGORIES.filter((c) => c.budgetStyle === 'flex' && c.kind === 'expense');
  const fixedCategories = MOCK_CATEGORIES.filter((c) => c.budgetStyle === 'fixed');

  const totalLimit = MOCK_CATEGORIES.reduce((sum, c) => sum + (c.kind === 'expense' ? c.limitCents : 0), 0);
  const totalSpent = MOCK_CATEGORIES.reduce((sum, c) => sum + (c.kind === 'expense' ? c.spentCents : 0), 0);
  const overallPercentage = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* Overview Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <Target className="w-4 h-4" />
            <span>Motor de Orçamento Duplo (Envelope + Flex + Fixo)</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Visão Geral de Orçamento do Mês</h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Acompanhe a alocação dos seus envelopes e limites flexíveis. Alertas são acionados automaticamente ao atingir 80% do teto.
          </p>
        </div>

        <div className="flex items-center gap-6 bg-slate-950/80 border border-slate-800 px-6 py-4 rounded-2xl w-full lg:w-auto justify-between lg:justify-start">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Teto Total</span>
            <p className="font-mono font-bold text-slate-200 text-lg">{formatCentsToBRL(totalLimit)}</p>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Consumido</span>
            <p className={`font-mono font-bold text-lg ${overallPercentage > 100 ? 'text-rose-400' : overallPercentage > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {formatCentsToBRL(totalSpent)} ({overallPercentage}%)
            </p>
          </div>
        </div>
      </div>

      {/* Grid das 3 Modalidades de Orçamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Categorias Envelope (YNAB / Actual style) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
              <span className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">✉️</span>
              <span>Envelopes (Alocação Estrita)</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">YNAB Style</span>
          </div>

          <div className="space-y-4">
            {envelopeCategories.map((cat) => {
              const pct = cat.limitCents > 0 ? Math.round((cat.spentCents / cat.limitCents) * 100) : 0;
              const isWarning = pct >= 80 && pct < 100;
              const isDanger = pct >= 100;

              return (
                <div key={cat.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-200">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <span className={isDanger ? 'text-rose-400 font-bold' : isWarning ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {formatCentsToBRL(cat.spentCents)}
                      </span>
                      <span className="text-slate-500">/ {formatCentsToBRL(cat.limitCents)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    ></div>
                  </div>

                  {/* Alertas */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Envelope acumulativo</span>
                    {isDanger ? (
                      <span className="flex items-center gap-1 text-rose-400 font-bold">
                        <AlertCircle className="w-3 h-3" /> Teto estourado (+{pct - 100}%)
                      </span>
                    ) : isWarning ? (
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <AlertTriangle className="w-3 h-3" /> Alerta &gt;80% consumido
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Dentro da meta ({pct}%)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Categorias Flex (Monarch style) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
              <span className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">📊</span>
              <span>Flexível (Monarch Style)</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">Variável</span>
          </div>

          <div className="space-y-4">
            {flexCategories.map((cat) => {
              const pct = cat.limitCents > 0 ? Math.round((cat.spentCents / cat.limitCents) * 100) : 0;

              return (
                <div key={cat.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-200">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                    <span className="font-mono text-slate-300">
                      {formatCentsToBRL(cat.spentCents)} <span className="text-slate-500">/ {formatCentsToBRL(cat.limitCents)}</span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Limite ajustável</span>
                    <span className="font-mono">{pct}% utilizado</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Categorias Fixas */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
              <span className="p-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">🔒</span>
              <span>Despesas Fixas & Recorrentes</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">Comprometido</span>
          </div>

          <div className="space-y-4">
            {fixedCategories.map((cat) => {
              const pct = cat.limitCents > 0 ? Math.round((cat.spentCents / cat.limitCents) * 100) : 0;

              return (
                <div key={cat.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-200">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {formatCentsToBRL(cat.spentCents)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 text-slate-400">
                      <RefreshCw className="w-3 h-3 text-slate-500" /> Recorrência Mensal
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">Pago (100%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
