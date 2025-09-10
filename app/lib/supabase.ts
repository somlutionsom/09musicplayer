import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jkdcoomemfowhehlzlpn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZGNvb21lbWZvd2hlaGx6bHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDQwMjksImV4cCI6MjA3MTYyMDAyOX0.AkohCnOBIsmxMEyyzG9bOWYuPGh08HEF3RzNAs1Xuvo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TypeScript 타입 정의
export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Song {
  id: string;
  user_id: string;
  title: string;
  artist?: string;
  album?: string;
  duration_seconds?: number;
  genre?: string;
  year?: number;
  source_type: 'upload' | 'youtube';
  youtube_url?: string;
  file_url?: string;
  cover_url?: string;
  play_count: number;
  created_at: string;
  updated_at: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaylistSong {
  id: string;
  playlist_id: string;
  song_id: string;
  position: number;
  added_at: string;
}

export interface UserSettings {
  id: string;
  theme: 'light' | 'dark';
  volume: number;
  repeat_mode: 'off' | 'one' | 'all';
  shuffle_enabled: boolean;
  crossfade_duration: number;
  created_at: string;
  updated_at: string;
}

export interface PlayHistory {
  id: string;
  user_id: string;
  song_id: string;
  played_at: string;
  duration_played?: number;
  completion_percentage?: number;
}

