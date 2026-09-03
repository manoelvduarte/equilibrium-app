'use client';

import React, { useState } from 'react';
import { formatCentsToCurrency, CategoryIcon } from '@equilibrium/ui';
import { Category, Transaction, Budget } from '@/hooks/useHouseholdData';
import { EditBudgetModal } from './budget/EditBudgetModal';
import { AddCategoryModal } from './budget/AddCategoryModal';
import { CategoryBudgetModal } from './budget/CategoryBudgetModal';
import {
  PieChart,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Plus,
  SlidersHorizontal,
  Pencil,
  Info,
  HelpCircle,
} from 'lucide-react';

interface BudgetModuleProps {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  onOpenNewTransaction: () => void;
  onRefresh?: () => Promise<void>;
}

export function BudgetModule({
  categories,
  transactions,
  budgets,
  onOpenNewTransaction,
  onRefresh,
}: BudgetModuleProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCatForBudget, setSelectedCatForBudget] = useState<Category | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Despesas do mês corrente
  const currentMonthExpenses = transactions.filter((t) => {
    const d = new Date(t.occurred_at);
    return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Mapeamento de orçamento por categoria (busca no banco de dados)
  const budgetMap = new Map<string, number>();
  budgets.forEach((b) => budgetMap.set(b.category_id, b.limit_cents));

  const budgetCategories = categories.map((cat) => {
    const spentCents = currentMonthExpenses
      .filter((t) => t.category_id === cat.id)
      .reduce((acc, t) => acc + t.amount_cents, 0);

    const limitCents = budgetMap.get(cat.id) || 0; // 0 se não configurado
    const hasLimit = limitCents > 0;
    const percentage = hasLimit ? Math.min(100, Math.round((spentCents / limitCents) * 100)) : 0;
    const isOver = hasLimit && spentCents > limitCents;
    const isWarning = hasLimit && percentage >= 80 && !isOver;

    return {
      ...cat,
      spentCents,
      limitCents,
      hasLimit,
      percentage,
      isOver,
      isWarning,
    };
  });

  const expenseCategories = budgetCategories.filter((c) => c.kind === 'expense');
  const totalBudgetLimit = expenseCategories.reduce((acc, c) => acc + c.limitCents, 0);
  const totalBudgetSpent = expenseCategories.reduce((acc, c) => acc + c.spentCents, 0);
  const totalPercentage =
    totalBudgetLimit > 0 ? Math.min(100, Math.round((totalBudgetSpent / totalBudgetLimit) * 100)) : 0;

  const envelopeCategories = expenseCategories.filter((c) => c.budget_style === 'envelope');
  const flexCategories = expenseCategories.filter((c) => c.budget_style === 'flex');
  const fixedCategories = expenseCategories.filter((c) => c.budget_style === 'fixed');

  const selectedCatLimit = selectedCatForBudget ? budgetMap.get(selectedCatForBudget.id) || 0 : 0;

  return (
    <div className="space-y-6">
      
      {/* Header & Global Progress */}
      <div className="border-b border-hairline pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="micro-label">Planejamento Duplo</span>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="text-[11px] text-brand hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Como funciona o orçamento?</span>
              </button>
            </div>
            <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
              Orçamento do Casal
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-2 border border-hairline text-ink rounded-[6px] font-medium text-xs transition-editorial shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-ink-2" />
              <span>Ajustar Todos os Tetos</span>
            </button>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand/90 text-paper rounded-[6px] font-semibold text-xs transition-editorial shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Nova Categoria</span>
            </button>
          </div>
        </div>

        {/* Guia Didático das 3 Colunas (Expansível ou Dica Rápida) */}
        {showGuide && (
          <div className="p-4 bg-surface-2 border border-hairline rounded-[10px] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-in fade-in duration-200">
            <div className="space-y-1">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand" />
                1. Envelope Rígido
              </span>
              <p className="text-ink-2 text-[11px] leading-relaxed">
                Para gastos essenciais (como Mercado e Alimentação). Vocês reservam um valor no início do mês e vão consumindo aos poucos.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning" />
                2. Estilo Flexível
              </span>
              <p className="text-ink-2 text-[11px] leading-relaxed">
                Para despesas com estilo de vida (restaurantes, delivery, cinema). Um teto máximo que pode ser flexibilizado conforme o mês.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-ink-2" />
                3. Custos Fixos & Parcelas
              </span>
              <p className="text-ink-2 text-[11px] leading-relaxed">
                Para contas com valor fixado todo mês (como a <strong>Prestação do Carro / Bibi</strong>, aluguel, condomínio, internet). O valor aqui é a parcela mensal exata.
              </p>
            </div>
          </div>
        )}

        {/* Global Progress Strip */}
        <div className="space-y-1.5 pt-1">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs font-mono text-ink">
            <span className="text-ink-2">Total Comprometido no Mês:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold">{formatCentsToCurrency(totalBudgetSpent, 'EUR')}</span>
              <span className="text-ink-3">/</span>
              <span className="text-ink-2">
                {totalBudgetLimit > 0 ? formatCentsToCurrency(totalBudgetLimit, 'EUR') : 'Sem tetos globais'}
              </span>
              {totalBudgetLimit > 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.2 bg-surface-2 border border-hairline rounded-[4px] text-brand ml-1">
                  {totalPercentage}%
                </span>
              )}
            </div>
          </div>
          {totalBudgetLimit > 0 && (
            <div className="w-full h-2 bg-surface-2 border border-hairline rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  totalPercentage > 90 ? 'bg-danger' : totalPercentage > 75 ? 'bg-warning' : 'bg-brand'
                }`}
                style={{ width: `${totalPercentage}%` }}
              />
            </div>
          )}
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
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-paper text-xs font-semibold rounded-[6px] hover:bg-brand/90 transition-editorial cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Categoria</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Seção 1: Envelope (Mercado, Gastos Essenciais) */}
          <div className="bg-surface border border-hairline rounded-[12px] p-5 shadow-xs space-y-4">
            <div className="border-b border-hairline pb-2.5 flex items-center justify-between">
              <div>
                <span className="micro-label">Envelope Rígido</span>
                <h2 className="font-display text-base font-medium text-ink">Essenciais & Alimentação</h2>
              </div>
              <span className="text-[10px] text-ink-3 font-mono">Consumo</span>
            </div>

            <div className="space-y-2">
              {envelopeCategories.length === 0 ? (
                <p className="text-xs text-ink-3 py-2">Nenhuma categoria neste modelo.</p>
              ) : (
                envelopeCategories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCatForBudget(cat)}
                    className="p-2.5 rounded-[8px] bg-surface-2/30 hover:bg-surface-2 border border-transparent hover:border-hairline transition-editorial cursor-pointer space-y-1.5 group"
                    title="Clique para definir ou alterar o teto deste envelope"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || '#A96A3C' }}
                        />
                        <span className="font-medium text-ink truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono tnum text-ink text-[11px]">
                          {formatCentsToCurrency(cat.spentCents, 'EUR')}{' '}
                          <span className="text-ink-3">/</span>{' '}
                          {cat.hasLimit ? (
                            formatCentsToCurrency(cat.limitCents, 'EUR')
                          ) : (
                            <span className="text-brand text-[10px] font-sans hover:underline">+ Definir teto</span>
                          )}
                        </span>
                        <Pencil className="w-3 h-3 text-ink-3 group-hover:text-ink opacity-40 group-hover:opacity-100 transition-editorial" />
                      </div>
                    </div>

                    {cat.hasLimit ? (
                      <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            cat.isOver ? 'bg-danger' : cat.isWarning ? 'bg-warning' : 'bg-brand'
                          }`}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    ) : (
                      <div className="text-[10px] text-ink-3 italic">
                        Sem envelope definido para este mês.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Seção 2: Flex (Restaurantes, Lazer, Transporte) */}
          <div className="bg-surface border border-hairline rounded-[12px] p-5 shadow-xs space-y-4">
            <div className="border-b border-hairline pb-2.5 flex items-center justify-between">
              <div>
                <span className="micro-label">Estilo Flexível</span>
                <h2 className="font-display text-base font-medium text-ink">Estilo de Vida & Lazer</h2>
              </div>
              <span className="text-[10px] text-ink-3 font-mono">Teto Dinâmico</span>
            </div>

            <div className="space-y-2">
              {flexCategories.length === 0 ? (
                <p className="text-xs text-ink-3 py-2">Nenhuma categoria neste modelo.</p>
              ) : (
                flexCategories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCatForBudget(cat)}
                    className="p-2.5 rounded-[8px] bg-surface-2/30 hover:bg-surface-2 border border-transparent hover:border-hairline transition-editorial cursor-pointer space-y-1.5 group"
                    title="Clique para definir ou alterar o teto de gastos"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || '#23606B' }}
                        />
                        <span className="font-medium text-ink truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono tnum text-ink text-[11px]">
                          {formatCentsToCurrency(cat.spentCents, 'EUR')}{' '}
                          <span className="text-ink-3">/</span>{' '}
                          {cat.hasLimit ? (
                            formatCentsToCurrency(cat.limitCents, 'EUR')
                          ) : (
                            <span className="text-brand text-[10px] font-sans hover:underline">+ Definir teto</span>
                          )}
                        </span>
                        <Pencil className="w-3 h-3 text-ink-3 group-hover:text-ink opacity-40 group-hover:opacity-100 transition-editorial" />
                      </div>
                    </div>

                    {cat.hasLimit ? (
                      <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            cat.isOver ? 'bg-danger' : cat.isWarning ? 'bg-warning' : 'bg-brand'
                          }`}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    ) : (
                      <div className="text-[10px] text-ink-3 italic">
                        Sem teto de gastos configurado.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Seção 3: Fixed (Moradia, Assinaturas, Utilidades, Prestação Bibi) */}
          <div className="bg-surface border border-hairline rounded-[12px] p-5 shadow-xs space-y-4">
            <div className="border-b border-hairline pb-2.5 flex items-center justify-between">
              <div>
                <span className="micro-label">Custos Fixos & Parcelas</span>
                <h2 className="font-display text-base font-medium text-ink">Moradia & Recorrentes</h2>
              </div>
              <span className="text-[10px] text-ink-3 font-mono">Parcela Exata</span>
            </div>

            <div className="space-y-2">
              {fixedCategories.length === 0 ? (
                <p className="text-xs text-ink-3 py-2">Nenhuma categoria neste modelo.</p>
              ) : (
                fixedCategories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCatForBudget(cat)}
                    className="p-2.5 rounded-[8px] bg-surface-2/30 hover:bg-surface-2 border border-transparent hover:border-hairline transition-editorial cursor-pointer space-y-1.5 group"
                    title={`Clique para definir o valor exato da parcela de ${cat.name}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || '#5F7461' }}
                        />
                        <span className="font-medium text-ink truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono tnum text-ink text-[11px]">
                          {formatCentsToCurrency(cat.spentCents, 'EUR')}{' '}
                          <span className="text-ink-3">/</span>{' '}
                          {cat.hasLimit ? (
                            formatCentsToCurrency(cat.limitCents, 'EUR')
                          ) : (
                            <span className="text-brand text-[10px] font-sans hover:underline">+ Definir parcela</span>
                          )}
                        </span>
                        <Pencil className="w-3 h-3 text-ink-3 group-hover:text-ink opacity-40 group-hover:opacity-100 transition-editorial" />
                      </div>
                    </div>

                    {cat.hasLimit ? (
                      <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            cat.isOver ? 'bg-danger' : cat.isWarning ? 'bg-warning' : 'bg-brand'
                          }`}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    ) : (
                      <div className="text-[10px] text-ink-3 italic">
                        Clique para definir o valor da parcela mensal.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Modal 1: Ajustar Individualmente a Categoria Clicada */}
      <CategoryBudgetModal
        isOpen={selectedCatForBudget !== null}
        category={selectedCatForBudget}
        currentLimitCents={selectedCatLimit}
        onClose={() => setSelectedCatForBudget(null)}
        onSuccess={onRefresh || (async () => {})}
      />

      {/* Modal 2: Ajustar Todos os Tetos em Massa */}
      <EditBudgetModal
        isOpen={isEditModalOpen}
        categories={categories}
        currentLimits={budgetMap}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={onRefresh || (async () => {})}
      />

      {/* Modal 3: Adicionar Nova Categoria */}
      <AddCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={onRefresh || (async () => {})}
      />

    </div>
  );
}
