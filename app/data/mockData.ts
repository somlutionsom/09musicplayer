// Supabase와 호환되는 데이터 타입
import { Song } from '../lib/supabase';

// 기존 Track을 Song으로 변환하는 헬퍼 함수
export const convertTrackToSong = (track: Track): Partial<Song> => ({
  title: track.title,
  artist: track.artist,
  album: track.album,
  duration_seconds: parseDuration(track.duration),
  genre: track.genre,
  year: track.year,
  source_type: 'youtube' as const,
  cover_url: track.albumArt,
  play_count: 0,
});

// 시간을 초로 변환하는 함수
const parseDuration = (duration: string | number): number => {
  if (typeof duration === 'number') {
    return duration;
  }
  const [minutes, seconds] = duration.split(':').map(Number);
  return minutes * 60 + seconds;
};

// 기존 인터페이스 (하위 호환성을 위해 유지)
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string | number;
  albumArt?: string;
  genre?: string;
  year?: number;
  src?: string;
  isPlayable?: boolean;
  isYoutube?: boolean;
  youtubeId?: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  created: string;
  isPublic: boolean;
}

export interface User {
  id: string;
  name: string;
  isPremium: boolean;
  playlists: Playlist[];
}

// 샘플 트랙 데이터
export const mockTracks: Track[] = [
  {
    id: "1",
    title: "Sweet Dreams",
    artist: "Eurythmics",
    album: "Sweet Dreams (Are Made of This)",
    duration: "3:36",
    genre: "Synth-pop",
    year: 1983
  },
  {
    id: "2", 
    title: "Take On Me",
    artist: "a-ha",
    album: "Hunting High and Low",
    duration: "3:47",
    genre: "Synth-pop",
    year: 1985
  },
  {
    id: "3",
    title: "Blue Monday",
    artist: "New Order",
    album: "Power, Corruption & Lies",
    duration: "7:30",
    genre: "Electronic",
    year: 1983
  },
  {
    id: "4",
    title: "Tainted Love",
    artist: "Soft Cell",
    album: "Non-Stop Erotic Cabaret",
    duration: "2:43",
    genre: "Synth-pop",
    year: 1981
  },
  {
    id: "5",
    title: "Love Is a Battlefield",
    artist: "Pat Benatar",
    album: "Live from Earth",
    duration: "5:13",
    genre: "Rock",
    year: 1983
  }
];

// 샘플 플레이리스트
export const mockPlaylists: Playlist[] = [
  {
    id: "1",
    name: "80s Hits",
    tracks: mockTracks.slice(0, 3),
    created: "2024-01-01",
    isPublic: true
  },
  {
    id: "2", 
    name: "My Favorites",
    tracks: [mockTracks[0], mockTracks[3], mockTracks[4]],
    created: "2024-01-15",
    isPublic: false
  }
];

// 현재 사용자 데이터
export const mockUser: User = {
  id: "user1",
  name: "Music Lover",
  isPremium: false,
  playlists: mockPlaylists
};

// 추천 트랙 생성 함수
export const getRecommendedTracks = (currentTrack: Track): Track[] => {
  return mockTracks
    .filter(track => track.id !== currentTrack.id && track.genre === currentTrack.genre)
    .slice(0, 3);
};

// 랜덤 트랙 선택 함수
export const getRandomTrack = (): Track => {
  const randomIndex = Math.floor(Math.random() * mockTracks.length);
  return mockTracks[randomIndex];
};

// 플레이리스트에서 다음 트랙 찾기
export const getNextTrack = (currentTrackId: string, playlist: Track[]): Track | null => {
  const currentIndex = playlist.findIndex(track => track.id === currentTrackId);
  if (currentIndex === -1 || currentIndex === playlist.length - 1) {
    return null;
  }
  return playlist[currentIndex + 1];
};

// 플레이리스트에서 이전 트랙 찾기
export const getPreviousTrack = (currentTrackId: string, playlist: Track[]): Track | null => {
  const currentIndex = playlist.findIndex(track => track.id === currentTrackId);
  if (currentIndex <= 0) {
    return null;
  }
  return playlist[currentIndex - 1];
};
