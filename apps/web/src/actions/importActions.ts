'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const importRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  amount_cents: z.number().int().positive('O valor deve ser positivo e maior que zero'),
  type: z.enum(['income', 'expense', 'transfer']),
  description: z.string().min(1, 'A descrição é obrigatória'),
  merchant: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  source: z.enum(['csv', 'ofx', 'manual', 'ai', 'ocr']).default('csv'),
});

const importPayloadSchema = z.object({
  accountId: z.string().uuid('Conta inválida'),
  rows: z.array(importRowSchema).min(1, 'Pelo menos uma transação deve ser informada'),
});

export type ImportTransactionInput = z.infer<typeof importRowSchema>;

export interface ImportTransactionsResult {
  inserted: number;
  failed: Array<{ index: number; description: string; error: string }>;
  insertedIds: string[];
}

export async function importTransactions(params: {
  accountId: string;
  rows: ImportTransactionInput[];
}): Promise<ImportTransactionsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) {
    throw new Error('Household não encontrado');
  }

  // 1. Validar payload completo com Zod
  const validated = importPayloadSchema.parse(params);

  const CHUNK_SIZE = 500;
  const totalRows = validated.rows;
  let insertedCount = 0;
  const failed: Array<{ index: number; description: string; error: string }> = [];
  const insertedIds: string[] = [];

  for (let i = 0; i < totalRows.length; i += CHUNK_SIZE) {
    const chunk = totalRows.slice(i, i + CHUNK_SIZE);

    const recordsToInsert = chunk.map((r) => ({
      household_id: profile.household_id,
      account_id: validated.accountId,
      category_id: r.category_id || null,
      created_by_id: profile.id,
      description: r.description,
      merchant: r.merchant || null,
      amount_cents: r.amount_cents,
      type: r.type,
      date: r.date,
      source: r.source,
      version: 1,
    }));

    const { data: insertedRecords, error: chunkErr } = await supabase
      .from('transactions')
      .insert(recordsToInsert)
      .select('id');

    if (chunkErr) {
      // Se o lote falhar, tenta inserir individualmente para identificar as linhas com falha
      for (let j = 0; j < chunk.length; j++) {
        const singleRow = chunk[j];
        const globalIdx = i + j;

        const { data: singleInsert, error: singleErr } = await supabase
          .from('transactions')
          .insert({
            household_id: profile.household_id,
            account_id: validated.accountId,
            category_id: singleRow.category_id || null,
            created_by_id: profile.id,
            description: singleRow.description,
            merchant: singleRow.merchant || null,
            amount_cents: singleRow.amount_cents,
            type: singleRow.type,
            date: singleRow.date,
            source: singleRow.source,
            version: 1,
          })
          .select('id')
          .single();

        if (singleErr) {
          failed.push({
            index: globalIdx,
            description: singleRow.description,
            error: singleErr.message || 'Falha ao inserir no banco',
          });
        } else if (singleInsert) {
          insertedCount++;
          insertedIds.push(singleInsert.id);
        }
      }
    } else if (insertedRecords) {
      insertedCount += insertedRecords.length;
      insertedRecords.forEach((r) => insertedIds.push(r.id));
    }
  }

  return {
    inserted: insertedCount,
    failed,
    insertedIds,
  };
}
