'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  Radio,
  Sparkles,
  User,
  Check,
  Edit2,
  Smile,
  ShieldCheck,
  ArrowDown,
  Shuffle,
  ArrowRight,
} from 'lucide-react';
import { chatStore } from '@/lib/chatStore';
import { soundEffects } from '@/lib/soundEffects';
import { ChatMessage } from '@/lib/types';

interface LiveChatViewProps {
  isDj?: boolean;
  onClose?: () => void;
  isCompact?: boolean;
  hideHeader?: boolean;
}

const FUN_NICKNAMES = [
  'NexoFan',
  'RitmoStereo',
  'DJ_Lover',
  'Melomano',
  'VibraPositiva',
  'FrecuenciaTop',
  'Rumbero',
  'NexoLover',
  'SuperOyente',
  'BuenaOnda',
  'OndaNexo',
  'ZonaMusical',
];

export function LiveChatView({ isDj = false, onClose, isCompact = false, hideHeader = false }: LiveChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [userName, setUserName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [nameError, setNameError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [newMessagesBelow, setNewMessagesBelow] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    setMessages(chatStore.getMessages());
    const currentName = chatStore.getUserName();
    setUserName(currentName);
    setCurrentUserId(chatStore.getUserId());

    // Prompt immediately for nickname when entering chat if not configured yet
    if (!isDj && !chatStore.hasCustomName()) {
      setTempName(currentName.startsWith('Oyente #') ? '' : currentName);
      setShowNameModal(true);
    }

    const unsubscribe = chatStore.subscribe(() => {
      setMessages(chatStore.getMessages());
      setUserName(chatStore.getUserName());
    });

    const unsubIncoming = chatStore.subscribeIncoming(() => {
      soundEffects.playChatSound(false);
    });

    return () => {
      unsubscribe();
      unsubIncoming();
    };
  }, [isDj]);

  // Autofocus the name input when modal appears
  useEffect(() => {
    if (showNameModal) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showNameModal]);

  const handleRandomNickname = () => {
    const base = FUN_NICKNAMES[Math.floor(Math.random() * FUN_NICKNAMES.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setTempName(`${base}_${num}`);
    setNameError('');
    nameInputRef.current?.focus();
  };

  const handleConfirmName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = tempName.trim();
    if (!clean) {
      setNameError('Por favor ingresa tu nombre o apodo');
      nameInputRef.current?.focus();
      return;
    }
    if (clean.length < 2) {
      setNameError('El nombre debe tener al menos 2 caracteres');
      nameInputRef.current?.focus();
      return;
    }

    chatStore.setUserName(clean, true);
    setUserName(clean);
    setNameError('');
    setShowNameModal(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const handleContinueAnonymous = () => {
    const defaultName = chatStore.getUserName();
    chatStore.setUserName(defaultName, true);
    setUserName(defaultName);
    setNameError('');
    setShowNameModal(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const handleOpenNameModal = () => {
    setTempName(userName.startsWith('Oyente #') ? '' : userName);
    setNameError('');
    setShowNameModal(true);
  };

  // Monitor user scroll position to avoid snapping while reading previous messages
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = distanceFromBottom > 90;
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

  // Smart auto-scroll: only scrolls to bottom if user is already at the bottom
  useEffect(() => {
    if (messages.length === 0) return;

    if (isFirstLoadRef.current) {
      scrollToBottom(false);
      isFirstLoadRef.current = false;
      return;
    }

    if (isScrolledUp) {
      // User is reading older messages; don't disrupt them
      setNewMessagesBelow((prev) => prev + 1);
    } else {
      // User is at bottom, auto-scroll smoothly to latest
      scrollToBottom(true);
    }
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDj && !chatStore.hasCustomName()) {
      handleOpenNameModal();
      return;
    }
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    try {
      await chatStore.sendMessage(text, { isDj });
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Ahora';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);

      if (diffSecs < 60) return 'Ahora';
      if (diffSecs < 3600) return `Hace ${Math.floor(diffSecs / 60)} min`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Ahora';
    }
  };

  const QUICK_EMOJIS = ['🔥', '🎧', '❤️', '👏', '🙌', '🎶', '📻', '✨'];

  return (
    <div className="relative flex flex-col h-full bg-[#0a0c10]/95 backdrop-blur-xl text-white">
      {/* Top Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-[#e5b45f]/15 border border-[#e5b45f]/30 flex items-center justify-center text-[#e5b45f]">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0c10]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Chat en vivo
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  En directo
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {isDj ? 'Canal Oficial de Cabina' : 'Comunidad NEXO Radio'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://discord.gg/9AksstuAC"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#5865F2]/20 hover:bg-[#5865F2] text-[#5865F2] hover:text-white border border-[#5865F2]/30 text-[11px] font-semibold transition-all shadow-sm"
              title="Unirse al servidor oficial de Discord"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>Discord</span>
            </a>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Cerrar chat"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* User Nickname Banner */}
      {!isDj && (
        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-gray-300">
            <span className="text-[11px] text-gray-400">Chateando como:</span>
            <span className="font-semibold text-[#e5b45f] truncate max-w-[150px]">
              {userName}
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenNameModal}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#e5b45f] px-2 py-0.5 rounded-md hover:bg-white/5 transition-colors"
            title="Cambiar tu nombre o apodo"
          >
            <Edit2 className="w-3 h-3" />
            <span>Cambiar</span>
          </button>
        </div>
      )}

      {/* Message Feed */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 overscroll-contain"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <Sparkles className="w-8 h-8 text-[#e5b45f] mb-2 opacity-60" />
            <p className="text-xs font-medium text-white">Sé el primero en escribir</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Envía saludos a la cabina o pide una canción</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === currentUserId;
            const isMsgDj = Boolean(msg.is_dj);

            return (
              <div
                key={msg.id}
                className={`flex flex-col text-xs transition-all ${
                  isMe ? 'items-end' : 'items-start'
                }`}
              >
                {/* Sender info */}
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {isMsgDj ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-[#e5b45f]/20 border border-[#e5b45f]/40 text-[#e5b45f] text-[10px] font-bold tracking-wide">
                      <ShieldCheck className="w-3 h-3" />
                      {msg.user_name}
                    </span>
                  ) : (
                    <span
                      className={`font-semibold text-[11px] ${
                        isMe ? 'text-[#e5b45f]' : 'text-gray-300'
                      }`}
                    >
                      {msg.user_name} {isMe && <span className="text-[10px] text-gray-400">(Tú)</span>}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] break-words select-text ${
                    isMsgDj
                      ? 'bg-gradient-to-r from-[#e5b45f]/20 to-[#f3c87a]/10 border border-[#e5b45f]/40 text-amber-100 shadow-sm shadow-[#e5b45f]/10 rounded-tl-sm'
                      : isMe
                      ? 'bg-[#e5b45f] text-black font-medium rounded-tr-sm shadow-md'
                      : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {isScrolledUp && (
        <div className="absolute bottom-24 right-4 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e5b45f] text-black text-xs font-semibold shadow-xl shadow-black/70 hover:bg-[#f3c87a] active:scale-95 transition-all border border-[#e5b45f]/50"
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

      {/* Quick Emojis */}
      <div className="px-3 py-1.5 border-t border-white/5 bg-white/[0.02] flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[10px] text-gray-500 mr-1 flex items-center gap-1 shrink-0">
          <Smile className="w-3 h-3" /> Reaccionar:
        </span>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleEmojiClick(emoji)}
            className="px-2 py-0.5 rounded-lg hover:bg-white/10 transition-colors text-sm shrink-0"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-white/10 bg-black/40 flex items-center gap-2 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onFocus={() => {
            if (!isDj && !chatStore.hasCustomName()) {
              handleOpenNameModal();
            }
          }}
          placeholder={isDj ? 'Enviar mensaje oficial como DJ...' : 'Escribe un mensaje al aire...'}
          maxLength={300}
          className="flex-1 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e5b45f] transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-[#e5b45f] text-black hover:bg-[#f3c87a] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shrink-0"
          title="Enviar mensaje"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Name Entry Modal / Overlay (Pops up immediately when entering chat) */}
      {showNameModal && !isDj && (
        <div className="absolute inset-0 z-50 bg-[#07090c]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-sm max-h-[92%] overflow-y-auto bg-[#0e1218] border border-[#e5b45f]/30 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black flex flex-col items-center text-center relative animate-in zoom-in-95 duration-200 my-auto scrollbar-thin">
            {/* Close button if user already has a custom name configured */}
            {chatStore.hasCustomName() && (
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="absolute top-3 right-3 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Glowing Icon */}
            <div className="w-12 h-12 rounded-2xl bg-[#e5b45f]/15 border border-[#e5b45f]/30 flex items-center justify-center text-[#e5b45f] shadow-lg shadow-[#e5b45f]/15 mb-3">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>

            {/* Title & subtitle */}
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-[#e5b45f]" />
              <h3 className="text-base font-bold text-white tracking-wide">
                ¡Bienvenido al Chat!
              </h3>
              <Sparkles className="w-4 h-4 text-[#e5b45f]" />
            </div>
            <p className="text-xs text-gray-400 mb-4 max-w-[270px] leading-relaxed">
              Ingresa tu nombre o apodo para enviar mensajes a la cabina y participar con la comunidad.
            </p>

            {/* Form */}
            <form onSubmit={handleConfirmName} className="w-full space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4 text-[#e5b45f]" />
                </div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={tempName}
                  onChange={(e) => {
                    setTempName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  placeholder="Tu nombre o apodo..."
                  maxLength={20}
                  className={`w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/5 border ${
                    nameError ? 'border-red-500/80 focus:border-red-500' : 'border-white/15 focus:border-[#e5b45f]'
                  } text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none transition-all shadow-inner`}
                />
                <button
                  type="button"
                  onClick={handleRandomNickname}
                  title="Sugerir apodo al azar"
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-[#e5b45f] transition-colors"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>

              {nameError && (
                <p className="text-[11px] text-red-400 font-medium text-left px-1">
                  {nameError}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#e5b45f] to-[#f3c87a] hover:from-[#f3c87a] hover:to-[#e5b45f] text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#e5b45f]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Entrar al Chat</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {!chatStore.hasCustomName() && (
                  <button
                    type="button"
                    onClick={handleContinueAnonymous}
                    className="text-[11px] text-gray-400 hover:text-gray-300 py-1 transition-colors cursor-pointer"
                  >
                    Continuar como oyente anónimo
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface LiveChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isDj?: boolean;
}

export function LiveChatDrawer({ isOpen, onClose, isDj = false }: LiveChatDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      chatStore.clearUnread();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal / Sheet Container */}
      <div className="relative w-full max-w-lg h-[90dvh] max-h-[92dvh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col z-10 animate-in slide-in-from-bottom-5 duration-300">
        {/* Mobile drag handle bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-2 sm:hidden shrink-0" />
        <LiveChatView isDj={isDj} onClose={onClose} />
      </div>
    </div>
  );
}
