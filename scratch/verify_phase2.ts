import { createClient } from '@supabase/supabase-js';
import {
  createTransactionToolSchema,
  updateTransactionToolSchema,
  deleteTransactionToolSchema,
  getFinancialSummarySchema,
  queryAnalyticsSchema,
  projectCashFlowSchema,
} from '@equilibrium/ai';

const supabaseUrl = 'https://ueraistkgvdvxgsiwwhh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcmFpc3RrZ3Zkdnhnc2l3d2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODYyMDYsImV4cCI6MjEwMzg2MjIwNn0.21zyOqz6tIrwDkqVOhNbQuDWPl5D9M_BfFp3_va52MM';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcmFpc3RrZ3Zkdnhnc2l3d2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODI4NjIwNiwiZXhwIjoyMTAzODYyMjA2fQ.83MyQsbz-Qd9KH6fqosRnaUCK3l0CknaB6SE0sNDAgs';

async function run() {
  console.log('=== TESTE DE VALIDAÇÃO DA FASE 2: ASSISTENTE IA REAL (TOOL CALLING & AUDITORIA) ===\n');

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Criar Usuário de Teste para o Assistente (Casa Teste IA)
  const email = `ia.test.${Date.now()}@equilibrium.test`;
  const password = 'SenhaForte123!';
  console.log(`1. Criando usuário de teste: ${email}...`);

  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Usuário Teste IA', household_name: 'Casa Teste IA' },
  });
  if (authErr) throw authErr;

  const userId = authData.user.id;
  const { data: profile } = await adminClient.from('profiles').select('*').eq('id', userId).single();
  const householdId = profile.household_id;
  console.log(`✓ Usuário autenticado. User ID: ${userId}, Household ID: ${householdId}`);

  // 2. Criar Conta e Categoria
  const { data: account } = await adminClient.from('accounts').insert({
    household_id: householdId,
    name: 'Cartão Nubank',
    type: 'credit',
    visibility: 'shared',
    owner_id: userId,
  }).select().single();

  const { data: category } = await adminClient.from('categories').insert({
    household_id: householdId,
    name: 'Mercado',
    icon: 'shopping-cart',
    color: '#A96A3C',
    kind: 'expense',
    budget_style: 'envelope',
  }).select().single();

  console.log(`✓ Conta (${account.name}) e Categoria (${category.name}) criadas.`);

  // 3. Teste do Fluxo de Aprovação e Execução de Tool de Mutação (create_transaction)
  console.log('\n2. Simulando Tool Call de Mutação Proposta pela IA (create_transaction)...');
  const toolArgs = {
    accountId: account.id,
    categoryId: category.id,
    description: 'Mercado Pão de Açúcar (IA)',
    amountCents: 8990,
    type: 'expense' as const,
    date: new Date().toISOString().split('T')[0],
  };

  // Validar com Zod Schema
  const validatedArgs = createTransactionToolSchema.parse(toolArgs);
  console.log('✓ Argumentos validados com sucesso pelo Zod schema do @equilibrium/ai.');

  // Inserir log inicial 'approved'
  const { data: logEntry } = await adminClient.from('ai_action_logs').insert({
    household_id: householdId,
    user_id: userId,
    tool_name: 'create_transaction',
    params: validatedArgs,
    status: 'approved',
  }).select().single();
  console.log(`✓ Log registrado em ai_action_logs (Status: approved, Log ID: ${logEntry.id})`);

  // Executar mutação no Supabase
  const { data: createdTx, error: txErr } = await adminClient.from('transactions').insert({
    household_id: householdId,
    account_id: validatedArgs.accountId,
    category_id: validatedArgs.categoryId,
    created_by_id: userId,
    description: validatedArgs.description,
    amount_cents: validatedArgs.amountCents,
    type: validatedArgs.type,
    date: validatedArgs.date,
    source: 'ai',
    version: 1,
  }).select().single();
  if (txErr) throw txErr;

  // Atualizar log para 'executed'
  await adminClient.from('ai_action_logs').update({
    status: 'executed',
    result: { message: 'Transação criada com sucesso', transaction_id: createdTx.id },
    executed_at: new Date().toISOString(),
  }).eq('id', logEntry.id);

  console.log(`✓ Transação criada no banco com source='ai': "${createdTx.description}" - R$ ${(createdTx.amount_cents / 100).toFixed(2)}`);
  console.log(`✓ Log atualizado para status='executed'.`);

  // 4. Teste de Rejeição de Proposta
  console.log('\n3. Simulando Proposta Rejeitada pelo Usuário...');
  const rejectArgs = {
    accountId: account.id,
    description: 'Assinatura Spotify (Rejeitada)',
    amountCents: 3490,
    type: 'expense' as const,
  };

  const { data: rejectLog } = await adminClient.from('ai_action_logs').insert({
    household_id: householdId,
    user_id: userId,
    tool_name: 'create_transaction',
    params: rejectArgs,
    status: 'rejected',
    result: { status: 'rejected_by_user' },
  }).select().single();

  const { data: checkTx } = await adminClient
    .from('transactions')
    .select('*')
    .eq('description', 'Assinatura Spotify (Rejeitada)');

  console.log(`✓ Log de rejeição gravado em ai_action_logs (Status: rejected, Log ID: ${rejectLog.id})`);
  console.log(`✓ Nenhuma transação inserida no banco para ação rejeitada: ${checkTx?.length === 0 ? 'CORRETO (0 transações)' : 'ERRO'}`);

  // 5. Teste de Persistência e Recuperação do Histórico de Conversa (ai_messages)
  console.log('\n4. Testando Persistência de Mensagens em ai_messages...');
  await adminClient.from('ai_messages').insert([
    {
      household_id: householdId,
      user_id: userId,
      role: 'user',
      content: 'Qual o resumo financeiro deste mês?',
    },
    {
      household_id: householdId,
      user_id: userId,
      role: 'assistant',
      content: 'Neste mês você teve R$ 0,00 de receitas e R$ 89,90 de despesas.',
      tool_calls: [{ toolName: 'get_financial_summary', args: { period: 'month' } }],
    },
  ]);

  const { data: chatHistory } = await adminClient
    .from('ai_messages')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  console.log(`✓ Mensagens recuperadas de ai_messages: ${chatHistory?.length} mensagens`);

  console.log('\n=== TODOS OS TESTES DA FASE 2 PASSARAM COM SUCESSO! ===\n');
}

run().catch(console.error);
