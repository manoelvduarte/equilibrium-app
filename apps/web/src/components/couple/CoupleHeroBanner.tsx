'use client';

import React from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { Heart, Star, Calendar, ArrowUpRight, Plane, ShieldCheck } from 'lucide-react';

interface CoupleHeroBannerProps {
  netWorthCents: number;
  goalsCount: number;
  savingsRate: number;
}

export function CoupleHeroBanner({
  netWorthCents,
  goalsCount,
  savingsRate,
}: CoupleHeroBannerProps) {
  // Cálculo do aniversário de namoro (07/09)
  const now = new Date();
  const currentYear = now.getFullYear();
  let nextAnniversary = new Date(currentYear, 8, 7); // Mês 8 é Setembro (0-indexed)
  if (now > nextAnniversary) {
    nextAnniversary = new Date(currentYear + 1, 8, 7);
  }
  const diffTime = nextAnniversary.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-surface via-surface to-surface-2 border border-hairline rounded-[16px] p-5 sm:p-7 shadow-xs">
      
      {/* Decorative subtle background watermark */}
      <div className="absolute -right-10 -bottom-10 opacity-[0.03] select-none pointer-events-none font-display text-9xl font-bold text-ink">
        07.09
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Left Column: Editorial Story & Anniversary Pill (Cols 1–7) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-brand/10 border border-brand/20 rounded-full text-brand font-mono text-[11px] font-semibold">
              <Heart className="w-3 h-3 fill-brand stroke-brand" />
              <span>Zero7Nove • Nosso Marco 07.09</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-surface-2 border border-hairline rounded-full text-ink-2 font-mono text-[11px]">
              <Calendar className="w-3 h-3 text-gold" />
              {diffDays === 0 ? (
                <span className="font-bold text-brand">🎉 Hoje é o nosso Aniversário!</span>
              ) : diffDays === 1 ? (
                <span>Amanhã é o nosso Aniversário! 🎉</span>
              ) : (
                <span>Aniversário de Namoro em {diffDays} dias</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink leading-tight">
              Construindo a nossa história e o nosso futuro.
            </h1>
            <p className="text-xs sm:text-sm text-ink-2 max-w-xl leading-relaxed">
              Gestão financeira compartilhada, transparente e focada na realização das nossas próximas viagens, sonhos e conquistas a dois.
            </p>
          </div>

          {/* Mini Highlights Strip */}
          <div className="grid grid-cols-3 gap-3 pt-2 max-w-md border-t border-hairline">
            <div>
              <span className="block micro-label text-[9px]">Patrimônio</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-ink tnum">
                {formatCentsToBRL(netWorthCents)}
              </span>
            </div>
            <div>
              <span className="block micro-label text-[9px]">Aporte do Mês</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-brand tnum">
                {savingsRate}% poupados
              </span>
            </div>
            <div>
              <span className="block micro-label text-[9px]">Metas Ativas</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-ink tnum">
                {goalsCount} objetivos
              </span>
            </div>
          </div>

        </div>

        {/* Right Column: Editorial Couple Polaroid Duo (Cols 8–12) */}
        <div className="lg:col-span-5 flex items-center justify-center lg:justify-end gap-3 sm:gap-4 pt-2 lg:pt-0">
          
          {/* Photo 1: Paris / Louvre */}
          <div className="relative group transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <div className="w-32 sm:w-40 bg-paper p-2 pb-5 border border-hairline rounded-[8px] shadow-sm">
              <div className="w-full aspect-[4/5] rounded-[4px] overflow-hidden bg-surface-2 border border-hairline/60">
                <img
                  src="/couple/couple-louvre.jpg"
                  alt="Paris"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <span className="font-display text-[10px] text-ink-2 text-center block mt-2 font-medium italic">
                Paris • Louvre
              </span>
            </div>
          </div>

          {/* Photo 2: Snow / Serra */}
          <div className="relative group transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <div className="w-32 sm:w-40 bg-paper p-2 pb-5 border border-hairline rounded-[8px] shadow-sm">
              <div className="w-full aspect-[4/5] rounded-[4px] overflow-hidden bg-surface-2 border border-hairline/60">
                <img
                  src="/couple/couple-snow.jpg"
                  alt="Viagem na Neve"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <span className="font-display text-[10px] text-ink-2 text-center block mt-2 font-medium italic">
                Nossas Conquistas
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
