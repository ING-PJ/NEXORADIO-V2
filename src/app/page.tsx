'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  Calendar,
  MessageSquare,
  Users,
  Search,
  Music,
  Send,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  Heart
} from 'lucide-react';
import PublicPlayer from '@/components/public/PublicPlayer';
import RequestModal from '@/components/public/RequestModal';
import { LiveChatView, LiveChatDrawer } from '@/components/public/LiveChat';
import { radioStore } from '@/lib/radioStore';
import { chatStore } from '@/lib/chatStore';
import { Song, StationState } from '@/lib/types';

export default function NexoRadioPublicPage() {
  const [stationState, setStationState] = useState<StationState>(radioStore.getStationState());
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const update = async () => {
      setStationState(radioStore.getStationState());
      const songs = await radioStore.getSongs();
      setRecentSongs(songs);
    };
    const unsubscribe = radioStore.subscribe(update);
    update();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateUnread = () => {
      setUnreadChatCount(chatStore.getUnreadCount());
    };
    const unsubscribeChat = chatStore.subscribe(updateUnread);
    return () => unsubscribeChat();
  }, []);

  return (
    <div className="relative min-h-screen bg-[#07080b] text-[#f3f4f6] flex flex-col font-sans overflow-x-hidden">
      {/* Background Graphic */}
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none opacity-45 mix-blend-screen"
        style={{ backgroundImage: `url('/bg_nexo_radio.webp')` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#07080b]/70 via-[#07080b]/85 to-[#07080b] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex min-h-screen">
        {/* ========================================================= */}
        {/* DESKTOP LEFT SIDEBAR */}
        {/* ========================================================= */}
        <aside className="hidden lg:flex flex-col justify-between w-64 p-6 glass-panel border-r border-white/5 shrink-0">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <img
                src="/logo_nexo_radio.png"
                alt="NEXO RADIO"
                className="h-10 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(229,180,95,0.4)]"
              />
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-[#e5b45f] bg-[#e5b45f]/15 border border-[#e5b45f]/30 shadow-sm shadow-[#e5b45f]/20 transition-all"
              >
                <Radio className="w-5 h-5 text-[#e5b45f]" />
                En vivo
              </button>

              <button
                onClick={() => {}}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Calendar className="w-5 h-5" />
                Programación
              </button>

              <button
                onClick={() => setIsChatOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-[#e5b45f]" />
                  <span>Chat en vivo</span>
                </div>
                {unreadChatCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#e5b45f] text-black text-[10px] font-bold">
                    {unreadChatCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {}}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Users className="w-5 h-5" />
                Comunidad
              </button>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="space-y-6">
            <Link
              href="/studio/login"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-[#e5b45f] bg-white/5 hover:bg-[#e5b45f]/10 border border-white/5 hover:border-[#e5b45f]/30 transition-all"
            >
              <span>Acceso NEXO Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {/* Social Icons */}
            <div className="flex items-center gap-4 text-gray-500">
              <svg className="w-4 h-4 hover:text-[#e5b45f] cursor-pointer transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <svg className="w-4 h-4 hover:text-[#e5b45f] cursor-pointer transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>
              </svg>
              <svg className="w-4 h-4 hover:text-[#e5b45f] cursor-pointer transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136c-1.871-.502-9.376-.502-9.376-.502s-7.504 0-9.377.502a3.016 3.016 0 0 0-2.122 2.136c-.5 1.871-.5 5.814-.5 5.814s0 3.943.5 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.502 9.377.502 9.377.502s7.504 0 9.377-.502a3.016 3.016 0 0 0 2.122-2.136c.5-1.871.5-5.814.5-5.814s0-3.943-.5-5.814zm-13.498 9.814v-8l6.857 4-6.857 4z"/>
              </svg>
              <svg className="w-4 h-4 hover:text-[#e5b45f] cursor-pointer transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>

            <div className="text-[11px] tracking-widest uppercase text-gray-500 font-semibold">
              DONDE TODO CONECTA
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* CENTER CONTENT & TOP HEADER */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-white/5 glass-panel-subtle sticky top-0 z-30">
            {/* Mobile Brand & Hamburger */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <img
                src="/logo_nexo_radio.png"
                alt="NEXO RADIO"
                className="h-8 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(229,180,95,0.4)]"
              />
            </div>

            {/* Desktop Search Bar */}
            <div className="hidden lg:flex items-center relative w-96">
              <Search className="w-4 h-4 absolute left-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar canciones, artistas o programas..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#e5b45f]/60 transition-colors"
              />
            </div>

            {/* Right Top Header Actions */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Listener counter pill */}
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
                <Users className="w-3.5 h-3.5 text-[#e5b45f]" />
                <span>
                  <strong className="text-white font-semibold">{stationState.listeners_count.toLocaleString()}</strong> {stationState.listeners_count === 1 ? 'oyente ahora' : 'oyentes ahora'}
                </span>
              </div>

              {/* Pedir una canción button */}
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold text-black bg-gradient-to-r from-[#e5b45f] to-[#f3c87a] hover:from-[#f3c87a] hover:to-[#e5b45f] shadow-lg shadow-[#e5b45f]/25 transition-all transform active:scale-95"
              >
                <Music className="w-4 h-4 fill-current" />
                <span>Pedir una canción</span>
              </button>
            </div>
          </header>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="lg:hidden p-4 bg-[#0d0f14] border-b border-white/10 space-y-2 animate-in slide-in-from-top-4 duration-200">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-[#e5b45f] bg-[#e5b45f]/15"
              >
                <Radio className="w-4 h-4" />
                En vivo
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-gray-400"
              >
                <Calendar className="w-4 h-4" />
                Programación
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsChatOpen(true);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-[#e5b45f]" />
                  Chat en vivo
                </div>
                {unreadChatCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#e5b45f] text-black text-[10px] font-bold">
                    {unreadChatCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsRequestModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-[#e5b45f] bg-[#e5b45f]/10 border border-[#e5b45f]/20 hover:bg-[#e5b45f]/20 transition-all"
              >
                <Music className="w-4 h-4 text-[#e5b45f]" />
                Pedir una canción
              </button>
              <Link
                href="/studio/login"
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-sm text-gray-400 hover:text-[#e5b45f]"
              >
                <span>Acceso NEXO Studio</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Main Stage Grid */}
          <main className="flex-1 flex flex-col justify-between p-4 sm:p-8">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">
              {/* Left Column Slogan (Desktop) */}
              <div className="hidden xl:block xl:col-span-3 space-y-3">
                <h1 className="text-2xl font-bold tracking-tight text-white leading-tight uppercase">
                  Más que <br />
                  música, <br />
                  somos <br />
                  <span className="text-[#e5b45f]">conexión.</span>
                </h1>
                <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
                  Sintoniza la frecuencia de tus momentos. Transmisión continua en alta definición.
                </p>
              </div>

              {/* Center Vinyl & Live Radio Player */}
              <div className="xl:col-span-6 flex flex-col items-center">
                {/* Mobile Slogan */}
                <div className="xl:hidden text-center mb-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
                    Más que música, somos <span className="text-[#e5b45f]">conexión.</span>
                  </h1>
                </div>

                <PublicPlayer onOpenRequestModal={() => setIsRequestModalOpen(true)} />
              </div>

              {/* Right Column (Desktop Chat & Next Programs) */}
              <div className="hidden xl:flex xl:col-span-3 flex-col gap-4">
                {/* Real-time Live Chat Widget */}
                <div className="rounded-2xl glass-panel border border-white/5 overflow-hidden flex flex-col h-[340px] shadow-xl">
                  <LiveChatView isCompact />
                </div>

                {/* Próximos Programas Widget */}
                <div className="rounded-2xl glass-panel p-4 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Próximos programas</span>
                    <span className="text-[10px] text-[#e5b45f] flex items-center gap-0.5 cursor-pointer hover:underline">
                      Ver programación <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-10 h-10 rounded-lg bg-neutral-800 overflow-hidden shrink-0">
                        <img src="/cover_default.webp" alt="NEXO Morning" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-[#e5b45f] font-medium">10:00 – 12:00</span>
                        <h4 className="font-semibold text-white truncate">NEXO Morning</h4>
                        <p className="text-[10px] text-gray-400 truncate">Tu dosis de buena energía</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-10 h-10 rounded-lg bg-neutral-800 overflow-hidden shrink-0">
                        <img src="/cover_default.webp" alt="NEXO Hits" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-[#e5b45f] font-medium">12:00 – 14:00</span>
                        <h4 className="font-semibold text-white truncate">NEXO Hits</h4>
                        <p className="text-[10px] text-gray-400 truncate">Los éxitos que te conectan</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* BOTTOM SECTION: ÚLTIMAS CANCIONES */}
            {/* ========================================================= */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Últimas canciones</h3>
                <span className="text-xs text-gray-400 hover:text-[#e5b45f] cursor-pointer flex items-center gap-1">
                  Ver historial <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {recentSongs.map((song, idx) => (
                  <div
                    key={song.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border shrink-0 min-w-[200px] transition-all ${
                      idx === 0
                        ? 'bg-[#e5b45f]/10 border-[#e5b45f]/40 shadow-sm shadow-[#e5b45f]/15'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-800">
                      <img
                        src={song.cover_url || '/cover_default.webp'}
                        alt={song.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/cover_default.webp';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-white truncate">{song.title}</h4>
                      <p className="text-[11px] text-gray-400 truncate">{song.artist}</p>
                      <span className="text-[10px] text-[#e5b45f]/80">
                        {idx === 0 ? 'Sonando ahora' : `Hace ${idx * 4} min`}
                      </span>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await radioStore.toggleFavorite(song.id);
                      }}
                      className={`p-1.5 rounded-lg transition-all active:scale-90 ${
                        song.is_favorite
                          ? 'text-rose-500 hover:text-rose-400 bg-rose-500/10'
                          : 'text-gray-500 hover:text-white hover:bg-white/5'
                      }`}
                      title={song.is_favorite ? 'Quitar de Favoritas' : 'Guardar en Favoritas'}
                      aria-label={song.is_favorite ? 'Quitar de Favoritas' : 'Guardar en Favoritas'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${song.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </main>

          {/* Mobile Bottom Navigation Bar (Matching 02_nexo_radio_inicio_mobile.png) */}
          <nav className="lg:hidden flex items-center justify-around py-3 px-2 glass-panel border-t border-white/10 sticky bottom-0 z-30">
            <button className="flex flex-col items-center gap-1 text-[#e5b45f]">
              <Radio className="w-5 h-5" />
              <span className="text-[10px] font-medium">Inicio</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-gray-400">
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] font-medium">Programación</span>
            </button>
            <button
              onClick={() => setIsChatOpen(true)}
              className="relative flex flex-col items-center gap-1 text-gray-400 hover:text-[#e5b45f] transition-colors"
            >
              <div className="relative">
                <MessageSquare className="w-5 h-5" />
                {unreadChatCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-[#e5b45f] text-black text-[9px] font-bold animate-pulse">
                    {unreadChatCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">Chat</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-gray-400">
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-medium">Comunidad</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Live Chat Drawer (Mobile / Tablet / Full modal) */}
      <LiveChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* Song Request Modal */}
      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </div>
  );
}
