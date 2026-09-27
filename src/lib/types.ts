export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre: string;
  duration: number; // in seconds
  file_url: string;
  cover_url: string;
  file_size?: number;
  play_count?: number;
  is_favorite?: boolean;
  created_at?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_url: string;
  songs_count?: number;
  duration_seconds?: number;
  songs?: Song[];
  created_at?: string;
}

export interface SongRequest {
  id: string;
  name: string;
  song_title: string;
  artist: string;
  dedication?: string;
  status: 'pending' | 'reviewed' | 'played' | 'discarded';
  created_at: string;
}

export interface StationState {
  id: string;
  is_live: boolean;
  is_mic_active: boolean;
  current_song_id?: string | null;
  current_song_title: string;
  current_song_artist: string;
  current_song_cover: string;
  current_song_url?: string;
  current_song_duration: number;
  current_song_progress: number;
  listeners_count: number;
  air_time_seconds: number;
  updated_at?: string;
}

export interface AudioLevels {
  mic: number;     // 0 - 100
  music: number;   // 0 - 100
  master: number;  // 0 - 100
}

export interface ChatMessage {
  id: string;
  user_name: string;
  text: string;
  created_at: string;
  is_dj?: boolean;
  user_id?: string;
}

