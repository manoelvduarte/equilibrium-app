'use server';

import { getUserFromRequest } from '@/lib/ai/auth';
import { executeApprovedToolCore, rejectToolCallCore } from '@/lib/ai/executeTool';

export interface ExecuteApprovedToolParams {
  toolCallId: string;
  toolName: string;
  args: any;
}

export async function executeApprovedTool({ toolCallId, toolName, args }: ExecuteApprovedToolParams) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile, user } = authContext;

  return executeApprovedToolCore({
    supabase,
    userId: profile.id,
    householdId: profile.household_id,
    toolCallId,
    toolName,
    args,
  });
}

export async function rejectToolCall({ toolCallId, toolName, args }: ExecuteApprovedToolParams) {
  const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
  const { supabase, profile, user } = authContext;

  return rejectToolCallCore({
    supabase,
    userId: profile.id,
    householdId: profile.household_id,
    toolCallId,
    toolName,
    args,
  });
}

export async function saveUserMessage(content: string) {
  try {
    const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
    const { supabase, profile } = authContext;

    const { data, error } = await supabase
      .from('ai_messages')
      .insert({
        household_id: profile.household_id,
        user_id: profile.id,
        role: 'user',
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar mensagem do usuário:', error);
    }

    return data;
  } catch (err) {
    console.warn('Falha ao salvar mensagem:', err);
    return null;
  }
}

export async function loadChatHistory() {
  try {
    const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
    const { supabase, profile } = authContext;

    const { data: messages } = await supabase
      .from('ai_messages')
      .select('id, role, content, tool_calls, created_at')
      .eq('household_id', profile.household_id)
      .order('created_at', { ascending: true })
      .limit(50);

    return (messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content || '',
      toolInvocations: m.tool_calls || undefined,
      createdAt: new Date(m.created_at),
    }));
  } catch (err) {
    console.warn('Falha ao carregar histórico:', err);
    return [];
  }
}

export async function loadActionLogs() {
  try {
    const authContext = await getUserFromRequest(new Request('http://localhost/actions'));
    const { supabase, profile } = authContext;

    const { data: logs } = await supabase
      .from('ai_action_logs')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('created_at', { ascending: false })
      .limit(20);

    return logs || [];
  } catch (err) {
    console.warn('Falha ao carregar logs:', err);
    return [];
  }
}
