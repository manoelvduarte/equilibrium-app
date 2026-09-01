import { MatchedImportRow } from './dedup';

export interface ImportRule {
  id: string;
  pattern: string; // Ex: "uber", "pao de acucar", "netflix"
  categoryId: string;
  createdAt: string;
}

const STORAGE_KEY = 'equilibrium-import-rules';

// 1. Carregar regras salvas no localStorage
export function getStoredRules(): ImportRule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler regras de importação:', err);
    return [];
  }
}

// 2. Salvar ou atualizar regra
export function saveRule(pattern: string, categoryId: string): ImportRule | null {
  if (typeof window === 'undefined' || !pattern.trim() || !categoryId) return null;

  const cleanPattern = pattern.trim().toLowerCase();
  const rules = getStoredRules();

  // Se já existe regra para o mesmo pattern, atualiza
  const existingIdx = rules.findIndex((r) => r.pattern.toLowerCase() === cleanPattern);

  const rule: ImportRule = {
    id: existingIdx >= 0 ? rules[existingIdx].id : crypto.randomUUID(),
    pattern: cleanPattern,
    categoryId,
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    rules[existingIdx] = rule;
  } else {
    rules.push(rule);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error('Erro ao salvar regra no localStorage:', err);
  }

  return rule;
}

// 3. Deletar regra
export function deleteRule(id: string): void {
  if (typeof window === 'undefined') return;
  const rules = getStoredRules().filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error('Erro ao remover regra do localStorage:', err);
  }
}

// 4. Normaliza string para correspondência
function normalizePattern(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// 5. Encontra regra para uma dada descrição
export function findMatchingRule(
  description: string,
  rules: ImportRule[]
): ImportRule | null {
  if (!description) return null;
  const normDesc = normalizePattern(description);

  for (const rule of rules) {
    const normPattern = normalizePattern(rule.pattern);
    if (normPattern.length > 0 && normDesc.includes(normPattern)) {
      return rule;
    }
  }

  return null;
}

// 6. Aplica regras em lote nas linhas importadas
export function applyRulesToRows(
  rows: MatchedImportRow[],
  rules: ImportRule[]
): MatchedImportRow[] {
  return rows.map((row) => {
    // Se já tem categoria selecionada e não foi por regra, mantém
    if (row.categoryId && !row.ruleMatched) {
      return row;
    }

    const matched = findMatchingRule(row.description, rules);
    if (matched) {
      return {
        ...row,
        categoryId: matched.categoryId,
        ruleMatched: true,
      };
    }

    return row;
  });
}
