'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCentsToCurrency, parseBRLToCents } from '@equilibrium/ui';
import {
  Banknote,
  CheckCircle2,
  AlertCircle,
  Plus,
  Calendar,
  X,
  Loader2,
  HelpCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Account, Category, Profile } from '@/hooks/useHouseholdData';

export interface RecurrenceItem {
  id: string;
  household_id: string;
  template: {
    description: string;
    amount_cents: number;
    type: 'income' | 'expense';
    day_of_month: number;
    account_id: string;
    category_id?: string;
    is_variable?: boolean;
    last_confirmed_month?: string; // Formato "YYYY-MM"
  };
  frequency: string;
  next_run_at: string;
  is_active: boolean;
}

interface RecurringIncomeManagerProps {
  userProfile: Profile | null;
  accounts: Account[];
  categories: Category[];
  onRefresh: () => Promise<void>;
}

export function RecurringIncomeManager({
  userProfile,
  accounts,
  categories,
  onRefresh,
}: RecurringIncomeManagerProps) {
  const [recurrences, setRecurrences] = useState<RecurrenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State para Nova Recorrência
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(10);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isVariable, setIsVariable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // State para Confirmação com Valor Ajustado
  const [adjustingItem, setAdjustingItem] = useState<RecurrenceItem | null>(null);
  const [adjustedAmountStr, setAdjustedAmountStr] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  const supabase = createClient();
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = today.getDate();

  const fetchRecurrences = async () => {
    if (!userProfile?.household_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recurrences')
        .select('*')
        .eq('household_id', userProfile.household_id)
        .eq('is_active', true);

      if (error) {
        console.error('Erro ao buscar recorrências:', error);
      } else if (data) {
        setRecurrences(data as RecurrenceItem[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurrences();
  }, [userProfile?.household_id]);

  // Contas que já podem ser confirmadas este mês (ex: dia 10 chegou ou passou, e ainda não confirmou)
  const pendingConfirmations = recurrences.filter((rec) => {
    const isThisMonthConfirmed = rec.template.last_confirmed_month === currentMonthKey;
    const dueDay = rec.template.day_of_month || 10;
    // Dispara a partir do próprio dia ou até 3 dias antes
    return !isThisMonthConfirmed && currentDay >= dueDay - 2;
  });

  // 1. Confirmar com o valor exato previsto
  const handleConfirmExact = async (rec: RecurrenceItem) => {
    try {
      setLoading(true);
      const targetAccId = rec.template.account_id || accounts[0]?.id;
      if (!targetAccId) throw new Error('Selecione uma conta válida.');

      // 1. Cria a transação confirmada
      const { error: txErr } = await supabase.from('transactions').insert({
        household_id: rec.household_id,
        account_id: targetAccId,
        category_id: rec.template.category_id || null,
        created_by_id: userProfile?.id,
        description: `${rec.template.description} (${today.toLocaleString('pt-BR', { month: 'short' })})`,
        amount_cents: rec.template.amount_cents,
        type: rec.template.type,
        date: today.toISOString().split('T')[0],
        source: 'recurrence',
      });

      if (txErr) throw txErr;

      // 2. Atualiza a recorrência com o último mês confirmado
      const updatedTemplate = {
        ...rec.template,
        last_confirmed_month: currentMonthKey,
      };

      await supabase
        .from('recurrences')
        .update({ template: updatedTemplate })
        .eq('id', rec.id);

      await fetchRecurrences();
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Falha ao confirmar receita recorrente.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Confirmar com valor variável ajustado (ex: bônus, hora extra, descontos)
  const handleConfirmAdjusted = async () => {
    if (!adjustingItem) return;
    const parsedCents = parseBRLToCents(adjustedAmountStr);
    if (parsedCents <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    try {
      setAdjustLoading(true);
      const targetAccId = adjustingItem.template.account_id || accounts[0]?.id;

      // 1. Cria transação com o valor real informado
      const { error: txErr } = await supabase.from('transactions').insert({
        household_id: adjustingItem.household_id,
        account_id: targetAccId,
        category_id: adjustingItem.template.category_id || null,
        created_by_id: userProfile?.id,
        description: `${adjustingItem.template.description} (${today.toLocaleString('pt-BR', { month: 'short' })})`,
        amount_cents: parsedCents,
        type: adjustingItem.template.type,
        date: today.toISOString().split('T')[0],
        source: 'recurrence',
      });

      if (txErr) throw txErr;

      // 2. Marca a recorrência como confirmada neste mês
      const updatedTemplate = {
        ...adjustingItem.template,
        last_confirmed_month: currentMonthKey,
      };

      await supabase
        .from('recurrences')
        .update({ template: updatedTemplate })
        .eq('id', adjustingItem.id);

      setAdjustingItem(null);
      setAdjustedAmountStr('');
      await fetchRecurrences();
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar valor ajustado.');
    } finally {
      setAdjustLoading(false);
    }
  };

  // 3. Salvar nova recorrência
  const handleSaveNewRecurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError('Informe a descrição da receita/despesa.');
      return;
    }

    const cents = parseBRLToCents(amountStr);
    if (cents <= 0) {
      setFormError('Informe um valor previsto válido maior que zero.');
      return;
    }

    const selectedAcc = accountId || accounts[0]?.id;
    if (!selectedAcc) {
      setFormError('Cadastre uma conta bancária antes de criar recorrências.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const template = {
        description: description.trim(),
        amount_cents: cents,
        type,
        day_of_month: Number(dayOfMonth) || 10,
        account_id: selectedAcc,
        category_id: categoryId || null,
        is_variable: isVariable,
      };

      const nextRunDate = new Date(today.getFullYear(), today.getMonth(), Number(dayOfMonth));

      const { error } = await supabase.from('recurrences').insert({
        household_id: userProfile?.household_id,
        template,
        frequency: 'monthly',
        next_run_at: nextRunDate.toISOString(),
        is_active: true,
      });

      if (error) throw error;

      setDescription('');
      setAmountStr('');
      setIsModalOpen(false);
      await fetchRecurrences();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar recorrência.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Smart Prompt: Se houver salário ou receita prevista para hoje/este mês */}
      {pendingConfirmations.map((rec) => (
        <div
          key={rec.id}
          className="relative overflow-hidden p-4 sm:p-5 bg-gradient-to-r from-brand/10 via-surface to-surface border border-brand/30 rounded-[12px] shadow-xs space-y-3 animate-in fade-in-50 duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center shrink-0 text-brand mt-0.5">
                <Banknote className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand text-paper rounded-full text-[9px] font-bold tracking-wide uppercase">
                    Dia {rec.template.day_of_month || 10} • Recorrência
                  </span>
                  <span className="text-[11px] text-ink-3 font-mono">
                    Previsto: {formatCentsToCurrency(rec.template.amount_cents, 'EUR')}
                  </span>
                </div>
                <h3 className="font-display font-medium text-base text-ink leading-tight">
                  {rec.template.description}
                </h3>
                <p className="text-xs text-ink-2 leading-relaxed">
                  Hoje é dia {currentDay}! Seu salário de{' '}
                  <strong className="text-ink">
                    {formatCentsToCurrency(rec.template.amount_cents, 'EUR')}
                  </strong>{' '}
                  caiu na conta? Você recebeu o valor exato ou teve variação?
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={() => handleConfirmExact(rec)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand/90 text-paper rounded-[6px] text-xs font-semibold transition-editorial shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sim, caiu exatamente {formatCentsToCurrency(rec.template.amount_cents, 'EUR')}</span>
            </button>

            <button
              onClick={() => {
                setAdjustingItem(rec);
                setAdjustedAmountStr((rec.template.amount_cents / 100).toFixed(2));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-2 border border-hairline text-ink rounded-[6px] text-xs font-medium transition-editorial shadow-xs cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5 text-gold" />
              <span>Recebi valor diferente (ajustar)</span>
            </button>
          </div>
        </div>
      ))}

      {/* Mini Strip: Gestão de Recorrências do Casal */}
      <div className="p-3 sm:p-4 bg-surface border border-hairline rounded-[12px] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-2 border border-hairline flex items-center justify-center shrink-0 text-ink-2">
            <Calendar className="w-4 h-4 text-brand" />
          </div>
          <div>
            <span className="font-medium text-xs text-ink block">
              Salários & Rendas Recorrentes
            </span>
            <span className="text-[10px] text-ink-3">
              {recurrences.length === 0
                ? 'Nenhuma receita recorrente agendada ainda.'
                : `${recurrences.length} recorrências ativas (pergunta no dia do vencimento).`}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 hover:bg-hairline text-ink rounded-[6px] font-medium text-xs transition-editorial cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-brand stroke-[2.5]" />
          <span>Agendar Salário / Recorrência</span>
        </button>
      </div>

      {/* Modal 1: Agendar Nova Recorrência */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-3 sm:p-4">
          <div className="w-full max-w-md bg-surface border border-hairline rounded-[12px] p-4 sm:p-6 shadow-md space-y-4 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-brand" />
                <h2 className="font-display font-medium text-base sm:text-lg text-ink">
                  Nova Renda / Salário Recorrente
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-ink-3 hover:text-ink rounded-[4px] transition-editorial cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-surface-2 border border-hairline rounded-[6px] flex items-center gap-2 text-xs text-danger">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewRecurrence} className="space-y-3.5 text-xs">
              
              <div className="space-y-1">
                <label className="block micro-label">Descrição da Renda</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Salário Manoel, Salário Giovana, Aluguel"
                  className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block micro-label">Valor Previsto Base (€ / R$)</label>
                  <input
                    type="text"
                    required
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="Ex: 2.000,00"
                    className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block micro-label">Dia do Mês (1 a 31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs font-mono text-ink focus:outline-none focus:border-ink transition-editorial"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block micro-label">Conta de Destino</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink transition-editorial"
                >
                  <option value="">Selecione uma conta bancária</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block micro-label">Categoria (Opcional)</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink transition-editorial"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.kind})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-surface-2 border border-hairline rounded-[8px] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-semibold text-ink text-xs block">
                    Perguntar valor real no dia do vencimento?
                  </span>
                  <span className="text-[10px] text-ink-3 leading-tight block">
                    Se marcado, quando chegar o dia {dayOfMonth}, o app perguntará se você recebeu horas extras ou um valor a mais/a menos.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isVariable}
                  onChange={(e) => setIsVariable(e.target.checked)}
                  className="w-4 h-4 text-brand rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 bg-surface-2 hover:bg-hairline text-ink rounded-[6px] font-medium transition-editorial cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper font-semibold rounded-[6px] transition-editorial cursor-pointer shadow-sm"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Salvar Recorrência</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal 2: Ajustar Valor Variável Recebido */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-3 sm:p-4">
          <div className="w-full max-w-sm bg-surface border border-hairline rounded-[12px] p-5 shadow-md space-y-4">
            
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand" />
                <h3 className="font-display font-medium text-base text-ink">
                  Ajustar Valor Recebido
                </h3>
              </div>
              <button
                onClick={() => setAdjustingItem(null)}
                className="p-1 text-ink-3 hover:text-ink rounded-[4px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed">
              Quanto realmente caiu na conta para <strong>{adjustingItem.template.description}</strong> neste mês de {today.toLocaleString('pt-BR', { month: 'long' })}?
            </p>

            <div className="space-y-1">
              <label className="block micro-label">Valor Real Recebido (€ / R$)</label>
              <input
                type="text"
                autoFocus
                value={adjustedAmountStr}
                onChange={(e) => setAdjustedAmountStr(e.target.value)}
                placeholder="Ex: 2.150,00"
                className="w-full p-2.5 bg-paper border border-hairline rounded-[6px] text-sm font-mono font-semibold text-ink focus:outline-none focus:border-ink transition-editorial"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="px-3 py-1.5 bg-surface-2 text-ink rounded-[6px] text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAdjusted}
                disabled={adjustLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper font-semibold rounded-[6px] text-xs transition-editorial cursor-pointer"
              >
                {adjustLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirmar Recebimento</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
