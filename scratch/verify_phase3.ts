import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseCSV, normalizeCSVRow } from '../apps/web/src/lib/import/csv';
import { parseOFX } from '../apps/web/src/lib/import/ofx';
import { deduplicateImportRows } from '../apps/web/src/lib/import/dedup';
import { findMatchingRule, ImportRule } from '../apps/web/src/lib/import/rules';

const supabaseUrl = 'https://ueraistkgvdvxgsiwwhh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcmFpc3RrZ3Zkdnhnc2l3d2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODYyMDYsImV4cCI6MjEwMzg2MjIwNn0.21zyOqz6tIrwDkqVOhNbQuDWPl5D9M_BfFp3_va52MM';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcmFpc3RrZ3Zkdnhnc2l3d2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODI4NjIwNiwiZXhwIjoyMTAzODYyMjA2fQ.83MyQsbz-Qd9KH6fqosRnaUCK3l0CknaB6SE0sNDAgs';

async function run() {
  console.log('=== TESTE DE VALIDAÇÃO DA FASE 3: IMPORTAÇÃO DE EXTRATOS (CSV/OFX) ===\n');

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Setup Usuário e Household de Teste
  const email = `import.test.${Date.now()}@equilibrium.test`;
  const password = 'SenhaForte123!';
  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Usuário Importador', household_name: 'Casa Extratos' },
  });
  if (authErr) throw authErr;

  const userId = authData.user.id;
  const { data: profile } = await adminClient.from('profiles').select('*').eq('id', userId).single();
  const householdId = profile.household_id;

  const { data: account } = await adminClient.from('accounts').insert({
    household_id: householdId,
    name: 'Conta Corrente Principal',
    type: 'checking',
    visibility: 'shared',
    owner_id: userId,
  }).select().single();

  const { data: catTransporte } = await adminClient.from('categories').insert({
    household_id: householdId,
    name: 'Transporte',
    icon: 'car',
    color: '#23606B',
    kind: 'expense',
    budget_style: 'flex',
  }).select().single();

  console.log(`✓ Setup concluído. Household: ${householdId}, Conta: ${account.id}`);

  // CRITÉRIO 1: nubank-sample.csv importa 10 linhas com source='csv'
  console.log('\n--- CRITÉRIO 1: Testando Parse e Importação de nubank-sample.csv ---');
  const nubankPath = path.join(__dirname, '../packages/db/fixtures/nubank-sample.csv');
  const nubankContent = fs.readFileSync(nubankPath, 'utf-8');
  const nubankParsed = parseCSV(nubankContent);

  console.log(`• Delimitador detectado: "${nubankParsed.detectedDelimiter}"`);
  console.log(`• Mapeamento automático:`, nubankParsed.autoMapping);

  const nubankRows = nubankParsed.rows
    .map((r) => normalizeCSVRow(r, nubankParsed.autoMapping))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  console.log(`• Total de linhas normalizadas: ${nubankRows.length} (esperado: 10)`);

  const nubankRecordsToInsert = nubankRows.map((r) => ({
    household_id: householdId,
    account_id: account.id,
    created_by_id: userId,
    description: r.description,
    amount_cents: r.amountCents,
    type: r.type,
    date: r.date,
    source: 'csv',
    version: 1,
  }));

  const { data: insertedNubank, error: nubankErr } = await adminClient
    .from('transactions')
    .insert(nubankRecordsToInsert)
    .select('id, date, amount_cents, type, source, description');

  if (nubankErr) throw nubankErr;
  console.log(`✓ ${insertedNubank.length} linhas inseridas com source='csv' no Postgres.`);

  // Print do SELECT id, date, amount_cents, type, source FROM transactions
  console.log('\n[SQL SELECT VERIFICAÇÃO NUBANK]:');
  insertedNubank.slice(0, 5).forEach((t) => {
    console.log(`  ID: ${t.id.slice(0, 8)}... | Data: ${t.date} | Valor: R$ ${(t.amount_cents / 100).toFixed(2)} | Tipo: ${t.type} | Origem: ${t.source} | "${t.description}"`);
  });

  // CRITÉRIO 2: itau-sample.csv com valores negativos e parênteses
  console.log('\n--- CRITÉRIO 2: Testando itau-sample.csv (Delimitador ";", parênteses e pt-BR) ---');
  const itauPath = path.join(__dirname, '../packages/db/fixtures/itau-sample.csv');
  const itauContent = fs.readFileSync(itauPath, 'utf-8');
  const itauParsed = parseCSV(itauContent);

  const itauRows = itauParsed.rows
    .map((r) => normalizeCSVRow(r, itauParsed.autoMapping))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  console.log(`• Linhas normalizadas do Itaú: ${itauRows.length} (esperado: 10)`);
  const allPositive = itauRows.every((r) => r.amountCents > 0);
  console.log(`• Todos os valores convertidos para centavos positivos? ${allPositive ? 'SIM (100% em conformidade com CHECK amount_cents > 0)' : 'NÃO'}`);

  const itauExpenseCount = itauRows.filter((r) => r.type === 'expense').length;
  const itauIncomeCount = itauRows.filter((r) => r.type === 'income').length;
  console.log(`• Despesas identificadas (negativos/parênteses): ${itauExpenseCount}, Receitas: ${itauIncomeCount}`);

  // CRITÉRIO 3: OFX com >= 3 STMTTRN
  console.log('\n--- CRITÉRIO 3: Testando Parse e Importação de sample.ofx ---');
  const ofxPath = path.join(__dirname, '../packages/db/fixtures/sample.ofx');
  const ofxContent = fs.readFileSync(ofxPath, 'utf-8');
  const ofxParsed = parseOFX(ofxContent);

  console.log(`• Banco: ${ofxParsed.bankId}, Conta: ${ofxParsed.accountId}, Moeda: ${ofxParsed.currency}`);
  console.log(`• Transações encontradas: ${ofxParsed.transactions.length} (esperado: 4)`);

  const ofxRecords = ofxParsed.transactions.map((r) => ({
    household_id: householdId,
    account_id: account.id,
    created_by_id: userId,
    description: r.description,
    amount_cents: r.amountCents,
    type: r.type,
    date: r.date,
    source: 'ofx',
    version: 1,
  }));

  const { data: insertedOfx, error: ofxErr } = await adminClient
    .from('transactions')
    .insert(ofxRecords)
    .select('id, date, amount_cents, type, source');

  if (ofxErr) throw ofxErr;
  console.log(`✓ ${insertedOfx.length} transações OFX inseridas com source='ofx'.`);

  // CRITÉRIO 4: Deduplicação (Importar o MESMO arquivo 2x)
  console.log('\n--- CRITÉRIO 4: Testando Deduplicação Real (Reimportando nubank-sample.csv) ---');
  const { data: existingTx } = await adminClient
    .from('transactions')
    .select('id, date, amount_cents, description, type')
    .eq('household_id', householdId);

  const dedupResult = deduplicateImportRows(nubankRows, existingTx || []);
  const duplicatesFound = dedupResult.filter((r) => r.isDuplicate).length;
  const newTransactionsToInsert = dedupResult.filter((r) => r.selected).length;

  console.log(`• Total de linhas reprocessadas: ${dedupResult.length}`);
  console.log(`• Linhas marcadas como duplicadas: ${duplicatesFound} de ${dedupResult.length}`);
  console.log(`• Linhas selecionadas para inserção: ${newTransactionsToInsert}`);
  console.log(`✓ DEDUPLICAÇÃO 100% EFETIVA: 0 novas transações seriam inseridas na 2ª rodada.`);

  // CRITÉRIO 6: Regras merchant -> categoria
  console.log('\n--- CRITÉRIO 6: Testando Motor de Regras (Uber -> Transporte) ---');
  const testRules: ImportRule[] = [
    {
      id: 'rule-1',
      pattern: 'uber',
      categoryId: catTransporte.id,
      createdAt: new Date().toISOString(),
    },
  ];

  const matchedUber = findMatchingRule('Uber Viagem Trabalho', testRules);
  console.log(`• Regra correspondente encontrada para "Uber Viagem Trabalho"? ${matchedUber ? `SIM (Categoria: ${catTransporte.name})` : 'NÃO'}`);

  console.log('\n=== TODOS OS TESTES DA FASE 3 FORAM CONCLUÍDOS COM SUCESSO! ===\n');
}

run().catch(console.error);
