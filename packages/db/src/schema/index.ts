import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  bigint,
  integer,
  boolean,
  date,
  unique,
  index,
  pgView,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1. Households (Tenants)
export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  currency: text('currency').default('BRL').notNull(),
  settings: jsonb('settings').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Profiles (Membros do Household)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // Primary Key maps to auth.users.id
  householdId: uuid('household_id')
    .references(() => households.id, { onDelete: 'cascade' })
    .notNull(),
  fullName: text('full_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['admin', 'member'] }).default('member').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Invites (Convites para o Household)
export const invites = pgTable('invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id')
    .references(() => households.id, { onDelete: 'cascade' })
    .notNull(),
  createdBy: uuid('created_by')
    .references(() => profiles.id)
    .notNull(),
  token: text('token').notNull().unique(),
  email: text('email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Accounts (Contas Financeiras)
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id')
      .references(() => households.id, { onDelete: 'cascade' })
      .notNull(),
    ownerId: uuid('owner_id').references(() => profiles.id, { onDelete: 'set null' }), // null = conjunta
    name: text('name').notNull(),
    type: text('type', {
      enum: ['checking', 'savings', 'credit', 'investment', 'cash'],
    }).notNull(),
    visibility: text('visibility', {
      enum: ['private', 'balance_only', 'shared'],
    })
      .default('shared')
      .notNull(),
    institution: text('institution'),
    currency: text('currency').default('BRL').notNull(),
    externalProvider: text('external_provider'),
    externalItemId: text('external_item_id'),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_accounts_household').on(table.householdId)]
);

// 5. Categories (Categorias de Orçamento)
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }), // null = catálogo global
  parentId: uuid('parent_id'),
  name: text('name').notNull(),
  icon: text('icon').default('💰').notNull(),
  color: text('color').default('#64748b').notNull(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  budgetStyle: text('budget_style', { enum: ['envelope', 'flex', 'fixed'] })
    .default('flex')
    .notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

// 6. Transactions (Transações Imutáveis)
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id')
      .references(() => households.id, { onDelete: 'cascade' })
      .notNull(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    transferToAccountId: uuid('transfer_to_account_id').references(() => accounts.id, {
      onDelete: 'set null',
    }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    type: text('type', { enum: ['income', 'expense', 'transfer'] }).notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(), // CHECK amount_cents > 0
    currency: text('currency').default('BRL').notNull(),
    date: date('date').defaultNow().notNull(),
    description: text('description').notNull(),
    merchant: text('merchant'),
    notes: text('notes'),
    tags: text('tags').array().default([]).notNull(),
    receiptUrl: text('receipt_url'),
    split: jsonb('split'),
    isRecurringParent: boolean('is_recurring_parent').default(false).notNull(),
    recurrenceId: uuid('recurrence_id'),
    source: text('source', {
      enum: ['manual', 'csv', 'ofx', 'qif', 'pluggy', 'ai', 'ocr'],
    })
      .default('manual')
      .notNull(),
    version: integer('version').default(1).notNull(),
    createdById: uuid('created_by_id')
      .references(() => profiles.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_transactions_household_date').on(table.householdId, table.date),
    index('idx_transactions_account').on(table.accountId),
  ]
);

// 7. Transaction History (Auditoria de Histórico)
export const transactionHistory = pgTable('transaction_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id')
    .references(() => transactions.id, { onDelete: 'cascade' })
    .notNull(),
  supersededById: uuid('superseded_by_id').references(() => transactions.id, {
    onDelete: 'set null',
  }),
  snapshot: jsonb('snapshot').notNull(),
  version: integer('version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. Recurrences (Recorrências Programadas)
export const recurrences = pgTable('recurrences', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id')
    .references(() => households.id, { onDelete: 'cascade' })
    .notNull(),
  template: jsonb('template').notNull(),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly', 'yearly'] }).notNull(),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

// 9. Budgets (Orçamentos Mensais)
export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id')
      .references(() => households.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: uuid('category_id')
      .references(() => categories.id, { onDelete: 'cascade' })
      .notNull(),
    month: integer('month').notNull(),
    year: integer('year').notNull(),
    limitCents: bigint('limit_cents', { mode: 'number' }).default(0).notNull(),
    envelopeCents: bigint('envelope_cents', { mode: 'number' }).default(0).notNull(),
    rollover: boolean('rollover').default(false).notNull(),
  },
  (table) => [
    unique('idx_budgets_unique').on(table.householdId, table.categoryId, table.month, table.year),
  ]
);

// 10. Goals (Metas do Casal)
export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id')
    .references(() => households.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  targetCents: bigint('target_cents', { mode: 'number' }).notNull(),
  deadline: date('deadline'),
  strategy: text('strategy'),
});

// 11. Debts (Gestão de Dívidas)
export const debts = pgTable('debts', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id')
    .references(() => households.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  principalCents: bigint('principal_cents', { mode: 'number' }).notNull(),
  aprBps: integer('apr_bps').default(0).notNull(), // juros em pontos base (bps)
  minPaymentCents: bigint('min_payment_cents', { mode: 'number' }).default(0).notNull(),
  strategy: text('strategy', { enum: ['snowball', 'avalanche'] }),
});

// 12. AI Messages (Chat por Household)
export const aiMessages = pgTable(
  'ai_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id')
      .references(() => households.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => profiles.id)
      .notNull(),
    role: text('role', { enum: ['user', 'assistant', 'system', 'tool'] }).notNull(),
    content: text('content'),
    toolCalls: jsonb('tool_calls'),
    toolResults: jsonb('tool_results'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_ai_messages_household_created').on(table.householdId, table.createdAt)]
);

// 13. AI Action Logs (Auditoria de Ações e Aprovações)
export const aiActionLogs = pgTable('ai_action_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id')
    .references(() => households.id, { onDelete: 'cascade' })
    .notNull(),
  messageId: uuid('message_id').references(() => aiMessages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .references(() => profiles.id)
    .notNull(),
  toolName: text('tool_name').notNull(),
  params: jsonb('params').notNull(),
  result: jsonb('result'),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'executed'] })
    .default('pending')
    .notNull(),
  approvedById: uuid('approved_by_id').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  executedAt: timestamp('executed_at', { withTimezone: true }),
});
