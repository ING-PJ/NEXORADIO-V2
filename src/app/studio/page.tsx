'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mic,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Radio,
  Plus,
  Trash2,
  GripVertical,
  ExternalLink,
  Search,
  CheckCircle2,
  Flame,
  Clock,
  Users,
  Send,
  Sliders,
  MoreVertical,
  Heart,
  MessageSquare,
  Settings2,
} from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { radioStore } from '@/lib/radioStore';
import { LiveChatView } from '@/components/public/LiveChat';
import { MicrophoneSettingsModal } from '@/components/studio/MicrophoneSettingsModal';
import { Song, StationState, AudioLevels, Playlist } from '@/lib/types';

export default function StudioDashboardPage() {
  const [stationState, setStationState] = useState<StationState>(radioStore.getStationState());
  const [engineState, setEngineState] = useState(audioEngine.getState());
  const [levels, setLevels] = useState<AudioLevels>({ mic: 0, music: 0, master: 0 });
  const [queue, setQueue] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchLibrary, setSearchLibrary] = useState('');
  const [activeTab, setActiveTab] = useState<'biblioteca' | 'playlists' | 'chat'>('biblioteca');
  const [micError, setMicError] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);

  // Sync state
  useEffect(() => {
    const update = async () => {
      setStationState(radioStore.getStationState());
      setEngineState(audioEngine.getState());
      setQueue(radioStore.getQueue());
      const s = await radioStore.getSongs();
      setAllSongs(s);
      const p = await radioStore.getPlaylists();
      setPlaylists(p);
    };

    const unsubStore = radioStore.subscribe(update);
    const unsubEngine = audioEngine.subscribe(() => {
      setEngineState(audioEngine.getState());
    });
    const unsubLevels = audioEngine.subscribeLevels((lvl) => {
      setLevels(lvl);
    });

    update();

    // Restore music session and broadcast on refresh
    audioEngine.restoreSession();

    return () => {
      unsubStore();
      unsubEngine();
      unsubLevels();
    };
  }, []);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Format air time to hh:mm:ss
  const formatAirTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = Math.floor(totalSecs % 60);
    return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Handle Ducking / On-Air Microphone toggle
  const handleToggleMic = async () => {
    setMicError('');
    try {
      if (engineState.isMicOnAir) {
        audioEngine.exitOnAir();
      } else {
        await audioEngine.enterOnAir();
        // If not broadcasting yet, automatically start streaming to bridge
        if (!engineState.isBroadcasting) {
          audioEngine.startBroadcasting();
          setIsBroadcasting(true);
        }
      }
    } catch (err: any) {
      setMicError('Acceso al micrófono denegado o no disponible en este dispositivo.');
    }
  };

  const handleToggleBroadcast = () => {
    audioEngine.toggleBroadcasting();
    setIsBroadcasting(!isBroadcasting);
  };

  const handlePlaySong = (song: Song) => {
    audioEngine.playSong(song);
  };

  const filteredSongs = allSongs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchLibrary.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchLibrary.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-[1600px] w-full mx-auto">
      {/* ========================================================= */}
      {/* TOP STATUS BAR */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-white/5">
        <div className="flex items-center gap-3">
          {engineState.isBroadcasting ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span>EN VIVO · {formatAirTime(engineState.airTimeSeconds)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Estudio listo · Todo en orden para transmitir</span>
            </div>
          )}
          <span className="hidden sm:inline text-xs text-gray-400">
            Transmitiendo para <strong className="text-white">{stationState.listeners_count.toLocaleString()}</strong> {stationState.listeners_count === 1 ? 'oyente' : 'oyentes'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleBroadcast}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md ${
              engineState.isBroadcasting
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-[#e5b45f] hover:bg-[#f3c87a] text-black shadow-[#e5b45f]/25'
            }`}
          >
            {engineState.isBroadcasting ? 'Detener transmisión' : 'Iniciar transmisión'}
          </button>

          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white border border-white/5 transition-all"
          >
            <span>Vista pública</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {micError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{micError}</span>
          <button onClick={() => setMicError('')} className="underline font-semibold ml-2">
            Entendido
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* HERO SECTION: NOW PLAYING, AIR MIC, AUDIO METERS */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* NOW PLAYING CARD */}
        <div className="lg:col-span-5 rounded-3xl glass-panel p-6 border border-white/5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-neutral-900 border border-white/10 shadow-lg relative">
              <img
                src={engineState.currentSong?.cover_url || stationState.current_song_cover || '/cover_default.webp'}
                alt="Cover"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/cover_default.webp';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Ahora suena
                </span>
                {engineState.isMicOnAir && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e5b45f]/20 text-[#e5b45f] border border-[#e5b45f]/40 animate-pulse">
                    Música atenuada
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white truncate mt-1">
                {engineState.currentSong?.title || stationState.current_song_title}
              </h3>
              <p className="text-sm font-medium text-[#e5b45f] truncate">
                {engineState.currentSong?.artist || stationState.current_song_artist}
              </p>
            </div>
          </div>

          {/* Progress bar and time */}
          <div className="mt-6 space-y-2">
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#d9a149] to-[#f3c87a] rounded-full transition-all duration-300"
                style={{
                  width: `${
                    engineState.duration > 0
                      ? Math.min(100, (engineState.currentTime / engineState.duration) * 100)
                      : 35
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
              <span>{formatTime(engineState.currentTime)}</span>
              <span>{formatTime(engineState.duration || 232)}</span>
            </div>
          </div>

          {/* Mini Playback Transport */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-white/5">
            <button
              onClick={() => audioEngine.prevTrack()}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={() => audioEngine.togglePlay()}
              className="w-12 h-12 rounded-full bg-[#e5b45f] text-black flex items-center justify-center hover:bg-[#f3c87a] transition-all transform active:scale-95 shadow-md shadow-[#e5b45f]/25"
            >
              {engineState.isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={() => audioEngine.nextTrack()}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CENTER ON-AIR MICROPHONE & DUCKING CONTROLLER */}
        <div className="lg:col-span-3 rounded-3xl glass-panel p-6 border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Ambient Glow */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
              engineState.isMicOnAir
                ? 'bg-gradient-to-b from-rose-500/20 via-transparent to-rose-500/10'
                : 'bg-gradient-to-b from-[#e5b45f]/10 via-transparent to-transparent'
            }`}
          />

          {/* Big Circular Air Button */}
          <button
            onClick={handleToggleMic}
            className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 ${
              engineState.isMicOnAir
                ? 'bg-rose-600 text-white red-glow ring-4 ring-rose-500/30 animate-pulse'
                : 'bg-gradient-to-tr from-[#d9a149] to-[#f3c87a] text-black gold-glow hover:scale-105'
            }`}
          >
            <Mic className="w-8 h-8 mb-1" />
            <span className="text-[11px] font-extrabold tracking-wider uppercase">
              {engineState.isMicOnAir ? 'SALIR DEL AIRE' : 'ENTRAR AL AIRE'}
            </span>
          </button>

          <div className="relative z-10 mt-4 space-y-1">
            <h4 className="text-sm font-bold text-white">
              {engineState.isMicOnAir ? 'Micrófono al aire' : 'Micrófono apagado'}
            </h4>
            <p className="text-xs text-gray-400 max-w-[200px]">
              {engineState.isMicOnAir
                ? 'Música atenuada suavemente al 15%. Tu voz está mezclada al Master.'
                : 'Pulsa para entrar al aire con ducking automático sobre la música.'}
            </p>

            <button
              onClick={() => setIsMicModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-medium border border-white/5 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5 text-[#e5b45f]" />
              <span>Ajustes de Micrófono</span>
            </button>
          </div>
        </div>

        {/* AUDIO METERS & SLIDERS CARD */}
        <div className="lg:col-span-4 rounded-3xl glass-panel p-6 border border-white/5 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
              Niveles de audio
            </span>
            <button
              onClick={() => setIsMicModalOpen(true)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#e5b45f] transition-colors"
              title="Ajustes de calidad de micrófono"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Calidad</span>
            </button>
          </div>

          {/* Mic Meter & Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                <Mic className="w-3.5 h-3.5 text-[#e5b45f]" />
                Micrófono {engineState.isMicOnAir ? '(Al Aire)' : '(Muteado)'}
              </span>
              <div className="flex items-center gap-1 font-mono text-xs">
                {engineState.micVolume > 1 && (
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">
                    +{Math.round((engineState.micVolume - 1) * 100)}% Boost
                  </span>
                )}
                <span className="text-white font-semibold">{Math.round(engineState.micVolume * 100)}%</span>
              </div>
            </div>
            {/* Visual VU Meter bar */}
            <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden flex gap-0.5 p-0.5">
              {[...Array(20)].map((_, i) => {
                const isActive = (levels.mic / 100) * 20 > i;
                const isPeak = i > 15;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-all duration-75 ${
                      isActive
                        ? isPeak
                          ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                          : i > 11
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                        : 'bg-neutral-800'
                    }`}
                  />
                );
              })}
            </div>
            <input
              type="range"
              min="0"
              max="2.5"
              step="0.05"
              value={engineState.micVolume}
              onChange={(e) => audioEngine.setMicVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#e5b45f]"
              title="Ajustar ganancia del micrófono (hasta 250%)"
            />
          </div>

          {/* Music Meter & Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                <Volume2 className="w-3.5 h-3.5 text-[#e5b45f]" />
                Música {engineState.isMicOnAir && <span className="text-[#e5b45f] text-[11px]">(atenuada a 15%)</span>}
              </span>
              <span className="font-mono text-gray-400">
                {engineState.isMicOnAir ? '15%' : `${Math.round(engineState.musicVolume * 100)}%`}
              </span>
            </div>
            {/* Visual VU Meter bar */}
            <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden flex gap-0.5 p-0.5">
              {[...Array(20)].map((_, i) => {
                const isActive = (levels.music / 100) * 20 > i;
                const isPeak = i > 16;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-all duration-75 ${
                      isActive
                        ? isPeak
                          ? 'bg-amber-400'
                          : 'bg-[#e5b45f]'
                        : 'bg-neutral-800'
                    }`}
                  />
                );
              })}
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.01"
              value={engineState.musicVolume}
              onChange={(e) => audioEngine.setMusicVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#e5b45f]"
            />
          </div>

          {/* Master Volume */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">Master Salida</span>
              <span className="font-mono text-gray-400">{Math.round(engineState.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.01"
              value={engineState.masterVolume}
              onChange={(e) => audioEngine.setMasterVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MIDDLE SECTION: QUEUE & MINI LIBRARY */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* QUEUE CARD */}
        <div className="lg:col-span-6 rounded-3xl glass-panel p-6 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white">Siguiente en la cola</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => radioStore.setQueue([])}
                  className="text-xs text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpiar
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
              {queue.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  La cola está vacía. Añade canciones desde la biblioteca.
                </div>
              ) : (
                queue.map((song, idx) => (
                  <div
                    key={`${song.id}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-gray-500 w-4">{idx + 1}</span>
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-neutral-900">
                        <img
                          src={song.cover_url || '/cover_default.webp'}
                          alt={song.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/cover_default.webp';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{song.title}</h4>
                        <p className="text-[11px] text-gray-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 font-mono">
                        {formatTime(song.duration)}
                      </span>
                      <button
                        onClick={() => handlePlaySong(song)}
                        className="p-1.5 rounded-lg bg-[#e5b45f] text-black hover:bg-[#f3c87a] transition-all opacity-80 group-hover:opacity-100"
                        title="Reproducir ahora"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => radioStore.removeFromQueue(idx)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors"
                        title="Quitar de cola"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <Link
              href="/studio/library"
              className="text-xs text-[#e5b45f] font-semibold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar más canciones
            </Link>
          </div>
        </div>

        {/* QUICK LIBRARY EXPLORER */}
        <div className="lg:col-span-6 rounded-3xl glass-panel p-6 border border-white/5 flex flex-col justify-between">
          <div>
            {/* Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('biblioteca')}
                  className={`text-xs font-bold transition-colors pb-1 border-b-2 ${
                    activeTab === 'biblioteca'
                      ? 'text-white border-[#e5b45f]'
                      : 'text-gray-400 border-transparent hover:text-white'
                  }`}
                >
                  Biblioteca
                </button>
                <button
                  onClick={() => setActiveTab('playlists')}
                  className={`text-xs font-bold transition-colors pb-1 border-b-2 ${
                    activeTab === 'playlists'
                      ? 'text-white border-[#e5b45f]'
                      : 'text-gray-400 border-transparent hover:text-white'
                  }`}
                >
                  Playlists
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`text-xs font-bold transition-colors pb-1 border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'chat'
                      ? 'text-white border-[#e5b45f]'
                      : 'text-gray-400 border-transparent hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#e5b45f]" />
                  Chat en vivo
                </button>
              </div>

              {activeTab !== 'chat' ? (
                <div className="relative w-48">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchLibrary}
                    onChange={(e) => setSearchLibrary(e.target.value)}
                    placeholder="Buscar tracks..."
                    className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b45f]"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-[#e5b45f] font-semibold bg-[#e5b45f]/10 border border-[#e5b45f]/30 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Modo DJ Oficial
                </div>
              )}
            </div>

            {/* List / Chat Tab Content */}
            <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
              {activeTab === 'chat' ? (
                <div className="h-72 rounded-2xl overflow-hidden border border-white/10">
                  <LiveChatView isDj={true} isCompact />
                </div>
              ) : activeTab === 'biblioteca' ? (
                filteredSongs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-neutral-900">
                        <img
                          src={song.cover_url || '/cover_default.webp'}
                          alt={song.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/cover_default.webp';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{song.title}</h4>
                        <p className="text-[11px] text-gray-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 font-mono">
                        {formatTime(song.duration)}
                      </span>
                      <button
                        onClick={() => radioStore.addToQueue(song)}
                        className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-[#e5b45f] hover:text-black transition-all"
                        title="Agregar a la cola"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handlePlaySong(song)}
                        className="p-1.5 rounded-lg bg-[#e5b45f]/20 text-[#e5b45f] hover:bg-[#e5b45f] hover:text-black transition-all"
                        title="Reproducir de inmediato"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                playlists.map((pl) => (
                  <div
                    key={pl.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-neutral-800">
                        <img src={pl.cover_url || '/cover_default.webp'} alt={pl.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white">{pl.name}</h4>
                        <p className="text-[10px] text-gray-400">{pl.songs_count || 0} canciones</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (pl.songs && pl.songs.length > 0) {
                          audioEngine.playSong(pl.songs[0]);
                          radioStore.setQueue(pl.songs.slice(1));
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#e5b45f] text-black text-xs font-semibold hover:bg-[#f3c87a] transition-all"
                    >
                      Cargar playlist
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM REALTIME STATS (ESTADÍSTICAS REALES) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-3xl glass-panel p-5 border border-white/5">
          <span className="text-xs text-gray-400 font-medium">Oyentes en tiempo real</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white">{stationState.listeners_count.toLocaleString()}</span>
            <span className="text-xs text-emerald-400 font-semibold">
              {stationState.listeners_count > 0 ? 'Conectados ahora' : 'Sin oyentes'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Sintonizando la transmisión en vivo</p>
        </div>

        <div className="rounded-3xl glass-panel p-5 border border-white/5">
          <span className="text-xs text-gray-400 font-medium">Biblioteca musical</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white">{allSongs.length}</span>
            <span className="text-xs text-[#e5b45f] font-semibold">canciones</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Pistas listas para reproducir</p>
        </div>

        <div className="rounded-3xl glass-panel p-5 border border-white/5">
          <span className="text-xs text-gray-400 font-medium">Tiempo al aire en sesión</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white">{formatAirTime(engineState.airTimeSeconds)}</span>
            <span className="text-xs text-gray-400 font-semibold">
              {engineState.isBroadcasting ? 'Transmitiendo' : 'En pausa'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Duración de la emisión actual</p>
        </div>
      </div>

      {/* Microphone Settings Modal */}
      <MicrophoneSettingsModal
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
      />
    </div>
  );
}
