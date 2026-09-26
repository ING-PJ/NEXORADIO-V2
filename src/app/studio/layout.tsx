'use client';

import React from 'react';
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
  Inbox
} from 'lucide-react';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // If on login page, don't show the dashboard shell
  if (pathname === '/studio/login') {
    return <>{children}</>;
  }

  const handleLogout = () => {
    localStorage.removeItem('nexo_studio_session');
    router.push('/studio/login');
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
      <aside className="w-64 glass-panel border-r border-white/5 flex flex-col justify-between p-5 shrink-0 z-20">
        <div>
          {/* Logo Header */}
          <Link href="/studio" className="flex items-center gap-3 mb-8 px-2">
            <img
              src="/isotipo_nexo.png"
              alt="NEXO"
              className="h-8 w-auto filter drop-shadow-[0_0_10px_rgba(229,180,95,0.5)]"
            />
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-wider text-white">NEXO</span>
              <span className="text-[10px] tracking-[0.25em] text-[#e5b45f] font-semibold uppercase -mt-1">
                STUDIO
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.match.includes(pathname);

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-600 cursor-not-allowed"
                    title="Próximamente en futuras versiones"
                  >
                    <Icon className="w-4 h-4 opacity-40" />
                    <span>{item.label}</span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'text-black bg-[#e5b45f] font-semibold shadow-md shadow-[#e5b45f]/25'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer & User Profile */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-[#e5b45f] bg-white/5 hover:bg-[#e5b45f]/10 border border-white/5 transition-all"
          >
            <span className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-[#e5b45f]" />
              Vista pública
            </span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          {/* Profile Card */}
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
        </div>
      </aside>

      {/* Main Studio Work Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#07080b]">
        {children}
      </main>
    </div>
  );
}
