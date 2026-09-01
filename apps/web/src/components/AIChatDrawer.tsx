'use client';

import React, { useState } from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { TransactionMock, MOCK_ACCOUNTS, MOCK_CATEGORIES } from '@equilibrium/db';
import { AIApprovalCard } from '@/components/AIApprovalCard';
import { Sparkles, Bot, Send, X, ShieldCheck, User, ArrowRight, CornerDownLeft } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content?: string;
  toolCall?: {
    id: string;
    name: string;
    args: any;
  };
}

interface AIChatDrawerProps {
  onAddTransaction: (tx: Partial<TransactionMock>) => void;
}

export function AIChatDrawer({ onAddTransaction }: AIChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content:
        'Olá, Alex & Sam! Sou o assistente financeiro agêntico do Equilibrium. Posso consultar relatórios, projetar fluxo de caixa ou criar transações no banco de dados sob sua aprovação prévia.',
    },
  ]);

  const handleSend = (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!userText) setInput('');

    // Simula raciocínio e chamada de tool agêntica
    setTimeout(() => {
      if (/cria|criar|adicionar|mercado 89/i.test(textToSend)) {
        // Dispara Tool Call de Mutação: create_transaction
        const toolCallMsg: Message = {
          id: `msg-tool-${Date.now()}`,
          role: 'assistant',
          content: 'Entendido! Calculei os parâmetros da transação de mercado. Por favor, confira e aprove a ação abaixo:',
          toolCall: {
            id: `tool-${Date.now()}`,
            name: 'create_transaction',
            args: {
              description: 'Compras de Mercado',
              amountCents: 8990, // R$ 89,90
              type: 'expense',
              date: new Date().toISOString().split('T')[0],
              categoryId: MOCK_CATEGORIES[1].id,
              accountId: MOCK_ACCOUNTS[0].id,
            },
          },
        };
        setMessages((prev) => [...prev, toolCallMsg]);
      } else if (/resumo|saldo|patrimônio/i.test(textToSend)) {
        // Tool de Leitura: get_financial_summary
        const summaryMsg: Message = {
          id: `msg-summary-${Date.now()}`,
          role: 'assistant',
          content: `📊 **Resumo Financeiro Atual:**\n\n• Patrimônio Líquido: **R$ 78.430,00**\n• Receita Mensal: **R$ 18.300,00**\n• Despesas Comprometidas: **R$ 6.899,90**\n• Taxa de Poupança: **62.3%**`,
        };
        setMessages((prev) => [...prev, summaryMsg]);
      } else {
        const defaultMsg: Message = {
          id: `msg-default-${Date.now()}`,
          role: 'assistant',
          content: `Analisei seu histórico do household. Suas contas estão equilibradas. Dica: Digite **"Crie a transação mercado 89,90"** para testar o fluxo completo de aprovação humana prévia!`,
        };
        setMessages((prev) => [...prev, defaultMsg]);
      }
    }, 600);
  };

  const handleToolApproved = (toolCall: any, res: any) => {
    // Adiciona transação criada pelo agente à lista de transações da aplicação
    onAddTransaction({
      description: toolCall.args.description,
      amountCents: toolCall.args.amountCents,
      type: toolCall.args.type,
      categoryId: toolCall.args.categoryId,
      accountId: toolCall.args.accountId,
      date: toolCall.args.date,
      source: 'ai',
      tags: ['ia-agentica'],
    });

    // Adiciona mensagem de confirmação
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-confirm-${Date.now()}`,
        role: 'assistant',
        content: `✅ Transação **"${toolCall.args.description}"** de **${formatCentsToBRL(
          toolCall.args.amountCents
        )}** criada com sucesso no banco de dados e sincronizada em tempo real!`,
      },
    ]);
  };

  return (
    <>
      {/* Botão Flutuante de Disparo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-bold shadow-2xl shadow-emerald-500/30 transition hover:scale-105 active:scale-95"
      >
        <Sparkles className="w-5 h-5 fill-slate-950" />
        <span className="text-xs">Assistente IA</span>
      </button>

      {/* Drawer do Chat */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-full max-w-md h-[560px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                  Equilibrium Agent
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h3>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Executando sob JWT do Usuário
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className="max-w-[82%] space-y-2">
                  {msg.content && (
                    <div
                      className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}

                  {/* Card de Aprovação Interativa de Tool */}
                  {msg.toolCall && (
                    <AIApprovalCard
                      toolCallId={msg.toolCall.id}
                      toolName={msg.toolCall.name}
                      args={msg.toolCall.args}
                      onApproved={(res) => handleToolApproved(msg.toolCall, res)}
                      onRejected={() => {}}
                    />
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 flex-shrink-0 font-bold text-[10px]">
                    U
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-2 overflow-x-auto text-[10px]">
            <button
              onClick={() => handleSend('Crie a transação mercado 89,90')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/20 rounded-full font-medium flex-shrink-0 transition"
            >
              ⚡ "Crie a transação mercado 89,90"
            </button>
            <button
              onClick={() => handleSend('Qual o resumo financeiro deste mês?')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full font-medium flex-shrink-0 transition"
            >
              📊 Resumo do Mês
            </button>
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite instrução para a IA..."
              className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 rounded-xl font-bold transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
