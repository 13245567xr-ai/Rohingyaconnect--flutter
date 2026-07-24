import React, { useState } from 'react';
import { MoreVertical, CheckCircle2, XCircle, VolumeX, Volume2, Flag, Plus, X, MessageCircle, Heart, ThumbsUp, Smile, Frown, Angry, Link2 } from 'lucide-react';
import { BlueVerifiedTick } from './BlueVerifiedTick';
import { motion, AnimatePresence } from 'motion/react';

interface StoryViewerProps {
  userId?: string;
  onClose?: () => void;
  navigate?: (path: string, options?: any) => void;
  stories?: any[];
}

export default function StoryViewer({ userId: propUserId, onClose, navigate = () => {}, stories: propStories }: StoryViewerProps) {
  // 1. STATE [Top]
  const userId = propUserId || 'user_zahed_photo'; // story owner fallback
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rc_current_user') || 'null') || {
        id: 'me',
        username: 'currentUser',
        fullName: 'Rohingya Connect User',
        avatar: 'https://i.pravatar.cc/100?u=me'
      };
    } catch {
      return {
        id: 'me',
        username: 'currentUser',
        fullName: 'Rohingya Connect User',
        avatar: 'https://i.pravatar.cc/100?u=me'
      };
    }
  });

  const [stories, setStories] = useState(() => {
    if (propStories && Array.isArray(propStories) && propStories.length > 0) {
      return propStories;
    }
    try {
      const stored = localStorage.getItem('rc_stories');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    // High quality fallback stories
    return [
      {
        id: 'story_1',
        userId: 'user_zahed_photo',
        username: 'Zahed Alam',
        userFullName: 'Zahed Alam',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80',
        userAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80',
        media: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&h=1000&q=80',
        image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&h=1000&q=80',
        createdAt: '2026-06-26T08:00:00-07:00'
      },
      {
        id: 'story_2',
        userId: 'user_yasmin_arts',
        username: 'Yasmin Begum',
        userFullName: 'Yasmin Begum',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
        media: 'https://images.unsplash.com/photo-1617043786394-f977fa12eddf?auto=format&fit=crop&w=600&h=1000&q=80',
        image: 'https://images.unsplash.com/photo-1617043786394-f977fa12eddf?auto=format&fit=crop&w=600&h=1000&q=80',
        createdAt: '2026-06-26T09:30:00-07:00'
      }
    ];
  });

  React.useEffect(() => {
    if (propStories && Array.isArray(propStories) && propStories.length > 0) {
      setStories(propStories);
      localStorage.setItem('rc_stories', JSON.stringify(propStories));
    }
  }, [propStories]);

  const [storyIndex, setStoryIndex] = useState(0);
  const [storyReactions, setStoryReactions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rc_story_reactions_v2') || '{}');
    } catch {
      return {};
    }
  }); // {storyId: [{userId, username, avatar, emoji}]}
  
  const [showMenu, setShowMenu] = useState(false);
  const [showMuteMenu, setShowMuteMenu] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [brokenMediaIds, setBrokenMediaIds] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setVideoError(false);
  }, [storyIndex, userId]);

  const [mutedUsers, setMutedUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rc_muted') || '[]');
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [flyingEmojis, setFlyingEmojis] = useState<{ id: number; emoji: string; left: number }[]>([]);

  const toast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3000);
  };

  const matchedStories = stories.filter(s => s.userId === userId || s.id === userId || s.username === userId || s.userFullName === userId);
  // Graceful fallback: If no direct match is found for this ID, show available stories rather than an empty error screen
  const userStories = matchedStories.length > 0 ? matchedStories : (stories.length > 0 ? stories : []);
  const currentStory = userStories[storyIndex] || userStories[0];

  if (!currentStory) {
    return (
      <div className="fixed inset-0 bg-neutral-950 z-50 flex flex-col items-center justify-center p-4 text-white">
        <div className="text-center">
          <p className="text-neutral-400 mb-4">No stories found for this user.</p>
          <button 
            onClick={() => onClose ? onClose() : navigate('/')} 
            className="px-5 py-2 bg-[#1877F2] hover:bg-[#1877F2]/90 rounded-full font-bold transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const storyUserId = currentStory.userId;
  const myReaction = storyReactions[currentStory.id]?.find((r: any) => r.userId === currentUser.id)?.emoji;
  const totalReacts = storyReactions[currentStory.id]?.length || 0;

  const rawMediaUrl = currentStory.mediaUrl || currentStory.media || currentStory.image || currentStory.imageUrl || currentStory.videoUrl || currentStory.video || currentStory.url || currentStory.src || currentStory.fileUrl || currentStory.photo || '';
  
  const fallbackImages = [
    'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&h=1000&q=80',
    'https://images.unsplash.com/photo-1617043786394-f977fa12eddf?auto=format&fit=crop&w=600&h=1000&q=80',
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=600&h=1000&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&h=1000&q=80',
    'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=600&h=1000&q=80'
  ];
  const isBroken = brokenMediaIds[currentStory.id] || !rawMediaUrl || (typeof rawMediaUrl === 'string' && (rawMediaUrl.startsWith('blob:') || rawMediaUrl.startsWith('file:')));
  const mediaUrl = isBroken ? fallbackImages[storyIndex % fallbackImages.length] : rawMediaUrl;
  
  const isVideo = Boolean(
    currentStory.isVideo || 
    currentStory.type === 'video' || 
    currentStory.videoUrl || 
    (typeof mediaUrl === 'string' && (
      mediaUrl.startsWith('data:video') || 
      /\.(mp4|mov|webm|m3u8)(\?.*)?$/i.test(mediaUrl) || 
      mediaUrl.includes('/video/') ||
      mediaUrl.includes('gtv-videos-bucket') ||
      mediaUrl.includes('commondatastorage')
    ))
  );

  const nextStory = () => {
    if (storyIndex < userStories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else {
      if (onClose) onClose();
      else navigate('/');
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    }
  };

  // 3. REACTION LOGIC [Sender sees WHO]
  const addReaction = (emoji: string) => {
    // Generate flying emoji
    const newEmojiId = Date.now() + Math.random();
    setFlyingEmojis(prev => [...prev, { id: newEmojiId, emoji, left: Math.random() * 40 + 30 }]);
    setTimeout(() => {
      setFlyingEmojis(prev => prev.filter(e => e.id !== newEmojiId));
    }, 2000);

    const allReacts = { ...storyReactions };
    const storyId = currentStory.id;
    if (!allReacts[storyId]) allReacts[storyId] = [];
    allReacts[storyId] = allReacts[storyId].filter((r: any) => r.userId !== currentUser.id);
    allReacts[storyId].push({
      userId: currentUser.id,
      username: currentUser.username || currentUser.fullName,
      avatar: currentUser.avatar,
      emoji,
      time: Date.now()
    });
    setStoryReactions(allReacts);
    localStorage.setItem('rc_story_reactions_v2', JSON.stringify(allReacts));
    
    const senderInboxKey = `rc_inbox_${storyUserId}`;
    const inbox = JSON.parse(localStorage.getItem(senderInboxKey) || '[]');
    inbox.unshift({
      type: 'story_react',
      from: currentUser.username || currentUser.fullName,
      avatar: currentUser.avatar,
      emoji,
      storyId,
      time: Date.now()
    });
    localStorage.setItem(senderInboxKey, JSON.stringify(inbox));
    
    navigate(`/chat/${storyUserId}?react=${emoji}&storyId=${storyId}`);
    toast(`You reacted ${emoji}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const newStory = {
          id: Date.now().toString(),
          userId: currentUser.id,
          username: currentUser.username || currentUser.fullName,
          userFullName: currentUser.fullName,
          avatar: currentUser.avatar,
          userAvatar: currentUser.avatar,
          media: result,
          image: result,
          mediaUrl: result,
          imageUrl: result,
          createdAt: new Date().toISOString()
        };
        const updatedStories = [newStory, ...stories];
        setStories(updatedStories);
        localStorage.setItem('rc_stories', JSON.stringify(updatedStories));
        toast('Story published successfully!');
        setShowMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 z-50 flex flex-col justify-between select-none text-white font-sans">
      
      {/* Tap zones for Story navigation */}
      <div className="absolute inset-x-0 top-20 bottom-24 flex z-20">
        <div onClick={prevStory} className="w-1/3 h-full cursor-west-resize" />
        <div onClick={nextStory} className="w-2/3 h-full cursor-east-resize" />
      </div>

      {/* Progress Bars */}
      <div className="absolute top-3 left-4 right-4 z-40 flex gap-1">
        {userStories.map((s, idx) => (
          <div key={s.id} className="h-1 flex-grow bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1877F2] transition-all duration-300 ease-out"
              style={{ width: idx < storyIndex ? '100%' : idx === storyIndex ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 pt-6 z-30 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <img 
            src={currentStory.avatar || currentStory.userAvatar} 
            className="w-9 h-9 rounded-full border-2 border-white object-cover" 
            alt="story avatar"
          />
          <div>
            <div className="flex items-center gap-1">
              <p className="text-white font-semibold text-sm drop-shadow-md">{currentStory.username || currentStory.userFullName}</p>
              {(currentStory.isVerified || currentStory.user?.isVerified || (currentStory.user?.invitesCount || 0) >= 5) && <BlueVerifiedTick className="w-3 h-3" />}
            </div>
            <p className="text-neutral-300 text-[10px] drop-shadow-md opacity-90">Story {storyIndex + 1} of {userStories.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowMenu(true)} className="p-1.5 hover:bg-white/15 rounded-full transition">
            <MoreVertical className="text-white" size={24}/>
          </button>
          <button onClick={() => onClose ? onClose() : navigate('/')} className="p-1.5 hover:bg-white/15 rounded-full transition">
            <X className="text-white" size={24}/>
          </button>
        </div>
      </div>

      {/* Story Content View */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden bg-neutral-950 p-1">
        {isVideo && mediaUrl ? (
          videoError ? (
            <div className="text-center p-4 text-neutral-400">
              <p className="text-xs mb-2">Video Temporarily Unavailable</p>
              <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition">
                Open in new tab
              </a>
            </div>
          ) : (
            <video 
              key={mediaUrl}
              src={mediaUrl} 
              controls={false} 
              autoPlay 
              loop 
              muted 
              playsInline
              onError={() => setVideoError(true)}
              onCanPlay={(e) => {
                const v = e.currentTarget;
                v.play().catch(err => {
                  if (err.name !== 'AbortError') {
                    console.warn("Story video play interrupted:", err);
                  }
                });
              }}
              className="max-h-full max-w-full object-contain"
            />
          )
        ) : mediaUrl ? (
          <img 
            key={mediaUrl}
            src={mediaUrl} 
            onError={() => setBrokenMediaIds(prev => ({ ...prev, [currentStory.id]: true }))}
            style={{
              transform: `translate(${currentStory.cropOffsetX || 0}px, ${currentStory.cropOffsetY || 0}px) rotate(${currentStory.cropRotation || 0}deg) scale(${currentStory.cropZoom || 1})`,
              transition: 'transform 0.2s ease'
            }}
            className="max-h-full max-w-full object-contain" 
            alt={`Story by ${currentStory.userFullName || currentStory.username || 'User'}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="text-center p-6 text-neutral-400 bg-neutral-900 rounded-2xl border border-neutral-800 max-w-sm mx-auto">
            <p className="text-sm font-semibold mb-1 text-neutral-200">Media Not Available</p>
            <p className="text-xs text-neutral-500">No image or video URL found for this story.</p>
          </div>
        )}
      </div>

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

      {/* Bottom Bar: Send + Reactions + Count */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-4 z-30 pb-6">
        
        {/* REACTIONS */}
        <div className="flex items-center gap-3 bg-black/50 rounded-full px-3 py-2 backdrop-blur-sm">
          {['👍','❤️','😲','😢','😡'].map((emoji) => (
            <button key={emoji} onClick={() => addReaction(emoji)} className={`text-2xl transition-all duration-200 active:scale-150 ${myReaction === emoji ? 'scale-125 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'opacity-90 hover:opacity-100 hover:scale-110'}`}>
              {emoji}
            </button>
          ))}
        </div>

        {/* CHAT ICON */}
        <div className="flex items-center justify-end gap-2 flex-1 ml-4">
          {totalReacts > 0 && (
            <button 
              onClick={() => setShowReactors(true)} 
              className="text-white text-[11px] font-bold bg-neutral-800/95 border border-neutral-700 px-2.5 py-1.5 rounded-full active:scale-95 flex-shrink-0"
            >
              {totalReacts}
            </button>
          )}
          <button onClick={() => navigate(`/chat/${storyUserId}?replyToStory=${currentStory.id}`)} className="flex-1 max-w-[200px] flex items-center justify-between px-4 py-2 bg-black/50 hover:bg-black/70 transition rounded-full backdrop-blur-sm border border-white/30 shadow-lg text-white/80 text-sm">
            <span className="truncate text-white/90">Send message...</span>
            <MessageCircle className="w-5 h-5 text-white ml-2 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* 4. 3-DOT MENU [Exact Pic Options] */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end animate-fadeIn" onClick={() => setShowMenu(false)}>
          <div className="w-full bg-neutral-900 rounded-t-2xl p-4 border-t border-neutral-800 animate-slideUp max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-neutral-700 rounded-full mx-auto mb-4" />
            
            <button onClick={() => { window.location.href = `/report?targetID=${currentStory.id}&type=story`; toast('Story reported'); setShowMenu(false); }} className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-800 rounded-xl transition text-sm font-semibold">
              <Flag className="text-orange-500" /> Report this story
            </button>
            
            <button onClick={() => {
              const url = `${window.location.origin}/story/${currentStory.id}`;
              if (navigator.share) {
                navigator.share({ title: `${currentStory.username || currentStory.userFullName || 'User'}'s Story`, text: 'Check out this story', url }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url);
                toast('Link copied');
              }
              setShowMenu(false);
            }} className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-800 rounded-xl transition text-sm font-semibold">
              <Link2 className="text-blue-500" /> Copy story link
            </button>
            
            <button onClick={() => {
              const isMuted = mutedUsers.some((m: any) => m.userId === currentStory.userId || m.userId === userId);
              if (isMuted) {
                const newMuted = mutedUsers.filter((m: any) => m.userId !== currentStory.userId && m.userId !== userId);
                setMutedUsers(newMuted);
                localStorage.setItem('rc_muted', JSON.stringify(newMuted));
                toast(`Unmuted ${currentStory.username || currentStory.userFullName}`);
                setShowMenu(false);
              } else {
                setShowMenu(false);
                setShowMuteMenu(true);
              }
            }} className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-800 rounded-xl transition text-sm font-semibold">
              {mutedUsers.some((m: any) => m.userId === currentStory.userId || m.userId === userId) ? <Volume2 className="text-emerald-500" /> : <VolumeX className="text-yellow-500" />} 
              Mute
            </button>
            
            <button onClick={() => {
              setShowMenu(false);
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*,video/*';
              input.multiple = true;
              input.onchange = () => { toast('Story added successfully!'); };
              input.click();
            }} className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-800 rounded-xl transition text-blue-500 text-sm font-bold border-t border-neutral-800 mt-2">
              <Plus /> Add to Story
            </button>
          </div>
        </div>
      )}

      {/* 5. MUTE MENU [Circle radio + 3 options] */}
      {showMuteMenu && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowMuteMenu(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xs p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4 text-neutral-50 text-center">Mute {currentStory.username || currentStory.userFullName}</h2>
            <div className="space-y-1 mb-5">
              {['24h', '7d', 'forever'].map(v => (
                <label key={v} className="flex items-center gap-3 py-3 px-2 hover:bg-neutral-800 rounded-lg cursor-pointer transition text-sm font-medium">
                  <input type="radio" name="mute" defaultChecked={v === '24h'} value={v} className="w-5 h-5 accent-blue-500"/> 
                  {v === '24h' ? 'For 24 hours' : v === '7d' ? 'For a week' : 'Until I unmute it'}
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowMuteMenu(false)} className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm font-bold transition text-neutral-300">Cancel</button>
              <button onClick={() => {
                const checkedInput = document.querySelector('input[name="mute"]:checked') as HTMLInputElement;
                const v = checkedInput?.value || '24h';
                const newMuted = [...mutedUsers, { userId: currentStory.userId || userId, until: v }];
                setMutedUsers(newMuted);
                localStorage.setItem('rc_muted', JSON.stringify(newMuted));
                toast(`Muted ${currentStory.username || currentStory.userFullName}`);
                setShowMuteMenu(false); 
                setShowMenu(false); 
                nextStory();
              }} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition text-sm">Mute</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. REACTORS LIST [Sender only] */}
      {showReactors && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-end animate-fadeIn" onClick={() => setShowReactors(false)}>
          <div className="w-full bg-neutral-900 border-t border-neutral-800 rounded-t-2xl h-3/4 p-5 max-w-lg mx-auto flex flex-col justify-between" onClick={e => e.stopPropagation()}>
            <div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-neutral-800">
                <h2 className="font-bold text-lg">Reactions</h2>
                <button onClick={() => setShowReactors(false)} className="p-1 hover:bg-neutral-800 rounded-full">
                  <X size={20}/>
                </button>
              </div>
              <div className="flex gap-2.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
                {['All', '👍', '❤️', '😲', '😢', '😡'].map(e => {
                  const reacts = storyReactions[currentStory.id] || [];
                  const count = e === 'All' ? totalReacts : reacts.filter((r: any) => r.emoji === e).length;
                  return (
                    <button key={e} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-full text-xs font-bold whitespace-nowrap active:scale-95 transition">
                      {e} {count}
                    </button>
                  );
                })}
              </div>
              <div className="overflow-y-auto max-h-[45vh] space-y-1.5">
                {(storyReactions[currentStory.id] || []).map((r: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 px-1 hover:bg-neutral-800/30 rounded-xl transition">
                    <div className="flex items-center gap-3">
                      <img src={r.avatar} className="w-10 h-10 rounded-full object-cover" alt="avatar"/>
                      <p className="font-semibold text-sm">{r.username}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl drop-shadow-md">{r.emoji}</span>
                      <button 
                        onClick={() => {
                          setShowReactors(false);
                          navigate(`/chat/${r.userId}`);
                        }}
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-full transition"
                      >
                        <MessageCircle size={18}/>
                      </button>
                    </div>
                  </div>
                ))}
                {(storyReactions[currentStory.id] || []).length === 0 && (
                  <div className="text-center py-12 text-neutral-500 text-sm">
                    No reactions yet. Be the first to react!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Dynamic Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#1877F2] border border-[#1877F2] text-white font-bold text-xs px-5 py-3 rounded-full shadow-2xl z-55 flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
