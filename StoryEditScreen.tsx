import React, { useState } from 'react';
import { 
  X, Music, Smile, Type, Send, Trash2, Check, Sparkles, Volume2, 
  ChevronLeft, ChevronRight, Palette, Layers, Film,
  Settings, AtSign, Link as LinkIcon, Globe, Users, UserCheck, Lock, Crop, Search
} from 'lucide-react';
import { User } from '../types';

interface StoryEditScreenProps {
  images?: any[];
  currentUser?: User | null;
  onClose?: () => void;
  onShare?: (mediaUrl: string, mediaType: string, metadata?: any) => Promise<void> | void;
  navigation?: any;
  route?: any;
}

interface PlacedSticker {
  id: string;
  text: string;
  x: number; // percentage (0 to 80)
  y: number; // percentage (0 to 80)
  size: number;
}

interface PlacedText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
}

const TRENDING_MUSIC: MusicTrack[] = [
  { id: '1', title: 'Peaceful Nasheed', artist: 'Rohingya Connect Audio', duration: '0:30' },
  { id: '2', title: 'Morning Calm & Reflections', artist: 'Zen Acoustic', duration: '0:45' },
  { id: '3', title: 'Acoustic Sunset Beats', artist: 'Lo-Fi Chill', duration: '0:30' },
  { id: '4', title: 'Inspiring Horizons', artist: 'Cinematic Strings', duration: '0:50' },
  { id: '5', title: 'Ocean Waves & Breeze', artist: 'Nature Sounds', duration: '0:40' },
  { id: '6', title: 'Traditional Strings Harmony', artist: 'Arakan Folk', duration: '0:35' },
];

const STICKER_CATEGORIES = [
  { name: 'Emojis', items: [{s:'😍',n:'heart eyes'}, {s:'🔥',n:'fire'}, {s:'❤️',n:'heart'}, {s:'😂',n:'laugh'}, {s:'✨',n:'sparkles'}, {s:'💯',n:'hundred'}, {s:'👏',n:'clap'}, {s:'🎉',n:'party'}, {s:'🌟',n:'star'}, {s:'🙌',n:'hands'}, {s:'🥺',n:'pleading'}, {s:'👍',n:'thumb'}, {s:'💡',n:'light'}, {s:'👑',n:'crown'}, {s:'🕊️',n:'dove'}, {s:'🌺',n:'flower'}, {s:'😊',n:'smile'}, {s:'😎',n:'cool'}, {s:'🥰',n:'love'}, {s:'🤩',n:'star eyes'}] },
  { name: 'Vibes', items: [{s:'📍',n:'pin'}, {s:'💬',n:'chat'}, {s:'💭',n:'think'}, {s:'🎵',n:'music'}, {s:'🎨',n:'art'}, {s:'☕',n:'coffee'}, {s:'🍉',n:'fruit'}, {s:'🍕',n:'pizza'}, {s:'🌸',n:'blossom'}, {s:'🌞',n:'sun'}, {s:'🌙',n:'moon'}, {s:'⭐',n:'star'}, {s:'🍀',n:'clover'}, {s:'💎',n:'diamond'}, {s:'🚀',n:'rocket'}, {s:'🌈',n:'rainbow'}, {s:'🧘',n:'yoga'}, {s:'🎧',n:'headset'}, {s:'🏄',n:'surf'}, {s:'🎨',n:'paint'}] },
  { name: 'Status', items: [{s:'✔️',n:'check'}, {s:'❌',n:'cross'}, {s:'📢',n:'announcement'}, {s:'🔔',n:'bell'}, {s:'⏳',n:'time'}, {s:'🏆',n:'trophy'}, {s:'🎁',n:'gift'}, {s:'📷',n:'camera'}, {s:'📹',n:'video'}, {s:'🎧',n:'headphone'}, {s:'⚡',n:'flash'}, {s:'🔥',n:'hot'}, {s:'💖',n:'sparkle heart'}, {s:'🤝',n:'shake'}, {s:'🌍',n:'world'}, {s:'🏠',n:'home'}, {s:'✅',n:'done'}, {s:'⛔',n:'no'}, {s:'💡',n:'idea'}, {s:'🔥',n:'fire'}] },
  { name: 'Objects', items: [{s:'⌚',n:'watch'}, {s:'📱',n:'phone'}, {s:'💻',n:'laptop'}, {s:'🔑',n:'key'}, {s:'💰',n:'money'}, {s:'💊',n:'pill'}, {s:'💉',n:'syringe'}, {s:'📡',n:'satellite'}, {s:'🔭',n:'telescope'}, {s:'💣',n:'bomb'}, {s:'🧬',n:'dna'}, {s:'🌡️',n:'temp'}, {s:'🧺',n:'basket'}, {s:'🧻',n:'paper'}, {s:'🧼',n:'soap'}, {s:'🪥',n:'brush'}] },
];

const COLORS = [
  '#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', 
  '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'
];

export default function StoryEditScreen({ 
  images: propImages, 
  currentUser, 
  onClose, 
  onShare,
  navigation,
  route 
}: StoryEditScreenProps) {
  // Extract images from route.params or propImages
  const images = propImages || route?.params?.images || [];
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Tools state
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [activeMusicTab, setActiveMusicTab] = useState<'for_you' | 'trending'>('for_you');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [privacy, setPrivacy] = useState<'Public' | 'Followers' | 'Following' | 'Custom'>('Public');
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  
  // Draggable elements
  const [placedElements, setPlacedElements] = useState<{id: string, type: 'text' | 'sticker' | 'mention', content: string, x: number, y: number}[]>([]);
  
  const [activeOverlay, setActiveOverlay] = useState<'music' | 'stickers' | 'text' | 'effects' | 'mention' | 'link' | 'crop' | 'privacy' | null>(null);
  const [activeElement, setActiveElement] = useState<{id: string, type: 'sticker'|'text'|'mention'} | null>(null);
  
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [texts, setTexts] = useState<PlacedText[]>([]);
  const [mentions, setMentions] = useState<PlacedText[]>([]);

  const handleElementPointerMove = (e: React.PointerEvent) => {
    if (!activeElement) return;
    
    const deltaXPercent = (e.movementX / window.innerWidth) * 100;
    const deltaYPercent = (e.movementY / window.innerHeight) * 100;

    if (activeElement.type === 'sticker') {
      setStickers(prev => prev.map(s => s.id === activeElement.id ? {...s, x: Math.max(0, Math.min(100, s.x + deltaXPercent)), y: Math.max(0, Math.min(100, s.y + deltaYPercent))} : s));
    } else if (activeElement.type === 'text') {
      setTexts(prev => prev.map(t => t.id === activeElement.id ? {...t, x: Math.max(0, Math.min(100, t.x + deltaXPercent)), y: Math.max(0, Math.min(100, t.y + deltaYPercent))} : t));
    } else {
      setMentions(prev => prev.map(m => m.id === activeElement.id ? {...m, x: Math.max(0, Math.min(100, m.x + deltaXPercent)), y: Math.max(0, Math.min(100, m.y + deltaYPercent))} : m));
    }
  };

  const handleResize = (id: string, type: 'sticker' | 'text' | 'mention', deltaSize: number) => {
    if (type === 'sticker') {
      setStickers(prev => prev.map(s => s.id === id ? { ...s, size: Math.max(20, Math.min(200, s.size + deltaSize)) } : s));
    } else if (type === 'text') {
      setTexts(prev => prev.map(t => t.id === id ? { ...t, fontSize: Math.max(12, Math.min(100, t.fontSize + deltaSize)) } : t));
    } else {
      setMentions(prev => prev.map(m => m.id === id ? { ...m, fontSize: Math.max(12, Math.min(100, m.fontSize + deltaSize)) } : m));
    }
  };
  const [selectedEffect, setSelectedEffect] = useState('none');
  const [showTextModal, setShowTextModal] = useState(false);
  const [newTextInput, setNewTextInput] = useState('');
  const [newTextColor, setNewTextColor] = useState('#ffffff');
  
  // Crop states
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);

  // Reset crop values on image switch
  React.useEffect(() => {
    setCropRotation(0);
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
  }, [selectedIndex]);

  // Touch & drag tracking for finger/mouse crop adjustment
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);

  const getPinchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointerDown = (clientX: number, clientY: number, touches?: React.TouchList) => {
    if (touches && touches.length >= 2) {
      const dist = getPinchDistance(touches);
      if (dist) {
        setInitialPinchDistance(dist);
        setInitialZoom(cropZoom);
      }
    } else {
      setIsDragging(true);
      setDragStart({ x: clientX, y: clientY });
      setInitialOffset({ x: cropOffsetX, y: cropOffsetY });
    }
  };

  const handlePointerMove = (clientX: number, clientY: number, touches?: React.TouchList) => {
    if (touches && touches.length >= 2 && initialPinchDistance !== null) {
      const dist = getPinchDistance(touches);
      if (dist) {
        const ratio = dist / initialPinchDistance;
        const newZoom = Math.min(4, Math.max(1, initialZoom * ratio));
        setCropZoom(newZoom);
      }
    } else if (isDragging) {
      const dx = clientX - dragStart.x;
      const dy = clientY - dragStart.y;
      setCropOffsetX(initialOffset.x + dx);
      setCropOffsetY(initialOffset.y + dy);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setInitialPinchDistance(null);
  };

  const [isSharing, setIsSharing] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [customLink, setCustomLink] = useState('');

  const currentItem = images[selectedIndex] || null;
  
  const getMediaUri = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.uri || item.url || '';
  };

  const mediaUri = getMediaUri(currentItem);
  const isVideo = currentItem?.type === 'video' || (typeof mediaUri === 'string' && (mediaUri.startsWith('data:video') || mediaUri.endsWith('.mp4')));

  // Convert File or Blob URI to base64 data URL for persistent cloud/local storage
  const getPersistentUrl = async (item: any): Promise<string> => {
    const uri = getMediaUri(item);
    if (!uri) return '';
    if (uri.startsWith('data:') || uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }
    try {
      if (item?.file && item.file instanceof File) {
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve(uri);
          reader.readAsDataURL(item.file);
        });
      }
      if (uri.startsWith('blob:') || uri.startsWith('file:')) {
        const res = await fetch(uri);
        const blob = await res.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve(uri);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.warn("Could not convert blob uri to persistent data url:", e);
    }
    return uri;
  };

  const handleShareStory = async () => {
    console.log("handleShareStory called, mediaUri:", mediaUri, "isSharing:", isSharing);
    if (!mediaUri || isSharing) return;
    setIsSharing(true);
    try {
      const persistentUrl = await getPersistentUrl(currentItem);
      console.log("Persistent URL obtained:", persistentUrl);
      const metadata = {
        music: selectedMusic,
        stickers,
        texts,
        privacy: privacy,
        customLink: customLink,
        cropRotation: isVideo ? 0 : cropRotation,
        cropZoom: isVideo ? 1 : cropZoom,
        cropOffsetX: isVideo ? 0 : cropOffsetX,
        cropOffsetY: isVideo ? 0 : cropOffsetY,
      };
      if (onShare) {
        console.log("Calling onShare with:", persistentUrl, isVideo ? 'video' : 'image', metadata);
        await onShare(persistentUrl, isVideo ? 'video' : 'image', metadata);
        // Trigger animation and notification
        window.dispatchEvent(new CustomEvent('sharing-line-animation'));
        // Using a custom notification component would be better, but sticking to alert for simplicity
        // as per instructions to avoid changing complex things.
        console.log("Shared story! Animation triggered.");
      } else if (navigation && navigation.goBack) {
        navigation.goBack();
      }
    } catch (err) {
      console.error('Error sharing story:', err);
    } finally {
      setIsSharing(false);
      if (onClose) onClose();
    }
  };

  const handleAddSticker = (emoji: string) => {
    const newSticker: PlacedSticker = {
      id: Date.now().toString() + Math.random(),
      text: emoji,
      x: Math.floor(Math.random() * 50) + 15, // random center-ish %
      y: Math.floor(Math.random() * 50) + 20,
      size: 48,
    };
    setStickers((prev) => [...prev, newSticker]);
  };

  const handleRemoveSticker = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddText = () => {
    if (!newTextInput.trim()) return;
    const newText: PlacedText = {
      id: Date.now().toString() + Math.random(),
      text: newTextInput.trim(),
      x: 20,
      y: 40,
      color: newTextColor,
      fontSize: 24,
    };
    setTexts((prev) => [...prev, newText]);
    setNewTextInput('');
    setShowTextModal(false);
  };

  const handleRemoveText = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTexts((prev) => prev.filter((t) => t.id !== id));
  };

  if (!mediaUri) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-white select-none">
        <p className="text-lg font-semibold mb-4">No image selected</p>
        <button 
          onClick={onClose || (() => navigation?.goBack?.())}
          className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden font-sans">
      
      {/* 1. TOP HEADER BAR */}
      <div className="absolute top-0 inset-x-0 z-40 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose || (() => navigation?.goBack?.())}
            className="p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md border border-white/10 transition active:scale-95 cursor-pointer"
            title="Cancel"
          >
            <X size={22} />
          </button>
          <span className="text-white font-bold text-sm tracking-wide hidden sm:inline drop-shadow">
            Edit Story
          </span>
        </div>

        {/* Action Tools: Music, Stickers, Text */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setActiveOverlay('music')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full backdrop-blur-md border transition active:scale-95 cursor-pointer ${
              selectedMusic 
                ? 'bg-purple-600/80 border-purple-400 text-white font-bold shadow-lg' 
                : 'bg-black/50 hover:bg-black/70 border-white/10 text-white font-semibold'
            }`}
          >
            <Music size={16} className={selectedMusic ? 'animate-bounce text-white' : 'text-purple-400'} />
            <span className="text-xs truncate max-w-[100px] sm:max-w-[140px]">
              {selectedMusic ? selectedMusic.title : 'Add Music'}
            </span>
          </button>

          <button 
            onClick={() => setActiveOverlay('stickers')}
            className="p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md border border-white/10 transition active:scale-95 cursor-pointer"
            title="Add Sticker"
          >
            <Smile size={20} className="text-amber-400" />
          </button>

          <button 
            onClick={() => setShowTextModal(true)}
            className="p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md border border-white/10 transition active:scale-95 cursor-pointer"
            title="Add Text"
          >
            <Type size={20} className="text-blue-400" />
          </button>

          {!isVideo && (
            <button 
              onClick={() => setShowCropModal(true)}
              className="p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md border border-white/10 transition active:scale-95 cursor-pointer"
              title="Crop & Rotate"
            >
              <Crop size={20} className="text-emerald-400" />
            </button>
          )}

          <button 
            onClick={() => setShowPrivacyModal(true)}
            className="p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md border border-white/10 transition active:scale-95 cursor-pointer"
            title="Privacy Settings"
          >
            <Settings size={20} className="text-neutral-300" />
          </button>
        </div>
      </div>

      {/* 2. MAIN PREVIEW CANVAS */}
      <div 
        className="flex-1 w-full h-full flex items-center justify-center bg-neutral-950 relative overflow-hidden"
        onPointerMove={handleElementPointerMove}
        onPointerUp={() => setActiveElement(null)}
      >
        {isVideo ? (
          <video 
            src={mediaUri} 
            controls 
            autoPlay 
            loop 
            style={{ filter: selectedEffect }}
            className="w-full h-full max-w-md object-contain sm:object-cover sm:rounded-2xl"
          />
        ) : (
          <img 
            src={mediaUri} 
            alt="Story Preview" 
            style={{
              transform: `translate(${cropOffsetX}px, ${cropOffsetY}px) rotate(${cropRotation}deg) scale(${cropZoom})`,
              transition: isDragging ? 'none' : 'transform 0.2s ease',
              filter: selectedEffect
            }}
            className="w-full h-full max-w-md object-contain sm:object-cover sm:rounded-2xl select-none cursor-grab active:cursor-grabbing pointer-events-auto"
            referrerPolicy="no-referrer"
            onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, e.touches);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length > 0) {
                handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, e.touches);
              }
            }}
            onTouchEnd={handlePointerUp}
          />
        )}

        {/* Overlaid Stickers */}
        {stickers.map((st) => (
            <div 
              key={st.id}
              onPointerDown={(e) => { e.stopPropagation(); setActiveElement({id: st.id, type: 'sticker'}); }}
              style={{ left: `${st.x}%`, top: `${st.y}%`, touchAction: 'none' }}
              className="absolute z-20 cursor-move group p-2 hover:bg-white/10 rounded-2xl transition border border-transparent hover:border-white/30"
              onClick={(e) => { e.stopPropagation(); setStickers(prev => prev.filter(s => s.id !== st.id)); }}
              title="Click to remove sticker"
            >
              <span style={{ fontSize: `${st.size}px` }} className="drop-shadow-lg select-none leading-none block">
                {st.text}
              </span>
              <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-md">
                <Trash2 size={12} />
              </div>
              <div 
                className="absolute -bottom-2 -right-2 bg-white text-black rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-md cursor-nwse-resize"
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); const startY = e.clientY; const startSize = st.size; const move = (me: PointerEvent) => handleResize(st.id, 'sticker', me.clientY - startY); const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); }}
              >
                <div className="w-2 h-2 rounded-full bg-black"></div>
              </div>
            </div>
        ))}

        {/* Overlaid Texts */}
        {texts.map((tx) => (
            <div 
              key={tx.id}
              onPointerDown={(e) => { e.stopPropagation(); setActiveElement({id: tx.id, type: 'text'}); }}
              style={{ left: `${tx.x}%`, top: `${tx.y}%`, color: tx.color, fontSize: `${tx.fontSize}px`, touchAction: 'none' }}
              className="absolute z-20 cursor-move group px-3 py-1.5 hover:bg-black/40 rounded-xl transition font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] border border-transparent hover:border-white/30"
              onClick={(e) => { e.stopPropagation(); setTexts(prev => prev.filter(t => t.id !== tx.id)); }}
              title="Click to remove text"
            >
              {tx.text}
              <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-md">
                <Trash2 size={12} />
              </div>
              <div 
                className="absolute -bottom-2 -right-2 bg-white text-black rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-md cursor-nwse-resize"
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); const startY = e.clientY; const startSize = tx.fontSize; const move = (me: PointerEvent) => handleResize(tx.id, 'text', me.clientY - startY); const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); }}
              >
                <div className="w-2 h-2 rounded-full bg-black"></div>
              </div>
            </div>
        ))}

        {/* Overlaid Mentions */}
        {mentions.map((mn) => (
            <div 
              key={mn.id}
              onPointerDown={(e) => { e.stopPropagation(); setActiveElement({id: mn.id, type: 'mention'}); }}
              style={{ left: `${mn.x}%`, top: `${mn.y}%`, color: mn.color, fontSize: `${mn.fontSize}px`, touchAction: 'none' }}
              className="absolute z-20 cursor-move group px-3 py-1.5 hover:bg-black/40 rounded-full transition font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] border border-transparent hover:border-white/30 bg-white/20"
              onClick={(e) => { e.stopPropagation(); setMentions(prev => prev.filter(m => m.id !== mn.id)); }}
              title="Click to remove mention"
            >
              @{mn.text}
              <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-md">
                <Trash2 size={12} />
              </div>
            </div>
        ))}

        {/* Multiple images indicator */}
        {images.length > 1 && (
          <div className="absolute top-20 inset-x-0 z-30 flex justify-center gap-1.5 px-4">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === selectedIndex ? 'w-8 bg-white shadow-md' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. BOTTOM SHARE BAR & TOOLBAR */}
      <div className="absolute bottom-0 inset-x-0 z-40 flex flex-col bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-auto">
        {/* NEW BOTTOM TOOLBAR */}
        <div className="flex items-center justify-around w-full py-2.5 px-4 border-b border-white/10">
          <button onClick={() => setActiveOverlay('stickers')} className="flex flex-col items-center gap-1 text-white hover:text-amber-400 transition cursor-pointer">
            <Smile size={22} />
            <span className="text-[11px] font-medium">Stickers</span>
          </button>
          <button onClick={() => setShowTextModal(true)} className="flex flex-col items-center gap-1 text-white hover:text-blue-400 transition cursor-pointer">
            <Type size={22} />
            <span className="text-[11px] font-medium">Text</span>
          </button>
          {!isVideo && (
            <button onClick={() => setShowCropModal(true)} className="flex flex-col items-center gap-1 text-white hover:text-emerald-400 transition cursor-pointer">
              <Crop size={22} className="text-emerald-400" />
              <span className="text-[11px] font-medium">Crop</span>
            </button>
          )}
          <button onClick={() => setActiveOverlay('effects')} className="flex flex-col items-center gap-1 text-white hover:text-purple-400 transition cursor-pointer">
            <Sparkles size={22} />
            <span className="text-[11px] font-medium">Effects</span>
          </button>
          <button onClick={() => setActiveOverlay('mention')} className="flex flex-col items-center gap-1 text-white hover:text-green-400 transition cursor-pointer">
            <AtSign size={22} />
            <span className="text-[11px] font-medium">Mention</span>
          </button>
          <button onClick={() => setShowLinkModal(true)} className="flex flex-col items-center gap-1 text-white hover:text-cyan-400 transition cursor-pointer">
            <LinkIcon size={22} />
            <span className="text-[11px] font-medium">Link</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.fullName} 
                  className="w-6 h-6 rounded-full object-cover border border-white/40"
                />
                <span className="text-white text-xs font-bold truncate max-w-[100px]">
                  Your Story
                </span>
              </div>
            )}
          </div>

          {/* Share Button (ONLY place where upload occurs!) */}
          <button
            onClick={handleShareStory}
            disabled={isSharing}
            className="flex items-center gap-2.5 px-7 py-3.5 bg-[#1877F2] hover:bg-[#1877F2]/90 disabled:opacity-60 text-white font-extrabold text-sm rounded-full shadow-xl hover:scale-105 active:scale-95 transition duration-200 cursor-pointer"
          >
            <span>{isSharing ? 'Sharing...' : 'Share'}</span>
            <Send size={18} className={isSharing ? 'animate-pulse' : ''} />
          </button>
        </div>
      </div>

      {activeOverlay === 'music' && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveOverlay(null)} className="text-white">
                <X size={24} />
              </button>
              <Music className="text-purple-400" size={20} />
              <h3 className="font-bold text-white text-base">Select Music</h3>
            </div>
            {selectedMusic && (
              <button 
                onClick={() => { setSelectedMusic(null); setActiveOverlay(null); }}
                className="text-xs font-semibold text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded-lg transition"
              >
                Remove
              </button>
            )}
          </div>
          <div className="p-4 border-b border-neutral-800 flex gap-4">
            <button 
              onClick={() => setActiveMusicTab('for_you')}
              className={`pb-2 text-sm font-bold border-b-2 ${activeMusicTab === 'for_you' ? 'border-purple-400 text-white' : 'border-transparent text-neutral-500'}`}
            >
              For You
            </button>
            <button 
              onClick={() => setActiveMusicTab('trending')}
              className={`pb-2 text-sm font-bold border-b-2 ${activeMusicTab === 'trending' ? 'border-purple-400 text-white' : 'border-transparent text-neutral-500'}`}
            >
              Trending
            </button>
          </div>
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 bg-neutral-800 rounded-xl px-3 py-2">
              <Search size={16} className="text-neutral-500" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search music..."
                className="bg-transparent text-sm text-white w-full outline-none"
              />
            </div>
          </div>
          <div className="p-4 overflow-y-auto space-y-2 flex-1 scrollbar-none">
            {TRENDING_MUSIC.filter(m => 
              (activeMusicTab === 'for_you' ? true : m.id === '1' || m.id === '4') && 
              (m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.artist.toLowerCase().includes(searchQuery.toLowerCase()))
            ).map((track) => {
              const isSelected = selectedMusic?.id === track.id;
              return (
                <div 
                  key={track.id}
                  onClick={() => { setSelectedMusic(track); setActiveOverlay(null); }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition border ${
                    isSelected 
                      ? 'bg-purple-600/20 border-purple-500/50 text-white' 
                      : 'bg-neutral-800/60 hover:bg-neutral-800 border-transparent text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-neutral-700 text-purple-400'}`}>
                      <Volume2 size={20} className={isSelected ? 'animate-pulse' : ''} />
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-sm text-white truncate">{track.title}</p>
                      <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-neutral-400">{track.duration}</span>
                    {isSelected && <Check size={18} className="text-purple-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {activeOverlay === 'effects' && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col p-4 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setActiveOverlay(null)} className="text-white"><X size={24} /></button>
            <h3 className="text-white text-xl font-bold">Effects</h3>
          </div>
          <input 
            type="text"
            placeholder="Search effects..."
            className="w-full bg-neutral-800 text-white p-3 rounded-xl mb-4 outline-none"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="grid grid-cols-4 gap-4 overflow-y-auto">
            {[
              { label: 'Original', filter: 'none' },
              { label: 'Grayscale', filter: 'grayscale(100%)' },
              { label: 'Sepia', filter: 'sepia(100%)' },
              { label: 'Invert', filter: 'invert(100%)' },
              { label: 'Blur', filter: 'blur(5px)' },
              { label: 'Contrast', filter: 'contrast(200%)' },
              { label: 'Saturate', filter: 'saturate(200%)' },
              { label: 'Hue-Rotate', filter: 'hue-rotate(90deg)' },
              { label: 'Effect 9', filter: 'brightness(150%)' },
              { label: 'Effect 10', filter: 'contrast(150%)' },
              { label: 'Effect 11', filter: 'saturate(50%)' },
              { label: 'Effect 12', filter: 'hue-rotate(180deg)' },
              { label: 'Effect 13', filter: 'invert(50%)' },
              { label: 'Effect 14', filter: 'sepia(50%)' },
              { label: 'Effect 15', filter: 'grayscale(50%)' },
              { label: 'Effect 16', filter: 'brightness(50%)' },
              { label: 'Effect 17', filter: 'contrast(50%)' },
              { label: 'Effect 18', filter: 'saturate(150%)' },
              { label: 'Effect 19', filter: 'hue-rotate(45deg)' },
              { label: 'Effect 20', filter: 'invert(25%)' },
              { label: 'Effect 21', filter: 'sepia(25%)' },
              { label: 'Effect 22', filter: 'grayscale(25%)' },
              { label: 'Effect 23', filter: 'blur(1px)' },
              { label: 'Effect 24', filter: 'brightness(200%)' }
            ].map((effect, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedEffect(effect.filter)}
                className={`aspect-square bg-neutral-800 rounded-2xl flex items-center justify-center text-white text-xs font-bold hover:bg-purple-600 transition cursor-pointer p-2 text-center ${selectedEffect === effect.filter ? 'ring-2 ring-purple-500' : ''}`}
              >
                {effect.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeOverlay === 'mention' && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col p-4 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setActiveOverlay(null)} className="text-white"><X size={24} /></button>
            <h3 className="text-white text-xl font-bold">Mention</h3>
          </div>
          <input 
            type="text"
            placeholder="Search followers..."
            className="w-full bg-neutral-800 text-white p-3 rounded-xl mb-4 outline-none"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="overflow-y-auto flex-1">
            {!searchQuery && (
               <div className="mb-6">
                 <h4 className="text-sm text-neutral-400 font-bold mb-3">Related & Active</h4>
                 {currentUser?.followers.slice(0, 3).map(f => (
                    <div key={f} className="flex items-center gap-4 p-3 hover:bg-neutral-800 rounded-xl cursor-pointer" onClick={() => { /* ... */ setActiveOverlay(null); }}>
                        <div className="w-10 h-10 bg-neutral-700 rounded-full" />
                        <span className="text-white font-bold">{f}</span>
                        <span className="ml-auto text-xs text-green-500">● Active</span>
                    </div>
                 ))}
               </div>
            )}
            <h4 className="text-sm text-neutral-400 font-bold mb-3">All Followers</h4>
            {currentUser?.followers.filter(f => f.toLowerCase().includes(searchQuery.toLowerCase())).map((follower) => (
              <div 
                key={follower} 
                className="flex items-center gap-4 p-3 hover:bg-neutral-800 rounded-xl cursor-pointer" 
                onClick={() => { 
                  const newMention: PlacedText = {
                    id: Date.now().toString() + Math.random(),
                    text: follower,
                    x: 30,
                    y: 30,
                    color: '#ffffff',
                    fontSize: 20
                  };
                  setMentions(prev => [...prev, newMention]);
                  setActiveOverlay(null); 
                }}
              >
                <div className="w-10 h-10 bg-neutral-700 rounded-full" />
                <span className="text-white font-bold">{follower}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeOverlay === 'stickers' && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col p-4 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setActiveOverlay(null)} className="text-white"><X size={24} /></button>
            <h3 className="text-white text-xl font-bold">Stickers</h3>
          </div>
          <input 
            type="text"
            placeholder="Search stickers..."
            className="w-full bg-neutral-800 text-white p-3 rounded-xl mb-4 outline-none"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="overflow-y-auto flex-1 space-y-5">
            {STICKER_CATEGORIES.map((cat) => (
              <div key={cat.name} className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400">{cat.name}</h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {cat.items.filter(item => item.n.toLowerCase().includes(searchQuery.toLowerCase())).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { handleAddSticker(item.s); setActiveOverlay(null); }}
                      className="text-3xl p-3 bg-neutral-800/50 hover:bg-neutral-800 hover:scale-110 active:scale-95 rounded-2xl transition flex items-center justify-center cursor-pointer"
                    >
                      {item.s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. TEXT PICKER MODAL */}
      {showTextModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setShowTextModal(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="text-blue-400" size={20} />
                <h3 className="font-bold text-white text-base">Add Text</h3>
              </div>
              <button 
                onClick={() => setShowTextModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Type something..."
              value={newTextInput}
              onChange={(e) => setNewTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
              autoFocus
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-2xl text-white font-bold text-lg placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition"
            />

            {/* Color Palette */}
            <div>
              <p className="text-xs font-semibold text-neutral-400 mb-2">Text Color</p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTextColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-8 h-8 rounded-full flex-shrink-0 transition border-2 ${
                      newTextColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowTextModal(false)}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddText}
                disabled={!newTextInput.trim()}
                className="flex-1 py-3 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition shadow-md"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}

      {activeOverlay === 'privacy' && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col p-4 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setActiveOverlay(null)} className="text-white"><X size={24} /></button>
            <h3 className="text-white text-xl font-bold">Story Privacy</h3>
          </div>
          
          <div className="space-y-2 py-2">
            {[
              { label: 'Public', desc: 'Anyone on Rohingya Connect can see your story', icon: Globe },
              { label: 'Followers', desc: 'Only your followers can see this story', icon: Users },
              { label: 'Custom', desc: 'Choose specific people to see this story', icon: Lock },
            ].map((opt) => {
              const IconComp = opt.icon;
              const isSelected = privacy === opt.label;
              return (
                <div key={opt.label}>
                  <div
                    onClick={() => { setPrivacy(opt.label as any); if (opt.label !== 'Custom') setActiveOverlay(null); }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition border ${
                      isSelected 
                        ? 'bg-[#1877F2]/20 border-[#1877F2] text-white' 
                        : 'bg-neutral-800/60 hover:bg-neutral-800 border-transparent text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#1877F2] text-white' : 'bg-neutral-700 text-neutral-300'}`}>
                        <IconComp size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{opt.label}</p>
                        <p className="text-xs text-neutral-400">{opt.desc}</p>
                      </div>
                    </div>
                  </div>
                  {opt.label === 'Custom' && isSelected && (
                    <div className="mt-2 p-4 bg-neutral-900 rounded-2xl">
                      <input 
                        type="text"
                        placeholder="Search followers..."
                        className="w-full bg-neutral-800 text-white p-3 rounded-xl mb-4 outline-none"
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className="max-h-60 overflow-y-auto">
                        {currentUser?.followers.filter(f => f.toLowerCase().includes(searchQuery.toLowerCase())).map(f => (
                          <div key={f} className="flex items-center justify-between p-2 cursor-pointer" onClick={() => setSelectedFollowers(prev => prev.includes(f) ? prev.filter(p => p !== f) : [...prev, f])}>
                            <span className="text-white">{f}</span>
                            <div className={`w-5 h-5 rounded-full border ${selectedFollowers.includes(f) ? 'bg-[#1877F2] border-[#1877F2]' : 'border-neutral-500'}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button 
            onClick={() => setActiveOverlay(null)}
            className="w-full py-3 bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-sm rounded-xl transition mt-auto"
          >
            Done
          </button>
        </div>
      )}

      {/* 8. CUSTOM LINK MODAL */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setShowLinkModal(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="text-cyan-400" size={20} />
                <h3 className="font-bold text-white text-base">Add Link to Story</h3>
              </div>
              <button 
                onClick={() => setShowLinkModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Viewers will be able to swipe up or click to visit this link.
            </p>

            <input
              type="url"
              placeholder="https://example.com..."
              value={customLink}
              onChange={(e) => setCustomLink(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-2xl text-white font-medium text-sm placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition"
            />

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setCustomLink(''); setShowLinkModal(false); }}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm rounded-xl transition"
              >
                Remove Link
              </button>
              <button 
                onClick={() => setShowLinkModal(false)}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl transition shadow-md"
              >
                Save Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. CROP TOOL MODAL */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCropModal(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white text-base">Crop & Rotate Photo</span>
              </div>
              <button onClick={() => setShowCropModal(false)} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Crop area preview */}
            <div className="w-full aspect-square rounded-2xl bg-black overflow-hidden flex items-center justify-center relative border border-neutral-800">
              <img 
                src={mediaUri} 
                alt="Crop preview" 
                style={{
                  transform: `translate(${cropOffsetX}px, ${cropOffsetY}px) rotate(${cropRotation}deg) scale(${cropZoom})`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                className="max-h-full max-w-full object-contain cursor-grab active:cursor-grabbing select-none pointer-events-auto"
                referrerPolicy="no-referrer"
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={(e) => {
                  if (e.touches.length > 0) {
                    handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, e.touches);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length > 0) {
                    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, e.touches);
                  }
                }}
                onTouchEnd={handlePointerUp}
              />
              <div className="absolute inset-4 border border-dashed border-white/40 rounded-lg pointer-events-none" />
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-[10px] text-neutral-300 px-2 py-0.5 rounded-md pointer-events-none select-none">
                Drag photo to pan • Pinch to zoom
              </div>
            </div>

            {/* Rotate control */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300 w-20">Rotate: {cropRotation}°</span>
                <span className="text-xs text-neutral-500">Rotate in 90° increments</span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  step="90"
                  value={cropRotation} 
                  onChange={(e) => setCropRotation(Number(e.target.value))}
                  className="flex-1 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <button 
                  onClick={() => setCropRotation((r) => (r + 90) % 360)}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  Rotate 90°
                </button>
              </div>
            </div>

            {/* Zoom control */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300 w-20">Zoom: {Math.round(cropZoom * 100)}%</span>
                <span className="text-xs text-neutral-500">Adjust scaling</span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.1"
                  value={cropZoom} 
                  onChange={(e) => setCropZoom(Number(e.target.value))}
                  className="flex-1 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <button 
                  onClick={() => { setCropRotation(0); setCropZoom(1); }}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => setShowCropModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowCropModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-md"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
