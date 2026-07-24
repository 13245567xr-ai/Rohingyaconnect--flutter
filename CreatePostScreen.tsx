import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Music, 
  Users, 
  MapPin, 
  Image as ImageIcon, 
  Sparkles, 
  Film, 
  X, 
  Crop, 
  Sliders, 
  Globe, 
  Lock, 
  UserCheck,
  Check,
  ChevronRight
} from 'lucide-react';

// ==========================================
// SHARED POST CREATION STORE & TYPES
// ==========================================
export interface MusicItem {
  id: string;
  title: string;
  artist: string;
  duration?: string;
  url?: string;
  trending?: boolean;
}

export interface TaggedUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isCollaborator?: boolean;
}

export interface PostCreationState {
  text: string;
  mediaUrl?: string;
  isVideo?: boolean;
  music?: MusicItem;
  taggedUsers: TaggedUser[];
  location?: string;
  privacy: 'Public' | 'Followers' | 'Only me';
  whoCanComment: 'Public' | 'Followers' | 'Profile you mention';
  activeFilter?: string;
  postIdToEdit?: string;
}

let storeState: PostCreationState = {
  text: '',
  mediaUrl: undefined,
  isVideo: false,
  music: undefined,
  taggedUsers: [],
  location: undefined,
  privacy: 'Public',
  whoCanComment: 'Public',
  activeFilter: 'none',
};

type StoreListener = (state: PostCreationState) => void;
const storeListeners = new Set<StoreListener>();

export const postCreationStore = {
  getState: () => storeState,
  setState: (updates: Partial<PostCreationState>) => {
    storeState = { ...storeState, ...updates };
    storeListeners.forEach((listener) => listener(storeState));
  },
  reset: () => {
    storeState = {
      text: '',
      mediaUrl: undefined,
      isVideo: false,
      music: undefined,
      taggedUsers: [],
      location: undefined,
      privacy: 'Public',
      whoCanComment: 'Public',
      activeFilter: 'none',
      postIdToEdit: undefined,
    };
    storeListeners.forEach((listener) => listener(storeState));
  },
  subscribe: (listener: StoreListener) => {
    storeListeners.add(listener);
    return () => {
      storeListeners.delete(listener);
    };
  },
};

export function usePostCreationStore() {
  const [current, setCurrent] = useState(postCreationStore.getState());
  useEffect(() => {
    return postCreationStore.subscribe(setCurrent);
  }, []);
  return [current, postCreationStore.setState] as const;
}

// 20 CSS Filter Effects Grid
export const PHOTO_EFFECTS = [
  { name: 'Normal', filter: 'none' },
  { name: 'Vintage', filter: 'sepia(0.4) contrast(1.1) brightness(0.9)' },
  { name: 'Sepia', filter: 'sepia(0.8)' },
  { name: 'B&W', filter: 'grayscale(1)' },
  { name: 'Warm', filter: 'sepia(0.3) saturate(1.4)' },
  { name: 'Cool', filter: 'hue-rotate(180deg) saturate(0.8)' },
  { name: 'Dramatic', filter: 'contrast(1.5) brightness(0.8)' },
  { name: 'Fade', filter: 'contrast(0.8) brightness(1.1) saturate(0.8)' },
  { name: 'Contrast', filter: 'contrast(1.6)' },
  { name: 'Bright', filter: 'brightness(1.2) contrast(1.05)' },
  { name: 'Retro', filter: 'sepia(0.5) hue-rotate(330deg) saturate(1.2)' },
  { name: 'Noir', filter: 'grayscale(1) contrast(1.8) brightness(0.7)' },
  { name: 'Glow', filter: 'brightness(1.15) saturate(1.3) contrast(1.1)' },
  { name: 'Sunset', filter: 'sepia(0.3) hue-rotate(340deg) saturate(1.5)' },
  { name: 'Forest', filter: 'hue-rotate(60deg) saturate(1.2) contrast(1.1)' },
  { name: 'Cyberpunk', filter: 'hue-rotate(270deg) saturate(2) contrast(1.3)' },
  { name: 'Cinematic', filter: 'contrast(1.3) saturate(1.1) brightness(0.9)' },
  { name: 'Pastel', filter: 'contrast(0.85) brightness(1.15) saturate(1.2)' },
  { name: 'Moody', filter: 'contrast(1.4) brightness(0.75) saturate(0.9)' },
  { name: 'Golden', filter: 'sepia(0.45) saturate(1.6) brightness(1.05)' },
];

const TRENDING_GIFS = [
  { id: 'g1', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&auto=format&fit=crop&q=80', title: 'Funny Cat' },
  { id: 'g2', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80', title: 'Happy Smile' },
  { id: 'g3', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&auto=format&fit=crop&q=80', title: 'Celebration Party' },
  { id: 'g4', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80', title: 'Thumbs Up' },
  { id: 'g5', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80', title: 'Excited Dog' },
  { id: 'g6', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80', title: 'Applause' },
  { id: 'g7', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80', title: 'Dancing' },
  { id: 'g8', url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=500&auto=format&fit=crop&q=80', title: 'Laughing' },
];

// Expo Image Picker Compatibility wrapper
const ImagePicker = {
  launchImageLibraryAsync: async (options: { mediaTypes?: string; allowsEditing?: boolean }) => {
    return new Promise<{ canceled: boolean; assets?: { uri: string; type: string }[] }>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.mediaTypes === 'Videos' ? 'video/*' : 'image/*,video/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const isVid = file.type.startsWith('video/');
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              canceled: false,
              assets: [{ uri: reader.result as string, type: isVid ? 'video' : 'image' }]
            });
          };
          reader.readAsDataURL(file);
        } else {
          resolve({ canceled: true });
        }
      };
      input.click();
    });
  }
};

// React Navigation Compatibility wrapper
const useFocusEffect = (effect: () => void | (() => void)) => {
  useEffect(effect, []);
};

interface CreatePostScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: any;
  };
  currentUser?: any;
  onClose?: () => void;
}

export default function CreatePostScreen({ navigation, route, currentUser, onClose }: CreatePostScreenProps) {
  const [state, setState] = usePostCreationStore();

  // Prevent screen reset when coming back
  useFocusEffect(
    React.useCallback(() => {
      // Do not reset state here
      if (route?.params) {
        const updates: Partial<PostCreationState> = {};
        if (route.params.music) updates.music = route.params.music;
        if (route.params.tagged) updates.taggedUsers = route.params.tagged;
        if (route.params.location) updates.location = route.params.location;
        if (Object.keys(updates).length > 0) {
          setState(updates);
        }
      }
    }, [route?.params])
  );
  const [showEffectsModal, setShowEffectsModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showGifModal, setShowGifModal] = useState(false);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropZoom, setCropZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authorName = currentUser?.fullName || "Pro Rashed";
  const authorAvatar = currentUser?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";

  // onPress Gallery: use expo-image-picker to open device gallery
  const handlePressGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'All',
        allowsEditing: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setState({
          mediaUrl: asset.uri,
          isVideo: asset.type === 'video',
          activeFilter: 'none'
        });
      }
    } catch (err) {
      console.warn("ImagePicker error, opening standard file selector:", err);
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVid = file.type.startsWith('video/');
      const reader = new FileReader();
      reader.onload = () => {
        setState({
          mediaUrl: reader.result as string,
          isVideo: isVid,
          activeFilter: 'none'
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // onPress Edit Photo: show 2 buttons: Crop, Effects(20 effects grid)
  const handlePressEditPhoto = () => {
    if (!state.mediaUrl || state.isVideo) {
      alert("Please select an image photo from Gallery first to edit.");
      return;
    }
    setShowEffectsModal(true);
  };

  // onPress Next: navigate('PostSettings')
  const handlePressNext = () => {
    if (!state.text.trim() && !state.mediaUrl) {
      alert("Please type something or attach media before proceeding.");
      return;
    }
    navigation.navigate('PostSettings');
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Hidden fallback file input */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*,video/*" 
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onClose ? onClose() : navigation.goBack()}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create post</h1>
        </div>
        <button
          onClick={handlePressNext}
          disabled={!state.text.trim() && !state.mediaUrl}
          className="px-5 py-2 rounded-lg bg-[#1877F2] text-white font-bold text-sm hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
        >
          Next
        </button>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full flex flex-col">
        
        {/* Top: Profile pic + Name "Pro Rashed" like pic 2 */}
        <div className="flex items-center gap-3.5 mb-4">
          <img 
            src={authorAvatar} 
            alt={authorName}
            className="w-12 h-12 rounded-full object-cover border-2 border-[#1877F2]/20 shadow-sm" 
          />
          <div className="flex flex-col">
            <span className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              {authorName}
              <Check className="w-4 h-4 text-white bg-[#1877F2] rounded-full p-0.5" />
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {state.privacy === 'Public' && <Globe className="w-3 h-3" />}
                {state.privacy === 'Followers' && <UserCheck className="w-3 h-3" />}
                {state.privacy === 'Only me' && <Lock className="w-3 h-3" />}
                {state.privacy}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: 3 buttons in row (Music, Tag/collaborate, Location) */}
        <div className="grid grid-cols-3 gap-2.5 mb-4 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          {/* 1. Music icon -> navigate('MusicPicker') */}
          <button 
            onClick={() => navigation.navigate('MusicPicker')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition active:scale-95 ${state.music ? 'bg-purple-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'}`}
          >
            <Music className="w-4 h-4 text-purple-500 shrink-0" />
            <span className="truncate">{state.music ? 'Music added' : 'Music'}</span>
          </button>

          {/* 2. Tag/collaborate icon -> navigate('TagCollaborate') */}
          <button 
            onClick={() => navigation.navigate('TagCollaborate')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition active:scale-95 ${state.taggedUsers.length > 0 ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'}`}
          >
            <Users className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="truncate">{state.taggedUsers.length > 0 ? `${state.taggedUsers.length} Tagged` : 'Tag/Collab'}</span>
          </button>

          {/* 3. Location icon -> navigate('LocationPicker') */}
          <button 
            onClick={() => navigation.navigate('LocationPicker')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition active:scale-95 ${state.location ? 'bg-rose-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'}`}
          >
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate">{state.location ? 'Location added' : 'Location'}</span>
          </button>
        </div>

        {/* Selected Badges Row */}
        {(state.music || state.taggedUsers.length > 0 || state.location) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {state.music && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                <Music className="w-3.5 h-3.5" />
                <span>{state.music.title} • {state.music.artist}</span>
                <button onClick={() => setState({ music: undefined })} className="hover:opacity-75 p-0.5"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {state.taggedUsers.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>With {state.taggedUsers.map(u => u.name).join(', ')}</span>
                <button onClick={() => setState({ taggedUsers: [] })} className="hover:opacity-75 p-0.5"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {state.location && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                <span>At {state.location}</span>
                <button onClick={() => setState({ location: undefined })} className="hover:opacity-75 p-0.5"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        )}

        {/* TextInput: placeholder "What's on your mind?" */}
        <textarea
          value={state.text}
          onChange={(e) => setState({ text: e.target.value })}
          placeholder="What's on your mind?"
          className="w-full bg-transparent text-slate-900 dark:text-slate-100 text-base md:text-lg outline-none resize-none min-h-[160px] placeholder-slate-400 dark:placeholder-slate-500 font-normal leading-relaxed mb-4"
        />

        {/* Media Preview Container */}
        {state.mediaUrl && (
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 mb-6 shadow-md">
            <button 
              onClick={() => setState({ mediaUrl: undefined, isVideo: false })}
              className="absolute top-3 right-3 z-20 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {state.isVideo ? (
              <video 
                src={state.mediaUrl} 
                controls 
                className="w-full max-h-[450px] object-contain mx-auto" 
              />
            ) : (
              <div className="relative overflow-hidden flex items-center justify-center bg-black/10 dark:bg-black/40">
                <img 
                  src={state.mediaUrl} 
                  alt="Post media" 
                  style={{ 
                    filter: state.activeFilter || 'none',
                    transform: `rotate(${cropRotation}deg) scale(${cropZoom})`,
                    transition: 'transform 0.2s ease, filter 0.2s ease'
                  }}
                  className="w-full max-h-[480px] object-contain mx-auto transition duration-300" 
                />
              </div>
            )}

            {!state.isVideo && (
              <div className="absolute bottom-3 right-3 z-20 flex gap-2">
                <button 
                  onClick={() => setShowCropModal(true)}
                  className="bg-black/75 hover:bg-black/95 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition"
                >
                  <Crop className="w-3.5 h-3.5" /> Crop
                </button>
                <button 
                  onClick={() => setShowEffectsModal(true)}
                  className="bg-[#1877F2]/90 hover:bg-[#1877F2] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Effects
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Bottom: 3 buttons: Gallery, Edit Photo, GIF */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 p-3 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-around gap-2">
          
          {/* 1. Gallery Button */}
          <button 
            onClick={handlePressGallery}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition active:scale-95 shadow-2xs cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <span>Gallery</span>
          </button>

          {/* 2. Edit Photo Button -> show 2 buttons: Crop, Effects(20 effects grid) */}
          <button 
            onClick={handlePressEditPhoto}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition active:scale-95 shadow-2xs cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>Edit Photo</span>
          </button>

          {/* 3. GIF Button */}
          <button 
            onClick={() => setShowGifModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition active:scale-95 shadow-2xs cursor-pointer"
          >
            <Film className="w-4 h-4 text-pink-500" />
            <span>GIF</span>
          </button>

        </div>
      </div>

      {/* Bottom bar: [Public] button, [Next] button */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          
          {/* [Public] button */}
          <button 
            onClick={() => navigation.navigate('PostSettings')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-sm transition border border-slate-200 dark:border-slate-700"
          >
            {state.privacy === 'Public' && <Globe className="w-4 h-4 text-[#1877F2]" />}
            {state.privacy === 'Followers' && <UserCheck className="w-4 h-4 text-[#1877F2]" />}
            {state.privacy === 'Only me' && <Lock className="w-4 h-4 text-[#1877F2]" />}
            <span>{state.privacy}</span>
            <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
          </button>

          {/* [Next] button */}
          <button 
            onClick={handlePressNext}
            disabled={!state.text.trim() && !state.mediaUrl}
            className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl bg-[#1877F2] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition shadow-md active:scale-95"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT PHOTO (Crop & Effects 20 Effects Grid)     */}
      {/* ======================================================== */}
      {showEffectsModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in">
          <div className="flex items-center justify-between max-w-3xl mx-auto w-full text-white py-2">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Edit Photo & Effects
            </h3>
            <button onClick={() => setShowEffectsModal(false)} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Preview with current filter */}
          <div className="flex-1 flex items-center justify-center my-4 overflow-hidden max-w-3xl mx-auto w-full">
            <img 
              src={state.mediaUrl} 
              alt="Preview" 
              style={{ 
                filter: state.activeFilter || 'none',
                transform: `rotate(${cropRotation}deg) scale(${cropZoom})`
              }}
              className="max-h-[50vh] object-contain rounded-xl shadow-2xl border border-white/20" 
            />
          </div>

          {/* 2 Buttons: Crop & Effects switcher */}
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">
            <div className="flex justify-center gap-4 border-b border-white/15 pb-3">
              <button 
                onClick={() => { setShowEffectsModal(false); setShowCropModal(true); }}
                className="px-6 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-sm flex items-center gap-2 transition"
              >
                <Crop className="w-4 h-4" /> Crop Tool
              </button>
              <button 
                onClick={() => {}}
                className="px-6 py-2 rounded-full bg-[#1877F2] text-white font-bold text-sm flex items-center gap-2 shadow-lg"
              >
                <Sparkles className="w-4 h-4" /> Effects (20 Grid)
              </button>
            </div>

            {/* 20 Effects Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2 overflow-y-auto max-h-[30vh] p-2 bg-black/40 rounded-2xl border border-white/10">
              {PHOTO_EFFECTS.map((eff) => (
                <button
                  key={eff.name}
                  onClick={() => setState({ activeFilter: eff.filter })}
                  className={`flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition cursor-pointer ${state.activeFilter === eff.filter ? 'bg-[#1877F2] ring-2 ring-white' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                    <img 
                      src={state.mediaUrl} 
                      alt={eff.name} 
                      style={{ filter: eff.filter }}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <span className="text-[10px] font-bold text-white truncate w-full text-center">{eff.name}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setShowEffectsModal(false)}
                className="px-8 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-200 transition shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CROP TOOL                                       */}
      {/* ======================================================== */}
      {showCropModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in">
          <div className="flex items-center justify-between max-w-2xl mx-auto w-full text-white py-2">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Crop className="w-5 h-5 text-emerald-400" />
              Crop & Rotate Photo
            </h3>
            <button onClick={() => setShowCropModal(false)} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center my-4 overflow-hidden max-w-2xl mx-auto w-full">
            <div className="border-2 border-dashed border-white/50 rounded-2xl p-2 bg-black/50 overflow-hidden flex items-center justify-center">
              <img 
                src={state.mediaUrl} 
                alt="Crop preview" 
                style={{ 
                  filter: state.activeFilter || 'none',
                  transform: `rotate(${cropRotation}deg) scale(${cropZoom})`,
                  transition: 'transform 0.2s ease'
                }}
                className="max-h-[50vh] object-contain rounded-lg" 
              />
            </div>
          </div>

          <div className="max-w-2xl mx-auto w-full bg-slate-900/90 p-4 rounded-2xl border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-300 w-20">Rotate: {cropRotation}°</span>
              <input 
                type="range" 
                min="-180" 
                max="180" 
                step="90" 
                value={cropRotation} 
                onChange={(e) => setCropRotation(Number(e.target.value))}
                className="flex-1 accent-[#1877F2]" 
              />
              <button 
                onClick={() => setCropRotation((r) => (r + 90) % 360)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                +90°
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-300 w-20">Zoom: {Math.round(cropZoom * 100)}%</span>
              <input 
                type="range" 
                min="0.5" 
                max="2" 
                step="0.1" 
                value={cropZoom} 
                onChange={(e) => setCropZoom(Number(e.target.value))}
                className="flex-1 accent-[#1877F2]" 
              />
              <button 
                onClick={() => { setCropRotation(0); setCropZoom(1); }}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                Reset
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button 
                onClick={() => setShowCropModal(false)}
                className="px-6 py-2 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowCropModal(false)}
                className="px-6 py-2 rounded-xl bg-[#1877F2] text-white font-bold text-sm hover:bg-blue-600 transition shadow-md"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: GIF PICKER                                      */}
      {/* ======================================================== */}
      {showGifModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Film className="w-5 h-5 text-pink-500" /> Select a GIF
              </h3>
              <button onClick={() => setShowGifModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto grid grid-cols-2 gap-3 flex-1">
              {TRENDING_GIFS.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => {
                    setState({ mediaUrl: gif.url, isVideo: false, activeFilter: 'none' });
                    setShowGifModal(false);
                  }}
                  className="group relative rounded-2xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-[#1877F2] transition cursor-pointer"
                >
                  <img src={gif.url} alt={gif.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 text-left">
                    <span className="text-[11px] font-bold text-white truncate block">{gif.title}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-500 font-medium">Powered by RohingyaConnect GIF Library</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
