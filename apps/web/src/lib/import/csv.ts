export interface RawParsedRow {
  [key: string]: string;
}

export interface CSVParseResult {
  headers: string[];
  rows: RawParsedRow[];
  detectedDelimiter: string;
  autoMapping: ColumnMapping;
}

export interface ColumnMapping {
  dateColumn?: string;
  amountColumn?: string;
  descriptionColumn?: string;
  typeColumn?: string;
  merchantColumn?: string;
}

export interface NormalizedImportRow {
  date: string; // YYYY-MM-DD
  amountCents: number; // positive int > 0
  type: 'income' | 'expense';
  description: string;
  merchant?: string;
  raw: RawParsedRow;
}

// 1. Detecção automática de delimitador (; , \t)
export function detectDelimiter(text: string): string {
  const sample = text.slice(0, 4096);
  const lines = sample.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return ',';

  const firstLine = lines[0];
  const countSemicolon = (firstLine.match(/;/g) || []).length;
  const countComma = (firstLine.match(/,/g) || []).length;
  const countTab = (firstLine.match(/\t/g) || []).length;

  if (countSemicolon >= countComma && countSemicolon >= countTab && countSemicolon > 0) {
    return ';';
  }
  if (countTab >= countComma && countTab > 0) {
    return '\t';
  }
  return ',';
}

// 2. Parseador CSV resiliente (BOM-tolerante e suporte a aspas)
export function parseCSV(content: string, customDelimiter?: string): CSVParseResult {
  // Remove BOM se presente
  let cleanContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  cleanContent = cleanContent.trim();

  const delimiter = customDelimiter || detectDelimiter(cleanContent);
  const lines: string[][] = [];

  let currentLine: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent[i];
    const nextChar = cleanContent[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentLine.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentLine.push(currentCell.trim());
      if (currentLine.some((c) => c.length > 0)) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentLine.length > 0) {
    currentLine.push(currentCell.trim());
    if (currentLine.some((c) => c.length > 0)) {
      lines.push(currentLine);
    }
  }

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      detectedDelimiter: delimiter,
      autoMapping: {},
    };
  }

  const rawHeaders = lines[0];
  const headers = rawHeaders.map((h, idx) => h || `Coluna_${idx + 1}`);

  const rows: RawParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rowObj: RawParsedRow = {};
    const line = lines[i];
    headers.forEach((h, idx) => {
      rowObj[h] = line[idx] !== undefined ? line[idx] : '';
    });
    rows.push(rowObj);
  }

  const autoMapping = autoMapColumns(headers);

  return {
    headers,
    rows,
    detectedDelimiter: delimiter,
    autoMapping,
  };
}

// 3. Auto-mapeamento por sinônimos pt-BR / en
const DATE_SYNONYMS = ['data', 'date', 'dt', 'dia', 'data transação', 'data lançamento', 'data transacao', 'data lancamento'];
const AMOUNT_SYNONYMS = ['valor', 'value', 'amount', 'quantia', 'total', 'saldo', 'vl'];
const DESC_SYNONYMS = ['descrição', 'descricao', 'description', 'memo', 'histórico', 'historico', 'detalhe', 'título', 'titulo', 'transação', 'transacao', 'item'];
const TYPE_SYNONYMS = ['tipo', 'type', 'debit/credit', 'natureza', 'operação', 'operacao', 'd/c', 'debito/credito'];
const MERCHANT_SYNONYMS = ['estabelecimento', 'merchant', 'fornecedor', 'beneficiário', 'beneficiario', 'local', 'empresa', 'loja'];

export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const clean = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  for (const h of headers) {
    const c = clean(h);

    if (!mapping.dateColumn && DATE_SYNONYMS.some((syn) => clean(syn) === c || c.includes(clean(syn)))) {
      mapping.dateColumn = h;
    } else if (!mapping.amountColumn && AMOUNT_SYNONYMS.some((syn) => clean(syn) === c || c.includes(clean(syn)))) {
      mapping.amountColumn = h;
    } else if (!mapping.descriptionColumn && DESC_SYNONYMS.some((syn) => clean(syn) === c || c.includes(clean(syn)))) {
      mapping.descriptionColumn = h;
    } else if (!mapping.typeColumn && TYPE_SYNONYMS.some((syn) => clean(syn) === c || c.includes(clean(syn)))) {
      mapping.typeColumn = h;
    } else if (!mapping.merchantColumn && MERCHANT_SYNONYMS.some((syn) => clean(syn) === c || c.includes(clean(syn)))) {
      mapping.merchantColumn = h;
    }
  }

  return mapping;
}

// 4. Normalizador de Data
const MONTH_MAP: Record<string, string> = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
  feb: '02', apr: '04', may: '05', aug: '08', sep: '09', oct: '10', dec: '12',
};

export function normalizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const str = dateStr.trim();

  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // dd/MM/yyyy ou dd-MM-yyyy
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmyMatch) {
    let day = dmyMatch[1].padStart(2, '0');
    let month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Formato textual "15 ago 2026" ou "15-ago-2026"
  const textMonthMatch = str.match(/^(\d{1,2})\s*[\/\-\s]\s*([a-zA-Z]{3,})\s*[\/\-\s]\s*(\d{2,4})/);
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, '0');
    const monthKey = textMonthMatch[2].toLowerCase().slice(0, 3);
    const month = MONTH_MAP[monthKey] || '01';
    let year = textMonthMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Fallback: tentar Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

// 5. Normalizador de Valor Monetário (Positivo em Cents + Detecção de Tipo)
export function normalizeValue(
  valueStr: string,
  typeColumnValue?: string
): { amountCents: number; type: 'income' | 'expense' } {
  if (!valueStr) return { amountCents: 0, type: 'expense' };

  let clean = valueStr.trim().replace(/^R\$\s*/i, '').replace(/^\$\s*/, '').trim();

  let isNegative = false;

  // Parênteses (ex: "(120,50)") indicam valor negativo/saída
  if (clean.startsWith('(') && clean.endsWith(')')) {
    isNegative = true;
    clean = clean.slice(1, -1).trim();
  }

  if (clean.startsWith('-')) {
    isNegative = true;
    clean = clean.slice(1).trim();
  } else if (clean.startsWith('+')) {
    clean = clean.slice(1).trim();
  }

  // Detecção de separador decimal (1.234,56 vs 1,234.56)
  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');

  let standardDecimalStr = clean;

  if (hasComma && hasDot) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      // Formato pt-BR: 1.234,56 -> 1234.56
      standardDecimalStr = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato en-US: 1,234.56 -> 1234.56
      standardDecimalStr = clean.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Apenas vírgula: 1234,56 -> 1234.56
    standardDecimalStr = clean.replace(',', '.');
  }

  // Remove caracteres espúrios
  standardDecimalStr = standardDecimalStr.replace(/[^\d.]/g, '');
  const floatVal = parseFloat(standardDecimalStr) || 0;
  const amountCents = Math.round(Math.abs(floatVal) * 100);

  // Determinar se é receita ou despesa
  let type: 'income' | 'expense' = isNegative ? 'expense' : 'income';

  if (typeColumnValue) {
    const t = typeColumnValue.toLowerCase().trim();
    if (['debit', 'débito', 'debito', 'saída', 'saida', 'despesa', 'd', 'out'].includes(t)) {
      type = 'expense';
    } else if (['credit', 'crédito', 'credito', 'entrada', 'receita', 'c', 'in'].includes(t)) {
      type = 'income';
    }
  }

  return {
    amountCents,
    type,
  };
}

// 6. Normalização de linha completa mapeada
export function normalizeCSVRow(
  row: RawParsedRow,
  mapping: ColumnMapping
): NormalizedImportRow | null {
  const dateRaw = mapping.dateColumn ? row[mapping.dateColumn] : '';
  const amountRaw = mapping.amountColumn ? row[mapping.amountColumn] : '';
  const descRaw = mapping.descriptionColumn ? row[mapping.descriptionColumn] : '';
  const typeRaw = mapping.typeColumn ? row[mapping.typeColumn] : undefined;
  const merchantRaw = mapping.merchantColumn ? row[mapping.merchantColumn] : undefined;

  const date = normalizeDate(dateRaw);
  const { amountCents, type } = normalizeValue(amountRaw, typeRaw);
  const description = descRaw || merchantRaw || 'Transação Importada';

  if (amountCents <= 0) {
    return null; // Linha inválida ou saldo zero
  }

  return {
    date,
    amountCents,
    type,
    description,
    merchant: merchantRaw || undefined,
    raw: row,
  };
}
