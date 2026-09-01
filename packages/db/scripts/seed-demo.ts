export interface ProfileMock {
  id: string;
  fullName: string;
  avatarUrl: string;
  role: 'admin' | 'member';
}

export interface AccountMock {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  visibility: 'private' | 'balance_only' | 'shared';
  ownerId: string | null;
  institution: string;
  balanceCents: number;
}

export interface CategoryMock {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: 'expense' | 'income';
  budgetStyle: 'envelope' | 'flex' | 'fixed';
  limitCents: number;
  spentCents: number;
}

export interface TransactionMock {
  id: string;
  accountId: string;
  transferToAccountId?: string | null;
  categoryId?: string | null;
  type: 'income' | 'expense' | 'transfer';
  amountCents: number;
  date: string;
  description: string;
  merchant?: string | null;
  notes?: string | null;
  tags: string[];
  receiptUrl?: string | null;
  split?: { ratios: Record<string, number> } | null;
  source?: 'manual' | 'csv' | 'ofx' | 'qif' | 'pluggy' | 'ai' | 'ocr';
  version: number;
  createdById: string;
  deletedAt?: string | null;
}

export interface HistoryMock {
  id: string;
  transactionId: string;
  snapshot: TransactionMock;
  version: number;
  createdAt: string;
}

// 1. Perfis Fictícios do Casal
export const MOCK_PROFILES: ProfileMock[] = [
  { id: 'prof-alex-uuid', fullName: 'Alex Silva', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', role: 'admin' },
  { id: 'prof-sam-uuid', fullName: 'Sam Costa', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', role: 'member' },
];

// 2. Contas Financeiras com Visibilidade e Dono
export const MOCK_ACCOUNTS: AccountMock[] = [
  { id: 'acc-joint-checking', name: 'Conta Corrente Conjunta', type: 'checking', visibility: 'shared', ownerId: null, institution: 'Itaú', balanceCents: 1485000 },
  { id: 'acc-joint-savings', name: 'Reserva de Emergência', type: 'savings', visibility: 'shared', ownerId: null, institution: 'Nubank', balanceCents: 4500000 },
  { id: 'acc-alex-credit', name: 'Cartão Black Alex', type: 'credit', visibility: 'shared', ownerId: 'prof-alex-uuid', institution: 'XP Investimentos', balanceCents: -342000 },
  { id: 'acc-sam-private', name: 'Investimentos Pessoais Sam', type: 'investment', visibility: 'private', ownerId: 'prof-sam-uuid', institution: 'BTG Pactual', balanceCents: 1850000 },
];

// 3. Categorias Globais e Orçamentos
export const MOCK_CATEGORIES: CategoryMock[] = [
  { id: 'cat-housing', name: 'Moradia & Aluguel', icon: '🏠', color: '#6366f1', kind: 'expense', budgetStyle: 'fixed', limitCents: 380000, spentCents: 380000 },
  { id: 'cat-groceries', name: 'Supermercado & Feira', icon: '🛒', color: '#10b981', kind: 'expense', budgetStyle: 'envelope', limitCents: 200000, spentCents: 164000 },
  { id: 'cat-dining', name: 'Restaurantes & Delivery', icon: '🍕', color: '#f59e0b', kind: 'expense', budgetStyle: 'envelope', limitCents: 120000, spentCents: 108000 },
  { id: 'cat-leisure', name: 'Lazer & Viagens', icon: '✈️', color: '#ec4899', kind: 'expense', budgetStyle: 'flex', limitCents: 80000, spentCents: 62000 },
  { id: 'cat-tech', name: 'Assinaturas & Tech', icon: '💻', color: '#8b5cf6', kind: 'expense', budgetStyle: 'flex', limitCents: 50000, spentCents: 44900 },
  { id: 'cat-utilities', name: 'Luz, Água & Internet', icon: '⚡', color: '#06b6d4', kind: 'expense', budgetStyle: 'fixed', limitCents: 60000, spentCents: 52000 },
  { id: 'cat-salary-alex', name: 'Salário Alex', icon: '💼', color: '#22c55e', kind: 'income', budgetStyle: 'flex', limitCents: 0, spentCents: 0 },
  { id: 'cat-salary-sam', name: 'Salário Sam', icon: '📈', color: '#10b981', kind: 'income', budgetStyle: 'flex', limitCents: 0, spentCents: 0 },
];

// 4. Gerador de Transações de Exemplo com Histórico e Splits
export function generateMockTransactions(): TransactionMock[] {
  return [
    {
      id: 'tx-1',
      accountId: 'acc-joint-checking',
      categoryId: 'cat-salary-alex',
      type: 'income',
      amountCents: 950000,
      date: '2026-09-01',
      description: 'Salário Mensal Tech Co',
      merchant: 'Tech Co Inc',
      notes: 'Depósito em conta corrente',
      tags: ['salario', 'fixo'],
      source: 'manual',
      version: 1,
      createdById: 'prof-alex-uuid',
    },
    {
      id: 'tx-2',
      accountId: 'acc-joint-checking',
      categoryId: 'cat-salary-sam',
      type: 'income',
      amountCents: 880000,
      date: '2026-09-01',
      description: 'Salário Mensal Design Studio',
      merchant: 'Design Studio',
      notes: 'Depósito mensal',
      tags: ['salario', 'fixo'],
      source: 'manual',
      version: 1,
      createdById: 'prof-sam-uuid',
    },
    {
      id: 'tx-3',
      accountId: 'acc-joint-checking',
      categoryId: 'cat-groceries',
      type: 'expense',
      amountCents: 48990,
      date: '2026-08-28',
      description: 'Compras Semanal Carrefour',
      merchant: 'Carrefour',
      notes: 'Alimentação e produtos de limpeza',
      tags: ['mercado', 'casa'],
      split: { ratios: { 'prof-alex-uuid': 500, 'prof-sam-uuid': 500 } },
      source: 'manual',
      version: 2,
      createdById: 'prof-alex-uuid',
    },
    {
      id: 'tx-4',
      accountId: 'acc-alex-credit',
      categoryId: 'cat-dining',
      type: 'expense',
      amountCents: 24500,
      date: '2026-08-25',
      description: 'Jantar de Aniversário de Namoro',
      merchant: 'Restaurante Fogo de Chão',
      notes: 'Comemoração no fim de semana',
      tags: ['restaurante', 'casal'],
      split: { ratios: { 'prof-alex-uuid': 600, 'prof-sam-uuid': 400 } },
      source: 'manual',
      version: 1,
      createdById: 'prof-alex-uuid',
    },
    {
      id: 'tx-5',
      accountId: 'acc-joint-checking',
      categoryId: 'cat-housing',
      type: 'expense',
      amountCents: 380000,
      date: '2026-08-05',
      description: 'Aluguel do Apartamento',
      merchant: 'QuintoAndar',
      notes: 'Pagamento mensal automático',
      tags: ['moradia', 'fixo'],
      split: { ratios: { 'prof-alex-uuid': 500, 'prof-sam-uuid': 500 } },
      source: 'manual',
      version: 1,
      createdById: 'prof-alex-uuid',
    },
    {
      id: 'tx-6',
      accountId: 'acc-alex-credit',
      categoryId: 'cat-tech',
      type: 'expense',
      amountCents: 5990,
      date: '2026-08-15',
      description: 'Assinatura Netflix Premium 4K',
      merchant: 'Netflix',
      notes: 'Plano familiar',
      tags: ['assinatura'],
      source: 'manual',
      version: 1,
      createdById: 'prof-sam-uuid',
    },
    {
      id: 'tx-7',
      accountId: 'acc-joint-checking',
      transferToAccountId: 'acc-joint-savings',
      type: 'transfer',
      amountCents: 200000,
      date: '2026-08-02',
      description: 'Aporte Reserva de Emergência',
      notes: 'Transferência quinzenal para poupança',
      tags: ['investimento', 'reserva'],
      source: 'manual',
      version: 1,
      createdById: 'prof-alex-uuid',
    },
  ];
}

// 5. Histórico da Transação editada (tx-3 v1)
export const MOCK_HISTORY: HistoryMock[] = [
  {
    id: 'hist-1',
    transactionId: 'tx-3',
    snapshot: {
      id: 'tx-3',
      accountId: 'acc-joint-checking',
      categoryId: 'cat-groceries',
      type: 'expense',
      amountCents: 45000,
      date: '2026-08-28',
      description: 'Compras Carrefour (Versão Original)',
      merchant: 'Carrefour',
      tags: ['mercado'],
      source: 'manual',
      version: 1,
      createdById: 'prof-alex-uuid',
    },
    version: 1,
    createdAt: '2026-08-28T14:30:00Z',
  },
];
