'use client';

import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Music2,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  MessageCircle,
  Clock,
  Sparkles,
  Trash2
} from 'lucide-react';
import { radioStore } from '@/lib/radioStore';
import { SongRequest, Song } from '@/lib/types';

export default function StudioRequestsPage() {
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');

  useEffect(() => {
    loadData();
    const unsub = radioStore.subscribeToNewRequests(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const loadData = async () => {
    const reqs = await radioStore.getRequests();
    setRequests(reqs);
    const s = await radioStore.getSongs();
    setAllSongs(s);
  };

  const handleMarkReviewed = async (id: string) => {
    await radioStore.updateRequestStatus(id, 'reviewed');
  };

  const handleDiscard = async (id: string) => {
    await radioStore.updateRequestStatus(id, 'discarded');
  };

  const handleFindAndQueue = (req: SongRequest) => {
    const match = allSongs.find(
      (s) =>
        s.title.toLowerCase().includes(req.song_title.toLowerCase()) ||
        s.artist.toLowerCase().includes(req.artist.toLowerCase())
    );

    if (match) {
      radioStore.addToQueue(match);
      radioStore.updateRequestStatus(req.id, 'reviewed');
      alert(`¡Canción "${match.title}" encontrada y agregada a la cola!`);
    } else {
      alert(`La canción "${req.song_title}" de "${req.artist}" no está en la biblioteca. Puedes subirla desde la sección Biblioteca.`);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'reviewed') return r.status === 'reviewed';
    return r.status !== 'discarded';
  });

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-[1400px] w-full mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Solicitudes y dedicatorias</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Mensajes y pedidos de canciones enviados por los oyentes desde NEXO Radio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-[#e5b45f] text-black shadow-md shadow-[#e5b45f]/20'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'pending'
                ? 'bg-[#e5b45f] text-black'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter('reviewed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'reviewed'
                ? 'bg-[#e5b45f] text-black'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Revisadas
          </button>
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRequests.length === 0 ? (
          <div className="col-span-full py-20 text-center text-xs text-gray-500 rounded-3xl glass-panel border border-white/5">
            No hay solicitudes activas en esta categoría.
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className={`rounded-3xl glass-panel p-5 border flex flex-col justify-between space-y-4 transition-all ${
                req.status === 'pending'
                  ? 'border-[#e5b45f]/30 bg-[#e5b45f]/5 shadow-md shadow-[#e5b45f]/10'
                  : 'border-white/5 bg-white/5'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#e5b45f]/20 text-[#e5b45f] flex items-center justify-center text-xs font-bold">
                      {req.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{req.name}</h4>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      req.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {req.status === 'pending' ? 'Nueva' : 'Revisada'}
                  </span>
                </div>

                {/* Song info requested */}
                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Music2 className="w-3.5 h-3.5 text-[#e5b45f] shrink-0" />
                    <span className="truncate">{req.song_title}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 pl-5 truncate">{req.artist}</p>
                </div>

                {/* Dedication message */}
                {req.dedication && (
                  <div className="text-xs text-gray-300 italic bg-white/5 p-3 rounded-2xl border border-white/5">
                    "{req.dedication}"
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleFindAndQueue(req)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#e5b45f] text-black font-semibold text-xs hover:bg-[#f3c87a] transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir a la cola</span>
                </button>

                {req.status === 'pending' && (
                  <button
                    onClick={() => handleMarkReviewed(req.id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 transition-colors"
                    title="Marcar como revisada"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => handleDiscard(req.id)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors"
                  title="Descartar solicitud"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
