'use client';

import React, { useState } from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { approveAndExecuteAIAction, rejectAIAction, AIActionLogPayload } from '@/actions/aiActions';
import { ShieldAlert, Check, X, Sparkles, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AIApprovalCardProps {
  toolCallId: string;
  toolName: string;
  args: any;
  onApproved: (result: any) => void;
  onRejected: () => void;
}

export function AIApprovalCard({ toolCallId, toolName, args, onApproved, onRejected }: AIApprovalCardProps) {
  const [status, setStatus] = useState<'pending' | 'executing' | 'approved' | 'rejected'>('pending');

  const handleApprove = async () => {
    setStatus('executing');
    try {
      const payload: AIActionLogPayload = {
        id: toolCallId,
        toolName,
        params: args,
        status: 'approved',
        createdAt: new Date().toISOString(),
      };
      const res = await approveAndExecuteAIAction(payload);
      setStatus('approved');
      onApproved(res);
    } catch (err) {
      console.error('Erro ao aprovar ação da IA:', err);
      setStatus('pending');
    }
  };

  const handleReject = async () => {
    setStatus('rejected');
    await rejectAIAction(toolCallId);
    onRejected();
  };

  return (
    <div className="my-3 p-4 bg-slate-950 border border-emerald-500/40 rounded-2xl shadow-xl space-y-3 animate-in fade-in duration-200">
      
      {/* Badge de Aprovação Humana Prévia */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
          <ShieldAlert className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Aprovação Prévia Requerida (needsApproval)</span>
        </div>
        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded">
          {toolName}
        </span>
      </div>

      {/* Detalhes da Ação Proposta (Diff) */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs">
        <span className="text-[10px] uppercase font-bold text-slate-400">Alteração Proposta pela IA:</span>
        
        {toolName === 'create_transaction' && (
          <div className="space-y-1">
            <div className="flex justify-between font-semibold text-slate-200">
              <span>{args.description || 'Mercado'}</span>
              <span className="font-mono text-emerald-400">{formatCentsToBRL(args.amountCents || 8990)}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Tipo: <strong className="text-slate-200">{args.type || 'despesa'}</strong></span>
              <span>•</span>
              <span>Data: <strong className="text-slate-200">{args.date || 'Hoje'}</strong></span>
            </div>
          </div>
        )}

        {toolName !== 'create_transaction' && (
          <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-2 bg-slate-950 rounded border border-slate-800">
            {JSON.stringify(args, null, 2)}
          </pre>
        )}
      </div>

      {/* Controles de Decisão */}
      {status === 'pending' && (
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={handleReject}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Rejeitar</span>
          </button>
          <button
            onClick={handleApprove}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Confirmar & Executar</span>
          </button>
        </div>
      )}

      {status === 'executing' && (
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-400 py-1">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Executando Drizzle com JWT do Usuário...</span>
        </div>
      )}

      {status === 'approved' && (
        <div className="flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 p-2.5 rounded-xl font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Ação aprovada e executada com sucesso!</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">ai_action_logs recorded</span>
        </div>
      )}

      {status === 'rejected' && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-xl font-medium">
          <X className="w-4 h-4" />
          <span>Ação rejeitada pelo usuário. Nenhuma alteração foi feita.</span>
        </div>
      )}

    </div>
  );
}
