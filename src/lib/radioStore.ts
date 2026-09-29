import { Song, Playlist, SongRequest, StationState } from './types';
import { INITIAL_SONGS, INITIAL_PLAYLISTS, INITIAL_REQUESTS, INITIAL_STATION_STATE } from './mockData';
import { supabase, isSupabaseConfigured } from './supabase';

const SONGS_KEY = 'nexo_radio_songs_v2';
const PLAYLISTS_KEY = 'nexo_radio_playlists_v1';
const REQUESTS_KEY = 'nexo_radio_requests_v1';
const STATE_KEY = 'nexo_radio_station_state_v2';
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
              const current = this.getStationState();
              const merged = { ...current, ...data };
              if (merged.listeners_count >= 1200) {
                merged.listeners_count = 1;
              }
              localStorage.setItem(STATE_KEY, JSON.stringify(merged));
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
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'songs' },
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
    let dbSongs: Song[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          dbSongs = data as Song[];
        }
      } catch (e) {
        console.warn('Error fetching Supabase songs:', e);
      }
    }

    let localSongs: Song[] = [];
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SONGS_KEY);
      if (saved) {
        try {
          localSongs = JSON.parse(saved);
        } catch {}
      }
    }

    // Merge: Put DB songs FIRST (they are the real production songs), then local, then demo songs
    const songMap = new Map<string, Song>();
    dbSongs.forEach((s) => songMap.set(s.id, s));
    localSongs.forEach((s) => {
      if (!songMap.has(s.id)) songMap.set(s.id, s);
    });
    INITIAL_SONGS.forEach((s) => {
      if (!songMap.has(s.id)) songMap.set(s.id, s);
    });

    // Sort by created_at descending (newest uploads appear first at the top)
    const result = Array.from(songMap.values()).sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    // Sanitize any dead or blocked external URLs (e.g. Pixabay) to local working MP3s
    const sanitized = result.map((s, idx) => {
      let url = s.file_url;
      if (!url || url.includes('pixabay.com')) {
        url = idx % 2 === 0 ? '/songs/summer.mp3' : '/songs/flowers.mp3';
      }
      return { ...s, file_url: url };
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(SONGS_KEY, JSON.stringify(sanitized));
    }

    return sanitized;
  }

  public async addSong(song: Omit<Song, 'id' | 'created_at'>): Promise<Song> {
    // Generate valid RFC4122 UUID so Postgres UUID column constraint never fails
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

    const newSong: Song = {
      ...song,
      id: newId,
      created_at: new Date().toISOString(),
      play_count: 0,
      is_favorite: song.is_favorite ?? false,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('songs').insert(newSong).select().single();
        if (!error && data) {
          const current = await this.getSongs();
          const updated = [data as Song, ...current.filter((s) => s.id !== data.id)];
          if (typeof window !== 'undefined') {
            localStorage.setItem(SONGS_KEY, JSON.stringify(updated));
          }
          this.postSync();
          return data as Song;
        } else if (error) {
          console.warn('Supabase insert song notice:', error.message);
        }
      } catch (err) {
        console.warn('Supabase insert song exception:', err);
      }
    }

    const current = await this.getSongs();
    const updated = [newSong, ...current.filter((s) => s.id !== newSong.id)];
    if (typeof window !== 'undefined') {
      localStorage.setItem(SONGS_KEY, JSON.stringify(updated));
    }

    if (newSong.is_favorite) {
      await this.syncSongWithFavoritesPlaylist(newSong, true);
    }

    this.postSync();
    return newSong;
  }

  public async deleteSong(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('playlist_songs').delete().eq('song_id', id);
        await supabase.from('songs').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteSong notice:', e);
      }
    }
    const current = await this.getSongs();
    const updated = current.filter((s) => s.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SONGS_KEY, JSON.stringify(updated));
    }

    // Clean up playlists
    const playlists = await this.getPlaylists();
    let plChanged = false;
    playlists.forEach((p) => {
      if (p.songs && p.songs.some((s) => s.id === id)) {
        p.songs = p.songs.filter((s) => s.id !== id);
        p.songs_count = p.songs.length;
        p.duration_seconds = p.songs.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        plChanged = true;
      }
    });
    if (plChanged && typeof window !== 'undefined') {
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
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
      try {
        await supabase.from('songs').update({ is_favorite: newVal }).eq('id', id);
      } catch (err) {
        console.warn('Supabase toggleFavorite notice:', err);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(SONGS_KEY, JSON.stringify(current));
    }

    // Keep playlist "Favoritas" in sync
    await this.syncSongWithFavoritesPlaylist(song, newVal);

    this.postSync();
    return newVal;
  }

  public async syncSongWithFavoritesPlaylist(song: Song, isFavorite: boolean): Promise<void> {
    const playlists = await this.getPlaylists();
    let favPlaylist = playlists.find(
      (p) =>
        p.name.trim().toLowerCase() === 'favoritas' ||
        p.id === 'playlist-1' ||
        p.id === '11111111-1111-1111-1111-111111111111'
    );

    if (!favPlaylist) {
      favPlaylist = await this.createPlaylist('Favoritas', 'Canciones más votadas por los oyentes y el equipo.');
    }

    if (!favPlaylist) return;

    if (isFavorite) {
      await this.addSongToPlaylist(favPlaylist.id, song);
    } else {
      await this.removeSongFromPlaylist(favPlaylist.id, song.id);
    }
  }

  // --- PLAYLISTS ---
  public async getPlaylists(): Promise<Playlist[]> {
    let result: Playlist[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('playlists')
          .select('*, playlist_songs(position, song:songs(*))');
        if (!error && data && data.length > 0) {
          result = data.map((p: any) => ({
            ...p,
            songs: p.playlist_songs
              ? p.playlist_songs
                  .sort((a: any, b: any) => a.position - b.position)
                  .map((ps: any) => ps.song)
                  .filter(Boolean)
              : [],
          })) as Playlist[];
        }
      } catch (e) {
        console.warn('Supabase getPlaylists notice:', e);
      }
    }

    if (result.length === 0 && typeof window !== 'undefined') {
      const saved = localStorage.getItem(PLAYLISTS_KEY);
      if (saved) {
        try {
          result = JSON.parse(saved);
        } catch {}
      }
    }

    if (result.length === 0) {
      result = [...INITIAL_PLAYLISTS];
    }

    // Always ensure the Favoritas playlist is synchronized with all favorite songs
    const allSongs = await this.getSongs();
    const favSongs = allSongs.filter((s) => s.is_favorite);
    let favPlaylist = result.find(
      (p) =>
        p.name.trim().toLowerCase() === 'favoritas' ||
        p.id === 'playlist-1' ||
        p.id === '11111111-1111-1111-1111-111111111111'
    );

    if (favPlaylist) {
      let changed = false;
      const playlistSongs = favPlaylist.songs || [];

      // Keep only songs that are still marked as favorite
      const filtered = playlistSongs.filter((s) => {
        const liveSong = allSongs.find((item) => item.id === s.id);
        return liveSong ? liveSong.is_favorite : true;
      });

      if (filtered.length !== playlistSongs.length) {
        favPlaylist.songs = filtered;
        changed = true;
      }

      // Add any favorite songs that are not yet in the playlist
      const currentList = favPlaylist.songs || [];
      favSongs.forEach((song) => {
        if (!currentList.some((s) => s.id === song.id)) {
          currentList.push(song);
          changed = true;
        }
      });

      favPlaylist.songs = currentList;
      favPlaylist.songs_count = currentList.length;
      favPlaylist.duration_seconds = currentList.reduce(
        (acc, curr) => acc + (curr.duration || 0),
        0
      );

      if (changed && typeof window !== 'undefined') {
        localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(result));
      }
    }

    return result;
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
      try {
        const { data } = await supabase.from('playlists').insert({
          name,
          description,
          cover_url: '/cover_default.webp'
        }).select().single();
        if (data) return data;
      } catch (e) {
        console.warn('Supabase createPlaylist notice:', e);
      }
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
    const isFavPlaylist =
      target.name.trim().toLowerCase() === 'favoritas' ||
      target.id === 'playlist-1' ||
      target.id === '11111111-1111-1111-1111-111111111111';

    const songToAdd = isFavPlaylist ? { ...song, is_favorite: true } : song;

    if (!target.songs.some((s) => s.id === song.id)) {
      target.songs.push(songToAdd);
      target.songs_count = target.songs.length;
      target.duration_seconds = (target.duration_seconds || 0) + (song.duration || 0);

      // If added to Favoritas playlist, ensure song in songs array is also marked as favorite
      if (isFavPlaylist) {
        const songs = await this.getSongs();
        const s = songs.find((item) => item.id === song.id);
        if (s && !s.is_favorite) {
          s.is_favorite = true;
          if (isSupabaseConfigured && supabase) {
            try {
              await supabase.from('songs').update({ is_favorite: true }).eq('id', song.id);
            } catch {}
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem(SONGS_KEY, JSON.stringify(songs));
          }
        }
      }

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('playlist_songs').upsert(
            {
              playlist_id: playlistId,
              song_id: song.id,
              position: target.songs.length,
            },
            { onConflict: 'playlist_id,song_id' }
          );
        } catch (e) {
          console.warn('Supabase addSongToPlaylist notice:', e);
        }
      }

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

    const isFavPlaylist =
      target.name.trim().toLowerCase() === 'favoritas' ||
      target.id === 'playlist-1' ||
      target.id === '11111111-1111-1111-1111-111111111111';

    if (isFavPlaylist) {
      const songs = await this.getSongs();
      const s = songs.find((item) => item.id === songId);
      if (s && s.is_favorite) {
        s.is_favorite = false;
        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.from('songs').update({ is_favorite: false }).eq('id', songId);
          } catch {}
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem(SONGS_KEY, JSON.stringify(songs));
        }
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('playlist_songs')
          .delete()
          .eq('playlist_id', playlistId)
          .eq('song_id', songId);
      } catch (e) {
        console.warn('Supabase removeSongFromPlaylist notice:', e);
      }
    }

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
      // Purge legacy v1 cached state if present
      localStorage.removeItem('nexo_radio_station_state_v1');

      const saved = localStorage.getItem(STATE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.listeners_count >= 1200) {
            parsed.listeners_count = 1;
          }
          return parsed;
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
      const isUuid = (str?: string | null) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      const payload: any = {
        id: 'current',
        is_live: updated.is_live ?? true,
        is_mic_active: updated.is_mic_active ?? false,
        current_song_id: isUuid(updated.current_song_id) ? updated.current_song_id : null,
        current_song_title: updated.current_song_title || 'Summer Vibes',
        current_song_artist: updated.current_song_artist || 'Calvin Harris ft. NEXO',
        current_song_cover: updated.current_song_cover || '/cover_default.webp',
        current_song_url: updated.current_song_url || '/songs/summer.mp3',
        current_song_duration: updated.current_song_duration || 0,
        current_song_progress: updated.current_song_progress || 0,
        listeners_count: updated.listeners_count || 1,
        air_time_seconds: updated.air_time_seconds || 0,
        updated_at: new Date().toISOString(),
      };

      supabase
        .from('station_state')
        .upsert(payload, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) {
            console.warn('Supabase station_state sync notice:', error.message);
          }
        });
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
