import { Song, Playlist, SongRequest, StationState } from './types';
import { INITIAL_SONGS, INITIAL_PLAYLISTS, INITIAL_REQUESTS, INITIAL_STATION_STATE } from './mockData';
import { supabase, isSupabaseConfigured } from './supabase';

const SONGS_KEY = 'nexo_radio_songs_v1';
const PLAYLISTS_KEY = 'nexo_radio_playlists_v1';
const REQUESTS_KEY = 'nexo_radio_requests_v1';
const STATE_KEY = 'nexo_radio_station_state_v1';
const QUEUE_KEY = 'nexo_radio_queue_v1';

class RadioStore {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('nexo_radio_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'STATE_CHANGED') {
            this.notify();
          }
        };
      } catch {
        // Fallback for environments where BroadcastChannel is not supported
      }

      window.addEventListener('storage', (e) => {
        if (e.key?.startsWith('nexo_radio_')) {
          this.notify();
        }
      });

      // Global synchronization via Supabase Realtime (for Vercel + Supabase serverless mode)
      if (isSupabaseConfigured && supabase) {
        // Fetch current station state from database
        supabase
          .from('station_state')
          .select('*')
          .eq('id', 'current')
          .single()
          .then(({ data }) => {
            if (data) {
              localStorage.setItem(STATE_KEY, JSON.stringify(data));
              this.notify();
            }
          });

        // Listen for live station updates, incoming requests, and active presence
        const channel = supabase.channel('nexo_global_realtime');
        channel
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'station_state' },
            (payload) => {
              if (payload.new) {
                const current = this.getStationState();
                const merged = { ...current, ...payload.new };
                localStorage.setItem(STATE_KEY, JSON.stringify(merged));
                this.notify();
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'song_requests' },
            () => {
              this.notify();
            }
          )
          .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            const count = Object.keys(presenceState).length;
            this.setListenersCount(count);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                joined_at: new Date().toISOString(),
              });
            }
          });
      }
    }
  }

  public subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('RadioStore listener error:', err);
      }
    });
  }

  private postSync() {
    this.notify();
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'STATE_CHANGED', time: Date.now() });
      } catch {}
    }
  }

  // --- SONGS ---
  public async getSongs(): Promise<Song[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as Song[];
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SONGS_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      localStorage.setItem(SONGS_KEY, JSON.stringify(INITIAL_SONGS));
    }
    return INITIAL_SONGS;
  }

  public async addSong(song: Omit<Song, 'id' | 'created_at'>): Promise<Song> {
    const newSong: Song = {
      ...song,
      id: 'song-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString(),
      play_count: 0,
      is_favorite: song.is_favorite ?? false,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('songs').insert(newSong).select().single();
      if (!error && data) {
        this.postSync();
        return data as Song;
      }
    }

    const current = await this.getSongs();
    const updated = [newSong, ...current];
    if (typeof window !== 'undefined') {
      localStorage.setItem(SONGS_KEY, JSON.stringify(updated));
    }
    this.postSync();
    return newSong;
  }

  public async deleteSong(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('songs').delete().eq('id', id);
    }
    const current = await this.getSongs();
    const updated = current.filter((s) => s.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SONGS_KEY, JSON.stringify(updated));
    }
    this.postSync();
    return true;
  }

  public async toggleFavorite(id: string): Promise<boolean> {
    const current = await this.getSongs();
    const song = current.find((s) => s.id === id);
    if (!song) return false;

    const newVal = !song.is_favorite;
    song.is_favorite = newVal;

    if (isSupabaseConfigured && supabase) {
      await supabase.from('songs').update({ is_favorite: newVal }).eq('id', id);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(SONGS_KEY, JSON.stringify(current));
    }
    this.postSync();
    return newVal;
  }

  // --- PLAYLISTS ---
  public async getPlaylists(): Promise<Playlist[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('playlists').select('*, playlist_songs(position, song:songs(*))');
      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          ...p,
          songs: p.playlist_songs ? p.playlist_songs.sort((a: any, b: any) => a.position - b.position).map((ps: any) => ps.song) : [],
        })) as Playlist[];
      }
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PLAYLISTS_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(INITIAL_PLAYLISTS));
    }
    return INITIAL_PLAYLISTS;
  }

  public async createPlaylist(name: string, description: string = ''): Promise<Playlist> {
    const newPlaylist: Playlist = {
      id: 'playlist-' + Date.now(),
      name,
      description,
      cover_url: '/cover_default.webp',
      songs_count: 0,
      duration_seconds: 0,
      songs: [],
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('playlists').insert({
        name,
        description,
        cover_url: '/cover_default.webp'
      }).select().single();
      if (data) return data;
    }

    const current = await this.getPlaylists();
    const updated = [newPlaylist, ...current];
    if (typeof window !== 'undefined') {
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
    }
    this.postSync();
    return newPlaylist;
  }

  public async addSongToPlaylist(playlistId: string, song: Song): Promise<void> {
    const playlists = await this.getPlaylists();
    const target = playlists.find((p) => p.id === playlistId);
    if (!target) return;

    if (!target.songs) target.songs = [];
    if (!target.songs.some((s) => s.id === song.id)) {
      target.songs.push(song);
      target.songs_count = target.songs.length;
      target.duration_seconds = (target.duration_seconds || 0) + (song.duration || 0);

      if (typeof window !== 'undefined') {
        localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
      }
      this.postSync();
    }
  }

  public async removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
    const playlists = await this.getPlaylists();
    const target = playlists.find((p) => p.id === playlistId);
    if (!target || !target.songs) return;

    target.songs = target.songs.filter((s) => s.id !== songId);
    target.songs_count = target.songs.length;
    target.duration_seconds = target.songs.reduce((acc, curr) => acc + (curr.duration || 0), 0);

    if (typeof window !== 'undefined') {
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
    }
    this.postSync();
  }

  // --- QUEUE ---
  public getQueue(): Song[] {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(QUEUE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_SONGS.slice(1);
  }

  public setQueue(queue: Song[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
    this.postSync();
  }

  public addToQueue(song: Song): void {
    const q = this.getQueue();
    q.push(song);
    this.setQueue(q);
  }

  public removeFromQueue(index: number): void {
    const q = this.getQueue();
    q.splice(index, 1);
    this.setQueue(q);
  }

  // --- REQUESTS ---
  public async getRequests(): Promise<SongRequest[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('song_requests').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as SongRequest[];
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(REQUESTS_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(INITIAL_REQUESTS));
    }
    return INITIAL_REQUESTS;
  }

  public async addRequest(req: Omit<SongRequest, 'id' | 'created_at' | 'status'>): Promise<SongRequest> {
    const newReq: SongRequest = {
      ...req,
      id: 'req-' + Date.now(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('song_requests').insert(newReq).select().single();
      if (data) {
        this.postSync();
        return data as SongRequest;
      }
    }

    const current = await this.getRequests();
    const updated = [newReq, ...current];
    if (typeof window !== 'undefined') {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(updated));
    }
    this.postSync();
    return newReq;
  }

  public async updateRequestStatus(id: string, status: SongRequest['status']): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('song_requests').update({ status }).eq('id', id);
    }
    const current = await this.getRequests();
    const item = current.find((r) => r.id === id);
    if (item) {
      item.status = status;
      if (typeof window !== 'undefined') {
        localStorage.setItem(REQUESTS_KEY, JSON.stringify(current));
      }
      this.postSync();
    }
  }

  // --- STATION STATE ---
  public getStationState(): StationState {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STATE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_STATION_STATE;
  }

  public updateStationState(partial: Partial<StationState>): StationState {
    const current = this.getStationState();
    const updated: StationState = {
      ...current,
      ...partial,
      updated_at: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STATE_KEY, JSON.stringify(updated));
    }

    if (isSupabaseConfigured && supabase) {
      supabase.from('station_state').upsert(updated, { onConflict: 'id' }).then();
    }

    this.postSync();
    return updated;
  }

  public setListenersCount(count: number) {
    const current = this.getStationState();
    if (current.listeners_count !== count) {
      current.listeners_count = count;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STATE_KEY, JSON.stringify(current));
      }
      this.notify();
    }
  }
}

export const radioStore = new RadioStore();
