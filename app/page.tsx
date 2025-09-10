'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMusicPlayer } from "./hooks/useMusicPlayer";
import { useAuth } from "./hooks/useAuth";

export default function Home() {
  const [playerState, playerActions] = useMusicPlayer();
  const { user, signIn, signUp, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [userSongs, setUserSongs] = useState<Array<{
    id: string;
    title: string;
    artist?: string;
    album?: string;
    duration_seconds?: number;
    source_type: string;
    file_url?: string;
    youtube_url?: string;
  }>>([]);
  const [showPlaylist, setShowPlaylist] = useState(false);
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

  // YouTube API 타입 정의
  interface YouTubeAPI {
    Player: new (elementId: string, config: unknown) => YouTubePlayer;
    PlayerState: {
      PLAYING: number;
      PAUSED: number;
      ENDED: number;
    };
  }

  const [youtubePlayer, setYoutubePlayer] = useState<YouTubePlayer | null>(null);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  const [albumCovers, setAlbumCovers] = useState<Record<string, string>>({});

  // YouTube 링크 추가 핸들러
  const handleYouTubeAdd = async (youtubeUrl: string, title: string, artist: string) => {
    console.log('🎵 YouTube 음악 추가 시도:', { youtubeUrl, title, artist, userId: user?.id });
    
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 타임아웃 설정 (30초)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.')), 30000);
    });

    try {
      const operationPromise = (async () => {
      const { supabase } = await import('./lib/supabase');
      console.log('📡 Supabase 클라이언트 로드됨');

      // Supabase 연결 상태 확인
      console.log('🔗 Supabase 연결 테스트 시작...');
      const { data: connectionTest, error: connectionError } = await supabase
        .from('songs')
        .select('*')
        .limit(1);
      
      console.log('🔗 Supabase 연결 테스트 결과:', { connectionTest, connectionError });

      if (connectionError) {
        console.error('❌ Supabase 연결 실패:', connectionError);
        alert('데이터베이스 연결에 실패했습니다: ' + connectionError.message);
        return;
      }

      console.log('✅ Supabase 연결 성공');

      // 데이터베이스에 YouTube 음악 정보 저장
      console.log('💾 데이터베이스 저장 시작...');
      const { data, error: dbError } = await supabase
        .from('songs')
        .insert({
          user_id: user.id,
          title: title || 'Unknown Title',
          artist: artist || 'Unknown Artist',
          source_type: 'youtube',
          youtube_url: youtubeUrl,
        })
        .select();

      console.log('💾 데이터베이스 저장 결과:', { data, error: dbError });

      if (dbError) {
        console.error('❌ 데이터베이스 저장 실패:', dbError);
        alert('데이터베이스 저장 실패: ' + dbError.message);
        return;
      }

        console.log('✅ YouTube 음악 추가 성공:', data);
        alert('YouTube 음악이 성공적으로 추가되었습니다!');
        setShowYouTubeModal(false);
        // 음악 목록 새로고침
        if (user) {
          loadUserSongs();
        }
      })();

      // 타임아웃과 작업을 경쟁시킴
      await Promise.race([operationPromise, timeoutPromise]);
      
    } catch (error) {
      console.error('❌ YouTube 추가 중 오류:', error);
      alert('YouTube 추가 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  };

  // 사용자 음악 목록 로드
  const loadUserSongs = useCallback(async () => {
    if (!user) {
      console.log('👤 사용자가 로그인하지 않음');
      return;
    }

    console.log('🎵 사용자 음악 목록 로드 시작:', user.id);

    try {
      const { supabase } = await import('./lib/supabase');
      console.log('📡 Supabase 클라이언트 로드됨 (음악 목록)');
      
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('📊 음악 목록 조회 결과:', { data, error });

      if (error) {
        console.error('❌ 음악 목록 로드 실패:', error);
        return;
      }

      console.log('✅ 음악 목록 로드 성공:', data?.length || 0, '개');
      setUserSongs(data || []);
      
      // 앨범 커버 로드
      if (data && data.length > 0) {
        const covers: {[key: string]: string} = {};
        data.forEach(song => {
          if (song.album_cover) {
            covers[song.id] = song.album_cover;
          }
        });
        setAlbumCovers(covers);
        console.log('🖼️ 앨범 커버 로드됨:', Object.keys(covers).length, '개');
      }
    } catch (error) {
      console.error('❌ 음악 목록 로드 중 오류:', error);
    }
  }, [user]);

  // 사용자 로그인 시 음악 목록 로드
  useEffect(() => {
    if (user) {
      loadUserSongs();
    } else {
      setUserSongs([]);
    }
  }, [user]);

  // YouTube API 초기화
  useEffect(() => {
    // YouTube API 스크립트 로드
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onload = () => {
      // API가 로드되면 onYouTubeIframeAPIReady 함수가 호출됨
    };
    document.body.appendChild(script);

    // YouTube API 준비 콜백 전역 함수 설정
    (window as unknown as { onYouTubeIframeAPIReady: () => void }).onYouTubeIframeAPIReady = () => {
      console.log('✅ YouTube API 로드 완료');
      setIsYouTubeAPIReady(true);
    };

    return () => {
      // 클린업
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // YouTube URL에서 비디오 ID 추출
  const extractYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // 앨범 커버 업로드 함수
  const handleAlbumCoverUpload = async () => {
    if (!playerState.currentTrack) {
      alert('먼저 재생할 곡을 선택해주세요.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        // 이미지를 Base64로 변환
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Image = e.target?.result as string;
          
          if (user && playerState.currentTrack) {
            console.log('🖼️ 앨범 커버 업로드 중:', playerState.currentTrack.title);
            
            // Supabase에 커버 이미지 정보 저장
            const { supabase } = await import('./lib/supabase');
            const { error } = await supabase
              .from('songs')
              .update({ 
                album_cover: base64Image 
              })
              .eq('user_id', user.id)
              .eq('id', playerState.currentTrack.id);

            if (error) {
              console.error('❌ 커버 이미지 저장 실패:', error);
              alert('커버 이미지 저장에 실패했습니다.');
            } else {
              // 로컬 상태 업데이트
              setAlbumCovers(prev => ({
                ...prev,
                [playerState.currentTrack!.id]: base64Image
              }));
              console.log('✅ 앨범 커버 저장됨');
              alert('앨범 커버가 저장되었습니다!');
              // 사용자 음악 다시 로드
              loadUserSongs();
            }
          } else {
            // 로그인하지 않은 경우 로컬에만 저장
            setAlbumCovers(prev => ({
              ...prev,
              [playerState.currentTrack!.id]: base64Image
            }));
            console.log('✅ 앨범 커버 로컬 저장됨');
          }
        };
        
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('❌ 이미지 처리 실패:', error);
        alert('이미지 처리에 실패했습니다.');
      }
    };
    
    input.click();
  };

  // 테스트용 샘플 음악 추가 함수
  const addSampleMusic = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    const sampleTracks = [
      {
        title: "Sample Sound 1",
        artist: "Test Artist",
        album: "Demo Collection",
        source_type: "sample",
        file_url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+LyvmwhCjiN2e3QfS4GM3/J8duXQwsVYrjn7qxYFQlAmuH1umAhBzuN2O7KdSMJ",
        duration_seconds: 3
      },
      {
        title: "Sample Sound 2", 
        artist: "Demo Artist",
        album: "Test Album",
        source_type: "sample", 
        file_url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+LyvmwhCjiN2e3QfS4GM3/J8duXQwsVYrjn7qxYFQlAmuH1umAhBzuN2O7KdSMJ",
        duration_seconds: 3
      }
    ];

    try {
      const { supabase } = await import('./lib/supabase');
      
      for (const track of sampleTracks) {
        const { error } = await supabase
          .from('songs')
          .insert({
            user_id: user.id,
            ...track
          });

        if (error) {
          console.error('샘플 음악 추가 실패:', error);
        }
      }

      alert('샘플 음악이 추가되었습니다!');
      loadUserSongs();
    } catch (error) {
      console.error('샘플 음악 추가 중 오류:', error);
    }
  };

  // YouTube 플레이어 생성
  const createYouTubePlayer = useCallback((videoId: string) => {
    console.log('🎬 YouTube 플레이어 생성 시도:', { videoId, isYouTubeAPIReady });
    
    if (!isYouTubeAPIReady) {
      console.error('❌ YouTube API가 아직 로드되지 않았습니다');
      alert('YouTube API 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return null;
    }

    if (!videoId) {
      console.error('❌ 유효하지 않은 비디오 ID');
      return null;
    }

    try {
      // 기존 플레이어 제거
      if (youtubePlayer) {
        console.log('🗑️ 기존 YouTube 플레이어 제거');
        youtubePlayer.destroy();
        setYoutubePlayer(null);
      }

      // 플레이어 컨테이너 준비
      let playerDiv = document.getElementById('youtube-player');
      if (playerDiv) {
        playerDiv.remove();
      }
      
      playerDiv = document.createElement('div');
      playerDiv.id = 'youtube-player';
      playerDiv.style.position = 'absolute';
      playerDiv.style.top = '-1000px';
      playerDiv.style.left = '-1000px';
      playerDiv.style.width = '1px';
      playerDiv.style.height = '1px';
      document.body.appendChild(playerDiv);

      const YT = (window as unknown as { YT: YouTubeAPI }).YT;
      console.log('🎥 새 YouTube 플레이어 생성 중...', videoId);
      
      const player = new YT.Player('youtube-player', {
        height: '1',
        width: '1',
        videoId: videoId,
        playerVars: {
          'autoplay': 0,
          'controls': 0,
          'disablekb': 1,
          'fs': 0,
          'modestbranding': 1,
          'rel': 0,
          'iv_load_policy': 3,
          'cc_load_policy': 0,
          'start': 0,
          'end': 0
        },
        events: {
          'onReady': (event: { target: unknown }) => {
            console.log('✅ YouTube 플레이어 준비 완료');
            // 플레이어를 훅에도 설정
            playerActions.setYouTubePlayer(event.target as YouTubePlayer);
            
            // YouTube 비디오 길이 가져오기
            try {
              const player = event.target as YouTubePlayer;
              const duration = player.getDuration();
              if (duration && duration > 0) {
                if (playerState.currentTrack) {
                  playerActions.setCurrentTrack({
                    ...playerState.currentTrack,
                    duration: duration
                  });
                }
              }
            } catch (error) {
              console.error('YouTube 길이 가져오기 실패:', error);
            }
          },
          'onStateChange': (event: { data: number }) => {
            console.log('🔄 YouTube 플레이어 상태 변경:', event.data);
            const YT = (window as unknown as { YT: YouTubeAPI }).YT;
            if (event.data === YT.PlayerState.PLAYING) {
              console.log('▶️ YouTube 재생 시작됨');
              playerActions.setPlaybackState('playing');
            } else if (event.data === YT.PlayerState.PAUSED) {
              console.log('⏸️ YouTube 일시정지됨');
              playerActions.setPlaybackState('paused');
            } else if (event.data === YT.PlayerState.ENDED) {
              console.log('⏹️ YouTube 재생 완료됨');
              
              // 반복 모드가 활성화된 경우 현재 곡 다시 재생
              if (playerState.isRepeating) {
                console.log('🔁 반복 모드: YouTube 현재 곡 다시 재생');
                setTimeout(() => {
                  if (youtubePlayer) {
                    youtubePlayer.seekTo(0, true);
                    youtubePlayer.playVideo();
                  }
                }, 100);
                return;
              }
              
              // 자동으로 다음 곡 재생
              if (playerState.playlist.length > 0) {
                const currentIndex = playerState.playlist.findIndex(track => track.id === playerState.currentTrack?.id);
                const nextIndex = (currentIndex + 1) % playerState.playlist.length;
                
                if (nextIndex !== currentIndex) { // 마지막 곡이 아니라면
                  console.log('🔄 YouTube 재생 완료 후 자동으로 다음 곡 재생');
                  playerActions.next();
                  // 다음 곡이 자동으로 재생되도록 약간 지연 후 재생
                  setTimeout(() => {
                    if (playerState.playbackState !== 'playing') {
                      playerActions.play();
                    }
                  }, 500);
                } else {
                  playerActions.setPlaybackState('stopped');
                }
              } else {
                playerActions.setPlaybackState('stopped');
              }
            }
          },
          'onError': (event: { data: number }) => {
            console.error('❌ YouTube 플레이어 오류:', event.data);
            
            let errorMessage = 'YouTube 동영상을 재생할 수 없습니다.\n\n';
            
            switch (event.data) {
              case 2:
                errorMessage += '잘못된 동영상 ID입니다.';
                break;
              case 5:
                errorMessage += 'HTML5 플레이어 오류가 발생했습니다.';
                break;
              case 100:
                errorMessage += '동영상을 찾을 수 없습니다.\n(삭제되었거나 비공개일 수 있습니다)';
                break;
              case 101:
              case 150:
                errorMessage += '이 동영상은 임베드가 허용되지 않습니다.\n(저작권 제한 또는 업로더 설정)';
                break;
              default:
                errorMessage += `알 수 없는 오류 (코드: ${event.data})`;
            }
            
            errorMessage += '\n\n다른 YouTube 링크를 시도해보세요.';
            
            alert(errorMessage);
            
            // 오류 발생한 동영상을 플레이리스트에서 표시
            playerActions.setPlaybackState('stopped');
          }
        }
      });

      setYoutubePlayer(player);
      console.log('✅ YouTube 플레이어 객체 생성됨');
      return player;
    } catch (error) {
      console.error('❌ YouTube 플레이어 생성 실패:', error);
      alert('YouTube 플레이어 생성에 실패했습니다: ' + error);
      return null;
    }
  }, [isYouTubeAPIReady, youtubePlayer, playerActions, playerState.currentTrack]);

  // 음악 선택 핸들러
  const handleSongSelect = (song: {
    id: string;
    title: string;
    artist?: string;
    album?: string;
    duration_seconds?: number;
    source_type: string;
    file_url?: string;
    youtube_url?: string;
  }, index: number) => {
    let audioSrc = '';
    let isPlayable = false;
    let isYoutube = false;

    // 재생 가능한 소스 결정
    if (song.source_type === 'sample' && song.file_url) {
      audioSrc = song.file_url;
      isPlayable = true;
    } else if (song.source_type === 'upload' && song.file_url) {
      audioSrc = song.file_url;
      isPlayable = true;
    } else if (song.source_type === 'youtube' && song.youtube_url) {
      const videoId = extractYouTubeVideoId(song.youtube_url);
      console.log('🎬 YouTube 음악 선택:', { title: song.title, videoId, youtube_url: song.youtube_url });
      
      if (!videoId) {
        alert(`잘못된 YouTube URL입니다: ${song.youtube_url}`);
        return;
      }
      
      if (!isYouTubeAPIReady) {
        alert('YouTube API가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      // YouTube 플레이어 생성
      const player = createYouTubePlayer(videoId);
      if (player) {
        isYoutube = true;
        isPlayable = true;
        audioSrc = song.youtube_url;
      } else {
        alert(`YouTube 플레이어 생성에 실패했습니다.`);
        return;
      }
    }

    const track = {
      id: song.id,
      title: song.title,
      artist: song.artist || 'Unknown Artist',
      album: song.album || 'Unknown Album',
      duration: song.duration_seconds || 180,
      src: audioSrc,
      isPlayable: isPlayable,
      isYoutube: isYoutube,
      youtubeId: isYoutube && song.youtube_url ? extractYouTubeVideoId(song.youtube_url) : null
    };

    // 플레이어 상태 업데이트
    playerActions.setCurrentTrack(track);
    playerActions.setCurrentTrackIndex(index);
    playerActions.setPlaylist(userSongs.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist || 'Unknown Artist',
      album: s.album || 'Unknown Album',
      duration: s.duration_seconds || 180,
      src: s.source_type === 'youtube' ? s.youtube_url : s.file_url,
      isPlayable: true,
      isYoutube: s.source_type === 'youtube',
      youtubeId: s.source_type === 'youtube' && s.youtube_url ? extractYouTubeVideoId(s.youtube_url) : null
    })));
    
    // 자동 재생하지 않음 - 사용자가 재생 버튼을 명시적으로 클릭해야 함
    // (브라우저 자동재생 정책 준수)
    console.log('🎵 음악 선택됨:', track.title, 'YouTube:', isYoutube, 'Playable:', isPlayable);
  };

  // 현재 트랙 변경 시 YouTube 플레이어 업데이트
  useEffect(() => {
    if (playerState.currentTrack?.isYoutube && playerState.currentTrack?.youtubeId) {
      console.log('🎵 트랙 변경으로 YouTube 플레이어 업데이트:', playerState.currentTrack.title);
      createYouTubePlayer(playerState.currentTrack.youtubeId);
    }
  }, [playerState.currentTrack?.id, playerState.currentTrack?.isYoutube, playerState.currentTrack?.youtubeId]);

  // 키보드 단축키 지원
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 입력 필드에서는 단축키 비활성화
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (playerState.playbackState === 'playing') {
            playerActions.pause();
          } else {
            playerActions.play();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          playerActions.previous();
          break;
        case 'ArrowRight':
          e.preventDefault();
          playerActions.next();
          break;
        case 'KeyS':
          e.preventDefault();
          playerActions.stop();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playerState.playbackState, playerActions]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* 메인 음악 플레이어 윈도우 */}
      <div 
        className="music-player-window"
        role="application"
        aria-label="Music Player 90s Interface"
      >
        {/* 윈도우 타이틀 바 */}
        <div className="window-title-bar">
          <div className="window-title-text">som-player♥</div>
          <div className="window-controls">
            <button className="window-control-btn minimize">_</button>
            <button className="window-control-btn maximize">□</button>
            <button className="window-control-btn close">×</button>
          </div>
        </div>

        {/* 메뉴 바 */}
        <nav className="menu-bar" role="menubar" aria-label="Main menu">
          <button 
            className="menu-item" 
            role="menuitem" 
            tabIndex={0}
            onClick={() => setShowYouTubeModal(true)}
            style={{ cursor: 'pointer' }}
          >
            Music
          </button>
          <button 
            className="menu-item" 
            role="menuitem" 
            tabIndex={0}
            onClick={() => setShowPlaylist(!showPlaylist)}
            style={{ cursor: 'pointer' }}
          >
            Playlist
          </button>
          <button 
            className="menu-item" 
            role="menuitem" 
            tabIndex={0}
            onClick={() => user ? signOut() : setShowAuthModal(true)}
            style={{ cursor: 'pointer' }}
          >
            {user ? 'Log-out' : 'Log-in'}
          </button>
        </nav>

        {/* 앨범 아트 섹션 */}
        <div className="album-art-section">
          <div 
            className="album-cover"
            role="img"
            aria-label={`Album art for ${playerState.currentTrack?.album || 'Unknown Album'}`}
            onClick={handleAlbumCoverUpload}
            style={{ 
              cursor: 'pointer',
              backgroundImage: playerState.currentTrack && albumCovers[playerState.currentTrack.id] 
                ? `url(${albumCovers[playerState.currentTrack.id]})` 
                : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
            title="클릭하여 앨범 커버 변경"
          >
            {!(playerState.currentTrack && albumCovers[playerState.currentTrack.id]) && (
              <div className="album-placeholder">♪</div>
            )}
          </div>
        </div>

        {/* 트랙 정보 패널 */}
        <div className="track-info-panel">
          <div className="track-title">
            {playerState.currentTrack?.title || 'No Track'}
            {playerState.playbackState === 'playing' && (
              <span className="playing-indicator" aria-label="Currently playing"></span>
            )}
          </div>
          <div className="artist-name">{playerState.currentTrack?.artist || 'No Artist'}</div>
        </div>

        {/* 프로그레스 섹션 */}
        <div className="progress-section">
          <div className="time-display">
            <span className="current-time">{playerState.formattedCurrentTime}</span>
            <span className="total-time">{playerState.formattedDuration}</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-track"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                const newTime = percent * playerState.duration;
                playerActions.seek(newTime);
              }}
              style={{ cursor: 'pointer' }}
              role="slider"
              aria-label="Progress bar"
              aria-valuemin={0}
              aria-valuemax={playerState.duration}
              aria-valuenow={playerState.currentTime}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                  playerActions.seek(Math.max(0, playerState.currentTime - 10));
                } else if (e.key === 'ArrowRight') {
                  playerActions.seek(Math.min(playerState.duration, playerState.currentTime + 10));
                }
              }}
            >
              <div 
                className="progress-fill" 
                style={{ width: `${playerState.progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 컨트롤 버튼들 */}
        <div className="control-buttons" role="group" aria-label="Playback controls">
          <button 
            className="control-btn"
            onClick={playerActions.previous}
            title="Previous Track"
          >
            ⏮
          </button>
          <button 
            className="control-btn play-pause"
            onClick={() => {
              console.log('🎮 재생 버튼 클릭됨, 현재 상태:', playerState.playbackState);
              console.log('🎵 현재 트랙:', playerState.currentTrack?.title);
              if (playerState.playbackState === 'playing') {
                playerActions.pause();
              } else {
                playerActions.play();
              }
            }}
            title={playerState.playbackState === 'playing' ? 'Pause' : 'Play'}
          >
            {playerState.playbackState === 'playing' ? '⏸' : '▶'}
          </button>
          <button 
            className="control-btn"
            onClick={playerActions.next}
            title="Next Track"
          >
            ⏭
          </button>
          <button 
            className={`control-btn repeat-btn ${playerState.isRepeating ? 'active' : ''}`}
            onClick={playerActions.toggleRepeat}
            title={playerState.isRepeating ? "반복 해제" : "한곡 반복"}
          >
            ♥
          </button>
        </div>



        {/* 플레이리스트 패널 */}
        {showPlaylist && user && (
          <div className="playlist-panel">
            <div className="playlist-header">
              <h4>MY PLAYLIST ♡</h4>
            </div>
            <div className="playlist-content">
              {userSongs.length === 0 ? (
                <div className="empty-playlist">
                  <p>추가된 음악이 없습니다.</p>
                  <p>&quot;Music&quot; 메뉴에서 YouTube 링크를 추가해보세요!</p>
                </div>
              ) : (
                <div className="song-list">
                  {userSongs.map((song: { id: string; title: string; artist?: string; source_type: string }, index) => (
                    <div 
                      key={song.id} 
                      className={`song-item ${playerState.currentTrackIndex === index ? 'playing' : ''}`}
                      onClick={() => handleSongSelect(song, index)}
                    >
                      <div className="song-number">{index + 1}</div>
                      <div className="song-info">
                        <div className="song-title">{song.title}</div>
                        <div className="song-artist">{song.artist || 'Unknown Artist'}</div>
                      </div>
                      <div className="song-source">
                        {song.source_type === 'youtube' ? '💕' : '📁'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* 인증 모달 */}
      {showAuthModal && (
        <AuthModal 
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onModeChange={setAuthMode}
          onSignIn={signIn}
          onSignUp={signUp}
        />
      )}

              {/* YouTube 추가 모달 */}
        {showYouTubeModal && (
          <YouTubeModal 
            onClose={() => setShowYouTubeModal(false)}
            onAddMusic={handleYouTubeAdd}
            onAddSample={addSampleMusic}
            user={user}
            extractYouTubeVideoId={extractYouTubeVideoId}
          />
        )}
    </div>
  );
}

// 인증 모달 컴포넌트
function AuthModal({ 
  mode, 
  onClose, 
  onModeChange, 
  onSignIn, 
  onSignUp 
}: {
  mode: 'login' | 'signup';
  onClose: () => void;
  onModeChange: (mode: 'login' | 'signup') => void;
  onSignIn: (email: string, password: string) => Promise<{ data?: unknown; error?: { message: string } | null }>;
  onSignUp: (email: string, password: string) => Promise<{ data?: unknown; error?: { message: string } | null }>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = mode === 'login' 
        ? await onSignIn(email, password)
        : await onSignUp(email, password);

      if (error) {
        setError(error.message);
      } else {
        onClose();
      }
    } catch {
      setError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <div className="auth-modal-header">
          <h3>{mode === 'login' ? '로그인' : '회원가입'}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          
          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? '처리중...' : (mode === 'login' ? '로그인' : '회원가입')}
          </button>
        </form>
        
        <div className="auth-switch">
          {mode === 'login' ? (
            <p>
              계정이 없으신가요?{' '}
              <button onClick={() => onModeChange('signup')} className="link-btn">
                회원가입
              </button>
            </p>
          ) : (
            <p>
              이미 계정이 있으신가요?{' '}
              <button onClick={() => onModeChange('login')} className="link-btn">
                로그인
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// YouTube 추가 모달 컴포넌트
function YouTubeModal({ 
  onClose, 
  onAddMusic, 
  onAddSample,
  user,
  extractYouTubeVideoId
}: {
  onClose: () => void;
  onAddMusic: (youtubeUrl: string, title: string, artist: string) => Promise<void>;
  onAddSample: () => Promise<void>;
  user: { id: string } | null;
  extractYouTubeVideoId: (url: string) => string | null;
}) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!youtubeUrl.trim()) {
      setError('YouTube URL을 입력해주세요.');
      return;
    }

    // YouTube URL 검증
          const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+(&[\w=&]*)?$/;
      if (!youtubeRegex.test(youtubeUrl)) {
        setError('올바른 YouTube URL을 입력해주세요.\n예: https://www.youtube.com/watch?v=VIDEO_ID');
        return;
      }

      const videoId = extractYouTubeVideoId(youtubeUrl);
      if (!videoId || videoId.length !== 11) {
        setError('유효하지 않은 YouTube 동영상 ID입니다.');
        return;
      }

    setLoading(true);
    setError('');

    try {
      await onAddMusic(youtubeUrl, title, artist);
    } catch {
      setError('추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <div className="auth-modal-header">
          <h3>YouTube 음악 추가</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>YouTube URL *</label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
          </div>
          
          <div className="form-group">
            <label>제목 (선택사항)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="음악 제목"
            />
          </div>
          
          <div className="form-group">
            <label>아티스트 (선택사항)</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="아티스트 이름"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? '추가 중...' : '음악 추가'}
          </button>
        </form>
        
        <div className="auth-switch">
          <p style={{ fontSize: '10px', color: 'var(--muted-foreground)', marginBottom: '12px' }}>
            YouTube 링크를 입력하면 플레이리스트에 추가됩니다.
          </p>
          <button 
            type="button"
            onClick={() => {
              onAddSample();
              onClose();
            }}
            className="link-btn"
            style={{ fontSize: '11px', textDecoration: 'none', background: 'var(--secondary)', padding: '6px 12px', borderRadius: '4px' }}
          >
            🎵 테스트용 샘플 음악 추가
          </button>
        </div>
      </div>
    </div>
  );
}
