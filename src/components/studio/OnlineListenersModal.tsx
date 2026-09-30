'use client';

import React from 'react';
import { X, Users, Radio, Sparkles, MessageSquare, Clock } from 'lucide-react';
import { OnlineListener } from '@/lib/types';

interface OnlineListenersModalProps {
  isOpen: boolean;
  onClose: () => void;
  listeners: OnlineListener[];
  onGreetListener?: (userName: string) => void;
}

export function OnlineListenersModal({
  isOpen,
  onClose,
  listeners,
  onGreetListener,
}: OnlineListenersModalProps) {
  if (!isOpen) return null;

  const formatJoined = (isoString?: string) => {
    if (!isoString) return 'En línea';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins <= 0) return 'Recién conectado';
      if (mins === 1) return 'Hace 1 minuto';
      if (mins < 60) return `Hace ${mins} minutos`;
      const hrs = Math.floor(mins / 60);
      return `Hace ${hrs} h`;
    } catch {
      return 'En línea';
    }
  };

  const getInitials = (name: string) => {
    const clean = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    if (!clean) return 'OY';
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl glass-panel p-6 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] bg-[#0c0e14]/95 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#e5b45f]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#e5b45f]/10 border border-[#e5b45f]/20 text-[#e5b45f]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Oyentes en Vivo</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {listeners.length} {listeners.length === 1 ? 'conectado' : 'conectados'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Personas sintonizando la señal de NEXO Radio ahora
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

        {/* Listeners List */}
        <div className="my-4 overflow-y-auto space-y-2 pr-1 flex-1">
          {listeners.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              No hay oyentes conectados en este momento.
            </div>
          ) : (
            listeners.map((listener, idx) => (
              <div
                key={`${listener.user_id}-${idx}`}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-neutral-800 to-neutral-700 border border-white/10 flex items-center justify-center text-xs font-bold text-[#e5b45f] shadow-sm">
                      {getInitials(listener.user_name)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0c0e14]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-white truncate">
                        {listener.user_name}
                      </p>
                      {listener.is_dj ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#e5b45f]/20 text-[#e5b45f] border border-[#e5b45f]/30">
                          Cabina DJ
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-gray-400">
                          Oyente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span>{formatJoined(listener.joined_at)}</span>
                    </div>
                  </div>
                </div>

                {onGreetListener && !listener.is_dj && (
                  <button
                    onClick={() => {
                      onGreetListener(listener.user_name);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#e5b45f]/10 hover:bg-[#e5b45f]/20 text-[#e5b45f] border border-[#e5b45f]/20 text-[11px] font-semibold transition-all shrink-0 ml-2 group-hover:scale-105"
                    title="Mandar un saludo en el chat"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Saludar</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#e5b45f]" />
            Sincronizado vía Supabase Realtime
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
