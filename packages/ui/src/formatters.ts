/**
 * Converte um valor inteiro de centavos (`amount_cents`) em string formatada em BRL (R$).
 * Exemplo: 1250 -> "R$ 12,50"
 */
export function formatCentsToBRL(amountCents: number): string {
  const reais = amountCents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
}

/**
 * Converte string digitada pelo usuário ("12,50" ou "12.50") em centavos inteiros (1250).
 */
export function parseBRLToCents(valStr: string): number {
  const sanitized = valStr.replace(/[^\d,. -]/g, '').replace(',', '.');
  const floatVal = parseFloat(sanitized);
  if (isNaN(floatVal) || floatVal <= 0) return 0;
  return Math.round(floatVal * 100);
}
