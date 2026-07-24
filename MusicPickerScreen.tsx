import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Bookmark, 
  Play, 
  Pause, 
  Music as MusicIcon, 
  Check, 
  Sparkles, 
  Flame, 
  Heart,
  X
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { usePostCreationStore, MusicItem } from './CreatePostScreen';

const DEFAULT_MUSIC_TRACKS: MusicItem[] = [
  { id: 'm1', title: 'Rohingya Anthem Folk', artist: 'Rakhine Harmony', duration: '3:15', trending: true, url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg' },
  { id: 'm2', title: 'Peaceful Sunrise', artist: 'Acoustic Chill', duration: '2:45', trending: true, url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_holler.ogg' },
  { id: 'm3', title: 'Akyab Memories', artist: 'Sittwe Beats', duration: '3:30', trending: false },
  { id: 'm4', title: 'Sunset Lofi Vibes', artist: 'Chillhop Masters', duration: '2:10', trending: true },
  { id: 'm5', title: 'Maungdaw Breeze', artist: 'Traditional Strings', duration: '4:02', trending: false },
  { id: 'm6', title: 'Ocean Waves Beats', artist: 'Coastal Rohingya', duration: '3:20', trending: true },
  { id: 'm7', title: 'Golden Hour Melody', artist: 'Naf River Duo', duration: '2:55', trending: false },
  { id: 'm8', title: 'Unity & Hope Song', artist: 'Rohingya Youth Choir', duration: '3:45', trending: true },
  { id: 'm9', title: 'Deep Meditation', artist: 'Zen Sounds', duration: '5:00', trending: false },
  { id: 'm10', title: 'Modern Rohingya Pop', artist: 'DJ Rashed', duration: '3:12', trending: true },
];

const DEFAULT_SAVED_MUSIC: MusicItem[] = [
  { id: 'm1', title: 'Rohingya Anthem Folk', artist: 'Rakhine Harmony', duration: '3:15', trending: true },
  { id: 'm4', title: 'Sunset Lofi Vibes', artist: 'Chillhop Masters', duration: '2:10', trending: true },
  { id: 'm8', title: 'Unity & Hope Song', artist: 'Rohingya Youth Choir', duration: '3:45', trending: true },
];

interface MusicPickerScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: any;
  };
  currentUser?: any;
  onClose?: () => void;
  onSelectMusic?: (item: MusicItem) => void;
}

export default function MusicPickerScreen({ navigation, route, currentUser, onClose, onSelectMusic }: MusicPickerScreenProps) {
  const [postState, setPostState] = usePostCreationStore();

  const handleReturnToCreatePost = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.navigate('CreatePostScreen', {
        music: postState.music || route?.params?.currentMusic,
        tagged: postState.taggedUsers || route?.params?.currentTagged,
        location: postState.location || route?.params?.currentLocation
      });
    }
  };

  const handleBack = () => {
    if (onClose) onClose();
    else navigation.goBack();
  };

  const [activeTab, setActiveTab] = useState<'for_you' | 'trending'>('for_you');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSavedView, setShowSavedView] = useState(false);
  
  const [musicList, setMusicList] = useState<MusicItem[]>(DEFAULT_MUSIC_TRACKS);
  const [savedMusicList, setSavedMusicList] = useState<MusicItem[]>(DEFAULT_SAVED_MUSIC);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch from Firebase 'music' collection
  useEffect(() => {
    const fetchMusic = async () => {
      setLoading(true);
      try {
        if (showSavedView) {
          // On tap Save icon: show user saved music from 'savedMusic' collection
          const snap = await getDocs(collection(db, 'savedMusic'));
          if (!snap.empty) {
            const items: MusicItem[] = [];
            snap.forEach(doc => items.push({ id: doc.id, ...doc.data() } as MusicItem));
            setSavedMusicList(items);
          }
        } else if (activeTab === 'for_you') {
          // Show automatic music suggestions from Firebase collection 'music'
          const snap = await getDocs(collection(db, 'music'));
          if (!snap.empty) {
            const items: MusicItem[] = [];
            snap.forEach(doc => items.push({ id: doc.id, ...doc.data() } as MusicItem));
            setMusicList(items);
          }
        } else if (activeTab === 'trending') {
          // Show all trending music from Firebase 'music' where trending=true
          const q = query(collection(db, 'music'), where('trending', '==', true));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const items: MusicItem[] = [];
            snap.forEach(doc => items.push({ id: doc.id, ...doc.data() } as MusicItem));
            setMusicList(items);
          } else {
            // Fallback filtering
            setMusicList(DEFAULT_MUSIC_TRACKS.filter(m => m.trending));
          }
        }
      } catch (err) {
        console.warn("Firestore music fetch error, using default tracks:", err);
        if (activeTab === 'trending') {
          setMusicList(DEFAULT_MUSIC_TRACKS.filter(m => m.trending));
        } else {
          setMusicList(DEFAULT_MUSIC_TRACKS);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMusic();
  }, [activeTab, showSavedView]);

  // On tap music: play preview + add to post state
  const handleSelectMusic = (item: MusicItem) => {
    // Play audio preview if url available
    if (playingId === item.id) {
      setPlayingId(null);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setPlayingId(item.id);
      if (item.url) {
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(item.url);
        audioRef.current.play().catch(() => {});
      }
    }

    // Add to post state or trigger callback
    if (onSelectMusic) {
      onSelectMusic(item);
    } else {
      setPostState({ music: item });
    }
  };

  const handleToggleSaveTrack = (e: React.MouseEvent, item: MusicItem) => {
    e.stopPropagation();
    const isSaved = savedMusicList.some(s => s.id === item.id);
    if (isSaved) {
      setSavedMusicList(prev => prev.filter(s => s.id !== item.id));
    } else {
      setSavedMusicList(prev => [...prev, item]);
    }
  };

  const displayedList = (showSavedView ? savedMusicList : musicList).filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* Top: Search bar + Save icon right corner */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (showSavedView) {
                  setShowSavedView(false);
                } else {
                  handleReturnToCreatePost();
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (showSavedView) {
                  setShowSavedView(false);
                } else {
                  handleReturnToCreatePost();
                }
              }}
              className="p-3 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition z-50 relative pointer-events-auto"
            >
              <ArrowLeft className="w-7 h-7" />
            </button>
            <h1 className="text-lg font-bold">
              {showSavedView ? 'Saved Music' : 'Add music'}
            </h1>
          </div>

          {/* Save icon right corner */}
          <button 
            onClick={() => setShowSavedView(!showSavedView)}
            title="Saved music from 'savedMusic' collection"
            className={`p-2 rounded-full transition relative ${showSavedView ? 'bg-[#1877F2] text-white shadow-md' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
          >
            <Bookmark className="w-6 h-6" />
            {savedMusicList.length > 0 && !showSavedView && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#1877F2] rounded-full ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={showSavedView ? "Search saved music..." : "Search music or artists..."}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-10 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1877F2] transition placeholder-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs: [For you] [Trending] (Only when not viewing saved music) */}
      {!showSavedView && (
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4">
          <div className="max-w-2xl mx-auto flex gap-6">
            <button
              onClick={() => setActiveTab('for_you')}
              className={`py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'for_you' ? 'border-[#1877F2] text-[#1877F2]' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Sparkles className="w-4 h-4" />
              <span>For you</span>
            </button>
            <button
              onClick={() => setActiveTab('trending')}
              className={`py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'trending' ? 'border-[#1877F2] text-[#1877F2]' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Flame className="w-4 h-4" />
              <span>Trending</span>
            </button>
          </div>
        </div>
      )}

      {/* Music List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="py-16 text-center text-slate-500 font-medium animate-pulse flex flex-col items-center gap-3">
            <MusicIcon className="w-8 h-8 animate-spin text-[#1877F2]" />
            <span>Loading {showSavedView ? "saved music..." : activeTab === 'trending' ? "trending music..." : "music suggestions..."}</span>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
            <MusicIcon className="w-12 h-12 text-slate-300 dark:text-slate-700" />
            <span className="font-bold text-base">No music tracks found</span>
            <span className="text-xs max-w-xs">{searchQuery ? "Try searching for another keyword or artist name." : "No tracks available in this section yet."}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedList.map((item) => {
              const isSelected = postState.music?.id === item.id;
              const isPlaying = playingId === item.id;
              const isSaved = savedMusicList.some(s => s.id === item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectMusic(item)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer group ${isSelected ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Play/Pause Thumbnail */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${isPlaying ? 'bg-purple-600 text-white animate-pulse' : isSelected ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-[#1877F2] group-hover:text-white'}`}>
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{item.title}</span>
                        {item.trending && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase rounded">
                            <Flame className="w-2.5 h-2.5 fill-current" /> Hot
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                        {item.artist} {item.duration ? `• ${item.duration}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    {/* Save track button */}
                    <button
                      onClick={(e) => handleToggleSaveTrack(e, item)}
                      title={isSaved ? "Remove from saved music" : "Save to savedMusic collection"}
                      className={`p-2 rounded-full transition ${isSaved ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    </button>

                    {/* Selection Checkmark */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition ${isSelected ? 'bg-purple-600 text-white' : 'border border-slate-300 dark:border-slate-700 text-transparent'}`}>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected bottom notification bar */}
      {postState.music && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 px-4 shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                <MusicIcon className="w-5 h-5 animate-spin-slow" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">Selected Audio</span>
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate block">{postState.music.title} • {postState.music.artist}</span>
              </div>
            </div>
            <button
              onClick={() => {
                handleReturnToCreatePost();
              }}
              className="px-6 py-2 rounded-xl bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-sm transition shrink-0 shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
