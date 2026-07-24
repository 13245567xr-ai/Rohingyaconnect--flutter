import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Reel, User } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import ShortsEditScreen from './ShortsEditScreen';
import VerticalVideoPlayer from './VerticalVideoPlayer';

interface ShortsSectionProps {
  currentUser: User;
  users: User[];
  onViewProfile: (userId: string) => void;
  onFollowToggle: (userId: string) => void;
  onSharePost: (postId: string) => void;
}

export default function ShortsSection({
  currentUser,
  users,
  onViewProfile,
  onFollowToggle,
  onSharePost
}: ShortsSectionProps) {
  const [feedType, setFeedType] = useState<'foryou' | 'following'>('foryou');
  const [showCreator, setShowCreator] = useState(false);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

  // Separate Firestore query for real-time Shorts
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'rc_reels'), (snapshot) => {
      const fetchedReels: Reel[] = [];
      snapshot.forEach((doc) => {
        fetchedReels.push({ id: doc.id, ...doc.data() } as Reel);
      });
      // Sort reels by latest (if no createdAt, fallback to sorting by id or default order)
      fetchedReels.sort((a, b) => {
        const tA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
        const tB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
        return tB - tA;
      });
      setReels(fetchedReels);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error loading reels in ShortsSection:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter reels based on Following vs For You
  const filteredReels = useMemo(() => {
    if (feedType === 'following') {
      return reels.filter(r => currentUser.following?.includes(r.userId));
    }
    return reels;
  }, [reels, feedType, currentUser]);

  // SHORTS EDIT UI FIX START
  const isEditMode = showCreator;
  // SHORTS EDIT UI FIX END

  const handleUpload = async (url: string, caption: string) => {
    try {
      const reelRef = doc(collection(db, 'rc_reels'));
      const newReel: Reel = {
        id: reelRef.id,
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        userAvatar: currentUser.avatar,
        videoUrl: url,
        caption: caption,
        likesCount: 0,
        commentsCount: 0,
        reactions: [],
        comments: [],
        createdAt: new Date().toISOString()
      } as any;

      await setDoc(reelRef, newReel);
      setShowCreator(false);
    } catch (e) {
      console.error("Failed to add short reel:", e);
      alert("Error publishing Short. Please try again.");
    }
  };

  return (
    <div className={`fixed top-0 right-0 bg-black z-[60] overflow-hidden flex flex-col select-none text-white font-sans ${
      isEditMode ? 'left-0 bottom-0' : 'left-0 md:left-64 bottom-16 md:bottom-0'
    }`}>
      
      {/* SHORTS EDIT UI FIX START */}
      {/* Top Feed Tabs */}
      {!isEditMode && (
        <div className="absolute top-0 inset-x-0 z-[110] pt-16 md:pt-6 pb-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-center gap-6 text-sm font-black tracking-wide">
          <button 
            onClick={() => setFeedType('following')} 
            className={`transition duration-150 relative pb-1 ${feedType === 'following' ? 'text-white font-extrabold' : 'text-zinc-400'}`}
          >
            Following
            {feedType === 'following' && (
              <motion.div layoutId="shortsUnderline" className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setFeedType('foryou')} 
            className={`transition duration-150 relative pb-1 ${feedType === 'foryou' ? 'text-white font-extrabold' : 'text-zinc-400'}`}
          >
            For You
            {feedType === 'foryou' && (
              <motion.div layoutId="shortsUnderline" className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
        </div>
      )}
      {/* SHORTS EDIT UI FIX END */}

      {/* Core Player Frame */}
      <div className="w-full h-full relative">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs font-bold text-zinc-400 tracking-wider">Loading Shorts...</p>
          </div>
        ) : filteredReels.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 bg-zinc-950">
            <Play className="w-12 h-12 opacity-30 animate-pulse" />
            <p className="text-xs font-bold tracking-wide">No Shorts found in {feedType === 'following' ? 'Following' : 'For You'}</p>
          </div>
        ) : (
          <VerticalVideoPlayer
            videoPool={filteredReels}
            currentUser={currentUser}
            users={users}
            isOverlay={false}
            onViewProfile={onViewProfile}
            onFollowToggle={onFollowToggle}
            onSharePost={onSharePost}
            onAddShort={isEditMode ? undefined : () => setShowCreator(true)}
            onUseAudio={(audio) => {
              // Pre-fill caption or handle as needed for Shorts
              setShowCreator(true);
            }}
          />
        )}
      </div>

      {/* Shorts Creator Upload Form overlay */}
      <AnimatePresence>
        {showCreator && (
          <ShortsEditScreen onClose={() => setShowCreator(false)} onUpload={handleUpload} />
        )}
      </AnimatePresence>
      
    </div>
  );
}
