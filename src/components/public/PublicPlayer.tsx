'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Heart, Radio, Music2 } from 'lucide-react';
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
  const [heartAnimation, setHeartAnimation] = useState(false);
  const [likeToast, setLikeToast] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync station state in real-time
  useEffect(() => {
    const update = () => {
      setStationState(radioStore.getStationState());
    };
    const unsubscribe = radioStore.subscribe(update);
    update();
    return () => unsubscribe();
  }, []);

  // Check if current playing song is in favorites
  useEffect(() => {
    let isMounted = true;
    const checkFavorite = async () => {
      const songs = await radioStore.getSongs();
      const current = songs.find(
        (s) =>
          (stationState.current_song_id && s.id === stationState.current_song_id) ||
          (stationState.current_song_title &&
            s.title.toLowerCase().trim() === stationState.current_song_title.toLowerCase().trim())
      );
      if (isMounted) {
        setIsLiked(Boolean(current?.is_favorite));
      }
    };
    checkFavorite();
    const unsub = radioStore.subscribe(checkFavorite);
    return () => {
      isMounted = false;
      unsub();
    };
  }, [stationState.current_song_id, stationState.current_song_title]);

  const handleToggleFavorite = async () => {
    try {
      const songs = await radioStore.getSongs();
      let activeSong = songs.find(
        (s) =>
          (stationState.current_song_id && s.id === stationState.current_song_id) ||
          (stationState.current_song_title &&
            s.title.toLowerCase().trim() === stationState.current_song_title.toLowerCase().trim())
      );

      // If active song is not yet in library, add it with is_favorite = true
      if (!activeSong && stationState.current_song_title) {
        activeSong = await radioStore.addSong({
          title: stationState.current_song_title,
          artist: stationState.current_song_artist || 'NEXO Radio',
          genre: 'Pop',
          file_url: stationState.current_song_url || '/songs/summer.mp3',
          cover_url: stationState.current_song_cover || '/cover_default.webp',
          duration: stationState.current_song_duration || 180,
          is_favorite: true,
        });
        setIsLiked(true);
        setHeartAnimation(true);
        setLikeToast('¡Guardada en Favoritas!');
        setTimeout(() => setHeartAnimation(false), 800);
        setTimeout(() => setLikeToast(null), 3000);
        return;
      }

      if (activeSong) {
        const nextFav = await radioStore.toggleFavorite(activeSong.id);
        setIsLiked(nextFav);
        setHeartAnimation(nextFav);
        setLikeToast(nextFav ? '¡Guardada en Favoritas!' : 'Eliminada de Favoritas');
        setTimeout(() => setHeartAnimation(false), 800);
        setTimeout(() => setLikeToast(null), 3000);
      }
    } catch (err) {
      console.error('Error toggling favorite from player:', err);
    }
  };

  // Stream URL from Render or custom environment
  const LIVE_STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || 'https://nexo-radio-bridge.onrender.com/live';

  // Auto-switch track when song changes in stationState (Only in purely offline / serverless fallback mode)
  useEffect(() => {
    if (!LIVE_STREAM_URL && isPlaying && audioRef.current) {
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

  // Resynchronize listener playback position with studio air progress (Only in offline serverless mode)
  useEffect(() => {
    if (!LIVE_STREAM_URL && isPlaying && audioRef.current && stationState.current_song_progress > 0) {
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

      // Primary: Connect to the live radio stream from Render (Broadcasts DJ voice + music mixed)
      if (LIVE_STREAM_URL) {
        try {
          audioRef.current.src = `${LIVE_STREAM_URL}?t=${Date.now()}`;
          audioRef.current.volume = isMuted ? 0 : (volume || 0.85);
          audioRef.current.load();
          await audioRef.current.play();
          setIsPlaying(true);
          setIsLoading(false);
          return;
        } catch (err) {
          console.warn('Could not connect to live stream, falling back to direct track:', err);
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
    <div className="relative flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4 py-1 sm:py-2">
      {/* Vinyl Aura & Rotating Center Disc */}
      <div className="relative flex items-center justify-center my-2 sm:my-3 group">
        {/* Radial Dotted Audio Glow Ring */}
        <div className={`absolute w-60 h-60 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-full border border-dashed border-[#e5b45f]/25 transition-all duration-1000 ${
          isPlaying ? 'animate-pulse-gold scale-105' : 'opacity-30 scale-95'
        }`} />

        {/* Ambient Warm Golden Aura */}
        <div className={`absolute w-52 h-52 sm:w-64 sm:h-64 lg:w-72 lg:h-72 rounded-full bg-[#e5b45f]/15 blur-2xl transition-opacity duration-700 ${
          isPlaying ? 'opacity-100' : 'opacity-20'
        }`} />

        {/* Dotted Accent Ring */}
        <div className="absolute w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] lg:w-[270px] lg:h-[270px] rounded-full border border-[#e5b45f]/30 flex items-center justify-center">
          <div className="w-full h-full rounded-full border border-dotted border-[#e5b45f]/40 animate-spin-slow" />
        </div>

        {/* Outer Golden Border Rim */}
        <div className="relative w-44 h-44 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-full p-1.5 bg-gradient-to-tr from-[#d9a149] via-[#f3c87a] to-[#966b26] shadow-2xl shadow-[#e5b45f]/30">
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-neutral-800 to-black border-2 border-[#e5b45f]/60 shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#e5b45f]" />
            </div>

            {/* Mockup Typography inside the disc */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
              <span className="text-[9px] sm:text-[11px] font-semibold tracking-widest uppercase text-white/90 drop-shadow-md">
                {stationState.current_song_artist.toUpperCase()}
              </span>
              <span className="text-xs sm:text-lg font-bold tracking-wider uppercase text-white drop-shadow-lg truncate max-w-[85%]">
                {stationState.current_song_title.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Song Metadata Display */}
      <div className="text-center mt-1 sm:mt-2 z-10">
        <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-md truncate max-w-lg">
          {stationState.current_song_title}
        </h2>
        <p className="text-xs sm:text-sm font-medium text-[#e5b45f] mt-0.5 tracking-wide">
          {stationState.current_song_artist}
        </p>
      </div>

      {/* Primary Player Controls */}
      <div className="flex items-center justify-center gap-5 sm:gap-7 mt-3 sm:mt-4 z-10">
        {/* Like Button with Toast */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={handleToggleFavorite}
            className={`p-2.5 sm:p-3 rounded-full transition-all duration-200 active:scale-90 ${
              isLiked
                ? 'text-rose-500 hover:text-rose-400 bg-rose-500/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title={isLiked ? 'Quitar de la playlist de favoritas' : 'Guardar en la playlist de favoritas'}
            aria-label={isLiked ? 'Quitar de la playlist de favoritas' : 'Guardar en la playlist de favoritas'}
          >
            <Heart
              className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${
                isLiked ? 'fill-current' : ''
              } ${heartAnimation ? 'scale-125 text-rose-500 animate-pulse' : ''}`}
            />
          </button>

          {likeToast && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-neutral-900/95 border border-white/15 text-[11px] font-semibold text-white shadow-2xl flex items-center gap-1.5 whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 pointer-events-none z-30">
              <Heart className="w-3 h-3 text-rose-500 fill-current" />
              <span>{likeToast}</span>
            </div>
          )}
        </div>

        {/* Big Glowing Play / Pause Button */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pausar transmisión' : 'Escuchar en vivo'}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer ${
            isPlaying
              ? 'bg-[#e5b45f] text-black shadow-lg shadow-[#e5b45f]/40 ring-4 ring-[#e5b45f]/20 scale-105'
              : 'bg-gradient-to-tr from-[#d9a149] to-[#f3c87a] text-black shadow-xl shadow-[#e5b45f]/30 hover:scale-105'
          }`}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
          ) : (
            <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-0.5" />
          )}
        </button>

        {/* Mute / Unmute Button */}
        <button
          type="button"
          onClick={() => setIsMuted((prev) => !prev)}
          className={`p-2.5 sm:p-3 rounded-full transition-all duration-200 active:scale-90 ${
            isMuted
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title={isMuted ? 'Activar sonido' : 'Silenciar'}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
          ) : (
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </button>
      </div>

      {/* Live Badge Status & Song Request Button */}
      <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2.5 z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#e5b45f]/40 bg-[#e5b45f]/10 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e5b45f] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e5b45f]"></span>
          </span>
          <span className="text-[11px] font-semibold tracking-wider text-[#e5b45f] uppercase">
            EN VIVO · NEXO RADIO
          </span>
        </div>

        {/* Button to open Request Modal */}
        <button
          type="button"
          onClick={onOpenRequestModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-[#e5b45f]/40 bg-gradient-to-r from-[#e5b45f]/20 to-[#f3c87a]/20 hover:from-[#e5b45f]/30 hover:to-[#f3c87a]/30 text-white hover:text-[#e5b45f] text-[11px] font-semibold tracking-wide transition-all transform active:scale-95 shadow-md shadow-[#e5b45f]/10 cursor-pointer"
          title="Pedir una canción a la cabina de NEXO Radio"
          aria-label="Pedir canción"
        >
          <Music2 className="w-3 h-3 text-[#e5b45f]" />
          <span>Pedir canción</span>
        </button>
      </div>
    </div>
  );
}
