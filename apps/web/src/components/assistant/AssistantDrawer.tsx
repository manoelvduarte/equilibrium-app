'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import { loadChatHistory, saveUserMessage } from '@/actions/assistantActions';
import { ApprovalCard } from './ApprovalCard';
import {
  Bot,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileText,
  RotateCcw,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface AssistantDrawerProps {
  onActionExecuted?: () => Promise<void>;
}

export function AssistantDrawer({ onActionExecuted }: AssistantDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    tested: boolean;
    loading: boolean;
    envOk?: boolean;
    pingOk?: boolean;
    model?: string;
    providerError?: string;
  }>({ tested: false, loading: false });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    addToolResult,
    setMessages,
    append,
    isLoading,
    error,
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    onError: (err) => {
      console.error('Erro na resposta do assistente:', err);
    },
  });

  // Carregar histórico de ai_messages ao abrir
  useEffect(() => {
    if (isOpen && !initialLoaded) {
      loadChatHistory()
        .then((history) => {
          if (history && history.length > 0) {
            setMessages(history as any);
          }
        })
        .catch(console.error)
        .finally(() => setInitialLoaded(true));
    }
  }, [isOpen, initialLoaded, setMessages]);

  // Scroll automático para a mensagem mais recente
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    saveUserMessage(userText).catch(console.error);
    handleSubmit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e);
    }
  };

  const handleSuggestionClick = (text: string) => {
    saveUserMessage(text).catch(console.error);
    append({
      role: 'user',
      content: text,
    });
  };

  const handleTestHealth = async () => {
    setHealthStatus({ tested: true, loading: true });
    try {
      const res = await fetch('/api/ai-health');
      const data = await res.json();
      setHealthStatus({
        tested: true,
        loading: false,
        envOk: data.envOk,
        pingOk: data.pingOk,
        model: data.model,
        providerError: data.providerError,
      });
    } catch (err: any) {
      setHealthStatus({
        tested: true,
        loading: false,
        envOk: false,
        pingOk: false,
        providerError: err.message || 'Falha na conexão de rede com /api/ai-health',
      });
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 p-3 sm:p-3.5 bg-surface hover:bg-surface-2 border border-hairline rounded-[12px] text-ink shadow-lg flex items-center gap-2 transition-editorial cursor-pointer"
          title="Abrir Assistente Financeiro"
          aria-label="Abrir Assistente"
        >
          <Bot className="w-5 h-5 text-brand stroke-[1.5]" />
          <span className="text-xs font-semibold hidden sm:inline">Assistente</span>
        </button>
      )}

      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-xs sm:hidden"
        />
      )}

      {/* Side Drawer (<md: bottom/fullscreen sheet, >=md: right drawer) */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 top-12 sm:top-0 sm:left-auto sm:right-0 sm:w-[420px] z-50 bg-surface border-t sm:border-t-0 sm:border-l border-hairline rounded-t-[12px] sm:rounded-none shadow-2xl flex flex-col transition-all duration-240 ease-out h-[calc(100dvh-48px)] sm:h-full">
          
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-hairline flex items-center justify-between bg-paper/60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-surface border border-hairline rounded-[6px] text-brand">
                <Bot className="w-4 h-4 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="font-display font-medium text-sm text-ink">Assistente • Zero7Nove</h2>
                <span className="micro-label text-[9px]">Manoel & Giovana • Marco 07/09</span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-ink-3 hover:text-ink rounded-[4px] transition-editorial cursor-pointer"
              aria-label="Fechar gaveta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-surface-2 border-b border-hairline flex items-center gap-2 text-xs text-danger">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{error.message || 'Falha na comunicação com o assistente.'}</span>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
            
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="py-6 sm:py-8 text-center space-y-4">
                <div className="w-10 h-10 rounded-full bg-surface-2 border border-hairline flex items-center justify-center mx-auto text-brand">
                  <Bot className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <p className="font-display text-sm font-medium text-ink">
                    Como posso ajudar Manoel & Giovana hoje?
                  </p>
                  <p className="text-xs text-ink-2">
                    Consulte metas de viagem, orçamentos, dívidas ou registre transações em € ou R$.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2 text-left">
                  <button
                    onClick={() => handleSuggestionClick('Qual o resumo financeiro deste mês em €?')}
                    className="px-3 py-2 bg-paper hover:bg-surface-2 border border-hairline rounded-[6px] text-xs text-ink transition-editorial cursor-pointer"
                  >
                    • Qual o resumo financeiro deste mês em €?
                  </button>
                  <button
                    onClick={() => handleSuggestionClick('Como estão as nossas metas de viagem e reservas?')}
                    className="px-3 py-2 bg-paper hover:bg-surface-2 border border-hairline rounded-[6px] text-xs text-ink transition-editorial cursor-pointer"
                  >
                    • Como estão as nossas metas de viagem e reservas?
                  </button>
                  <button
                    onClick={() => handleSuggestionClick('Onde gastamos mais nas últimas semanas?')}
                    className="px-3 py-2 bg-paper hover:bg-surface-2 border border-hairline rounded-[6px] text-xs text-ink transition-editorial cursor-pointer"
                  >
                    • Onde gastamos mais nas últimas semanas?
                  </button>
                  <button
                    onClick={() => handleSuggestionClick('Crie uma despesa de Mercado de € 45,00 no cartão')}
                    className="px-3 py-2 bg-paper hover:bg-surface-2 border border-hairline rounded-[6px] text-xs text-ink transition-editorial cursor-pointer"
                  >
                    • Crie uma despesa de Mercado de € 45,00 no cartão
                  </button>
                </div>

                {/* Testar Conexão IA (T2 Auto-diagnóstico) */}
                <div className="pt-3 border-t border-hairline/60">
                  <button
                    onClick={handleTestHealth}
                    disabled={healthStatus.loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 hover:bg-hairline text-ink-2 hover:text-ink text-xs rounded-[4px] font-medium transition-editorial cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-brand" />
                    <span>{healthStatus.loading ? 'Testando conexão...' : 'Testar conexão IA'}</span>
                  </button>

                  {healthStatus.tested && !healthStatus.loading && (
                    <div className="mt-2 p-2.5 bg-paper border border-hairline rounded-[6px] text-left font-mono text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-3">Status:</span>
                        <span className={healthStatus.pingOk ? 'text-brand font-bold' : 'text-danger font-bold'}>
                          {healthStatus.pingOk ? 'CONECTADO' : 'FALHOU'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-3">Modelo:</span>
                        <span className="text-ink">{healthStatus.model || 'gemini-2.5-flash'}</span>
                      </div>
                      {healthStatus.providerError && (
                        <div className="pt-1 text-danger text-[10px]">
                          Erro: {healthStatus.providerError}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Messages Feed */}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 text-xs ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-surface-2 border border-hairline flex items-center justify-center flex-shrink-0 text-brand mt-0.5">
                    <Bot className="w-3.5 h-3.5 stroke-[1.5]" />
                  </div>
                )}

                {/* User Message Bubble */}
                {m.role === 'user' ? (
                  <div className="max-w-[85%] px-3.5 py-2.5 rounded-[8px] bg-surface-2 border border-hairline text-ink leading-relaxed">
                    {m.content}
                  </div>
                ) : (
                  /* Assistant Message Bubble & Tools */
                  <div className="max-w-[88%] space-y-3">
                    {m.content && (
                      <div className="px-3.5 py-2.5 rounded-[8px] bg-paper border border-hairline text-ink leading-relaxed whitespace-pre-wrap font-sans">
                        {m.content}
                      </div>
                    )}

                    {/* Tool Invocations & Human Approval Card */}
                    {m.toolInvocations?.map((ti) => {
                      if (ti.state === 'call') {
                        return (
                          <ApprovalCard
                            key={ti.toolCallId}
                            toolCallId={ti.toolCallId}
                            toolName={ti.toolName}
                            args={ti.args}
                            onResolved={(res) => {
                              addToolResult({
                                toolCallId: ti.toolCallId,
                                result: res,
                              });
                            }}
                            onRejected={() => {
                              addToolResult({
                                toolCallId: ti.toolCallId,
                                result: { status: 'rejected_by_user' },
                              });
                            }}
                            onActionExecuted={onActionExecuted}
                          />
                        );
                      }

                      // Tool com Resultado Concluído
                      if (ti.state === 'result') {
                        return (
                          <div
                            key={ti.toolCallId}
                            className="p-2 bg-surface-2 border border-hairline rounded-[4px] font-mono text-[11px] text-ink-2 flex items-center justify-between"
                          >
                            <span className="text-brand font-semibold">
                              {ti.toolName} → concluído
                            </span>
                            <span className="text-ink-3">source=ai</span>
                          </div>
                        );
                      }

                      return null;
                    })}

                  </div>
                )}

              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 border-t border-hairline bg-paper flex items-end gap-2 flex-shrink-0"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte ao Assistente ou peça uma ação..."
              className="flex-1 max-h-32 min-h-[38px] p-2.5 bg-surface border border-hairline rounded-[6px] text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink resize-none transition-editorial font-sans"
            />

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 bg-brand hover:bg-brand/90 disabled:opacity-40 text-paper rounded-[6px] transition-editorial cursor-pointer flex-shrink-0 shadow-sm"
              title="Enviar mensagem"
              aria-label="Enviar"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 stroke-[2]" />
              )}
            </button>
          </form>

        </div>
      )}
    </>
  );
}
