'use client';

import React, { useState } from 'react';
import { X, Music2, Heart, CheckCircle2 } from 'lucide-react';
import { radioStore } from '@/lib/radioStore';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RequestModal({ isOpen, onClose }: RequestModalProps) {
  const [name, setName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [dedication, setDedication] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !songTitle.trim() || !artist.trim()) return;

    setIsSubmitting(true);
    try {
      await radioStore.addRequest({
        name: name.trim(),
        song_title: songTitle.trim(),
        artist: artist.trim(),
        dedication: dedication.trim() || undefined,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setName('');
        setSongTitle('');
        setArtist('');
        setDedication('');
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity">
      <div className="relative w-full max-w-lg rounded-2xl glass-panel p-6 border border-[#e5b45f]/30 shadow-2xl overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#e5b45f]/20 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e5b45f]/15 flex items-center justify-center text-[#e5b45f]">
              <Music2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Pedir una canción</h3>
              <p className="text-xs text-gray-400">Envía tu dedicatoria a la cabina de NEXO Radio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-medium text-white mb-2">¡Solicitud recibida!</h4>
            <p className="text-sm text-gray-300 max-w-xs">
              Tu dedicatoria ha llegado a NEXO Studio. El locutor la revisará en breve.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Tu nombre o nickname <span className="text-[#e5b45f]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Sofía, Carlos, Alex..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#e5b45f] transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Canción <span className="text-[#e5b45f]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="Ej. Summer"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#e5b45f] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Artista <span className="text-[#e5b45f]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ej. Calvin Harris"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#e5b45f] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Dedicatoria o mensaje (opcional)
              </label>
              <textarea
                rows={3}
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                placeholder="Escribe un mensaje para que el locutor lo mencione en vivo..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#e5b45f] transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-black bg-[#e5b45f] hover:bg-[#f3c87a] transition-all transform active:scale-95 shadow-lg shadow-[#e5b45f]/25 disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
