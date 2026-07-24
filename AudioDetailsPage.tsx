import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, Music, Bookmark, Play, Users, 
  Share2, MoreVertical, BookmarkCheck, Loader2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { 
  collection, query, where, getDocs, doc, 
  setDoc, deleteDoc, onSnapshot, getDoc 
} from 'firebase/firestore';
import { Audio, Post, User, SavedAudio } from '../types';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface AudioDetailsPageProps {
  audio: Audio;
  onClose: () => void;
  currentUser: User;
  users?: User[];
  allVideos: any[]; // Used for quick filtering if needed, but we'll fetch from Firestore for real-time
  triggerToast: (msg: string) => void;
  onUseAudio?: (audio: Audio) => void;
}

export default function AudioDetailsPage({
  audio,
  onClose,
  currentUser,
  users = [],
  allVideos,
  triggerToast,
  onUseAudio
}: AudioDetailsPageProps) {
  const [videosUsingAudio, setVideosUsingAudio] = useState<Post[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if audio is saved
  useEffect(() => {
    const savedAudioRef = doc(db, 'rc_saved_audio', `${currentUser.id}_${audio.id}`);
    const unsub = onSnapshot(savedAudioRef, (docSnap) => {
      setIsSaved(docSnap.exists());
    });
    return () => unsub();
  }, [currentUser.id, audio.id]);

  // Fetch videos using this audio
  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, 'rc_posts'), 
          where('audioId', '==', audio.id)
        );
        const querySnapshot = await getDocs(q);
        const videos: Post[] = [];
        querySnapshot.forEach((doc) => {
          videos.push({ id: doc.id, ...doc.data() } as Post);
        });
        
        // Also check reels (shorts)
        const qReels = query(
          collection(db, 'rc_reels'), 
          where('audioId', '==', audio.id)
        );
        const reelsSnapshot = await getDocs(qReels);
        reelsSnapshot.forEach((doc) => {
          videos.push({ id: doc.id, ...doc.data() } as any);
        });

        setVideosUsingAudio(videos);
      } catch (err) {
        console.error("Error fetching audio videos:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [audio.id]);

  const toggleSaveAudio = async () => {
    try {
      const savedAudioRef = doc(db, 'rc_saved_audio', `${currentUser.id}_${audio.id}`);
      if (isSaved) {
        await deleteDoc(savedAudioRef);
        triggerToast("Removed from Saved Audio");
      } else {
        await setDoc(savedAudioRef, {
          userId: currentUser.id,
          audioId: audio.id,
          title: audio.title,
          artist: audio.artist,
          coverUrl: audio.coverUrl,
          savedAt: new Date().toISOString()
        });
        triggerToast("Audio Saved!");
      }
    } catch (err) {
      console.error("Error toggling save audio:", err);
    }
  };

  const handleUseAudio = () => {
    if (onUseAudio) {
      onUseAudio(audio);
      onClose();
    } else {
      triggerToast("Creating video with this audio...");
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 z-[160] bg-zinc-950 text-white flex flex-col font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-sm font-black uppercase tracking-widest">Audio Details</h2>
        <button className="p-2 hover:bg-white/10 rounded-full transition">
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto pb-32">
        {/* Audio Hero Section */}
        <div className="p-6 flex flex-col items-center text-center bg-gradient-to-b from-zinc-900 to-zinc-950">
          <div className="w-40 h-40 rounded-2xl overflow-hidden shadow-2xl mb-6 border border-white/10 relative group">
            <img src={audio.coverUrl} alt={audio.title} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-12 h-12 text-white fill-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-black mb-1">{audio.title}</h1>
          {(() => {
            const audioCreator = users.find(u => u.id === audio.creatorId || u.fullName === audio.artist);
            const isAudioCreatorVerified = audioCreator?.isVerified || (audioCreator?.invitesCount || 0) >= 5;
            return (
              <p className="text-zinc-400 font-bold text-sm mb-4 flex items-center justify-center gap-1">
                {audio.artist}
                {isAudioCreatorVerified && <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />}
              </p>
            );
          })()}
          
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold mb-8">
            <Users className="w-4 h-4" />
            <span>{videosUsingAudio.length || audio.usageCount} videos used this audio</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full max-w-sm">
            <button 
              onClick={toggleSaveAudio}
              className={`flex-1 py-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                isSaved 
                ? 'bg-zinc-800 text-white border border-zinc-700' 
                : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {isSaved ? 'Saved Audio' : 'Save Audio'}
            </button>
            <button 
              onClick={handleUseAudio}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"
            >
              <Music className="w-4 h-4" /> Use Audio
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="p-4">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider mb-4 px-2">Trending Videos</h3>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-xs font-bold uppercase tracking-widest">Loading Videos...</p>
            </div>
          ) : videosUsingAudio.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-900 rounded-3xl">
              <AlertCircle className="w-12 h-12 opacity-20 mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">No videos found using this audio</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-2">
              {videosUsingAudio.map((video) => (
                <div key={video.id} className="aspect-[9/16] relative bg-zinc-900 rounded-lg overflow-hidden group cursor-pointer">
                  {video.videoUrl ? (
                    <video 
                      src={video.videoUrl} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-black drop-shadow-md">
                    <Play className="w-3 h-3 fill-white" />
                    <span>{Math.floor(Math.random() * 500) + 120}K</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
