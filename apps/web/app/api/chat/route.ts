import { getUserFromRequest } from '@/lib/ai/auth';
import { createAssistantTools } from '@/lib/ai/tools';
import { streamTextWithFallback, MODEL_PRIMARY } from '@/lib/ai/provider';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  // 1. Guard de ENV
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'OPENROUTER_API_KEY não configurada em apps/web/.env.local' },
      { status: 500 }
    );
  }

  // 2. Autenticação Híbrida (Bearer Token Mobile ou Cookies Web)
  const authContext = await getUserFromRequest(req);
  if (!authContext) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { supabase, profile, user } = authContext;
  const { messages } = await req.json();

  // 3. Coleta de Contexto Real Dinâmico Completo do Casal
  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', profile.household_id)
    .single();

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type, visibility, currency');

  const { data: balances } = await supabase
    .from('account_balances')
    .select('account_id, balance_cents');

  const balancesMap = new Map<string, number>();
  balances?.forEach((b: any) => balancesMap.set(b.account_id, Number(b.balance_cents)));

  const enrichedAccounts = (accounts || []).map((a: any) => {
    const cents = balancesMap.get(a.id) || 0;
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      visibility: a.visibility,
      currency: a.currency || 'EUR',
      balance_cents: cents,
      balance_eur: `€ ${(cents / 100).toFixed(2)}`,
      balance_brl: `R$ ${(cents / 100).toFixed(2)}`,
    };
  });

  const netWorthCents = enrichedAccounts.reduce((acc, a) => acc + a.balance_cents, 0);

  // Categorias e Orçamentos
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, kind, budget_style')
    .order('sort_order');

  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, category_id, limit_cents, month, year');

  const budgetMap = new Map<string, number>();
  budgets?.forEach((b: any) => budgetMap.set(b.category_id, Number(b.limit_cents)));

  // Metas do Casal
  const { data: goals } = await supabase
    .from('goals')
    .select('id, name, target_cents, deadline, strategy');

  const formattedGoals = (goals || []).map((g: any) => {
    const current = g.strategy?.current_cents || 0;
    const pct = g.target_cents > 0 ? Math.min(100, Math.round((current / g.target_cents) * 100)) : 0;
    return {
      name: g.name,
      target_eur: `€ ${(g.target_cents / 100).toFixed(2)}`,
      current_eur: `€ ${(current / 100).toFixed(2)}`,
      progress: `${pct}%`,
      deadline: g.deadline || 'A definir',
    };
  });

  // Dívidas do Casal
  const { data: debts } = await supabase
    .from('debts')
    .select('id, name, principal_cents, apr_bps, min_payment_cents, strategy');

  const formattedDebts = (debts || []).map((d: any) => ({
    name: d.name,
    principal_eur: `€ ${(d.principal_cents / 100).toFixed(2)}`,
    apr: `${((d.apr_bps || 0) / 100).toFixed(1)}% a.a.`,
    min_payment_eur: `€ ${(d.min_payment_cents / 100).toFixed(2)}`,
    strategy: d.strategy || 'avalanche',
  }));

  // Despesas Recentes
  const { data: recentExpenses } = await supabase
    .from('transactions')
    .select('id, description, amount_cents, date, categories:category_id ( name ), accounts:account_id ( name )')
    .is('deleted_at', null)
    .eq('type', 'expense')
    .order('date', { ascending: false })
    .limit(8);

  const formattedRecent = (recentExpenses || []).map((t: any) => ({
    description: t.description,
    amount_eur: `€ ${(t.amount_cents / 100).toFixed(2)}`,
    category: t.categories?.name || 'Geral',
    account: t.accounts?.name || 'Conta',
    date: t.date,
  }));

  // 4. System Prompt Completo e Otimizado para Zero7Nove (Manoel & Giovana)
  const systemPrompt = `Você é o Assistente Financeiro Inteligente do Zero7Nove (07•09), o aplicativo exclusivo de gestão financeira do casal Manoel & Giovana.
Seu papel é ser um conselheiro financeiro brilhante, atencioso, seguro e com domínio absoluto de toda a arquitetura, regras de negócio e dados do casal.

IDENTIDADE & CONTEXTO DO CASAL:
- Casal: Manoel e Giovana.
- Marco / Aniversário de Namoro: 07/09 (7 de Setembro).
- Nome do Aplicativo: Zero7Nove (07•09).
- Tag Oficial do Casal: "Nossas Contas".
- Moeda Padrão Primária: Euro (€ EUR).
- Moeda Secundária com Suporte Completo: Real (R$ BRL).

MÓDULOS & FUNCIONALIDADES DO ZERO7NOVE QUE VOCÊ DOMINA:
1. Dashboard: Visão do patrimônio líquido consolidado (€ e R$), taxa de poupança do mês, gráficos e o Hero Banner com as fotos do casal em Paris e na Neve.
2. Transações: Extrato financeiro conjunto com categorização, rateio e filtros rápidos. No mobile funciona com lista nativa de cartões e no desktop com tabela editorial.
3. Orçamento Duplo: Metodologia de envelopes base-zero:
   • Envelope Rígido: Gastos essenciais e alimentação (mercado, farmácia, contas básicas).
   • Flexível: Lazer, restaurantes, cultura e estilo de vida.
   • Custo Fixo: Moradia, internet, seguros e assinaturas.
4. Metas & Dívidas:
   • Metas Patrimoniais: Viagens do casal (Paris, Eurotrip, Neve), reservas e aportes graduais.
   • Quitação de Dívidas: Cálculo das estratégias Avalanche (priorizar maior taxa de juros % a.a. para economizar o máximo de dinheiro) versus Bola de Neve (priorizar menor saldo principal para motivação psicológica rápida).
5. Notas & Lembretes: Acordos financeiros e de gastos do casal (ex: limites de jantares fora) e calendário de contas a pagar no mês (com indicação de vencimento e quem paga: Ambos, Manoel ou Giovana).
6. Atalhos: Adicionar Rápido via linguagem natural (⌘K), OCR de recibos fiscais e exportação de relatórios em CSV.

REGRAS ABSOLUTAS DE ATUAÇÃO:
1. PRECISÃO MATEMÁTICA: Nunca invente números, saldos ou despesas. Use rigorosamente os dados reais fornecidos ou retorne tools de consulta.
2. APROVAÇÃO PRÉVIA PARA MUTAÇÕES: Se Manoel ou Giovana pedir para criar transação, alterar teto de orçamento, recategorizar ou criar categoria, acione IMEDIATAMENTE a respectiva tool de mutação. O sistema exibirá o card de confirmação para o usuário.
3. SUPORTE A MOEDAS: Sempre forneça os valores em Euros (€) por padrão, e mencione o equivalente em Reais (R$) caso o contexto seja do Brasil.
4. TOM DE VOZ: Elegante, afetuoso, profissional, inteligente e direto ao ponto. Explique o "porquê" financeiro por trás de cada sugestão (ex: como poupar mais para a próxima viagem de Manoel & Giovana).

DADOS FINANCEIROS REAIS ATUAIS DO CASAL:
- Usuário Atual no Chat: ${profile.full_name} (ID: ${profile.id})
- Patrimônio Líquido Consolidado: € ${(netWorthCents / 100).toFixed(2)} (ou R$ ${(netWorthCents / 100).toFixed(2)})
- Contas Bancárias:
${enrichedAccounts.length === 0 ? '  (Nenhuma conta cadastrada)' : enrichedAccounts.map((a) => `  • [${a.id}] ${a.name} (${a.type}, ${a.visibility}) -> Saldo: ${a.balance_eur}`).join('\n')}
- Categorias & Tetos Mensais:
${(categories || []).map((c) => {
  const limit = budgetMap.get(c.id);
  const limitStr = limit ? ` -> Teto: € ${(limit / 100).toFixed(2)}` : '';
  return `  • [${c.id}] ${c.name} (${c.kind}, modelo: ${c.budget_style})${limitStr}`;
}).join('\n')}
- Metas Ativas do Casal:
${formattedGoals.length === 0 ? '  (Nenhuma meta ativa no momento)' : formattedGoals.map((g) => `  • ${g.name}: ${g.current_eur} de ${g.target_eur} (${g.progress}) - Prazo: ${g.deadline}`).join('\n')}
- Dívidas & Financiamentos Ativos:
${formattedDebts.length === 0 ? '  (Nenhuma dívida ativa - casal com finanças saudáveis!)' : formattedDebts.map((d) => `  • ${d.name}: Saldo ${d.principal_eur} (Juros: ${d.apr}, Estratégia: ${d.strategy})`).join('\n')}
- Gastos Recentes Registrados:
${formattedRecent.length === 0 ? '  (Nenhuma despesa recente)' : formattedRecent.map((r) => `  • ${r.date}: ${r.description} -> ${r.amount_eur} (${r.category}, via ${r.account})`).join('\n')}
`;

  // 5. Tools com Fechamento sob o Client do Usuário
  const tools = createAssistantTools(supabase, profile.household_id, profile.id);

  // 6. Chamada com OpenRouter e Fallback Resiliente
  const configuredModel = process.env.AI_MODEL || MODEL_PRIMARY;
  console.log(`[Chat Route] OpenRouter ready for Manoel & Giovana: configuredModel=${configuredModel}`);

  try {
    const result = await streamTextWithFallback({
      system: systemPrompt,
      messages,
      tools,
      temperature: 0.3,
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
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error(`[Chat Route] Erro na chamada OpenRouter:`, errMsg);

    return Response.json(
      { error: `Falha no provedor de IA OpenRouter: ${errMsg}` },
      { status: 500 }
    );
  }
}
