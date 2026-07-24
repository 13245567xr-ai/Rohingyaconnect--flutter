import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle, Maximize2 } from 'lucide-react';

interface CustomVideoPlayerProps {
  src: string;
  className?: string;
  videoClassName?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onFullScreen?: () => void;
}

const MUTE_PREF_KEY = 'rohingya_connect_video_muted';

const getInitialMutePref = (): boolean => {
  try {
    const val = localStorage.getItem(MUTE_PREF_KEY);
    return val === 'true';
  } catch {
    return false;
  }
};

export default function CustomVideoPlayer({
  src,
  className = '',
  videoClassName = 'object-contain',
  autoPlay = false,
  loop = false,
  muted: initialMuted = false,
  onTimeUpdate,
  onFullScreen
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(getInitialMutePref());
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showOverlayIcon, setShowOverlayIcon] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls helper
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setAreControlsVisible(true);
    if (isPlaying && !isDragging) {
      controlsTimeoutRef.current = setTimeout(() => {
        setAreControlsVisible(false);
      }, 3000);
    }
  };

  // Setup / teardown timers for hiding controls
  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isDragging]);

  // Sync mute state across multiple custom players via custom window event
  useEffect(() => {
    const handleGlobalMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setIsMuted(customEvent.detail);
    };
    window.addEventListener('rc_video_mute_change', handleGlobalMuteChange);
    return () => {
      window.removeEventListener('rc_video_mute_change', handleGlobalMuteChange);
    };
  }, []);

  // Maintain muted preference on local video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Restart states and handle autoplay when src changes
  useEffect(() => {
    setProgress(0);
    setCurrentTime(0);
    setHasError(false);
    setIsMuted(getInitialMutePref());

    if (videoRef.current) {
      videoRef.current.load();
      if (autoPlay) {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log('Autoplay failed/blocked:', err);
            setIsPlaying(false);
          });
      } else {
        setIsPlaying(false);
      }
    }
  }, [src, autoPlay]);

  const handlePlayPause = () => {
    if (!videoRef.current || hasError) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(err => console.log('Playback error:', err));
      setIsPlaying(true);
    }
    setShowOverlayIcon(true);
    setTimeout(() => setShowOverlayIcon(false), 500);
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    try {
      localStorage.setItem(MUTE_PREF_KEY, String(newMuted));
      window.dispatchEvent(new CustomEvent('rc_video_mute_change', { detail: newMuted }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;

    if (!isDragging) {
      setCurrentTime(current);
      setDuration(dur);
      if (dur > 0) {
        setProgress((current / dur) * 100);
      }
    }

    if (onTimeUpdate) {
      onTimeUpdate(current, dur);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  const handleSeek = (clientX: number, containerElement: HTMLDivElement) => {
    if (!videoRef.current || duration === 0) return;
    const rect = containerElement.getBoundingClientRect();
    const pos = (clientX - rect.left) / rect.width;
    const boundedPos = Math.max(0, Math.min(1, pos));
    const newTime = boundedPos * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(boundedPos * 100);
  };

  // Drag Seek Handlers
  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    e.stopPropagation();
    setIsDragging(true);
    resetControlsTimeout();
    if (progressBarRef.current) {
      handleSeek(e.clientX, progressBarRef.current);
    }
  };

  const handleProgressTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    resetControlsTimeout();
    if (progressBarRef.current && e.touches[0]) {
      handleSeek(e.touches[0].clientX, progressBarRef.current);
    }
  };

  // Global Mouse/Touch Event Binding during dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      resetControlsTimeout();
      if (progressBarRef.current) {
        handleSeek(e.clientX, progressBarRef.current);
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      resetControlsTimeout();
      if (progressBarRef.current && e.touches[0]) {
        handleSeek(e.touches[0].clientX, progressBarRef.current);
      }
    };

    const handleGlobalDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalDragEnd);
    window.addEventListener('touchmove', handleGlobalTouchMove);
    window.addEventListener('touchend', handleGlobalDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalDragEnd);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalDragEnd);
    };
  }, [isDragging, duration]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (isPlaying && !isDragging) {
      setAreControlsVisible(false);
    }
  };

  const handleContainerClick = () => {
    if (!areControlsVisible) {
      setAreControlsVisible(true);
      resetControlsTimeout();
      return;
    }
    handlePlayPause();
    resetControlsTimeout();
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div 
      className={`relative group/player bg-black select-none overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleContainerClick}
    >
      {/* Actual HTML5 Video Element */}
      {!hasError && src && src !== '' && (
        <video
          key={src}
          ref={videoRef}
          src={src || undefined}
          autoPlay={autoPlay}
          loop={loop}
          muted={isMuted}
          playsInline
          onTimeUpdate={handleVideoTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={() => setHasError(true)}
          className={`w-full h-full cursor-pointer ${videoClassName}`}
        />
      )}

      {/* Video Loading Error Overlay */}
      {(hasError || !src) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center z-20">
          <AlertCircle className="w-8 h-8 text-[#1877F2] mb-2 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">Video Temporarily Unavailable</span>
          <span className="text-[10px] text-slate-500 mt-1">Please check your network connection</span>
        </div>
      )}

      {/* Central Play/Pause Flash Overlay Icon */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none">
        <div className={`p-4 rounded-full bg-black/65 text-white backdrop-blur-md transition-all duration-300 ${
          showOverlayIcon || !isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}>
          {isPlaying ? <Pause className="w-8 h-8 fill-white text-white" /> : <Play className="w-8 h-8 fill-white text-white" />}
        </div>
      </div>

      {/* Bottom Custom Playback Bar Overlay (Facebook Watch-style layout) */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-3 flex flex-col gap-1 transition-all duration-300 ${
          areControlsVisible || isDragging || !isPlaying
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {/* Playback Progress Bar Line */}
        <div 
          ref={progressBarRef}
          onMouseDown={handleProgressMouseDown}
          onTouchStart={handleProgressTouchStart}
          className="w-full h-1.5 rounded-full cursor-pointer transition-all relative flex items-center group/timeline py-1.5"
        >
          {/* Timeline background track */}
          <div className="absolute inset-x-0 h-1 bg-white/25 rounded-full"></div>
          
          {/* Timeline played progress fill */}
          <div 
            className="absolute left-0 h-1 bg-[#1877F2] rounded-full flex items-center" 
            style={{ width: `${progress}%` }}
          >
            {/* Draggable Seeking Thumb */}
            <div className={`absolute right-0 translate-x-1/2 w-3.5 h-3.5 bg-white border border-[#1877F2] rounded-full shadow-lg transition-transform duration-100 ${
              isDragging ? 'scale-125' : 'scale-0 group-hover/timeline:scale-100'
            }`} />
          </div>
        </div>

        {/* Media Controls Strip */}
        <div className="flex items-center justify-between text-white mt-1 px-1">
          <div className="flex items-center gap-3">
            {/* Play/Pause icon button */}
            <button 
              onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
              className="p-1 hover:bg-white/15 rounded-full transition active:scale-90"
            >
              {isPlaying ? <Pause className="w-4.5 h-4.5 fill-white text-white" /> : <Play className="w-4.5 h-4.5 fill-white text-white" />}
            </button>

            {/* Current playback time */}
            <span className="text-[11px] font-sans font-extrabold tracking-wider select-none text-slate-100">
              {formatTime(currentTime)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Total video duration */}
            <span className="text-[11px] font-sans font-extrabold tracking-wider select-none text-slate-300">
              {formatTime(duration)}
            </span>

            {/* Muted/Speaker Toggle Button at bottom-right */}
            <button 
              onClick={handleMuteToggle}
              className="p-1 hover:bg-white/15 rounded-full transition active:scale-90 text-white flex items-center justify-center"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Fullscreen Button */}
            {onFullScreen && (
              <button
                onClick={(e) => { e.stopPropagation(); onFullScreen(); }}
                className="p-1 hover:bg-white/15 rounded-full transition active:scale-90 text-white flex items-center justify-center"
                title="Watch Fullscreen"
              >
                <Maximize2 className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
