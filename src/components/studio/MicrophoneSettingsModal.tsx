'use client';

import React, { useState, useEffect } from 'react';
import {
  Mic,
  Sliders,
  Sparkles,
  Volume2,
  X,
  Check,
  ShieldCheck,
  Headphones,
  Settings2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { AudioLevels } from '@/lib/types';

interface MicrophoneSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MicrophoneSettingsModal({ isOpen, onClose }: MicrophoneSettingsModalProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [micMode, setMicMode] = useState<'studio' | 'standard'>('studio');
  const [broadcastEnhance, setBroadcastEnhance] = useState<boolean>(true);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(false);
  const [hasPrompted, setHasPrompted] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const engineState = audioEngine.getState();
    setSelectedDevice(engineState.selectedDeviceId || '');
    setMicMode(engineState.micMode || 'studio');
    setBroadcastEnhance(engineState.broadcastEnhance !== false);

    loadDevices();
  }, [isOpen]);

  // Live microphone test stream when modal is open
  useEffect(() => {
    if (!isOpen) {
      setMicLevel(0);
      return;
    }

    let isCancelled = false;
    let testStream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let animId: number | null = null;

    const startTest = async () => {
      try {
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: micMode === 'standard',
          noiseSuppression: micMode === 'standard',
          autoGainControl: false,
        };

        if (selectedDevice) {
          audioConstraints.deviceId = { ideal: selectedDevice };
        }

        testStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });

        if (isCancelled) {
          testStream.getTracks().forEach((t) => t.stop());
          return;
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') {
          try { await audioCtx.resume(); } catch {}
        }

        const source = audioCtx.createMediaStreamSource(testStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(32);
        const loop = () => {
          if (isCancelled) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Scale so conversational voice fills 20% - 85%
          const level = Math.min(100, Math.round((avg / 255) * 100 * 2.8));
          setMicLevel(level);
          animId = requestAnimationFrame(loop);
        };

        loop();
      } catch (err) {
        console.warn('Live mic test error:', err);
      }
    };

    startTest();

    return () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
      if (testStream) {
        testStream.getTracks().forEach((t) => t.stop());
      }
      if (audioCtx) {
        try { audioCtx.close(); } catch {}
      }
      setMicLevel(0);
    };
  }, [isOpen, selectedDevice, micMode]);

  const loadDevices = async () => {
    setIsLoadingDevices(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach((t) => t.stop());
          setHasPrompted(true);
        } catch {}
      }

      const audioDevices = await audioEngine.getAudioInputDevices();
      setDevices(audioDevices);

      const engineState = audioEngine.getState();
      if (engineState.selectedDeviceId) {
        setSelectedDevice(engineState.selectedDeviceId);
      } else if (audioDevices.length > 0) {
        setSelectedDevice(audioDevices[0].deviceId);
      }
    } catch (e) {
      console.warn('Error loading audio devices:', e);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDevice(deviceId);
    await audioEngine.setAudioInputDevice(deviceId);
  };

  const handleModeChange = async (mode: 'studio' | 'standard') => {
    setMicMode(mode);
    await audioEngine.setMicMode(mode);
  };

  const handleEnhanceToggle = (enabled: boolean) => {
    setBroadcastEnhance(enabled);
    audioEngine.setBroadcastEnhance(enabled);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0e1117] border border-white/10 shadow-2xl p-6 overflow-hidden flex flex-col space-y-6 z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e5b45f]/15 border border-[#e5b45f]/30 flex items-center justify-center text-[#e5b45f]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Calidad de Micrófono & Estudio
              </h3>
              <p className="text-xs text-gray-400">
                Optimiza la fidelidad de tu voz para transmisión en vivo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Selector de Dispositivo de Entrada */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Mic className="w-3.5 h-3.5 text-[#e5b45f]" />
              Dispositivo de Entrada
            </label>
            <button
              onClick={loadDevices}
              disabled={isLoadingDevices}
              className="text-[11px] text-[#e5b45f] hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingDevices ? 'animate-spin' : ''}`} />
              <span>Detectar de nuevo</span>
            </button>
          </div>

          <div className="relative">
            <select
              value={selectedDevice}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-[#e5b45f] transition-all cursor-pointer"
            >
              {devices.length === 0 ? (
                <option value="">Micrófono predeterminado de Windows</option>
              ) : (
                devices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Micrófono ${idx + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>
          <p className="text-[11px] text-gray-500">
            Asegúrate de seleccionar tu micrófono externo o interfaz (USB/XLR) y no el micrófono integrado de la laptop o webcam.
          </p>
        </div>

        {/* 2. Perfil de Procesamiento de Audio */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-[#e5b45f]" />
            Modo de Captura en Navegador
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Modo Estudio Puro */}
            <button
              type="button"
              onClick={() => handleModeChange('studio')}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                micMode === 'studio'
                  ? 'bg-[#e5b45f]/15 border-[#e5b45f] text-white shadow-lg shadow-[#e5b45f]/10'
                  : 'bg-white/[0.03] border-white/5 hover:border-white/20 text-gray-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Headphones className="w-4 h-4 text-[#e5b45f]" />
                    Estudio Puro 48kHz
                  </span>
                  {micMode === 'studio' && (
                    <span className="w-4 h-4 rounded-full bg-[#e5b45f] text-black flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  <strong className="text-amber-300">Recomendado.</strong> Desactiva los filtros telefónicos de Chrome. Sonido natural, cristalino y con todo el cuerpo de tu micrófono.
                </p>
              </div>
              <span className="text-[10px] text-[#e5b45f] font-semibold mt-2">
                Ideal con audífonos
              </span>
            </button>

            {/* Modo Cancelación */}
            <button
              type="button"
              onClick={() => handleModeChange('standard')}
              className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                micMode === 'standard'
                  ? 'bg-rose-500/15 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                  : 'bg-white/[0.03] border-white/5 hover:border-white/20 text-gray-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-rose-400" />
                    Supresión de Ruido
                  </span>
                  {micMode === 'standard' && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  Filtros de llamada de Chrome. Suprime ruidos fuertes o eco si hablas por altavoces, pero reduce la fidelidad vocal.
                </p>
              </div>
              <span className="text-[10px] text-gray-500 font-semibold mt-2">
                Ambientes con mucho ruido
              </span>
            </button>
          </div>
        </div>

        {/* 3. Procesador Broadcast NEXO (EQ + Compresión) */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
          <div className="space-y-0.5 max-w-[80%]">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#e5b45f]" />
              <span className="text-xs font-bold text-white">
                Procesador de Voz NEXO Broadcast
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Añade calidez a 220Hz, brillo en 3.8kHz, corte de graves de mesa en 75Hz y compresión suave para voz de locutor profesional.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={broadcastEnhance}
              onChange={(e) => handleEnhanceToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e5b45f]"></div>
          </label>
        </div>

        {/* 4. Vúmetro de Prueba en Vivo */}
        <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium flex items-center gap-1.5">
              <Volume2 className={`w-4 h-4 transition-colors ${micLevel > 4 ? 'text-emerald-400 animate-pulse' : 'text-[#e5b45f]'}`} />
              <span>Prueba de Micrófono en Vivo:</span>
            </span>
            <span className={`font-mono text-xs font-bold transition-colors ${micLevel > 4 ? 'text-emerald-400' : 'text-gray-400'}`}>
              {micLevel > 4 ? `${micLevel}% ● Señal detectada` : 'Habla al micrófono para probar...'}
            </span>
          </div>
          <div className="h-3 w-full bg-neutral-900 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-white/5">
            {[...Array(28)].map((_, i) => {
              const isActive = (micLevel / 100) * 28 > i;
              const isPeak = i > 22;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm transition-all duration-75 ${
                    isActive
                      ? isPeak
                        ? 'bg-rose-500 shadow-sm shadow-rose-500/60'
                        : i > 17
                        ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                        : 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : 'bg-neutral-800/80'
                  }`}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-gray-500">
            {micLevel > 4
              ? '✅ ¡Excelente! La barra responde a tu voz. Tu micrófono está activo y calibrado.'
              : 'Di algo frente al micrófono ("1, 2, 3 probando") para ver las barras moverse en verde/amarillo.'}
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#e5b45f] text-black font-bold text-xs hover:bg-[#f3c87a] transition-all shadow-lg shadow-[#e5b45f]/20"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
