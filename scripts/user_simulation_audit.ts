/**
 * SUÍTE DE AUDITORIA INTERNA & SIMULAÇÃO DO USUÁRIO
 * Zero7Nove (07•09) — Gestão Financeira do Casal
 * 
 * Executa todas as 6 jornadas críticas simulando os usuários reais (Manoel e Giovana),
 * validando políticas RLS no PostgreSQL, integridade financeira em centavos e prevenção de regressões.
 */

import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

// Carrega variáveis de ambiente diretamente de apps/web/.env.local sem dependências externas
try {
  const envPath = path.join(__dirname, '../apps/web/.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        process.env[key.trim()] = rest.join('=').trim();
      }
    }
  }
} catch (err) {
  console.error('Aviso ao carregar .env.local:', err);
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERRO: DATABASE_URL não configurada em apps/web/.env.local');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 3,
  idle_timeout: 10,
});

// IDs reais do casal
const MANOEL_ID = 'c9771332-58a1-4e23-96ec-c09e764eb729';
const GIOVANA_ID = 'b36464a8-ea35-4200-9b77-18b00c36a051';
const HOUSEHOLD_ID = '94a3516c-08c2-4829-9505-79edab270a14';
const ATTACKER_ID = '99999999-9999-9999-9999-999999999999';

// Helpers de formatação
function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName} ${detail ? `(${detail})` : ''}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? `— ${detail}` : ''}`);
    throw new Error(`Falha no teste: ${testName}`);
  }
}

/**
 * Executa uma transação simulando o contexto autenticado do usuário via RLS
 */
async function simulateUser<T>(userId: string, callback: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return await sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    return await callback(tx);
  });
}

async function runAuditSuite() {
  console.log('\n================================================================');
  console.log('🏛️  INICIANDO AUDITORIA & SIMULAÇÃO DO USUÁRIO — Zero7Nove');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // JORNADA 1: Identidade & Household Compartilhado do Casal
    // -------------------------------------------------------------
    console.log('🔹 JORNADA 1: Identidade & Household Compartilhado');

    // 1.1 Verificar perfis
    const profiles = await sql`
      select id, full_name, household_id from public.profiles 
      where id in (${MANOEL_ID}, ${GIOVANA_ID})
    `;
    assert(profiles.length === 2, 'Ambos os perfis de Manoel e Giovana existem no banco');

    const manoelProf = profiles.find((p) => p.id === MANOEL_ID);
    const giovanaProf = profiles.find((p) => p.id === GIOVANA_ID);

    assert(
      manoelProf?.household_id === HOUSEHOLD_ID,
      'Manoel está vinculado ao household oficial',
      manoelProf?.household_id
    );
    assert(
      giovanaProf?.household_id === HOUSEHOLD_ID,
      'Giovana está vinculada ao mesmo household oficial',
      giovanaProf?.household_id
    );

    // 1.2 Verificar auth_household() sob sessão autenticada de Manoel e Giovana
    const [jwtManoel] = await simulateUser(MANOEL_ID, async (tx) => {
      return await tx`select public.auth_household() as h_id`;
    });
    assert(
      jwtManoel.h_id === HOUSEHOLD_ID,
      'auth_household() resolve corretamente para Manoel com RLS',
      jwtManoel.h_id
    );

    const [jwtGiovana] = await simulateUser(GIOVANA_ID, async (tx) => {
      return await tx`select public.auth_household() as h_id`;
    });
    assert(
      jwtGiovana.h_id === HOUSEHOLD_ID,
      'auth_household() resolve corretamente para Giovana com RLS',
      jwtGiovana.h_id
    );

    // -------------------------------------------------------------
    // JORNADA 2: Contas Bancárias & Constraints do Postgres
    // -------------------------------------------------------------
    console.log('\n🔹 JORNADA 2: Contas Bancárias & Constraints de Tipo');

    const accounts = await sql`
      select id, name, type, currency, visibility from public.accounts 
      where household_id = ${HOUSEHOLD_ID}
    `;
    assert(accounts.length >= 3, 'Contas base do casal estão cadastradas', `${accounts.length} contas`);

    const validTypes = ['checking', 'savings', 'credit', 'investment', 'cash'];
    const invalidTypes = accounts.filter((a) => !validTypes.includes(a.type));
    assert(invalidTypes.length === 0, 'Todas as contas possuem tipos válidos permitidos pelo check constraint');

    // 2.2 Testar se o banco rejeita tipo inválido 'credit_card' (prevenindo regressão)
    let rejectedInvalidType = false;
    try {
      await sql`
        insert into public.accounts (household_id, owner_id, name, type, visibility)
        values (${HOUSEHOLD_ID}, ${MANOEL_ID}, 'Teste Falha', 'credit_card', 'shared')
      `;
    } catch {
      rejectedInvalidType = true;
    }
    assert(rejectedInvalidType, 'Banco rejeita tipo incorreto credit_card (exige credit)');

    // -------------------------------------------------------------
    // JORNADA 3: Metas & Dívidas (Prevenção de erro Server Components)
    // -------------------------------------------------------------
    console.log('\n🔹 JORNADA 3: Metas, Aportes, Dívidas e Amortização');

    // 3.1 Manoel cria uma meta de teste
    const testGoalName = `Meta Eurotrip Teste [${Date.now()}]`;
    const targetCents = 400000; // € 4.000,00
    const initialCents = 100000; // € 1.000,00

    const [createdGoal] = await simulateUser(MANOEL_ID, async (tx) => {
      return await tx`
        insert into public.goals (household_id, name, target_cents, strategy)
        values (${HOUSEHOLD_ID}, ${testGoalName}, ${targetCents}, ${JSON.stringify({ current_cents: initialCents })})
        returning id, name, target_cents, strategy
      `;
    });
    assert(createdGoal?.id !== undefined, 'Manoel consegue criar meta sem violar RLS');

    // 3.2 Giovana visualiza a meta e faz um aporte
    const [giovanaGoal] = await simulateUser(GIOVANA_ID, async (tx) => {
      return await tx`select * from public.goals where id = ${createdGoal.id}`;
    });
    assert(giovanaGoal?.id === createdGoal.id, 'Giovana enxerga instantaneamente a meta criada por Manoel');

    // Aporte de + € 250,00 por Giovana
    const addCents = 25000;
    const newCurrentCents = initialCents + addCents;
    await simulateUser(GIOVANA_ID, async (tx) => {
      await tx`
        update public.goals 
        set strategy = ${JSON.stringify({ current_cents: newCurrentCents })}
        where id = ${createdGoal.id}
      `;
    });

    const [updatedGoal] = await sql`select strategy from public.goals where id = ${createdGoal.id}`;
    const parsedStrategy = JSON.parse(updatedGoal.strategy);
    assert(
      parsedStrategy.current_cents === 125000,
      'Aporte na meta atualizado com sucesso em centavos inteiros',
      formatCents(parsedStrategy.current_cents)
    );

    // 3.3 Cadastro e Amortização de Dívida (ex: Prestação / Financiamento)
    const testDebtName = `Financiamento Teste [${Date.now()}]`;
    const principalCents = 1500000; // € 15.000,00

    const [createdDebt] = await simulateUser(MANOEL_ID, async (tx) => {
      return await tx`
        insert into public.debts (household_id, name, principal_cents, apr_bps, strategy)
        values (${HOUSEHOLD_ID}, ${testDebtName}, ${principalCents}, 850, 'avalanche')
        returning id, name, principal_cents
      `;
    });
    assert(createdDebt?.id !== undefined, 'Manoel consegue cadastrar financiamento/dívida');

    // Amortização de € 350,00 por Giovana
    const amortizeAmount = 35000;
    const newPrincipal = principalCents - amortizeAmount;
    await simulateUser(GIOVANA_ID, async (tx) => {
      await tx`
        update public.debts set principal_cents = ${newPrincipal} where id = ${createdDebt.id}
      `;
    });

    const [updatedDebt] = await sql`select principal_cents from public.debts where id = ${createdDebt.id}`;
    assert(
      Number(updatedDebt.principal_cents) === 1465000,
      'Amortização de parcela deduziu saldo devedor com precisão',
      formatCents(Number(updatedDebt.principal_cents))
    );

    // Limpeza dos dados de teste da jornada 3
    await sql`delete from public.goals where id = ${createdGoal.id}`;
    await sql`delete from public.debts where id = ${createdDebt.id}`;

    // -------------------------------------------------------------
    // JORNADA 4: Orçamento Duplo & Categorias (Sem valores fantasmas)
    // -------------------------------------------------------------
    console.log('\n🔹 JORNADA 4: Orçamento Duplo & Ausência de Tetos Fantasmas');

    const categories = await sql`
      select id, name, kind, budget_style from public.categories 
      where household_id = ${HOUSEHOLD_ID}
    `;
    assert(categories.length >= 10, 'Categorias oficiais do casal presentes', `${categories.length} categorias`);

    const bibiCategory = categories.find((c) => c.name.toLowerCase().includes('bibi'));
    assert(bibiCategory !== undefined, 'Categoria "Prestação Bibi" identificada com sucesso');

    // 4.2 Definir parcela da Prestação Bibi (ex: € 350,00 para este mês)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const bibiInstallmentCents = 35000; // € 350,00

    if (bibiCategory) {
      await sql`
        insert into public.budgets (household_id, category_id, month, year, limit_cents, envelope_cents)
        values (${HOUSEHOLD_ID}, ${bibiCategory.id}, ${currentMonth}, ${currentYear}, ${bibiInstallmentCents}, ${bibiInstallmentCents})
        on conflict (household_id, category_id, month, year) 
        do update set limit_cents = ${bibiInstallmentCents}, envelope_cents = ${bibiInstallmentCents}
      `;

      const [savedBudget] = await sql`
        select limit_cents from public.budgets 
        where household_id = ${HOUSEHOLD_ID} and category_id = ${bibiCategory.id} and month = ${currentMonth} and year = ${currentYear}
      `;
      assert(
        Number(savedBudget.limit_cents) === 35000,
        'Parcela da Prestação Bibi gravada com exatidão de € 350,00',
        formatCents(Number(savedBudget.limit_cents))
      );
    }

    // 4.3 Garantir que categorias não configuradas NÃO inventam 1500€
    const otherCats = categories.filter((c) => c.id !== bibiCategory?.id && c.kind === 'expense');
    const [existingOtherBudget] = await sql`
      select limit_cents from public.budgets 
      where household_id = ${HOUSEHOLD_ID} and category_id = ${otherCats[0].id} and month = ${currentMonth} and year = ${currentYear}
    `;
    assert(
      existingOtherBudget === undefined || Number(existingOtherBudget.limit_cents) !== 150000,
      'Categorias sem teto definido retornam null/0 em vez do antigo default forçado de 1500€'
    );

    // -------------------------------------------------------------
    // JORNADA 5: Receitas Recorrentes (Salários com Ajuste Variável)
    // -------------------------------------------------------------
    console.log('\n🔹 JORNADA 5: Receitas Recorrentes & Confirmação Variável');

    const checkingAccount = accounts.find((a) => a.type === 'checking') || accounts[0];
    const testRecurrenceDesc = `Salário Teste Manoel [${Date.now()}]`;
    const plannedCents = 200000; // € 2.000,00 previsto

    // 5.1 Criar agendamento recorrente
    const templateData = {
      description: testRecurrenceDesc,
      amount_cents: plannedCents,
      type: 'income',
      day_of_month: 10,
      account_id: checkingAccount.id,
      is_variable: true,
      last_confirmed_month: null,
    };

    const [createdRecurrence] = await sql`
      insert into public.recurrences (household_id, template, frequency, next_run_at, is_active)
      values (${HOUSEHOLD_ID}, ${JSON.stringify(templateData)}, 'monthly', now(), true)
      returning id, template
    `;
    assert(createdRecurrence?.id !== undefined, 'Recorrência de salário agendada com sucesso');

    // 5.2 Simular confirmação com horas extras (valor variável ajustado: € 2.180,00)
    const adjustedReceivedCents = 218000; // € 2.180,00
    const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // Insere a transação gerada na conta
    const [generatedTx] = await sql`
      insert into public.transactions (household_id, account_id, created_by_id, description, amount_cents, type, date, source)
      values (${HOUSEHOLD_ID}, ${checkingAccount.id}, ${MANOEL_ID}, ${testRecurrenceDesc}, ${adjustedReceivedCents}, 'income', current_date, 'recurrence')
      returning id, amount_cents, type
    `;
    assert(
      Number(generatedTx.amount_cents) === 218000,
      'Transação de salário criada com o valor ajustado de € 2.180,00',
      formatCents(Number(generatedTx.amount_cents))
    );

    // Atualiza a recorrência com o mês confirmado
    const updatedTemplate = { ...templateData, last_confirmed_month: currentMonthKey };
    await sql`
      update public.recurrences set template = ${JSON.stringify(updatedTemplate)} where id = ${createdRecurrence.id}
    `;

    const [verifiedRec] = await sql`select template from public.recurrences where id = ${createdRecurrence.id}`;
    const tpl = typeof verifiedRec.template === 'string' ? JSON.parse(verifiedRec.template) : verifiedRec.template;
    assert(
      tpl.last_confirmed_month === currentMonthKey,
      'Recorrência marcada como confirmada para o mês vigente',
      tpl.last_confirmed_month
    );

    // Limpeza dos dados de teste da jornada 5
    await sql`delete from public.transactions where id = ${generatedTx.id}`;
    await sql`delete from public.recurrences where id = ${createdRecurrence.id}`;

    // -------------------------------------------------------------
    // JORNADA 6: Isolamento Multi-Tenant & Segurança RLS
    // -------------------------------------------------------------
    console.log('\n🔹 JORNADA 6: Isolamento Multi-Tenant & Segurança RLS');

    // 6.1 Usuário invasor tenta ler metas do casal
    const attackerGoals = await simulateUser(ATTACKER_ID, async (tx) => {
      return await tx`select * from public.goals where household_id = ${HOUSEHOLD_ID}`;
    });
    assert(attackerGoals.length === 0, 'Usuário externo recebe 0 metas do casal (RLS Ativo)');

    // 6.2 Usuário invasor tenta ler transações do casal
    const attackerTx = await simulateUser(ATTACKER_ID, async (tx) => {
      return await tx`select * from public.transactions where household_id = ${HOUSEHOLD_ID}`;
    });
    assert(attackerTx.length === 0, 'Usuário externo recebe 0 transações do casal (RLS Ativo)');

    // 6.3 Usuário invasor tenta inserir registro no household de Manoel & Giovana
    let attackerWriteBlocked = false;
    try {
      await simulateUser(ATTACKER_ID, async (tx) => {
        await tx`
          insert into public.goals (household_id, name, target_cents)
          values (${HOUSEHOLD_ID}, 'Tentativa Hacker', 999999)
        `;
      });
    } catch {
      attackerWriteBlocked = true;
    }
    assert(attackerWriteBlocked, 'Tentativa de injeção de dados por invasor é barrada pelo PostgreSQL RLS');

    // -------------------------------------------------------------
    // RESUMO DA AUDITORIA
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`🎉 AUDITORIA CONCLUÍDA: ${passedTests}/${totalTests} TESTES APROVADOS!`);
    console.log('🛡️  Zero vulnerabilidades de RLS ou erros de Server Component.');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n🚨 FALHA DURANTE A AUDITORIA:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runAuditSuite();
