import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Maximize, Volume2, VolumeX, SkipBack, SkipForward, Settings } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onHeartbeat?: (position: number) => void;
  autoPlay?: boolean;
}

interface QualityLevel { id: number; label: string; height: number }

export function VideoPlayer({ src, poster, title, onTimeUpdate, onHeartbeat, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = auto/ABR
  const [showQuality, setShowQuality] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const beatTimer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (src.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const lvls: QualityLevel[] = hls.levels.map((l, i) => ({
          id: i,
          height: l.height,
          label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}kbps`,
        }));
        setLevels(lvls);
        if (autoPlay) video.play().catch(() => {});
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => setCurrentLevel(data.level));
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      if (autoPlay) video.play().catch(() => {});
    } else {
      video.src = src;
      if (autoPlay) video.play().catch(() => {});
    }

    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [src, autoPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
      onTimeUpdate?.(video.currentTime, video.duration);
      if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1));
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTime);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTime);
    };
  }, [onTimeUpdate]);

  // Heartbeat every 15s while playing
  useEffect(() => {
    if (!onHeartbeat) return;
    if (playing) {
      beatTimer.current = setInterval(() => {
        const v = videoRef.current;
        if (v && !v.paused) onHeartbeat(v.currentTime);
      }, 15000);
    }
    return () => { if (beatTimer.current) clearInterval(beatTimer.current); };
  }, [playing, onHeartbeat]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.pause();
    else video.play().catch(() => {});
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * duration;
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (playing) setShowControls(false); }, 3000);
  };

  const selectQuality = (id: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = id;
    setCurrentLevel(id);
    setShowQuality(false);
  };

  const currentLabel = currentLevel === -1 ? 'Auto' : levels.find(l => l.id === currentLevel)?.label || 'Auto';

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full aspect-video group cursor-pointer select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={togglePlay}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain pointer-events-none"
        playsInline
        preload="metadata"
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 animate-fade-in">
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-transform hover:scale-110 active:scale-95"
          >
            <Play className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground fill-primary-foreground ml-1" />
          </button>
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 sm:mb-3 cursor-pointer group/progress" onClick={seek}>
          <div className="relative h-1 sm:h-1.5 bg-white/20 rounded-full overflow-hidden group-hover/progress:h-2 transition-all">
            <div className="absolute h-full bg-white/30 rounded-full" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
            <div className="absolute h-full bg-primary rounded-full" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={togglePlay} className="text-white hover:text-primary transition p-1">
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition p-1 hidden sm:block"><SkipBack className="w-4 h-4" /></button>
          <button onClick={() => skip(10)} className="text-white/70 hover:text-white transition p-1 hidden sm:block"><SkipForward className="w-4 h-4" /></button>
          <button onClick={toggleMute} className="text-white/70 hover:text-white transition p-1">
            {muted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <span className="text-white/80 text-xs sm:text-sm font-mono flex-1">{formatTime(currentTime)} / {formatTime(duration)}</span>
          {title && <span className="text-white/60 text-xs truncate max-w-[120px] sm:max-w-[200px] hidden sm:inline">{title}</span>}

          {levels.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowQuality(v => !v)} className="text-white/70 hover:text-white transition p-1 flex items-center gap-1 text-xs">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">{currentLabel}</span>
              </button>
              {showQuality && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/10 rounded-lg overflow-hidden min-w-[120px]">
                  <button onClick={() => selectQuality(-1)} className={`block w-full text-left px-3 py-2 text-xs hover:bg-white/10 ${currentLevel === -1 ? 'text-primary' : 'text-white'}`}>Auto</button>
                  {[...levels].reverse().map(l => (
                    <button key={l.id} onClick={() => selectQuality(l.id)} className={`block w-full text-left px-3 py-2 text-xs hover:bg-white/10 ${currentLevel === l.id ? 'text-primary' : 'text-white'}`}>{l.label}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition p-1">
            <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
