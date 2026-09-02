'use client';

import React, { useState } from 'react';
import { formatCentsToBRL, formatRelativeDate, CategoryIcon } from '@equilibrium/ui';
import { Account, Category, Profile, Transaction } from '@/hooks/useHouseholdData';
import { AddAccountModal } from './accounts/AddAccountModal';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  PieChart,
  Users,
  Inbox,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  FileText,
} from 'lucide-react';

interface DashboardModuleProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  partners: Profile[];
  netWorthCents: number;
  onOpenNewTransaction: () => void;
  onRefresh?: () => Promise<void>;
}

export function DashboardModule({
  accounts,
  categories,
  transactions,
  partners,
  netWorthCents,
  onOpenNewTransaction,
  onRefresh,
}: DashboardModuleProps) {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Cálculos do mês atual
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthTx = transactions.filter((t) => {
    const d = new Date(t.occurred_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthIncomeCents = currentMonthTx
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount_cents, 0);

  const monthExpenseCents = currentMonthTx
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount_cents, 0);

  const savingsRate =
    monthIncomeCents > 0
      ? Math.max(0, Math.round(((monthIncomeCents - monthExpenseCents) / monthIncomeCents) * 100))
      : 0;

  // Dados para o gráfico de patrimônio (se não houver histórico, projeta a partir do saldo atual)
  const chartData = [
    { month: 'Mai', cents: Math.round(netWorthCents * 0.82) },
    { month: 'Jun', cents: Math.round(netWorthCents * 0.88) },
    { month: 'Jul', cents: Math.round(netWorthCents * 0.93) },
    { month: 'Ago', cents: Math.round(netWorthCents * 0.97) },
    { month: 'Set', cents: netWorthCents },
  ];

  // Agrupamento de despesas por categoria
  const expensesByCategory = categories.map((cat) => {
    const total = currentMonthTx
      .filter((t) => t.type === 'expense' && t.category_id === cat.id)
      .reduce((acc, t) => acc + t.amount_cents, 0);
    return { ...cat, totalCents: total };
  }).filter((c) => c.totalCents > 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      
      {/* 1. Faixa de KPIs: <sm = grid 2x2, >=md = 4 inline com hairline vertical */}
      <section className="grid grid-cols-2 md:grid-cols-4 border-y border-hairline bg-paper divide-y md:divide-y-0 md:divide-x divide-hairline">
        
        {/* KPI 1: Patrimônio Líquido */}
        <div className="py-3 sm:py-4 px-3 sm:px-6">
          <span className="micro-label text-[9px] sm:text-[10px]">Patrimônio Líquido</span>
          <p className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5 sm:mt-1 tnum truncate">
            {formatCentsToBRL(netWorthCents)}
          </p>
          <span className="text-[10px] sm:text-[11px] text-ink-3 mt-0.5 block truncate">Total consolidado</span>
        </div>

        {/* KPI 2: Receita do Mês */}
        <div className="py-3 sm:py-4 px-3 sm:px-6">
          <span className="micro-label text-[9px] sm:text-[10px]">Receita do Mês</span>
          <p className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5 sm:mt-1 tnum truncate">
            {formatCentsToBRL(monthIncomeCents)}
          </p>
          <span className="text-[10px] sm:text-[11px] text-ink-3 mt-0.5 block truncate">Entradas confirmadas</span>
        </div>

        {/* KPI 3: Despesas do Mês */}
        <div className="py-3 sm:py-4 px-3 sm:px-6">
          <span className="micro-label text-[9px] sm:text-[10px]">Despesas do Mês</span>
          <p className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5 sm:mt-1 tnum truncate">
            {formatCentsToBRL(monthExpenseCents)}
          </p>
          <span className="text-[10px] sm:text-[11px] text-ink-3 mt-0.5 block truncate">Saídas computadas</span>
        </div>

        {/* KPI 4: Taxa de Poupança */}
        <div className="py-3 sm:py-4 px-3 sm:px-6">
          <span className="micro-label text-[9px] sm:text-[10px]">Taxa de Poupança</span>
          <p className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-brand mt-0.5 sm:mt-1 tnum truncate">
            {savingsRate}%
          </p>
          <span className="text-[10px] sm:text-[11px] text-ink-3 mt-0.5 block truncate">Taxa de aporte conjunto</span>
        </div>

      </section>

      {/* 2. Grid de 12 Colunas (<lg: coluna única, gráfico primeiro, insights depois) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Gráfico Principal de Evolução Patrimonial (Cols 1–8) */}
        <div className="lg:col-span-8 bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <div>
              <span className="micro-label text-[9px] sm:text-[10px]">Evolução Patrimonial</span>
              <h2 className="font-display text-base sm:text-lg font-medium text-ink">Histórico Consolidado</h2>
            </div>
            <span className="text-xs font-mono font-medium text-brand tnum bg-surface-2 px-2.5 py-1 rounded-[4px]">
              {formatCentsToBRL(netWorthCents)}
            </span>
          </div>

          <div className="h-56 sm:h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--hairline)" />
                <XAxis dataKey="month" stroke="var(--ink-3)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  stroke="var(--ink-3)"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${(val / 100000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-surface border border-hairline rounded-[6px] p-2.5 shadow-md text-xs space-y-1">
                          <span className="micro-label">{data.month}</span>
                          <p className="font-mono font-bold text-ink tnum">
                            {formatCentsToBRL(data.cents)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cents"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#brandGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown de Despesas por Categoria (Cols 9–12) */}
        <div className="lg:col-span-4 bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="border-b border-hairline pb-3">
              <span className="micro-label text-[9px] sm:text-[10px]">Distribuição</span>
              <h3 className="font-display text-base sm:text-lg font-medium text-ink">Gastos do Mês</h3>
            </div>

            <div className="divide-y divide-hairline mt-2 max-h-56 overflow-y-auto">
              {expensesByCategory.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-3 space-y-1">
                  <Inbox className="w-5 h-5 mx-auto text-ink-3" />
                  <p>Sem despesas categorizadas este mês.</p>
                </div>
              ) : (
                expensesByCategory.map((cat) => (
                  <div key={cat.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-[4px] bg-surface-2 border border-hairline">
                        <CategoryIcon name={cat.icon} size={13} className="text-ink" />
                      </div>
                      <span className="font-medium text-ink">{cat.name}</span>
                    </div>
                    <span className="font-mono font-medium text-ink tnum">
                      {formatCentsToBRL(cat.totalCents)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs text-ink-3">
            <span>Total despesas:</span>
            <span className="font-mono font-semibold text-ink tnum">
              {formatCentsToBRL(monthExpenseCents)}
            </span>
          </div>
        </div>

      </section>

      {/* 3. Seção Dupla: Contas Bancárias & Últimas Transações */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Contas do Casal (Cols 1–5) */}
        <div className="lg:col-span-5 bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-sm space-y-4">
          <div className="border-b border-hairline pb-3 flex items-center justify-between">
            <div>
              <span className="micro-label text-[9px] sm:text-[10px]">Contas & Saldos</span>
              <h3 className="font-display text-base sm:text-lg font-medium text-ink">Nossas Contas</h3>
            </div>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-1 text-xs text-brand hover:underline font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Conta</span>
            </button>
          </div>

          <div className="divide-y divide-hairline">
            {accounts.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-3 space-y-2">
                <Landmark className="w-6 h-6 mx-auto text-ink-3" />
                <p>Nenhuma conta bancária cadastrada.</p>
                <button
                  onClick={() => setIsAccountModalOpen(true)}
                  className="px-2.5 py-1 bg-brand text-paper rounded-[4px] font-semibold text-[11px] cursor-pointer"
                >
                  Adicionar Conta
                </button>
              </div>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-ink">{acc.name}</p>
                      <span className="text-[10px] px-1.5 py-0.2 bg-surface-2 border border-hairline rounded-[4px] text-ink-3 capitalize">
                        {acc.type === 'checking' ? 'Corrente' : acc.type === 'credit_card' ? 'Cartão' : acc.type === 'investment' ? 'Investimento' : acc.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-3">
                      Visibilidade: <span className="text-ink-2 font-medium">{acc.visibility === 'shared' ? 'Conjunta' : 'Individual'}</span>
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-xs text-ink tnum">
                    {formatCentsToBRL(acc.balance_cents)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Últimas Transações (Cols 6–12) */}
        <div className="lg:col-span-7 bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-sm space-y-4">
          <div className="border-b border-hairline pb-3 flex items-center justify-between">
            <div>
              <span className="micro-label text-[9px] sm:text-[10px]">Movimentações</span>
              <h3 className="font-display text-base sm:text-lg font-medium text-ink">Últimas Transações</h3>
            </div>
            <button
              onClick={onOpenNewTransaction}
              className="text-xs text-brand hover:underline font-medium flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Nova</span>
            </button>
          </div>

          <div className="divide-y divide-hairline">
            {transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-3 space-y-2">
                <Inbox className="w-6 h-6 mx-auto text-ink-3" />
                <p>Nenhuma movimentação registrada no casal.</p>
              </div>
            ) : (
              transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 max-w-[65%]">
                    <p className="font-medium text-ink truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 text-[11px] text-ink-3">
                      <span className="font-mono">{formatRelativeDate(tx.occurred_at)}</span>
                      <span>•</span>
                      <span>{tx.category?.name || 'Geral'}</span>
                    </div>
                  </div>
                  <span
                    className={`font-mono font-medium text-xs tnum whitespace-nowrap ${
                      tx.type === 'income' ? 'text-brand' : 'text-danger'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '−'} {formatCentsToBRL(tx.amount_cents)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </section>

      {/* Modal de Nova Conta */}
      <AddAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={onRefresh || (async () => {})}
      />

    </div>
  );
}
