'use client';

import React from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { MOCK_PROFILES, MOCK_ACCOUNTS, MOCK_CATEGORIES } from '@equilibrium/db';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  PieChart,
  Calendar,
  Sparkles,
  Users,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';

export function DashboardModule() {
  // 1. Dados Históricos de Patrimônio Líquido (12 meses)
  const netWorthData = [
    { month: 'Out/25', cents: 4800000 },
    { month: 'Nov/25', cents: 5120000 },
    { month: 'Dez/25', cents: 5450000 },
    { month: 'Jan/26', cents: 5900000 },
    { month: 'Fev/26', cents: 6200000 },
    { month: 'Mar/26', cents: 6480000 },
    { month: 'Abr/26', cents: 6720000 },
    { month: 'Mai/26', cents: 7050000 },
    { month: 'Jun/26', cents: 7300000 },
    { month: 'Jul/26', cents: 7600000 },
    { month: 'Ago/26', cents: 7843000 },
    { month: 'Set/26', cents: 7843000 },
  ];

  // 2. Heatmap de Gastos Diários (Estilo GitHub 30 dias recentes)
  const heatmapDays = Array.from({ length: 35 }, (_, i) => {
    const intensity = (i * 17 + 5) % 4; // 0: sem gasto, 1: leve, 2: médio, 3: alto
    return { day: i + 1, intensity };
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Net Worth Curve (12 Meses) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>Evolução Patrimonial</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Patrimônio Líquido nos Últimos 12 Meses</h2>
          </div>
          <div className="flex items-center gap-2 font-mono text-emerald-400 font-bold text-lg">
            <span>{formatCentsToBRL(7843000)}</span>
            <span className="text-xs font-normal text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              +63.3% YoY
            </span>
          </div>
        </div>

        {/* Recharts Curve */}
        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netWorthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => `R$ ${(val / 100000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                formatter={(value: any) => [formatCentsToBRL(Number(value)), 'Patrimônio']}
              />
              <Line
                type="monotone"
                dataKey="cents"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Sankey / Treemap + Visão Meu vs Nosso + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. Fluxo Sankey / Treemap de Gastos por Categoria */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-base">
              <PieChart className="w-5 h-5 text-indigo-400" />
              <span>Distribuição Proporcional (Treemap)</span>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">Setembro/2026</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 bg-indigo-950/40 border border-indigo-800/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-indigo-400 font-bold uppercase">🏠 Moradia (42%)</span>
              <p className="font-mono font-bold text-slate-100 text-base">{formatCentsToBRL(380000)}</p>
            </div>
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-emerald-400 font-bold uppercase">🛒 Mercado (24%)</span>
              <p className="font-mono font-bold text-slate-100 text-base">{formatCentsToBRL(164000)}</p>
            </div>
            <div className="p-4 bg-amber-950/40 border border-amber-800/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase">🍕 Restaurantes (16%)</span>
              <p className="font-mono font-bold text-slate-100 text-base">{formatCentsToBRL(108000)}</p>
            </div>
            <div className="p-4 bg-rose-950/40 border border-rose-800/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-rose-400 font-bold uppercase">✈️ Lazer & Tech (18%)</span>
              <p className="font-mono font-bold text-slate-100 text-base">{formatCentsToBRL(10690)}</p>
            </div>
          </div>
        </div>

        {/* 3. Visão "Meu vs Nosso" (Split por Pessoa) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-base">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Visão "Meu vs Nosso" (Rateio de Casal)</span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">50% / 50%</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={MOCK_PROFILES[0].avatarUrl}
                  alt="Alex"
                  width={32}
                  height={32}
                  style={{ width: '32px', height: '32px', borderRadius: '9999px', objectFit: 'cover' }}
                  className="w-8 h-8 rounded-full border border-emerald-500 object-cover"
                />
                <div>
                  <span className="font-semibold text-slate-200 text-xs">Alex Silva</span>
                  <p className="text-[10px] text-slate-500">Gasto Individual + 50% Compartilhado</p>
                </div>
              </div>
              <span className="font-mono font-bold text-slate-200 text-sm">{formatCentsToBRL(379450)}</span>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={MOCK_PROFILES[1].avatarUrl}
                  alt="Sam"
                  width={32}
                  height={32}
                  style={{ width: '32px', height: '32px', borderRadius: '9999px', objectFit: 'cover' }}
                  className="w-8 h-8 rounded-full border border-indigo-500 object-cover"
                />
                <div>
                  <span className="font-semibold text-slate-200 text-xs">Sam Costa</span>
                  <p className="text-[10px] text-slate-500">Gasto Individual + 50% Compartilhado</p>
                </div>
              </div>
              <span className="font-mono font-bold text-slate-200 text-sm">{formatCentsToBRL(379440)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Heatmap Diário de Gastos & Insights em Texto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Heatmap (30 Dias) */}
        <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Heatmap Diário</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Últimos 30 dias</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {heatmapDays.map((d) => (
              <div
                key={d.day}
                className={`h-7 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${
                  d.intensity === 0
                    ? 'bg-slate-950 text-slate-600 border border-slate-800'
                    : d.intensity === 1
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                    : d.intensity === 2
                    ? 'bg-emerald-800 text-emerald-200'
                    : 'bg-emerald-500 text-slate-950 font-black'
                }`}
                title={`Dia ${d.day}: Intensidade ${d.intensity}`}
              >
                {d.day}
              </div>
            ))}
          </div>
        </div>

        {/* Narrative Insights Card (Texto explicativo) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span>Análise Narrativa de Inteligência Financeira</span>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              💡 <strong className="text-slate-100">Resumo de Fechamento do Casal:</strong> No mês de Agosto, o casal acumulou um aporte líquido positivo de <strong className="text-emerald-400 font-mono">R$ 11.541,00</strong>. A taxa de poupança atingiu <strong className="text-emerald-400">63% da receita bruta</strong>.
            </p>
            <p>
              ⚠️ <strong className="text-amber-400">Alerta de Categoria:</strong> A categoria de <strong className="text-slate-100">Restaurantes & Delivery</strong> ultrapassou 90% da meta planejada devido a 3 jantares no fim de semana. Recomendamos segurar novos pedidos nos próximos 5 dias.
            </p>
            <p>
              🎯 <strong className="text-indigo-400">Projeção do Mês:</strong> Mantendo o ritmo atual, a Reserva de Emergência atingirá a meta de 6 meses de despesas fixas até a primeira semana de Novembro/2026.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
