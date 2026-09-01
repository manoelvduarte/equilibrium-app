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
} from 'lucide-react';

interface AssistantDrawerProps {
  onActionExecuted?: () => Promise<void>;
}

export function AssistantDrawer({ onActionExecuted }: AssistantDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
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

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-3.5 bg-surface hover:bg-surface-2 border border-hairline rounded-[12px] text-ink shadow-lg flex items-center gap-2 transition-editorial cursor-pointer"
          title="Abrir Assistente Financeiro"
          aria-label="Abrir Assistente"
        >
          <Bot className="w-5 h-5 text-brand stroke-[1.5]" />
          <span className="text-xs font-semibold hidden sm:inline">Assistente</span>
        </button>
      )}

      {/* Side Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-surface border-l border-hairline shadow-lg flex flex-col transition-all duration-240 ease-out">
          
          {/* Header */}
          <div className="p-4 border-b border-hairline flex items-center justify-between bg-paper/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-surface border border-hairline rounded-[6px] text-brand">
                <Bot className="w-4 h-4 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="font-display font-medium text-sm text-ink">Assistente</h2>
                <span className="micro-label">Executa apenas com sua aprovação</span>
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
              <span>{error.message || 'Falha na comunicação com o assistente.'}</span>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="py-8 text-center space-y-4">
                <div className="w-10 h-10 rounded-full bg-surface-2 border border-hairline flex items-center justify-center mx-auto text-brand">
                  <Bot className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <p className="font-display text-sm font-medium text-ink">
                    Como posso ajudar nas finanças do casal hoje?
                  </p>
                  <p className="text-xs text-ink-2">
                    Pergunte sobre seus gastos ou peça para registrar movimentações.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handleSuggestionClick('Qual o resumo financeiro deste mês?')}
                    className="px-3 py-2 bg-paper hover:bg-surface-2 border border-hairline rounded-[4px] text-xs text-ink text-left transition-editorial cursor-pointer"
                  >
                    • Qual o resumo financeiro deste mês?
                  </button>
                  <button
                    onClick={() => handleSuggestionClick('Onde gastamos mais nas últimas semanas?')}
                    className="px-3 py-2 bg-paper hover:bg-surface-2 border border-hairline rounded-[4px] text-xs text-ink text-left transition-editorial cursor-pointer"
                  >
                    • Onde gastamos mais nas últimas semanas?
                  </button>
                  <button
                    onClick={() => handleSuggestionClick('Crie uma despesa de Mercado de R$ 89,90 no cartão')}
                    className="px-3 py-2 bg-paper hover:bg-surface-2 border border-hairline rounded-[4px] text-xs text-ink text-left transition-editorial cursor-pointer"
                  >
                    • Crie uma despesa de Mercado de R$ 89,90 no cartão
                  </button>
                </div>
              </div>
            )}

            {/* Messages List */}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {/* User Message */}
                {m.role === 'user' && (
                  <div className="max-w-[85%] bg-surface-2 border border-hairline rounded-[6px] px-3.5 py-2 text-xs text-ink leading-relaxed">
                    {m.content}
                  </div>
                )}

                {/* Assistant Message */}
                {m.role === 'assistant' && (
                  <div className="w-full space-y-2 text-xs text-ink leading-relaxed">
                    
                    {/* Plain Text Content */}
                    {m.content && (
                      <div className="p-3 bg-paper border border-hairline rounded-[6px] whitespace-pre-wrap">
                        {m.content}
                      </div>
                    )}

                    {/* Tool Invocations */}
                    {m.toolInvocations?.map((ti: any) => {
                      const isMutation = [
                        'create_transaction',
                        'update_transaction',
                        'delete_transaction',
                        'categorize_transactions',
                        'update_budget_limit',
                        'create_category',
                      ].includes(ti.toolName);

                      // Tool de Leitura em Execução
                      if (!isMutation && ti.state !== 'result') {
                        return (
                          <div
                            key={ti.toolCallId}
                            className="p-2 bg-surface-2 border border-hairline rounded-[4px] font-mono text-[11px] text-ink-3 flex items-center gap-2"
                          >
                            <Loader2 className="w-3 h-3 animate-spin text-brand" />
                            <span>Consultando dados ({ti.toolName})...</span>
                          </div>
                        );
                      }

                      // Tool de Mutação Proposta (Aguardando Aprovação Humana)
                      if (isMutation && ti.state !== 'result') {
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
            className="p-3 border-t border-hairline bg-paper flex items-end gap-2"
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
