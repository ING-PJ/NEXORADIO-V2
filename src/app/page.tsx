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
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  Heart,
  PanelRightClose,
  Sparkles,
} from 'lucide-react';
import PublicPlayer from '@/components/public/PublicPlayer';
import RequestModal from '@/components/public/RequestModal';
import { LiveChatView, LiveChatDrawer } from '@/components/public/LiveChat';
import ScheduleView, { ScheduleDrawer } from '@/components/public/ScheduleView';
import { radioStore } from '@/lib/radioStore';
import { chatStore } from '@/lib/chatStore';
import { Song, StationState } from '@/lib/types';

export default function NexoRadioPublicPage() {
  const [stationState, setStationState] = useState<StationState>(radioStore.getStationState());
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDesktopChatVisible, setIsDesktopChatVisible] = useState(true);
  const [desktopPanelTab, setDesktopPanelTab] = useState<'chat' | 'schedule'>('chat');
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
    <div className="relative h-screen bg-[#07080b] text-[#f3f4f6] flex flex-col font-sans overflow-hidden">
      {/* Background Graphic */}
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none opacity-45 mix-blend-screen"
        style={{ backgroundImage: `url('/bg_nexo_radio.webp')` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#07080b]/70 via-[#07080b]/85 to-[#07080b] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 glass-panel-subtle shrink-0">
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
        <div className="hidden lg:flex items-center relative w-72 xl:w-96">
          <Search className="w-4 h-4 absolute left-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar canciones, artistas o programas..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#e5b45f]/60 transition-colors"
          />
        </div>

        {/* Right Top Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Listener counter pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
            <Users className="w-3.5 h-3.5 text-[#e5b45f]" />
            <span>
              <strong suppressHydrationWarning className="text-white font-semibold">{stationState.listeners_count.toLocaleString()}</strong> {stationState.listeners_count === 1 ? 'oyente' : 'oyentes'}
            </span>
          </div>

          {/* Desktop Toggle Chat Panel Button */}
          <button
            onClick={() => setIsDesktopChatVisible((prev) => !prev)}
            className={`hidden lg:flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
              isDesktopChatVisible
                ? 'bg-[#e5b45f]/15 border-[#e5b45f]/30 text-[#e5b45f] hover:bg-[#e5b45f]/25 shadow-sm shadow-[#e5b45f]/15'
                : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
            title={isDesktopChatVisible ? 'Ocultar panel interactivo' : 'Mostrar panel interactivo (Chat / Programación)'}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#e5b45f]" />
            <span>{isDesktopChatVisible ? 'Ocultar chat' : 'Mostrar chat'}</span>
            {unreadChatCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#e5b45f] text-black text-[10px] font-bold">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Discord Button */}
          <a
            href="https://discord.gg/9AksstuAC"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-semibold text-white bg-[#5865F2] hover:bg-[#4752c4] shadow-md shadow-[#5865F2]/25 transition-all transform active:scale-95 shrink-0"
            title="Únete a nuestro servidor oficial de Discord"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>Discord</span>
          </a>

          {/* Pedir una canción button */}
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold text-black bg-gradient-to-r from-[#e5b45f] to-[#f3c87a] hover:from-[#f3c87a] hover:to-[#e5b45f] shadow-lg shadow-[#e5b45f]/25 transition-all transform active:scale-95 shrink-0 cursor-pointer"
          >
            <Music className="w-3.5 h-3.5 fill-current" />
            <span>Pedir canción</span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden p-4 bg-[#0d0f14] border-b border-white/10 space-y-2 animate-in slide-in-from-top-4 duration-200 z-40 relative">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-[#e5b45f] bg-[#e5b45f]/15"
          >
            <Radio className="w-4 h-4" />
            En vivo
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsScheduleModalOpen(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-gray-400 hover:text-white"
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
          <a
            href="https://discord.gg/9AksstuAC"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-sm text-[#5865F2] bg-[#5865F2]/10 border border-[#5865F2]/20"
          >
            <span>Unirse a Discord</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <Link
            href="/studio/login"
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-sm text-gray-400 hover:text-[#e5b45f]"
          >
            <span>Acceso NEXO Studio</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Main Body Workspace (Height: Remaining Viewport) */}
      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
        {/* ========================================================= */}
        {/* DESKTOP LEFT SIDEBAR */}
        {/* ========================================================= */}
        <aside className="hidden lg:flex flex-col justify-between w-60 xl:w-64 p-5 glass-panel border-r border-white/5 shrink-0 overflow-y-auto">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <img
                src="/logo_nexo_radio.png"
                alt="NEXO RADIO"
                className="h-9 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(229,180,95,0.4)]"
              />
            </div>

            {/* Navigation */}
            <nav className="space-y-1.5">
              <button
                onClick={() => {
                  setDesktopPanelTab('chat');
                  setIsDesktopChatVisible(true);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  desktopPanelTab === 'chat' && isDesktopChatVisible
                    ? 'text-[#e5b45f] bg-[#e5b45f]/15 border border-[#e5b45f]/30 shadow-sm shadow-[#e5b45f]/20 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Radio className="w-4 h-4 text-[#e5b45f]" />
                En vivo
              </button>

              <button
                onClick={() => {
                  setDesktopPanelTab('schedule');
                  setIsDesktopChatVisible(true);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  desktopPanelTab === 'schedule' && isDesktopChatVisible
                    ? 'text-[#e5b45f] bg-[#e5b45f]/15 border border-[#e5b45f]/30 shadow-sm shadow-[#e5b45f]/20 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Programación
              </button>

              <button
                onClick={() => {
                  setDesktopPanelTab('chat');
                  setIsDesktopChatVisible(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-[#e5b45f]" />
                  <span>Chat en vivo</span>
                </div>
                {unreadChatCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#e5b45f] text-black text-[10px] font-bold">
                    {unreadChatCount}
                  </span>
                )}
              </button>

              {/* Discord Link */}
              <a
                href="https://discord.gg/9AksstuAC"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm text-gray-400 hover:text-white hover:bg-[#5865F2]/15 hover:border-[#5865F2]/30 border border-transparent transition-all group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-[#5865F2] fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span>Discord</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30">
                  Unirse
                </span>
              </a>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <Link
              href="/studio/login"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-[#e5b45f] bg-white/5 hover:bg-[#e5b45f]/10 border border-white/5 hover:border-[#e5b45f]/30 transition-all"
            >
              <span>Acceso NEXO Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <div className="text-[10px] tracking-widest uppercase text-gray-500 font-semibold text-center">
              DONDE TODO CONECTA
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* CENTER STAGE & REORGANIZED RIGHT CHAT HUB */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col lg:flex-row min-w-0 h-full overflow-hidden">
          {/* Main Stage (Vinyl Player, Tagline & Recent Tracks) */}
          <main className="flex-1 flex flex-col justify-between p-4 sm:p-5 lg:p-6 overflow-y-auto scrollbar-thin">
            {/* Top Stage Tagline & Station Slogan */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e5b45f] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e5b45f]"></span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#e5b45f] tracking-widest uppercase">
                    Señal Oficial en Vivo · Frecuencia HD
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase leading-tight">
                  Más que música, somos <span className="text-[#e5b45f]">conexión.</span>
                </h1>
              </div>

              {/* Quick Program Pill */}
              <button
                onClick={() => {
                  setDesktopPanelTab('schedule');
                  setIsDesktopChatVisible(true);
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setIsScheduleModalOpen(true);
                  }
                }}
                className="self-start sm:self-center flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#e5b45f]/10 border border-white/10 hover:border-[#e5b45f]/30 transition-all text-left group shrink-0 cursor-pointer"
                title="Ver programación completa"
              >
                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-neutral-800 border border-white/10">
                  <img src="/cover_default.webp" alt="NEXO Morning" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="text-[9px] text-[#e5b45f] font-semibold flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    Al aire · 10:00 – 12:00
                  </span>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#e5b45f] transition-colors truncate max-w-[140px]">
                    NEXO Morning
                  </h4>
                </div>
                <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-[#e5b45f] transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Center Vinyl & Live Radio Player */}
            <div className="my-auto py-1 sm:py-2 flex flex-col items-center justify-center">
              <PublicPlayer onOpenRequestModal={() => setIsRequestModalOpen(true)} />
            </div>

            {/* ========================================================= */}
            {/* BOTTOM SECTION: ÚLTIMAS CANCIONES */}
            {/* ========================================================= */}
            <div className="mt-3 pt-3 border-t border-white/5 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-semibold text-white">Últimas canciones</h3>
                <span className="text-xs text-gray-400 hover:text-[#e5b45f] cursor-pointer flex items-center gap-1">
                  Historial de emisión <ChevronRight className="w-3 h-3" />
                </span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-none">
                {recentSongs.map((song, idx) => (
                  <div
                    key={song.id}
                    className={`flex items-center gap-3 p-2 rounded-xl border shrink-0 min-w-[200px] transition-all ${
                      idx === 0
                        ? 'bg-[#e5b45f]/10 border-[#e5b45f]/40 shadow-sm shadow-[#e5b45f]/15'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-neutral-800">
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
                      <p className="text-[10px] text-gray-400 truncate">{song.artist}</p>
                      <span className="text-[9px] text-[#e5b45f]/80">
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

          {/* ========================================================= */}
          {/* RIGHT INTERACTIVE HUB: DESKTOP CHAT & SCHEDULE (FULL HEIGHT) */}
          {/* ========================================================= */}
          {isDesktopChatVisible && (
            <aside className="hidden lg:flex flex-col w-[380px] xl:w-[420px] 2xl:w-[460px] h-full shrink-0 border-l border-white/10 bg-[#080a0e]/95 backdrop-blur-2xl z-20 shadow-2xl animate-in slide-in-from-right-4 duration-300">
              {/* Unified Header & Tab Switcher */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.02] shrink-0">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setDesktopPanelTab('chat')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      desktopPanelTab === 'chat'
                        ? 'bg-[#e5b45f] text-black shadow-md font-bold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat en vivo</span>
                    {unreadChatCount > 0 && desktopPanelTab !== 'chat' && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#e5b45f] text-black text-[9px] font-bold">
                        {unreadChatCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setDesktopPanelTab('schedule')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      desktopPanelTab === 'schedule'
                        ? 'bg-[#e5b45f] text-black shadow-md font-bold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Programación</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://discord.gg/9AksstuAC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#5865F2]/20 hover:bg-[#5865F2] text-[#5865F2] hover:text-white border border-[#5865F2]/30 text-[11px] font-semibold transition-all shadow-sm"
                    title="Servidor de Discord"
                  >
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span>Discord</span>
                  </a>

                  {/* Collapse Button */}
                  <button
                    onClick={() => setIsDesktopChatVisible(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Ocultar panel lateral"
                  >
                    <PanelRightClose className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Panel Body: Full Height message feed or schedule without double header */}
              <div className="flex-1 min-h-0 overflow-hidden relative">
                {desktopPanelTab === 'chat' ? (
                  <LiveChatView hideHeader onClose={() => setIsDesktopChatVisible(false)} />
                ) : (
                  <ScheduleView hideHeader onClose={() => setIsDesktopChatVisible(false)} />
                )}
              </div>
            </aside>
          )}

          {/* Floating Re-Open Chat Pill (When collapsed on Desktop) */}
          {!isDesktopChatVisible && (
            <div className="hidden lg:block fixed bottom-6 right-6 z-30 animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => {
                  setDesktopPanelTab('chat');
                  setIsDesktopChatVisible(true);
                }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#e5b45f] to-[#f3c87a] hover:from-[#f3c87a] hover:to-[#e5b45f] text-black font-bold text-xs uppercase tracking-wider shadow-2xl shadow-[#e5b45f]/30 active:scale-95 transition-all border border-[#e5b45f]/50 cursor-pointer"
                title="Abrir chat en vivo"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Abrir Chat</span>
                {unreadChatCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-black text-[#e5b45f] text-[10px] font-black">
                    {unreadChatCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden flex items-center justify-around py-3 px-2 glass-panel border-t border-white/10 sticky bottom-0 z-30 shrink-0">
        <button
          onClick={() => {
            setIsChatOpen(false);
            setIsScheduleModalOpen(false);
          }}
          className="flex flex-col items-center gap-1 text-[#e5b45f]"
        >
          <Radio className="w-5 h-5" />
          <span className="text-[10px] font-medium">Inicio</span>
        </button>
        <button
          onClick={() => setIsScheduleModalOpen(true)}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#e5b45f] transition-colors"
        >
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
              <span className="px-1.5 py-0.2 rounded-full bg-[#e5b45f] text-black text-[9px] font-bold animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Chat</span>
        </button>
        <a
          href="https://discord.gg/9AksstuAC"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#5865F2] transition-colors"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span className="text-[10px] font-medium">Discord</span>
        </a>
      </nav>

      {/* Live Chat Drawer (Mobile / Tablet) */}
      <LiveChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* Schedule Drawer (Mobile / Tablet) */}
      <ScheduleDrawer
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />

      {/* Song Request Modal */}
      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </div>
  );
}
