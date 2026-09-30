'use client';

import React, { useState } from 'react';
import { X, Heart, Coffee, ExternalLink, Copy, Check, Sparkles, ShieldCheck, Radio } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    setTimeout(() => {
      setCopiedAccount(null);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl glass-panel p-6 sm:p-7 border border-[#e5b45f]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-[#0c0e14]/95 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Background */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#e5b45f]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#e5b45f]/20 to-amber-500/10 border border-[#e5b45f]/30 text-[#e5b45f] shadow-lg shadow-[#e5b45f]/10">
              <Heart className="w-6 h-6 fill-current text-[#e5b45f]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Apoya a NEXO Radio</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#e5b45f]/15 border border-[#e5b45f]/30 text-[#e5b45f] text-[10px] font-bold">
                  Comunidad
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Mantén la radio sonando 24/7 sin comerciales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="my-5 space-y-4 overflow-y-auto pr-1">
          <p className="text-xs text-gray-300 leading-relaxed">
            <strong className="text-white">NEXO Radio</strong> es un proyecto sonoro independiente. 
            Tu aporte voluntario nos permite cubrir los costos de servidores de streaming en vivo de alta calidad, hosting y licencias musicales. ¡Cualquier ayuda marca una gran diferencia!
          </p>

          {/* Support Channels */}
          <div className="space-y-3 pt-1">
            {/* 1. PayPal */}
            <a
              href="https://paypal.me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#e5b45f]/40 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#00457C]/20 border border-[#0079C1]/30 flex items-center justify-center text-[#0079C1] font-bold text-sm shrink-0">
                  PP
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#e5b45f] transition-colors flex items-center gap-1.5">
                    <span>Donar con PayPal</span>
                    <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#e5b45f]" />
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Acepta tarjetas de crédito, débito y saldo internacional
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-white/5 group-hover:bg-[#e5b45f] group-hover:text-black text-xs font-semibold text-gray-300 transition-all">
                Aportar
              </span>
            </a>

            {/* 2. Buy Me a Coffee / Ko-fi */}
            <a
              href="https://ko-fi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#e5b45f]/40 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#e5b45f] transition-colors flex items-center gap-1.5">
                    <span>Invitarnos un Café</span>
                    <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#e5b45f]" />
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Donación rápida de $3 USD o el monto que elijas
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-white/5 group-hover:bg-[#e5b45f] group-hover:text-black text-xs font-semibold text-gray-300 transition-all">
                Invitar
              </span>
            </a>

            {/* 3. Transferencia Local (Nequi / Daviplata / Alias) */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#e5b45f]" />
                  <h4 className="text-xs font-bold text-white">Transferencia Local / Móvil</h4>
                </div>
                <span className="text-[10px] text-gray-500">Colombia & Latam</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="min-w-0 pr-2">
                  <p className="text-[10px] text-gray-400 font-medium">Nequi / Daviplata / Llave:</p>
                  <p className="text-xs font-mono font-bold text-[#e5b45f] truncate select-all">
                    nexoradio@apoyo.com
                  </p>
                </div>
                <button
                  onClick={() => handleCopy('nexoradio@apoyo.com', 'nequi')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-all shrink-0 active:scale-95"
                  title="Copiar al portapapeles"
                >
                  {copiedAccount === 'nequi' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-gray-300" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#e5b45f]" />
            ¡Gracias por formar parte de la familia NEXO!
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
