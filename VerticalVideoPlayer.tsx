import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Heart, MessageSquare, Share2, Bookmark, MoreVertical, X, Check, 
  Music, Volume2, VolumeX, Play, Pause, ChevronLeft, Plus, Send, 
  Download, Link2, RotateCcw, Image, MessageCircle, AlertCircle, Smile, Trash2, Pin,
  Globe, Users, ChevronRight, BookmarkCheck, ThumbsUp, MoreHorizontal, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, Reel, User, Comment } from '../types';
import { db, uploadMedia } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, setDoc, deleteDoc } from 'firebase/firestore';
import { toggleSavePostInFirestore, addCommentToPostInFirestore, toggleFollowInFirestore } from '../utils/firebaseSync';
import AudioDetailsPage from './AudioDetailsPage';
import { BlueVerifiedTick } from './BlueVerifiedTick';
import TranslationWrapper from './TranslationWrapper';
import SuggestedPeopleCard from './SuggestedPeopleCard';

// Normalized video format to accept both Feed Video Posts and Shorts Reels
const REACTION_EMOJIS: Record<string, string> = {
  like: '👍',
  love: '❤️',
  happy: '🥰',
  care: '🥰',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡'
};

const VIDEO_REACTIONS = [
  { type: 'like', icon: '👍', name: 'Like' },
  { type: 'love', icon: '❤️', name: 'Love' },
  { type: 'happy', icon: '🥰', name: 'Care (Happy)' },
  { type: 'haha', icon: '😂', name: 'Haha' },
  { type: 'wow', icon: '😮', name: 'Wow' },
  { type: 'sad', icon: '😢', name: 'Sad' },
  { type: 'angry', icon: '😡', name: 'Angry' }
];
export interface NormalizedVideo {
  id: string;
  userId: string;
  userFullName: string;
  userAvatar: string;
  videoUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  viewsCount: number;
  createdAt: string;
  hashtags: string[];
  category?: string;
  location?: string;
  musicTitle?: string;
  audioId?: string;
  audioArtist?: string;
  audioCoverUrl?: string;
  isVerifiedCreator?: boolean;
  privacyType?: 'Public' | 'Friends';
  isReel: boolean;
  originalItem: any;
}

interface VerticalVideoPlayerProps {
  initialVideoId?: string;
  videoPool: (Post | Reel)[];
  currentUser: User;
  users: User[];
  isOverlay?: boolean; // True when opened as overlay from Home/Profile, False when page route (Shorts tab)
  onClose?: () => void;
  onViewProfile: (userId: string) => void;
  onFollowToggle: (userId: string) => void;
  onSharePost: (postId: string) => void;
  onUseAudio?: (audio: any) => void;
  onAddShort?: () => void;
}

export default function VerticalVideoPlayer({
  initialVideoId,
  videoPool,
  currentUser,
  users,
  isOverlay = true,
  onClose,
  onViewProfile,
  onFollowToggle,
  onSharePost,
  onUseAudio,
  onAddShort
}: VerticalVideoPlayerProps) {
  // 1. Normalize and rank video source
  const normalizedVideos = useMemo(() => {
    // A. Parse and format all videos from pool
    const allVideos: NormalizedVideo[] = videoPool
      .filter((item: any) => {
        // Must have a valid videoUrl
        return item && (item.videoUrl || item.video);
      })
      .map((item: any) => {
        const isReel = !item.hasOwnProperty('content') || !!item.isReel;
        const videoUrl = item.videoUrl || item.video || '';
        const caption = item.caption || item.content || item.text || '';
        
        // Extract hashtags
        const hashtags: string[] = [];
        const hashtagRegex = /#(\w+)/g;
        let match;
        while ((match = hashtagRegex.exec(caption)) !== null) {
          hashtags.push(match[1]);
        }

        const reactions = item.reactions || [];
        const likesCount = isReel ? (item.likesCount || 0) : reactions.length;
        const comments = item.comments || [];
        const commentsCount = isReel ? (item.commentsCount || 0) : comments.length;

        return {
          id: item.id,
          userId: item.userId,
          userFullName: item.userFullName || (item.user && item.user.name) || 'Anonymous',
          userAvatar: item.userAvatar || (item.user && item.user.avatar) || 'https://i.pravatar.cc/150?u=anon',
          videoUrl,
          caption,
          likesCount,
          commentsCount,
          sharesCount: item.sharesCount || 0,
          savesCount: (item.savedBy && item.savedBy.length) || 0,
          viewsCount: item.viewsCount || Math.floor(Math.random() * 500) + 120, // simulated default views
          createdAt: item.createdAt || new Date().toISOString(),
          hashtags,
          category: item.category || 'Education',
          location: item.location || 'Rohingya Community',
          musicTitle: item.audioTitle || item.musicTitle || 'Original Audio',
          audioId: item.audioId || 'default_audio',
          audioArtist: item.audioArtist || item.userFullName || 'Original Artist',
          audioCoverUrl: item.audioCoverUrl || item.userAvatar || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=100&h=100&q=80',
          isVerifiedCreator: item.isVerifiedCreator || false,
          privacyType: item.privacyType || 'Public',
          isReel,
          originalItem: item
        };
      });

    if (allVideos.length === 0) return [];

    // If isOverlay is true (e.g. Home Feed click), preserve the original feed sequence!
    if (isOverlay) {
      return allVideos;
    }

    // B. Find target starting video
    const startVideo = allVideos.find(v => v.id === initialVideoId) || allVideos[0];
    const otherVideos = allVideos.filter(v => v.id !== startVideo.id);

    // C. Score recommendations based on priority
    const scoredRecommendations = otherVideos.map(video => {
      let score = 0;

      // 1. Same category
      if (startVideo.category && video.category === startVideo.category) {
        score += 50;
      }

      // 2. Same hashtags
      const commonHashtags = video.hashtags.filter(tag => startVideo.hashtags.includes(tag));
      score += commonHashtags.length * 20;

      // 3. Following users
      const isFollowing = currentUser.following?.includes(video.userId);
      if (isFollowing) {
        score += 30;
      }

      // 4. Trending videos (by likes and comments)
      score += (video.likesCount * 2) + (video.commentsCount * 3);

      // 5. Recency (newer = more points)
      const daysAgo = (new Date().getTime() - new Date(video.createdAt).getTime()) / (1000 * 3600 * 24);
      score += Math.max(0, 100 - (daysAgo * 5)); // cap penalty

      return { video, score };
    });

    // Sort by score descending
    const sortedRecommendations = scoredRecommendations
      .sort((a, b) => b.score - a.score)
      .map(item => item.video);

    return [startVideo, ...sortedRecommendations];
  }, [videoPool, initialVideoId, currentUser, isOverlay]);

  // Find target initial index in the normalized video list
  const initialIndex = useMemo(() => {
    if (!initialVideoId || normalizedVideos.length === 0) return 0;
    const idx = normalizedVideos.findIndex(v => v.id === initialVideoId);
    return idx !== -1 ? idx : 0;
  }, [normalizedVideos, initialVideoId]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('vertical_video_muted') === 'true';
  });
  const [hiddenVideoIds, setHiddenVideoIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isInitialSynced = useRef(false);

  const handleContainerTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleContainerTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartRef.current.x;
    const deltaY = touchEndY - touchStartRef.current.y;
    
    // If swipe is horizontal (right) and longer than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 30) {
      // Redirect to profile
      const activeVideo = normalizedVideos[activeIndex];
      if (activeVideo) {
        onViewProfile(activeVideo.userId);
      }
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync activeIndex if initialIndex changes
  useEffect(() => {
    setActiveIndex(initialIndex);
    isInitialSynced.current = false;
  }, [initialIndex]);

  // Handle snapping container scroll sync to the initialIndex (with offset of 1 for the top loader)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const clientHeight = containerRef.current.clientHeight || window.innerHeight;
        containerRef.current.scrollTop = (initialIndex + 1) * clientHeight;
        isInitialSynced.current = true;
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [initialIndex, normalizedVideos]);

  // Handle CSS Scroll snapping active index updates
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    if (clientHeight === 0) return;
    
    // Only process scroll events after initial sync has run to avoid jumping/misaligned load
    if (!isInitialSynced.current) return;

    const domIndex = Math.round(scrollTop / clientHeight);
    if (domIndex === 0 && !isRefreshingFeed) {
      setIsRefreshingFeed(true);
      handleFeedRefresh();
    } else {
      const videoIndex = domIndex - 1;
      if (videoIndex !== activeIndex && videoIndex >= 0 && videoIndex < normalizedVideos.length) {
        setActiveIndex(videoIndex);
      }
    }
  };

  const handleFeedRefresh = () => {
    triggerToast("Updating feed...");
    setTimeout(() => {
      setIsRefreshingFeed(false);
      triggerToast("Feed updated!");
      if (containerRef.current) {
        const clientHeight = containerRef.current.clientHeight || window.innerHeight;
        containerRef.current.scrollTo({
          top: clientHeight,
          behavior: 'smooth'
        });
        setActiveIndex(0);
      }
    }, 1500);
  };

  const handleToggleMuteGlobal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('vertical_video_muted', String(next));
      triggerToast(next ? 'Muted' : 'Unmuted');
      return next;
    });
  };

  return (
    <div className={`bg-black z-[100] text-white select-none font-sans flex flex-col items-center justify-center overflow-hidden ${
      isOverlay ? 'fixed inset-0' : 'w-full h-full'
    }`}>
      
      {/* Top Header Controls */}
      <div className="absolute top-0 inset-x-0 z-[120] pt-14 md:pt-6 pb-4 px-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          {isOverlay && onClose && (
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition cursor-pointer border border-white/10"
              title="Return to Feed"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}
          {normalizedVideos[activeIndex]?.isReel && onAddShort && (
            <button
              onClick={() => onAddShort?.()}
              className="w-10 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-full border border-white/10 hover:scale-110 transition cursor-pointer shadow-lg"
              title="Create a Short"
            >
              <Plus className="w-5 h-5 text-white stroke-[3px]" />
            </button>
          )}
        </div>

        {/* Global Sound Control */}
        <button
          onClick={handleToggleMuteGlobal}
          className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>
      </div>

      {/* Main Snap Vertical Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={handleContainerTouchStart}
        onTouchEnd={handleContainerTouchEnd}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none relative"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {normalizedVideos.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-950">
            <AlertCircle className="w-16 h-16 opacity-30 mb-4" />
            <p className="text-sm">No videos found in this feed.</p>
          </div>
        ) : (
          <>
            {/* Elegant swipe-down feed updater at the top of the scroll list */}
            <div className="w-full h-full snap-start snap-always relative bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
              <div className="text-center p-6 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">Updating Feed</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Loading fresh shorts and videos</p>
                </div>
              </div>
            </div>

            {normalizedVideos.map((video, index) => {
              const isActive = index === activeIndex;
              // Virtualized preloading: Only mount video element for adjacent indices to preserve memory/GPU
              const shouldRender = Math.abs(index - activeIndex) <= 1;

              return (
                <React.Fragment key={video.id}>
                  <VideoItem
                    key={video.id}
                    video={video}
                    isActive={isActive}
                    shouldRender={shouldRender}
                    currentUser={currentUser}
                    users={users}
                    isMuted={isMuted}
                    onToggleMuteGlobal={handleToggleMuteGlobal}
                    onViewProfile={onViewProfile}
                    onFollowToggle={onFollowToggle}
                    onSharePost={onSharePost}
                    onUseAudio={onUseAudio}
                    videoPool={videoPool}
                    triggerToast={triggerToast}
                    onHideVideo={(id) => setHiddenVideoIds(prev => [...prev, id])}
                    onUnhideVideo={(id) => setHiddenVideoIds(prev => prev.filter(v => v !== id))}
                    isHidden={hiddenVideoIds.includes(video.id)}
                  />
                  {(index + 1) % 12 === 0 && (
                    <SuggestedPeopleCard
                      users={users}
                      currentUser={currentUser}
                      onFollowToggle={onFollowToggle}
                      onClose={() => {}}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>

      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-28 z-[150] bg-emerald-600 border border-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}

interface VideoItemProps {
  video: NormalizedVideo;
  isActive: boolean;
  shouldRender: boolean;
  currentUser: User;
  users: User[];
  isMuted: boolean;
  onToggleMuteGlobal: () => void;
  onViewProfile: (userId: string) => void;
  onFollowToggle: (userId: string) => void;
  onSharePost: (postId: string) => void;
  onUseAudio?: (audio: any) => void;
  videoPool: any[];
  triggerToast: (msg: string) => void;
  onHideVideo: (videoId: string) => void;
  onUnhideVideo: (videoId: string) => void;
  isHidden: boolean;
}

function VideoItem({
  video,
  isActive,
  shouldRender,
  currentUser,
  users,
  isMuted,
  onToggleMuteGlobal,
  onViewProfile,
  onFollowToggle,
  onSharePost,
  onUseAudio,
  videoPool,
  triggerToast,
  onHideVideo,
  onUnhideVideo,
  isHidden
}: VideoItemProps) {
  const [liveItem, setLiveItem] = useState<any>(video.originalItem);
  const [isPaused, setIsPaused] = useState(false);
  const [showPlayPauseAnim, setShowPlayPauseAnim] = useState<'play' | 'pause' | null>(null);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [likeAnimCoords, setLikeAnimCoords] = useState({ x: 0, y: 0 });
  const [showComments, setShowComments] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showAudioDetails, setShowAudioDetails] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Playback & Quality States
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [showQualitySheet, setShowQualitySheet] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const reactionLongPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReactionLongPressed = useRef(false);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const seekTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  if (isHidden) {
    return (
      <div className="w-full h-full snap-start snap-always relative bg-zinc-950 flex-shrink-0 flex items-center justify-center p-6 text-center select-none text-white border-b border-zinc-900">
        <div className="space-y-4 max-w-sm flex flex-col items-center">
          <div className="p-3 bg-zinc-900 rounded-full border border-zinc-800 text-zinc-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">Video Hidden</h4>
            <p className="text-xs text-zinc-400 mt-1">We'll show you fewer posts or videos like this in your feed.</p>
          </div>
          <button
            onClick={() => onUnhideVideo(video.id)}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Undo Hide
          </button>
        </div>
      </div>
    );
  }

  // Subscribe to real-time updates for reactions and comments on the active item
  useEffect(() => {
    if (!shouldRender) return;
    const collectionName = video.isReel ? 'rc_reels' : 'rc_posts';
    const docRef = doc(db, collectionName, video.id);

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setLiveItem(docSnap.data());
      }
    }, (err) => {
      console.warn("Error listening to video live item:", err);
    });

    return () => unsub();
  }, [video.id, video.isReel, shouldRender]);

  // Autoplay and control state
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      setIsPaused(false);
      videoRef.current.play().catch(err => {
        console.log("Autoplay blocked, user interaction required:", err);
        setIsPaused(true);
      });
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(err => console.error("Play failed:", err));
      setIsPaused(false);
      setShowPlayPauseAnim('play');
    } else {
      videoRef.current.pause();
      setIsPaused(true);
      setShowPlayPauseAnim('pause');
    }
    setTimeout(() => setShowPlayPauseAnim(null), 600);
  };

  // Long press: Pause on hold, play on release
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPaused(true);
        triggerToast("Paused on hold");
      }
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    if (videoRef.current && videoRef.current.paused && isPaused) {
      videoRef.current.play().then(() => {
        setIsPaused(false);
      }).catch(err => console.error("Play after hold failed:", err));
    }
  };

  // Double tap to like
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLikeAnimCoords({ x, y });
    setShowLikeAnim(true);
    setTimeout(() => setShowLikeAnim(false), 800);

    // Trigger Firestore Like
    handleLikeAction(true);
  };

  const startReactionPress = (e: React.PointerEvent) => {
    isReactionLongPressed.current = false;
    if (reactionLongPressTimeoutRef.current) {
      clearTimeout(reactionLongPressTimeoutRef.current);
    }
    reactionLongPressTimeoutRef.current = setTimeout(() => {
      isReactionLongPressed.current = true;
      setShowReactionPicker(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 0.5 seconds for better UX, 1500 is too long
  };

  const endReactionPress = (e: React.PointerEvent) => {
    if (reactionLongPressTimeoutRef.current) {
      clearTimeout(reactionLongPressTimeoutRef.current);
      reactionLongPressTimeoutRef.current = null;
    }
    if (!isReactionLongPressed.current) {
      handleLikeAction();
    }
    isReactionLongPressed.current = false;
  };

  const cancelReactionPress = () => {
    if (reactionLongPressTimeoutRef.current) {
      clearTimeout(reactionLongPressTimeoutRef.current);
      reactionLongPressTimeoutRef.current = null;
    }
    isReactionLongPressed.current = false;
  };

  const handleReactAction = async (reactionType: string, forceLikeOnly = false) => {
    try {
      const collectionName = video.isReel ? 'rc_reels' : 'rc_posts';
      const docRef = doc(db, collectionName, video.id);
      const reactions = liveItem?.reactions || [];
      const existingReaction = reactions.find((r: any) => r.userId === currentUser.id);

      let updatedReactions = [];
      let likesDiff = 0;

      if (existingReaction) {
        if (forceLikeOnly) return;
        if (existingReaction.type === reactionType) {
          updatedReactions = reactions.filter((r: any) => r.userId !== currentUser.id);
          likesDiff = -1;
          triggerToast(`Removed reaction`);
        } else {
          updatedReactions = reactions.map((r: any) => 
            r.userId === currentUser.id ? { ...r, type: reactionType } : r
          );
          likesDiff = 0;
          triggerToast(`Reacted with ${reactionType}!`);
        }
      } else {
        updatedReactions = [...reactions, { userId: currentUser.id, type: reactionType }];
        likesDiff = 1;
        triggerToast(`Reacted with ${reactionType}!`);
      }

      if (video.isReel) {
        await updateDoc(docRef, {
          reactions: updatedReactions,
          likesCount: Math.max(0, (liveItem.likesCount || 0) + likesDiff)
        });
      } else {
        await updateDoc(docRef, {
          reactions: updatedReactions,
          likes: Math.max(0, (liveItem.likes || reactions.length) + likesDiff)
        });
      }
    } catch (err) {
      console.error("Error reacting in Vertical Video:", err);
    }
  };

  const handleLikeAction = async (forceLikeOnly = false) => {
    await handleReactAction('like', forceLikeOnly);
  };

  const handleSaveAction = async () => {
    try {
      await toggleSavePostInFirestore(currentUser.id, video.id);
      triggerToast("Post Bookmarked!");
    } catch (e) {
      console.error(e);
    }
  };

  const foundUser = users.find(u => u.id === video.userId);
  const creator = {
    id: video.userId,
    fullName: foundUser?.fullName || video.userFullName || 'Anonymous',
    avatar: foundUser?.avatar || video.userAvatar || 'https://i.pravatar.cc/150?u=anon',
    username: (foundUser?.username || video.userFullName || 'user').toLowerCase().replace(/\s+/g, ''),
    isVerified: foundUser?.isVerified || false,
    invitesCount: foundUser?.invitesCount || 0,
    followersCount: foundUser?.followers?.length || foundUser?.followersCount || 0
  };

  const isFollowing = currentUser.following?.includes(creator.id);
  const likesCount = video.isReel ? (liveItem?.likesCount || 0) : (liveItem?.reactions?.length || 0);
  const commentsList: Comment[] = liveItem?.comments || [];
  const commentsCount = commentsList.length;

  const reactions = liveItem?.reactions || [];
  const isLiked = reactions.some((r: any) => r.userId === currentUser.id);
  const userReaction = reactions.find((r: any) => r.userId === currentUser.id);
  const userReactionType = userReaction?.type || null;

  if (!video.isReel) {
    return (
      <div className="w-full h-full snap-start snap-always relative bg-zinc-950 flex-shrink-0 flex items-center justify-center">
        {/* Video Frame */}
        {shouldRender && (
          <div 
            className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer select-none vertical-video-container"
            onClick={togglePlay}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <video
              ref={videoRef}
              src={video.videoUrl}
              className="w-full h-full object-cover md:object-contain bg-zinc-950"
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            />
          </div>
        )}

        {/* Edge vignette gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/50 pointer-events-none z-10" />

        {/* Animations */}
        <AnimatePresence>
          {showPlayPauseAnim && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.3, opacity: 0.8 }}
              exit={{ scale: 1.8, opacity: 0 }}
              className="absolute z-20 p-4 bg-black/60 rounded-full pointer-events-none"
            >
              {showPlayPauseAnim === 'play' ? <Play className="w-12 h-12 text-white fill-white" /> : <Pause className="w-12 h-12 text-white fill-white" />}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLikeAnim && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -20 }}
              animate={{ scale: 1.4, opacity: 1, rotate: 5 }}
              exit={{ scale: 2.2, opacity: 0 }}
              style={{ left: likeAnimCoords.x - 64, top: likeAnimCoords.y - 64 }}
              className="absolute z-30 pointer-events-none w-32 h-32 flex items-center justify-center"
            >
              <Heart className="w-24 h-24 text-red-500 fill-red-500 filter drop-shadow-[0_10px_20px_rgba(239,68,68,0.5)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* NEW UI: Bottom-left Information Area (Facebook Watch Style) */}
        <div className="absolute left-4 bottom-28 right-24 z-20 select-text text-left">
          {/* Creator Row */}
          <div className="flex items-center gap-3 mb-3 pointer-events-auto">
            <div 
              onClick={() => onViewProfile(creator.id)}
              className="w-11 h-11 rounded-full overflow-hidden border border-white/20 shadow-lg cursor-pointer shrink-0 relative"
            >
              <img 
                src={creator.avatar} 
                alt={creator.fullName} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  e.currentTarget.src = 'https://i.pravatar.cc/150?u=anon';
                }}
              />
              {!isFollowing && creator.id !== currentUser.id && (
                <div 
                  onClick={(e) => { e.stopPropagation(); onFollowToggle(creator.id); }}
                  className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full p-0.5 border border-black"
                >
                  <Plus className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 
                  onClick={() => onViewProfile(creator.id)}
                  className="font-black text-sm text-white drop-shadow flex items-center gap-1.5 cursor-pointer hover:underline"
                >
                  {creator.fullName}
                  {(creator.isVerified || (creator.invitesCount || 0) >= 5 || video.isVerifiedCreator) && (
                    <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />
                  )}
                </h3>
                
                {/* Follow Button */}
                {creator.id !== currentUser.id && (
                  <>
                    <span className="text-white/60 text-sm">•</span>
                    <button 
                      onClick={() => onFollowToggle(creator.id)}
                      className={`text-xs font-bold transition-all ${
                        isFollowing ? 'text-zinc-300' : 'text-blue-400 hover:text-blue-300'
                      }`}
                    >
                      {isFollowing ? `Following • ${formatCount(creator.followersCount)}` : 'Follow'}
                    </button>
                  </>
                )}
              </div>
              
              {/* Privacy Icon */}
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold">
                {video.privacyType === 'Public' ? (
                  <Globe className="w-3 h-3" />
                ) : (
                  <Users className="w-3 h-3" />
                )}
                <span>{video.privacyType || 'Public'}</span>
              </div>
            </div>
          </div>

          {/* Caption */}
          <div className="text-xs mb-3 leading-relaxed">
            <TranslationWrapper 
              text={isDescExpanded ? video.caption : `${video.caption.substring(0, 80)}${video.caption.length > 80 ? '...' : ''}`} 
              textClassName="text-zinc-100 drop-shadow"
              isDarkTheme={true}
            />
            {video.caption.length > 80 && (
              <button 
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="text-white font-bold ml-1 hover:underline text-[10px] cursor-pointer"
              >
                {isDescExpanded ? 'See less' : 'See more'}
              </button>
            )}
          </div>

          {/* Hashtags */}
          {video.hashtags && video.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {video.hashtags.map(tag => (
                <span key={tag} className="text-[11px] font-bold text-zinc-300 hover:text-white cursor-pointer transition">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Audio Info */}
          <div 
            onClick={() => setShowAudioDetails(true)}
            className="flex items-center gap-2 text-[11px] text-zinc-100 font-bold bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 w-fit cursor-pointer hover:bg-white/20 transition group pointer-events-auto"
          >
            <Music className="w-3.5 h-3.5 text-white animate-pulse" />
            <div className="overflow-hidden w-32 relative h-3.5 shrink-0">
              <div className="whitespace-nowrap absolute animate-marquee">
                {video.musicTitle} - {video.audioArtist}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Facebook Watch Style Playback Progress Bar */}
        <div className="absolute bottom-12 left-4 right-20 z-30 flex items-center gap-2.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 pointer-events-auto">
          <span className="text-[9px] font-bold text-zinc-300 font-mono select-none shrink-0">
            {formatTime(currentTime)}
          </span>
          
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-grow h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 focus:outline-none"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${(currentTime / (duration || 1)) * 100}%, #3f3f46 ${(currentTime / (duration || 1)) * 100}%, #3f3f46 100%)`
            }}
          />

          <span className="text-[9px] font-bold text-zinc-300 font-mono select-none shrink-0">
            {formatTime(duration)}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMuteGlobal();
            }}
            className="p-1 rounded-full hover:bg-white/10 transition shrink-0"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* Right Column Action Bar */}
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-3.5 z-20 pointer-events-auto">
          {/* Creator Avatar */}
          <div 
            onClick={() => onViewProfile(creator.id)}
            className="w-10.5 h-10.5 rounded-full border-2 border-white overflow-hidden cursor-pointer bg-zinc-900 shadow-xl"
          >
            <img 
              src={creator.avatar} 
              alt={creator.fullName} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer" 
              onError={(e) => {
                e.currentTarget.src = 'https://i.pravatar.cc/150?u=anon';
              }}
            />
          </div>

          {/* Like */}
          <div className="relative flex flex-col items-center">
            <button 
              onPointerDown={startReactionPress}
              onPointerUp={endReactionPress}
              onPointerLeave={cancelReactionPress}
              onPointerCancel={cancelReactionPress}
              className="flex flex-col items-center group cursor-pointer select-none"
            >
              <div className="p-2 bg-white/10 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition shadow-xl hover:bg-white/20 flex items-center justify-center w-10 h-10">
                {userReactionType && REACTION_EMOJIS[userReactionType] ? (
                  <span className="text-xl leading-none select-none filter drop-shadow">
                    {REACTION_EMOJIS[userReactionType]}
                  </span>
                ) : (
                  <Heart className={`w-5.5 h-5.5 transition-colors duration-150 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                )}
              </div>
              <span className="text-[10px] font-bold text-white drop-shadow mt-0.5">{likesCount}</span>
            </button>

            {/* Reaction picker bubble for standard view */}
            <AnimatePresence>
              {showReactionPicker && (
                <>
                  <div 
                    className="fixed inset-0 z-[140] cursor-default" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReactionPicker(false);
                    }} 
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 20, y: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 20, y: -20 }}
                    transition={{ type: "spring", damping: 15, stiffness: 200 }}
                    className="absolute right-12 bottom-0 flex items-center gap-1.5 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-full px-2.5 py-1.5 z-[150] shadow-2xl"
                  >
                    {VIDEO_REACTIONS.map((react) => (
                      <button
                        key={react.type}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactAction(react.type);
                          setShowReactionPicker(false);
                        }}
                        className="p-1 hover:scale-130 active:scale-95 transition-transform duration-150 cursor-pointer text-lg relative group/item"
                        title={react.name}
                      >
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 text-[9px] font-black px-1.5 py-0.5 rounded-md opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap text-white z-20">
                          {react.name}
                        </span>
                        <span>{react.icon}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Comment */}
          <button onClick={() => setShowComments(true)} className="flex flex-col items-center group cursor-pointer">
            <div className="p-2 bg-white/10 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition shadow-xl hover:bg-white/20 w-10 h-10 flex items-center justify-center">
              <MessageSquare className="w-5.5 h-5.5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow mt-0.5">{commentsCount}</span>
          </button>

          {/* Bookmark */}
          <button onClick={handleSaveAction} className="flex flex-col items-center group cursor-pointer">
            <div className="p-2 bg-white/10 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition shadow-xl hover:bg-white/20 w-10 h-10 flex items-center justify-center">
              <Bookmark className="w-5.5 h-5.5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow mt-0.5">Save</span>
          </button>

          {/* Share */}
          <button onClick={() => setShowShareMenu(true)} className="flex flex-col items-center group cursor-pointer">
            <div className="p-2 bg-white/10 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition shadow-xl hover:bg-white/20 w-10 h-10 flex items-center justify-center">
              <Share2 className="w-5.5 h-5.5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow mt-0.5">Share</span>
          </button>

          {/* More */}
          <button onClick={() => setShowMoreMenu(true)} className="p-2 bg-white/10 backdrop-blur-lg rounded-full border border-white/10 transition shadow-xl hover:bg-white/20 cursor-pointer w-10 h-10 flex items-center justify-center">
            <MoreVertical className="w-5 h-5 text-white" />
          </button>

          {/* Audio Disc */}
          <div 
            onClick={() => setShowAudioDetails(true)}
            className="w-9 h-9 rounded-full border-4 border-zinc-800 bg-zinc-900 flex items-center justify-center animate-spin-slow shadow-2xl cursor-pointer hover:scale-110 transition"
          >
            <img src={video.audioCoverUrl} className="w-4.5 h-4.5 rounded-full" alt="Music Disc" referrerPolicy="no-referrer" />
          </div>
        </div>

        {/* Bottom Sheets and Modals */}
        <AnimatePresence>
          {showAudioDetails && (
            <AudioDetailsPage 
              audio={{
                id: video.audioId || 'default',
                title: video.musicTitle || 'Original Audio',
                artist: video.audioArtist || video.userFullName,
                coverUrl: video.audioCoverUrl || video.userAvatar,
                creatorId: video.userId,
                usageCount: Math.floor(Math.random() * 1000) + 50,
                createdAt: new Date().toISOString()
              }}
              onClose={() => setShowAudioDetails(false)}
              currentUser={currentUser}
              users={users}
              allVideos={videoPool}
              triggerToast={triggerToast}
              onUseAudio={onUseAudio}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showComments && (
            <CommentsBottomSheet 
              itemId={video.id}
              isReel={video.isReel}
              comments={commentsList}
              currentUser={currentUser}
              users={users}
              onClose={() => setShowComments(false)}
              onAddComment={async (text, stickerUrl, imageUrl) => {
                const newComment = {
                  id: 'c_' + Date.now().toString(),
                  userId: currentUser.id,
                  userFullName: currentUser.fullName,
                  userAvatar: currentUser.avatar,
                  text: text || '',
                  stickerUrl: stickerUrl || '',
                  imageUrl: imageUrl || '',
                  createdAt: new Date().toISOString(),
                  likes: [],
                  loves: [],
                  replies: []
                };
                const collectionName = video.isReel ? 'rc_reels' : 'rc_posts';
                const docRef = doc(db, collectionName, video.id);
                if (video.isReel) {
                  await updateDoc(docRef, {
                    comments: [...commentsList, newComment],
                    commentsCount: (liveItem?.commentsCount || 0) + 1
                  });
                } else {
                  await addCommentToPostInFirestore(video.id, newComment, video.userId);
                }
                triggerToast("Comment posted!");
              }}
              onReplyComment={async (parentCommentId, text, stickerUrl, imageUrl) => {
                const replyObj = {
                  id: 'r_' + Date.now().toString(),
                  userId: currentUser.id,
                  userFullName: currentUser.fullName,
                  userAvatar: currentUser.avatar,
                  text: text || '',
                  stickerUrl: stickerUrl || '',
                  imageUrl: imageUrl || '',
                  createdAt: new Date().toISOString(),
                  likes: [],
                  loves: []
                };
                const collectionName = video.isReel ? 'rc_reels' : 'rc_posts';
                const docRef = doc(db, collectionName, video.id);
                const updatedComments = addReplyToCommentTree(commentsList, parentCommentId, replyObj);
                try {
                  await updateDoc(docRef, { comments: updatedComments });
                  triggerToast("Reply posted!");
                } catch (error) {
                  console.error("Failed to post reply:", error);
                  triggerToast("Failed to post reply. Please try again.");
                }
              }}
              onTogglePin={video.userId === currentUser.id ? async (commentId) => {
                const collectionName = video.isReel ? 'rc_reels' : 'rc_posts';
                const docRef = doc(db, collectionName, video.id);
                const togglePinInTree = (list: any[]): any[] => {
                  return list.map(c => {
                    if (c.id === commentId) {
                      return { ...c, isPinned: !c.isPinned };
                    }
                    if (c.replies && c.replies.length > 0) {
                      return { ...c, replies: togglePinInTree(c.replies) };
                    }
                    return c;
                  });
                };
                const updatedComments = togglePinInTree(commentsList);
                await updateDoc(docRef, { comments: updatedComments });
                triggerToast("Pin status updated!");
              } : undefined}
              onReactComment={async (commentId, type) => {
                const collectionName = video.isReel ? 'rc_reels' : 'rc_posts';
                const docRef = doc(db, collectionName, video.id);
                const updatedComments = toggleReactionInTree(commentsList, commentId, currentUser.id, type);
                await updateDoc(docRef, { comments: updatedComments });
              }}
              triggerToast={triggerToast}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showShareMenu && (
            <ShareBottomSheet
              videoUrl={video.videoUrl}
              onClose={() => setShowShareMenu(false)}
              onAction={(action) => {
                setShowShareMenu(false);
                triggerToast(`${action} successful!`);
              }}
            />
          )}
        </AnimatePresence>

        {/* Video 3-dot Options Menu */}
        <AnimatePresence>
          {showMoreMenu && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] flex items-end justify-center p-4">
              <motion.div 
                initial={{ y: 300 }}
                animate={{ y: 0 }}
                exit={{ y: 300 }}
                className="bg-zinc-900 border border-zinc-800 rounded-t-3xl w-full max-w-md p-6 pb-8 text-left"
              >
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-black uppercase text-zinc-400 tracking-wider">Options</h4>
                  <button onClick={() => setShowMoreMenu(false)} className="p-1 rounded-full bg-zinc-800 hover:bg-zinc-750">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      setShowMoreMenu(false);
                      onHideVideo(video.id);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-850 hover:bg-zinc-800 text-white rounded-2xl font-bold text-xs cursor-pointer border border-zinc-800/40"
                  >
                    <X className="w-5 h-5 text-zinc-400" /> Hide Video
                  </button>
                  <button 
                    onClick={() => {
                      setShowMoreMenu(false);
                      triggerToast("Thanks! We'll show you more posts like this.");
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-850 hover:bg-zinc-800 text-white rounded-2xl font-bold text-xs cursor-pointer border border-zinc-800/40"
                  >
                    <Heart className="w-5 h-5 text-emerald-400" /> Interested
                  </button>
                  <button 
                    onClick={() => {
                      setShowMoreMenu(false);
                      onHideVideo(video.id);
                      triggerToast("We'll show you fewer posts like this.");
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-850 hover:bg-zinc-800 text-white rounded-2xl font-bold text-xs cursor-pointer border border-zinc-800/40"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-400" /> Not Interested
                  </button>
                  <button 
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowQualitySheet(true);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-2xl hover:bg-emerald-950/40 font-bold text-xs cursor-pointer"
                  >
                    <Download className="w-5 h-5 text-emerald-400" /> HD Quality ({currentQuality})
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Quality Selection Bottom Sheet */}
        <AnimatePresence>
          {showQualitySheet && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-end justify-center p-4">
              <motion.div 
                initial={{ y: 300 }}
                animate={{ y: 0 }}
                exit={{ y: 300 }}
                className="bg-zinc-900 border border-zinc-800 rounded-t-3xl w-full max-w-md p-6 pb-8 text-left max-h-[80vh] flex flex-col"
              >
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3 shrink-0">
                  <div>
                    <h4 className="text-sm font-black uppercase text-white tracking-wider">Video Playback Quality</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Select your preferred stream quality</p>
                  </div>
                  <button onClick={() => setShowQualitySheet(false)} className="p-1 rounded-full bg-zinc-800 hover:bg-zinc-750">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="space-y-1 overflow-y-auto pr-1 flex-grow scrollbar-none">
                  {[
                    'Data Saver Mode',
                    'Auto',
                    '1080p',
                    '720p',
                    '640p',
                    '540p',
                    '480p',
                    '360p',
                    '270p',
                    '240p'
                  ].map((qual) => {
                    const isActive = currentQuality === qual;
                    return (
                      <button
                        key={qual}
                        onClick={() => {
                          setCurrentQuality(qual);
                          setShowQualitySheet(false);
                          triggerToast(qual === 'Data Saver Mode' ? "Quality adjusted to Data Saver" : `Quality changed to ${qual}`);
                        }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all ${
                          isActive 
                            ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' 
                            : 'text-zinc-300 hover:bg-zinc-800 hover:text-white border border-transparent'
                        }`}
                      >
                        <span>{qual}</span>
                        {isActive && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ELSE (REELS / SHORTS) - ENHANCED
  return (
    <div className="w-full h-full snap-start snap-always relative bg-zinc-950 flex-shrink-0 flex items-center justify-center">
      
      {/* Video Frame */}
      {shouldRender && (
        <div 
          className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer select-none vertical-video-container"
          onClick={togglePlay}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="w-full h-full object-cover md:object-contain bg-zinc-950"
            loop
            muted={isMuted}
            playsInline
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />
        </div>
      )}

      {/* Edge vignette gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/50 pointer-events-none z-10" />

      {/* Single tap play/pause indicator animation overlay */}
      <AnimatePresence>
        {showPlayPauseAnim && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 0.8 }}
            exit={{ scale: 1.8, opacity: 0 }}
            className="absolute z-20 p-4 bg-black/60 rounded-full pointer-events-none"
          >
            {showPlayPauseAnim === 'play' ? (
              <Play className="w-12 h-12 text-white fill-white" />
            ) : (
              <Pause className="w-12 h-12 text-white fill-white" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double tap heart animation */}
      <AnimatePresence>
        {showLikeAnim && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            animate={{ scale: 1.4, opacity: 1, rotate: 5 }}
            exit={{ scale: 2.2, opacity: 0 }}
            style={{ left: likeAnimCoords.x - 64, top: likeAnimCoords.y - 64 }}
            className="absolute z-30 pointer-events-none w-32 h-32 flex items-center justify-center"
          >
            <Heart className="w-24 h-24 text-red-500 fill-red-500 filter drop-shadow-[0_10px_20px_rgba(239,68,68,0.5)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Bottom Information Area */}
      <div className="absolute left-4 bottom-24 right-20 z-20 select-text text-left">
        <div className="flex items-center gap-2 mb-2 pointer-events-auto">
          <div 
            onClick={() => onViewProfile(creator.id)}
            className="w-9 h-9 rounded-full overflow-hidden border border-white/20 shadow-md cursor-pointer shrink-0"
          >
            <img 
              src={creator.avatar} 
              alt={creator.fullName} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer" 
              onError={(e) => {
                e.currentTarget.src = 'https://i.pravatar.cc/150?u=anon';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 
                onClick={() => onViewProfile(creator.id)}
                className="font-black text-sm text-white drop-shadow flex items-center gap-1 cursor-pointer hover:underline"
              >
                @{creator.username || creator.fullName.replace(/\s+/g, '').toLowerCase()}
                {(creator.isVerified || (creator.invitesCount || 0) >= 5 || video.isVerifiedCreator) && (
                  <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />
                )}
              </h3>
            </div>
            {video.category && (
              <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase drop-shadow">
                {video.category}
              </span>
            )}
          </div>
        </div>

        {/* Caption and expander */}
        <div className="text-xs mb-2 leading-relaxed">
          <TranslationWrapper 
            text={isDescExpanded ? video.caption : `${video.caption.substring(0, 80)}${video.caption.length > 80 ? '...' : ''}`} 
            textClassName="text-zinc-150 drop-shadow"
            isDarkTheme={true}
          />
          {video.caption.length > 80 && (
            <button 
              onClick={() => setIsDescExpanded(!isDescExpanded)}
              className="text-white font-bold ml-1 hover:underline text-[10px] bg-zinc-850/50 px-1.5 py-0.5 rounded pointer-events-auto cursor-pointer"
            >
              {isDescExpanded ? 'less' : 'more'}
            </button>
          )}
        </div>

        {/* Hashtags list */}
        {video.hashtags && video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {video.hashtags.map(tag => (
              <span key={tag} className="text-[11px] font-bold text-emerald-400 drop-shadow hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Location and Music details */}
        <div className="space-y-1.5 pointer-events-auto">
          {video.location && (
            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-300 font-semibold bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/5">
              📍 {video.location}
            </span>
          )}

          <div className="flex items-center gap-2 text-[11px] text-zinc-200 font-bold bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 w-fit">
            <Music className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <div className="overflow-hidden w-28 relative h-3.5 shrink-0">
              <div className="whitespace-nowrap absolute animate-marquee">
                {video.musicTitle || 'Original Audio'} - {video.userFullName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Facebook Watch Style Playback Progress Bar */}
      <div className="absolute bottom-11 left-4 right-20 z-30 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 pointer-events-auto">
        <span className="text-[9px] font-bold text-zinc-300 font-mono select-none shrink-0">
          {formatTime(currentTime)}
        </span>
        
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="flex-grow h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 focus:outline-none"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #10b981 ${(currentTime / (duration || 1)) * 100}%, #3f3f46 ${(currentTime / (duration || 1)) * 100}%, #3f3f46 100%)`
          }}
        />

        <span className="text-[9px] font-bold text-zinc-300 font-mono select-none shrink-0">
          {formatTime(duration)}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMuteGlobal();
          }}
          className="p-1 rounded-full hover:bg-white/10 transition shrink-0"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Right Column Floating action bar */}
      <div className="absolute right-3 bottom-16 flex flex-col items-center gap-3.5 z-20 pointer-events-auto">
        
        {/* Creator Avatar */}
        <div className="relative mb-0.5 flex flex-col items-center">
          <div 
            onClick={() => onViewProfile(creator.id)}
            className="w-10.5 h-10.5 rounded-full border-2 border-white overflow-hidden cursor-pointer bg-zinc-900 shadow-xl"
          >
            <img 
              src={creator.avatar} 
              alt={creator.fullName} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer" 
              onError={(e) => {
                e.currentTarget.src = 'https://i.pravatar.cc/150?u=anon';
              }}
            />
          </div>
          {!isFollowing && creator.id !== currentUser.id && (
            <button
              onClick={(e) => { e.stopPropagation(); onFollowToggle(creator.id); }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#fe2c55] hover:bg-[#e0304d] rounded-full p-0.5 border border-zinc-950 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-md z-50"
              style={{ width: '18px', height: '18px' }}
            >
              <Plus className="w-3 h-3 text-white stroke-[4px]" />
            </button>
          )}
        </div>

        {/* Like action */}
        <div className="relative flex flex-col items-center">
          <button 
            onPointerDown={startReactionPress}
            onPointerUp={endReactionPress}
            onPointerLeave={cancelReactionPress}
            onPointerCancel={cancelReactionPress}
            className="flex flex-col items-center group cursor-pointer select-none"
          >
            <div className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 group-active:scale-90 transition shadow-lg hover:bg-black/60 flex items-center justify-center w-10 h-10">
              {userReactionType && REACTION_EMOJIS[userReactionType] ? (
                <span className="text-xl leading-none select-none filter drop-shadow">
                  {REACTION_EMOJIS[userReactionType]}
                </span>
              ) : (
                <Heart className={`w-5.5 h-5.5 transition-colors duration-150 ${
                  isLiked ? 'text-red-500 fill-red-500' : 'text-white'
                }`} />
              )}
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow mt-0.5">
              {likesCount}
            </span>
          </button>

          {/* Reaction picker bubble for reels view */}
          <AnimatePresence>
            {showReactionPicker && (
              <>
                <div 
                  className="fixed inset-0 z-[140] cursor-default" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReactionPicker(false);
                  }} 
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20, y: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20, y: -20 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200 }}
                  className="absolute right-12 bottom-0 flex items-center gap-1.5 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-full px-2.5 py-1.5 z-[150] shadow-2xl"
                >
                  {VIDEO_REACTIONS.map((react) => (
                    <button
                      key={react.type}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReactAction(react.type);
                        setShowReactionPicker(false);
                      }}
                      className="p-1 hover:scale-130 active:scale-95 transition-transform duration-150 cursor-pointer text-lg relative group/item"
                      title={react.name}
                    >
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 text-[9px] font-black px-1.5 py-0.5 rounded-md opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap text-white z-20">
                        {react.name}
                      </span>
                      <span>{react.icon}</span>
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Comments bottom sheet trigger */}
        <button 
          onClick={() => setShowComments(true)} 
          className="flex flex-col items-center group cursor-pointer"
        >
          <div className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 group-active:scale-90 transition shadow-lg hover:bg-black/60 w-10 h-10 flex items-center justify-center">
            <MessageSquare className="w-5.5 h-5.5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white drop-shadow mt-0.5">
            {commentsCount}
          </span>
        </button>

        {/* Bookmark/Save action */}
        <button 
          onClick={handleSaveAction} 
          className="flex flex-col items-center group cursor-pointer"
        >
          <div className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 group-active:scale-90 transition shadow-lg hover:bg-black/60 w-10 h-10 flex items-center justify-center">
            <Bookmark className="w-5.5 h-5.5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white drop-shadow mt-0.5">Save</span>
        </button>

        {/* Share bottom sheet trigger */}
        <button 
          onClick={() => setShowShareMenu(true)} 
          className="flex flex-col items-center group cursor-pointer"
        >
          <div className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 group-active:scale-90 transition shadow-lg hover:bg-black/60 w-10 h-10 flex items-center justify-center">
            <Share2 className="w-5.5 h-5.5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white drop-shadow mt-0.5">Share</span>
        </button>

        {/* Additional options / More trigger */}
        <button 
          onClick={() => setShowMoreMenu(true)} 
          className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 transition shadow-lg hover:bg-black/60 cursor-pointer w-10 h-10 flex items-center justify-center"
        >
          <MoreVertical className="w-5 h-5 text-white" />
        </button>

        {/* Spinning audio disc art */}
        <div className="w-9 h-9 rounded-full border-4 border-zinc-900 bg-zinc-800 flex items-center justify-center animate-spin-slow shadow-xl">
          <img 
            src={creator.avatar} 
            className="w-4.5 h-4.5 rounded-full" 
            alt="Music Disc" 
            referrerPolicy="no-referrer" 
            onError={(e) => {
              e.currentTarget.src = 'https://i.pravatar.cc/150?u=anon';
            }}
          />
        </div>
      </div>

      {/* Real-time Comments Bottom Sheet Panel */}
      <AnimatePresence>
        {showComments && (
          <CommentsBottomSheet 
            itemId={video.id}
            isReel={video.isReel}
            comments={commentsList}
            currentUser={currentUser}
            users={users}
            onClose={() => setShowComments(false)}
            onAddComment={async (text, stickerUrl, imageUrl) => {
              const newComment = {
                id: 'c_' + Date.now().toString(),
                userId: currentUser.id,
                userFullName: currentUser.fullName,
                userAvatar: currentUser.avatar,
                text: text || '',
                stickerUrl: stickerUrl || '',
                imageUrl: imageUrl || '',
                createdAt: new Date().toISOString(),
                likes: [],
                loves: [],
                replies: []
              };
              const collectionName = video.isReel ? 'rc_reels' : 'rc_posts';
              const docRef = doc(db, collectionName, video.id);

              if (video.isReel) {
                await updateDoc(docRef, {
                  comments: [...commentsList, newComment],
                  commentsCount: (liveItem?.commentsCount || 0) + 1
                });
              } else {
                await addCommentToPostInFirestore(video.id, newComment, video.userId);
              }
              triggerToast("Comment posted!");
            }}
            onReplyComment={async (parentCommentId, text, stickerUrl, imageUrl) => {
              const replyObj = {
                id: 'r_' + Date.now().toString(),
                userId: currentUser.id,
                userFullName: currentUser.fullName,
                userAvatar: currentUser.avatar,
                text: text || '',
                stickerUrl: stickerUrl || '',
                imageUrl: imageUrl || '',
                createdAt: new Date().toISOString(),
                likes: [],
                loves: []
              };
              const collectionName = video.isReel ? 'rc_reels' : 'rc_posts';
              const docRef = doc(db, collectionName, video.id);

              const updatedComments = addReplyToCommentTree(commentsList, parentCommentId, replyObj);
              await updateDoc(docRef, { comments: updatedComments });
              triggerToast("Reply posted!");
            }}
            onTogglePin={video.userId === currentUser.id ? async (commentId) => {
              const collectionName = video.isReel ? 'rc_reels' : 'rc_posts';
              const docRef = doc(db, collectionName, video.id);

              const togglePinInTree = (list: any[]): any[] => {
                return list.map(c => {
                  if (c.id === commentId) {
                    return { ...c, isPinned: !c.isPinned };
                  }
                  if (c.replies && c.replies.length > 0) {
                    return { ...c, replies: togglePinInTree(c.replies) };
                  }
                  return c;
                });
              };
              try {
                const updatedComments = togglePinInTree(commentsList);
                await updateDoc(docRef, { comments: updatedComments });
                triggerToast("Comment pinned!");
              } catch (error) {
                console.error("Failed to pin comment:", error);
                triggerToast("Failed to pin comment. Please try again.");
              }
              triggerToast("Pin status updated!");
            } : undefined}
            onReactComment={async (commentId, type) => {
              const collectionName = video.isReel ? 'rc_reels' : 'rc_posts';
              const docRef = doc(db, collectionName, video.id);
              try {
                const updatedComments = toggleReactionInTree(commentsList, commentId, currentUser.id, type);
                await updateDoc(docRef, { comments: updatedComments });
              } catch (error) {
                console.error("Failed to toggle reaction:", error);
                triggerToast("Failed to update reaction.");
              }
            }}
            triggerToast={triggerToast}
          />
        )}
      </AnimatePresence>

      {/* Share Bottom Sheet Overlay */}
      <AnimatePresence>
        {showShareMenu && (
          <ShareBottomSheet
            videoUrl={video.videoUrl}
            onClose={() => setShowShareMenu(false)}
            onAction={(action) => {
              setShowShareMenu(false);
              triggerToast(`${action} successful!`);
            }}
          />
        )}
      </AnimatePresence>

      {/* "More Options" Sheet Overlay (Report post/cache settings) */}
      <AnimatePresence>
        {showMoreMenu && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] flex items-end justify-center p-4">
            <motion.div 
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="bg-zinc-900 border border-zinc-800 rounded-t-3xl w-full max-w-md p-6 pb-8 text-left"
            >
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black uppercase text-zinc-400 tracking-wider">Options</h4>
                <button onClick={() => setShowMoreMenu(false)} className="p-1 rounded-full bg-zinc-800 hover:bg-zinc-750">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowMoreMenu(false);
                    onHideVideo(video.id);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-zinc-850 hover:bg-zinc-800 text-white rounded-2xl font-bold text-xs cursor-pointer border border-zinc-800/40"
                >
                  <X className="w-5 h-5 text-zinc-400" /> Hide Video
                </button>
                <button 
                  onClick={() => {
                    setShowMoreMenu(false);
                    triggerToast("Thanks! We'll show you more posts like this.");
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-zinc-850 hover:bg-zinc-800 text-white rounded-2xl font-bold text-xs cursor-pointer border border-zinc-800/40"
                >
                  <Heart className="w-5 h-5 text-emerald-400" /> Interested
                </button>
                <button 
                  onClick={() => {
                    setShowMoreMenu(false);
                    onHideVideo(video.id);
                    triggerToast("We'll show you fewer posts like this.");
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-zinc-850 hover:bg-zinc-800 text-white rounded-2xl font-bold text-xs cursor-pointer border border-zinc-800/40"
                >
                  <AlertCircle className="w-5 h-5 text-rose-400" /> Not Interested
                </button>
                <button 
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowQualitySheet(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-2xl hover:bg-emerald-950/40 font-bold text-xs cursor-pointer"
                >
                  <Download className="w-5 h-5 text-emerald-400" /> HD Quality ({currentQuality})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quality Selection Bottom Sheet */}
      <AnimatePresence>
        {showQualitySheet && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-end justify-center p-4">
            <motion.div 
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="bg-zinc-900 border border-zinc-800 rounded-t-3xl w-full max-w-md p-6 pb-8 text-left max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3 shrink-0">
                <div>
                  <h4 className="text-sm font-black uppercase text-white tracking-wider">Video Playback Quality</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Select your preferred stream quality</p>
                </div>
                <button onClick={() => setShowQualitySheet(false)} className="p-1 rounded-full bg-zinc-800 hover:bg-zinc-750">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="space-y-1 overflow-y-auto pr-1 flex-grow scrollbar-none">
                {[
                  'Data Saver Mode',
                  'Auto',
                  '1080p',
                  '720p',
                  '640p',
                  '540p',
                  '480p',
                  '360p',
                  '270p',
                  '240p'
                ].map((qual) => {
                  const isActive = currentQuality === qual;
                  return (
                    <button
                      key={qual}
                      onClick={() => {
                        setCurrentQuality(qual);
                        setShowQualitySheet(false);
                        triggerToast(qual === 'Data Saver Mode' ? "Quality adjusted to Data Saver" : `Quality changed to ${qual}`);
                      }}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all ${
                        isActive 
                          ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' 
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white border border-transparent'
                      }`}
                    >
                      <span>{qual}</span>
                      {isActive && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// -----------------------------------------------------------------
// Comments Bottom Sheet Sub-Component and Utilities
// -----------------------------------------------------------------
const formatCount = (num: number) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

const formatTime = (time: number) => {
  if (isNaN(time)) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const COMMUNITY_STICKERS = [
  { id: 'st_smile', label: 'Smile', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f600.png', tags: ['smile', 'happy', 'lol'] },
  { id: 'st_love', label: 'Heart Eyes', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f60d.png', tags: ['love', 'heart', 'adore'] },
  { id: 'st_clap', label: 'Clap', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f44f.png', tags: ['clap', 'applause', 'bravo'] },
  { id: 'st_fire', label: 'Fire', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f525.png', tags: ['fire', 'lit', 'awesome'] },
  { id: 'st_cry', label: 'Sad Cry', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f622.png', tags: ['cry', 'sad', 'tears'] },
  { id: 'st_laugh', label: 'Laugh', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f602.png', tags: ['laugh', 'lol', 'haha'] },
  { id: 'st_mindblown', label: 'Mind Blown', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f92f.png', tags: ['mindblown', 'wow', 'shock'] },
  { id: 'st_pray', label: 'Pray', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f64f.png', tags: ['pray', 'thanks', 'please'] },
  { id: 'st_thumbsup', label: 'Thumbs Up', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f44d.png', tags: ['like', 'thumbs', 'good'] },
  { id: 'st_party', label: 'Celebrate', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f389.png', tags: ['party', 'celebrate', 'congrats'] }
];

// Recursive helper to insert a reply into a comment tree
function addReplyToCommentTree(comments: any[], targetCommentId: string, replyObj: any): any[] {
  return comments.map(c => {
    if (c.id === targetCommentId) {
      return {
        ...c,
        replies: [...(c.replies || []), replyObj]
      };
    }
    if (c.replies && c.replies.length > 0) {
      return {
        ...c,
        replies: addReplyToCommentTree(c.replies, targetCommentId, replyObj)
      };
    }
    return c;
  });
}

// Recursive helper to toggle reactions ('like' or 'love') in a comment tree
function toggleReactionInTree(comments: any[], commentId: string, userId: string, type: 'like' | 'love'): any[] {
  return comments.map(c => {
    if (c.id === commentId) {
      if (type === 'like') {
        const likes = c.likes || [];
        const hasLiked = likes.includes(userId);
        const updatedLikes = hasLiked ? likes.filter((id: string) => id !== userId) : [...likes, userId];
        return { ...c, likes: updatedLikes };
      } else {
        const loves = c.loves || [];
        const hasLoved = loves.includes(userId);
        const updatedLoves = hasLoved ? loves.filter((id: string) => id !== userId) : [...loves, userId];
        return { ...c, loves: updatedLoves };
      }
    }
    if (c.replies && c.replies.length > 0) {
      return {
        ...c,
        replies: toggleReactionInTree(c.replies, commentId, userId, type)
      };
    }
    return c;
  });
}

// Recursive Comment Item sub-component
function CommentItem({
  comment,
  currentUser,
  users,
  depth = 0,
  onReply,
  onReact,
  onHide,
  onReport,
  onCopy,
  onTogglePin,
  hiddenCommentIds,
  onUndoHide,
  onLongPress
}: {
  comment: any;
  currentUser: User;
  users: User[];
  depth?: number;
  onReply: (commentId: string, replyToName: string) => void;
  onReact: (commentId: string, type: 'like' | 'love') => void;
  onHide: (commentId: string) => void;
  onReport: (commentId: string) => void;
  onCopy: (comment: any) => void;
  onTogglePin?: (commentId: string) => void;
  hiddenCommentIds: string[];
  onUndoHide: (commentId: string) => void;
  onLongPress: (comment: any) => void;
}) {
  const [showLocalMenu, setShowLocalMenu] = useState(false);
  const isCommentHidden = hiddenCommentIds.includes(comment.id);

  if (isCommentHidden) {
    return (
      <div className={`flex items-center justify-between p-2.5 bg-zinc-850/50 rounded-xl border border-zinc-800/40 text-zinc-500 font-bold ${depth > 0 ? 'ml-11' : ''}`}>
        <span className="text-[11px] italic">This comment has been hidden.</span>
        <button 
          onClick={() => onUndoHide(comment.id)} 
          className="text-emerald-400 hover:text-emerald-300 text-[11px] underline cursor-pointer font-bold"
        >
          Undo
        </button>
      </div>
    );
  }

  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const pressStarted = useRef(false);

  const startPress = (e: React.MouseEvent | React.TouchEvent) => {
    pressStarted.current = true;
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    
    longPressTimeout.current = setTimeout(() => {
      if (pressStarted.current) {
        onLongPress(comment);
        pressStarted.current = false;
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, 1000);
  };

  const endPress = () => {
    pressStarted.current = false;
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handleTouchMove = () => {
    endPress();
  };

  useEffect(() => {
    return () => {
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    };
  }, []);

  const commentUser = users.find(u => u.id === comment.userId) || {
    id: comment.userId,
    fullName: comment.userFullName,
    avatar: comment.userAvatar,
    isVerified: false,
    invitesCount: 0
  };

  const isUserVerified = commentUser.isVerified || (commentUser.invitesCount || 0) >= 5 || comment.isVerified || comment.isVerifiedCreator;

  const likesCount = comment.likes?.length || 0;
  const lovesCount = comment.loves?.length || 0;
  const hasLiked = comment.likes?.includes(currentUser.id);
  const hasLoved = comment.loves?.includes(currentUser.id);

  return (
    <div className={`space-y-2 select-text text-left relative ${depth > 0 ? 'ml-11 mt-1 border-l border-zinc-800/80 pl-4' : ''}`}>
      <div className="flex gap-2.5 items-start">
        <img src={commentUser.avatar} className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-850" alt="avatar" referrerPolicy="no-referrer" />
        
        <div 
          className="flex-grow bg-zinc-850 p-3 rounded-2xl relative group cursor-pointer"
          onTouchStart={startPress}
          onTouchEnd={endPress}
          onTouchMove={handleTouchMove}
          onMouseDown={startPress}
          onMouseUp={endPress}
          onMouseLeave={endPress}
        >
          <div className="flex justify-between items-baseline mb-1">
            <div className="flex items-center gap-1.5 flex-wrap pr-4">
              <span className="font-extrabold text-white text-[11px] flex items-center gap-1">
                {commentUser.fullName}
                {isUserVerified && <BlueVerifiedTick className="w-3 h-3 shrink-0" />}
              </span>
              {comment.isPinned && (
                <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-950 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-900/30">
                  <Pin className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400 rotate-45" /> Pinned
                </span>
              )}
            </div>
            <span className="text-[9px] text-zinc-500 font-medium shrink-0">
              {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Just now'}
            </span>
          </div>
          
          {comment.text && <p className="text-zinc-200 leading-relaxed text-xs">{comment.text}</p>}

          {comment.stickerUrl && (
            <div className="mt-2 max-w-[100px] h-auto overflow-hidden rounded-lg">
              <img src={comment.stickerUrl} className="object-contain max-h-20" alt="sticker" referrerPolicy="no-referrer" />
            </div>
          )}

          {comment.imageUrl && (
            <div className="mt-2 max-w-[180px] h-auto overflow-hidden rounded-xl border border-zinc-800 shadow-lg">
              <img src={comment.imageUrl} className="object-cover max-h-32 w-full" alt="attached-media" referrerPolicy="no-referrer" />
            </div>
          )}

          {(likesCount > 0 || lovesCount > 0) && (
            <div className="absolute -bottom-2 right-2 flex items-center gap-1 bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded-full shadow-md text-[9px] font-black z-10 shrink-0 select-none">
              {likesCount > 0 && <span className="text-blue-400">👍 {likesCount}</span>}
              {lovesCount > 0 && <span className="text-rose-400">👎 {lovesCount}</span>}
            </div>
          )}

          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowLocalMenu(!showLocalMenu);
              }}
              className="p-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {showLocalMenu && (
              <>
                <div className="fixed inset-0 z-[110]" onClick={() => setShowLocalMenu(false)} />
                <div className="absolute right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1.5 w-32 z-[120] text-[10px] font-extrabold text-zinc-300">
                  <button 
                    onClick={() => {
                      onReply(comment.id, commentUser.fullName);
                      setShowLocalMenu(false);
                    }}
                    className="w-full text-left p-2 hover:bg-zinc-800 rounded-lg hover:text-white flex items-center gap-1.5"
                  >
                    Reply
                  </button>
                  <button 
                    onClick={() => {
                      onCopy(comment);
                      setShowLocalMenu(false);
                    }}
                    className="w-full text-left p-2 hover:bg-zinc-800 rounded-lg hover:text-white flex items-center gap-1.5"
                  >
                    Copy
                  </button>
                  <button 
                    onClick={() => {
                      onHide(comment.id);
                      setShowLocalMenu(false);
                    }}
                    className="w-full text-left p-2 hover:bg-zinc-800 rounded-lg hover:text-rose-400 flex items-center gap-1.5"
                  >
                    Hide Comment
                  </button>
                  <button 
                    onClick={() => {
                      onReport(comment.id);
                      setShowLocalMenu(false);
                    }}
                    className="w-full text-left p-2 hover:bg-zinc-800 rounded-lg hover:text-rose-400 flex items-center gap-1.5"
                  >
                    Report Comment
                  </button>
                  {onTogglePin && depth === 0 && (
                    <button 
                      onClick={() => {
                        onTogglePin(comment.id);
                        setShowLocalMenu(false);
                      }}
                      className="w-full text-left p-2 hover:bg-zinc-800 rounded-lg hover:text-emerald-400 flex items-center gap-1.5"
                    >
                      {comment.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pl-11 text-[10px] text-zinc-500 font-extrabold select-none">
        <button 
          onClick={() => onReact(comment.id, 'like')} 
          className={`flex items-center gap-0.5 transition ${hasLiked ? 'text-blue-400' : 'hover:text-zinc-300'}`}
        >
          <span>👍</span> Like
        </button>

        <button 
          onClick={() => onReact(comment.id, 'love')} 
          className={`flex items-center gap-0.5 transition ${hasLoved ? 'text-rose-400' : 'hover:text-zinc-300'}`}
        >
          <span>👎</span> Dislike
        </button>

        <button 
          onClick={() => onReply(comment.id, commentUser.fullName)} 
          className="hover:text-zinc-300 transition"
        >
          Reply
        </button>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 mt-2">
          {comment.replies.map((reply: any) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              users={users}
              depth={depth + 1}
              onReply={onReply}
              onReact={onReact}
              onHide={onHide}
              onReport={onReport}
              onCopy={onCopy}
              onTogglePin={onTogglePin}
              hiddenCommentIds={hiddenCommentIds}
              onUndoHide={onUndoHide}
              onLongPress={onLongPress}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentsBottomSheetProps {
  itemId: string;
  isReel: boolean;
  comments: Comment[];
  currentUser: User;
  onClose: () => void;
  onAddComment: (text: string, stickerUrl?: string, imageUrl?: string) => void;
  onReplyComment: (parentCommentId: string, text: string, stickerUrl?: string, imageUrl?: string) => void;
  onTogglePin?: (commentId: string) => void;
  onReactComment: (commentId: string, reactionType: 'like' | 'love') => void;
  users: User[];
  triggerToast: (msg: string) => void;
}

function CommentsBottomSheet({
  itemId,
  comments,
  currentUser,
  onClose,
  onAddComment,
  onReplyComment,
  onTogglePin,
  onReactComment,
  users,
  triggerToast
}: CommentsBottomSheetProps) {
  const [commentText, setCommentText] = useState('');
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyingToName, setReplyingToName] = useState<string | null>(null);

  // Advanced comment feature states
  const [hiddenCommentIds, setHiddenCommentIds] = useState<string[]>([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [stickerSearch, setStickerSearch] = useState('');
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [longPressedComment, setLongPressedComment] = useState<any | null>(null);
  const [undoCommentId, setUndoCommentId] = useState<string | null>(null);
  
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (undoCommentId) {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
        setUndoCommentId(null);
      }, 5000);
    }
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, [undoCommentId]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !attachedImageUrl) return;

    if (replyingCommentId) {
      onReplyComment(replyingCommentId, commentText, undefined, attachedImageUrl || undefined);
      setReplyingCommentId(null);
      setReplyingToName(null);
    } else {
      onAddComment(commentText, undefined, attachedImageUrl || undefined);
    }
    setCommentText('');
    setAttachedImageUrl(null);
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadMedia(file);
      if (url) {
        setAttachedImageUrl(url);
      }
    } catch (err) {
      console.error("Comment attachment upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyComment = (comment: any) => {
    if (comment.text) {
      navigator.clipboard.writeText(comment.text);
    } else if (comment.stickerUrl) {
      navigator.clipboard.writeText(comment.stickerUrl);
    } else if (comment.imageUrl) {
      navigator.clipboard.writeText(comment.imageUrl);
    }
    // Simple custom alert simulation via CustomEvent
    window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Comment copied!' }));
  };

  const handleReportComment = (commentId: string) => {
    // Dispatch standard report overlay trigger
    window.dispatchEvent(new CustomEvent('open-report-overlay', {
      detail: { postId: itemId, commentId, category: 'Comment' }
    }));
  };

  const [sortOrder, setSortOrder] = useState<'relevant' | 'newest' | 'recently'>('newest');

  const sortedComments = useMemo(() => {
    return [...comments].sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      switch (sortOrder) {
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'recently':
            // Assume recently means recently interacted or similar, for now just newest
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'relevant':
          // Sort by likes/reactions
          const aReactions = Object.keys(a.reactions || {}).length;
          const bReactions = Object.keys(b.reactions || {}).length;
          return bReactions - aReactions;
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
  }, [comments, sortOrder]);

  const quickEmojis = ['❤️', '😂', '🔥', '🙌', '👏', '😮', '😢', '😍'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-end justify-center pointer-events-auto">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative bg-zinc-900 border-t border-zinc-800 rounded-t-3xl w-full max-w-md h-[78vh] flex flex-col z-20 overflow-hidden"
      >
        {/* Header Indicator bar */}
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto my-3 shrink-0" />

        <div className="flex items-center justify-between px-4 pb-3 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-3">
             <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider">
              Comments ({comments.length})
            </h4>
            <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-zinc-800 text-white text-[10px] rounded px-1 py-0.5"
            >
                <option value="relevant">Relevant</option>
                <option value="newest">Newest</option>
                <option value="recently">Recently</option>
            </select>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-750 transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Scroll comments stream area */}
        <div className="flex-grow overflow-y-auto px-4 py-3 space-y-4 text-xs">
          {sortedComments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-12">
              <MessageCircle className="w-12 h-12 opacity-20 mb-2" />
              <p className="font-extrabold text-[11px]">No comments posted. Be the first to share thoughts!</p>
            </div>
          ) : (
            sortedComments.map((comment: any) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                users={users}
                onReply={(id, name) => {
                  setReplyingCommentId(id);
                  setReplyingToName(name);
                }}
                onReact={onReactComment}
                onHide={(id) => {
                  setHiddenCommentIds(prev => [...prev, id]);
                  setUndoCommentId(id);
                  triggerToast("Comment hidden");
                }}
                onUndoHide={(id) => {
                  setHiddenCommentIds(prev => prev.filter(x => x !== id));
                  if (undoCommentId === id) setUndoCommentId(null);
                  triggerToast("Comment restored");
                }}
                onReport={handleReportComment}
                onCopy={handleCopyComment}
                onTogglePin={onTogglePin}
                hiddenCommentIds={hiddenCommentIds}
                onLongPress={(c) => {
                  setLongPressedComment(c);
                }}
              />
            ))
          )}
        </div>

        {/* Active Reply Indicator Header overlay */}
        {replyingCommentId && (
          <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-850 flex items-center justify-between text-[10px] font-black text-zinc-400 shrink-0">
            <div className="flex items-center gap-1">
              <span>Replying to</span>
              <span className="text-emerald-400">@{replyingToName}</span>
            </div>
            <button 
              onClick={() => {
                setReplyingCommentId(null);
                setReplyingToName(null);
              }}
              className="text-zinc-500 hover:text-white transition font-black"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Draft attachment container */}
        {(attachedImageUrl || isUploading) && (
          <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-850 flex items-center gap-3 shrink-0">
            {isUploading ? (
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black">
                <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                <span>Uploading image to Cloudinary...</span>
              </div>
            ) : (
              attachedImageUrl && (
                <div className="relative w-14 h-14 rounded-xl border border-zinc-800 overflow-hidden shadow-lg">
                  <img src={attachedImageUrl} className="w-full h-full object-cover" alt="draft-preview" referrerPolicy="no-referrer" />
                  <button 
                    type="button"
                    onClick={() => setAttachedImageUrl(null)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full hover:bg-black text-white transition active:scale-90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Searchable sticker picker panel */}
        {showStickerPicker && (
          <div className="bg-zinc-950 border-t border-zinc-800 p-4 max-h-[30vh] flex flex-col shrink-0">
            <div className="flex gap-2 mb-3 shrink-0">
              <input
                type="text"
                placeholder="Search stickers (e.g. smile, love, fire)..."
                value={stickerSearch}
                onChange={(e) => setStickerSearch(e.target.value)}
                className="flex-grow px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs outline-none text-white placeholder-zinc-500 focus:ring-1 focus:ring-emerald-500 font-bold"
              />
              <button 
                onClick={() => {
                  setShowStickerPicker(false);
                  setStickerSearch('');
                }}
                className="px-3 bg-zinc-800 hover:bg-zinc-750 text-white rounded-xl text-xs font-black transition cursor-pointer"
              >
                Close
              </button>
            </div>
            
            <div className="grid grid-cols-5 gap-3 overflow-y-auto pr-1 flex-grow scrollbar-none">
              {COMMUNITY_STICKERS.filter(s => 
                !stickerSearch || 
                s.label.toLowerCase().includes(stickerSearch.toLowerCase()) ||
                s.tags.some(t => t.includes(stickerSearch.toLowerCase()))
              ).map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    if (replyingCommentId) {
                      onReplyComment(replyingCommentId, '', s.url);
                      setReplyingCommentId(null);
                      setReplyingToName(null);
                    } else {
                      onAddComment('', s.url);
                    }
                    setShowStickerPicker(false);
                    setStickerSearch('');
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 hover:border-zinc-750 transition cursor-pointer active:scale-90 shrink-0"
                >
                  <img src={s.url} className="w-8 h-8 object-contain" alt={s.label} referrerPolicy="no-referrer" />
                  <span className="text-[8px] text-zinc-500 mt-1 font-black truncate max-w-full">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Emoji hot bar picker */}
        <div className="px-4 py-1.5 bg-zinc-850 flex items-center gap-2 overflow-x-auto border-t border-zinc-800 shrink-0 scrollbar-none">
          {quickEmojis.map(emoji => (
            <button 
              key={emoji}
              onClick={() => setCommentText(prev => prev + emoji)}
              className="text-base hover:scale-125 transition active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Form composer input */}
        <form onSubmit={handleAdd} className="p-4 bg-zinc-950 border-t border-zinc-800 flex gap-2 items-center shrink-0">
          {/* Hidden File input for gallery selection */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />

          {/* Gallery Upload Icon */}
          <button
            type="button"
            onClick={handleGalleryClick}
            disabled={isUploading}
            className="p-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer shrink-0"
            title="Attach Image from Gallery"
          >
            <Image className="w-4.5 h-4.5" />
          </button>

          {/* Stickers Icon */}
          <button
            type="button"
            onClick={() => setShowStickerPicker(!showStickerPicker)}
            className="p-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer shrink-0"
            title="Sticker Keyboard"
          >
            <Smile className="w-4.5 h-4.5" />
          </button>

          <input
            type="text"
            placeholder={replyingCommentId ? "Type reply..." : "Say something nice..."}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-grow px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs outline-none text-white focus:ring-1 focus:ring-emerald-500 transition-all font-bold"
          />
          <button
            type="submit"
            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition cursor-pointer shrink-0 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Comment Long Press Bottom Sheet Menu */}
        <AnimatePresence>
          {longPressedComment && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-end justify-center p-4 animate-fade-in">
              <div className="absolute inset-0" onClick={() => setLongPressedComment(null)} />
              <motion.div 
                initial={{ y: 300 }}
                animate={{ y: 0 }}
                exit={{ y: 300 }}
                className="bg-zinc-950 border border-zinc-800 rounded-t-3xl w-full max-w-md p-6 pb-8 text-left z-20 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3 shrink-0">
                  <div>
                    <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">Comment Options</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[280px]">
                      "{longPressedComment.text || 'Sticker / Media'}"
                    </p>
                  </div>
                  <button onClick={() => setLongPressedComment(null)} className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-750">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      const commentUser = users.find(u => u.id === longPressedComment.userId) || {
                        id: longPressedComment.userId,
                        fullName: longPressedComment.userFullName
                      };
                      setReplyingCommentId(longPressedComment.id);
                      setReplyingToName(commentUser.fullName);
                      setLongPressedComment(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-900 hover:bg-zinc-850 text-white rounded-2xl font-bold text-xs cursor-pointer border border-zinc-800/40"
                  >
                    <MessageSquare className="w-4 h-4 text-zinc-400" /> Reply
                  </button>
                  <button 
                    onClick={() => {
                      const cid = longPressedComment.id;
                      setHiddenCommentIds(prev => [...prev, cid]);
                      setUndoCommentId(cid);
                      setLongPressedComment(null);
                      triggerToast("Comment hidden");
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-900 hover:bg-zinc-850 text-white rounded-2xl font-bold text-xs cursor-pointer border border-zinc-800/40"
                  >
                    <X className="w-4 h-4 text-rose-400" /> Hide Comment
                  </button>
                  <button 
                    onClick={() => {
                      handleReportComment(longPressedComment.id);
                      setLongPressedComment(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-900 hover:bg-zinc-850 text-white rounded-2xl font-bold text-xs cursor-pointer border border-zinc-800/40"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-500" /> Report Comment
                  </button>
                  <button 
                    onClick={() => {
                      handleCopyComment(longPressedComment);
                      setLongPressedComment(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-900 hover:bg-zinc-850 text-white rounded-2xl font-bold text-xs cursor-pointer border border-zinc-800/40"
                  >
                    <Download className="w-4 h-4 text-emerald-400" /> Copy
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Undo Snackbar Overlay */}
        <AnimatePresence>
          {undoCommentId && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-20 left-4 right-4 z-50 bg-zinc-950 border border-zinc-800 text-white font-bold text-xs px-4 py-3 rounded-full shadow-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-zinc-300">
                <X className="w-4 h-4 text-rose-500" />
                <span>Comment hidden</span>
              </div>
              <button 
                onClick={() => {
                  setHiddenCommentIds(prev => prev.filter(id => id !== undoCommentId));
                  setUndoCommentId(null);
                  triggerToast("Comment restored");
                }}
                className="text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider text-[11px] font-black cursor-pointer"
              >
                Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}

// -----------------------------------------------------------------
// Share Overlay Bottom Sheet
// -----------------------------------------------------------------
interface ShareBottomSheetProps {
  videoUrl: string;
  onClose: () => void;
  onAction: (action: string) => void;
}

function ShareBottomSheet({ videoUrl, onClose, onAction }: ShareBottomSheetProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(videoUrl);
    onAction("Copied Link to Clipboard");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Watch RohingyaConnect Video",
          text: "Check out this beautiful educational media from our community!",
          url: videoUrl
        });
        onAction("Shared");
      } catch (e) {
        console.warn("Native share cancelled or failed:", e);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-end justify-center pointer-events-auto">
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        className="bg-zinc-900 border border-zinc-800 rounded-t-3xl w-full max-w-md p-6 pb-8 text-left z-20"
      >
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-sm font-black uppercase text-zinc-400 tracking-wider">Share Video</h4>
          <button onClick={onClose} className="p-1 rounded-full bg-zinc-800 hover:bg-zinc-750">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center text-xs mb-6">
          <button onClick={handleNativeShare} className="flex flex-col items-center gap-2 text-zinc-300 hover:text-white cursor-pointer group">
            <div className="p-3 bg-zinc-800 rounded-2xl group-hover:bg-zinc-700 transition">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span>Send To</span>
          </button>
          
          <button onClick={handleCopy} className="flex flex-col items-center gap-2 text-zinc-300 hover:text-white cursor-pointer group">
            <div className="p-3 bg-zinc-800 rounded-2xl group-hover:bg-zinc-700 transition">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <span>Copy Link</span>
          </button>

          <button onClick={() => onAction("Reposted")} className="flex flex-col items-center gap-2 text-zinc-300 hover:text-white cursor-pointer group">
            <div className="p-3 bg-zinc-800 rounded-2xl group-hover:bg-zinc-700 transition">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <span>Repost</span>
          </button>

          <button onClick={() => window.open(videoUrl, '_blank')} className="flex flex-col items-center gap-2 text-zinc-300 hover:text-white cursor-pointer group">
            <div className="p-3 bg-zinc-800 rounded-2xl group-hover:bg-zinc-700 transition">
              <Download className="w-6 h-6 text-white" />
            </div>
            <span>Download</span>
          </button>
        </div>

        <div className="border-t border-zinc-800/80 pt-5 space-y-3.5">
          <button 
            onClick={() => onAction("Shared to Story")}
            className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-xs text-white transition cursor-pointer"
          >
            <Image className="w-5 h-5" /> Share directly to My Story
          </button>
        </div>
      </motion.div>
    </div>
  );
}
