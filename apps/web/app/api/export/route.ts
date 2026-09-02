import { getUserFromRequest } from '@/lib/ai/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  // 1. Autenticação Híbrida (Bearer token Mobile ou Cookie Web)
  const authContext = await getUserFromRequest(req);
  if (!authContext) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { supabase, profile } = authContext;

  try {
    // 2. Consulta RLS de transações do household com joins
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        date,
        description,
        merchant,
        type,
        amount_cents,
        source,
        version,
        categories:category_id ( name ),
        accounts:account_id ( name )
      `)
      .eq('household_id', profile.household_id)
      .is('deleted_at', null)
      .order('date', { ascending: false });

    if (error) {
      console.error('[Export Route] Erro ao buscar transações:', error);
      return Response.json({ error: 'Falha ao buscar transações para exportação.' }, { status: 500 });
    }

    // 3. Montagem do CSV UTF-8 com BOM (\uFEFF) para Excel pt-BR
    const BOM = '\uFEFF';
    const headers = ['Data', 'Descricao', 'Estabelecimento', 'Tipo', 'ValorCentavos', 'Categoria', 'Conta', 'Origem', 'Versao'];

    const escapeCsv = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return '';
      const text = String(str);
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const rows = (transactions || []).map((t: any) => [
      escapeCsv(t.date),
      escapeCsv(t.description),
      escapeCsv(t.merchant || ''),
      escapeCsv(t.type),
      escapeCsv(t.amount_cents),
      escapeCsv(t.categories?.name || 'Sem Categoria'),
      escapeCsv(t.accounts?.name || 'Conta Padrão'),
      escapeCsv(t.source || 'manual'),
      escapeCsv(t.version || 1),
    ]);

    const csvContent = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="equilibrium-transacoes.csv"',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('[Export Route] Erro inesperado:', err);
    return Response.json({ error: err.message || 'Erro interno ao gerar CSV.' }, { status: 500 });
  }
}
