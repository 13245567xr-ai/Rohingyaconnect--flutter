import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, Camera, Image as ImageIcon, Music, Type, Sparkles, Wand2, 
  Scissors, Clock, Check, ChevronLeft, Search,
  Play, Pause, Trash2, RotateCw, Sliders, Sun, 
  Mic, VolumeX, Plus, RefreshCw, SlidersHorizontal, MapPin, Lock, Globe, Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadMedia } from '../firebase';
import { User } from '../types';
import MusicPickerScreen from '../screens/MusicPickerScreen';

interface ShortsEditScreenProps {
  onClose: () => void;
  onUpload: (videoUrl: string, caption: string) => void;
}

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor: string;
  alignment: 'left' | 'center' | 'right';
  shadow: 'none' | 'soft' | 'hard';
  rotation: number;
  scale: number;
}

interface Sticker {
  id: string;
  emoji?: string;
  url?: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const PRELOADED_SONGS = [
  { id: 'song_1', title: 'Rohingya Folk Beats', artist: 'Hafiz Arshad', duration: '3:15', category: 'Trending', url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_holler.ogg' },
  { id: 'song_2', title: 'Freedom Resonance', artist: 'Sittwe Ensemble', duration: '2:45', category: 'Trending', url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg' },
  { id: 'song_3', title: 'Maungdaw Sunset', artist: 'Traditional Flute', duration: '3:30', category: 'Recommended', url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_holler.ogg' },
  { id: 'song_4', title: 'Camp Hope Anthem', artist: 'Cox\'s Bazar Kids', duration: '4:02', category: 'Saved', url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg' },
  { id: 'song_5', title: 'Bazaar Pulse', artist: 'Modern Instrumental', duration: '2:10', category: 'Recommended', url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_holler.ogg' },
  { id: 'song_6', title: 'Sittwe Peace Melody', artist: 'Traditional Sitar', duration: '3:05', category: 'Saved', url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_holler.ogg' },
];

const PRELOADED_STICKERS = [
  '🔥', '✨', '😂', '❤️', '👍', '🎉', '😭', '👀', '🚀', '💀', '💯', '👑',
  '🌟', '💡', '🎵', '💥', '🎈', '🎁', '🍕', '🌍', '🤝', '🙌', '👏', '💪'
];

export default function ShortsEditScreen({ onClose, onUpload }: ShortsEditScreenProps) {
  // Duration Limit state (15s, 20s, 50s, 60s, 70s)
  const [maxDuration, setMaxDuration] = useState<number>(() => {
    const saved = localStorage.getItem('shorts_max_duration');
    return saved ? parseInt(saved, 10) : 15;
  });

  const [activeTab, setActiveTab] = useState<'duration' | 'camera' | 'edit' | 'post'>('duration');
  
  // Media source state
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Drag-and-drop / Resize / Rotate elements state
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [activeTextLayerId, setActiveTextLayerId] = useState<string | null>(null);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);

  // Sub-editor panels
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('normal');
  const [cropRatio, setCropRatio] = useState<'free' | '9:16' | '1:1' | '16:9'>('9:16');
  const [cropRotation, setCropRotation] = useState<number>(0);
  const [cropFlipX, setCropFlipX] = useState<boolean>(false);
  const [cropFlipY, setCropFlipY] = useState<boolean>(false);
  
  // Audio & Speed
  const [speed, setSpeed] = useState<number>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [voiceEffect, setVoiceEffect] = useState<string>('none');
  const [originalVolume, setOriginalVolume] = useState<number>(100);
  const [addedMusicVolume, setAddedMusicVolume] = useState<number>(80);
  const [selectedMusic, setSelectedMusic] = useState<typeof PRELOADED_SONGS[0] | null>(null);
  const [voiceOverUrl, setVoiceOverUrl] = useState<string>('');
  
  // Trim
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [showTrimRequiredAlert, setShowTrimRequiredAlert] = useState<boolean>(false);

  // Beauty & Adjust
  const [beauty, setBeauty] = useState({ smooth: 0, brighten: 0, eye: 0, face: 0 });
  const [adjust, setAdjust] = useState({ brightness: 100, contrast: 100, saturation: 100 });

  // Upload/Post info
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<'Public' | 'Friends' | 'Only Me'>('Public');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [location, setLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // New States added for Location Picker, custom cover and Music page overlays
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [customCoverUrl, setCustomCoverUrl] = useState<string>('');
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [musicActiveTab, setMusicActiveTab] = useState<'Trending' | 'Recommended' | 'Saved'>('Trending');
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
      }
    };
  }, []);

  // Text layer editor state
  const [textInput, setTextInput] = useState('');
  const [textFont, setTextFont] = useState('Inter');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textBgColor, setTextBgColor] = useState('transparent');
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [textShadow, setTextShadow] = useState<'none' | 'soft' | 'hard'>('soft');
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);

  // Stickers browser state
  const [stickerSearch, setStickerSearch] = useState('');
  const [stickerCategory, setStickerCategory] = useState<'Trending' | 'Emojis' | 'GIFs' | 'Saved'>('Trending');

  // Webcam stream
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Sync playback rate on video speed change
  useEffect(() => {
    if (previewVideoRef.current) {
      previewVideoRef.current.playbackRate = speed;
    }
  }, [speed, mediaUrl, activeTab]);

  // Sync trim loop
  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video || mediaType !== 'video') return;

    const handleTimeUpdate = () => {
      if (video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
      if (video.currentTime > trimEnd) {
        video.currentTime = trimStart;
        video.play().catch(() => {});
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [trimStart, trimEnd, mediaUrl, mediaType, activeTab]);

  // Persist maximum duration
  const handleMaxDurationChange = (sec: number) => {
    setMaxDuration(sec);
    localStorage.setItem('shorts_max_duration', String(sec));
  };

  // Trigger File Picker
  const triggerFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    const type = file.type.startsWith('image/') ? 'image' : 'video';
    setMediaType(type);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setMediaUrl(url);

    if (type === 'video') {
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        const duration = tempVideo.duration;
        setVideoDuration(duration);
        setTrimStart(0);
        setTrimEnd(duration);
        
        if (duration > maxDuration) {
          setTrimEnd(maxDuration);
          setActiveTool('trim');
          setShowTrimRequiredAlert(true);
        }
        setActiveTab('edit');
      };
    } else {
      setVideoDuration(0);
      setActiveTab('edit');
    }
  };

  // Webcam controls
  const startCamera = async () => {
    setActiveTab('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 1280, facingMode: 'user' },
        audio: true
      });
      setWebcamStream(stream);
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Could not access camera/mic stream, falling back.", err);
      // Fallback is simply selecting gallery
    }
  };

  const stopCameraStream = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const handleStartRecording = () => {
    if (!webcamStream) return;
    setRecordedSeconds(0);
    const chunks: Blob[] = [];
    const options = { mimeType: 'video/webm;codecs=vp9' };
    
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(webcamStream, options);
    } catch (e) {
      recorder = new MediaRecorder(webcamStream);
    }

    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], "webcam-short.webm", { type: 'video/webm' });
      processSelectedFile(file);
    };

    recorder.start();
    setIsRecording(true);

    recordingIntervalRef.current = setInterval(() => {
      setRecordedSeconds((prev) => {
        if (prev + 1 >= maxDuration) {
          handleStopRecording();
          return maxDuration;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    stopCameraStream();
  };

  // Pointer Drag events for Text and Stickers
  const handlePointerDown = (
    e: React.PointerEvent,
    id: string,
    type: 'text' | 'sticker'
  ) => {
    const element = e.currentTarget as HTMLElement;
    element.setPointerCapture(e.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const parent = element.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      
      const newX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const newY = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      // Keep within bounds roughly
      const boundedX = Math.max(5, Math.min(95, newX));
      const boundedY = Math.max(5, Math.min(95, newY));

      if (type === 'text') {
        setTextLayers(prev => prev.map(t => t.id === id ? { ...t, x: boundedX, y: boundedY } : t));
      } else {
        setStickers(prev => prev.map(s => s.id === id ? { ...s, x: boundedX, y: boundedY } : s));
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      element.releasePointerCapture(upEvent.pointerId);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
    };

    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
  };

  const handleResizePointerDown = (e: React.PointerEvent, id: string) => {
    const element = e.currentTarget as HTMLElement;
    element.setPointerCapture(e.pointerId);

    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;

    const rect = element.parentElement?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
    const startScale = sticker.scale;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const currentDist = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);
      const newScale = Math.max(0.3, Math.min(5.0, startScale * (currentDist / startDist)));
      setStickers(prev => prev.map(s => s.id === id ? { ...s, scale: newScale } : s));
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      element.releasePointerCapture(upEvent.pointerId);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
    };

    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
  };

  // Text layer settings
  const handleAddTextLayer = () => {
    setEditingTextLayerId(null);
    setTextInput('');
    setTextFont('Inter');
    setTextColor('#ffffff');
    setTextBgColor('transparent');
    setTextAlignment('center');
    setTextShadow('soft');
    setActiveTool('text_editor');
  };

  const handleSaveTextLayer = () => {
    if (!textInput.trim()) return;

    if (editingTextLayerId) {
      setTextLayers(prev => prev.map(t => t.id === editingTextLayerId ? {
        ...t,
        text: textInput,
        fontFamily: textFont,
        color: textColor,
        bgColor: textBgColor,
        alignment: textAlignment,
        shadow: textShadow
      } : t));
    } else {
      const newLayer: TextLayer = {
        id: `text_${Date.now()}`,
        text: textInput,
        x: 50,
        y: 40 + textLayers.length * 8,
        fontSize: 20,
        fontFamily: textFont,
        color: textColor,
        bgColor: textBgColor,
        alignment: textAlignment,
        shadow: textShadow,
        rotation: 0,
        scale: 1
      };
      setTextLayers(prev => [...prev, newLayer]);
    }
    setActiveTool(null);
  };

  // Custom visual filters CSS mapper
  const filterStyle = useMemo(() => {
    let css = '';
    switch (selectedFilter) {
      case 'chrome': css = 'saturate-[1.5] contrast-[1.15]'; break;
      case 'noir': css = 'grayscale-[1] contrast-[1.3] brightness-[0.95]'; break;
      case 'warm': css = 'sepia-[0.35] saturate-[1.25] hue-rotate-[-8deg]'; break;
      case 'cool': css = 'hue-rotate-[18deg] saturate-[1.1] brightness-[1.05]'; break;
      case 'vintage': css = 'sepia-[0.55] contrast-[0.85] brightness-[0.9] saturate-[0.8]'; break;
      case 'cyberpunk': css = 'hue-rotate-[130deg] saturate-[1.8] contrast-[1.25] brightness-[1.1]'; break;
      case 'cinematic': css = 'contrast-[1.2] brightness-[0.9] saturate-[0.85] sepia-[0.05]'; break;
      default: css = 'filter-none';
    }
    return css;
  }, [selectedFilter]);

  // Compute final container transform & style
  const mediaStyle = {
    transform: `rotate(${cropRotation}deg) scaleX(${cropFlipX ? -1 : 1}) scaleY(${cropFlipY ? -1 : 1})`,
    filter: `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturation}%)`,
    transition: 'transform 0.15s ease-out'
  };

  // Handle final upload and document posting
  const handlePost = async () => {
    setIsUploading(true);
    try {
      let finalUrl = mediaUrl;
      
      // Upload actual blob to Cloudinary if it is locally recorded or loaded
      if (selectedFile) {
        const uploadedUrl = await uploadMedia(selectedFile);
        if (uploadedUrl) {
          finalUrl = uploadedUrl;
        } else {
          throw new Error("Cloudinary upload failed");
        }
      }

      // Format caption with tags and mentions
      let formattedCaption = caption;
      if (hashtags.length > 0) {
        formattedCaption += '\n\n' + hashtags.map(h => `#${h}`).join(' ');
      }
      if (location) {
        formattedCaption += `\n📍 ${location}`;
      }

      onUpload(finalUrl, formattedCaption);
    } catch (e) {
      console.error("Post error:", e);
      alert("Failed to upload Short. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectSticker = (emoji: string) => {
    const newSticker: Sticker = {
      id: `sticker_${Date.now()}`,
      emoji: emoji,
      x: 50,
      y: 50,
      rotation: 0,
      scale: 1
    };
    setStickers(prev => [...prev, newSticker]);
    setActiveTool(null);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950 text-white flex flex-col select-none font-sans overflow-hidden">
      
      {/* 1. DURATION SELECTOR & INGRESS BOTTOM SHEET */}
      {activeTab === 'duration' && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col justify-end z-50">
          <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-[32px] p-6 max-w-md mx-auto w-full flex flex-col space-y-6 shadow-2xl animate-in fade-in slide-in-from-bottom-12 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase text-emerald-400 tracking-wider">
                🎬 Create Scroll Short
              </h3>
              <button 
                onClick={onClose} 
                className="p-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* TikTok-style Duration Segment Selector */}
            <div className="flex flex-col space-y-3">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-widest">
                Select Max Video Duration
              </label>
              <div className="grid grid-cols-5 gap-1.5 p-1 bg-black/40 rounded-2xl border border-zinc-800/60">
                {[15, 20, 50, 60, 70].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => handleMaxDurationChange(sec)}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                      maxDuration === sec
                        ? 'bg-emerald-600 text-white shadow-md scale-[1.03] border border-emerald-500/30'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 italic">
                * Selected length limits camera recording and enforces auto-trimming for gallery uploads.
              </p>
            </div>

            {/* Media Action List */}
            <div className="flex flex-col space-y-2.5 pt-2">
              <button
                onClick={startCamera}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition cursor-pointer shadow-lg shadow-emerald-950/20"
              >
                <Camera className="w-5 h-5 text-white" />
                Open Live Camera
              </button>

              <button
                onClick={triggerFilePicker}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-750 active:scale-[0.98] rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition cursor-pointer border border-zinc-700/40"
              >
                <ImageIcon className="w-5 h-5 text-zinc-300" />
                Choose Photo or Video
              </button>

              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="video/*,image/*" 
                className="hidden" 
              />

              <button
                onClick={onClose}
                className="w-full py-3.5 bg-transparent hover:bg-zinc-800/20 rounded-2xl text-xs font-bold text-zinc-400 hover:text-zinc-300 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. WEBCAM VIEWER OVERLAY */}
      {activeTab === 'camera' && (
        <div className="absolute inset-0 bg-black flex flex-col justify-between z-40">
          
          {/* Header */}
          <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
            <button 
              onClick={() => { stopCameraStream(); setActiveTab('duration'); }} 
              className="p-2.5 bg-black/40 rounded-full border border-white/10 hover:scale-105 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <span className="text-xs font-black tracking-widest text-emerald-400 bg-black/60 px-3 py-1.5 rounded-full border border-emerald-500/20">
              CAMERA LIMIT: {maxDuration}s
            </span>
            <div className="w-10" />
          </div>

          {/* Full Screen Stream */}
          <div className="absolute inset-0 z-0 flex items-center justify-center bg-zinc-950">
            <video 
              ref={webcamVideoRef}
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover scale-x-[-1]" 
            />
            {isRecording && (
              <div className="absolute top-20 inset-x-0 flex justify-center z-10">
                <span className="bg-red-600 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-full animate-pulse flex items-center gap-1.5 shadow-md">
                  <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                  RECORDING: {recordedSeconds}s / {maxDuration}s
                </span>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="p-8 bg-gradient-to-t from-black/80 to-transparent z-10 flex flex-col items-center space-y-4">
            
            {/* Start / Stop Red Circle Trigger */}
            <div className="flex items-center justify-center">
              {isRecording ? (
                <button
                  onClick={handleStopRecording}
                  className="w-20 h-20 bg-red-600 hover:bg-red-500 rounded-full border-[6px] border-white flex items-center justify-center shadow-2xl scale-105 transition cursor-pointer"
                >
                  <div className="w-6 h-6 bg-white rounded-md" />
                </button>
              ) : (
                <button
                  onClick={handleStartRecording}
                  className="w-20 h-20 bg-red-600 hover:bg-red-500 rounded-full border-[6px] border-white flex items-center justify-center shadow-2xl hover:scale-105 transition cursor-pointer relative"
                >
                  <div className="absolute inset-1.5 border-[3px] border-transparent rounded-full" />
                </button>
              )}
            </div>

            <p className="text-[11px] font-semibold text-zinc-300 drop-shadow-md">
              {isRecording ? "Tap square to stop" : "Tap circle to start filming"}
            </p>
          </div>

        </div>
      )}

      {/* 3. TIKTOK-STYLE EDITOR SCREEN */}
      {activeTab === 'edit' && (
        <div className="relative flex-grow flex flex-col justify-between overflow-hidden">
          
          {/* Top Controls Bar */}
          <div className="absolute top-0 inset-x-0 pt-14 pb-4 px-4 bg-gradient-to-b from-black/70 to-transparent z-30 flex justify-between items-center pointer-events-none">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Discard draft?")) {
                  setActiveTab('duration');
                }
              }}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 pointer-events-auto hover:scale-105 transition cursor-pointer active:scale-95 z-50"
            >
              <X className="w-6 h-6 text-white stroke-[3px]" />
            </button>

            {/* Added Audio Indicator / Selector - Repositioned to top middle */}
            <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
              <button
                onClick={() => setShowMusicPicker(true)}
                className={`px-4 py-2.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 text-xs font-black transition cursor-pointer hover:scale-105 ${
                  selectedMusic ? 'text-emerald-400 border-emerald-500/30 animate-pulse' : 'text-white'
                }`}
              >
                <Music className="w-4 h-4" />
                {selectedMusic ? selectedMusic.title : 'Add Sound'}
              </button>
            </div>

            {/* Balanced placeholder to maintain spacing */}
            <div className="w-10 h-10" />
          </div>

          {/* Interactive Preview Canvas */}
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10 overflow-hidden">
            <div className={`relative overflow-hidden shadow-2xl ${
              cropRatio === '9:16' ? 'aspect-[9/16] h-full w-auto' :
              cropRatio === '1:1' ? 'aspect-square max-w-full max-h-[70vh]' :
              cropRatio === '16:9' ? 'aspect-[16/9] w-full h-auto' : 'w-full h-full'
            }`}>
              
              {/* Media Item */}
              {mediaType === 'video' ? (
                <video
                  ref={previewVideoRef}
                  src={mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className={`w-full h-full object-cover transition-all ${filterStyle}`}
                  style={mediaStyle}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Editor preview"
                  className={`w-full h-full object-cover transition-all ${filterStyle}`}
                  style={mediaStyle}
                />
              )}

              {/* Gradient Shade Cover */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

              {/* Dynamic Absolute Text Overlays */}
              {textLayers.map((layer) => (
                <div
                  key={layer.id}
                  onPointerDown={(e) => handlePointerDown(e, layer.id, 'text')}
                  className={`absolute p-2.5 rounded-xl cursor-move touch-none font-bold text-center select-none ${
                    activeTextLayerId === layer.id ? 'ring-2 ring-emerald-400' : ''
                  }`}
                  style={{
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    transform: 'translate(-50%, -50%)',
                    fontFamily: layer.fontFamily,
                    color: layer.color,
                    backgroundColor: layer.bgColor,
                    fontSize: `${layer.fontSize}px`,
                    textShadow: layer.shadow === 'soft' ? '1px 1px 3px rgba(0,0,0,0.6)' : layer.shadow === 'hard' ? '2px 2px 0px rgba(0,0,0,1)' : 'none',
                    textAlign: layer.alignment,
                    zIndex: 40
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTextLayerId(layer.id);
                    // double click / tap simulation
                    if (activeTextLayerId === layer.id) {
                      setEditingTextLayerId(layer.id);
                      setTextInput(layer.text);
                      setTextFont(layer.fontFamily);
                      setTextColor(layer.color);
                      setTextBgColor(layer.bgColor);
                      setTextAlignment(layer.alignment);
                      setTextShadow(layer.shadow);
                      setActiveTool('text_editor');
                    }
                  }}
                >
                  {layer.text}
                  {activeTextLayerId === layer.id && (
                    <div className="absolute -top-8 right-0 bg-black/90 px-2 py-1 rounded-md flex gap-2 z-50 text-[10px] text-white ring-1 ring-white/10 shadow-lg">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTextLayers(prev => prev.filter(t => t.id !== layer.id));
                          setActiveTextLayerId(null);
                        }}
                        className="text-red-400 font-extrabold hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Dynamic Absolute Sticker Overlays */}
              {stickers.map((sticker) => (
                <div
                  key={sticker.id}
                  onPointerDown={(e) => handlePointerDown(e, sticker.id, 'sticker')}
                  className={`absolute p-3 cursor-move touch-none select-none ${
                    activeStickerId === sticker.id ? 'ring-2 ring-emerald-400 rounded-2xl' : ''
                  }`}
                  style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
                    fontSize: '48px',
                    zIndex: 40
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStickerId(sticker.id);
                  }}
                >
                  {sticker.emoji}
                  {activeStickerId === sticker.id && (
                    <>
                      <div className="absolute -top-8 right-0 bg-black/90 px-2 py-1 rounded-md flex gap-2.5 z-50 text-[10px] text-white ring-1 ring-white/10 shadow-lg">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setStickers(prev => prev.filter(s => s.id !== sticker.id));
                            setActiveStickerId(null);
                          }}
                          className="text-red-400 font-extrabold hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                      <div 
                        className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center cursor-nwse-resize z-50 touch-none shadow-lg"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handleResizePointerDown(e, sticker.id);
                        }}
                      >
                        <RefreshCw className="w-3 h-3 text-white" />
                      </div>
                    </>
                  )}
                </div>
              ))}

            </div>
          </div>

          {/* 3.1 RIGHT-SIDE VERTICAL TOOLBAR */}
          <div className="absolute right-4 top-1/4 z-30 flex flex-col space-y-2 max-h-[60vh] overflow-y-auto pr-1 select-none scrollbar-hide py-4">
            <ToolButton icon={<Type className="w-4 h-4" />} label="Text" onClick={handleAddTextLayer} />
            <ToolButton icon={<Smile className="w-4 h-4" />} label="Stickers" onClick={() => setActiveTool('stickers')} />
            <ToolButton icon={<Sliders className="w-4 h-4" />} label="Filter" onClick={() => setActiveTool('filter')} />
            <ToolButton icon={<Scissors className="w-4 h-4" />} label="Crop" onClick={() => setActiveTool('crop')} />
            <ToolButton icon={<Wand2 className="w-4 h-4" />} label="Effects" onClick={() => setActiveTool('effects')} />
            <ToolButton icon={<Sparkles className="w-4 h-4" />} label="Beauty" onClick={() => setActiveTool('beauty')} />
            <ToolButton icon={<SlidersHorizontal className="w-4 h-4" />} label="Adjust" onClick={() => setActiveTool('adjust')} />
            {mediaType === 'video' && <ToolButton icon={<Clock className="w-4 h-4" />} label="Speed" onClick={() => setActiveTool('speed')} />}
            <ToolButton icon={<Clock className="w-4 h-4 text-orange-400" />} label="Timer" onClick={() => setActiveTool('timer')} />
            <ToolButton icon={<VolumeX className="w-4 h-4" />} label="Voice FX" onClick={() => setActiveTool('voice_effects')} />
            <ToolButton icon={<SlidersHorizontal className="w-4 h-4 text-emerald-400" />} label="Volume" onClick={() => setActiveTool('volume')} />
            <ToolButton icon={<Music className="w-4 h-4 text-cyan-400" />} label="Music" onClick={() => setShowMusicPicker(true)} />
            <ToolButton icon={<Mic className="w-4 h-4" />} label="Voice Over" onClick={() => setActiveTool('voiceover')} />
            {mediaType === 'video' && <ToolButton icon={<Scissors className="w-4 h-4 text-red-400" />} label="Trim" onClick={() => setActiveTool('trim')} />}
            <ToolButton icon={<RotateCw className="w-4 h-4 text-amber-400" />} label="Rotate" onClick={() => setCropRotation(r => (r + 90) % 360)} />
            <ToolButton icon={<RefreshCw className="w-4 h-4 text-indigo-400" />} label="Flip" onClick={() => setCropFlipX(f => !f)} />
          </div>

          {/* SHORTS EDIT UI FIX START */}
          <button
            onClick={() => setActiveTab('post')}
            className="fixed bottom-4 right-4 z-[120] bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-sm rounded-full px-6 py-3 shadow-lg hover:scale-105 transition cursor-pointer flex items-center gap-2"
          >
            Next
          </button>
          {/* SHORTS EDIT UI FIX END */}

          {/* 3.2 BOTTOM TOOL SUB-PANELS (AnimatePresence) */}
          <div className="absolute bottom-0 inset-x-0 z-30 pointer-events-none flex flex-col justify-end">
            <AnimatePresence>
              {activeTool && activeTool !== 'music' && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="w-full bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 pb-8 pointer-events-auto flex flex-col space-y-4 max-h-[50vh] overflow-y-auto"
                >
                  {/* Panel Header */}
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
                    <span className="text-xs font-black uppercase text-zinc-400 tracking-wider">
                      🔧 {activeTool.toUpperCase().replace('_', ' ')}
                    </span>
                    <button 
                      onClick={() => setActiveTool(null)}
                      className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 3.2.1 STICKERS BROWSER PANEL */}
                  {activeTool === 'stickers' && (
                    <div className="flex flex-col space-y-3">
                      <div className="flex bg-black/40 rounded-xl p-2 items-center gap-2">
                        <Search className="w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search stickers..."
                          value={stickerSearch}
                          onChange={(e) => setStickerSearch(e.target.value)}
                          className="bg-transparent outline-none text-xs w-full text-white"
                        />
                      </div>
                      <div className="flex gap-2 border-b border-zinc-800 pb-2 overflow-x-auto scrollbar-hide">
                        {(['Trending', 'Emojis', 'GIFs', 'Saved'] as const).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setStickerCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap transition ${
                              stickerCategory === cat ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-6 gap-3 pt-2 max-h-40 overflow-y-auto">
                        {PRELOADED_STICKERS
                          .filter(s => !stickerSearch || s.includes(stickerSearch))
                          .map((emoji, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectSticker(emoji)}
                              className="text-3xl hover:scale-110 active:scale-95 transition p-2 bg-zinc-800/40 hover:bg-zinc-800 rounded-xl flex items-center justify-center"
                            >
                              {emoji}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 3.2.2 FILTER PANEL */}
                  {activeTool === 'filter' && (
                    <div className="flex flex-col space-y-2">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Select TikTok Filter
                      </p>
                      <div className="flex gap-3 overflow-x-auto py-2 scrollbar-hide">
                        {[
                          { id: 'normal', name: 'Original', color: 'from-zinc-500 to-zinc-400' },
                          { id: 'chrome', name: 'Chrome', color: 'from-blue-500 to-cyan-400' },
                          { id: 'noir', name: 'Noir', color: 'from-zinc-800 to-zinc-900' },
                          { id: 'warm', name: 'Warm Sun', color: 'from-amber-600 to-orange-400' },
                          { id: 'cool', name: 'Cool Jade', color: 'from-teal-600 to-emerald-400' },
                          { id: 'vintage', name: 'Vintage', color: 'from-yellow-700 to-amber-600' },
                          { id: 'cyberpunk', name: 'Cyberpunk', color: 'from-fuchsia-600 to-purple-500' },
                          { id: 'cinematic', name: 'Cinematic', color: 'from-red-600 to-amber-500' },
                        ].map((filter) => (
                          <button
                            key={filter.id}
                            onClick={() => setSelectedFilter(filter.id)}
                            className="flex flex-col items-center space-y-1.5 focus:outline-none flex-shrink-0"
                          >
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${filter.color} border-2 ${
                              selectedFilter === filter.id ? 'border-emerald-400 scale-105' : 'border-transparent'
                            } flex items-center justify-center shadow-lg transition`} />
                            <span className="text-[10px] font-bold text-zinc-300">{filter.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3.2.3 CROP PANEL */}
                  {activeTool === 'crop' && (
                    <div className="flex flex-col space-y-3">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Canvas Format Aspect Ratio
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'free', label: 'Free' },
                          { id: '9:16', label: '9:16 (Shorts)' },
                          { id: '1:1', label: '1:1 (Post)' },
                          { id: '16:9', label: '16:9 (Landscape)' },
                        ].map((ratio) => (
                          <button
                            key={ratio.id}
                            onClick={() => setCropRatio(ratio.id as any)}
                            className={`py-2 rounded-xl text-xs font-black transition ${
                              cropRatio === ratio.id ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {ratio.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3.2.4 EFFECTS PANEL */}
                  {activeTool === 'effects' && (
                    <div className="flex flex-col space-y-2">
                      <div className="grid grid-cols-4 gap-3">
                        {['Glitch Overlay', 'Retro Noise', 'Film Grain', 'Light Leak', 'Neon Flare', 'Foggy Dream', 'Vortex', 'Mirror Edge'].map((eff, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              alert(`${eff} filter enabled!`);
                              setActiveTool(null);
                            }}
                            className="p-3 bg-zinc-800 hover:bg-zinc-750 active:scale-95 transition rounded-2xl flex flex-col items-center space-y-1.5"
                          >
                            <Wand2 className="w-5 h-5 text-emerald-400" />
                            <span className="text-[10px] font-bold text-center text-zinc-300">{eff}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3.2.5 BEAUTY PANEL */}
                  {activeTool === 'beauty' && (
                    <div className="flex flex-col space-y-3.5 pt-1">
                      {[
                        { key: 'smooth', label: '✨ Smooth Skin' },
                        { key: 'brighten', label: '💡 Brighten Face' },
                        { key: 'eye', label: '👀 Eye Enlargement' },
                        { key: 'face', label: '👑 Face Slimming' },
                      ].map((item) => (
                        <div key={item.key} className="flex flex-col space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-black text-zinc-300">
                            <span>{item.label}</span>
                            <span>{beauty[item.key as keyof typeof beauty]}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={beauty[item.key as keyof typeof beauty]}
                            onChange={(e) => setBeauty(prev => ({ ...prev, [item.key]: parseInt(e.target.value, 10) }))}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3.2.6 ADJUST PANEL */}
                  {activeTool === 'adjust' && (
                    <div className="flex flex-col space-y-3.5 pt-1">
                      {[
                        { key: 'brightness', label: '☀️ Brightness', min: 50, max: 150 },
                        { key: 'contrast', label: '🌗 Contrast', min: 50, max: 150 },
                        { key: 'saturation', label: '🎨 Saturation', min: 0, max: 200 },
                      ].map((item) => (
                        <div key={item.key} className="flex flex-col space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-black text-zinc-300">
                            <span>{item.label}</span>
                            <span>{adjust[item.key as keyof typeof adjust]}%</span>
                          </div>
                          <input
                            type="range"
                            min={item.min}
                            max={item.max}
                            value={adjust[item.key as keyof typeof adjust]}
                            onChange={(e) => setAdjust(prev => ({ ...prev, [item.key]: parseInt(e.target.value, 10) }))}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3.2.7 SPEED PANEL */}
                  {activeTool === 'speed' && (
                    <div className="flex flex-col space-y-3">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Select Playback Rate Speed
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[0.5, 1, 1.5, 2].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            className={`py-2.5 rounded-xl text-xs font-black transition ${
                              speed === s ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {s}x {s === 1 ? '(Normal)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3.2.8 TIMER PANEL */}
                  {activeTool === 'timer' && (
                    <div className="flex flex-col space-y-3">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Set Capture Countdown Delay
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {['Off', '3 Seconds', '5 Seconds', '10 Seconds'].map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              alert(`Timer set to: ${t}`);
                              setActiveTool(null);
                            }}
                            className="py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-700"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3.2.9 VOICE EFFECTS PANEL */}
                  {activeTool === 'voice_effects' && (
                    <div className="flex flex-col space-y-2">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Select Voice Synthesis FX
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'none', label: 'Original Vocals' },
                          { id: 'chipmunk', label: '🐿️ Chipmunk' },
                          { id: 'robot', label: '🤖 Retro Robot' },
                          { id: 'deep', label: '🎙️ Deep Voice' },
                          { id: 'echo', label: '📣 Echo Chamber' },
                          { id: 'helium', label: '🎈 Helium Gas' },
                        ].map((fx) => (
                          <button
                            key={fx.id}
                            onClick={() => {
                              setVoiceEffect(fx.id);
                              alert(`Voice Effect changed to: ${fx.label}`);
                            }}
                            className={`py-2.5 rounded-xl text-xs font-bold transition ${
                              voiceEffect === fx.id ? 'bg-emerald-600 text-white font-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750'
                            }`}
                          >
                            {fx.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3.2.10 VOLUME PANEL */}
                  {activeTool === 'volume' && (
                    <div className="flex flex-col space-y-4 pt-1">
                      <div className="flex flex-col space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-black text-zinc-300">
                          <span>Original Video Soundtrack</span>
                          <span>{originalVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={originalVolume}
                          onChange={(e) => setOriginalVolume(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-black text-zinc-300">
                          <span>Added BG Music Track</span>
                          <span>{addedMusicVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={addedMusicVolume}
                          disabled={!selectedMusic}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-40"
                        />
                      </div>
                    </div>
                  )}

                  {/* 3.2.11 MUSIC PANEL */}
                  {activeTool === 'music' && (
                    <div className="flex flex-col items-center justify-center p-4">
                      <p className="text-xs text-zinc-400">Loading music picker...</p>
                    </div>
                  )}

                  {/* 3.2.12 VOICEOVER PANEL */}
                  {activeTool === 'voiceover' && (
                    <div className="flex flex-col items-center space-y-3 pt-2 text-center">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Microphone Audio Dubbing
                      </p>
                      <button
                        onPointerDown={() => alert("Recording voice dub overlay...")}
                        onPointerUp={() => alert("Voice dub recorded successfully!")}
                        className="w-14 h-14 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
                      >
                        <Mic className="w-5 h-5 text-white" />
                      </button>
                      <p className="text-[10px] text-zinc-500 italic">
                        * Hold button to record voice commentary over the media.
                      </p>
                    </div>
                  )}

                  {/* 3.2.13 TRIM PANEL */}
                  {activeTool === 'trim' && mediaType === 'video' && (
                    <div className="flex flex-col space-y-3 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-black text-zinc-300">
                        <span>Adjust Video Range Selection</span>
                        <span className="text-emerald-400">
                          Duration: {Math.max(0, parseFloat((trimEnd - trimStart).toFixed(1)))}s / {maxDuration}s max
                        </span>
                      </div>

                      {/* Professional Range Sliders */}
                      <div className="flex flex-col space-y-3 bg-black/40 rounded-xl p-3 border border-zinc-800">
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                            Start Marker: {trimStart.toFixed(1)}s
                          </label>
                          <input
                            type="range"
                            min="0"
                            max={videoDuration || 10}
                            step="0.1"
                            value={trimStart}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (val < trimEnd) {
                                  setTrimStart(val);
                              }
                            }}
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>

                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                            End Marker: {trimEnd.toFixed(1)}s
                          </label>
                          <input
                            type="range"
                            min="0"
                            max={videoDuration || 10}
                            step="0.1"
                            value={trimEnd}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (val > trimStart) {
                                  setTrimEnd(val);
                              }
                            }}
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      </div>

                      {trimEnd - trimStart > maxDuration ? (
                        <div className="p-2.5 bg-red-950/40 border border-red-500/20 rounded-xl text-center">
                          <p className="text-[10px] font-bold text-red-400 animate-pulse">
                            ⚠️ Selection exceeds limit of {maxDuration}s! Please shorten range to proceed.
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveTool(null);
                            setShowTrimRequiredAlert(false);
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition"
                        >
                          Apply Trim Range
                        </button>
                      )}
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Alert trigger overlays */}
          <AnimatePresence>
            {showTrimRequiredAlert && (
              <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center max-w-xs w-full shadow-2xl flex flex-col space-y-4">
                  <Scissors className="w-10 h-10 text-orange-400 mx-auto animate-bounce" />
                  <h4 className="text-sm font-black uppercase text-white tracking-wide">Video Too Long</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    This video is {videoDuration.toFixed(1)}s. The chosen maximum duration is {maxDuration}s. Please trim it down to continue.
                  </p>
                  <button
                    onClick={() => {
                      setShowTrimRequiredAlert(false);
                      setActiveTool('trim');
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Open Trim Tool Now
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* 3.3 FLOATING TEXT LAYER EDIT PANEL OVERLAY */}
          <AnimatePresence>
            {activeTool === 'text_editor' && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-between p-6">
                
                {/* Header */}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                    {editingTextLayerId ? 'Edit Text Layer' : 'Add Text Layer'}
                  </span>
                  <button
                    onClick={() => setActiveTool(null)}
                    className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded-full"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Live typing block */}
                <div className="flex-grow flex items-center justify-center">
                  <textarea
                    autoFocus
                    placeholder="Type text here..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="w-full max-w-md bg-transparent border-none outline-none focus:ring-0 text-center font-black text-2xl placeholder-zinc-700 resize-none h-32"
                    style={{
                      fontFamily: textFont,
                      color: textColor,
                      backgroundColor: textBgColor === 'filled' ? textColor === '#ffffff' ? '#10b981' : '#ffffff' : 'transparent',
                      textShadow: textShadow === 'soft' ? '1px 1px 3px rgba(0,0,0,0.6)' : textShadow === 'hard' ? '2px 2px 0px rgba(0,0,0,1)' : 'none',
                    }}
                  />
                </div>

                {/* Settings toolbar */}
                <div className="flex flex-col space-y-4">
                  {/* Font picker */}
                  <div className="flex flex-col space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-wider">Font Family</span>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {['Inter', 'Serif', 'monospace', 'cursive', 'fantasy'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setTextFont(f)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black transition ${
                            textFont === f ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {f === 'Inter' ? 'Sans-Serif' : f === 'monospace' ? 'Mono' : f === 'cursive' ? 'Script' : f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color circle picker */}
                  <div className="flex flex-col space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-wider">Text Color</span>
                    <div className="flex gap-2">
                      {['#ffffff', '#000000', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setTextColor(c)}
                          className={`w-6 h-6 rounded-full border-2 ${
                            textColor === c ? 'border-emerald-400 scale-110' : 'border-zinc-800'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Highlights and background */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setTextBgColor(b => b === 'transparent' ? 'filled' : 'transparent')}
                      className={`py-2 rounded-xl text-xs font-black transition ${
                        textBgColor !== 'transparent' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Background Highlight
                    </button>

                    <button
                      onClick={handleSaveTextLayer}
                      className="py-2 bg-white hover:bg-zinc-100 text-black rounded-xl text-xs font-black shadow-lg transition"
                    >
                      Apply Text
                    </button>
                  </div>
                </div>

              </div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* 4. POST / UPLOAD INFORMATION SETTINGS SCREEN */}
      {activeTab === 'post' && (
        <div className="absolute inset-0 bg-zinc-950 z-50 flex flex-col justify-between p-6 overflow-y-auto">
          
          {/* Top Back Nav Bar */}
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
            <button 
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab('edit');
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab('edit');
              }}
              className="p-4 bg-zinc-900 hover:bg-zinc-850 active:scale-95 transition-all rounded-full border border-zinc-800 flex items-center justify-center cursor-pointer shadow-md relative z-50 pointer-events-auto"
              title="Go back"
            >
              <ChevronLeft className="w-7 h-7 text-white stroke-[3px]" />
            </button>
            <h3 className="text-sm font-black tracking-widest text-emerald-400 uppercase">
              Publish Short Reel
            </h3>
            <div className="w-12" />
          </div>

          <div className="flex-grow flex flex-col space-y-6">
            
            {/* Visual Header / Cover frame picker */}
            <div className="flex gap-4">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe your video... Add trending tags, mention Rohingya groups, or write a title"
                className="flex-grow bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 text-xs font-semibold text-white outline-none focus:ring-1 focus:ring-emerald-500 resize-none h-28"
              />
              <div 
                onClick={() => coverInputRef.current?.click()}
                className="w-20 h-28 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex-shrink-0 relative shadow-inner cursor-pointer hover:border-emerald-500 hover:scale-105 transition duration-200 group"
                title="Tap to change cover thumbnail"
              >
                {customCoverUrl ? (
                  <img src={customCoverUrl} alt="Custom cover" className="w-full h-full object-cover" />
                ) : mediaType === 'video' ? (
                  <video src={mediaUrl} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={mediaUrl} alt="Cover preview" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition duration-200">
                  <span className="text-[9px] text-white font-black uppercase text-center leading-tight px-1">Select<br/>Gallery<br/>Cover</span>
                </div>
                <div className="absolute bottom-1 inset-x-1 bg-black/60 py-0.5 rounded text-center text-[8px] font-black uppercase text-emerald-400">
                  Cover
                </div>
              </div>
              <input 
                type="file" 
                ref={coverInputRef} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setCustomCoverUrl(url);
                    alert("Cover thumbnail updated successfully!");
                  }
                }} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Tags and Mentions Helpers */}
            <div className="flex flex-col space-y-2">
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                Trending Rohingya hashtags
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {['Rohingya', 'RohingyaConnect', 'Sittwe', 'CoxsBazar', 'Shorts', 'Unity', 'Hope', 'Arakan'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (!hashtags.includes(tag)) {
                        setHashtags(prev => [...prev, tag]);
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-300 transition"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hashtags.map((tag) => (
                    <span 
                      key={tag}
                      onClick={() => setHashtags(prev => prev.filter(t => t !== tag))}
                      className="px-2.5 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black cursor-pointer flex items-center gap-1.5"
                    >
                      #{tag}
                      <X className="w-3 h-3" />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Custom fields form */}
            <div className="space-y-3 pt-2">
              
              {/* Location */}
              <button
                type="button"
                onClick={() => setShowLocationPicker(true)}
                className="w-full text-left flex bg-zinc-900/40 border border-zinc-800 rounded-2xl px-4 py-3 items-center justify-between cursor-pointer hover:bg-zinc-800/40 transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-zinc-300">Add Location</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white">
                    {location || "Select location..."}
                  </span>
                  <ChevronLeft className="w-4 h-4 text-zinc-500 rotate-180" />
                </div>
              </button>

              {/* Privacy */}
              <div className="flex bg-zinc-900/40 border border-zinc-800 rounded-2xl px-4 py-3 items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-300">Who can view this Short?</span>
                </div>
                <div className="flex gap-2">
                  {(['Public', 'Friends', 'Only Me'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPrivacy(p)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition ${
                        privacy === p ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allow Comments */}
              <div className="flex bg-zinc-900/40 border border-zinc-800 rounded-2xl px-4 py-3 items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">Allow Comments</span>
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-zinc-850 border-zinc-700 rounded focus:ring-emerald-500 focus:ring-2 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Allow Downloads */}
              <div className="flex bg-zinc-900/40 border border-zinc-800 rounded-2xl px-4 py-3 items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">Allow Downloads</span>
                <input
                  type="checkbox"
                  checked={allowDownloads}
                  onChange={(e) => setAllowDownloads(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-zinc-850 border-zinc-700 rounded focus:ring-emerald-500 focus:ring-2 accent-emerald-500 cursor-pointer"
                />
              </div>

            </div>

          </div>

          {/* Action Trigger Buttons */}
          <div className="flex gap-3 pt-6 border-t border-zinc-900">
            <button
              onClick={() => {
                alert("Saved to local drafts!");
                onClose();
              }}
              className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs rounded-2xl border border-zinc-800 transition active:scale-[0.98] cursor-pointer"
            >
              Drafts
            </button>
            <button
              disabled={isUploading}
              onClick={handlePost}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-lg transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                'Post Short Reel'
              )}
            </button>
          </div>

        </div>
      )}

      {/* --- LOCATION PICKER OVERLAY --- */}
      <AnimatePresence>
        {showLocationPicker && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-0 bg-zinc-950 z-[100] flex flex-col font-sans"
          >
            <div className="flex items-center gap-3 p-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-10">
              <button 
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowLocationPicker(false);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowLocationPicker(false);
                }}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition active:scale-95 cursor-pointer relative z-50 pointer-events-auto"
              >
                <ChevronLeft className="w-6 h-6 text-white stroke-[3px]" />
              </button>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Search Location</h2>
            </div>
            
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search places, cities..."
                  value={locationSearchQuery}
                  onChange={(e) => setLocationSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white outline-none focus:border-emerald-500 transition"
                  autoFocus
                />
              </div>

              {locationSearchQuery.length > 0 && (
                <button
                  onClick={() => {
                    setLocation(locationSearchQuery);
                    setShowLocationPicker(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-zinc-900/40 hover:bg-zinc-800/40 border border-emerald-500/30 rounded-xl transition cursor-pointer text-left group active:scale-[0.99]"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Add "{locationSearchQuery}"</div>
                    <div className="text-[10px] text-zinc-500 font-medium mt-0.5">Custom Location</div>
                  </div>
                </button>
              )}

              <div className="pt-2">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-3 px-1">Suggested Locations</h4>
                <div className="space-y-2">
                  {['Kutupalong RC', 'Nayapara Camp', 'Cox\'s Bazar', 'Sittwe, Rakhine State', 'Maungdaw'].filter(loc => loc.toLowerCase().includes(locationSearchQuery.toLowerCase())).map((loc, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setLocation(loc);
                        setShowLocationPicker(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-zinc-900/20 hover:bg-zinc-800/40 border border-transparent hover:border-zinc-800 rounded-xl transition cursor-pointer text-left active:scale-[0.99]"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="text-xs font-bold text-zinc-300">{loc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MUSIC PICKER OVERLAY --- */}
      <AnimatePresence>
        {showMusicPicker && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-0 bg-zinc-950 z-[100] flex flex-col font-sans overflow-hidden"
          >
            {/* Using the full external screen, passing dummy navigation that we intercept */}
            <div className="w-full h-full flex flex-col">
              <MusicPickerScreen 
                navigation={{ navigate: () => {}, goBack: () => setShowMusicPicker(false) }}
                onClose={() => setShowMusicPicker(false)}
                onSelectMusic={(item) => {
                  setSelectedMusic(item as any);
                  setShowMusicPicker(false);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function ToolButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 text-white shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer">
      <div className="bg-black/60 border border-white/5 backdrop-blur-md p-2.5 rounded-full shadow-lg">
        {icon}
      </div>
      <span className="text-[9px] font-black drop-shadow-md tracking-wide uppercase text-zinc-300 bg-black/40 px-1 py-0.5 rounded">{label}</span>
    </button>
  );
}
