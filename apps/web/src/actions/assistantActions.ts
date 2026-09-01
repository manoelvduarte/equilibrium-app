'use server';

import { createClient } from '@/lib/supabase/server';
import { executeApprovedToolCore, rejectToolCallCore } from '@/lib/ai/executeTool';

export interface ExecuteApprovedToolParams {
  toolCallId: string;
  toolName: string;
  args: any;
}

export async function executeApprovedTool({ toolCallId, toolName, args }: ExecuteApprovedToolParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) {
    throw new Error('Household não encontrado');
  }

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) return { success: false };

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) return null;

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
}

export async function loadChatHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: messages } = await supabase
    .from('ai_messages')
    .select('id, role, content, tool_calls, created_at')
    .order('created_at', { ascending: true })
    .limit(50);

  return (messages || []).map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content || '',
    toolInvocations: m.tool_calls || undefined,
    createdAt: new Date(m.created_at),
  }));
}

export async function loadActionLogs() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from('ai_action_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return logs || [];
}
