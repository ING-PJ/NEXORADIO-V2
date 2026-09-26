import { Song, Playlist, StationState, SongRequest } from './types';

export const INITIAL_SONGS: Song[] = [
  {
    id: 'song-1',
    title: 'Summer Vibes',
    artist: 'Calvin Harris ft. NEXO',
    album: 'Summer Collection',
    genre: 'Electrónica',
    duration: 232, // 3:52
    file_url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=summer-tropical-house-113264.mp3',
    cover_url: '/cover_default.webp',
    file_size: 5800000,
    play_count: 1248,
    is_favorite: true,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'song-2',
    title: 'Flowers',
    artist: 'Miley Cyrus',
    album: 'Endless Summer',
    genre: 'Pop',
    duration: 200, // 3:20
    file_url: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=lofi-study-112191.mp3',
    cover_url: '/cover_default.webp',
    file_size: 4900000,
    play_count: 980,
    is_favorite: true,
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: 'song-3',
    title: 'As It Was',
    artist: 'Harry Styles',
    album: "Harry's House",
    genre: 'Pop',
    duration: 167, // 2:47
    file_url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=electronic-future-beats-117997.mp3',
    cover_url: '/cover_default.webp',
    file_size: 4200000,
    play_count: 850,
    is_favorite: false,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'song-4',
    title: 'Calm Down',
    artist: 'Rema & Selena Gomez',
    album: 'Rave & Roses',
    genre: 'Afrobeat',
    duration: 239, // 3:59
    file_url: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_9a3637eec5.mp3?filename=uplifting-day-15583.mp3',
    cover_url: '/cover_default.webp',
    file_size: 5900000,
    play_count: 720,
    is_favorite: true,
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: 'song-5',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    genre: 'Pop',
    duration: 201, // 3:21
    file_url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=tuesday-glitch-114220.mp3',
    cover_url: '/cover_default.webp',
    file_size: 5100000,
    play_count: 1420,
    is_favorite: false,
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'song-6',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    genre: 'Pop',
    duration: 203, // 3:23
    file_url: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=sexy-fashion-beats-118837.mp3',
    cover_url: '/cover_default.webp',
    file_size: 5200000,
    play_count: 1105,
    is_favorite: true,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'playlist-1',
    name: 'Favoritas',
    description: 'Canciones más votadas por los oyentes y el equipo.',
    cover_url: '/cover_default.webp',
    songs_count: 6,
    duration_seconds: 1242,
    songs: INITIAL_SONGS.filter(s => s.is_favorite),
    created_at: new Date().toISOString(),
  },
  {
    id: 'playlist-2',
    name: 'Éxitos del Momento',
    description: 'Los tracks más sonados en la programación diaria.',
    cover_url: '/cover_default.webp',
    songs_count: 6,
    duration_seconds: 1242,
    songs: INITIAL_SONGS,
    created_at: new Date().toISOString(),
  },
  {
    id: 'playlist-3',
    name: 'NEXO Morning',
    description: 'Tu dosis de buena energía y buena música cada mañana.',
    cover_url: '/cover_default.webp',
    songs_count: 4,
    duration_seconds: 838,
    songs: INITIAL_SONGS.slice(0, 4),
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_REQUESTS: SongRequest[] = [
  {
    id: 'req-1',
    name: 'Sofía',
    song_title: 'Summer',
    artist: 'Calvin Harris',
    dedication: '¡Un saludo enorme para todos los que están conectados en Medellín!',
    status: 'reviewed',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'req-2',
    name: 'Carlos M.',
    song_title: 'Flowers',
    artist: 'Miley Cyrus',
    dedication: 'Dedicada para Andrea en su cumpleaños. ¡Gran programa!',
    status: 'pending',
    created_at: new Date(Date.now() - 8 * 60000).toISOString(),
  },
  {
    id: 'req-3',
    name: 'Valentina G.',
    song_title: 'Levitating',
    artist: 'Dua Lipa',
    dedication: 'Para el grupo de diseño que está trabajando hasta tarde.',
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
  }
];

export const INITIAL_STATION_STATE: StationState = {
  id: 'current',
  is_live: true,
  is_mic_active: false,
  current_song_id: 'song-1',
  current_song_title: 'Summer',
  current_song_artist: 'Calvin Harris',
  current_song_cover: '/cover_default.webp',
  current_song_duration: 232,
  current_song_progress: 84,
  listeners_count: 1248,
  air_time_seconds: 1457, // 00:24:17
};
