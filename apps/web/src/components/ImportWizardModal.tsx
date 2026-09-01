'use client';

import React, { useState } from 'react';
import { formatCentsToBRL, parseBRLToCents } from '@equilibrium/ui';
import { TransactionMock, MOCK_ACCOUNTS, MOCK_CATEGORIES } from '@equilibrium/db';
import { Upload, FileText, CheckCircle2, ArrowRight, X, ShieldAlert } from 'lucide-react';

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportBatch: (txs: Partial<TransactionMock>[]) => void;
}

export function ImportWizardModal({ isOpen, onClose, onImportBatch }: ImportWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'csv' | 'ofx' | 'qif'>('ofx');
  const [parsedRows, setParsedRows] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleSimulateFileSelect = (type: 'csv' | 'ofx' | 'qif') => {
    setFileType(type);
    setFileName(`extrato_bancario_agosto_2026.${type}`);
    
    // Simula 3 transações parseadas do extrato bancário
    setParsedRows([
      { date: '2026-08-29', description: 'Supermercado Pão de Açúcar', amountCents: 31250, type: 'expense', categoryId: MOCK_CATEGORIES[1].id },
      { date: '2026-08-27', description: 'Uber Trip SP', amountCents: 2890, type: 'expense', categoryId: MOCK_CATEGORIES[3].id },
      { date: '2026-08-25', description: 'Transferência Recebida Pix', amountCents: 150000, type: 'income', categoryId: MOCK_CATEGORIES[6].id },
    ]);
    setStep(2);
  };

  const handleConfirmImport = () => {
    const batch: Partial<TransactionMock>[] = parsedRows.map((row) => ({
      description: row.description,
      amountCents: row.amountCents,
      type: row.type,
      date: row.date,
      categoryId: row.categoryId,
      accountId: MOCK_ACCOUNTS[0].id,
      source: fileType,
      tags: ['importado', fileType],
    }));

    onImportBatch(batch);
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Wizard de Importação (CSV / OFX / QIF)</h3>
              <p className="text-xs text-slate-400">Mapeamento de colunas, de-duplicação e categorização automática</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: File Selection */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <span className="text-slate-300 font-semibold">Selecione o formato do extrato bancário:</span>
            
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleSimulateFileSelect('ofx')}
                className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-2xl flex flex-col items-center gap-2 text-center transition"
              >
                <FileText className="w-6 h-6 text-emerald-400" />
                <span className="font-bold text-slate-200">OFX (Bancos)</span>
                <span className="text-[10px] text-slate-500">Recomendado</span>
              </button>

              <button
                onClick={() => handleSimulateFileSelect('csv')}
                className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl flex flex-col items-center gap-2 text-center transition"
              >
                <FileText className="w-6 h-6 text-indigo-400" />
                <span className="font-bold text-slate-200">CSV (Planilhas)</span>
                <span className="text-[10px] text-slate-500">Mapear colunas</span>
              </button>

              <button
                onClick={() => handleSimulateFileSelect('qif')}
                className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-2xl flex flex-col items-center gap-2 text-center transition"
              >
                <FileText className="w-6 h-6 text-amber-400" />
                <span className="font-bold text-slate-200">QIF (Quicken)</span>
                <span className="text-[10px] text-slate-500">Legado</span>
              </button>
            </div>

            {/* Pluggy Adapter Feature Flag Status */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldAlert className="w-4 h-4 text-slate-500" />
                <span>Conector Open Finance (Pluggy Adapter)</span>
              </div>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[10px] font-mono">
                PLUGGY_ENABLED = FALSE (Modo Nativo Ativo)
              </span>
            </div>
          </div>
        )}

        {/* Step 2: Mapping & Preview */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Arquivo: <strong className="font-mono text-emerald-400">{fileName}</strong></span>
              <span className="text-[11px] text-slate-400 font-mono">{parsedRows.length} transações detectadas</span>
            </div>

            <div className="space-y-2 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
              {parsedRows.map((row, idx) => (
                <div key={idx} className="p-3 border-b border-slate-800/60 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200">{row.description}</span>
                    <p className="text-[10px] text-slate-500 font-mono">{row.date}</p>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatCentsToBRL(row.amountCents)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold"
              >
                <span>Importar Extrato</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Confirmation */}
        {step === 3 && (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="font-bold text-slate-100 text-lg">Importação Concluída com Sucesso!</h4>
            <p className="text-xs text-slate-400">
              As transações foram integradas, de-duplicadas e categorizadas no seu household.
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setStep(1);
                  onClose();
                }}
                className="px-6 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                Concluir & Ver Transações
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
