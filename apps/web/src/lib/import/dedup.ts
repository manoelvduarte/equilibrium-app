import { NormalizedImportRow } from './csv';

export interface MatchedImportRow extends NormalizedImportRow {
  index: number;
  isDuplicate: boolean;
  matchedTransactionId?: string;
  matchedDescription?: string;
  selected: boolean; // Se true, será enviada para inserção
  categoryId?: string | null;
  ruleMatched?: boolean;
}

export interface ExistingTransactionComparison {
  id: string;
  date: string;
  amount_cents: number;
  description: string;
  type: string;
}

// Normaliza texto para comparação (lowercase, sem acento, trim, primeiras 24 letras)
export function normalizeDescriptionForComparison(desc: string): string {
  if (!desc) return '';
  return desc
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
    .slice(0, 24);
}

// Verifica se a linha é duplicada em relação à base existente
export function matchDuplicate(
  row: NormalizedImportRow,
  existingTransactions: ExistingTransactionComparison[]
): { isDuplicate: boolean; matchedTransactionId?: string; matchedDescription?: string } {
  const rowNormDesc = normalizeDescriptionForComparison(row.description);

  for (const tx of existingTransactions) {
    // 1. Checagem de valor
    if (tx.amount_cents !== row.amountCents) continue;

    // 2. Checagem de data (mesma data YYYY-MM-DD)
    const txDate = tx.date.split('T')[0];
    if (txDate !== row.date) continue;

    // 3. Checagem de descrição normalizada
    const txNormDesc = normalizeDescriptionForComparison(tx.description);
    if (
      rowNormDesc === txNormDesc ||
      (rowNormDesc.length > 5 && txNormDesc.includes(rowNormDesc)) ||
      (txNormDesc.length > 5 && rowNormDesc.includes(txNormDesc))
    ) {
      return {
        isDuplicate: true,
        matchedTransactionId: tx.id,
        matchedDescription: tx.description,
      };
    }
  }

  return { isDuplicate: false };
}

// Deduplica lista de linhas importadas
export function deduplicateImportRows(
  rows: NormalizedImportRow[],
  existingTransactions: ExistingTransactionComparison[]
): MatchedImportRow[] {
  return rows.map((row, index) => {
    const match = matchDuplicate(row, existingTransactions);
    return {
      ...row,
      index,
      isDuplicate: match.isDuplicate,
      matchedTransactionId: match.matchedTransactionId,
      matchedDescription: match.matchedDescription,
      selected: !match.isDuplicate, // Por padrão, desmarca duplicadas
      categoryId: null,
    };
  });
}
