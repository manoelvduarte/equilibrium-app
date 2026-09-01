'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Scale, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteTokenParam = searchParams.get('invite_token');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('Nosso Casa');
  const [inviteToken, setInviteToken] = useState(inviteTokenParam || '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (inviteTokenParam) {
      setInviteToken(inviteTokenParam);
    }
  }, [inviteTokenParam]);

  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            household_name: inviteToken ? undefined : householdName,
            invite_token: inviteToken || undefined,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data.session) {
        router.push('/');
        router.refresh();
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[380px] space-y-6">
      
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-surface border border-hairline rounded-[6px] text-ink font-bold text-sm shadow-sm">
          <Scale className="w-4 h-4 text-brand" />
          <span>Equilibrium</span>
        </div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
          {inviteToken ? 'Aceitar convite' : 'Criar conta'}
        </h1>
        <p className="text-xs text-ink-2">
          {inviteToken
            ? 'Conecte-se ao household do seu parceiro.'
            : 'Inicie a gestão financeira compartilhada do seu casal.'}
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-surface border border-hairline rounded-[6px] flex items-start gap-2.5 text-xs text-danger">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success / Email Verification */}
      {success ? (
        <div className="p-5 bg-surface border border-hairline rounded-[6px] space-y-3 text-center">
          <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center mx-auto text-brand">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h2 className="font-display text-lg text-ink font-medium">Conta criada com sucesso</h2>
          <p className="text-xs text-ink-2">
            Enviamos uma confirmação para <strong className="text-ink">{email}</strong>. Confirme seu e-mail para acessar o household.
          </p>
          <Link
            href="/login"
            className="text-xs text-brand font-medium hover:underline pt-2 block mx-auto"
          >
            Ir para o Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleRegister} className="bg-surface border border-hairline rounded-[12px] p-6 shadow-sm space-y-3.5">
          
          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Seu Nome Completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Alex Silva"
              className="w-full px-3 py-2 bg-paper border border-hairline rounded-[6px] text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@email.com"
              className="w-full px-3 py-2 bg-paper border border-hairline rounded-[6px] text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Senha de Acesso
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 bg-paper border border-hairline rounded-[6px] text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial font-mono"
            />
          </div>

          {/* Household Name OR Invite Token */}
          {inviteToken ? (
            <div className="space-y-1 p-2.5 bg-surface-2 border border-hairline rounded-[6px]">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                Token do Convite
              </span>
              <span className="text-xs font-mono font-medium text-brand">{inviteToken}</span>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                Nome do Household (Casal)
              </label>
              <input
                type="text"
                required
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Ex: Nosso Casa"
                className="w-full px-3 py-2 bg-paper border border-hairline rounded-[6px] text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper font-semibold text-xs rounded-[6px] shadow-sm flex items-center justify-center gap-2 transition-editorial cursor-pointer"
          >
            <span>{loading ? 'Cadastrando...' : inviteToken ? 'Aceitar e Entrar' : 'Criar Household'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

        </form>
      )}

      {/* Footer Navigation */}
      <div className="text-center text-xs text-ink-2 space-y-2">
        <p>
          Já possui uma conta?{' '}
          <Link href="/login" className="text-brand font-medium hover:underline">
            Fazer login
          </Link>
        </p>
      </div>

    </div>
  );
}

export default function RegistroPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center items-center px-4 py-12">
      <Suspense fallback={<div className="text-xs text-ink-3">Carregando formulário...</div>}>
        <RegistroForm />
      </Suspense>
    </div>
  );
}
