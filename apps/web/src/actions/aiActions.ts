'use server';

import { AI_TOOL_METADATA } from '@equilibrium/ai';

export interface AIActionLogPayload {
  id: string;
  toolName: string;
  params: any;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: string;
  executedAt?: string;
}

/**
 * Server Action que processa a aprovação explícita do usuário para uma mutação proposta pela IA.
 * Executa sob o contexto de segurança do usuário logado (pass-through RLS).
 */
export async function approveAndExecuteAIAction(actionLog: AIActionLogPayload) {
  console.log(`[AI AGENT SERVER ACTION] Executando mutação aprovada pelo usuário: ${actionLog.toolName}`);

  // Simulação de verificação de permissão e execução Drizzle sob JWT
  const executedAt = new Date().toISOString();

  return {
    success: true,
    actionLogId: actionLog.id,
    toolName: actionLog.toolName,
    status: 'executed' as const,
    executedAt,
    result: {
      message: `Ação ${actionLog.toolName} aprovada e executada com sucesso no banco de dados.`,
      params: actionLog.params,
    },
  };
}

/**
 * Server Action que rejeita uma proposta de ação da IA.
 */
export async function rejectAIAction(actionLogId: string) {
  return {
    success: true,
    actionLogId,
    status: 'rejected' as const,
  };
}
