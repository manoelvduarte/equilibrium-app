'use client';

import React, { useState } from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { TransactionMock, MOCK_ACCOUNTS, MOCK_CATEGORIES } from '@equilibrium/db';
import { Camera, Scan, CheckCircle2, X, ArrowRight, Sparkles } from 'lucide-react';

interface ReceiptOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmOCR: (tx: Partial<TransactionMock>) => void;
}

export function ReceiptOCRModal({ isOpen, onClose, onConfirmOCR }: ReceiptOCRModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    merchant: string;
    amountCents: number;
    date: string;
    description: string;
    categoryId: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setExtractedData({
        merchant: 'Drogaria São Paulo',
        amountCents: 6780, // R$ 67,80
        date: new Date().toISOString().split('T')[0],
        description: 'Farmácia & Medicamentos',
        categoryId: MOCK_CATEGORIES[3].id,
      });
    }, 1200);
  };

  const handleSave = () => {
    if (!extractedData) return;
    onConfirmOCR({
      description: extractedData.description,
      merchant: extractedData.merchant,
      amountCents: extractedData.amountCents,
      type: 'expense',
      date: extractedData.date,
      categoryId: extractedData.categoryId,
      accountId: MOCK_ACCOUNTS[0].id,
      source: 'ocr',
      tags: ['ocr', 'recibo'],
    });

    setExtractedData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Camera className="w-4 h-4" />
            <span>OCR de Recibo por Foto (M8)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload / Simulation Camera Box */}
        {!extractedData && !isScanning && (
          <div className="p-8 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl bg-slate-950/60 flex flex-col items-center justify-center text-center space-y-3 transition cursor-pointer" onClick={handleSimulateScan}>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
              <Scan className="w-8 h-8" />
            </div>
            <div>
              <span className="font-bold text-slate-200 text-sm">Clique para simular foto de recibo</span>
              <p className="text-xs text-slate-500">Formato JPG, PNG ou PDF</p>
            </div>
          </div>
        )}

        {/* Scanning Spinner */}
        {isScanning && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-emerald-400">
            <Scan className="w-10 h-10 animate-spin" />
            <span className="text-xs font-semibold">Extraindo dados visuais do recibo...</span>
          </div>
        )}

        {/* Extracted Data Card */}
        {extractedData && (
          <div className="p-4 bg-slate-950 border border-emerald-500/40 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Leitura Visual OCR Concluída
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 px-2 py-0.5 rounded">99.4% Precisão</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-slate-200">
                <span>Estabelecimento:</span>
                <span className="text-emerald-400">{extractedData.merchant}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-200">
                <span>Valor Total:</span>
                <span className="font-mono text-base text-emerald-400">{formatCentsToBRL(extractedData.amountCents)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Data Emissão:</span>
                <span>{extractedData.date}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setExtractedData(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Refazer
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-4 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                <span>Confirmar & Salvar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
