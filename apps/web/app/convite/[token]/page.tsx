import React from 'react';
import Link from 'next/link';
import { Scale, Users, ArrowRight } from 'lucide-react';

interface ConvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function ConvitePage({ params }: ConvitePageProps) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-[380px] space-y-6 text-center">
        
        {/* Brand */}
        <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-surface border border-hairline rounded-[6px] text-ink font-bold text-sm shadow-sm">
          <Scale className="w-4 h-4 text-brand" />
          <span>Equilibrium</span>
        </div>

        {/* Invite Card */}
        <div className="bg-surface border border-hairline rounded-[12px] p-6 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-surface-2 border border-hairline flex items-center justify-center mx-auto text-brand">
            <Users className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
              Convite de Parceria
            </h1>
            <p className="text-xs text-ink-2">
              Você foi convidado para gerenciar as finanças conjuntas de um household no Equilibrium.
            </p>
          </div>

          <div className="p-3 bg-surface-2 border border-hairline rounded-[6px] text-left">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Token de Ativação
            </span>
            <span className="font-mono text-xs text-ink font-semibold break-all">{token}</span>
          </div>

          <Link
            href={`/registro?invite_token=${encodeURIComponent(token)}`}
            className="w-full py-2.5 px-4 bg-brand hover:bg-brand/90 text-paper font-semibold text-xs rounded-[6px] shadow-sm flex items-center justify-center gap-2 transition-editorial"
          >
            <span>Aceitar Convite e Criar Conta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="text-xs text-ink-2">
          Já possui login no sistema?{' '}
          <Link href="/login" className="text-brand font-medium hover:underline">
            Acessar conta
          </Link>
        </p>

      </div>
    </div>
  );
}
