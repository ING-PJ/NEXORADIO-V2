'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Play,
  Pause,
  Shuffle,
  Trash2,
  Edit2,
  Copy,
  Search,
  ListMusic,
  Clock,
  MoreVertical,
  X,
  Check
} from 'lucide-react';
import { radioStore } from '@/lib/radioStore';
import { audioEngine } from '@/lib/audioEngine';
import { Playlist, Song } from '@/lib/types';

export default function StudioPlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [searchPlaylist, setSearchPlaylist] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    const pls = await radioStore.getPlaylists();
    setPlaylists(pls);
    if (pls.length > 0 && !selectedPlaylist) {
      setSelectedPlaylist(pls[0]);
    } else if (selectedPlaylist) {
      const refreshed = pls.find((p) => p.id === selectedPlaylist.id);
      if (refreshed) setSelectedPlaylist(refreshed);
    }
    const s = await radioStore.getSongs();
    setAllSongs(s);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlayPlaylist = (shuffle: boolean = false) => {
    if (!selectedPlaylist?.songs || selectedPlaylist.songs.length === 0) return;
    let list = [...selectedPlaylist.songs];
    if (shuffle) {
      list = list.sort(() => Math.random() - 0.5);
    }
    audioEngine.playSong(list[0]);
    radioStore.setQueue(list.slice(1));
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const created = await radioStore.createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim());
    setSelectedPlaylist(created);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setIsNewModalOpen(false);
  };

  const handleRemoveSong = async (songId: string) => {
    if (!selectedPlaylist) return;
    await radioStore.removeSongFromPlaylist(selectedPlaylist.id, songId);
  };

  const handleAddSong = async (song: Song) => {
    if (!selectedPlaylist) return;
    await radioStore.addSongToPlaylist(selectedPlaylist.id, song);
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-[1600px] w-full mx-auto">
      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Playlists</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Crea, organiza y gestiona tus listas de reproducción.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchPlaylist}
              onChange={(e) => setSearchPlaylist(e.target.value)}
              placeholder="Buscar playlists..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b45f]"
            />
          </div>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#e5b45f] text-black font-semibold text-xs shadow-lg shadow-[#e5b45f]/25 hover:bg-[#f3c87a] transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva playlist</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3-COLUMN PLAYLIST WORKSPACE (Mockup 07) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PLAYLIST LIST */}
        <div className="lg:col-span-3 rounded-3xl glass-panel p-4 border border-white/5 space-y-3">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Mis playlists
            </span>
            <span className="text-[11px] text-gray-500">{playlists.length} playlists</span>
          </div>

          <div className="space-y-1.5 max-h-[650px] overflow-y-auto pr-1">
            {playlists.map((pl) => {
              const isSelected = selectedPlaylist?.id === pl.id;
              return (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylist(pl)}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#e5b45f]/15 border-[#e5b45f]/40 shadow-sm shadow-[#e5b45f]/20'
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/5">
                    <img
                      src={pl.cover_url || '/cover_default.webp'}
                      alt={pl.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/cover_default.webp';
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{pl.name}</h4>
                    <p className="text-[10px] text-gray-400">
                      {pl.songs ? pl.songs.length : pl.songs_count || 0} canciones
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER PLAYLIST DETAILS & TRACKLIST */}
        <div className="lg:col-span-6 rounded-3xl glass-panel p-6 border border-white/5 space-y-6">
          {selectedPlaylist ? (
            <>
              {/* Header Card */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-28 h-28 rounded-2xl overflow-hidden shrink-0 bg-neutral-900 shadow-xl border border-white/10">
                  <img
                    src={selectedPlaylist.cover_url || '/cover_default.webp'}
                    alt={selectedPlaylist.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/cover_default.webp';
                    }}
                  />
                </div>
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    {selectedPlaylist.name}
                  </h2>
                  <p className="text-xs text-gray-300">
                    {selectedPlaylist.description || 'Lista de reproducción curada para NEXO Radio.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-400 pt-1">
                    <span>
                      <strong className="text-white">
                        {selectedPlaylist.songs ? selectedPlaylist.songs.length : 0}
                      </strong>{' '}
                      canciones
                    </span>
                    <span>
                      <strong className="text-white">
                        {Math.floor((selectedPlaylist.duration_seconds || 1200) / 60)} min
                      </strong>{' '}
                      total
                    </span>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
                    <button
                      onClick={() => handlePlayPlaylist(false)}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#e5b45f] text-black font-semibold text-xs shadow-md shadow-[#e5b45f]/25 hover:bg-[#f3c87a] transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Reproducir</span>
                    </button>
                    <button
                      onClick={() => handlePlayPlaylist(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Orden aleatorio</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tracks List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400 px-3 pb-2 border-b border-white/5">
                  <span className="w-6">#</span>
                  <span className="flex-1">Título</span>
                  <span className="hidden sm:inline w-32">Artista</span>
                  <span className="w-16 text-right">Duración</span>
                  <span className="w-16 text-right">Acción</span>
                </div>

                {(!selectedPlaylist.songs || selectedPlaylist.songs.length === 0) ? (
                  <div className="py-12 text-center text-xs text-gray-500">
                    No hay canciones en esta playlist. Haz clic en "Agregar canciones".
                  </div>
                ) : (
                  selectedPlaylist.songs.map((song, idx) => (
                    <div
                      key={`${song.id}-${idx}`}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group text-xs"
                    >
                      <span className="w-6 font-mono text-gray-500">{idx + 1}</span>
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-neutral-800">
                          <img
                            src={song.cover_url || '/cover_default.webp'}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/cover_default.webp';
                            }}
                          />
                        </div>
                        <span className="font-semibold text-white truncate">{song.title}</span>
                      </div>
                      <span className="hidden sm:inline w-32 text-gray-400 truncate">{song.artist}</span>
                      <span className="w-16 text-right font-mono text-gray-400">
                        {formatTime(song.duration)}
                      </span>
                      <div className="w-16 text-right flex items-center justify-end gap-1">
                        <button
                          onClick={() => audioEngine.playSong(song)}
                          className="p-1 rounded-md bg-[#e5b45f] text-black hover:bg-[#f3c87a] opacity-80 group-hover:opacity-100 transition-all"
                          title="Reproducir pista"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                        <button
                          onClick={() => handleRemoveSong(song.id)}
                          className="p-1 text-gray-500 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-colors"
                          title="Quitar de playlist"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-gray-500">
              Selecciona una playlist para ver su contenido.
            </div>
          )}
        </div>

        {/* RIGHT PLAYLIST ACTIONS & NOW PLAYING */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Actions Card */}
          <div className="rounded-3xl glass-panel p-5 border border-white/5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Acciones de playlist
            </span>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => setIsAddSongModalOpen(true)}
                className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-all border border-white/5"
              >
                <Plus className="w-4 h-4 text-[#e5b45f]" />
                <span>Agregar canciones</span>
              </button>

              <button
                onClick={() => {
                  const newName = prompt('Nuevo nombre para la playlist:', selectedPlaylist?.name);
                  if (newName && selectedPlaylist) {
                    selectedPlaylist.name = newName;
                    setSelectedPlaylist({ ...selectedPlaylist });
                  }
                }}
                className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-all border border-white/5"
              >
                <Edit2 className="w-4 h-4 text-[#e5b45f]" />
                <span>Editar información</span>
              </button>

              <button
                onClick={async () => {
                  if (selectedPlaylist && confirm(`¿Eliminar la playlist "${selectedPlaylist.name}"?`)) {
                    const remaining = playlists.filter((p) => p.id !== selectedPlaylist.id);
                    setPlaylists(remaining);
                    setSelectedPlaylist(remaining[0] || null);
                  }
                }}
                className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 hover:bg-rose-500/10 text-xs font-semibold text-rose-400 transition-all border border-white/5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar playlist</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NEW PLAYLIST MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl glass-panel p-6 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Crear nueva playlist</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Nombre de la lista *</label>
                <input
                  type="text"
                  required
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Ej. Éxitos de la Noche"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b45f]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="Descripción para tu audiencia..."
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b45f] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e5b45f] text-black font-semibold text-xs hover:bg-[#f3c87a]"
                >
                  Crear playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SONG TO PLAYLIST MODAL */}
      {isAddSongModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl glass-panel p-6 border border-white/10 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">
                Agregar canciones a "{selectedPlaylist?.name}"
              </h3>
              <button onClick={() => setIsAddSongModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-4 pr-1">
              {allSongs.map((song) => {
                const isAlreadyIn = selectedPlaylist?.songs?.some((s) => s.id === song.id);
                return (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-neutral-800">
                        <img src={song.cover_url || '/cover_default.webp'} alt={song.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-white truncate">{song.title}</h4>
                        <p className="text-[11px] text-gray-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <button
                      disabled={isAlreadyIn}
                      onClick={() => handleAddSong(song)}
                      className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all ${
                        isAlreadyIn
                          ? 'bg-neutral-800 text-gray-500 cursor-default'
                          : 'bg-[#e5b45f] text-black hover:bg-[#f3c87a]'
                      }`}
                    >
                      {isAlreadyIn ? 'Ya agregada' : 'Agregar'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsAddSongModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
