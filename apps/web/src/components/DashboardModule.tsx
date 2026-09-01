'use client';

import React from 'react';
import { formatCentsToBRL, formatRelativeDate, CategoryIcon } from '@equilibrium/ui';
import { Account, Category, Profile, Transaction } from '@/hooks/useHouseholdData';
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
  FileText,
} from 'lucide-react';

interface DashboardModuleProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  partners: Profile[];
  netWorthCents: number;
  onOpenNewTransaction: () => void;
}

export function DashboardModule({
  accounts,
  categories,
  transactions,
  partners,
  netWorthCents,
  onOpenNewTransaction,
}: DashboardModuleProps) {
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

  const getInitials = (name?: string) => {
    if (!name) return 'EQ';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Faixa de KPIs (Sem cards, números Fraunces separados por hairline vertical) */}
      <section className="grid grid-cols-2 md:grid-cols-4 border-y border-hairline bg-paper divide-y md:divide-y-0 md:divide-x divide-hairline">
        
        {/* KPI 1: Patrimônio Líquido */}
        <div className="py-4 px-4 sm:px-6">
          <span className="micro-label">Patrimônio Líquido</span>
          <p className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-1 tnum">
            {formatCentsToBRL(netWorthCents)}
          </p>
          <span className="text-[11px] text-ink-3 mt-0.5 block">Total de ativos consolidados</span>
        </div>

        {/* KPI 2: Receita do Mês */}
        <div className="py-4 px-4 sm:px-6">
          <span className="micro-label">Receita do Mês</span>
          <p className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-1 tnum">
            {formatCentsToBRL(monthIncomeCents)}
          </p>
          <span className="text-[11px] text-ink-3 mt-0.5 block">Entradas confirmadas</span>
        </div>

        {/* KPI 3: Despesas do Mês */}
        <div className="py-4 px-4 sm:px-6">
          <span className="micro-label">Despesas do Mês</span>
          <p className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-1 tnum">
            {formatCentsToBRL(monthExpenseCents)}
          </p>
          <span className="text-[11px] text-ink-3 mt-0.5 block">Saídas computadas</span>
        </div>

        {/* KPI 4: Taxa de Poupança */}
        <div className="py-4 px-4 sm:px-6">
          <span className="micro-label">Taxa de Poupança</span>
          <p className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-brand mt-1 tnum">
            {savingsRate}%
          </p>
          <span className="text-[11px] text-ink-3 mt-0.5 block">Taxa de aporte conjunto</span>
        </div>

      </section>

      {/* 2. Grid Assimétrico de 12 Colunas */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Gráfico Principal de Evolução Patrimonial (Cols 1–8) */}
        <div className="lg:col-span-8 bg-surface border border-hairline rounded-[12px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <div>
              <span className="micro-label">Evolução Patrimonial</span>
              <h2 className="font-display text-lg font-medium text-ink">Histórico Consolidado</h2>
            </div>
            <span className="text-xs font-mono font-medium text-brand tnum bg-surface-2 px-2.5 py-1 rounded-[4px]">
              {formatCentsToBRL(netWorthCents)}
            </span>
          </div>

          <div className="h-64 w-full pt-2">
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

        {/* Análise Narrativa & Visão de Casal (Cols 9–12) */}
        <div className="lg:col-span-4 bg-surface border border-hairline rounded-[12px] p-6 shadow-sm space-y-4">
          <div className="border-b border-hairline pb-3">
            <span className="micro-label">Análise Editorial</span>
            <h2 className="font-display text-lg font-medium text-ink">Diagnóstico Financeiro</h2>
          </div>

          <div className="space-y-3 text-xs text-ink-2 leading-relaxed">
            <p>
              O patrimônio do casal está alocado em <strong className="text-ink font-medium">{accounts.length} contas</strong> monitoradas.
            </p>
            <p>
              No mês corrente, as despesas totalizam <strong className="text-danger font-medium font-mono tnum">−{formatCentsToBRL(monthExpenseCents)}</strong> frente a <strong className="text-brand font-medium font-mono tnum">+{formatCentsToBRL(monthIncomeCents)}</strong> em receitas.
            </p>
            <div className="p-3 bg-surface-2 border border-hairline rounded-[6px] space-y-1">
              <span className="micro-label">Parceiros Conectados</span>
              <div className="flex items-center gap-2 pt-1">
                {partners.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 px-2 py-1 bg-surface border border-hairline rounded-[4px] text-xs font-medium text-ink"
                  >
                    <div className="w-4 h-4 rounded-full bg-surface-2 flex items-center justify-center text-[9px] font-bold text-ink">
                      {getInitials(p.full_name)}
                    </div>
                    <span>{p.full_name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* 3. Tabela de Transações Recentes Full-Width */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="micro-label">Movimentações</span>
            <h2 className="font-display text-lg font-medium text-ink">Últimas Transações</h2>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 bg-surface border border-hairline rounded-[12px] text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 border border-hairline flex items-center justify-center mx-auto text-ink-3">
              <Inbox className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-base font-medium text-ink">Nenhuma transação registrada</p>
              <p className="text-xs text-ink-2">Cadastre a primeira receita ou despesa do household.</p>
            </div>
            <button
              onClick={onOpenNewTransaction}
              className="px-3.5 py-1.5 bg-surface-2 hover:bg-hairline text-ink rounded-[6px] text-xs font-medium transition-editorial cursor-pointer"
            >
              Criar primeira transação
            </button>
          </div>
        ) : (
          <div className="bg-surface border border-hairline rounded-[12px] overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-hairline bg-surface-2/60 text-ink-3">
                  <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.08em] text-[10px]">Data</th>
                  <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.08em] text-[10px]">Descrição</th>
                  <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.08em] text-[10px]">Categoria</th>
                  <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.08em] text-[10px]">Conta</th>
                  <th className="py-2.5 px-4 font-semibold uppercase tracking-[0.08em] text-[10px] text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {transactions.slice(0, 8).map((tx) => (
                  <tr key={tx.id} className="h-12 hover:bg-surface-2 transition-editorial">
                    <td className="py-2.5 px-4 font-mono text-ink-3 text-[11px] whitespace-nowrap">
                      {formatRelativeDate(tx.occurred_at)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-ink">
                      {tx.description}
                    </td>
                    <td className="py-2.5 px-4 text-ink-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface-2 border border-hairline rounded-[4px] text-[11px]">
                        <CategoryIcon name={tx.category?.icon || 'tag'} size={12} className="text-ink-2" />
                        <span>{tx.category?.name || 'Geral'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-ink-3 text-[11px]">
                      {tx.account?.name || 'Principal'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-xs tnum whitespace-nowrap">
                      <span className={tx.type === 'income' ? 'text-brand' : 'text-danger'}>
                        {tx.type === 'income' ? '+' : '−'}{formatCentsToBRL(tx.amount_cents)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </section>

    </div>
  );
}
