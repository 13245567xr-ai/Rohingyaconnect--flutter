import React, { useState, useEffect, useRef } from 'react';
import { db, uploadMedia } from '../firebase';
import { addStoryToFirestore } from '../utils/firebaseSync';
import { collection, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, doc, updateDoc, arrayUnion, addDoc } from 'firebase/firestore';
import { User, Story } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, ThumbsUp, Smile, Frown, Angry, MessageCircle, 
  MoreVertical, Link2, VolumeX, Volume2, Plus, X, Eye, User as UserIcon, Trash2 
} from 'lucide-react';
import { BlueVerifiedTick } from './BlueVerifiedTick';
import { deleteDoc } from 'firebase/firestore';

type Reaction = 'like' | 'love' | 'wow' | 'sad' | 'angry';

const reactions = [
  { type: 'like' as Reaction, emoji: '👍' },
  { type: 'love' as Reaction, emoji: '❤️' },
  { type: 'wow' as Reaction, emoji: '😲' },
  { type: 'sad' as Reaction, emoji: '😢' },
  { type: 'angry' as Reaction, emoji: '😡' },
];

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  currentUser: User;
  onClose: () => void;
}

export function StoryViewer({ stories, initialIndex, currentUser, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  
  const [showMenu, setShowMenu] = useState(false);
  const [showMuteMenu, setShowMuteMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [userReaction, setUserReaction] = useState<Reaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [flyingEmojis, setFlyingEmojis] = useState<{ id: number; emoji: string; left: number }[]>([]);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    // Mark as viewed
    if (currentStory && (!currentStory.viewers || !currentStory.viewers.includes(currentUser.id))) {
      updateDoc(doc(db, 'rc_stories', currentStory.id), {
        viewers: arrayUnion(currentUser.id)
      }).catch(console.error);
    }
  }, [currentIndex, currentStory, currentUser.id]);

  useEffect(() => {
    setProgress(0);
    const duration = currentStory?.mediaType === 'video' ? 10000 : 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev + step >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, currentStory]);

  useEffect(() => {
    if (progress >= 100) {
      handleNext();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. SEND REACTION
  const handleReaction = async (type: Reaction) => {
    setUserReaction(type);
    
    // Find emoji for this reaction
    const reactionObj = reactions.find(r => r.type === type);
    if (reactionObj) {
      const newEmojiId = Date.now() + Math.random();
      setFlyingEmojis(prev => [...prev, { id: newEmojiId, emoji: reactionObj.emoji, left: Math.random() * 40 + 30 }]);
      setTimeout(() => {
        setFlyingEmojis(prev => prev.filter(e => e.id !== newEmojiId));
      }, 2000);
    }

    showToast('Reaction sent');
    await addDoc(collection(db, 'rc_story_reactions'), {
      storyId: currentStory.id,
      userId: currentUser.id,
      reaction: type,
      createdAt: serverTimestamp()
    });
  };

  // 2. OPEN CHAT
  const openChat = () => {
    window.location.href = `/chat/${currentStory.userId}`;
    onClose();
  };

  // 3. COPY LINK / SHARE
  const shareStory = async () => {
    const url = `${window.location.origin}/story/${currentStory.id}`;
    if (navigator.share) {
      await navigator.share({
        title: `${currentStory.userName || currentStory.userFullName}'s Story`,
        text: `Check out this story on RohingyaConnect`,
        url: url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard');
    }
    setShowMenu(false);
  };

  // 4. MUTE USER
  const handleMute = async (duration: '24h' | '7d' | 'forever') => {
    await addDoc(collection(db, 'rc_muted_stories'), {
      userId: currentUser.id,
      mutedUserId: currentStory.userId,
      duration,
      createdAt: serverTimestamp()
    });
    setIsMuted(true);
    setShowMuteMenu(false);
    setShowMenu(false);
    showToast('Story muted');
    handleNext();
  };

  // 5. REPORT
  const handleReport = () => {
    window.location.href = `/report?targetID=${currentStory.id}&type=story`;
    setShowMenu(false);
  };

  // 6. ADD TO STORY FROM GALLERY
  const addToStory = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const mediaUrl = await uploadMedia(file, 'stories');
        if (!mediaUrl) throw new Error("Upload failed");
        const mediaType = file.type.startsWith('video') ? 'video' : 'image';
        await addStoryToFirestore({
          userId: currentUser.id,
          userFullName: currentUser.fullName || currentUser.username || 'User',
          userAvatar: currentUser.avatar || 'https://via.placeholder.com/150',
          mediaUrl,
          mediaType,
          createdAt: new Date().toISOString(),
          status: 'active'
        });
        showToast('Story added successfully!');
      } catch (err) {
        showToast('Failed to add story.');
      }
    };
    input.click();
    setShowMenu(false);
  };

  if (!currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      >
        <div className="relative w-full max-w-md h-screen bg-black overflow-hidden flex flex-col justify-center" onClick={(e) => {
            // Close menus when clicking outside
            if (showMenu) setShowMenu(false);
            if (showMuteMenu) setShowMuteMenu(false);
        }}>
          
          {/* Progress Bars */}
          <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
            {stories.map((s, idx) => (
              <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-75 ease-linear"
                  style={{ 
                    width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
                  }}
                />
              </div>
            ))}
          </div>

          {/* TOP BAR */}
          <div className="absolute top-8 left-0 right-0 px-4 py-2 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center gap-3">
              <img src={currentStory.userAvatar} className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" alt="avatar" />
              <div>
                <p className="text-white font-semibold text-sm drop-shadow-md">{currentStory.userName || currentStory.userFullName}</p>
                <p className="text-white/80 text-xs font-medium drop-shadow-md">
                  {currentStory.createdAt && (currentStory.createdAt as any).toMillis 
                    ? new Date((currentStory.createdAt as any).toMillis()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                    : 'Just now'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); setShowMenu(true); }} className="p-2 bg-black/40 hover:bg-black/60 transition rounded-full">
                <MoreVertical className="w-5 h-5 text-white" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 bg-black/40 hover:bg-black/60 transition rounded-full">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Media */}
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            {currentStory.mediaType === 'video' ? (
              <video src={currentStory.mediaUrl} autoPlay playsInline className="w-full h-full object-contain" />
            ) : (
              <img src={currentStory.mediaUrl || currentStory.image} className="w-full h-full object-contain" alt="story" />
            )}

            {/* Tap zones for Next/Prev */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
            <div className="absolute inset-y-0 right-0 w-2/3 z-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
          </div>

          {/* Viewers list for owner */}
          {currentStory.userId === currentUser.id && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white text-xs bg-black/60 px-4 py-2 rounded-full z-10 backdrop-blur-md flex items-center gap-2">
              <Eye size={16} /> {currentStory.viewers?.length || 0} viewers
            </div>
          )}

          {/* FLYING EMOJIS */}
          <AnimatePresence>
            {flyingEmojis.map((emojiObj) => (
              <motion.div
                key={emojiObj.id}
                initial={{ opacity: 1, y: 0, scale: 0.5 }}
                animate={{ opacity: 0, y: -200, scale: 2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute bottom-24 text-4xl pointer-events-none z-40 drop-shadow-lg"
                style={{ left: `${emojiObj.left}%` }}
              >
                {emojiObj.emoji}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* BOTTOM BAR: REACTIONS + CHAT */}
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-between px-4 z-10">
              {/* REACTIONS */}
              <div className="flex items-center justify-around gap-2 bg-black/60 rounded-full px-4 py-2.5 backdrop-blur-md border border-white/10 shadow-lg">
                {reactions.map(({ type, emoji }) => (
                  <button key={type} onClick={(e) => { e.stopPropagation(); handleReaction(type); }} className={`text-2xl hover:scale-125 active:scale-90 transition-transform ${userReaction === type ? 'scale-125 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'opacity-90 hover:opacity-100'}`}>
                    {emoji}
                  </button>
                ))}
              </div>

              {/* CHAT ICON */}
              <button onClick={(e) => { e.stopPropagation(); openChat(); }} className="flex-1 max-w-[180px] ml-4 flex items-center justify-between px-4 py-2 bg-black/60 hover:bg-black/80 border border-white/20 transition-colors rounded-full backdrop-blur-md shadow-lg text-white/80 text-sm">
                <span className="truncate">Send message...</span>
                <MessageCircle className="w-5 h-5 text-white ml-2 flex-shrink-0" />
              </button>
            </div>

          {/* 3DOT MENU */}
          <AnimatePresence>
          {showMenu && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute top-20 right-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-2 w-56 z-50 border border-slate-100 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={handleReport} className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition rounded-xl font-medium text-sm text-slate-800 dark:text-slate-200">
                Report this story
              </button>
              <button onClick={shareStory} className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition rounded-xl flex items-center gap-3 font-medium text-sm text-slate-800 dark:text-slate-200">
                <Link2 className="w-4 h-4" /> Copy story link
              </button>
              <button onClick={() => { setShowMenu(false); setShowMuteMenu(true); }} className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition rounded-xl flex items-center gap-3 font-medium text-sm text-slate-800 dark:text-slate-200">
                {isMuted ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
                Mute
              </button>
              <button onClick={addToStory} className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition rounded-xl flex items-center gap-3 font-semibold text-sm text-[#1877F2] border-t border-slate-100 dark:border-slate-700 mt-1">
                <Plus className="w-4 h-4" /> Add to Story
              </button>
            </motion.div>
          )}
          </AnimatePresence>

          {/* MUTE SUB MENU */}
          <AnimatePresence>
          {showMuteMenu && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-20 right-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-4 w-64 z-50 border border-slate-100 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-2 py-1 font-bold text-slate-900 dark:text-slate-100 mb-2">Mute {currentStory.userName || 'User'}'s Story</p>
              <button onClick={() => handleMute('24h')} className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition rounded-xl font-medium text-sm text-slate-700 dark:text-slate-300">For 24 hours</button>
              <button onClick={() => handleMute('7d')} className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition rounded-xl font-medium text-sm text-slate-700 dark:text-slate-300">For a week</button>
              <button onClick={() => handleMute('forever')} className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition rounded-xl font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">Until I unmute it</button>
              
              <div className="flex gap-3 mt-1 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => setShowMuteMenu(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition text-slate-800 dark:text-slate-200 font-bold rounded-xl text-sm">Cancel</button>
                <button onClick={() => handleMute('24h')} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 transition text-white font-bold rounded-xl text-sm shadow-md">Mute</button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Toast Message */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-5 py-3 rounded-full text-sm font-semibold shadow-2xl z-50 backdrop-blur-md"
              >
                {toastMessage}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export interface StoryCircleProps {
  story: Story;
  currentUser: User;
  onClick: () => void;
  onLongPress?: (story: Story) => void;
}

export function StoryCircle({ story, currentUser, onClick, onLongPress }: StoryCircleProps) {
  const isViewed = story.viewers?.includes(currentUser.id);
  const longPressTimerRef = useRef<any>(null);
  const isLongPressActiveRef = useRef<boolean>(false);

  const handleTouchStart = () => {
    isLongPressActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      if (onLongPress) onLongPress(story);
      if (navigator.vibrate) navigator.vibrate(60);
    }, 1500); // 1.5 seconds
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressActiveRef.current) return;
    onClick();
  };
  
  return (
    <div 
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className="w-24 h-40 flex-shrink-0 rounded-xl relative cursor-pointer overflow-hidden group shadow-sm bg-black border border-neutral-200/50"
    >
      
      <img 
        src={story.mediaUrl} 
        className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition duration-300" 
        alt="story" 
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent h-1/2" />
      <img 
        src={story.userAvatar} 
        className={`w-8 h-8 rounded-full absolute top-2 left-2 border-2 object-cover shadow-md ${isViewed ? 'border-neutral-400' : 'border-[#1877F2]'}`}
        referrerPolicy="no-referrer"
        alt="Avatar"
      />
      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold truncate max-w-[85%] drop-shadow-md">
        <span>{story.userName || story.userFullName}</span>
        {(story.isVerified || story.user?.isVerified || (story.user?.invitesCount || 0) >= 5) && <BlueVerifiedTick className="w-3 h-3" />}
      </div>
    </div>
  );
}

export default function StoryBar({ currentUser, stories = [], onViewProfile }: { currentUser: User, stories?: Story[], onViewProfile?: (userId: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [selectedLongPressStory, setSelectedLongPressStory] = useState<Story | null>(null);

  const handleCreateStoryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Convert FileList to an array of objects that StoryEditScreen expects
    const assets = Array.from(files).map(file => ({
      uri: URL.createObjectURL(file),
      file: file,
      type: file.type.startsWith('video') ? 'video' : 'image'
    }));

    // Trigger navigation to StoryEditScreen
    (window as any)._navigate('StoryEditScreen', { images: assets });
    
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteStory = async () => {
    if (!selectedLongPressStory) return;
    try {
      await deleteDoc(doc(db, 'rc_stories', selectedLongPressStory.id));
      // No Cloudinary delete logic provided in existing firebaseSync, so Firestore delete is sufficient
      setSelectedLongPressStory(null);
    } catch (err) {
      console.error("Error deleting story:", err);
    }
  };

  const handleViewProfile = () => {
    if (!selectedLongPressStory) return;
    if (onViewProfile) {
      onViewProfile(selectedLongPressStory.userId);
    } else {
      window.location.href = `/profile/${selectedLongPressStory.userId}`;
    }
    setSelectedLongPressStory(null);
  };

  return (
    <>
      <div className="story-bar flex overflow-x-auto gap-3 p-4 bg-neutral-50 border-b border-neutral-200 scrollbar-none">
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*,video/*" 
          className="hidden" 
          onChange={handleFileChange} 
        />
        
        <div 
          onClick={handleCreateStoryClick}
          className={`story-item add-story w-24 h-40 flex-shrink-0 rounded-xl relative cursor-pointer overflow-hidden bg-[#E4E6EB] border border-neutral-200/50 ${isUploading ? 'opacity-50' : 'hover:scale-105 group'} transition duration-300 shadow-sm`}
        >
           {isUploading ? (
             <div className="flex items-center justify-center h-full">
               <span className="text-xs font-bold text-slate-500">Uploading...</span>
             </div>
           ) : (
             <>
               <img src={currentUser.avatar} className="w-full h-full object-cover brightness-90 group-hover:scale-105 transition duration-300" alt="My avatar"/>
               <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent h-1/2" />
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1877F2] rounded-full p-1.5 border-2 border-white shadow-md">
                 <Plus size={16} color="white"/>
               </div>
               <p className="absolute bottom-1 w-full text-center text-[10px] font-bold text-white uppercase tracking-wider">CREATE STORY</p>
             </>
           )}
        </div>

        {stories.map((story, index) => (
          <StoryCircle 
            key={story.id} 
            story={story} 
            currentUser={currentUser}
            onClick={() => setViewerIndex(index)}
            onLongPress={(s) => setSelectedLongPressStory(s)}
          />
        ))}
      </div>

      {viewerIndex !== null && (
        <StoryViewer 
          stories={stories}
          initialIndex={viewerIndex}
          currentUser={currentUser}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {/* Story Long Press Modal */}
      {selectedLongPressStory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:p-4 animate-in fade-in">
          <div 
            className="absolute inset-0"
            onClick={() => setSelectedLongPressStory(null)}
          />
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl relative z-10 animate-in slide-in-from-bottom flex flex-col overflow-hidden">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1.5 bg-neutral-300 dark:bg-slate-700 rounded-full" />
            </div>
            
            <div className="p-4 border-b border-neutral-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-center">Manage Story</h3>
            </div>
            
            <div className="p-2 space-y-1">
              <button 
                onClick={handleViewProfile}
                className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-xl transition font-medium text-slate-800 dark:text-slate-200"
              >
                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <UserIcon size={20} className="text-neutral-700 dark:text-neutral-300" />
                </div>
                <div className="text-left flex-1">
                  <h4 className="font-semibold">View Profile</h4>
                </div>
              </button>
              
              {selectedLongPressStory.userId === currentUser.id && (
                <button 
                  onClick={handleDeleteStory}
                  className="w-full flex items-center gap-3 p-3 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition font-medium text-rose-600"
                >
                  <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                    <Trash2 size={20} className="text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-semibold">Delete Story</h4>
                  </div>
                </button>
              )}

              <button 
                onClick={() => setSelectedLongPressStory(null)}
                className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-xl transition font-medium text-slate-800 dark:text-slate-200"
              >
                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <X size={20} className="text-neutral-700 dark:text-neutral-300" />
                </div>
                <div className="text-left flex-1">
                  <h4 className="font-semibold">Cancel</h4>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
