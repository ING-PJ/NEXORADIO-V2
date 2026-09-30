'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mic,
  Volume2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sliders,
  ExternalLink,
  Users,
  Heart,
  MessageSquare,
  Radio,
  Clock,
  Settings2,
} from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { radioStore } from '@/lib/radioStore';
import { MicrophoneSettingsModal } from '@/components/studio/MicrophoneSettingsModal';
import { Song, StationState, AudioLevels } from '@/lib/types';

export default function StudioLivePage() {
  const [stationState, setStationState] = useState<StationState>(radioStore.getStationState());
  const [engineState, setEngineState] = useState(audioEngine.getState());
  const [levels, setLevels] = useState<AudioLevels>({ mic: 0, music: 0, master: 0 });
  const [queue, setQueue] = useState<Song[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);

  useEffect(() => {
    const update = async () => {
      setStationState(radioStore.getStationState());
      setEngineState(audioEngine.getState());
      setQueue(radioStore.getQueue());
      const s = await radioStore.getSongs();
      setFavoritesCount(s.filter((item) => item.is_favorite).length);
      const r = await radioStore.getRequests();
      setRequestsCount(r.length);
    };

    const unsubStore = radioStore.subscribe(update);
    const unsubEngine = audioEngine.subscribe(() => setEngineState(audioEngine.getState()));
    let lastLevelTime = 0;
    const unsubLevels = audioEngine.subscribeLevels((l) => {
      const now = performance.now();
      if (now - lastLevelTime >= 50) {
        lastLevelTime = now;
        setLevels(l);
      }
    });

    update();
    audioEngine.restoreSession();

    return () => {
      unsubStore();
      unsubEngine();
      unsubLevels();
    };
  }, []);

  const formatAirTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = Math.floor(totalSecs % 60);
    return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleToggleMic = () => {
    audioEngine.toggleMic();
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-[1600px] w-full mx-auto">
      {/* Top On-Air Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl glass-panel border border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>● EN VIVO {formatAirTime(engineState.airTimeSeconds)}</span>
          </div>
          <span className="text-xs text-gray-400">
            Transmitiendo para <strong className="text-white">{stationState.listeners_count.toLocaleString()}</strong> {stationState.listeners_count === 1 ? 'oyente' : 'oyentes'}
          </span>
        </div>

        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white border border-white/5 transition-all"
        >
          <span>Vista pública</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Broadcast Console Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Studio Microphone & Live On-Air Monitor */}
        <div className="lg:col-span-8 rounded-3xl relative overflow-hidden min-h-[320px] flex flex-col items-center justify-center p-8 border border-white/10 shadow-2xl">
          {/* Background studio image */}
          <div
            className="absolute inset-0 bg-cover bg-center filter brightness-40"
            style={{ backgroundImage: `url('/bg_nexo_studio.webp')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

          {/* Central Live Badge */}
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-600/80 text-white font-bold text-xs shadow-lg shadow-rose-600/50 red-glow">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>● EN VIVO</span>
            </div>

            {/* Waveform Visualization Bars */}
            <div className="flex items-center gap-1.5 h-16 py-2">
              {[...Array(32)].map((_, i) => {
                const heightPercent = engineState.isMicOnAir
                  ? Math.max(15, Math.min(100, (levels.mic / 100) * 100 * (0.6 + Math.sin(i * 0.5) * 0.4)))
                  : Math.max(10, Math.min(100, (levels.music / 100) * 80 * (0.5 + Math.cos(i * 0.4) * 0.5)));
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      engineState.isMicOnAir ? 'bg-rose-400' : 'bg-[#e5b45f]'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>

            {/* Live Clock Timer */}
            <div className="text-center">
              <span className="text-2xl font-extrabold text-white font-mono tracking-wider drop-shadow-md">
                {formatAirTime(engineState.airTimeSeconds)}
              </span>
              <p className="text-[11px] text-gray-400">Tiempo al aire</p>
            </div>

            {/* On-Air Toggle Button & Settings */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleMic}
                className={`px-8 py-3 rounded-full font-bold text-xs tracking-wider uppercase flex items-center gap-2 shadow-xl transition-all transform active:scale-95 ${
                  engineState.isMicOnAir
                    ? 'bg-rose-600 text-white red-glow hover:bg-rose-500'
                    : 'bg-[#e5b45f] text-black gold-glow hover:bg-[#f3c87a]'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{engineState.isMicOnAir ? '■ SALIR DEL AIRE' : 'ENTRAR AL AIRE'}</span>
              </button>

              <button
                onClick={() => setIsMicModalOpen(true)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all shadow-md active:scale-95"
                title="Configuración de calidad de micrófono"
              >
                <Settings2 className="w-4 h-4 text-[#e5b45f]" />
              </button>
            </div>
          </div>
        </div>

        {/* Audio Levels & Faders (Mockup 04) */}
        <div className="lg:col-span-4 rounded-3xl glass-panel p-6 border border-white/5 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Niveles de audio</span>
            <button
              onClick={() => setIsMicModalOpen(true)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#e5b45f] transition-colors"
              title="Ajustes de micrófono"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Ajustes</span>
            </button>
          </div>

          {/* Mic */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-[#e5b45f]" />
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
            {/* Visual Green/Yellow/Red Bar */}
            <div className="h-3 w-full bg-neutral-900 rounded-full overflow-hidden flex gap-0.5 p-0.5">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-xs transition-all duration-75 ${
                    (levels.mic / 100) * 24 > i
                      ? i > 19
                        ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                        : i > 13
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                      : 'bg-neutral-800'
                  }`}
                />
              ))}
            </div>
            <input
              type="range"
              min="0"
              max="2.5"
              step="0.05"
              value={engineState.micVolume}
              onChange={(e) => audioEngine.setMicVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#e5b45f]"
              title="Ajustar volumen del micrófono (hasta 250%)"
            />
          </div>

          {/* Music */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-[#e5b45f]" />
                Música {engineState.isMicOnAir && <span className="text-[#e5b45f] text-[11px]">(atenuada a 15%)</span>}
              </span>
              <span className="text-white font-mono">
                {engineState.isMicOnAir ? '15%' : `${Math.round(engineState.musicVolume * 100)}%`}
              </span>
            </div>
            <div className="h-3 w-full bg-neutral-900 rounded-full overflow-hidden flex gap-0.5 p-0.5">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-xs transition-all duration-75 ${
                    (levels.music / 100) * 24 > i
                      ? i > 19
                        ? 'bg-rose-500'
                        : 'bg-[#e5b45f]'
                      : 'bg-neutral-800'
                  }`}
                />
              ))}
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
              <span className="text-gray-400 font-semibold">Master Salida</span>
              <span className="text-white font-mono">{Math.round(engineState.masterVolume * 100)}%</span>
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

      {/* Bottom Row Information */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Now On Air Music Info */}
        <div className="lg:col-span-4 rounded-3xl glass-panel p-5 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">
              Ahora al aire {engineState.isMicOnAir && '(música en segundo plano)'}
            </span>
            {engineState.isMicOnAir && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e5b45f]/20 text-[#e5b45f] font-semibold">
                Música atenuada
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-neutral-900">
              <img
                src={stationState.current_song_cover || '/cover_default.webp'}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">{stationState.current_song_title}</h4>
              <p className="text-xs text-[#e5b45f] truncate">{stationState.current_song_artist}</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#e5b45f] rounded-full"
                style={{
                  width: `${
                    engineState.duration > 0
                      ? Math.min(100, (engineState.currentTime / engineState.duration) * 100)
                      : 40
                  }%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>{formatTime(engineState.currentTime)}</span>
              <span>{formatTime(engineState.duration || 232)}</span>
            </div>
          </div>
        </div>

        {/* Program & Host Info */}
        <div className="lg:col-span-4 rounded-3xl glass-panel p-5 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Información del programa</span>
            <span className="text-[10px] text-rose-400 font-semibold">● EN VIVO</span>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 overflow-hidden shrink-0">
              <img src="/cover_default.webp" alt="Program" className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">NEXO Morning</h4>
              <p className="text-[10px] text-[#e5b45f]">10:00 – 12:00 · Tu dosis de buena energía</p>
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-400 font-medium">Locutor actual</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-bold text-white">NEXO RADIO</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e5b45f]/20 text-[#e5b45f] font-semibold">
                Al aire ahora
              </span>
            </div>
          </div>
        </div>

        {/* Realtime Audience Stats (Mockup 04) */}
        <div className="lg:col-span-4 rounded-3xl glass-panel p-5 border border-white/5 flex flex-col justify-between">
          <span className="text-xs text-gray-400 font-medium">Estadísticas en tiempo real</span>
          <div className="grid grid-cols-3 gap-2 my-2 text-center">
            <div className="p-2.5 rounded-2xl bg-white/5">
              <Users className="w-4 h-4 mx-auto text-[#e5b45f] mb-1" />
              <div className="text-base font-bold text-white">{stationState.listeners_count}</div>
              <div className="text-[10px] text-gray-400">{stationState.listeners_count === 1 ? 'oyente' : 'oyentes'}</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/5">
              <Heart className="w-4 h-4 mx-auto text-rose-400 mb-1" />
              <div className="text-base font-bold text-white">{favoritesCount}</div>
              <div className="text-[10px] text-gray-400">favoritas</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/5">
              <MessageSquare className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
              <div className="text-base font-bold text-white">{requestsCount}</div>
              <div className="text-[10px] text-gray-400">solicitudes</div>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 text-center">Transmisión estable y fluida</p>
        </div>
      </div>

      {/* Microphone Quality & Settings Modal */}
      <MicrophoneSettingsModal
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
      />
    </div>
  );
}
