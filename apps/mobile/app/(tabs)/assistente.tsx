import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { formatCentsToBRL } from '@equilibrium/ui';
import {
  Bot,
  ArrowRight,
  ShieldAlert,
  Check,
  X,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react-native';

const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL || 'http://localhost:3000';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolInvocations?: any[];
}

export default function MobileAssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // 1. Carregar histórico inicial do chat
  const loadHistory = async () => {
    try {
      setInitialLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${WEB_API_URL}/api/chat-history`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const history = await res.json();
        if (Array.isArray(history)) {
          setMessages(history);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  // 2. Enviar mensagem para /api/chat
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setInput('');
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await fetch(`${WEB_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha na resposta do assistente.');
      }

      // Leitura da resposta em stream/texto
      const rawText = await response.text();

      // Processar dados do data stream Vercel AI SDK
      // Formato: 0:"texto"\n9:{"toolCallId":...}
      let assistantText = '';
      const toolInvocations: any[] = [];

      const lines = rawText.split('\n');
      for (const line of lines) {
        if (line.startsWith('0:')) {
          try {
            const chunk = JSON.parse(line.slice(2));
            assistantText += chunk;
          } catch {}
        } else if (line.startsWith('9:')) {
          try {
            const toolCall = JSON.parse(line.slice(2));
            toolInvocations.push({
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              args: toolCall.args,
              state: 'call',
            });
          } catch {}
        }
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantText || (toolInvocations.length > 0 ? 'Proposta de ação gerada:' : rawText),
        toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao conversar com o assistente.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Executar tool aprovada
  const handleApproveTool = async (messageId: string, toolCallId: string, toolName: string, args: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${WEB_API_URL}/api/tools/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ toolCallId, toolName, args }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao executar ferramenta.');
      }

      const { result } = await res.json();

      // Atualiza o estado da tool para 'result'
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const updatedTools = m.toolInvocations?.map((ti) =>
            ti.toolCallId === toolCallId ? { ...ti, state: 'result', result } : ti
          );
          return { ...m, toolInvocations: updatedTools };
        })
      );

      // Enviar resultado para o modelo narrar
      handleSendMessage(`Ação ${toolName} executada com sucesso: ${result?.message || 'OK'}`);
    } catch (err: any) {
      Alert.alert('Erro ao Executar', err.message || 'Falha na execução.');
    }
  };

  // 4. Rejeitar tool
  const handleRejectTool = async (messageId: string, toolCallId: string, toolName: string, args: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch(`${WEB_API_URL}/api/tools/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ toolCallId, toolName, args }),
      });

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const updatedTools = m.toolInvocations?.map((ti) =>
            ti.toolCallId === toolCallId ? { ...ti, state: 'rejected' } : ti
          );
          return { ...m, toolInvocations: updatedTools };
        })
      );

      handleSendMessage(`Ação ${toolName} foi rejeitada.`);
    } catch (err: any) {
      console.error('Erro ao rejeitar tool:', err);
    }
  };

  if (initialLoading) {
    return (
      <View className="flex-1 bg-paper items-center justify-center p-6">
        <ActivityIndicator color="#1E5C43" />
        <Text className="font-sans text-xs text-ink-3 mt-2">Carregando assistente...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-paper"
    >
      {errorMessage && (
        <View className="p-3 bg-surface-2 border-b border-hairline flex-row items-center space-x-2">
          <AlertCircle size={16} color="#B3362B" />
          <Text className="font-sans text-xs text-danger flex-1 ml-2">{errorMessage}</Text>
        </View>
      )}

      {/* Messages List */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }}
      >
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center py-10 space-y-4 my-auto">
            <View className="w-12 h-12 rounded-[12px] bg-surface-2 border border-hairline items-center justify-center">
              <Bot size={24} color="#1E5C43" />
            </View>
            <View className="items-center space-y-1">
              <Text className="font-display text-base font-bold text-ink">
                Assistente do Equilibrium
              </Text>
              <Text className="font-sans text-xs text-ink-3 text-center">
                Pergunte sobre seus gastos ou peça para registrar movimentações.
              </Text>
            </View>

            <View className="w-full space-y-2 pt-2">
              <TouchableOpacity
                onPress={() => handleSendMessage('Qual o resumo financeiro deste mês?')}
                className="p-3 bg-surface border border-hairline rounded-[8px]"
              >
                <Text className="font-sans text-xs text-ink">
                  • Qual o resumo financeiro deste mês?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSendMessage('Onde gastamos mais nas últimas semanas?')}
                className="p-3 bg-surface border border-hairline rounded-[8px]"
              >
                <Text className="font-sans text-xs text-ink">
                  • Onde gastamos mais nas últimas semanas?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSendMessage('Crie uma despesa de Mercado de R$ 89,90 no cartão')}
                className="p-3 bg-surface border border-hairline rounded-[8px]"
              >
                <Text className="font-sans text-xs text-ink">
                  • Crie uma despesa de Mercado de R$ 89,90 no cartão
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="space-y-4">
            {messages.map((m) => (
              <View
                key={m.id}
                className={`flex-row ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'user' ? (
                  <View className="max-w-[85%] p-3 bg-surface-2 border border-hairline rounded-[10px]">
                    <Text className="font-sans text-xs text-ink leading-relaxed">
                      {m.content}
                    </Text>
                  </View>
                ) : (
                  <View className="w-full space-y-2">
                    {m.content ? (
                      <View className="p-3.5 bg-surface border border-hairline rounded-[10px]">
                        <Text className="font-sans text-xs text-ink leading-relaxed">
                          {m.content}
                        </Text>
                      </View>
                    ) : null}

                    {/* Tool Invocations / Approval Card */}
                    {m.toolInvocations?.map((ti) => {
                      if (ti.state === 'call') {
                        return (
                          <View
                            key={ti.toolCallId}
                            className="p-4 bg-surface border border-hairline rounded-[12px] shadow-sm space-y-3"
                          >
                            <View className="flex-row items-center justify-between border-b border-hairline pb-2">
                              <View className="flex-row items-center space-x-1.5">
                                <ShieldAlert size={14} color="#A66A21" />
                                <Text className="font-sans text-[9px] uppercase tracking-wider text-ink-3 ml-1">
                                  Proposta de Ação
                                </Text>
                              </View>
                              <Text className="font-mono text-xs font-bold text-brand">
                                {ti.toolName}
                              </Text>
                            </View>

                            {/* Diff Lines */}
                            <View className="p-2.5 bg-surface-2 border border-hairline rounded-[6px] space-y-1">
                              {Object.entries(ti.args || {}).map(([key, val]) => {
                                let displayVal = String(val);
                                if (key.toLowerCase().includes('cents') && typeof val === 'number') {
                                  displayVal = formatCentsToBRL(val);
                                }
                                return (
                                  <View key={key} className="flex-row justify-between items-center">
                                    <Text className="font-sans text-[9px] uppercase text-ink-3">
                                      {key}
                                    </Text>
                                    <Text className="font-mono text-xs font-bold text-ink">
                                      {displayVal}
                                    </Text>
                                  </View>
                                );
                              })}
                            </View>

                            {/* Action Buttons */}
                            <View className="flex-row items-center justify-end space-x-2 pt-1 border-t border-hairline">
                              <TouchableOpacity
                                onPress={() => handleRejectTool(m.id, ti.toolCallId, ti.toolName, ti.args)}
                                className="px-3 py-1.5 rounded-[6px]"
                              >
                                <Text className="font-sans-medium text-xs text-danger">Rejeitar</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleApproveTool(m.id, ti.toolCallId, ti.toolName, ti.args)}
                                className="px-4 py-2 bg-brand rounded-[6px] flex-row items-center space-x-1 shadow-sm ml-2"
                              >
                                <Check size={14} color="#FAF8F4" />
                                <Text className="font-sans-bold text-xs text-paper ml-1">
                                  Aprovar e executar
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      }

                      if (ti.state === 'result') {
                        return (
                          <View
                            key={ti.toolCallId}
                            className="p-2 bg-surface-2 border border-hairline rounded-[6px] flex-row items-center justify-between"
                          >
                            <Text className="font-mono text-[11px] font-bold text-brand">
                              {ti.toolName} → concluído
                            </Text>
                            <Text className="font-mono text-[10px] text-ink-3">source=ai</Text>
                          </View>
                        );
                      }

                      if (ti.state === 'rejected') {
                        return (
                          <View
                            key={ti.toolCallId}
                            className="p-2 bg-surface-2 border border-hairline rounded-[6px] flex-row items-center justify-between"
                          >
                            <Text className="font-mono text-[11px] text-danger">
                              {ti.toolName} → rejeitado
                            </Text>
                            <Text className="font-mono text-[10px] text-ink-3">status=rejected</Text>
                          </View>
                        );
                      }

                      return null;
                    })}
                  </View>
                )}
              </View>
            ))}

            {loading && (
              <View className="flex-row items-center space-x-2 p-2 bg-surface-2 border border-hairline rounded-[6px] self-start">
                <ActivityIndicator size="small" color="#1E5C43" />
                <Text className="font-sans text-xs text-ink-3 ml-2">Assistente pensando...</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View className="p-3 bg-surface border-t border-hairline flex-row items-center space-x-2">
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSendMessage()}
          placeholder="Pergunte ao Assistente ou peça uma ação..."
          placeholderTextColor="#877F73"
          className="flex-1 px-3.5 py-2.5 bg-paper border border-hairline rounded-[8px] text-ink font-sans text-xs"
        />

        <TouchableOpacity
          onPress={() => handleSendMessage()}
          disabled={loading || !input.trim()}
          className="p-2.5 bg-brand rounded-[8px] items-center justify-center shadow-sm ml-2"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FAF8F4" />
          ) : (
            <ArrowRight size={16} color="#FAF8F4" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
