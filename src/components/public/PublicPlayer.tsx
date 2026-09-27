'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Heart, Radio, SkipBack, SkipForward } from 'lucide-react';
import { radioStore } from '@/lib/radioStore';
import { StationState } from '@/lib/types';

interface PublicPlayerProps {
  onOpenRequestModal: () => void;
}

export default function PublicPlayer({ onOpenRequestModal }: PublicPlayerProps) {
  const [stationState, setStationState] = useState<StationState>(radioStore.getStationState());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef<HTMLDivElement | null>(null);

  // Close volume popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Sync station state in real-time
  useEffect(() => {
    const update = () => {
      setStationState(radioStore.getStationState());
    };
    const unsubscribe = radioStore.subscribe(update);
    update();
    return () => unsubscribe();
  }, []);

  // Auto-switch track when song changes in stationState (Serverless Vercel + Supabase mode)
  // Auto-switch track when song changes in stationState (Serverless Vercel + Supabase mode)
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_STREAM_URL && isPlaying && audioRef.current) {
      radioStore.getSongs().then((songs) => {
        const activeSong = songs.find(
          (s) =>
            (stationState.current_song_id && s.id === stationState.current_song_id) ||
            (stationState.current_song_title && s.title.toLowerCase() === stationState.current_song_title.toLowerCase())
        );
        let targetUrl = stationState.current_song_url || activeSong?.file_url || '/songs/summer.mp3';
        if (!targetUrl || targetUrl.includes('pixabay.com')) {
          targetUrl = '/songs/summer.mp3';
        }
        if (audioRef.current && !audioRef.current.src.endsWith(targetUrl) && audioRef.current.src !== targetUrl) {
          audioRef.current.src = targetUrl;
          audioRef.current.load();
          audioRef.current.play().catch(console.warn);
        }
      });
    }
  }, [stationState.current_song_id, stationState.current_song_title, stationState.current_song_url, isPlaying]);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    // Do not enforce crossOrigin on client playback to avoid CORS restrictions on media files
    audioRef.current = audio;

    audio.addEventListener('playing', () => {
      setIsPlaying(true);
      setIsLoading(false);
    });

    audio.addEventListener('waiting', () => {
      setIsLoading(true);
    });

    audio.addEventListener('error', (e) => {
      console.warn('Audio connection notice, checking fallback track:', e);
      if (audio.src && !audio.src.endsWith('/songs/summer.mp3')) {
        audio.src = '/songs/summer.mp3';
        audio.load();
        audio.play().then(() => setIsPlaying(true)).catch(console.warn);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Resynchronize listener playback position with studio air progress
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_STREAM_URL && isPlaying && audioRef.current && stationState.current_song_progress > 0) {
      const diff = Math.abs(audioRef.current.currentTime - stationState.current_song_progress);
      if (diff > 4) {
        audioRef.current.currentTime = stationState.current_song_progress;
      }
    }
  }, [stationState.current_song_progress, isPlaying]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      const defaultStreamUrl = 'https://nexo-radio-bridge.onrender.com/live';
      const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL || defaultStreamUrl;

      // If external stream URL is defined and station is live, connect to it
      if (streamUrl && stationState.is_live) {
        try {
          audioRef.current.src = `${streamUrl}?t=${Date.now()}`;
          audioRef.current.volume = isMuted ? 0 : (volume || 0.85);
          audioRef.current.load();
          await audioRef.current.play();
          setIsPlaying(true);
          setIsLoading(false);
          return;
        } catch (err) {
          console.warn('Could not connect to external stream, falling back to direct track:', err);
        }
      }

      // Vercel + Supabase Serverless Radio Mode: Play current song directly
      try {
        const songs = await radioStore.getSongs();
        const activeSong = songs.find(
          (s) =>
            (stationState.current_song_id && s.id === stationState.current_song_id) ||
            (stationState.current_song_title && s.title.toLowerCase() === stationState.current_song_title.toLowerCase())
        ) || songs[0];
        let targetUrl = stationState.current_song_url || activeSong?.file_url || '/songs/summer.mp3';
        if (!targetUrl || targetUrl.includes('pixabay.com')) {
          targetUrl = '/songs/summer.mp3';
        }
        audioRef.current.src = targetUrl;
        audioRef.current.volume = isMuted ? 0 : (volume || 0.85);
        audioRef.current.load();

        const syncTime = stationState.current_song_progress || 0;
        if (syncTime > 0) {
          audioRef.current.currentTime = syncTime;
        }

        await audioRef.current.play();

        if (syncTime > 0 && audioRef.current && Math.abs(audioRef.current.currentTime - syncTime) > 3) {
          audioRef.current.currentTime = syncTime;
        }
        setIsPlaying(true);
      } catch (playErr) {
        console.warn('Playback error with targetUrl, retrying local fallback:', playErr);
        try {
          if (audioRef.current) {
            audioRef.current.src = '/songs/summer.mp3';
            audioRef.current.load();
            await audioRef.current.play();
            setIsPlaying(true);
          }
        } catch (e2) {
          console.error('Final fallback error:', e2);
        }
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4 py-6">
      {/* Vinyl Aura & Rotating Center Disc */}
      <div className="relative flex items-center justify-center my-4 sm:my-6 group">
        {/* Radial Dotted Audio Glow Ring */}
        <div className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-dashed border-[#e5b45f]/25 transition-all duration-1000 ${
          isPlaying ? 'animate-pulse-gold scale-105' : 'opacity-30 scale-95'
        }`} />

        {/* Ambient Warm Golden Aura */}
        <div className={`absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[#e5b45f]/15 blur-2xl transition-opacity duration-700 ${
          isPlaying ? 'opacity-100' : 'opacity-20'
        }`} />

        {/* Dotted Accent Ring */}
        <div className="absolute w-[240px] h-[240px] sm:w-[310px] sm:h-[310px] rounded-full border border-[#e5b45f]/30 flex items-center justify-center">
          <div className="w-full h-full rounded-full border border-dotted border-[#e5b45f]/40 animate-spin-slow" />
        </div>

        {/* Outer Golden Border Rim */}
        <div className="relative w-52 h-52 sm:w-72 sm:h-72 rounded-full p-1.5 bg-gradient-to-tr from-[#d9a149] via-[#f3c87a] to-[#966b26] shadow-2xl shadow-[#e5b45f]/30">
          {/* Inner Disc / Cover Art Container */}
          <div className={`w-full h-full rounded-full overflow-hidden relative shadow-inner bg-black ${
            isPlaying ? 'animate-spin-slow' : ''
          }`}>
            <img
              src={stationState.current_song_cover || '/cover_default.webp'}
              alt={stationState.current_song_title}
              className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/cover_default.webp';
              }}
            />
            {/* Dark vinyl grooves overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

            {/* Center vinyl spindle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-neutral-800 to-black border-2 border-[#e5b45f]/60 shadow-lg flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#e5b45f]" />
            </div>

            {/* Mockup Typography inside the disc */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
              <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-white/90 drop-shadow-md">
                {stationState.current_song_artist.toUpperCase()}
              </span>
              <span className="text-sm sm:text-xl font-bold tracking-wider uppercase text-white drop-shadow-lg">
                {stationState.current_song_title.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Song Metadata Display */}
      <div className="text-center mt-2 sm:mt-4 z-10">
        <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight drop-shadow-md">
          {stationState.current_song_title}
        </h2>
        <p className="text-sm sm:text-base font-medium text-[#e5b45f] mt-1 tracking-wide">
          {stationState.current_song_artist}
        </p>
      </div>

      {/* Primary Player Controls */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6 z-10">
        {/* Like Button */}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className={`p-2.5 rounded-full transition-transform active:scale-90 ${
            isLiked ? 'text-rose-500' : 'text-gray-400 hover:text-white'
          }`}
          title="Me gusta"
        >
          <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        {/* Previous Track (Disabled in linear radio) */}
        <button
          disabled
          className="p-2.5 text-gray-600 cursor-not-allowed opacity-50"
          title="Emisión lineal en vivo"
        >
          <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Big Glowing Play / Pause Button */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pausar transmisión' : 'Escuchar en vivo'}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 ${
            isPlaying
              ? 'bg-[#e5b45f] text-black shadow-lg shadow-[#e5b45f]/40 ring-4 ring-[#e5b45f]/20'
              : 'bg-gradient-to-tr from-[#d9a149] to-[#f3c87a] text-black shadow-xl shadow-[#e5b45f]/30 hover:scale-105'
          }`}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
          ) : (
            <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-1" />
          )}
        </button>

        {/* Next Track (Disabled in linear radio) */}
        <button
          disabled
          className="p-2.5 text-gray-600 cursor-not-allowed opacity-50"
          title="Emisión lineal en vivo"
        >
          <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Volume Control with Popover Slider desplegable hacia arriba */}
        <div
          ref={volumeRef}
          className="relative flex items-center justify-center"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          {/* Vertical Slider Popover desplegable hacia arriba */}
          <div
            className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex flex-col items-center bg-[#12141a]/95 backdrop-blur-xl border border-white/10 rounded-2xl py-3 px-2 shadow-2xl transition-all duration-300 z-50 ${
              showVolumeSlider
                ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
                : 'opacity-0 translate-y-2 pointer-events-none scale-95'
            }`}
          >
            {/* Porcentaje de volumen */}
            <span className="text-[10px] font-bold text-[#e5b45f] mb-2 select-none font-mono">
              {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
            </span>

            {/* Slider vertical */}
            <div className="h-28 w-7 flex items-center justify-center relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-24 h-1.5 -rotate-90 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#e5b45f]"
              />
            </div>

            {/* Botón de silencio rápido */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              className="mt-2 text-gray-400 hover:text-white transition-colors p-1"
              title={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-gray-300 hover:text-[#e5b45f]" />
              )}
            </button>

            {/* Flecha decorativa inferior */}
            <div className="w-2 h-2 bg-[#12141a] rotate-45 border-r border-b border-white/10 -bottom-1 left-1/2 -translate-x-1/2 absolute" />
          </div>

          {/* Botón icono de volumen perfectamente alineado con los demás controles */}
          <button
            type="button"
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            className={`p-2.5 rounded-full transition-all duration-200 active:scale-90 ${
              showVolumeSlider
                ? 'text-[#e5b45f] bg-[#e5b45f]/15 ring-1 ring-[#e5b45f]/30'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Ajustar volumen"
            aria-label="Control de volumen"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
            ) : (
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Live Badge Status */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#e5b45f]/40 bg-[#e5b45f]/10 backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e5b45f] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#e5b45f]"></span>
          </span>
          <span className="text-xs font-semibold tracking-wider text-[#e5b45f] uppercase">
            EN VIVO · NEXO RADIO
          </span>
        </div>
      </div>
    </div>
  );
}
