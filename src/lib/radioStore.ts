import { Song, Playlist, SongRequest, StationState, OnlineListener } from './types';
import { INITIAL_SONGS, INITIAL_PLAYLISTS, INITIAL_REQUESTS, INITIAL_STATION_STATE } from './mockData';
import { supabase, isSupabaseConfigured } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const SONGS_KEY = 'nexo_radio_songs_v2';
const PLAYLISTS_KEY = 'nexo_radio_playlists_v1';
const REQUESTS_KEY = 'nexo_radio_requests_v1';
const STATE_KEY = 'nexo_radio_station_state_v2';
const QUEUE_KEY = 'nexo_radio_queue_v1';

class RadioStore {
  private broadcastChannel: BroadcastChannel | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private listeners: Set<() => void> = new Set();
  private requestListeners: Set<(req: SongRequest) => void> = new Set();
  private onlineListeners: OnlineListener[] = [];
  private defaultOnlineListeners: OnlineListener[] = [
    {
      user_id: 'usr_sofia',
      user_name: 'Sofía M.',
      is_dj: false,
      joined_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      user_id: 'usr_carlos',
      user_name: 'Carlos Ruiz',
      is_dj: false,
      joined_at: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    },
    {
      user_id: 'usr_valentina',
      user_name: 'Valentina P.',
      is_dj: false,
      joined_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
  ];

  // In-memory caching & in-flight promise deduplication
  private cachedSongs: Song[] | null = null;
  private songsPromise: Promise<Song[]> | null = null;
  private songsCacheTime = 0;

  private cachedPlaylists: Playlist[] | null = null;
  private playlistsPromise: Promise<Playlist[]> | null = null;
  private playlistsCacheTime = 0;

  private cachedRequests: SongRequest[] | null = null;
  private requestsPromise: Promise<SongRequest[]> | null = null;
  private requestsCacheTime = 0;

  private cachedStorageUsage: { usedBytes: number; totalLimitBytes: number; filesCount: number; isSupabase: boolean } | null = null;
  private storageUsagePromise: Promise<{ usedBytes: number; totalLimitBytes: number; filesCount: number; isSupabase: boolean }> | null = null;
  private storageUsageCacheTime = 0;

  private readonly CACHE_TTL_MS = 60000; // 60 seconds

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('nexo_radio_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'STATE_CHANGED') {
            this.notify();
          } else if (event.data?.type === 'NEW_REQUEST' && event.data.payload) {
            this.invalidateRequestsCache();
            this.notifyNewRequest(event.data.payload);
            this.notify();
          }
        };
      } catch {
        // Fallback for environments where BroadcastChannel is not supported
      }

      window.addEventListener('storage', (e) => {
        // Ignore STATE_KEY changes to avoid cross-tab infinite broadcast loops
        if (e.key?.startsWith('nexo_radio_') && e.key !== STATE_KEY) {
          if (e.key === SONGS_KEY) this.invalidateSongsCache();
          if (e.key === PLAYLISTS_KEY) this.invalidatePlaylistsCache();
          if (e.key === REQUESTS_KEY) this.invalidateRequestsCache();
          this.notify();
        }
      });

      // Listen for chat username updates to immediately re-sync presence
      window.addEventListener('nexo_username_changed', (e: any) => {
        if (e?.detail) {
          this.trackCurrentPresence(e.detail);
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
        this.realtimeChannel = supabase.channel('nexo_global_realtime');
        this.realtimeChannel
          .on(
            'broadcast',
            { event: 'station_state' },
            ({ payload }) => {
              if (payload) {
                const current = this.getStationState();
                const merged = { ...current, ...payload };
                localStorage.setItem(STATE_KEY, JSON.stringify(merged));
                this.notify();
              }
            }
          )
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
            (payload) => {
              this.invalidateRequestsCache();
              if (payload.eventType === 'INSERT' && payload.new) {
                this.notifyNewRequest(payload.new as SongRequest);
              }
              this.notify();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'songs' },
            () => {
              this.invalidateSongsCache();
              this.invalidatePlaylistsCache();
              this.notify();
            }
          )
          .on('presence', { event: 'sync' }, () => {
            if (this.realtimeChannel) {
              const presenceState = this.realtimeChannel.presenceState();
              const list: OnlineListener[] = [];
              for (const key of Object.keys(presenceState)) {
                const arr = presenceState[key] as any[];
                if (Array.isArray(arr) && arr.length > 0) {
                  const p = arr[0];
                  list.push({
                    user_id: p.user_id || key,
                    user_name: p.user_name || 'Oyente',
                    is_dj: Boolean(p.is_dj),
                    joined_at: p.joined_at || new Date().toISOString(),
                    location: p.location,
                  });
                }
              }
              if (list.length > 0) {
                this.onlineListeners = list;
                const nonDjCount = list.filter((l) => !l.is_dj).length;
                this.setListenersCount(nonDjCount > 0 ? nonDjCount : list.length);
              }
              this.notify();
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && this.realtimeChannel) {
              await this.trackCurrentPresence();
            }
          });
      }
    }
  }

  public invalidateSongsCache() {
    this.cachedSongs = null;
    this.songsPromise = null;
    this.songsCacheTime = 0;
  }

  public invalidatePlaylistsCache() {
    this.cachedPlaylists = null;
    this.playlistsPromise = null;
    this.playlistsCacheTime = 0;
  }

  public invalidateRequestsCache() {
    this.cachedRequests = null;
    this.requestsPromise = null;
    this.requestsCacheTime = 0;
  }

  public subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public subscribeToNewRequests(listener: (req: SongRequest) => void): () => void {
    this.requestListeners.add(listener);
    return () => {
      this.requestListeners.delete(listener);
    };
  }

  private notifyNewRequest(req: SongRequest) {
    this.requestListeners.forEach((cb) => {
      try {
        cb(req);
      } catch (err) {
        console.error('RadioStore request listener error:', err);
      }
    });
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
  public async getSongs(forceRefresh = false): Promise<Song[]> {
    if (!forceRefresh && this.cachedSongs && Date.now() - this.songsCacheTime < this.CACHE_TTL_MS) {
      return this.cachedSongs;
    }
    if (!forceRefresh && this.songsPromise) {
      return this.songsPromise;
    }

    this.songsPromise = (async () => {
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

      this.cachedSongs = sanitized;
      this.songsCacheTime = Date.now();
      this.songsPromise = null;
      return sanitized;
    })();

    return this.songsPromise;
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

    this.invalidateSongsCache();
    this.postSync();
    return newSong;
  }

  public async deleteSong(id: string): Promise<boolean> {
    const current = await this.getSongs();
    const songToDelete = current.find((s) => s.id === id);

    if (isSupabaseConfigured && supabase) {
      try {
        if (songToDelete?.file_url?.includes('/storage/v1/object/public/songs/')) {
          const parts = songToDelete.file_url.split('/public/songs/');
          if (parts[1]) {
            const rawFilename = decodeURIComponent(parts[1].split('?')[0]);
            await supabase.storage.from('songs').remove([rawFilename]);
          }
        }
        await supabase.from('playlist_songs').delete().eq('song_id', id);
        await supabase.from('songs').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteSong notice:', e);
      }
    }
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

    this.invalidateSongsCache();
    this.invalidatePlaylistsCache();
    this.postSync();
    return true;
  }

  // Real storage synchronization with Supabase Storage bucket 'songs'
  public async getStorageUsage(): Promise<{
    usedBytes: number;
    totalLimitBytes: number;
    filesCount: number;
    isSupabase: boolean;
  }> {
    const now = Date.now();
    if (this.cachedStorageUsage && now - this.storageUsageCacheTime < this.CACHE_TTL_MS) {
      return this.cachedStorageUsage;
    }
    if (this.storageUsagePromise) {
      return this.storageUsagePromise;
    }

    this.storageUsagePromise = (async () => {
      try {
        const res = await this.fetchStorageUsageRaw();
        this.cachedStorageUsage = res;
        this.storageUsageCacheTime = Date.now();
        return res;
      } finally {
        this.storageUsagePromise = null;
      }
    })();

    return this.storageUsagePromise;
  }

  private async fetchStorageUsageRaw(): Promise<{
    usedBytes: number;
    totalLimitBytes: number;
    filesCount: number;
    isSupabase: boolean;
  }> {
    const limitGb = parseFloat(process.env.NEXT_PUBLIC_STORAGE_LIMIT_GB || '1');
    const totalLimitBytes = limitGb * 1024 * 1024 * 1024;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: files, error } = await supabase.storage.from('songs').list('', { limit: 1000 });
        if (!error && files && files.length > 0) {
          const usedBytes = files.reduce((acc, f) => {
            const size = f.metadata?.size || f.metadata?.contentLength || 0;
            return acc + size;
          }, 0);
          return {
            usedBytes,
            totalLimitBytes,
            filesCount: files.length,
            isSupabase: true,
          };
        }
      } catch (err) {
        console.warn('Could not query Supabase storage bucket:', err);
      }

      try {
        const { data: songs, error } = await supabase.from('songs').select('file_size');
        if (!error && songs && songs.length > 0) {
          const usedBytes = songs.reduce((acc, s) => acc + (s.file_size || 0), 0);
          return {
            usedBytes,
            totalLimitBytes,
            filesCount: songs.length,
            isSupabase: true,
          };
        }
      } catch (err) {
        console.warn('Could not query Supabase songs table:', err);
      }
    }

    const currentSongs = await this.getSongs();
    const usedBytes = currentSongs.reduce((acc, s) => {
      return acc + (s.file_size || (s.duration ? s.duration * 18000 : 4500000));
    }, 0);

    return {
      usedBytes,
      totalLimitBytes,
      filesCount: currentSongs.length,
      isSupabase: false,
    };
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

    this.invalidateSongsCache();
    this.invalidatePlaylistsCache();
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
  public async getPlaylists(forceRefresh = false): Promise<Playlist[]> {
    if (!forceRefresh && this.cachedPlaylists && Date.now() - this.playlistsCacheTime < this.CACHE_TTL_MS) {
      return this.cachedPlaylists;
    }
    if (!forceRefresh && this.playlistsPromise) {
      return this.playlistsPromise;
    }

    this.playlistsPromise = (async () => {
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

      this.cachedPlaylists = result;
      this.playlistsCacheTime = Date.now();
      this.playlistsPromise = null;
      return result;
    })();

    return this.playlistsPromise;
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
    this.invalidatePlaylistsCache();
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
          this.invalidateSongsCache();
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
      this.invalidatePlaylistsCache();
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
        this.invalidateSongsCache();
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
    this.invalidatePlaylistsCache();
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
  public async getRequests(forceRefresh = false): Promise<SongRequest[]> {
    if (!forceRefresh && this.cachedRequests && Date.now() - this.requestsCacheTime < this.CACHE_TTL_MS) {
      return this.cachedRequests;
    }
    if (!forceRefresh && this.requestsPromise) {
      return this.requestsPromise;
    }

    this.requestsPromise = (async () => {
      let result: SongRequest[] = [];
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('song_requests')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && data) {
            result = data as SongRequest[];
            if (typeof window !== 'undefined') {
              localStorage.setItem(REQUESTS_KEY, JSON.stringify(data));
            }
          }
        } catch (err) {
          console.warn('Error fetching Supabase song_requests:', err);
        }
      }

      if (result.length === 0 && typeof window !== 'undefined') {
        const saved = localStorage.getItem(REQUESTS_KEY);
        if (saved) {
          try {
            result = JSON.parse(saved);
          } catch {}
        }
      }

      this.cachedRequests = result;
      this.requestsCacheTime = Date.now();
      this.requestsPromise = null;
      return result;
    })();

    return this.requestsPromise;
  }

  public async addRequest(req: Omit<SongRequest, 'id' | 'created_at' | 'status'>): Promise<SongRequest> {
    const payload = {
      name: req.name.trim(),
      song_title: req.song_title.trim(),
      artist: req.artist.trim(),
      dedication: req.dedication?.trim() || null,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('song_requests')
          .insert(payload)
          .select()
          .single();

        if (!error && data) {
          const created = data as SongRequest;
          const current = await this.getRequests();
          const updated = [created, ...current.filter((r) => r.id !== created.id)];
          if (typeof window !== 'undefined') {
            localStorage.setItem(REQUESTS_KEY, JSON.stringify(updated));
          }
          if (this.broadcastChannel) {
            try {
              this.broadcastChannel.postMessage({ type: 'NEW_REQUEST', payload: created });
            } catch {}
          }
          this.invalidateRequestsCache();
          this.notifyNewRequest(created);
          this.postSync();
          return created;
        } else if (error) {
          console.warn('Supabase addRequest error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase addRequest exception:', err);
      }
    }

    const fallbackReq: SongRequest = {
      ...payload,
      id: 'req-' + Date.now(),
      dedication: payload.dedication || undefined,
    };
    const current = await this.getRequests();
    const updated = [fallbackReq, ...current];
    if (typeof window !== 'undefined') {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(updated));
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'NEW_REQUEST', payload: fallbackReq });
      } catch {}
    }
    this.invalidateRequestsCache();
    this.notifyNewRequest(fallbackReq);
    this.postSync();
    return fallbackReq;
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
      this.invalidateRequestsCache();
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

    // CRITICAL PERFORMANCE & SUPABASE QUOTA OPTIMIZATION:
    // Only persist to Supabase PostgreSQL when actual station metadata changes:
    // - On-air live state changes (is_live)
    // - Microphone on-air state changes (is_mic_active)
    // - Current song changes (id, title, artist, cover, url, duration)
    // Tick-by-tick events (such as current_song_progress from timeupdate and air_time_seconds
    // from the on-air timer) are kept purely in local state/storage and MUST NOT trigger Supabase writes.
    // This reduces database writes from >14,400/hour to ~15-20/hour, protecting Supabase quotas.
    const hasSignificantChange =
      (partial.is_live !== undefined && partial.is_live !== current.is_live) ||
      (partial.is_mic_active !== undefined && partial.is_mic_active !== current.is_mic_active) ||
      (partial.current_song_id !== undefined && partial.current_song_id !== current.current_song_id) ||
      (partial.current_song_title !== undefined && partial.current_song_title !== current.current_song_title) ||
      (partial.current_song_artist !== undefined && partial.current_song_artist !== current.current_song_artist) ||
      (partial.current_song_cover !== undefined && partial.current_song_cover !== current.current_song_cover) ||
      (partial.current_song_url !== undefined && partial.current_song_url !== current.current_song_url) ||
      (partial.current_song_duration !== undefined && partial.current_song_duration !== current.current_song_duration);

    if (hasSignificantChange) {
      // 1. Instant WebSocket broadcast directly to all connected listeners (sub-second sync)
      if (this.realtimeChannel) {
        try {
          this.realtimeChannel.send({
            type: 'broadcast',
            event: 'station_state',
            payload: updated,
          });
        } catch (e) {
          console.warn('Realtime station_state broadcast notice:', e);
        }
      }

      // 2. Persist to Supabase database for listeners who join later
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
          current_song_progress: 0,
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

  public async trackCurrentPresence(customName?: string) {
    if (!this.realtimeChannel || typeof window === 'undefined') return;
    try {
      const isStudio = window.location.pathname.startsWith('/studio');
      const storedName = customName || localStorage.getItem('nexo_chat_username');
      const userId = localStorage.getItem('nexo_chat_user_id') || 'usr_' + Math.random().toString(36).slice(2, 8);

      const payload: OnlineListener = {
        user_id: userId,
        user_name: isStudio ? '🎧 NEXO DJ (Cabina)' : (storedName || 'Oyente #' + Math.floor(100 + Math.random() * 900)),
        is_dj: isStudio,
        joined_at: new Date().toISOString(),
      };

      await this.realtimeChannel.track(payload);
    } catch (err) {
      console.warn('Realtime presence track error:', err);
    }
  }

  public getOnlineListeners(): OnlineListener[] {
    if (this.onlineListeners.length > 0) {
      return [...this.onlineListeners];
    }
    return this.defaultOnlineListeners;
  }
}

export const radioStore = new RadioStore();
