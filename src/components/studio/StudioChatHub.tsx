'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Music2,
  Send,
  Bell,
  BellOff,
  Radio,
  Check,
  CheckCircle2,
  Sparkles,
  User,
  ShieldCheck,
  ArrowDown,
  Smile,
  Mic,
  Plus,
  Volume2,
  Flame,
  Heart,
  X,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { chatStore } from '@/lib/chatStore';
import { radioStore } from '@/lib/radioStore';
import { audioEngine } from '@/lib/audioEngine';
import { soundEffects } from '@/lib/soundEffects';
import { ChatMessage, SongRequest, Song } from '@/lib/types';

interface StudioChatHubProps {
  className?: string;
  allSongs?: Song[];
  onSongQueued?: (songTitle: string) => void;
}

export function StudioChatHub({
  className = '',
  allSongs = [],
  onSongQueued,
}: StudioChatHubProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'solicitudes'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [inputText, setInputText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(soundEffects.isEnabled());
  const [isMicOnAir, setIsMicOnAir] = useState(audioEngine.getState().isMicOnAir);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [newMessagesBelow, setNewMessagesBelow] = useState(0);
  const [latestRequestAlert, setLatestRequestAlert] = useState<SongRequest | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFirstLoadRef = useRef(true);

  // Subscribe to chat, requests, audio engine & sound state
  useEffect(() => {
    // 1. Initial data
    setMessages(chatStore.getMessages());
    radioStore.getRequests().then((reqs) => setRequests(reqs));
    setSoundEnabled(soundEffects.isEnabled());
    setIsMicOnAir(audioEngine.getState().isMicOnAir);

    // 2. Chat store updates
    const unsubChat = chatStore.subscribe(() => {
      setMessages(chatStore.getMessages());
    });

    // 3. Incoming chat sound alert
    const unsubChatIncoming = chatStore.subscribeIncoming((msg) => {
      const micActive = audioEngine.getState().isMicOnAir;
      soundEffects.playChatSound(micActive);
    });

    // 4. Requests store updates
    const unsubRadio = radioStore.subscribe(async () => {
      const reqs = await radioStore.getRequests();
      setRequests(reqs);
    });

    // 5. Incoming song request sound alert & top banner
    const unsubReqIncoming = radioStore.subscribeToNewRequests((newReq) => {
      const micActive = audioEngine.getState().isMicOnAir;
      soundEffects.playRequestSound(micActive);
      setLatestRequestAlert(newReq);
      setTimeout(() => {
        setLatestRequestAlert((curr) => (curr?.id === newReq.id ? null : curr));
      }, 7000);
    });

    // 6. Audio engine mic status
    const unsubEngine = audioEngine.subscribe(() => {
      setIsMicOnAir(audioEngine.getState().isMicOnAir);
    });

    // 7. Sound effects mute state
    const unsubSound = soundEffects.subscribe((enabled) => {
      setSoundEnabled(enabled);
    });

    return () => {
      unsubChat();
      unsubChatIncoming();
      unsubRadio();
      unsubReqIncoming();
      unsubEngine();
      unsubSound();
    };
  }, []);

  // Auto-scroll logic
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = distanceFromBottom > 70;
    setIsScrolledUp(scrolledUp);
    if (!scrolledUp) {
      setNewMessagesBelow(0);
    }
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setIsScrolledUp(false);
    setNewMessagesBelow(0);
  };

  useEffect(() => {
    if (messages.length === 0) return;
    if (isFirstLoadRef.current) {
      scrollToBottom(false);
      isFirstLoadRef.current = false;
      return;
    }
    if (isScrolledUp) {
      setNewMessagesBelow((prev) => prev + 1);
    } else {
      scrollToBottom(true);
    }
  }, [messages.length]);

  // Send message as official DJ
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    try {
      await chatStore.sendMessage(text, { isDj: true });
      scrollToBottom(true);
    } catch (err) {
      console.error('Error sending message as DJ:', err);
    }
  };

  // Quick DJ responses
  const handleQuickShoutout = (phrase: string) => {
    chatStore.sendMessage(phrase, { isDj: true });
    scrollToBottom(true);
  };

  // Toggle sound alert
  const handleToggleSound = () => {
    soundEffects.toggle();
  };

  // Quick approve & queue a request
  const handleQueueRequest = (req: SongRequest) => {
    // 1. Try to find match in library
    const match = allSongs.find(
      (s) =>
        s.title.toLowerCase().includes(req.song_title.toLowerCase()) ||
        s.artist.toLowerCase().includes(req.artist.toLowerCase())
    );

    if (match) {
      radioStore.addToQueue(match);
      radioStore.updateRequestStatus(req.id, 'reviewed');
      if (onSongQueued) onSongQueued(match.title);
    } else {
      // Create temporary song item for queue
      const tempSong: Song = {
        id: 'req-song-' + Date.now(),
        title: req.song_title,
        artist: req.artist,
        genre: 'Solicitud',
        file_url: '/songs/summer.mp3',
        cover_url: '/cover_default.webp',
        duration: 210,
        play_count: 0,
        is_favorite: false,
        created_at: new Date().toISOString(),
      };
      radioStore.addToQueue(tempSong);
      radioStore.updateRequestStatus(req.id, 'reviewed');
      if (onSongQueued) onSongQueued(tempSong.title);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Ahora';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Ahora';
    }
  };

  const QUICK_DJ_SHOUTOUTS = [
    '🎙️ ¡En vivo por NEXO Radio!',
    '🔥 ¡Gracias por la sintonía!',
    '🎵 ¡Canción anotada para la cola!',
    '❤️ ¡Un gran abrazo a la cabina!',
    '✨ ¡Excelente vibra en el chat!',
  ];

  return (
    <div
      className={`rounded-3xl glass-panel border border-white/10 flex flex-col overflow-hidden shadow-2xl relative bg-[#090b0f]/85 backdrop-blur-2xl ${className}`}
    >
      {/* Top Banner Alert for Incoming Song Request */}
      {latestRequestAlert && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-r from-[#e5b45f] via-[#f3c87a] to-[#d9a149] text-black px-4 py-2.5 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1 rounded-lg bg-black/15">
              <Music2 className="w-4 h-4 text-black animate-bounce" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black truncate">
                ¡NUEVA SOLICITUD DE {latestRequestAlert.name.toUpperCase()}!
              </p>
              <p className="text-[11px] font-medium text-black/80 truncate">
                "{latestRequestAlert.song_title}" · {latestRequestAlert.artist}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={() => {
                setActiveTab('solicitudes');
                setLatestRequestAlert(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-black text-[#e5b45f] text-xs font-bold hover:bg-neutral-900 transition-colors shadow-sm"
            >
              Ver en lista
            </button>
            <button
              onClick={() => setLatestRequestAlert(null)}
              className="p-1 text-black/70 hover:text-black"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CABINA HUB HEADER */}
      {/* ========================================================= */}
      <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'chat'
                ? 'bg-[#e5b45f] text-black shadow-md shadow-[#e5b45f]/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Cabina</span>
            <span
              className={`w-2 h-2 rounded-full ${
                activeTab === 'chat' ? 'bg-black' : 'bg-emerald-400 animate-pulse'
              }`}
            />
          </button>

          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'solicitudes'
                ? 'bg-[#e5b45f] text-black shadow-md shadow-[#e5b45f]/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>Solicitudes</span>
            {pendingRequests.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'solicitudes'
                    ? 'bg-black text-[#e5b45f]'
                    : 'bg-rose-500 text-white animate-pulse'
                }`}
              >
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Right side: Sound notifications & mic protection toggle */}
        <div className="flex items-center gap-2">
          {isMicOnAir && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-bold animate-pulse"
              title="Micrófono al aire: los sonidos de alerta están en silencio automático para no interferir con tu voz"
            >
              <Mic className="w-3 h-3" />
              <span>Mudo en Mic</span>
            </div>
          )}

          <button
            onClick={handleToggleSound}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              soundEnabled
                ? 'bg-white/5 hover:bg-white/10 text-emerald-400 border-emerald-500/30'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/5'
            }`}
            title={
              soundEnabled
                ? 'Sonidos activados (suena al recibir chats y solicitudes)'
                : 'Sonidos desactivados'
            }
          >
            {soundEnabled ? (
              <>
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] hidden sm:inline">Sonido ON</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[11px] hidden sm:inline">Muteado</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB CONTENT: CHAT EN VIVO */}
      {/* ========================================================= */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Quick DJ shoutouts bar */}
          <div className="px-3 py-1.5 bg-black/40 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#e5b45f]" />
              Respuesta DJ:
            </span>
            {QUICK_DJ_SHOUTOUTS.map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickShoutout(phrase)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#e5b45f]/20 hover:text-[#e5b45f] border border-white/5 text-[11px] text-gray-300 font-medium whitespace-nowrap transition-colors"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Messages Feed with visible, smooth scrollbar */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 overscroll-contain pr-2"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#e5b45f rgba(255, 255, 255, 0.05)',
            }}
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                <Sparkles className="w-10 h-10 text-[#e5b45f] mb-3 opacity-60 animate-pulse" />
                <p className="text-sm font-bold text-white">Chat de Cabina Activo</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Aquí verás los mensajes en vivo de los oyentes conectados a NEXO Radio.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMsgDj = Boolean(msg.is_dj);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col text-xs transition-all ${
                      isMsgDj ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      {isMsgDj ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e5b45f]/20 border border-[#e5b45f]/50 text-[#e5b45f] text-[10px] font-extrabold tracking-wider">
                          <ShieldCheck className="w-3 h-3" />
                          {msg.user_name} (Tú)
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-gray-400 text-[10px]">
                            <User className="w-2.5 h-2.5" />
                          </div>
                          <span className="font-bold text-xs text-white">
                            {msg.user_name}
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] text-gray-500 font-mono">
                        {formatMessageTime(msg.created_at)}
                      </span>
                    </div>

                    {/* Bubble */}
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl max-w-[85%] break-words shadow-sm text-sm ${
                        isMsgDj
                          ? 'bg-gradient-to-r from-[#e5b45f] to-[#f3c87a] text-black font-semibold rounded-tr-xs shadow-md shadow-[#e5b45f]/20'
                          : 'bg-white/10 text-gray-100 border border-white/10 rounded-tl-xs hover:border-white/20 transition-colors'
                      }`}
                    >
                      <p className="leading-relaxed select-text">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Floating Scroll to Bottom Button */}
          {isScrolledUp && (
            <div className="absolute bottom-20 right-4 z-20 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => scrollToBottom(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e5b45f] text-black text-xs font-bold shadow-xl shadow-black/80 hover:bg-[#f3c87a] active:scale-95 transition-all border border-[#e5b45f]/50"
              >
                <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                <span>
                  {newMessagesBelow > 0
                    ? `${newMessagesBelow} nuevo${newMessagesBelow > 1 ? 's' : ''} ↓`
                    : 'Ver recientes ↓'}
                </span>
              </button>
            </div>
          )}

          {/* DJ Message Input Form */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-white/10 bg-black/50 flex items-center gap-2 shrink-0"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe como NEXO DJ al aire..."
                maxLength={300}
                className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b45f] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-[#e5b45f] text-black hover:bg-[#f3c87a] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shrink-0 active:scale-95"
              title="Transmitir mensaje en el chat"
            >
              <Send className="w-3.5 h-3.5 fill-current" />
            </button>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB CONTENT: SOLICITUDES & DEDICATORIAS */}
      {/* ========================================================= */}
      {activeTab === 'solicitudes' && (
        <div
          className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 overscroll-contain pr-2"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#e5b45f rgba(255, 255, 255, 0.05)',
          }}
        >
          {requests.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <Music2 className="w-10 h-10 text-[#e5b45f] mb-3 opacity-60" />
              <p className="text-sm font-bold text-white">No hay solicitudes aún</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Cuando los oyentes pidan canciones desde la web pública, sonará una alerta y aparecerán aquí al instante.
              </p>
            </div>
          ) : (
            requests.map((req) => {
              const isPending = req.status === 'pending';

              return (
                <div
                  key={req.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isPending
                      ? 'bg-gradient-to-r from-amber-500/10 via-white/5 to-transparent border-[#e5b45f]/40 shadow-md'
                      : 'bg-white/5 border-white/5 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{req.name}</span>
                        {isPending ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                            ● Pendiente
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Revisada
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 font-mono">
                          {formatMessageTime(req.created_at)}
                        </span>
                      </div>

                      {/* Song requested */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-7 h-7 rounded-lg bg-[#e5b45f]/15 border border-[#e5b45f]/30 flex items-center justify-center text-[#e5b45f] shrink-0">
                          <Music2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#e5b45f] truncate">
                            {req.song_title}
                          </h4>
                          <p className="text-[11px] text-gray-300 truncate">{req.artist}</p>
                        </div>
                      </div>

                      {/* Dedication text if any */}
                      {req.dedication && (
                        <div className="mt-2 p-2 rounded-xl bg-black/40 border border-white/5 text-xs text-gray-300 italic">
                          "{req.dedication}"
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => handleQueueRequest(req)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#e5b45f] text-black text-xs font-bold hover:bg-[#f3c87a] transition-all flex items-center gap-1 shadow-sm active:scale-95"
                        title="Añadir a la cola y marcar como atendida"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>A la cola</span>
                      </button>

                      {isPending && (
                        <button
                          onClick={() => radioStore.updateRequestStatus(req.id, 'reviewed')}
                          className="px-2.5 py-1 rounded-xl bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 text-[11px] font-medium transition-colors"
                        >
                          Marcar leída
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
