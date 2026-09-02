/**
 * Converte um valor inteiro de centavos (`amount_cents`) em string formatada em EUR (€) por padrão ou BRL (R$).
 * Usa sinal de menos verdadeiro (`−`) para valores negativos.
 */
export function formatCentsToCurrency(
  amountCents: number,
  currency: 'EUR' | 'BRL' = 'EUR',
  options?: { showSign?: boolean }
): string {
  const isNegative = amountCents < 0;
  const absValue = Math.abs(amountCents) / 100;

  const locale = currency === 'EUR' ? 'pt-PT' : 'pt-BR';

  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);

  if (isNegative) {
    return `−${formatted}`;
  }

  if (options?.showSign && amountCents > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

/**
 * Função de formatação principal (padrão em EUR com suporte dinâmico a BRL).
 */
export function formatCentsToBRL(
  amountCents: number,
  options?: { showSign?: boolean; currency?: 'EUR' | 'BRL' }
): string {
  const curr = options?.currency || 'EUR';
  return formatCentsToCurrency(amountCents, curr, options);
}

/**
 * Converte string digitada pelo usuário ("12,50" ou "12.50") em centavos inteiros (1250).
 */
export function parseBRLToCents(valStr: string): number {
  if (!valStr) return 0;
  const sanitized = valStr.replace(/[^\d,. -]/g, '').replace(',', '.');
  const floatVal = parseFloat(sanitized);
  if (isNaN(floatVal) || floatVal <= 0) return 0;
  return Math.round(floatVal * 100);
}

/**
 * Formata data em formato relativo ("Hoje", "Ontem", "12 de set", "12/09/2026")
 */
export function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return '';
  const dateParts = dateStr.split('T')[0].split('-');
  if (dateParts.length !== 3) return dateStr;

  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  const txDate = new Date(year, month, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (txDate.getTime() === today.getTime()) {
    return 'Hoje';
  }
  if (txDate.getTime() === yesterday.getTime()) {
    return 'Ontem';
  }

  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  if (txDate.getFullYear() === today.getFullYear()) {
    return `${day} de ${months[month]}`;
  }

  return `${day} ${months[month]} ${year}`;
}
