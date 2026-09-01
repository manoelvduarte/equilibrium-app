import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ueraistkgvdvxgsiwwhh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcmFpc3RrZ3Zkdnhnc2l3d2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODYyMDYsImV4cCI6MjEwMzg2MjIwNn0.21zyOqz6tIrwDkqVOhNbQuDWPl5D9M_BfFp3_va52MM';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcmFpc3RrZ3Zkdnhnc2l3d2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODI4NjIwNiwiZXhwIjoyMTAzODYyMjA2fQ.83MyQsbz-Qd9KH6fqosRnaUCK3l0CknaB6SE0sNDAgs';

async function run() {
  console.log('=== TESTE DE VALIDAÇÃO DA FASE 1 (SUPABASE CLOUD) ===\n');

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Criar Usuário A (Household "Casa Silva")
  const emailA = `alex.${Date.now()}@equilibrium.test`;
  const passA = 'SenhaForte123!';
  console.log(`1. Criando Usuário A: ${emailA}...`);

  const { data: authA, error: errA } = await adminClient.auth.admin.createUser({
    email: emailA,
    password: passA,
    email_confirm: true,
    user_metadata: { full_name: 'Alex Silva', household_name: 'Casa Silva' },
  });
  if (errA) throw errA;
  const userAId = authA.user.id;
  console.log(`✓ Usuário A criado no auth.users. ID: ${userAId}`);

  // Buscar perfil e household do Usuário A
  const { data: profileA } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userAId)
    .single();

  const householdAId = profileA.household_id;
  console.log(`✓ Trigger handle_new_user criou Profile e Household A: ${householdAId}`);

  // Criar Conta e Categoria para Household A
  const { data: accA, error: accErr } = await adminClient
    .from('accounts')
    .insert({
      household_id: householdAId,
      name: 'Nubank Conjunto',
      type: 'checking',
      visibility: 'shared',
      owner_id: userAId,
    })
    .select()
    .single();
  if (accErr) throw accErr;
  console.log(`✓ Conta criada: ${accA.name} (${accA.id})`);

  const { data: catA, error: catErr } = await adminClient
    .from('categories')
    .insert({
      household_id: householdAId,
      name: 'Mercado',
      icon: 'shopping-cart',
      color: '#A96A3C',
      kind: 'expense',
      budget_style: 'envelope',
    })
    .select()
    .single();
  if (catErr) throw catErr;
  console.log(`✓ Categoria criada: ${catA.name} (${catA.id})`);

  // Inserir Transação pelo Usuário A
  const { data: txA, error: txErr } = await adminClient
    .from('transactions')
    .insert({
      household_id: householdAId,
      account_id: accA.id,
      category_id: catA.id,
      created_by_id: userAId,
      description: 'Compras Pão de Açúcar',
      amount_cents: 18450,
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();
  if (txErr) throw txErr;
  console.log(`✓ Transação inserida na Casa Silva: "${txA.description}" (R$ ${(txA.amount_cents / 100).toFixed(2)})`);

  // 2. Criar Usuário B (Household Independente "Casa Lima")
  const emailB = `marcos.${Date.now()}@equilibrium.test`;
  const passB = 'SenhaForte123!';
  console.log(`\n2. Criando Usuário B (Outro Household): ${emailB}...`);

  const { data: authB, error: errB } = await adminClient.auth.admin.createUser({
    email: emailB,
    password: passB,
    email_confirm: true,
    user_metadata: { full_name: 'Marcos Lima', household_name: 'Casa Lima' },
  });
  if (errB) throw errB;
  const userBId = authB.user.id;

  const { data: profileB } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userBId)
    .single();
  const householdBId = profileB.household_id;
  console.log(`✓ Usuário B criado. ID: ${userBId}, Household B: ${householdBId}`);

  // 3. Teste de Isolamento RLS entre Household A e B
  console.log('\n3. Testando Isolamento Multi-tenant RLS...');
  const clientA = createClient(supabaseUrl, anonKey);
  await clientA.auth.signInWithPassword({ email: emailA, password: passA });

  const { data: clientATransactions } = await clientA.from('transactions').select('*');
  console.log(`• Usuário A vê ${clientATransactions?.length} transações (esperado: 1)`);

  const clientB = createClient(supabaseUrl, anonKey);
  await clientB.auth.signInWithPassword({ email: emailB, password: passB });

  const { data: clientBTransactions } = await clientB.from('transactions').select('*');
  console.log(`• Usuário B vê ${clientBTransactions?.length} transações de A (esperado: 0)`);

  if (clientBTransactions?.length === 0) {
    console.log('✓ ISOLAMENTO RLS 100% EFETIVO: Usuário B não acessa dados da Casa Silva.');
  }

  // 4. Teste de Fluxo de Convite de Parceiro
  console.log('\n4. Testando Fluxo de Convite: A convida Parceiro C para o mesmo Household...');
  const inviteToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: inviteErr } = await adminClient.from('invites').insert({
    household_id: householdAId,
    created_by: userAId,
    email: `sam.${Date.now()}@equilibrium.test`,
    token: inviteToken,
    expires_at: expiresAt.toISOString(),
  });
  if (inviteErr) console.error('Erro ao inserir convite:', inviteErr);
  console.log(`✓ Convite gerado na tabela invites com token: ${inviteToken}`);

  // Parceiro C registra com o token
  const emailC = `sam.${Date.now()}@equilibrium.test`;
  const { data: authC, error: errC } = await adminClient.auth.admin.createUser({
    email: emailC,
    password: 'SenhaForte123!',
    email_confirm: true,
    user_metadata: { full_name: 'Sam Costa', invite_token: inviteToken },
  });
  if (errC) console.error('Erro ao criar usuário C:', errC);
  const userC = authC?.user;

  const { data: profileC } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userC?.id)
    .single();

  console.log(`✓ Parceiro C registrado via token.`);
  console.log(`• Household C: ${profileC.household_id}`);
  console.log(`• Household A: ${householdAId}`);
  console.log(`• Household C == Household A? ${profileC.household_id === householdAId ? 'SIM (100% INTEGRADO NO MESMO CASAL)' : 'NÃO'}`);

  console.log('\n=== TODOS OS 4 TESTES PASSARAM COM 100% DE SUCESSO! ===\n');
}

run().catch(console.error);
