'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function StudioLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already logged in, redirect straight to studio
  useEffect(() => {
    const checkSession = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          router.replace('/studio');
          return;
        }
      }
      const local = typeof window !== 'undefined' ? localStorage.getItem('nexo_studio_session') : null;
      if (local && !isSupabaseConfigured) {
        router.replace('/studio');
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message === 'Invalid login credentials' 
          ? 'Correo o contraseña incorrectos. Verifica tus datos de Supabase.'
          : error.message);
        setIsLoading(false);
        return;
      }

      if (data && data.user) {
        localStorage.setItem('nexo_studio_session', JSON.stringify({
          email: data.user.email,
          role: 'locutor',
          name: data.user.user_metadata?.name || 'Locutor NEXO',
        }));
      }
    } else {
      // Local session simulation for developer / testing
      localStorage.setItem('nexo_studio_session', JSON.stringify({
        email: email || 'admin@nexoradio.com',
        role: 'locutor',
        name: 'NEXO RADIO',
      }));
    }

    router.replace('/studio');
  };

  const handleQuickDemo = () => {
    localStorage.setItem('nexo_studio_session', JSON.stringify({
      email: 'locutor@nexoradio.com',
      role: 'locutor',
      name: 'NEXO RADIO Locutor',
    }));
    router.replace('/studio');
  };

  return (
    <div className="min-h-screen bg-[#090a0d] flex flex-col md:flex-row font-sans">
      {/* Left Column Graphic & Studio Branding */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-3/5 bg-neutral-950 flex-col justify-between p-12 overflow-hidden border-r border-white/5">
        {/* Background Studio Graphic */}
        <div
          className="absolute inset-0 bg-cover bg-center filter brightness-60"
          style={{ backgroundImage: `url('/bg_nexo_studio.webp')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Top Logo */}
        <div className="relative z-10">
          <img
            src="/logo_nexo_radio.png"
            alt="NEXO RADIO"
            className="h-10 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(229,180,95,0.4)]"
          />
        </div>

        {/* Bottom Slogan */}
        <div className="relative z-10 max-w-lg space-y-4">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            Tu radio. <br />
            <span className="text-[#e5b45f]">Sin límites.</span>
          </h1>
          <p className="text-sm lg:text-base text-gray-300">
            Gestiona tu programación, conecta con tu audiencia y lleva tu emisora al siguiente nivel.
          </p>
        </div>
      </div>

      {/* Right Column Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8 glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 shadow-2xl">
          {/* Logo & Heading */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <img
                src="/isotipo_nexo.png"
                alt="NEXO"
                className="h-12 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(229,180,95,0.5)]"
              />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Bienvenido de nuevo</h2>
            <p className="text-xs text-gray-400">Inicia sesión para acceder a tu cabina de control.</p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#e5b45f] transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#e5b45f] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-black/40 border-white/20 text-[#e5b45f] focus:ring-0"
                />
                <span>Recordarme</span>
              </label>
              <a href="#" className="text-[#e5b45f] hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-[#e5b45f] to-[#f3c87a] hover:from-[#f3c87a] hover:to-[#e5b45f] shadow-lg shadow-[#e5b45f]/25 transition-all transform active:scale-98 disabled:opacity-50"
            >
              <span>{isLoading ? 'Verificando...' : 'Iniciar sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access (Solo para desarrollo local sin Supabase) */}
          {!isSupabaseConfigured && (
            <div className="pt-2">
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0e1015] px-3 text-[11px] text-gray-500 uppercase">o</span>
              </div>

              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#e5b45f]/40 transition-all flex items-center justify-center gap-2"
              >
                <span>Acceso directo modo demostración (Locutor)</span>
              </button>
            </div>
          )}

          <div className="text-center text-xs text-gray-500 pt-2">
            ¿No tienes una cuenta?{' '}
            <span className="text-[#e5b45f] cursor-pointer hover:underline">
              Contacta al administrador
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
