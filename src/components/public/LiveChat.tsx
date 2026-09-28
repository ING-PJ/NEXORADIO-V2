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
} from 'lucide-react';
import { chatStore } from '@/lib/chatStore';
import { ChatMessage } from '@/lib/types';

interface LiveChatViewProps {
  isDj?: boolean;
  onClose?: () => void;
  isCompact?: boolean;
}

export function LiveChatView({ isDj = false, onClose, isCompact = false }: LiveChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [userName, setUserName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [newMessagesBelow, setNewMessagesBelow] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    setMessages(chatStore.getMessages());
    setUserName(chatStore.getUserName());
    setTempName(chatStore.getUserName());
    setCurrentUserId(chatStore.getUserId());

    const unsubscribe = chatStore.subscribe(() => {
      setMessages(chatStore.getMessages());
    });

    return () => unsubscribe();
  }, []);

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

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (tempName.trim()) {
      chatStore.setUserName(tempName.trim());
      setUserName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
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

      {/* User Nickname Banner */}
      {!isDj && (
        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs shrink-0">
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                maxLength={24}
                autoFocus
                placeholder="Tu apodo o nombre"
                className="flex-1 px-2.5 py-1 rounded-lg bg-black/60 border border-[#e5b45f]/50 text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                className="p-1 rounded-lg bg-[#e5b45f] text-black hover:bg-[#f3c87a] transition-all"
                title="Guardar nombre"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTempName(userName);
                  setIsEditingName(false);
                }}
                className="p-1 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20"
                title="Cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-gray-300">
                <span className="text-[11px] text-gray-400">Chateando como:</span>
                <span className="font-semibold text-[#e5b45f] truncate max-w-[150px]">
                  {userName}
                </span>
              </div>
              <button
                onClick={() => {
                  setTempName(userName);
                  setIsEditingName(true);
                }}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-white/5 transition-colors"
              >
                <Edit2 className="w-3 h-3" />
                <span>Cambiar</span>
              </button>
            </>
          )}
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
