'use client';

import React, { useState } from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { executeApprovedTool, rejectToolCall } from '@/actions/assistantActions';
import { ShieldAlert, Check, X, AlertCircle, Loader2 } from 'lucide-react';

interface ApprovalCardProps {
  toolCallId: string;
  toolName: string;
  args: any;
  onResolved: (result: any) => void;
  onRejected: () => void;
  onActionExecuted?: () => Promise<void>;
}

export function ApprovalCard({
  toolCallId,
  toolName,
  args,
  onResolved,
  onRejected,
  onActionExecuted,
}: ApprovalCardProps) {
  const [status, setStatus] = useState<'pending' | 'executing' | 'executed' | 'rejected'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApprove = async () => {
    setStatus('executing');
    setErrorMessage(null);

    try {
      const res = await executeApprovedTool({
        toolCallId,
        toolName,
        args,
      });

      setStatus('executed');
      onResolved(res.result);
      if (onActionExecuted) {
        await onActionExecuted();
      }
    } catch (err: any) {
      setStatus('pending');
      setErrorMessage(err.message || 'Falha ao executar ação aprovada.');
    }
  };

  const handleReject = async () => {
    try {
      await rejectToolCall({
        toolCallId,
        toolName,
        args,
      });
      setStatus('rejected');
      onRejected();
    } catch (err) {
      setStatus('rejected');
      onRejected();
    }
  };

  // Se já resolvido, renderiza a linha de auditoria compacta
  if (status === 'executed') {
    return (
      <div className="my-2 p-2 bg-surface-2 border border-hairline rounded-[6px] font-mono text-[11px] text-ink-2 flex items-center justify-between">
        <span className="text-brand font-semibold">{toolName} → executado</span>
        <span className="text-ink-3">source=ai</span>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="my-2 p-2 bg-surface-2 border border-hairline rounded-[6px] font-mono text-[11px] text-danger flex items-center justify-between">
        <span>{toolName} → rejeitado pelo usuário</span>
        <span className="text-ink-3">status=rejected</span>
      </div>
    );
  }

  return (
    <div className="my-3 bg-surface border border-hairline rounded-[12px] p-4 shadow-sm space-y-3">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-2">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-warning" />
          <span className="micro-label">Proposta de Ação</span>
        </div>
        <span className="font-mono text-[11px] font-semibold text-brand">
          {toolName}
        </span>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-2 bg-surface-2 border border-hairline rounded-[6px] flex items-center gap-2 text-xs text-danger">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Diff Lines de Parâmetros */}
      <div className="p-2.5 bg-surface-2 border border-hairline rounded-[6px] space-y-1.5 text-xs font-mono">
        {Object.entries(args || {}).map(([key, val]) => {
          let displayVal = String(val);
          let isDanger = false;

          if (key.toLowerCase().includes('cents') && typeof val === 'number') {
            displayVal = formatCentsToBRL(val);
            if (args.type === 'expense') isDanger = true;
          }

          return (
            <div key={key} className="flex justify-between items-center text-[11px]">
              <span className="text-ink-3 uppercase tracking-wider text-[10px]">
                {key}
              </span>
              <span className={`font-semibold tnum ${isDanger ? 'text-danger' : 'text-ink'}`}>
                {displayVal}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-hairline">
        <button
          type="button"
          disabled={status === 'executing'}
          onClick={handleReject}
          className="px-2.5 py-1.5 text-danger hover:bg-surface-2 disabled:opacity-50 text-xs font-medium rounded-[6px] transition-editorial cursor-pointer"
        >
          Rejeitar
        </button>

        <button
          type="button"
          disabled={status === 'executing'}
          onClick={handleApprove}
          className="flex items-center gap-1 px-3.5 py-1.5 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper text-xs font-semibold rounded-[6px] shadow-sm transition-editorial cursor-pointer"
        >
          {status === 'executing' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executando...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Aprovar e executar</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
