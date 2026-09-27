-- =========================================================
-- NEXO RADIO V1 - Supabase Database Schema & Setup
-- =========================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SONGS TABLE (Biblioteca musical)
CREATE TABLE IF NOT EXISTS public.songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    genre VARCHAR(100) DEFAULT 'Pop',
    duration INTEGER DEFAULT 0, -- in seconds
    file_url TEXT NOT NULL,
    cover_url TEXT DEFAULT '/cover_default.webp',
    file_size INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PLAYLISTS TABLE
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_url TEXT DEFAULT '/cover_default.webp',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PLAYLIST_SONGS (Relación N:M ordenada)
CREATE TABLE IF NOT EXISTS public.playlist_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SONG_REQUESTS TABLE (Solicitudes del público y dedicatorias)
CREATE TABLE IF NOT EXISTS public.song_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    song_title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    dedication TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'played', 'discarded')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STATION_STATE TABLE (Estado de la emisora en vivo y canción sonando)
CREATE TABLE IF NOT EXISTS public.station_state (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    is_live BOOLEAN DEFAULT false,
    is_mic_active BOOLEAN DEFAULT false,
    current_song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
    current_song_title VARCHAR(255) DEFAULT 'NEXO Stream',
    current_song_artist VARCHAR(255) DEFAULT 'NEXO RADIO',
    current_song_cover TEXT DEFAULT '/cover_default.webp',
    current_song_url TEXT DEFAULT '/songs/summer.mp3',
    current_song_duration INTEGER DEFAULT 0,
    current_song_progress INTEGER DEFAULT 0,
    listeners_count INTEGER DEFAULT 1,
    air_time_seconds INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial station state row
INSERT INTO public.station_state (id, is_live, current_song_title, current_song_artist, current_song_cover, current_song_url, listeners_count)
VALUES ('current', true, 'Summer Vibes', 'Calvin Harris ft. NEXO', '/cover_default.webp', '/songs/summer.mp3', 1)
ON CONFLICT (id) DO UPDATE SET
    current_song_title = EXCLUDED.current_song_title,
    current_song_artist = EXCLUDED.current_song_artist,
    current_song_cover = EXCLUDED.current_song_cover,
    current_song_url = EXCLUDED.current_song_url;

-- Seed default playlists
INSERT INTO public.playlists (id, name, description, cover_url)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Favoritas', 'Las canciones más votadas y especiales de la emisora.', '/cover_default.webp'),
    ('22222222-2222-2222-2222-222222222222', 'Éxitos del Momento', 'Los hits globales que están sonando en el mundo.', '/cover_default.webp'),
    ('33333333-3333-3333-3333-333333333333', 'NEXO Morning', 'Tu dosis de buena energía cada mañana.', '/cover_default.webp')
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS)
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies:
-- 1. Public can read station_state, requests, songs and playlists
CREATE POLICY "Public read station_state" ON public.station_state FOR SELECT USING (true);
CREATE POLICY "Public read songs" ON public.songs FOR SELECT USING (true);
CREATE POLICY "Public read playlists" ON public.playlists FOR SELECT USING (true);
CREATE POLICY "Public read playlist_songs" ON public.playlist_songs FOR SELECT USING (true);

-- 2. Public can insert song requests
CREATE POLICY "Public insert requests" ON public.song_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth manage requests" ON public.song_requests FOR ALL TO authenticated USING (true);

-- 3. Authenticated (DJ/Studio) can manage everything
CREATE POLICY "Auth manage songs" ON public.songs FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth manage playlists" ON public.playlists FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth manage playlist_songs" ON public.playlist_songs FOR ALL TO authenticated USING (true);
CREATE POLICY "Public update station_state" ON public.station_state FOR ALL USING (true);

-- Enable Supabase Realtime for instant station updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.station_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.song_requests;

-- ==============================================================================
-- 6. TABLA DE MENSAJES DE CHAT EN VIVO (OPCIONAL PARA HISTORIAL PERMANENTE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  text TEXT NOT NULL,
  is_dj BOOLEAN DEFAULT FALSE,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read chat_messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Public insert chat_messages" ON public.chat_messages FOR INSERT WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Storage buckets setup (to run in Supabase Storage SQL editor or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('songs', 'songs', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT DO NOTHING;

