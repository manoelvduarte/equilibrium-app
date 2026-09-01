import { NormalizedImportRow } from './csv';

export interface OFXTransaction {
  trntype: string;
  dtposted: string;
  trnamt: string;
  fitid?: string;
  checknum?: string;
  refnum?: string;
  memo?: string;
  name?: string;
}

export interface OFXParseResult {
  bankId?: string;
  accountId?: string;
  transactions: NormalizedImportRow[];
  currency?: string;
}

// 1. Extração de tag SGML/XML do OFX
function getTagValue(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

// 2. Normalização de data OFX (YYYYMMDD[HHMMSS...])
export function normalizeOFXDate(dt: string): string {
  if (!dt) return new Date().toISOString().split('T')[0];
  const clean = dt.trim();

  // YYYYMMDD
  if (/^\d{8}/.test(clean)) {
    const year = clean.slice(0, 4);
    const month = clean.slice(4, 6);
    const day = clean.slice(6, 8);
    return `${year}-${month}-${day}`;
  }

  // Fallback: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.slice(0, 10);
  }

  return new Date().toISOString().split('T')[0];
}

// 3. Normalização de valor OFX
export function normalizeOFXAmount(amt: string): { amountCents: number; type: 'income' | 'expense' } {
  if (!amt) return { amountCents: 0, type: 'expense' };

  const clean = amt.trim().replace(',', '.');
  const floatVal = parseFloat(clean) || 0;
  const isNegative = floatVal < 0;
  const amountCents = Math.round(Math.abs(floatVal) * 100);

  return {
    amountCents,
    type: isNegative ? 'expense' : 'income',
  };
}

// 4. Parseador de conteúdo OFX completo
export function parseOFX(content: string): OFXParseResult {
  // Normalizar quebras de linha e converter possíveis tags
  const cleanContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const bankId = getTagValue(cleanContent, 'BANKID');
  const accountId = getTagValue(cleanContent, 'ACCTID');
  const currency = getTagValue(cleanContent, 'CURDEF') || 'BRL';

  // Buscar todos os blocos <STMTTRN>
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|$)/gi;
  const matches = cleanContent.matchAll(stmttrnRegex);

  const transactions: NormalizedImportRow[] = [];

  for (const match of matches) {
    const block = match[1];
    if (!block || block.trim().length === 0) continue;

    const trntype = getTagValue(block, 'TRNTYPE');
    const dtposted = getTagValue(block, 'DTPOSTED');
    const trnamt = getTagValue(block, 'TRNAMT');
    const fitid = getTagValue(block, 'FITID');
    const name = getTagValue(block, 'NAME');
    const memo = getTagValue(block, 'MEMO');

    const date = normalizeOFXDate(dtposted);
    const { amountCents, type } = normalizeOFXAmount(trnamt);

    let description = memo || name || `Transação ${trntype || 'OFX'}`;
    let merchant = name && memo && name !== memo ? name : undefined;

    // Se o valor for 0, ignora
    if (amountCents <= 0) continue;

    // Se o TRNTYPE for explicitamente DEBIT ou CREDIT, respeitar
    let finalType = type;
    if (trntype.toUpperCase() === 'DEBIT') finalType = 'expense';
    if (trntype.toUpperCase() === 'CREDIT') finalType = 'income';

    transactions.push({
      date,
      amountCents,
      type: finalType,
      description,
      merchant,
      raw: {
        TRNTYPE: trntype,
        DTPOSTED: dtposted,
        TRNAMT: trnamt,
        FITID: fitid,
        NAME: name,
        MEMO: memo,
      },
    });
  }

  return {
    bankId: bankId || undefined,
    accountId: accountId || undefined,
    currency,
    transactions,
  };
}
