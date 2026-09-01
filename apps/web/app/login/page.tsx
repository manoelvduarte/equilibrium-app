'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Scale, ArrowRight, Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMagicLinkSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-[380px] space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-surface border border-hairline rounded-[6px] text-ink font-bold text-sm shadow-sm">
            <Scale className="w-4 h-4 text-brand" />
            <span>Equilibrium</span>
          </div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
            Acessar conta
          </h1>
          <p className="text-xs text-ink-2">
            Gestão financeira compartilhada com privacidade e inteligência.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-surface border border-hairline rounded-[6px] flex items-start gap-2.5 text-xs text-danger">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Magic Link Feedback */}
        {magicLinkSent ? (
          <div className="p-5 bg-surface border border-hairline rounded-[6px] space-y-3 text-center">
            <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center mx-auto text-brand">
              <Mail className="w-4 h-4" />
            </div>
            <h2 className="font-display text-lg text-ink font-medium">Link de acesso enviado</h2>
            <p className="text-xs text-ink-2">
              Enviamos um link de autenticação para <strong className="text-ink">{email}</strong>. Verifique sua caixa de entrada.
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="text-xs text-brand font-medium hover:underline pt-2 block mx-auto"
            >
              Tentar com senha
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="bg-surface border border-hairline rounded-[12px] p-6 shadow-sm space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@email.com"
                className="w-full px-3 py-2 bg-paper border border-hairline rounded-[6px] text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial"
              />
            </div>

            {/* Password Field (when not magic link) */}
            {!isMagicLink && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    Senha
                  </label>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-paper border border-hairline rounded-[6px] text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-editorial font-mono"
                />
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex justify-between items-center pt-1 text-xs">
              <button
                type="button"
                onClick={() => setIsMagicLink(!isMagicLink)}
                className="text-ink-2 hover:text-ink transition-editorial text-[11px] underline underline-offset-2"
              >
                {isMagicLink ? 'Entrar com senha' : 'Usar Magic Link por e-mail'}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-brand hover:bg-brand/90 disabled:opacity-50 text-paper font-semibold text-xs rounded-[6px] shadow-sm flex items-center justify-center gap-2 transition-editorial cursor-pointer"
            >
              <span>{loading ? 'Entrando...' : isMagicLink ? 'Enviar Magic Link' : 'Entrar na conta'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

          </form>
        )}

        {/* Footer Navigation */}
        <div className="text-center text-xs text-ink-2 space-y-2">
          <p>
            Não possui uma conta?{' '}
            <Link href="/registro" className="text-brand font-medium hover:underline">
              Criar conta ou aceitar convite
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
