'use client';

import React from 'react';
import { formatCentsToBRL } from '@equilibrium/ui';
import { Heart, Star, Calendar } from 'lucide-react';

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
    <div className="relative overflow-hidden max-w-full bg-gradient-to-br from-surface via-surface to-surface-2 border border-hairline rounded-[16px] p-4 sm:p-6 lg:p-7 shadow-xs">
      
      {/* Decorative subtle background watermark */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.03] select-none pointer-events-none font-display text-7xl sm:text-9xl font-bold text-ink overflow-hidden">
        07.09
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
        
        {/* Left Column: Editorial Story & Anniversary Pill (Cols 1–7) */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-4">
          
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-brand/10 border border-brand/20 rounded-full text-brand font-mono text-[10px] sm:text-[11px] font-semibold">
              <Heart className="w-3 h-3 fill-brand stroke-brand" />
              <span>Zero7Nove • Marco 07.09</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-surface-2 border border-hairline rounded-full text-ink-2 font-mono text-[10px] sm:text-[11px]">
              <Calendar className="w-3 h-3 text-gold" />
              {diffDays === 0 ? (
                <span className="font-bold text-brand">🎉 Hoje é o nosso Aniversário!</span>
              ) : diffDays === 1 ? (
                <span>Amanhã é o nosso Aniversário! 🎉</span>
              ) : (
                <span>Aniversário em {diffDays} dias</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-medium tracking-tight text-ink leading-tight">
              Manoel & Giovana
            </h1>
            <p className="text-xs sm:text-sm text-ink-2 max-w-xl leading-relaxed">
              Construindo juntos o nosso patrimônio, metas financeiras e as próximas viagens desde 07/09.
            </p>
          </div>

          {/* Mini Highlights Strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2 max-w-md border-t border-hairline">
            <div className="min-w-0">
              <span className="block micro-label text-[8px] sm:text-[9px] truncate">Patrimônio</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-ink tnum truncate block">
                {formatCentsToBRL(netWorthCents)}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block micro-label text-[8px] sm:text-[9px] truncate">Poupados</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-brand tnum truncate block">
                {savingsRate}% no mês
              </span>
            </div>
            <div className="min-w-0">
              <span className="block micro-label text-[8px] sm:text-[9px] truncate">Metas</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-ink tnum truncate block">
                {goalsCount} ativas
              </span>
            </div>
          </div>

        </div>

        {/* Right Column: Editorial Couple Polaroid Duo (Cols 8–12) */}
        <div className="lg:col-span-5 flex items-center justify-center lg:justify-end gap-2.5 sm:gap-4 pt-2 lg:pt-0 max-w-full overflow-hidden">
          
          {/* Photo 1: Paris / Louvre */}
          <div className="relative group transform -rotate-2 sm:-rotate-3 hover:rotate-0 transition-transform duration-300 shrink-0">
            <div className="w-28 xs:w-32 sm:w-36 bg-paper p-1.5 sm:p-2 pb-3.5 sm:pb-5 border border-hairline rounded-[8px] shadow-sm">
              <div className="w-full aspect-[4/5] rounded-[4px] overflow-hidden bg-surface-2 border border-hairline/60">
                <img
                  src="/couple/couple-louvre.jpg"
                  alt="Paris"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <span className="font-display text-[9px] sm:text-[10px] text-ink-2 text-center block mt-1.5 sm:mt-2 font-medium italic truncate">
                Paris • Louvre
              </span>
            </div>
          </div>

          {/* Photo 2: Snow / Serra */}
          <div className="relative group transform rotate-2 sm:rotate-3 hover:rotate-0 transition-transform duration-300 shrink-0">
            <div className="w-28 xs:w-32 sm:w-36 bg-paper p-1.5 sm:p-2 pb-3.5 sm:pb-5 border border-hairline rounded-[8px] shadow-sm">
              <div className="w-full aspect-[4/5] rounded-[4px] overflow-hidden bg-surface-2 border border-hairline/60">
                <img
                  src="/couple/couple-snow.jpg"
                  alt="Viagem na Neve"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <span className="font-display text-[9px] sm:text-[10px] text-ink-2 text-center block mt-1.5 sm:mt-2 font-medium italic truncate">
                Nossas Conquistas
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
