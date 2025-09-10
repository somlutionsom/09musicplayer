'use client';

import { useState, useEffect, useCallback } from 'react';
import { Track } from '../data/mockData';

export type PlaybackState = 'playing' | 'paused' | 'stopped';

// YouTube 플레이어 타입 정의
interface YouTubePlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  destroy: () => void;
}

export interface MusicPlayerState {
  currentTrack: Track | null;
  playlist: Track[];
  currentTrackIndex: number;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffling: boolean;
  isRepeating: boolean;
  playbackState: PlaybackState;
  formattedCurrentTime: string;
  formattedDuration: string;
  progress: number;
}

export interface MusicPlayerActions {
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  loadTrack: (track: Track) => void;
  loadPlaylist: (tracks: Track[]) => void;
  setCurrentTrack: (track: Track) => void;
  setCurrentTrackIndex: (index: number) => void;
  setPlaylist: (tracks: Track[]) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setYouTubePlayer: (player: YouTubePlayer | null) => void;
}

export function useMusicPlayer(): [MusicPlayerState, MusicPlayerActions] {
  const [state, setState] = useState<MusicPlayerState>({
    currentTrack: null,
    playlist: [],
    currentTrackIndex: 0,
    currentTime: 0, 
    duration: 0,
    volume: 75,
    isShuffling: false,
    isRepeating: false,
    playbackState: 'stopped',
    formattedCurrentTime: '0:00',
    formattedDuration: '0:00',
    progress: 0
  });

  // 실제 오디오 엘리먼트
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  // YouTube 플레이어
  const [youtubePlayer, setYouTubePlayerState] = useState<YouTubePlayer | null>(null);

  // 오디오 엘리먼트 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audio.volume = state.volume / 100;
      
      // 오디오 이벤트 리스너
      audio.addEventListener('timeupdate', () => {
        setState(prev => ({
          ...prev,
          currentTime: audio.currentTime
        }));
      });

      audio.addEventListener('loadedmetadata', () => {
        setState(prev => ({
          ...prev,
          duration: audio.duration
        }));
      });

      audio.addEventListener('ended', () => {
        console.log('🔚 오디오 재생 완료됨');
        setState(prev => {
          // 반복 모드가 활성화된 경우 현재 곡 다시 재생
          if (prev.isRepeating) {
            console.log('🔁 반복 모드: 현재 곡 다시 재생');
            audio.currentTime = 0;
            audio.play().catch(error => {
              console.error('❌ 반복 재생 실패:', error);
            });
            return {
              ...prev,
              currentTime: 0,
              playbackState: 'playing'
            };
          }
          
          // 플레이리스트에 다음 곡이 있으면 자동으로 넘어가기
          if (prev.playlist.length > 0) {
            const currentIndex = prev.playlist.findIndex(track => track.id === prev.currentTrack?.id);
            const nextIndex = (currentIndex + 1) % prev.playlist.length;
            const nextTrack = prev.playlist[nextIndex];
            
            if (nextIndex !== currentIndex) { // 마지막 곡이 아니라면
              console.log(`🔄 자동으로 다음 곡 재생: ${nextTrack.title}`);
              
              // 다음 곡 오디오 소스 설정
              if (nextTrack.src && !nextTrack.isYoutube) {
                try {
                  audio.src = nextTrack.src;
                  audio.load();
                  console.log('✅ 다음 곡 자동 로드됨:', nextTrack.src);
                } catch (error) {
                  console.error('❌ 다음 곡 자동 로드 실패:', error);
                }
              } else if (nextTrack.isYoutube) {
                audio.src = '';
                audio.removeAttribute('src');
                console.log('🎬 다음 곡은 YouTube 음악');
              }
              
              return {
                ...prev,
                currentTrack: nextTrack,
                currentTrackIndex: nextIndex,
                currentTime: 0,
                duration: parseDuration(nextTrack.duration),
                playbackState: 'playing' // 자동으로 다음 곡 재생
              };
            }
          }
          
          return {
            ...prev,
            playbackState: 'stopped',
            currentTime: 0
          };
        });
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        
        // 오디오 소스가 없는 경우 (YouTube 음악) 무시
        if (audio.src === '' || audio.src === window.location.href) {
          console.log('📍 빈 오디오 소스 - YouTube 음악 재생 중이므로 오류 무시');
          return;
        }
        
        // 실제 오디오 파일 오류인 경우에만 처리
        console.error('❌ 실제 오디오 재생 오류 발생');
        setState(prev => ({
          ...prev,
          playbackState: 'stopped'
        }));
      });

      setAudioElement(audio);

      return () => {
        audio.removeEventListener('timeupdate', () => {});
        audio.removeEventListener('loadedmetadata', () => {});
        audio.removeEventListener('ended', () => {});
        audio.removeEventListener('error', () => {});
      };
    }
  }, []);

  // 볼륨 변경 시 오디오 엘리먼트에 반영
  useEffect(() => {
    if (audioElement) {
      audioElement.volume = state.volume / 100;
    }
  }, [state.volume, audioElement]);

  // 시간을 MM:SS 형식으로 변환
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);



  // 실제 재생 시간 추적 (YouTube 및 오디오)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state.playbackState === 'playing') {
      interval = setInterval(() => {
        // YouTube 플레이어의 현재 시간 가져오기
        if (youtubePlayer && state.currentTrack?.isYoutube) {
          try {
            const currentTime = youtubePlayer.getCurrentTime();
            const duration = youtubePlayer.getDuration();
            
            setState(prev => ({
              ...prev,
              currentTime: currentTime,
              duration: duration || prev.duration,
              formattedCurrentTime: formatTime(currentTime),
              formattedDuration: formatTime(duration || prev.duration),
              progress: duration ? (currentTime / duration) * 100 : prev.progress
            }));
          } catch (error) {
            console.error('YouTube 시간 가져오기 실패:', error);
          }
        }
        // 일반 오디오의 경우 audioElement에서 시간 가져오기 (이미 이벤트 리스너로 처리됨)
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.playbackState, youtubePlayer, state.currentTrack]);

  const actions: MusicPlayerActions = {
    play: useCallback(() => {
      console.log('🔵 재생 시도 중...', {
        hasYouTubePlayer: !!youtubePlayer,
        isYouTube: state.currentTrack?.isYoutube,
        hasAudioElement: !!audioElement,
        audioSrc: audioElement?.src,
        currentTrack: state.currentTrack?.title,
        youtubeId: state.currentTrack?.youtubeId
      });

      // YouTube 플레이어가 있으면 YouTube 재생
      if (state.currentTrack?.isYoutube && youtubePlayer) {
        console.log('▶️ YouTube 플레이어로 재생 시작');
        try {
          // YouTube 플레이어 상태 확인
          if (!youtubePlayer) {
            console.error('❌ YouTube 플레이어가 유효하지 않습니다');
            alert('YouTube 플레이어가 준비되지 않았습니다.\n페이지를 새로고침하고 다시 시도해주세요.');
            return;
          }

          youtubePlayer.playVideo();
          console.log('✅ YouTube 재생 명령 전송됨');
        } catch (error) {
          console.error('❌ YouTube 재생 실패:', error);
          alert('YouTube 재생에 실패했습니다.\n동영상이 임베드를 허용하지 않을 수 있습니다.');
        }
      } else if (!state.currentTrack?.isYoutube && audioElement) {
        // 오디오 소스가 유효한지 확인
        if (audioElement.src && audioElement.src !== window.location.href) {
          console.log('▶️ 일반 오디오로 재생 시작');
          audioElement.play().then(() => {
            console.log('✅ 오디오 재생 성공');
          }).catch(error => {
            console.error('❌ 재생 실패:', error);
            alert('재생 실패: ' + error.message + '\n브라우저에서 오디오 재생을 허용하지 않았을 수 있습니다.');
          });
        } else {
          console.warn('⚠️ 오디오 소스가 설정되지 않음');
          alert('선택된 음악에 재생 가능한 소스가 없습니다.');
        }
      } else {
        console.warn('⚠️ 재생할 수 있는 소스가 없습니다', {
          isYoutube: state.currentTrack?.isYoutube,
          hasYoutubePlayer: !!youtubePlayer,
          hasAudioElement: !!audioElement,
          hasAudioSrc: !!audioElement?.src
        });
        alert('재생할 수 있는 음악이 선택되지 않았습니다.\n플레이리스트에서 음악을 먼저 선택해주세요.');
      }
      
      setState(prev => ({
        ...prev,
        playbackState: 'playing'
      }));
    }, [audioElement, youtubePlayer, state.currentTrack]),

    pause: useCallback(() => {
      if (youtubePlayer && state.currentTrack?.isYoutube) {
        try {
          youtubePlayer.pauseVideo();
        } catch (error) {
          console.error('❌ YouTube 일시정지 실패:', error);
        }
      } else if (audioElement && audioElement.src && audioElement.src !== window.location.href) {
        audioElement.pause();
      }
      setState(prev => ({
        ...prev,
        playbackState: 'paused'
      }));
    }, [audioElement, youtubePlayer, state.currentTrack]),

    stop: useCallback(() => {
      if (youtubePlayer && state.currentTrack?.isYoutube) {
        try {
          youtubePlayer.stopVideo();
        } catch (error) {
          console.error('❌ YouTube 정지 실패:', error);
        }
      } else if (audioElement && audioElement.src && audioElement.src !== window.location.href) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setState(prev => ({
        ...prev,
        playbackState: 'stopped',
        currentTime: 0
      }));
    }, [audioElement, youtubePlayer, state.currentTrack]),

    next: useCallback(() => {
      setState(prev => {
        if (prev.playlist.length === 0) return prev;
        
        const currentIndex = prev.playlist.findIndex(track => track.id === prev.currentTrack?.id);
        const nextIndex = (currentIndex + 1) % prev.playlist.length;
        const nextTrack = prev.playlist[nextIndex];
        
        console.log(`⏭️ 다음 곡으로 이동: ${nextTrack.title}`);
        
        // 오디오 소스 설정
        if (audioElement && nextTrack.src && !nextTrack.isYoutube) {
          try {
            audioElement.src = nextTrack.src;
            audioElement.load();
            console.log('✅ 다음 곡 오디오 소스 설정됨:', nextTrack.src);
          } catch (error) {
            console.error('❌ 다음 곡 오디오 소스 설정 실패:', error);
          }
        } else if (audioElement && nextTrack.isYoutube) {
          audioElement.src = '';
          audioElement.removeAttribute('src');
          console.log('🎬 다음 곡 YouTube 음악으로 전환');
        }
        
        return {
          ...prev,
          currentTrack: nextTrack,
          currentTrackIndex: nextIndex,
          currentTime: 0,
          duration: parseDuration(nextTrack.duration),
          playbackState: prev.playbackState === 'playing' ? 'playing' : 'stopped'
        };
      });
    }, [audioElement]),

    previous: useCallback(() => {
      setState(prev => {
        if (prev.playlist.length === 0) return prev;
        
        const currentIndex = prev.playlist.findIndex(track => track.id === prev.currentTrack?.id);
        const prevIndex = currentIndex <= 0 ? prev.playlist.length - 1 : currentIndex - 1;
        const prevTrack = prev.playlist[prevIndex];
        
        console.log(`⏮️ 이전 곡으로 이동: ${prevTrack.title}`);
        
        // 오디오 소스 설정
        if (audioElement && prevTrack.src && !prevTrack.isYoutube) {
          try {
            audioElement.src = prevTrack.src;
            audioElement.load();
            console.log('✅ 이전 곡 오디오 소스 설정됨:', prevTrack.src);
          } catch (error) {
            console.error('❌ 이전 곡 오디오 소스 설정 실패:', error);
          }
        } else if (audioElement && prevTrack.isYoutube) {
          audioElement.src = '';
          audioElement.removeAttribute('src');
          console.log('🎬 이전 곡 YouTube 음악으로 전환');
        }
        
        return {
          ...prev,
          currentTrack: prevTrack,
          currentTrackIndex: prevIndex,
          currentTime: 0,
          duration: parseDuration(prevTrack.duration),
          playbackState: prev.playbackState === 'playing' ? 'playing' : 'stopped'
        };
      });
    }, [audioElement]),

    seek: useCallback((time: number) => {
      const seekTime = Math.max(0, Math.min(time, state.duration));
      
      // YouTube 플레이어 시크
      if (youtubePlayer && state.currentTrack?.isYoutube) {
        try {
          youtubePlayer.seekTo(seekTime, true);
          console.log(`🎬 YouTube 시크: ${seekTime}초로 이동`);
        } catch (error) {
          console.error('❌ YouTube 시크 실패:', error);
        }
      } 
      // 일반 오디오 시크
      else if (audioElement && audioElement.src && audioElement.src !== window.location.href) {
        try {
          audioElement.currentTime = seekTime;
          console.log(`🎵 오디오 시크: ${seekTime}초로 이동`);
        } catch (error) {
          console.error('❌ 오디오 시크 실패:', error);
        }
      }
      
      setState(prev => ({
        ...prev,
        currentTime: seekTime
      }));
    }, [audioElement, youtubePlayer, state.currentTrack, state.duration]),

    setVolume: useCallback((volume: number) => {
      setState(prev => ({
        ...prev,
        volume: Math.max(0, Math.min(100, volume))
      }));
    }, []),

    toggleShuffle: useCallback(() => {
      setState(prev => ({
        ...prev,
        isShuffling: !prev.isShuffling
      }));
    }, []),

    toggleRepeat: useCallback(() => {
      setState(prev => {
        const newRepeating = !prev.isRepeating;
        console.log(`🔁 반복 모드 ${newRepeating ? '활성화' : '비활성화'}`);
        return {
          ...prev,
          isRepeating: newRepeating
        };
      });
    }, []),

    loadTrack: useCallback((track: Track) => {
      setState(prev => ({
        ...prev,
        currentTrack: track,
        currentTime: 0,
        duration: parseDuration(track.duration),
        playbackState: 'stopped'
      }));
    }, []),

    loadPlaylist: useCallback((tracks: Track[]) => {
      setState(prev => ({
        ...prev,
        playlist: tracks,
        currentTrack: tracks[0] || null,
        currentTrackIndex: 0,
        currentTime: 0,
        duration: tracks[0] ? parseDuration(tracks[0].duration) : 0,
        playbackState: 'stopped'
      }));
    }, []),

    setCurrentTrack: useCallback((track: Track) => {
      // YouTube 음악이 아닌 경우에만 오디오 소스 설정
      if (audioElement && track.src && !track.isYoutube) {
        try {
          audioElement.src = track.src;
          audioElement.load();
          console.log('✅ 오디오 소스 설정됨:', track.src);
        } catch (error) {
          console.error('❌ 오디오 소스 설정 실패:', error);
        }
      } else if (audioElement && track.isYoutube) {
        // YouTube 음악의 경우 오디오 소스 제거
        audioElement.src = '';
        audioElement.removeAttribute('src');
        console.log('🎬 YouTube 음악으로 전환, 오디오 소스 제거됨');
      }
      
      setState(prev => ({
        ...prev,
        currentTrack: track,
        currentTime: 0,
        duration: track.duration ? parseDuration(track.duration) : 180,
        playbackState: 'stopped'
      }));
    }, [audioElement]),

    setCurrentTrackIndex: useCallback((index: number) => {
      setState(prev => ({
        ...prev,
        currentTrackIndex: index
      }));
    }, []),

    setPlaylist: useCallback((tracks: Track[]) => {
      setState(prev => ({
        ...prev,
        playlist: tracks
      }));
    }, []),

    setPlaybackState: useCallback((playbackState: PlaybackState) => {
      setState(prev => ({
        ...prev,
        playbackState
      }));
    }, []),

    setYouTubePlayer: useCallback((player: YouTubePlayer | null) => {
      setYouTubePlayerState(player);
    }, [])
  };

  // 계산된 값들을 useMemo로 최적화
  const formattedCurrentTime = formatTime(state.currentTime);
  const formattedDuration = formatTime(state.duration);
  const progress = state.duration === 0 ? 0 : (state.currentTime / state.duration) * 100;

  return [
    {
      ...state,
      formattedCurrentTime,
      formattedDuration,
      progress
    },
    actions
  ];
}

// 시간 문자열을 초로 변환하는 헬퍼 함수
function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration;
  }
  const [minutes, seconds] = duration.split(':').map(Number);
  return minutes * 60 + seconds;
}
