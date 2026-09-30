'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Mic,
  Music2,
  ListMusic,
  Calendar,
  BarChart3,
  Settings,
  Radio,
  LogOut,
  ExternalLink,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { audioEngine } from '@/lib/audioEngine';
import { radioStore } from '@/lib/radioStore';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState('Locutor');
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Restore sidebar collapsed preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexo_studio_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexo_studio_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  // Subscribe to audio engine interaction state and incoming requests
  useEffect(() => {
    const unsub = audioEngine.subscribe(() => {
      setNeedsUserInteraction(audioEngine.getState().needsUserInteraction);
    });

    const updateRequests = async () => {
      try {
        const reqs = await radioStore.getRequests();
        const pending = reqs.filter((r) => r.status === 'pending');
        setPendingRequestsCount(pending.length);
      } catch {}
    };

    updateRequests();
    const unsubRequests = radioStore.subscribe(updateRequests);

    return () => {
      unsub();
      unsubRequests();
    };
  }, []);

  // Restore music transmission when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      audioEngine.restoreSession();
      // Ensure microphone is definitely off the air on studio reload
      radioStore.updateStationState({ is_mic_active: false });
    }
  }, [isAuthenticated]);

  // Verify authentication on all /studio routes except /studio/login
  useEffect(() => {
    if (pathname === '/studio/login') {
      setIsCheckingAuth(false);
      return;
    }

    const verifySession = async () => {
      // 1. Check Supabase Auth session
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || 'Locutor');
          setIsCheckingAuth(false);
          return;
        }
      }

      // 2. Check local fallback session
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('nexo_studio_session');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setIsAuthenticated(true);
            setUserEmail(parsed.email || 'Locutor');
            setIsCheckingAuth(false);
            return;
          } catch {}
        }
      }

      // 3. Not authenticated -> Redirect to login page
      setIsAuthenticated(false);
      setIsCheckingAuth(false);
      router.replace('/studio/login');
    };

    verifySession();
  }, [pathname, router]);

  // If on login page, don't show the dashboard shell
  if (pathname === '/studio/login') {
    return <>{children}</>;
  }

  // Show sleek dark loader while verifying auth
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#090a0d]">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/isotipo_nexo.png"
            alt="NEXO"
            className="h-12 w-auto animate-pulse filter drop-shadow-[0_0_15px_rgba(229,180,95,0.6)]"
          />
          <div className="w-6 h-6 border-2 border-[#e5b45f] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // If not authenticated and not yet redirected, block content
  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('nexo_studio_session');
    router.replace('/studio/login');
  };

  const navItems: { label: string; href: string; icon: any; match: string[]; disabled?: boolean }[] = [
    { label: 'Cabina', href: '/studio', icon: Mic, match: ['/studio', '/studio/live'] },
    { label: 'Biblioteca', href: '/studio/library', icon: Music2, match: ['/studio/library', '/studio/upload'] },
    { label: 'Playlists', href: '/studio/playlists', icon: ListMusic, match: ['/studio/playlists'] },
    { label: 'Solicitudes', href: '/studio/requests', icon: Inbox, match: ['/studio/requests'] },
    { label: 'Programación', href: '#', icon: Calendar, match: [], disabled: true },
    { label: 'Reportes', href: '#', icon: BarChart3, match: [], disabled: true },
    { label: 'Configuración', href: '#', icon: Settings, match: [], disabled: true },
  ];

  return (
    <div className="flex h-screen bg-[#090a0d] text-[#f3f4f6] font-sans overflow-hidden">
      {/* ========================================================= */}
      {/* STUDIO SIDEBAR */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* STUDIO SIDEBAR (COLLAPSIBLE) */}
      {/* ========================================================= */}
      <aside
        className={`${
          isCollapsed ? 'w-20 px-2.5 py-4' : 'w-64 p-5'
        } glass-panel border-r border-white/5 flex flex-col justify-between shrink-0 z-20 transition-all duration-300 ease-in-out select-none`}
      >
        <div>
          {/* Logo & Toggle Header */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3 mb-6">
              <Link href="/studio" title="NEXO Studio">
                <img
                  src="/isotipo_nexo.png"
                  alt="NEXO"
                  className="h-8 w-auto filter drop-shadow-[0_0_10px_rgba(229,180,95,0.5)] hover:scale-105 transition-transform"
                />
              </Link>
              <button
                onClick={toggleCollapse}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all shadow-sm"
                title="Expandir menú lateral"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 mb-8">
              <Link href="/studio" className="flex items-center gap-3 px-1 min-w-0">
                <img
                  src="/isotipo_nexo.png"
                  alt="NEXO"
                  className="h-8 w-auto filter drop-shadow-[0_0_10px_rgba(229,180,95,0.5)] shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-extrabold tracking-wider text-white truncate">
                    NEXO
                  </span>
                  <span className="text-[10px] tracking-[0.25em] text-[#e5b45f] font-semibold uppercase -mt-1 truncate">
                    STUDIO
                  </span>
                </div>
              </Link>
              <button
                onClick={toggleCollapse}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all shrink-0"
                title="Plegar menú lateral (más espacio)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.match.includes(pathname);

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    className={`flex items-center ${
                      isCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5'
                    } rounded-xl text-xs font-medium text-gray-600 cursor-not-allowed opacity-40`}
                    title={`${item.label} (Próximamente)`}
                  >
                    <Icon className="w-4 h-4" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`relative flex items-center ${
                    isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                  } rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'text-black bg-[#e5b45f] font-semibold shadow-md shadow-[#e5b45f]/25'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>

                  {item.href === '/studio/requests' && pendingRequestsCount > 0 && (
                    isCollapsed ? (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse border border-[#090a0d]">
                        {pendingRequestsCount}
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-black text-[#e5b45f]' : 'bg-[#e5b45f] text-black shadow-sm'
                        }`}
                      >
                        {pendingRequestsCount}
                      </span>
                    )
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer & User Profile */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          {/* Public View Link */}
          {isCollapsed ? (
            <Link
              href="/"
              target="_blank"
              title="Vista pública"
              className="flex items-center justify-center p-2.5 rounded-xl text-gray-400 hover:text-[#e5b45f] bg-white/5 hover:bg-[#e5b45f]/10 border border-white/5 transition-all"
            >
              <Radio className="w-4 h-4 text-[#e5b45f]" />
            </Link>
          ) : (
            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-[#e5b45f] bg-white/5 hover:bg-[#e5b45f]/10 border border-white/5 transition-all"
            >
              <span className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-[#e5b45f]" />
                Vista pública
              </span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}

          {/* Profile Card */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 pt-1">
              <div
                className="w-8 h-8 rounded-full bg-neutral-800 border border-[#e5b45f]/40 flex items-center justify-center text-xs font-bold text-[#e5b45f]"
                title="NEXO RADIO (Locutor)"
              >
                NR
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-[#e5b45f]/40 flex items-center justify-center text-xs font-bold text-[#e5b45f] shrink-0">
                  NR
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">NEXO RADIO</h4>
                  <p className="text-[10px] text-gray-400">Locutor</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Studio Work Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#07080b]">
        {/* Autoplay / Resume Notification Banner if browser restricts audio on refresh */}
        {needsUserInteraction && (
          <div
            onClick={() => audioEngine.resumeFromGesture()}
            className="w-full bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 text-white px-4 py-2.5 text-center text-xs font-bold cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-xl sticky top-0 z-50 animate-pulse border-b border-white/10"
          >
            <Radio className="w-4 h-4 text-white animate-spin" />
            <span>Página de studio actualizada. Haz clic aquí o en cualquier parte para continuar la transmisión en vivo</span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
