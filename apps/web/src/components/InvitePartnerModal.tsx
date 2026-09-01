'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserPlus, Copy, Check, X, AlertCircle } from 'lucide-react';
import { Profile } from '@/hooks/useHouseholdData';

interface InvitePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: Profile | null;
}

export function InvitePartnerModal({ isOpen, onClose, userProfile }: InvitePartnerModalProps) {
  const [invitedEmail, setInvitedEmail] = useState('');
  const [tokenGenerated, setTokenGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const supabase = createClient();

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.household_id) return;

    setLoading(true);
    setError(null);

    try {
      const generatedToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

      const { error: insertError } = await supabase.from('invites').insert({
        household_id: userProfile.household_id,
        created_by: userProfile.id,
        email: invitedEmail || 'parceiro@equilibrium.app',
        token: generatedToken,
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) throw insertError;

      setTokenGenerated(generatedToken);
    } catch (err: any) {
      setError(err.message || 'Falha ao gerar convite.');
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = tokenGenerated
    ? `${window.location.origin}/convite/${tokenGenerated}`
    : '';

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <div className="w-full max-w-md bg-surface border border-hairline rounded-[12px] p-6 shadow-md space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-brand" />
            <h2 className="font-display font-medium text-lg text-ink">Convidar Parceiro</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-3 hover:text-ink rounded-[4px] transition-editorial"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-surface-2 border border-hairline rounded-[6px] flex items-center gap-2 text-xs text-danger">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {tokenGenerated ? (
          <div className="space-y-4">
            <p className="text-xs text-ink-2">
              Convite gerado com sucesso. Compartilhe o link abaixo com seu parceiro para que ele se cadastre diretamente no seu household:
            </p>

            <div className="p-3 bg-surface-2 border border-hairline rounded-[6px] space-y-2">
              <span className="micro-label">Link de Convite</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="w-full bg-paper border border-hairline rounded-[4px] px-2.5 py-1.5 text-xs font-mono text-ink select-all focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-brand hover:bg-brand/90 text-paper rounded-[4px] text-xs font-semibold flex items-center gap-1 transition-editorial cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setTokenGenerated(null);
                setInvitedEmail('');
                onClose();
              }}
              className="w-full py-2 bg-surface-2 hover:bg-hairline text-ink rounded-[6px] text-xs font-medium transition-editorial cursor-pointer"
            >
              Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={handleGenerateInvite} className="space-y-4">
            <p className="text-xs text-ink-2">
              Ao aceitar o convite, seu parceiro terá acesso compartilhado às contas conjuntas e visão consolidada do casal.
            </p>

            <div className="space-y-1">
              <label className="block micro-label">
                E-mail do parceiro (opcional)
              </label>
              <input
                type="email"
                value={invitedEmail}
                onChange={(e) => setInvitedEmail(e.target.value)}
                placeholder="parceiro@email.com"
                className="w-full px-3 py-2 bg-paper border border-hairline rounded-[6px] text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-ink-2 hover:text-ink transition-editorial"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper font-semibold text-xs rounded-[6px] shadow-sm transition-editorial cursor-pointer"
              >
                {loading ? 'Gerando...' : 'Gerar Link de Convite'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
