'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { parseCSV, ColumnMapping, normalizeCSVRow, RawParsedRow } from '@/lib/import/csv';
import { parseOFX } from '@/lib/import/ofx';
import { deduplicateImportRows, MatchedImportRow } from '@/lib/import/dedup';
import { getStoredRules, applyRulesToRows, saveRule } from '@/lib/import/rules';
import { importTransactions, ImportTransactionInput } from '@/actions/importActions';
import { formatCentsToBRL, CategoryIcon } from '@equilibrium/ui';
import { Account, Category, Transaction } from '@/hooks/useHouseholdData';
import {
  UploadCloud,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
} from 'lucide-react';

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  accounts: Account[];
  categories: Category[];
  existingTransactions: Transaction[];
}

type WizardStep = 'upload' | 'mapping' | 'review' | 'result';

export function ImportWizardModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  existingTransactions,
}: ImportWizardModalProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'csv' | 'ofx'>('csv');
  const [rawContent, setRawContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado do CSV
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<RawParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});

  // Linhas processadas para revisão
  const [reviewRows, setReviewRows] = useState<MatchedImportRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [saveRulesChecked, setSaveRulesChecked] = useState(true);

  // Execução
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    failed: Array<{ index: number; description: string; error: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar conta padrão
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Resetar ao fechar
  const handleClose = () => {
    if (step === 'review' && reviewRows.length > 0 && !importResult) {
      if (!confirm('Deseja realmente cancelar a importação em andamento?')) return;
    }
    setStep('upload');
    setFileName('');
    setRawContent('');
    setCsvHeaders([]);
    setCsvRawRows([]);
    setMapping({});
    setReviewRows([]);
    setImportResult(null);
    setErrorMessage(null);
    onClose();
  };

  // 1. Processar arquivo (CSV ou OFX)
  const processFileContent = (content: string, name: string) => {
    setErrorMessage(null);
    setFileName(name);
    setRawContent(content);

    const isOfx = name.toLowerCase().endsWith('.ofx') || content.includes('<OFX>') || content.includes('<STMTTRN>');

    if (isOfx) {
      setFileType('ofx');
      try {
        const ofxResult = parseOFX(content);
        if (ofxResult.transactions.length === 0) {
          setErrorMessage('Nenhuma movimentação financeira encontrada no arquivo OFX.');
          return;
        }

        const deduped = deduplicateImportRows(ofxResult.transactions, existingTransactions);
        const rules = getStoredRules();
        const withRules = applyRulesToRows(deduped, rules);

        setReviewRows(withRules);
        setStep('review');
      } catch (err: any) {
        setErrorMessage(err.message || 'Falha ao processar arquivo OFX.');
      }
    } else {
      setFileType('csv');
      try {
        const parsed = parseCSV(content);
        if (parsed.rows.length === 0) {
          setErrorMessage('O arquivo CSV está vazio ou em formato inválido.');
          return;
        }

        setCsvHeaders(parsed.headers);
        setCsvRawRows(parsed.rows);
        setMapping(parsed.autoMapping);

        // Se encontrou as colunas essenciais automaticamente, avança para mapeamento ou revisão
        if (parsed.autoMapping.dateColumn && parsed.autoMapping.amountColumn) {
          const normalized = parsed.rows
            .map((r) => normalizeCSVRow(r, parsed.autoMapping))
            .filter((r): r is NonNullable<typeof r> => r !== null);

          const deduped = deduplicateImportRows(normalized, existingTransactions);
          const rules = getStoredRules();
          const withRules = applyRulesToRows(deduped, rules);

          setReviewRows(withRules);
          setStep('review');
        } else {
          setStep('mapping');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Falha ao ler arquivo CSV.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processFileContent(content, file.name);
    };
    reader.onerror = () => setErrorMessage('Erro ao abrir o arquivo no navegador.');
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processFileContent(content, file.name);
    };
    reader.readAsText(file);
  };

  // 2. Concluir etapa de Mapeamento CSV
  const handleApplyMapping = () => {
    if (!mapping.dateColumn || !mapping.amountColumn) {
      setErrorMessage('Selecione pelo menos as colunas de Data e Valor.');
      return;
    }

    const normalized = csvRawRows
      .map((r) => normalizeCSVRow(r, mapping))
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (normalized.length === 0) {
      setErrorMessage('Nenhuma linha pôde ser convertida com o mapeamento selecionado.');
      return;
    }

    const deduped = deduplicateImportRows(normalized, existingTransactions);
    const rules = getStoredRules();
    const withRules = applyRulesToRows(deduped, rules);

    setReviewRows(withRules);
    setStep('review');
  };

  // 3. Modificações na tabela de Revisão
  const handleToggleRow = (index: number) => {
    setReviewRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleToggleAll = () => {
    const allSelected = reviewRows.every((r) => r.selected);
    setReviewRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const handleCategoryChange = (index: number, categoryId: string) => {
    setReviewRows((prev) =>
      prev.map((r) =>
        r.index === index
          ? { ...r, categoryId: categoryId || null, ruleMatched: false }
          : r
      )
    );
  };

  // Totais calculados
  const selectedRows = useMemo(() => reviewRows.filter((r) => r.selected), [reviewRows]);
  const duplicateCount = useMemo(() => reviewRows.filter((r) => r.isDuplicate).length, [reviewRows]);

  const totalExpenseCents = useMemo(
    () =>
      selectedRows
        .filter((r) => r.type === 'expense')
        .reduce((acc, r) => acc + r.amountCents, 0),
    [selectedRows]
  );

  const totalIncomeCents = useMemo(
    () =>
      selectedRows
        .filter((r) => r.type === 'income')
        .reduce((acc, r) => acc + r.amountCents, 0),
    [selectedRows]
  );

  // 4. Execução do Import via Server Action
  const handleExecuteImport = async () => {
    if (selectedRows.length === 0) {
      setErrorMessage('Selecione pelo menos uma transação para importar.');
      return;
    }
    if (!selectedAccountId) {
      setErrorMessage('Selecione uma conta de destino.');
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);

    try {
      const payload: ImportTransactionInput[] = selectedRows.map((r) => ({
        date: r.date,
        amount_cents: r.amountCents,
        type: r.type,
        description: r.description,
        merchant: r.merchant || null,
        category_id: r.categoryId || null,
        source: fileType === 'ofx' ? 'ofx' : 'csv',
      }));

      const res = await importTransactions({
        accountId: selectedAccountId,
        rows: payload,
      });

      // Salvar regras de categoria para estabelecimentos com categoria preenchida
      if (saveRulesChecked) {
        selectedRows.forEach((r) => {
          if (r.categoryId && (r.merchant || r.description)) {
            const pattern = r.merchant || r.description;
            if (pattern.length > 2) {
              saveRule(pattern, r.categoryId);
            }
          }
        });
      }

      setImportResult({
        inserted: res.inserted,
        failed: res.failed,
      });
      setStep('result');
      await onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao executar importação.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-2.5 sm:p-4">
      <div className="w-full max-w-4xl max-h-[94vh] bg-surface border border-hairline rounded-[12px] shadow-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-hairline flex items-center justify-between bg-paper/60">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-brand stroke-[1.5]" />
            <div>
              <h2 className="font-display font-medium text-base text-ink">
                Importar Extrato Bancário
              </h2>
              <span className="micro-label">
                {step === 'upload' && 'Passo 1: Selecionar Arquivo'}
                {step === 'mapping' && 'Passo 2: Mapear Colunas'}
                {step === 'review' && `Passo 3: Revisão (${reviewRows.length} linhas encontradas)`}
                {step === 'result' && 'Importação Concluída'}
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 text-ink-3 hover:text-ink rounded-[4px] transition-editorial cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-surface-2 border-b border-hairline flex items-center gap-2 text-xs text-danger">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-hairline hover:border-ink rounded-[12px] p-10 text-center space-y-3 cursor-pointer transition-editorial bg-paper/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.ofx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-full bg-surface-2 border border-hairline flex items-center justify-center mx-auto text-brand">
                  <UploadCloud className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <p className="font-display text-sm font-medium text-ink">
                    Arraste seu arquivo CSV ou OFX aqui
                  </p>
                  <p className="text-xs text-ink-3">
                    ou clique para selecionar do seu computador (Nubank, Itaú, Bradesco, Inter, BB, C6, etc.)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-paper border border-hairline rounded-[6px] space-y-1">
                  <span className="font-semibold text-ink">Formato CSV</span>
                  <p className="text-ink-3 text-[11px]">
                    Delimitadores vírgula ou ponto-e-vírgula com detecção inteligente de cabeçalhos.
                  </p>
                </div>
                <div className="p-3 bg-paper border border-hairline rounded-[6px] space-y-1">
                  <span className="font-semibold text-ink">Formato OFX</span>
                  <p className="text-ink-3 text-[11px]">
                    Extratos padronizados de bancos brasileiros com leitura de blocos STMTTRN.
                  </p>
                </div>
                <div className="p-3 bg-paper border border-hairline rounded-[6px] space-y-1">
                  <span className="font-semibold text-ink">Deduplicação Real</span>
                  <p className="text-ink-3 text-[11px]">
                    Linhas já existentes são identificadas para evitar lançamentos repetidos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MAPPING (CSV) */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <p className="text-xs text-ink-2">
                Confirme as colunas do seu arquivo <strong>{fileName}</strong> para correlacionar os campos:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block micro-label">Coluna de Data *</label>
                  <select
                    value={mapping.dateColumn || ''}
                    onChange={(e) => setMapping((prev) => ({ ...prev, dateColumn: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="">Selecione a coluna</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block micro-label">Coluna de Valor *</label>
                  <select
                    value={mapping.amountColumn || ''}
                    onChange={(e) => setMapping((prev) => ({ ...prev, amountColumn: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="">Selecione a coluna</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block micro-label">Coluna de Descrição</label>
                  <select
                    value={mapping.descriptionColumn || ''}
                    onChange={(e) => setMapping((prev) => ({ ...prev, descriptionColumn: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="">Selecione a coluna</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block micro-label">Coluna de Tipo (Opcional)</label>
                  <select
                    value={mapping.typeColumn || ''}
                    onChange={(e) => setMapping((prev) => ({ ...prev, typeColumn: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="">Automático pelo sinal</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block micro-label">Estabelecimento / Merchant (Opcional)</label>
                  <select
                    value={mapping.merchantColumn || ''}
                    onChange={(e) => setMapping((prev) => ({ ...prev, merchantColumn: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-paper border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="">Não mapear</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview de 5 linhas */}
              <div className="space-y-2">
                <span className="micro-label">Pré-visualização do Arquivo (Primeiras 5 Linhas)</span>
                <div className="bg-paper border border-hairline rounded-[8px] overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-hairline bg-surface-2 text-ink-3">
                        {csvHeaders.map((h) => (
                          <th key={h} className="py-2 px-3 font-semibold text-[10px] uppercase">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline font-mono text-[11px]">
                      {csvRawRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          {csvHeaders.map((h) => (
                            <td key={h} className="py-1.5 px-3 truncate max-w-xs">
                              {row[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-3 py-1.5 text-xs text-ink-2 hover:text-ink flex items-center gap-1 transition-editorial cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyMapping}
                  className="px-4 py-2 bg-brand hover:bg-brand/90 text-paper font-semibold text-xs rounded-[6px] shadow-sm flex items-center gap-1.5 transition-editorial cursor-pointer"
                >
                  <span>Continuar para Revisão</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW TABLE */}
          {step === 'review' && (
            <div className="space-y-4">
              
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-paper border border-hairline rounded-[8px]">
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className="flex items-center gap-1.5 font-medium text-ink hover:text-brand cursor-pointer"
                  >
                    {selectedRows.length === reviewRows.length ? (
                      <CheckSquare className="w-4 h-4 text-brand" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-3" />
                    )}
                    <span>{selectedRows.length} de {reviewRows.length} selecionadas</span>
                  </button>

                  {duplicateCount > 0 && (
                    <span className="px-2 py-0.5 bg-surface-2 border border-hairline rounded-[4px] text-ink-3 text-[11px]">
                      {duplicateCount} duplicadas ignoradas por padrão
                    </span>
                  )}
                </div>

                {/* Target Account Selector */}
                <div className="flex items-center gap-2">
                  <span className="micro-label">Conta Destino:</span>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="px-2.5 py-1.5 bg-surface border border-hairline rounded-[6px] text-xs text-ink focus:outline-none focus:border-ink"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.visibility === 'shared' ? 'Conjunta' : 'Privada'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-surface border border-hairline rounded-[8px] overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface-2 border-b border-hairline text-ink-3 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Data</th>
                      <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Descrição</th>
                      <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider">Categoria</th>
                      <th className="py-2.5 px-3 font-semibold uppercase text-[10px] tracking-wider text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {reviewRows.map((row) => (
                      <tr
                        key={row.index}
                        className={`h-12 hover:bg-surface-2 transition-editorial ${
                          !row.selected ? 'opacity-50 bg-paper/30' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => handleToggleRow(row.index)}
                            className="w-3.5 h-3.5 rounded-[3px] accent-brand cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-ink-3 text-[11px] whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="py-2 px-3 text-ink font-medium">
                          <div className="flex items-center gap-2">
                            <span>{row.description}</span>
                            {row.isDuplicate && (
                              <span className="px-1.5 py-0.2 bg-surface-2 border border-hairline rounded-[3px] text-[10px] text-ink-3 font-mono">
                                duplicada
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={row.categoryId || ''}
                              onChange={(e) => handleCategoryChange(row.index, e.target.value)}
                              className="px-2 py-1 bg-paper border border-hairline rounded-[4px] text-xs text-ink focus:outline-none focus:border-ink max-w-[160px]"
                            >
                              <option value="">Sem Categoria</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            {row.ruleMatched && (
                              <span title="Regra aplicada automaticamente">
                                <ShieldCheck className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-xs tnum whitespace-nowrap">
                          <span className={row.type === 'income' ? 'text-brand' : 'text-danger'}>
                            {row.type === 'income' ? '+' : '−'}
                            {formatCentsToBRL(row.amountCents)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Strip */}
              <div className="p-3 bg-paper border border-hairline rounded-[8px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 font-mono">
                  {totalExpenseCents > 0 && (
                    <div>
                      <span className="micro-label">Total Saídas:</span>
                      <span className="text-danger font-semibold ml-1.5">
                        −{formatCentsToBRL(totalExpenseCents)}
                      </span>
                    </div>
                  )}
                  {totalIncomeCents > 0 && (
                    <div>
                      <span className="micro-label">Total Entradas:</span>
                      <span className="text-brand font-semibold ml-1.5">
                        +{formatCentsToBRL(totalIncomeCents)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-ink-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveRulesChecked}
                      onChange={(e) => setSaveRulesChecked(e.target.checked)}
                      className="w-3.5 h-3.5 accent-brand rounded-[3px]"
                    />
                    <span>Salvar regras merchant → categoria para importações futuras</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-3 py-1.5 text-xs text-ink-2 hover:text-ink flex items-center gap-1 transition-editorial cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Escolher outro arquivo</span>
                </button>

                <button
                  type="button"
                  disabled={isImporting || selectedRows.length === 0}
                  onClick={handleExecuteImport}
                  className="px-5 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper font-semibold text-xs rounded-[6px] shadow-sm flex items-center gap-1.5 transition-editorial cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Importando {selectedRows.length} transações...</span>
                    </>
                  ) : (
                    <>
                      <span>Importar {selectedRows.length} Transações</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* STEP 4: RESULT */}
          {step === 'result' && importResult && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-surface-2 border border-hairline flex items-center justify-center mx-auto text-brand">
                <Check className="w-6 h-6 stroke-[2]" />
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-lg font-medium text-ink">
                  Importação Concluída com Sucesso
                </h3>
                <p className="text-xs text-ink-2">
                  <strong>{importResult.inserted}</strong> transações foram salvas e sincronizadas na sua base de dados.
                </p>
              </div>

              {importResult.failed.length > 0 && (
                <div className="text-left p-3 bg-surface-2 border border-hairline rounded-[8px] space-y-2 max-w-md mx-auto">
                  <span className="micro-label text-danger">Falhas na importação ({importResult.failed.length})</span>
                  <div className="font-mono text-[11px] text-danger space-y-1">
                    {importResult.failed.map((f, idx) => (
                      <div key={idx}>
                        • Linha {f.index + 1} ({f.description}): {f.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2 bg-brand hover:bg-brand/90 text-paper font-semibold text-xs rounded-[6px] shadow-sm transition-editorial cursor-pointer"
                >
                  Concluir e Ver Transações
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
