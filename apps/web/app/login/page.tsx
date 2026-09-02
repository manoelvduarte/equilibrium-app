'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Heart, ArrowRight, Mail, Lock, AlertCircle, Compass, Calendar } from 'lucide-react';

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
    <div className="min-h-screen bg-paper flex flex-col md:flex-row">
      
      {/* Left Column: Visual Editorial do Casal com Foto da Neve */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-7/12 min-h-screen bg-ink overflow-hidden items-end p-8 lg:p-12">
        
        {/* Foto de Fundo na Neve */}
        <img
          src="/couple/couple-snow.jpg"
          alt="Manoel e Giovana"
          className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105 transition-transform duration-1000"
        />

        {/* Gradiente de iluminação cinematográfica */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-ink/40" />

        {/* Card Editorial Flutuante */}
        <div className="relative z-10 max-w-lg p-6 bg-surface/90 backdrop-blur-md border border-hairline/30 rounded-[12px] shadow-lg text-ink space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-brand/15 text-brand rounded-full font-mono text-[10px] font-bold">
              <Heart className="w-3 h-3 fill-brand stroke-brand" />
              <span>Zero7Nove • Nosso Marco 07.09</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-ink-2 font-mono">
              <Compass className="w-3 h-3 text-gold" />
              <span>Nossas Conquistas & Viagens</span>
            </span>
          </div>

          <h2 className="font-display text-xl lg:text-2xl font-medium tracking-tight text-ink leading-snug">
            “Construindo juntos cada conquista, viagem e o nosso futuro a dois.”
          </h2>

          <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px] text-ink-3 font-mono">
            <span className="font-bold text-ink-2">Manoel & Giovana</span>
            <span>Desde 07/09</span>
          </div>
        </div>

      </div>

      {/* Right Column: Formulário de Autenticação */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-8 py-12 md:py-16">
        <div className="w-full max-w-[380px] space-y-6">
          
          {/* Brand Header */}
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-hairline rounded-[6px] text-ink font-bold text-sm shadow-xs">
              <Heart className="w-4 h-4 text-brand fill-brand/20 stroke-brand" />
              <div className="flex items-baseline gap-1">
                <span className="font-display tracking-tight font-semibold">Zero7Nove</span>
                <span className="font-mono text-[10px] text-ink-3">07•09</span>
              </div>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink">
              Nosso Espaço Financeiro
            </h1>
            <p className="text-xs text-ink-2 leading-relaxed">
              Gestão de contas, orçamentos, euros (€) e metas de <strong>Manoel & Giovana</strong>.
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
            <div className="p-5 bg-surface border border-hairline rounded-[10px] space-y-3 text-center shadow-xs">
              <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center mx-auto text-brand">
                <Mail className="w-4 h-4" />
              </div>
              <h2 className="font-display text-lg text-ink font-medium">Link de acesso enviado</h2>
              <p className="text-xs text-ink-2">
                Enviamos um link de autenticação para <strong className="text-ink">{email}</strong>. Verifique sua caixa de entrada.
              </p>
              <button
                onClick={() => setMagicLinkSent(false)}
                className="text-xs text-brand font-medium hover:underline pt-2 block mx-auto cursor-pointer"
              >
                Tentar com senha
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="bg-surface border border-hairline rounded-[12px] p-6 shadow-xs space-y-4">
              
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

              {/* Password Field */}
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
                  className="text-ink-2 hover:text-ink transition-editorial text-[11px] underline underline-offset-2 cursor-pointer"
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
          <div className="text-center md:text-left text-xs text-ink-2 space-y-2">
            <p>
              Não possui uma conta?{' '}
              <Link href="/registro" className="text-brand font-medium hover:underline">
                Criar conta ou aceitar convite
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
