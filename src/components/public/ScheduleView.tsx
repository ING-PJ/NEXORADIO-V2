'use client';

import React from 'react';
import { Calendar, Clock, Radio, ChevronRight, Sparkles, User, X } from 'lucide-react';

export interface ScheduleItem {
  id: string;
  title: string;
  timeSlot: string;
  host: string;
  description: string;
  isCurrent?: boolean;
  coverUrl?: string;
  tags?: string[];
}

export const STATION_SCHEDULE: ScheduleItem[] = [
  {
    id: 'prog-1',
    title: 'El Despertador NEXO',
    timeSlot: '08:00 – 10:00',
    host: 'DJ Santi & Vale',
    description: 'Buena vibra, noticias del entretenimiento y los primeros éxitos para arrancar el día.',
    coverUrl: '/cover_default.webp',
    tags: ['Mañana', 'Éxitos', 'Variedad'],
  },
  {
    id: 'prog-2',
    title: 'NEXO Morning',
    timeSlot: '10:00 – 12:00',
    host: 'Equipo NEXO',
    description: 'Tu dosis de energía positiva, pop latino, tendencias virales e interacción en vivo.',
    isCurrent: true,
    coverUrl: '/cover_default.webp',
    tags: ['En vivo', 'Pop Latino', 'Tendencias'],
  },
  {
    id: 'prog-3',
    title: 'NEXO Hits',
    timeSlot: '12:00 – 14:00',
    host: 'DJ Carlos M.',
    description: 'El ranking de los números 1, los temas más pedidos por la comunidad y estrenos.',
    coverUrl: '/cover_default.webp',
    tags: ['Top 40', 'Pedidos', 'Estrenos'],
  },
  {
    id: 'prog-4',
    title: 'Tarde de Conexión',
    timeSlot: '14:00 – 17:00',
    host: 'Andrés V.',
    description: 'Sesión chill, reggaeton suave, afrobeat y la mejor compañía para tu jornada.',
    coverUrl: '/cover_default.webp',
    tags: ['Chill', 'Urbano', 'Afrobeat'],
  },
  {
    id: 'prog-5',
    title: 'Sunset Beats',
    timeSlot: '17:00 – 20:00',
    host: 'DJ Resident',
    description: 'Deep house, electrónica vocal y ritmos globales para acompañar el atardecer.',
    coverUrl: '/cover_default.webp',
    tags: ['House', 'Electro', 'Sunset'],
  },
  {
    id: 'prog-6',
    title: 'NEXO Club Sessions',
    timeSlot: '20:00 – 00:00',
    host: 'DJ Invitado Especial',
    description: 'Mezclas continuas en directo, cabina abierta y bangers para encender la noche.',
    coverUrl: '/cover_default.webp',
    tags: ['Club', 'En Vivo', 'Party'],
  },
];

interface ScheduleViewProps {
  onClose?: () => void;
  onSelectProgram?: (item: ScheduleItem) => void;
  hideHeader?: boolean;
}

export default function ScheduleView({ onClose, onSelectProgram, hideHeader = false }: ScheduleViewProps) {
  return (
    <div className="flex flex-col h-full bg-[#0a0c10]/95 backdrop-blur-xl text-white">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e5b45f]/15 border border-[#e5b45f]/30 flex items-center justify-center text-[#e5b45f]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">Programación</h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#e5b45f]/15 text-[#e5b45f] border border-[#e5b45f]/30 uppercase tracking-wider">
                  Hoy
                </span>
              </div>
              <p className="text-[11px] text-gray-400">Parrilla oficial de transmisión</p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Schedule Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
        {STATION_SCHEDULE.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectProgram?.(item)}
            className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden group ${
              item.isCurrent
                ? 'bg-[#e5b45f]/10 border-[#e5b45f]/40 shadow-lg shadow-[#e5b45f]/10 ring-1 ring-[#e5b45f]/30'
                : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/15'
            }`}
          >
            {item.isCurrent && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>AL AIRE</span>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-800 border border-white/10 relative">
                <img
                  src={item.coverUrl || '/cover_default.webp'}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {item.isCurrent && (
                  <div className="absolute inset-0 bg-[#e5b45f]/20 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-[#e5b45f] animate-pulse" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pr-12">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#e5b45f] mb-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{item.timeSlot}</span>
                </div>
                <h4 className="text-sm font-bold text-white truncate group-hover:text-[#e5b45f] transition-colors">
                  {item.title}
                </h4>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1.5">
                  <User className="w-3 h-3 text-gray-500" />
                  <span className="truncate">{item.host}</span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-gray-300 font-medium border border-white/5"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ScheduleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProgram?: (item: ScheduleItem) => void;
}

export function ScheduleDrawer({ isOpen, onClose, onSelectProgram }: ScheduleDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg h-[90dvh] max-h-[92dvh] sm:h-[640px] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col z-10 animate-in slide-in-from-bottom-5 duration-300">
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-2 sm:hidden shrink-0" />
        <ScheduleView onClose={onClose} onSelectProgram={onSelectProgram} />
      </div>
    </div>
  );
}
