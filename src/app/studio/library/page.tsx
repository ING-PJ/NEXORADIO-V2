'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Heart,
  Play,
  Pause,
  UploadCloud,
  X,
  CheckCircle2,
  FolderPlus,
  SlidersHorizontal,
  ChevronDown,
  Download,
  Share2,
  Edit,
  Music2
} from 'lucide-react';
import { radioStore } from '@/lib/radioStore';
import { audioEngine } from '@/lib/audioEngine';
import { Song, Playlist } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function StudioLibraryPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [filterTab, setFilterTab] = useState<'todas' | 'recientes' | 'favoritas' | 'mas_escuchadas'>('todas');
  const [genreFilter, setGenreFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [selectedSongDetails, setSelectedSongDetails] = useState<Song | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadAlbum, setUploadAlbum] = useState('');
  const [uploadGenre, setUploadGenre] = useState('Pop');
  const [uploadYear, setUploadYear] = useState('2024');
  const [uploadFavorite, setUploadFavorite] = useState(false);
  const [uploadCoverUrl, setUploadCoverUrl] = useState('/cover_default.webp');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDuration, setUploadDuration] = useState(210);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Storage synchronization with Supabase
  const [showStorageTooltip, setShowStorageTooltip] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    usedBytes: number;
    totalLimitBytes: number;
    filesCount: number;
    isSupabase: boolean;
  } | null>(null);

  const totalUsedBytes = storageInfo ? storageInfo.usedBytes : 268591586;
  const totalLimitBytes = storageInfo ? storageInfo.totalLimitBytes : 1024 * 1024 * 1024;
  const isSupabaseStorage = storageInfo ? storageInfo.isSupabase : true;
  const filesInBucket = storageInfo ? storageInfo.filesCount : songs.length;

  const formattedUsed = React.useMemo(() => {
    if (totalUsedBytes <= 0) return '0 MB';
    const gb = totalUsedBytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = totalUsedBytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }, [totalUsedBytes]);

  const formattedLimit = React.useMemo(() => {
    const gb = totalLimitBytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(0)} GB`;
    const mb = totalLimitBytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  }, [totalLimitBytes]);

  const formattedAvailable = React.useMemo(() => {
    const left = Math.max(totalLimitBytes - totalUsedBytes, 0);
    const gb = left / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = left / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }, [totalLimitBytes, totalUsedBytes]);

  const storagePercentage = React.useMemo(() => {
    const pct = (totalUsedBytes / totalLimitBytes) * 100;
    return Math.min(Math.max(pct, totalUsedBytes > 0 ? 1.5 : 0), 100);
  }, [totalUsedBytes, totalLimitBytes]);

  const genericSongsCount = React.useMemo(() => {
    return songs.filter((s) => radioStore.isGenericSong(s)).length;
  }, [songs]);

  useEffect(() => {
    loadData();
    const unsub = radioStore.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const loadData = async (forceRefresh = false) => {
    const s = await radioStore.getSongs(forceRefresh);
    setSongs(s);
    setSelectedSongDetails((prev) => {
      if (prev && s.some((song) => song.id === prev.id)) {
        return s.find((song) => song.id === prev.id) || null;
      }
      return s.length > 0 ? s[0] : null;
    });
    const p = await radioStore.getPlaylists(forceRefresh);
    setPlaylists(p);
    try {
      const storage = await radioStore.getStorageUsage();
      setStorageInfo(storage);
    } catch (e) {
      console.warn('Could not fetch storage usage:', e);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlay = (song: Song) => {
    audioEngine.playSong(song);
    setSelectedSongDetails(song);
  };

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await radioStore.toggleFavorite(id);
  };

  const handleDeleteSong = async (song: Song, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm(`¿Eliminar la canción "${song.title}" de ${song.artist}?`)) {
      // Optimistic update
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      setSelectedSongIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
      if (selectedSongDetails?.id === song.id) {
        setSelectedSongDetails(null);
      }
      await radioStore.deleteSong(song.id);
      await loadData(true);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSongIds.size === 0) return;
    if (confirm(`¿Eliminar ${selectedSongIds.size} canción(es) seleccionada(s)?`)) {
      const idsToDelete = Array.from(selectedSongIds);
      // Optimistic update
      setSongs((prev) => prev.filter((s) => !selectedSongIds.has(s.id)));
      if (selectedSongDetails && selectedSongIds.has(selectedSongDetails.id)) {
        setSelectedSongDetails(null);
      }
      setSelectedSongIds(new Set());
      for (const id of idsToDelete) {
        await radioStore.deleteSong(id);
      }
      await loadData(true);
    }
  };

  const handleDeleteGenericSongs = async () => {
    const genericCount = songs.filter((s) => radioStore.isGenericSong(s)).length;
    if (genericCount === 0) {
      alert('No se encontraron canciones genéricas de prueba en la biblioteca.');
      return;
    }
    if (
      confirm(
        `¿Eliminar las ${genericCount} canciones genéricas/demo del programa (Summer Vibes, Flowers, etc.)?\n\nTu biblioteca quedará limpia y libre para alojar únicamente tu música.`
      )
    ) {
      // Optimistic filter
      setSongs((prev) => prev.filter((s) => !radioStore.isGenericSong(s)));
      setSelectedSongIds(new Set());
      setSelectedSongDetails(null);
      await radioStore.deleteGenericSongs();
      await loadData(true);
    }
  };

  // Upload Handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setUploadFile(f);
      setUploadError(null);

      // Extract duration from audio file metadata
      try {
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(f);
        audio.src = objectUrl;
        audio.onloadedmetadata = () => {
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            setUploadDuration(Math.round(audio.duration));
          }
          URL.revokeObjectURL(objectUrl);
        };
      } catch (err) {
        console.warn('Could not read audio duration:', err);
      }

      // Auto-populate title & artist from filename if formatted like "Artist - Title.mp3"
      const nameWithoutExt = f.name.replace(/\.[^/.]+$/, '');
      if (nameWithoutExt.includes(' - ')) {
        const parts = nameWithoutExt.split(' - ');
        setUploadArtist(parts[0].trim());
        setUploadTitle(parts[1].trim());
      } else {
        setUploadTitle(nameWithoutExt);
      }
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setUploadCoverUrl(previewUrl);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !uploadTitle) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(20);

    let audioUrl = '';

    if (uploadFile) {
      // Step 1: Try Supabase Storage
      if (isSupabaseConfigured && supabase) {
        try {
          setUploadProgress(35);
          const fileExt = uploadFile.name.split('.').pop() || 'mp3';
          const filePath = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { data, error } = await supabase.storage.from('songs').upload(filePath, uploadFile);
          if (!error && data) {
            const { data: publicData } = supabase.storage.from('songs').getPublicUrl(filePath);
            if (publicData?.publicUrl) {
              audioUrl = publicData.publicUrl;
            }
          } else if (error) {
            console.warn('Supabase storage upload notice:', error.message);
          }
        } catch (err) {
          console.warn('Supabase storage upload exception:', err);
        }
      }

      // Step 2: Try Render Bridge Server upload if Supabase storage is unavailable
      if (!audioUrl) {
        try {
          setUploadProgress(55);
          const bridgeBase = process.env.NEXT_PUBLIC_STREAM_URL
            ? process.env.NEXT_PUBLIC_STREAM_URL.replace(/\/live.*$/, '')
            : 'https://nexo-radio-bridge.onrender.com';
          const res = await fetch(`${bridgeBase}/upload?name=${encodeURIComponent(uploadFile.name)}`, {
            method: 'POST',
            body: uploadFile,
            headers: {
              'Content-Type': uploadFile.type || 'audio/mpeg',
            },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.url) {
              audioUrl = json.url;
            }
          }
        } catch (err) {
          console.warn('Bridge server upload exception:', err);
        }
      }

      // Step 3: Local fallback
      if (!audioUrl) {
        setUploadProgress(75);
        audioUrl = URL.createObjectURL(uploadFile);
      }
    } else {
      audioUrl = '/songs/summer.mp3';
    }

    setUploadProgress(85);

    try {
      const added = await radioStore.addSong({
        title: uploadTitle || 'Nueva Canción',
        artist: uploadArtist || 'Artista Desconocido',
        album: uploadAlbum || undefined,
        genre: uploadGenre,
        duration: uploadDuration || 210,
        file_url: audioUrl,
        cover_url: uploadCoverUrl || '/cover_default.webp',
        file_size: uploadFile?.size || 4500000,
        is_favorite: uploadFavorite,
      });

      setUploadProgress(100);
      await loadData();
      setSelectedSongDetails(added);

      setTimeout(() => {
        setIsUploading(false);
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadArtist('');
        setUploadAlbum('');
        setUploadProgress(0);
      }, 500);
    } catch (err: any) {
      console.error('Error saving song to store:', err);
      setUploadError(err?.message || 'Error al guardar la canción.');
      setIsUploading(false);
    }
  };

  // Filter songs
  const filteredSongs = songs
    .filter((s) => {
      if (filterTab === 'favoritas' && !s.is_favorite) return false;
      if (filterTab === 'mas_escuchadas' && (s.play_count || 0) < 1000) return false;
      if (genreFilter !== 'todos' && s.genre.toLowerCase() !== genreFilter.toLowerCase()) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.album && s.album.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-[1600px] w-full mx-auto">
      {/* ========================================================= */}
      {/* HEADER WITH STORAGE BAR & UPLOAD CTA */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Biblioteca musical</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Gestiona todas tus canciones, organiza y crea playlists.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Dynamic Storage Meter Synchronized with Supabase */}
          <div
            className="relative flex items-center gap-3 px-3.5 sm:px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 transition-all cursor-pointer group"
            onClick={() => setShowStorageTooltip((prev) => !prev)}
            onMouseEnter={() => setShowStorageTooltip(true)}
            onMouseLeave={() => setShowStorageTooltip(false)}
            title="Ver detalles de almacenamiento de Supabase"
          >
            <UploadCloud className="w-4 h-4 text-[#e5b45f] flex-shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white tracking-wide">
                  {formattedUsed} de {formattedLimit} usados
                </span>
                {isSupabaseStorage && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 uppercase tracking-wider">
                    Supabase
                  </span>
                )}
              </div>
              <div className="w-24 sm:w-28 h-1.5 bg-neutral-800 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#d9a149] via-[#e5b45f] to-[#f3c87a] rounded-full transition-all duration-500"
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>
            </div>

            {/* Storage Info Popover */}
            {showStorageTooltip && (
              <div className="absolute top-full mt-2 right-0 sm:left-1/2 sm:-translate-x-1/2 w-64 p-3.5 rounded-2xl bg-[#12141a]/95 backdrop-blur-xl border border-white/15 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                      Almacenamiento
                    </span>
                    {isSupabaseStorage && (
                      <span className="text-[9px] px-1 rounded bg-[#3ecf8e]/20 text-[#3ecf8e] font-semibold">
                        Bucket songs
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[#e5b45f] font-semibold">
                    {storagePercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-gray-300">
                    <span>Espacio ocupado:</span>
                    <span className="font-semibold text-white">{formattedUsed}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Espacio libre:</span>
                    <span className="font-semibold text-emerald-400">{formattedAvailable}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Archivos en bucket:</span>
                    <span className="font-semibold text-white">{filesInBucket} pistas</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Cuota de almacenamiento:</span>
                    <span className="font-semibold text-gray-400">{formattedLimit}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {genericSongsCount > 0 && (
            <button
              onClick={handleDeleteGenericSongs}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-xs shadow-lg transition-all transform active:scale-95"
              title="Eliminar todas las canciones genéricas de muestra del programa"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Quitar pistas demo ({genericSongsCount})</span>
            </button>
          )}

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#e5b45f] text-black font-semibold text-xs shadow-lg shadow-[#e5b45f]/25 hover:bg-[#f3c87a] transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Subir música</span>
          </button>
        </div>
      </div>

      {/* Generic Demo Songs Alert Banner */}
      {genericSongsCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs text-amber-200">
            <Music2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Tienes <strong>{genericSongsCount}</strong> canciones genéricas de muestra en tu biblioteca. ¿Deseas quitarlas para dejar solo tu música?
            </span>
          </div>
          <button
            onClick={handleDeleteGenericSongs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-rose-500/20 text-amber-300 hover:text-rose-300 border border-amber-500/40 hover:border-rose-500/40 font-bold text-xs transition-all shadow-sm shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Quitar canciones demo ahora</span>
          </button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterTab('todas')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterTab === 'todas'
                ? 'bg-[#e5b45f] text-black shadow-md shadow-[#e5b45f]/20'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Todas las canciones
          </button>
          <button
            onClick={() => setFilterTab('recientes')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterTab === 'recientes'
                ? 'bg-[#e5b45f] text-black'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Recientes
          </button>
          <button
            onClick={() => setFilterTab('favoritas')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterTab === 'favoritas'
                ? 'bg-[#e5b45f] text-black'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Favoritas
          </button>
          <button
            onClick={() => setFilterTab('mas_escuchadas')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterTab === 'mas_escuchadas'
                ? 'bg-[#e5b45f] text-black'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Más escuchadas
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar canciones, artistas o álbumes..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b45f]"
            />
          </div>

          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 focus:outline-none focus:border-[#e5b45f]"
          >
            <option value="todos" className="bg-neutral-900">Todos los géneros</option>
            <option value="pop" className="bg-neutral-900">Pop</option>
            <option value="electrónica" className="bg-neutral-900">Electrónica</option>
            <option value="afrobeat" className="bg-neutral-900">Afrobeat</option>
            <option value="urbano" className="bg-neutral-900">Urbano</option>
          </select>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN TABLE & RIGHT DETAILS PANEL */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* SONGS TABLE */}
        <div className="xl:col-span-8 rounded-3xl glass-panel p-4 border border-white/5 overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 border-b border-white/5 pb-2">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedSongIds.size === filteredSongs.length && filteredSongs.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSongIds(new Set(filteredSongs.map((s) => s.id)));
                        } else {
                          setSelectedSongIds(new Set());
                        }
                      }}
                      className="rounded bg-black/40 border-white/20 text-[#e5b45f] focus:ring-0"
                    />
                  </th>
                  <th className="py-2.5 px-3">Título</th>
                  <th className="py-2.5 px-3">Artista</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Álbum</th>
                  <th className="py-2.5 px-3">Género</th>
                  <th className="py-2.5 px-3">Duración</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSongs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No se encontraron canciones en esta sección.
                    </td>
                  </tr>
                ) : (
                  filteredSongs.map((song) => {
                    const isSelected = selectedSongIds.has(song.id);
                    const isCurrent = selectedSongDetails?.id === song.id;

                    return (
                      <tr
                        key={song.id}
                        onClick={() => setSelectedSongDetails(song)}
                        className={`hover:bg-white/5 transition-colors cursor-pointer ${
                          isCurrent ? 'bg-[#e5b45f]/10' : ''
                        }`}
                      >
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const next = new Set(selectedSongIds);
                              if (e.target.checked) next.add(song.id);
                              else next.delete(song.id);
                              setSelectedSongIds(next);
                            }}
                            className="rounded bg-black/40 border-white/20 text-[#e5b45f] focus:ring-0"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/5">
                              <img
                                src={song.cover_url || '/cover_default.webp'}
                                alt={song.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/cover_default.webp';
                                }}
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white truncate max-w-[220px]" title={song.title}>
                                  {song.title}
                                </span>
                                {radioStore.isGenericSong(song) ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0" title="Canción genérica de prueba">
                                    DEMO
                                  </span>
                                ) : (
                                  (!song.id.startsWith('song-') || (song.created_at && (Date.now() - new Date(song.created_at).getTime() < 86400000))) && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#e5b45f]/20 text-[#e5b45f] border border-[#e5b45f]/40 shrink-0">
                                      NUEVA
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-gray-300 font-medium truncate max-w-[220px]" title={song.artist}>{song.artist}</td>
                        <td className="py-3 px-3 text-gray-400 hidden md:table-cell">{song.album || '—'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] text-gray-300 font-medium">
                            {song.genre}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-400 font-mono">{formatTime(song.duration)}</td>
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handlePlay(song)}
                              className="p-1.5 rounded-lg bg-[#e5b45f] text-black hover:bg-[#f3c87a] transition-all"
                              title="Reproducir"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              onClick={(e) => handleToggleFavorite(song.id, e)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                song.is_favorite ? 'text-rose-500' : 'text-gray-400 hover:text-white'
                              }`}
                              title="Favorita"
                            >
                              <Heart className={`w-3.5 h-3.5 ${song.is_favorite ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={() => radioStore.addToQueue(song)}
                              className="p-1.5 rounded-lg bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
                              title="Agregar a la cola"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSong(song, e)}
                              className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
                              title="Eliminar canción de la biblioteca"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Batch Footer */}
          {selectedSongIds.size > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs animate-in fade-in">
              <span className="text-gray-300">
                <strong>{selectedSongIds.size}</strong> canciones seleccionadas
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SONG DETAILS PANEL (Mockup 05) */}
        <div className="xl:col-span-4 rounded-3xl glass-panel p-6 border border-white/5 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Información de la canción
            </span>
          </div>

          {selectedSongDetails ? (
            <div className="space-y-5">
              <div className="w-full aspect-square max-w-[200px] mx-auto rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-xl">
                <img
                  src={selectedSongDetails.cover_url || '/cover_default.webp'}
                  alt={selectedSongDetails.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/cover_default.webp';
                  }}
                />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-bold text-white truncate">{selectedSongDetails.title}</h3>
                <p className="text-sm font-medium text-[#e5b45f] truncate">{selectedSongDetails.artist}</p>
              </div>

              <div className="space-y-2 text-xs divide-y divide-white/5 pt-2">
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-400">Álbum</span>
                  <span className="text-white font-medium">{selectedSongDetails.album || 'Summer Single'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-400">Género</span>
                  <span className="text-white font-medium">{selectedSongDetails.genre}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-400">Duración</span>
                  <span className="text-white font-mono">{formatTime(selectedSongDetails.duration)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-400">Tamaño</span>
                  <span className="text-white font-mono">
                    {((selectedSongDetails.file_size || 5800000) / 1048576).toFixed(1)} MB
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-400">Reproducciones</span>
                  <span className="text-white font-mono">{selectedSongDetails.play_count || 0}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => handlePlay(selectedSongDetails)}
                  className="w-full py-2.5 rounded-xl bg-[#e5b45f] text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#f3c87a] transition-all shadow-md"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reproducir pista</span>
                </button>
                <button
                  onClick={() => handleDeleteSong(selectedSongDetails)}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 border border-rose-500/20 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar de biblioteca</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-gray-500">
              Selecciona una canción para ver sus detalles.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* UPLOAD MODAL (Matching Mockup 06) */}
      {/* ========================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl rounded-3xl glass-panel p-6 border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e5b45f]/15 flex items-center justify-center text-[#e5b45f]">
                  <Music2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Subir música</h3>
                  <p className="text-xs text-gray-400">
                    Agrega nuevas canciones a tu biblioteca. Completa la información para organizarlas mejor.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="mt-6 space-y-6">
              {/* Drag & Drop Upload Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/15 hover:border-[#e5b45f]/60 rounded-3xl p-6 text-center cursor-pointer transition-all bg-black/20 hover:bg-black/30"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mp3,audio/wav,audio/m4a,audio/aac,audio/ogg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <UploadCloud className="w-10 h-10 mx-auto text-[#e5b45f] mb-2" />
                <h4 className="text-sm font-semibold text-white">
                  Arrastra y suelta tus archivos aquí
                </h4>
                <p className="text-xs text-gray-400 mt-1">o haz clic para seleccionar</p>
                <p className="text-[10px] text-gray-500 mt-2">
                  Formatos soportados: MP3, WAV, M4A, AAC, FLAC · Tamaño máximo: 100 MB
                </p>

                {uploadFile && (
                  <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{uploadFile.name} ({(uploadFile.size / 1048576).toFixed(1)} MB)</span>
                  </div>
                )}
              </div>

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Cover Preview & Change */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-neutral-900 mb-3 border border-white/10">
                    <img src={uploadCoverUrl} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all"
                  >
                    Cambiar portada
                  </button>
                  <span className="text-[10px] text-gray-500 mt-1">JPG, PNG (mín. 500x500)</span>
                </div>

                {/* Form Fields */}
                <div className="md:col-span-8 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Título <span className="text-[#e5b45f]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="Ej. Summer"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b45f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Artista <span className="text-[#e5b45f]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={uploadArtist}
                      onChange={(e) => setUploadArtist(e.target.value)}
                      placeholder="Ej. Calvin Harris"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b45f]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Álbum</label>
                      <input
                        type="text"
                        value={uploadAlbum}
                        onChange={(e) => setUploadAlbum(e.target.value)}
                        placeholder="Ej. Summer EP"
                        className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#e5b45f]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Género</label>
                      <select
                        value={uploadGenre}
                        onChange={(e) => setUploadGenre(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#e5b45f]"
                      >
                        <option value="Pop">Pop</option>
                        <option value="Electrónica">Electrónica</option>
                        <option value="Afrobeat">Afrobeat</option>
                        <option value="Urbano">Urbano</option>
                        <option value="Rock">Rock</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                      <input
                        type="checkbox"
                        checked={uploadFavorite}
                        onChange={(e) => setUploadFavorite(e.target.checked)}
                        className="rounded bg-black/40 border-white/20 text-[#e5b45f] focus:ring-0"
                      />
                      <span>Marcar como favorita</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Progress bar when uploading */}
              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Subiendo a la biblioteca...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#e5b45f] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 rounded-xl bg-[#e5b45f] text-black font-semibold text-xs hover:bg-[#f3c87a] shadow-lg shadow-[#e5b45f]/25 disabled:opacity-50"
                >
                  {isUploading ? 'Procesando...' : 'Subir canción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
