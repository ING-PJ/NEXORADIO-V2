'use client';

import { supabase, isSupabaseConfigured } from './supabase';
import { ChatMessage } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

const STORAGE_KEY = 'nexo_live_chat_messages_v1';
const USERNAME_KEY = 'nexo_chat_username';
const USER_ID_KEY = 'nexo_chat_user_id';
const MAX_MESSAGES = 250;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'seed-1',
    user_name: '🎧 NEXO DJ',
    text: '¡Bienvenidos a la transmisión en vivo de NEXO Radio! ¿Desde dónde nos escuchas?',
    created_at: new Date(Date.now() - 300000).toISOString(),
    is_dj: true,
  },
  {
    id: 'seed-2',
    user_name: 'Sofía M.',
    text: '¡Conectada desde Medellín! Excelente programación hoy ☀️🎧',
    created_at: new Date(Date.now() - 240000).toISOString(),
    is_dj: false,
  },
  {
    id: 'seed-3',
    user_name: 'Carlos Ruiz',
    text: 'Esa canción está genial, súbanle el volumen 🔥🙌',
    created_at: new Date(Date.now() - 120000).toISOString(),
    is_dj: false,
  },
  {
    id: 'seed-4',
    user_name: 'Valentina P.',
    text: 'Saludos a toda la cabina de NEXO Radio ❤️✨',
    created_at: new Date(Date.now() - 40000).toISOString(),
    is_dj: false,
  },
];

class ChatStore {
  private messages: ChatMessage[] = [];
  private listeners: Set<() => void> = new Set();
  private channel: RealtimeChannel | null = null;
  private localBc: BroadcastChannel | null = null;
  private initialized = false;
  private unreadCount = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private deduplicateMessages(list: ChatMessage[]): ChatMessage[] {
    const result: ChatMessage[] = [];
    const seenIds = new Set<string>();

    for (const msg of list) {
      if (!msg || !msg.text) continue;
      if (seenIds.has(msg.id)) continue;

      const msgTime = new Date(msg.created_at).getTime();
      const isDuplicate = result.some((existing) => {
        if (existing.user_name !== msg.user_name) return false;
        if (existing.text.trim().toLowerCase() !== msg.text.trim().toLowerCase()) return false;
        const existingTime = new Date(existing.created_at).getTime();
        return Math.abs(msgTime - existingTime) < 5000;
      });

      if (!isDuplicate) {
        seenIds.add(msg.id);
        result.push(msg);
      }
    }

    return result;
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    // Load cached messages from localStorage and purge any existing duplicates
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages = this.deduplicateMessages(parsed);
          this.saveToStorage();
        } else {
          this.messages = [...DEFAULT_MESSAGES];
          this.saveToStorage();
        }
      } else {
        this.messages = [...DEFAULT_MESSAGES];
        this.saveToStorage();
      }
    } catch {
      this.messages = [...DEFAULT_MESSAGES];
    }

    // Local tab-to-tab sync
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.localBc = new BroadcastChannel('nexo_chat_local_sync');
        this.localBc.onmessage = (evt) => {
          if (evt.data && evt.data.type === 'NEW_CHAT_MSG') {
            this.appendMessage(evt.data.payload, false);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not available:', e);
    }

    // Connect to Supabase Realtime broadcast & postgres changes channel
    if (isSupabaseConfigured && supabase) {
      try {
        this.channel = supabase.channel('nexo_live_chat', {
          config: {
            broadcast: { self: false },
          },
        });

        this.channel
          .on('broadcast', { event: 'message' }, ({ payload }) => {
            if (payload && payload.id) {
              this.appendMessage(payload, false);
            }
          })
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages' },
            (payload) => {
              if (payload.new) {
                const d = payload.new as any;
                const formatted: ChatMessage = {
                  id: String(d.id),
                  user_name: d.user_name || 'Oyente',
                  text: d.text,
                  created_at: d.created_at || new Date().toISOString(),
                  is_dj: Boolean(d.is_dj),
                  user_id: d.user_id,
                };
                this.appendMessage(formatted, false);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Successfully connected to Supabase Realtime WebSocket
            }
          });

        // Read recent database messages if the table exists
        Promise.resolve(
          supabase
            .from('chat_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)
        )
          .then(({ data, error }: any) => {
            if (!error && data && data.length > 0) {
              const formatted: ChatMessage[] = data.map((d: any) => ({
                id: String(d.id),
                user_name: d.user_name || 'Oyente',
                text: d.text,
                created_at: d.created_at || new Date().toISOString(),
                is_dj: Boolean(d.is_dj),
                user_id: d.user_id,
              })).reverse();

              // Merge without duplicates
              this.messages = this.deduplicateMessages([...this.messages, ...formatted])
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .slice(-MAX_MESSAGES);
              this.saveToStorage();
              this.notify();
            }
          })
          .catch(() => {
            // Silently continue if table does not exist
          });
      } catch (err) {
        console.warn('Error setting up Supabase chat channel:', err);
      }
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages.slice(-MAX_MESSAGES)));
    } catch (e) {
      console.warn('Error saving chat to localStorage:', e);
    }
  }

  private appendMessage(msg: ChatMessage, isLocalSender: boolean) {
    if (!msg || !msg.text) return;

    // 1. Exact ID deduplication
    if (this.messages.some((m) => m.id === msg.id)) return;

    // 2. Semantic deduplication: same user, exact same text, within 5 seconds window
    const nowTime = new Date(msg.created_at).getTime();
    const existingIndex = this.messages.findIndex((m) => {
      if (m.user_name !== msg.user_name) return false;
      if (m.text.trim().toLowerCase() !== msg.text.trim().toLowerCase()) return false;
      const mTime = new Date(m.created_at).getTime();
      return Math.abs(nowTime - mTime) < 5000;
    });

    if (existingIndex !== -1) {
      // It's the same message (e.g. from local optimistic add, broadcast, or postgres_changes)
      if (msg.id && this.messages[existingIndex].id !== msg.id) {
        this.messages[existingIndex] = {
          ...this.messages[existingIndex],
          id: msg.id,
        };
        this.saveToStorage();
      }
      return;
    }

    this.messages.push(msg);
    if (this.messages.length > MAX_MESSAGES) {
      this.messages = this.messages.slice(-MAX_MESSAGES);
    }
    this.saveToStorage();

    if (!isLocalSender) {
      this.unreadCount++;
    }

    this.notify();
  }

  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  public getUnreadCount(): number {
    return this.unreadCount;
  }

  public clearUnread() {
    this.unreadCount = 0;
    this.notify();
  }

  public getUserId(): string {
    if (typeof window === 'undefined') return 'server';
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = 'user_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  }

  public getUserName(): string {
    if (typeof window === 'undefined') return 'Oyente';
    let name = localStorage.getItem(USERNAME_KEY);
    if (!name) {
      // Pick a random default name
      const randomNum = Math.floor(100 + Math.random() * 900);
      name = `Oyente #${randomNum}`;
      localStorage.setItem(USERNAME_KEY, name);
    }
    return name;
  }

  public setUserName(newName: string) {
    if (typeof window === 'undefined') return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    localStorage.setItem(USERNAME_KEY, trimmed);
    this.notify();
  }

  public async sendMessage(
    text: string,
    options?: { isDj?: boolean; customName?: string }
  ): Promise<ChatMessage> {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('El mensaje no puede estar vacío');
    }

    const isDj = Boolean(options?.isDj);
    const userName = isDj
      ? '🎧 NEXO DJ'
      : options?.customName || this.getUserName();

    const newMsg: ChatMessage = {
      id: generateUUID(),
      user_name: userName,
      text: cleanText,
      created_at: new Date().toISOString(),
      is_dj: isDj,
      user_id: this.getUserId(),
    };

    // 1. Append locally
    this.appendMessage(newMsg, true);

    // 2. Broadcast via Supabase Realtime channel (to other listeners)
    if (this.channel) {
      try {
        await this.channel.send({
          type: 'broadcast',
          event: 'message',
          payload: newMsg,
        });
      } catch (err) {
        console.warn('Realtime chat broadcast error:', err);
      }
    }

    // 3. Sync to other tabs of the same browser
    if (this.localBc) {
      try {
        this.localBc.postMessage({
          type: 'NEW_CHAT_MSG',
          payload: newMsg,
        });
      } catch (e) {
        // ignore
      }
    }

    // 4. Save to Supabase DB table with the EXACT SAME UUID
    if (isSupabaseConfigured && supabase) {
      Promise.resolve(
        supabase
          .from('chat_messages')
          .insert({
            id: newMsg.id,
            user_name: newMsg.user_name,
            text: newMsg.text,
            is_dj: newMsg.is_dj,
            user_id: newMsg.user_id,
            created_at: newMsg.created_at,
          })
      ).catch(() => {});
    }

    return newMsg;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('ChatStore listener error:', e);
      }
    });
  }
}

export const chatStore = new ChatStore();
