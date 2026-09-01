import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { createClient } from '@/lib/supabase/server';
import { createAssistantTools } from '@/lib/ai/tools';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  // 1. Guard de ENV
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'GOOGLE_GENERATIVE_AI_API_KEY não configurada' },
      { status: 500 }
    );
  }

  // 2. Autenticação e Carregamento do Usuário sob JWT
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) {
    return Response.json({ error: 'Household não encontrado' }, { status: 400 });
  }

  const { messages } = await req.json();

  // 3. Coleta de Contexto Real Dinâmico do Household
  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', profile.household_id)
    .single();

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type, visibility');

  const { data: balances } = await supabase
    .from('account_balances')
    .select('account_id, balance_cents');

  const balancesMap = new Map<string, number>();
  balances?.forEach((b: any) => balancesMap.set(b.account_id, Number(b.balance_cents)));

  const enrichedAccounts = (accounts || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    visibility: a.visibility,
    balance_cents: balancesMap.get(a.id) || 0,
    balance_formatted: `R$ ${((balancesMap.get(a.id) || 0) / 100).toFixed(2)}`,
  }));

  const netWorthCents = enrichedAccounts.reduce((acc, a) => acc + a.balance_cents, 0);

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, kind, budget_style')
    .order('sort_order');

  const { data: recentExpenses } = await supabase
    .from('transactions')
    .select('id, description, amount_cents, date, categories:category_id ( name )')
    .is('deleted_at', null)
    .eq('type', 'expense')
    .order('date', { ascending: false })
    .limit(8);

  const formattedRecent = (recentExpenses || []).map((t: any) => ({
    description: t.description,
    amount: `R$ ${(t.amount_cents / 100).toFixed(2)}`,
    category: t.categories?.name || 'Geral',
    date: t.date,
  }));

  // 4. System Prompt Sóbrio (Ledger Editorial — pt-BR, sem emojis)
  const systemPrompt = `Você é o Assistente financeiro do Equilibrium, sistema de gestão compartilhada para casais.
Seu papel é responder com precisão matemática estrita, sobriedade e clareza editorial.

REGRAS ABSOLUTAS:
1. NUNCA invente números, contas, saldos ou transações. Todo dado deve vir exclusivamente das tools ou do contexto injetado.
2. NUNCA use emojis em nenhuma resposta ou comunicação.
3. Para qualquer alteração financeira (criar transação, editar, deletar, recategorizar, ajustar teto), acione a tool de mutação correspondente. A tool gerará uma proposta de aprovação para o usuário.
4. NUNCA afirme que uma transação foi criada ou modificada antes de receber o resultado da tool após aprovação humana.
5. Moeda é sempre expressa no formato brasileiro (ex: R$ 1.250,00). Valores monetários internos são sempre centavos inteiros (amount_cents).
6. Se o usuário pedir para registrar um gasto e não informar a conta, use a conta conjunta disponível ou a primeira conta da lista.

CONTEXTO REAL DO HOUSEHOLD ATUAL:
- Household: ${household?.name || 'Nosso Casa'}
- Usuário Atual: ${profile.full_name} (ID: ${profile.id})
- Patrimônio Líquido Consolidado: R$ ${(netWorthCents / 100).toFixed(2)}
- Contas Disponíveis:
${enrichedAccounts.map((a) => `  • [${a.id}] ${a.name} (${a.type}, ${a.visibility}) -> Saldo: ${a.balance_formatted}`).join('\n')}
- Categorias Disponíveis:
${(categories || []).map((c) => `  • [${c.id}] ${c.name} (${c.kind}, modelo: ${c.budget_style})`).join('\n')}
- Últimos Gastos Recentes:
${formattedRecent.map((r) => `  • ${r.date}: ${r.description} - ${r.amount} (${r.category})`).join('\n')}
`;

  // 5. Tools com Fechamento sob o Client do Usuário
  const tools = createAssistantTools(supabase, profile.household_id, profile.id);

  // 6. Chamada de Stream com Gemini
  const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';

  const result = streamText({
    model: google(modelName),
    system: systemPrompt,
    messages,
    tools,
    temperature: 0.2,
    maxSteps: 5,
    onFinish: async ({ text, toolCalls }) => {
      try {
        await supabase.from('ai_messages').insert({
          household_id: profile.household_id,
          user_id: profile.id,
          role: 'assistant',
          content: text || '',
          tool_calls: toolCalls && toolCalls.length > 0 ? toolCalls : null,
        });
      } catch (err) {
        console.error('Erro ao salvar mensagem em ai_messages:', err);
      }
    },
  });

  return result.toDataStreamResponse();
}
