import React, { useState, useRef, useEffect } from 'react';
import FullScreenImageViewer from './FullScreenImageViewer';
import * as ImagePicker from '../utils/expo-image-picker-web';
import { 
  Home, PlusCircle, Search, MessageCircle, Video, Users, Bell, Plus, Image,
  MoreHorizontal, Share2, ThumbsUp, ThumbsDown, Reply, Smile, Send, CornerDownRight,
  Copy, Edit3, Trash2, Pin, Flag, EyeOff, User, X, BellOff, Link2, Bookmark, Lock, BadgeCheck, Play, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReactionPanel, getReactionDetails, ReactionOption } from './ReactionPanel';
import { db } from '../firebase';
import { doc, updateDoc, getDocs, query, collection, where, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { submitCommentReportToFirestore, getRealCommentsCount } from '../utils/firebaseSync';
import CommentIconWithCount from './CommentIconWithCount';
import CreatePostScreen, { postCreationStore } from '../screens/CreatePostScreen';
import MusicPickerScreen from '../screens/MusicPickerScreen';
import TagCollaborateScreen from '../screens/TagCollaborateScreen';
import LocationPickerScreen from '../screens/LocationPickerScreen';
import PostSettingsScreen from '../screens/PostSettingsScreen';
import StoryEditScreen from '../screens/StoryEditScreen';
import PeopleYouMayKnow from './PeopleYouMayKnow';
import StoryBar from './StoryBar';
import { BlueVerifiedTick } from './BlueVerifiedTick';
import TranslationWrapper from './TranslationWrapper';
import { safeStorage } from '../utils/safeStorage';

const BannerContainer = ({ onPress, onClick, children, className }: { onPress?: () => void; onClick?: () => void; children?: React.ReactNode; className?: string }) => (
  <div onClick={onPress || onClick} className={className}>
    {children}
  </div>
);

const TouchableOpacity = ({ onPress, onClick, children, className, ...props }: any) => (
  <div onClick={onPress || onClick} className={className} {...props}>
    {children}
  </div>
);

interface FeedProps {
  posts?: any[];
  currentUser?: any;
  stories?: any[];
  onAddPost?: (content: string, image?: string, videoUrl?: string, isVideo?: boolean, taggedUsers?: string[]) => void;
  onAddStory?: (mediaUrl: string, mediaType: string, metadata?: any) => void;
  onReactToPost?: (postId: string, reactionType: string) => void;
  onCommentToPost?: (postId: string, text: string) => void;
  onSharePost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  searchQuery?: string;
  navigate?: (path: string, options?: any) => void;
  onShareStory?: any;
  onSavePost?: any;
  onReportPost?: any;
  blockedWords?: any;
  onReactToComment?: any;
  onReplyToComment?: any;
  onViewProfile?: any;
  users?: any;
  onFollowToggle?: (userId: string) => void;
  onOpenVideoPlayer?: (postId: string) => void;
  isVideoPlayerOpen?: boolean;
  createPostOptions?: { isVideo?: boolean; videoUrl?: string; description?: string } | null;
  setCreatePostOptions?: (options: { isVideo?: boolean; videoUrl?: string; description?: string } | null) => void;
}

export default function Feed({
  posts: propPosts,
  currentUser: propCurrentUser,
  stories: propStories,
  onAddPost,
  onAddStory,
  onReactToPost,
  onCommentToPost,
  onSharePost,
  onDeletePost,
  searchQuery = '',
  navigate = () => {},
  onSavePost,
  onReportPost,
  onViewProfile,
  onReactToComment,
  onReplyToComment,
  users,
  onFollowToggle,
  onOpenVideoPlayer,
  isVideoPlayerOpen,
  createPostOptions,
  setCreatePostOptions
}: FeedProps) {

  // Navigation adaptor for React Native style calls in Create Post flow
  const [currentComposerScreen, setCurrentComposerScreen] = useState<string | null>(null);
  const [composerParams, setComposerParams] = useState<any>({});

  useEffect(() => {
    if (createPostOptions) {
      postCreationStore.reset();
      postCreationStore.setState({
        isVideo: !!createPostOptions.isVideo,
        mediaUrl: createPostOptions.videoUrl,
        text: createPostOptions.description || ''
      });
      setCurrentComposerScreen('CreatePostScreen');
      if (setCreatePostOptions) {
        setCreatePostOptions(null);
      }
    }
  }, [createPostOptions, setCreatePostOptions]);

  const navigation = {
    navigate: (screen: string, params?: any) => {
      if (['CreatePostScreen', 'StoryEditScreen', 'MusicPicker', 'MusicPickerScreen', 'TagCollaborate', 'TagCollaborateScreen', 'LocationPicker', 'LocationPickerScreen', 'PostSettings', 'PostSettingsScreen'].includes(screen)) {
        if (params) {
          setComposerParams((prev: any) => ({ ...prev, ...params }));
        }
        setCurrentComposerScreen(screen);
      } else {
        navigate(screen, params);
      }
    },
    goBack: () => {
      if (currentComposerScreen && currentComposerScreen !== 'CreatePostScreen' && currentComposerScreen !== 'StoryEditScreen') {
        setCurrentComposerScreen('CreatePostScreen');
      } else {
        setCurrentComposerScreen(null);
      }
    }
  };

  const handleCreateStory = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => ({ status: 'denied' }));
      if (status !== 'granted') {
        toast('Media library permission is required to share stories.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      }).catch(err => {
        console.error("ImagePicker error:", err);
        return { canceled: true };
      });

      if (!result.canceled && result.assets) {
        navigation.navigate('StoryEditScreen', { images: result.assets });
      }
    } catch (err) {
      console.error("Error in handleCreateStory:", err);
      toast("An error occurred while opening the gallery.");
    }
  }

  // 1. STATE [Top]
  const [currentUser] = useState(() => {
    if (propCurrentUser) return propCurrentUser;
    try {
      return safeStorage.getJSON('rc_current_user', null) || {
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

  const [posts, setPosts] = useState(() => {
    if (propPosts && propPosts.length > 0) return propPosts;
    try {
      const stored = safeStorage.getItem('rc_feed_posts');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [stories, setStories] = useState(() => {
    if (propStories && propStories.length > 0) return propStories;
    try {
      const stored = safeStorage.getItem('rc_stories');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const [inputVal, setInputVal] = useState('');

  // Floating toast message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3000);
  };

  // Sync state if props change
  useEffect(() => {
    if (propPosts) {
      setPosts(propPosts);
      safeStorage.setJSON('rc_feed_posts', propPosts);
    }
  }, [propPosts]);

  useEffect(() => {
    if (propStories) {
      setStories(propStories);
      safeStorage.setJSON('rc_stories', propStories);
    }
  }, [propStories]);

  // 2. PULL TO REFRESH LOGIC [FB Style Up to Down]
  const PULL_THRESHOLD = 80; // px

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && e.touches[0].clientY > startY.current) {
      setIsPulling(true);
      setPullDistance(Math.min(e.touches[0].clientY - startY.current, 120));
    }
  };

  const onTouchEnd = () => {
    if (pullDistance > PULL_THRESHOLD) {
      handleRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  const handleRefresh = () => {
    const newPost = {
      id: Date.now().toString(),
      user: { name: 'New Video', avatar: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=100&q=80' },
      userFullName: 'New Video',
      userAvatar: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=100&q=80',
      type: 'video',
      text: 'New video just uploaded 🔥',
      content: 'New video just uploaded 🔥',
      time: 'Just now',
      createdAt: new Date().toISOString(),
      likes: 0,
      reactions: [],
      comments: [],
      sharesCount: 0,
      isVideo: true,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
    };
    
    const newPosts = [newPost, ...posts];
    setPosts(newPosts);
    safeStorage.setJSON('rc_feed_posts', newPosts);
    toast('Feed updated');
    
    // Trigger external hook if provided
    if (onAddPost) {
      onAddPost('New video just uploaded 🔥', undefined, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', true);
    }
  };

  const handleCreatePost = () => {
    if (!inputVal.trim()) return;
    
    const text = inputVal.trim();
    if (onAddPost) {
      onAddPost(text);
    } else {
      const newPost = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        userAvatar: currentUser.avatar,
        content: text,
        createdAt: new Date().toISOString(),
        reactions: [],
        comments: [],
        sharesCount: 0
      };
      const updatedPosts = [newPost, ...posts];
      setPosts(updatedPosts);
      safeStorage.setJSON('rc_feed_posts', updatedPosts);
      toast('Post created!');
    }
    setInputVal('');
  };

  const isMuted = (userId: string) => {
    const muted = safeStorage.getJSON<any[]>('rc_muted', []);
    return muted.some((m: any) => m.userId === userId);
  };

  // Filter based on search query
  // Filter based on search query and privacy
  const filteredPosts = posts.filter(post => {
    // 1. Privacy Check
    if (post.userId !== currentUser.id) {
      if (post.privacy === 'only_me') return false;
      if (post.privacy === 'followers' || post.privacy === 'friends') {
        if (!currentUser?.following?.includes(post.userId)) return false;
      }
    }

    // 2. Search Check
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const content = post.content || post.text || '';
    const author = post.userFullName || post.user?.name || '';
    return content.toLowerCase().includes(query) || author.toLowerCase().includes(query);
  });

  return (
    <div
      onTouchStart={onTouchStart} 
      onTouchMove={onTouchMove} 
      onTouchEnd={onTouchEnd}
      className="bg-[#F0F2F5] min-h-screen text-neutral-800 select-none font-sans"
    >
      {/* 3.1 Pull Header [Home icon appears] */}
      <div 
        style={{ height: `${pullDistance}px`, transition: isPulling ? 'none' : 'height 0.3s' }} 
        className="w-full flex items-center justify-center bg-neutral-50 sticky top-0 z-40 overflow-hidden"
      >
        {pullDistance > 20 && (
          <div className="flex flex-col items-center p-2">
            <Home size={28} className={`text-[#1877F2] ${pullDistance > PULL_THRESHOLD ? 'animate-bounce' : ''}`} />
            <p className="text-[10px] text-neutral-500 font-bold mt-1">{pullDistance > PULL_THRESHOLD ? 'Release to refresh' : 'Pull down'}</p>
          </div>
        )}
      </div>

      {/* 3.2 Top Nav */}
      <div className="sticky top-0 bg-white z-30 border-b border-neutral-200">
        <div className="flex items-center justify-between p-3.5">
          <h1 className="text-[#1877F2] text-3xl font-black tracking-tight select-none cursor-pointer" onClick={() => navigate('/')}>rohconnect</h1>
          <div className="flex gap-4 text-neutral-600">
            <button className="hover:text-[#1877F2] transition" onClick={handleCreateStory}><PlusCircle size={24}/></button>
            <button className="hover:text-[#1877F2] transition" onClick={() => toast('Searching...')}><Search size={24}/></button>
            <button className="hover:text-[#1877F2] transition" onClick={() => navigate('/chat/general')}><MessageCircle size={24}/></button>
          </div>
        </div>
        <div className="flex justify-around border-t border-neutral-100 text-neutral-500">
          <button className="text-[#1877F2] border-b-4 border-[#1877F2] p-3 flex-1 flex justify-center" onClick={() => navigate('/')}>
            <Home size={24}/>
          </button>
          <button className="relative p-3 flex-1 flex justify-center hover:text-neutral-800 transition" onClick={() => navigate('/videos')}>
            <Video size={24}/>
            <span className="absolute top-3 right-1/2 translate-x-4 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="p-3 flex-1 flex justify-center hover:text-neutral-800 transition" onClick={() => navigate('/follow_requests')}>
            <Users size={24}/>
          </button>
          <button className="p-3 flex-1 flex justify-center hover:text-neutral-800 transition" onClick={() => navigate('/notifications')}>
            <Bell size={24}/>
          </button>
          <div className="p-2 flex-1 flex justify-center items-center">
            <img 
              // FIXED ERROR 2
              src={currentUser.avatar || "/default-avatar.png"} 
              onError={(e) => e.currentTarget.src = "/default-avatar.png"}
              className="w-7 h-7 rounded-full object-cover border border-neutral-200 cursor-pointer hover:opacity-85" 
              onClick={() => navigate('/profile')}
              alt="Avatar"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* 3.3 Create Post */}
        <BannerContainer 
          onPress={() => navigation.navigate('CreatePostScreen')}
          onClick={() => navigation.navigate('CreatePostScreen')}
          className="flex items-center gap-3 p-3.5 border-b border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-850 transition"
        >
          <img 
            // FIXED ERROR 2
            src={currentUser.avatar || "/default-avatar.png"} 
            onError={(e) => e.currentTarget.src = "/default-avatar.png"}
            className="w-10 h-10 rounded-full object-cover border border-neutral-100 dark:border-slate-800" 
            alt="Avatar"
          />
          <input 
            readOnly
            placeholder="What's on your mind?" 
            onClick={() => navigation.navigate('CreatePostScreen')}
            className="flex-1 bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-neutral-100 rounded-full px-4 py-2 text-sm outline-none placeholder-neutral-500 dark:placeholder-neutral-400 cursor-pointer transition"
          />
          <button onClick={(e) => { e.stopPropagation(); navigation.navigate('CreatePostScreen'); }} className="p-2 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-full text-[#1877F2] transition">
            <Image size={24}/>
          </button>
        </BannerContainer>

        {/* 3.4 Stories Row [Horizontal] */}
        <StoryBar currentUser={currentUser} stories={stories} onViewProfile={onViewProfile} />

        {(!currentUser?.following?.length || currentUser.following.length < 5) && (
          <PeopleYouMayKnow 
            currentUser={currentUser}
            users={users || []}
            onViewProfile={onViewProfile}
            onFollow={(userId) => {
              if (onFollowToggle) onFollowToggle(userId);
            }}
          />
        )}

        {/* 3.5 Posts */}
        <div className="p-4 space-y-4">
          {filteredPosts.map((post, index) => (
            <React.Fragment key={post.id}>
              <PostCard 
                data={post} 
                onReact={onReactToPost}
                onComment={onCommentToPost}
                onShare={onSharePost}
                onDelete={onDeletePost}
                currentUser={currentUser}
                onViewProfile={onViewProfile}
                onReactToComment={onReactToComment}
                onReplyToComment={onReplyToComment}
                users={users}
                toast={toast}
                onSavePost={onSavePost}
                onReportPost={onReportPost}
                onOpenVideoPlayer={onOpenVideoPlayer}
                isVideoPlayerOpen={isVideoPlayerOpen}
                onFollowToggle={onFollowToggle}
                allPosts={propPosts || []}
              />
              {/* Insert PeopleYouMayKnow after every 15 posts (if there are at least 15 posts) */}
              {(index + 1) % 15 === 0 && (
                <PeopleYouMayKnow 
                  currentUser={currentUser}
                  users={users || []}
                  onViewProfile={onViewProfile}
                  onFollow={(userId) => {
                    if (onFollowToggle) onFollowToggle(userId);
                  }}
                />
              )}
            </React.Fragment>
          ))}
          {filteredPosts.length === 0 && (
            <div className="text-center py-16 text-neutral-500 font-medium text-sm">
              No posts found. Start sharing!
            </div>
          )}
        </div>
      </div>

      {/* Floating Dynamic Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1877F2] border border-[#1877F2] text-white font-bold text-xs px-5 py-3 rounded-full shadow-2xl z-55 flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 5. CREATE POST COMPOSER FLOW SCREENS */}
      {currentComposerScreen === 'CreatePostScreen' && (
        <CreatePostScreen 
          navigation={navigation} 
          route={{ params: composerParams }}
          currentUser={currentUser} 
          onClose={() => setCurrentComposerScreen(null)} 
        />
      )}
      {currentComposerScreen === 'StoryEditScreen' && (
        <StoryEditScreen 
          navigation={navigation} 
          route={{ params: composerParams }}
          currentUser={currentUser} 
          onClose={() => setCurrentComposerScreen(null)} 
          onShare={async (mediaUrl: string, mediaType: string, metadata?: any) => {
            if (onAddStory) await onAddStory(mediaUrl, mediaType, metadata);
            setCurrentComposerScreen(null);
          }}
        />
      )}
      {(currentComposerScreen === 'MusicPicker' || currentComposerScreen === 'MusicPickerScreen') && (
        <MusicPickerScreen 
          navigation={navigation} 
          route={{ params: composerParams }}
          currentUser={currentUser} 
          onClose={() => navigation.navigate('CreatePostScreen')} 
        />
      )}
      {(currentComposerScreen === 'TagCollaborate' || currentComposerScreen === 'TagCollaborateScreen') && (
        <TagCollaborateScreen 
          navigation={navigation} 
          route={{ params: composerParams }}
          currentUser={currentUser} 
          users={users} 
          onClose={() => navigation.navigate('CreatePostScreen')} 
        />
      )}
      {(currentComposerScreen === 'LocationPicker' || currentComposerScreen === 'LocationPickerScreen') && (
        <LocationPickerScreen 
          navigation={navigation} 
          route={{ params: composerParams }}
          currentUser={currentUser} 
          onClose={() => navigation.navigate('CreatePostScreen')} 
        />
      )}
      {(currentComposerScreen === 'PostSettings' || currentComposerScreen === 'PostSettingsScreen') && (
        <PostSettingsScreen 
          navigation={navigation} 
          currentUser={currentUser} 
          onClose={() => setCurrentComposerScreen(null)}
          onPostCreated={(newPost) => {
            if (onAddPost) {
              onAddPost(newPost.content, newPost.image, newPost.videoUrl, newPost.isVideo, newPost.taggedUsers);
            }
            setCurrentComposerScreen(null);
          }}
        />
      )}
    </div>
  );
}

// Internal customized PostCard helper with standard interactions
function PostCard({ 
  data, 
  onReact, 
  onComment, 
  onShare, 
  onDelete, 
  currentUser,
  onViewProfile,
  onReactToComment,
  onReplyToComment,
  users,
  toast: passedToast,
  onSavePost,
  onReportPost,
  onFollowToggle,
  onOpenVideoPlayer,
  isVideoPlayerOpen,
  allPosts
}: { 
  key?: any;
  data: any; 
  onReact?: any; 
  onComment?: any; 
  onShare?: any; 
  onDelete?: any; 
  currentUser: any; 
  onViewProfile?: any;
  onReactToComment?: any;
  onReplyToComment?: any;
  users?: any[];
  toast?: any;
  onSavePost?: any;
  onReportPost?: any;
  onFollowToggle?: (userId: string) => void;
  onOpenVideoPlayer?: (postId: string) => void;
  isVideoPlayerOpen?: boolean;
  allPosts?: any[];
}) {
  const toast = (msg: string) => {
    if (passedToast) {
      passedToast(msg);
    } else {
      console.log('Toast:', msg);
    }
  };

  const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
  };

  const authorName = data.userFullName || data.user?.name || 'Anonymous';
  const authorAvatar = data.userAvatar || data.user?.avatar || 'https://i.pravatar.cc/100?u=anon';
  const authorUser = users?.find((u: any) => u.id === data.userId || u.fullName === data.userFullName);
  const isVerified = data.user?.isVerified || authorUser?.isVerified || (data.user?.invitesCount || 0) >= 5 || (authorUser?.invitesCount || 0) >= 5;
  const content = data.content || data.text || '';
  const postTime = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : (data.time || 'Just now');
  
  const isOwner = !!(
    currentUser &&
    (
      (currentUser.uid && currentUser.uid === data.userId) ||
      (currentUser.id && currentUser.id === data.userId) ||
      (currentUser.uid && currentUser.uid === data.ownerId) ||
      (currentUser.id && currentUser.id === data.ownerId)
    )
  );
  
  const isVideo = data.isVideo || data.type === 'video' || !!data.videoUrl;
  const imageUrl = data.image || data.imageUrl || null;
  const videoUrl = data.videoUrl || (data.type === 'video' ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' : null);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [isVideo, videoUrl]);

  const totalCommentsCount = getRealCommentsCount(data);

  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const isFollowing = currentUser?.following?.includes(data.userId);

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowLoading || !onFollowToggle) return;
    setIsFollowLoading(true);
    try {
      await onFollowToggle(data.userId);
    } catch (err) {
      console.error("Error toggling follow from post:", err);
      toast("Failed to update follow status.");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const [showCommentsList, setShowCommentsList] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  const [showMentionsFor, setShowMentionsFor] = useState<'main' | 'reply' | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');

  // Long-press Comment Menu State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any | null>(null);
  const [isCommentMenuOpen, setIsCommentMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [hiddenCommentIds, setHiddenCommentIds] = useState<string[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Post Menu State
  const [isPostMenuOpen, setIsPostMenuOpen] = useState(false);
  const [showPrivacyModalForId, setShowPrivacyModalForId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(data.savedBy && data.savedBy.includes(currentUser?.id));

  const handleUpdatePrivacy = async (postId: string, privacy: 'public' | 'followers' | 'close_friends' | 'only_me') => {
    try {
      await updateDoc(doc(db, 'rc_posts', postId), { privacy });
      setShowPrivacyModalForId(null);
    } catch (err) {
      console.error("Error updating privacy:", err);
      toast("Failed to update privacy. Please check your connection.");
    }
  };
  const [notificationsOn, setNotificationsOn] = useState(false);
  
  useEffect(() => {
    if (isPostMenuOpen && data?.id && currentUser?.id) {
      const checkNotification = async () => {
        const q = query(collection(db, 'rc_post_notifications'), where('userId', '==', currentUser.id), where('postId', '==', data.id));
        const snapshot = await getDocs(q);
        setNotificationsOn(!snapshot.empty);
      };
      checkNotification();
    }
  }, [isPostMenuOpen, data?.id, currentUser?.id]);

  const toggleNotifications = async () => {
    try {
      const newStatus = !notificationsOn;
      setNotificationsOn(newStatus);
      
      const q = query(collection(db, 'rc_post_notifications'), where('userId', '==', currentUser.id), where('postId', '==', data.id));
      const snapshot = await getDocs(q).catch(err => {
        console.warn("Permission denied or query failed for notifications:", err);
        throw err;
      });
      
      if (newStatus) {
        if (snapshot.empty) {
          await addDoc(collection(db, 'rc_post_notifications'), { userId: currentUser.id, postId: data.id, createdAt: serverTimestamp() });
        }
      } else {
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }
    } catch (err) {
      console.error("Error toggling notifications:", err);
      setNotificationsOn(!notificationsOn); // Revert UI
      toast("Failed to update notification settings.");
    }
  };

  const [isInterested, setIsInterested] = useState<boolean | null>(null);
  const [hidePostState, setHidePostState] = useState(false);
  
  // Reporting state
  const [showCommentReportModal, setShowCommentReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');

  const longPressTimerRef = useRef<any>(null);
  const isLongPressActiveRef = useRef<boolean>(false);

  const handleCommentTouchStart = (comment: any, e: React.TouchEvent) => {
    isLongPressActiveRef.current = false;
    if (editingCommentId === comment.id) return;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setSelectedComment(comment);
      setContextMenuPos(null);
      setIsCommentMenuOpen(true);
      if (navigator.vibrate) {
        navigator.vibrate(60);
      }
    }, 500);
  };

  const handleCommentTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleCommentTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleCommentContextMenu = (comment: any, e: React.MouseEvent) => {
    if (editingCommentId === comment.id) return;
    e.preventDefault();
    setSelectedComment(comment);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setIsCommentMenuOpen(true);
  };

  const updateCommentTextInArray = (list: any[], commentId: string, newText: string): any[] => {
    return list.map(c => {
      if (c.id === commentId) {
        return { ...c, text: newText };
      }
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: updateCommentTextInArray(c.replies, commentId, newText) };
      }
      return c;
    });
  };

  const deleteCommentInArray = (list: any[], commentId: string): any[] => {
    return list
      .filter(c => c.id !== commentId)
      .map(c => {
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: deleteCommentInArray(c.replies, commentId) };
        }
        return c;
      });
  };

  const togglePinCommentInArray = (list: any[], commentId: string): any[] => {
    return list.map(c => {
      if (c.id === commentId) {
        return { ...c, isPinned: !c.isPinned };
      }
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: togglePinCommentInArray(c.replies, commentId) };
      }
      return c;
    });
  };

  // Close context menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCommentMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const quickEmojis = ['😂', '❤️', '👍', '😍', '🔥', '👏', '😮', '😢'];

  const handleTextChange = (text: string, type: 'main' | 'reply') => {
    if (type === 'main') {
      setCommentText(text);
    } else {
      setReplyText(text);
    }
    
    const lastWord = text.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      const query = lastWord.substring(1);
      setMentionQuery(query);
      setShowMentionsFor(type);
    } else {
      setShowMentionsFor(null);
    }
  };

  const handleSelectMention = (user: any, type: 'main' | 'reply') => {
    if (type === 'main') {
      const words = commentText.split(/\s+/);
      words.pop();
      const prefix = words.join(' ');
      setCommentText((prefix ? prefix + ' ' : '') + `@${user.username} `);
    } else {
      const words = replyText.split(/\s+/);
      words.pop();
      const prefix = words.join(' ');
      setReplyText((prefix ? prefix + ' ' : '') + `@${user.username} `);
    }
    setShowMentionsFor(null);
  };

  const handleAddEmoji = (emoji: string, type: 'main' | 'reply') => {
    if (type === 'main') {
      setCommentText(prev => prev + emoji);
    } else {
      setReplyText(prev => prev + emoji);
    }
  };

  const formatCommentText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return <span key={index} className="text-[#1877F2] font-semibold cursor-pointer hover:underline"> {part} </span>;
      }
      return part;
    });
  };

  const filteredUsers = (users || []).filter((u: any) => 
    u.username?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    u.fullName?.toLowerCase().includes(mentionQuery.toLowerCase())
  );
  
  const reacts = Array.isArray(data.reactions) ? data.reactions : [];
  const myReactionObj = reacts.find((r: any) => r.userId === currentUser.id);
  const [likesCount, setLikesCount] = useState(data.likes !== undefined ? data.likes : reacts.length);
  const [myReactionType, setMyReactionType] = useState<string | null>(() => {
    return myReactionObj ? myReactionObj.type : null;
  });
  const [hasLiked, setHasLiked] = useState(() => {
    return !!myReactionObj;
  });

  useEffect(() => {
    const currentReacts = Array.isArray(data.reactions) ? data.reactions : [];
    const currentMyReaction = currentReacts.find((r: any) => r.userId === currentUser.id);
    if (currentMyReaction) {
      setMyReactionType(currentMyReaction.type);
      setHasLiked(true);
    } else {
      setMyReactionType(null);
      setHasLiked(false);
    }
    setLikesCount(data.likes !== undefined ? data.likes : currentReacts.length);
  }, [data.reactions, data.likes, currentUser.id]);
  const [videoError, setVideoError] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showSharedHeartAnim, setShowSharedHeartAnim] = useState(false);
  const lastVideoTap = useRef<number>(0);
  const videoClickTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSharedVideoTap = useRef<number>(0);
  const sharedVideoClickTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleDoubleTapLike = () => {
    if (!hasLiked) {
      setLikesCount((prev: number) => prev + 1);
      setHasLiked(true);
      setMyReactionType('like');
      if (onReact) onReact(data.id, 'like');
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastVideoTap.current < DOUBLE_PRESS_DELAY) {
      if (videoClickTimeout.current) {
        clearTimeout(videoClickTimeout.current);
        videoClickTimeout.current = null;
      }
      handleDoubleTapLike();
    } else {
      lastVideoTap.current = now;
      videoClickTimeout.current = setTimeout(() => {
        if (onOpenVideoPlayer) {
          onOpenVideoPlayer(data.id);
        }
        videoClickTimeout.current = null;
      }, DOUBLE_PRESS_DELAY);
    }
  };

  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePressStart = () => {
    pressTimer.current = setTimeout(() => {
      setShowReactionPanel(true);
    }, 500); // 500ms for long press
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleLike = () => {
    if (hasLiked) {
      setLikesCount((prev: number) => Math.max(0, prev - 1));
      setHasLiked(false);
      setMyReactionType(null);
      if (onReact) onReact(data.id, 'unlike');
    } else {
      setLikesCount((prev: number) => prev + 1);
      setHasLiked(true);
      setMyReactionType('like');
      if (onReact) onReact(data.id, 'like');
    }
  };

  const handleReactionSelect = (reactionType: string, option?: ReactionOption) => {
    setShowReactionPanel(false);
    const details = option || getReactionDetails(reactionType);
    if (!hasLiked) {
      setLikesCount((prev: number) => prev + 1);
    }
    setHasLiked(true);
    setMyReactionType(reactionType);
    if (onReact) onReact(data.id, reactionType);
    toast(`Reacted with ${details.name}`);
  };

  const handleTogglePin = async () => {
    try {
      const isPinned = !!data.pinned;
      await updateDoc(doc(db, 'rc_posts', data.id), {
        pinned: !isPinned,
        pinnedAt: !isPinned ? Date.now() : null
      });
      toast(!isPinned ? 'Post pinned to top of profile' : 'Post unpinned from profile');
    } catch (err) {
      console.error("Error toggling pin in feed card:", err);
    }
  };

  const handleShare = () => {
    if (onShare) onShare(data.id);
    else alert('Shared to profile!');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl p-4 shadow-sm text-slate-900 dark:text-slate-100 transition-colors duration-200 relative">
      {hidePostState ? (
        <div className="p-4 text-center">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Post Hidden</p>
          <p className="text-xs text-slate-500 mt-1">You will see less post from this account for a while.</p>
          <button onClick={() => setHidePostState(false)} className="mt-3 text-xs font-bold text-[#1877F2] hover:underline">Undo</button>
        </div>
      ) : (
      <>
      {/* Post Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3">
          <img 
            // FIXED ERROR 2
            src={authorAvatar || "/default-avatar.png"} 
            onError={(e) => e.currentTarget.src = "/default-avatar.png"}
            className="w-10 h-10 rounded-full object-cover border border-neutral-100 cursor-pointer hover:opacity-85 transition" 
            alt="Avatar"
            onClick={() => onViewProfile && onViewProfile(data.userId)}
          />
          <div>
            <h3 
              className="font-bold text-sm text-neutral-950 dark:text-neutral-100 cursor-pointer hover:underline transition flex items-center gap-1"
              onClick={() => onViewProfile && onViewProfile(data.userId)}
            >
              {authorName}
              {isVerified && <BlueVerifiedTick className="w-4 h-4" />}
              
              {!isOwner && (
                <div className="flex items-center">
                  <span className="text-neutral-400 mx-1.5 text-xs">•</span>
                  <button
                    onClick={handleFollowClick}
                    disabled={isFollowLoading}
                    className={`text-[13px] font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center ${
                      isFollowing 
                        ? 'text-neutral-500 dark:text-neutral-400' 
                        : 'text-[#1877F2] hover:text-[#166fe5]'
                    }`}
                  >
                    {isFollowing ? `Following • ${formatCount(authorUser?.followers?.length || authorUser?.followersCount || 0)}` : 'Follow'}
                  </button>
                </div>
              )}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-[11px] text-neutral-500 font-medium">{postTime}</p>
              {isOwner && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleTogglePin();
                  }}
                  className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full transition ${
                    data.pinned
                      ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 cursor-pointer'
                      : 'bg-neutral-50 text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400 cursor-pointer hover:text-blue-600'
                  }`}
                  title={data.pinned ? 'Click to unpin' : 'Click to pin'}
                >
                  <Pin size={10} className={`fill-current ${data.pinned ? 'rotate-[45deg]' : ''}`} />
                  <span>{data.pinned ? 'Pinned' : 'Pin'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && currentUser.id === data.userId && (
            <>
              <button 
                onClick={() => setShowConfirmModal(true)} 
                className="text-xs text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-bold transition"
              >
                Delete
              </button>
              {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                    <h3 className="text-lg font-bold text-neutral-900 mb-4">Are you sure to delete this post?</h3>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowConfirmModal(false)}
                        className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => { onDelete(data.id); setShowConfirmModal(false); }}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <button onClick={() => setIsPostMenuOpen(true)} className="text-neutral-500 hover:bg-neutral-100 p-2 rounded-full transition relative">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Post Body Text */}
      <TranslationWrapper 
        text={content} 
        className="text-sm mb-3.5 leading-relaxed" 
        textClassName="text-neutral-800 dark:text-neutral-200 whitespace-pre-line"
      />

      {/* Post Media Area */}
      {isVideo && Boolean(videoUrl) && videoUrl !== '' && (
        <div 
          onClick={handleVideoClick}
          className="relative rounded-xl overflow-hidden mb-3 bg-black aspect-[9/16] max-h-[550px] mx-auto w-full border border-neutral-100 cursor-pointer group"
        >
          {!videoError ? (
            <>
              <video 
                ref={videoRef}
                src={videoUrl || undefined} 
                className="w-full h-full object-contain pointer-events-none" 
                onError={() => setVideoError(true)}
                muted
                playsInline
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-90 group-hover:opacity-100 group-hover:bg-black/40 transition duration-200">
                <div className="p-3 bg-emerald-600/90 text-white rounded-full shadow-lg transform group-hover:scale-110 transition duration-200">
                  <Play className="w-5 h-5 fill-white text-white" />
                </div>
              </div>

              {/* Big Heart Animation for Double Tap */}
              <AnimatePresence>
                {showHeartAnim && (
                  <motion.div
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: [0.3, 1.2, 1.0], opacity: [0, 1, 1] }}
                    exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                  >
                    <div className="bg-white/20 backdrop-blur-xs p-6 rounded-full shadow-2xl">
                      <ThumbsUp className="w-16 h-16 text-rose-500 fill-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 text-neutral-400 p-4 text-center">
              <span className="text-xs font-bold text-neutral-300">Video Temporarily Unavailable</span>
              <span className="text-[10px] text-neutral-500 mt-1">Please try again later or check your network</span>
            </div>
          )}
        </div>
      )}
      {!isVideo && Boolean(imageUrl) && imageUrl !== '' && (
        <div className="rounded-xl overflow-hidden mb-3 border border-neutral-100">
          <FullScreenImageViewer imageUrl={imageUrl || ''} userAvatar={authorAvatar} userFullName={authorName} timestamp={data.createdAt}>
            <img 
              // FIXED ERROR 2
              src={imageUrl || "/default-avatar.png"} 
              onError={(e) => e.currentTarget.src = "/default-avatar.png"}
              className="w-full object-cover max-h-96 cursor-pointer" 
              alt="Post content"
            />
          </FullScreenImageViewer>
        </div>
      )}

              {/* Shared Post Embedding */}
      {(data.originalPostId || data.sharedFromPostId) && allPosts && (
        (() => {
                    const originalPostId = data.originalPostId || data.sharedFromPostId;
          const originalPost = allPosts.find(p => p.id === originalPostId);
          
          let canViewOriginal = false;
          if (originalPost) {
            canViewOriginal = true;
            if (originalPost.userId !== currentUser.id) {
              if (originalPost.privacy === 'only_me') {
                canViewOriginal = false;
              } else if (originalPost.privacy === 'followers') {
                if (!currentUser?.following?.includes(originalPost.userId)) {
                  canViewOriginal = false;
                }
              } else if (originalPost.privacy === 'friends') {
                if (!currentUser?.following?.includes(originalPost.userId)) {
                  canViewOriginal = false; // Simplified friends check
                }
              }
            }
          }
          
          if (originalPost && canViewOriginal) {
            return (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-3 mb-3 bg-slate-50 dark:bg-slate-950/50">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <img 
                    // FIXED ERROR 2
                    src={originalPost.userAvatar || originalPost.user?.avatar || "/default-avatar.png"} 
                    onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                    className="w-8 h-8 rounded-full object-cover" 
                    alt="Original Author" 
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      {originalPost.userFullName || originalPost.user?.name}
                      {((originalPost.user?.invitesCount || 0) >= 5 || originalPost.user?.isVerified) && <BlueVerifiedTick className="w-3.5 h-3.5" />}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">{new Date(originalPost.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {originalPost.content && (
                  <div className="p-3 pb-2 text-sm text-slate-700 dark:text-slate-300">
                    <TranslationWrapper text={originalPost.content} className="text-sm mb-3.5 leading-relaxed" textClassName="text-neutral-800 dark:text-neutral-200 whitespace-pre-line" />
                  </div>
                )}
                
                {/* Media embedding */}
                {originalPost.isVideo ? (
                  <div 
                    className="w-full relative bg-slate-950 flex items-center justify-center cursor-pointer group mx-auto" 
                    style={{ aspectRatio: '9/16', maxHeight: '500px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const now = Date.now();
                      const DOUBLE_PRESS_DELAY = 300;
                      if (now - lastSharedVideoTap.current < DOUBLE_PRESS_DELAY) {
                        if (sharedVideoClickTimeout.current) {
                          clearTimeout(sharedVideoClickTimeout.current);
                          sharedVideoClickTimeout.current = null;
                        }
                        if (onReact) onReact(originalPost.id, 'like');
                        setShowSharedHeartAnim(true);
                        setTimeout(() => setShowSharedHeartAnim(false), 800);
                      } else {
                        lastSharedVideoTap.current = now;
                        sharedVideoClickTimeout.current = setTimeout(() => {
                          if (onOpenVideoPlayer) onOpenVideoPlayer(originalPost.id);
                          sharedVideoClickTimeout.current = null;
                        }, DOUBLE_PRESS_DELAY);
                      }
                    }}
                  >
                    {!videoError ? (
                      <>
                        <video 
                          ref={videoRef}
                          src={originalPost.videoUrl} 
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                          onError={() => setVideoError(true)}
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-90 group-hover:opacity-100 group-hover:bg-black/40 transition duration-200">
                          <div className="p-3 bg-emerald-600/90 text-white rounded-full shadow-lg transform group-hover:scale-110 transition duration-200">
                            <Play className="w-5 h-5 fill-white text-white" />
                          </div>
                        </div>

                        {/* Floating heart overlay for double tap */}
                        <AnimatePresence>
                          {showSharedHeartAnim && (
                            <motion.div
                              initial={{ scale: 0.3, opacity: 0 }}
                              animate={{ scale: [0.3, 1.2, 1.0], opacity: [0, 1, 1] }}
                              exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.2 } }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                            >
                              <div className="bg-white/20 backdrop-blur-xs p-6 rounded-full shadow-2xl">
                                <ThumbsUp className="w-16 h-16 text-rose-500 fill-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 text-neutral-400 p-4 text-center">
                        <span className="text-xs font-bold text-neutral-300">Video Temporarily Unavailable</span>
                        <span className="text-[10px] text-neutral-500 mt-1">Please try again later</span>
                      </div>
                    )}
                  </div>
                ) : (
                  (originalPost.image) ? (
                    <FullScreenImageViewer imageUrl={originalPost.image || ''} userAvatar={originalPost.userAvatar || originalPost.user?.avatar} userFullName={originalPost.userFullName || originalPost.user?.name} timestamp={originalPost.createdAt}>
                      <img 
                        // FIXED ERROR 2
                        src={originalPost.image || "/default-avatar.png"} 
                        onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                        className="w-full object-cover max-h-96 border-t border-slate-200 dark:border-slate-800 cursor-pointer" 
                        alt="Original Attachment" 
                      />
                    </FullScreenImageViewer>
                  ) : null
                )}
              </div>
            );
          } else {
            return (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-900 mt-3 mb-3">
                <p className="text-xs text-slate-500 font-bold">This content isn't available right now</p>
                <p className="text-[10px] text-slate-400 mt-1">When this happens, it's usually because the owner only shared it with a small group of people, changed who can see it or it's been deleted.</p>
              </div>
            );
          }
        })()
      )}

      {/* Post Statistics Footer */}
      <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-2">
        <span className="flex items-center gap-1 font-semibold">
          {reacts.length > 0 ? (
            <span className="flex items-center -space-x-1 mr-1">
              {Array.from(new Set(reacts.map((r: any) => r.type))).slice(0, 3).map((type: any) => (
                <span key={type} className="text-sm leading-none">{getReactionDetails(type).icon}</span>
              ))}
            </span>
          ) : (
            <ThumbsUp size={14} className="fill-[#1877F2] text-[#1877F2] mr-0.5" />
          )}
          {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
        </span>
        <span 
          className="font-medium cursor-pointer hover:underline transition"
          onClick={() => setShowCommentsList(!showCommentsList)}
        >
          {totalCommentsCount} comments
        </span>
      </div>

      {/* Interactive Action Buttons */}
      <div className="flex justify-around text-neutral-600 dark:text-neutral-300 relative border-t border-slate-200 dark:border-slate-800 pt-1 mt-1">
        <button 
          onClick={handleLike}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          className={`flex items-center justify-center gap-1.5 py-2 flex-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-sm !font-bold transition active:scale-95 cursor-pointer ${hasLiked && myReactionType ? getReactionDetails(myReactionType).color : '!text-slate-900 dark:!text-slate-100'}`}
        >
          {hasLiked && myReactionType && myReactionType !== 'like' ? (
            <span className="text-base leading-none">{getReactionDetails(myReactionType).icon}</span>
          ) : (
            <ThumbsUp size={18} className={hasLiked ? 'fill-[#1877F2] text-[#1877F2]' : '!text-slate-900 dark:!text-slate-100'} /> 
          )}
          <span className="!font-bold text-[14px] !text-slate-900 dark:!text-slate-100">{hasLiked && myReactionType ? getReactionDetails(myReactionType).name : 'Like'}</span>
        </button>
        
        <AnimatePresence>
          {showReactionPanel && (
            <ReactionPanel onSelect={handleReactionSelect} onClose={() => setShowReactionPanel(false)} />
          )}
        </AnimatePresence>

        <button 
          onClick={() => setShowCommentsList(!showCommentsList)}
          className={`flex items-center justify-center gap-2 py-2 flex-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-sm !font-bold transition active:scale-95 cursor-pointer ${showCommentsList ? 'text-[#1877F2]' : '!text-slate-900 dark:!text-slate-100'}`}
        >
          <CommentIconWithCount count={totalCommentsCount} size={20} className={showCommentsList ? '!text-[#1877F2]' : '!text-slate-900 dark:!text-slate-100'} /> <span className={`!font-bold text-[14px] ${showCommentsList ? '!text-[#1877F2]' : '!text-slate-900 dark:!text-slate-100'}`}>Comment</span>
        </button>
        <button 
          onClick={handleShare}
          className="flex items-center justify-center gap-2 py-2 flex-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-sm !font-bold transition active:scale-95 cursor-pointer !text-slate-900 dark:!text-slate-100"
        >
          <Share2 size={18} className="!text-slate-900 dark:!text-slate-100" /> <span className="!font-bold text-[14px] !text-slate-900 dark:!text-slate-100">Share</span>
        </button>
      </div>

      {/* Recursive Render Comment Function */}
      {(() => {
        const renderComment = (comment: any, depth = 0) => {
          const hasLikedComment = comment.likes?.includes(currentUser.id);
          const hasDislikedComment = comment.dislikes?.includes(currentUser.id);
          
          return (
            <div key={comment.id} className={`${depth > 0 ? 'pl-5 border-l border-neutral-100 mt-2 ml-2' : ''} space-y-1`}>
              <div className="flex gap-2.5 items-start">
                <img 
                  // FIXED ERROR 2
                  src={comment.userAvatar || "/default-avatar.png"} 
                  onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                  alt="Avatar" 
                  className="w-7 h-7 rounded-full object-cover border shrink-0 cursor-pointer hover:opacity-85 transition"
                  onClick={() => onViewProfile && onViewProfile(comment.userId)}
                />
                <div className="flex-1 min-w-0">
                  {/* Bubble content */}
                  <div 
                    className="bg-neutral-50 rounded-2xl p-2.5 border border-neutral-150/40 select-none cursor-pointer hover:bg-neutral-100 transition relative"
                    onTouchStart={(e) => handleCommentTouchStart(comment, e)}
                    onTouchEnd={handleCommentTouchEnd}
                    onTouchMove={handleCommentTouchMove}
                    onContextMenu={(e) => handleCommentContextMenu(comment, e)}
                  >
                    <div className="flex items-baseline justify-between mb-0.5 flex-wrap gap-x-2">
                      <div className="flex items-center gap-1.5">
                        <span 
                          onClick={() => onViewProfile && onViewProfile(comment.userId)}
                          className="text-xs font-bold text-neutral-900 cursor-pointer hover:underline flex items-center gap-1"
                        >
                          {comment.userFullName}
                          {users?.find((u: any) => u.id === comment.userId)?.isVerified && <BlueVerifiedTick className="w-3.5 h-3.5" />}
                        </span>
                        {comment.isPinned && (
                          <span className="flex items-center gap-0.5 text-[9px] text-[#1877F2] font-semibold bg-blue-50 px-1 rounded">
                            <Pin size={8} className="rotate-45 text-[#1877F2] fill-[#1877F2]" /> Pinned
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-neutral-400">
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Just now'}
                      </span>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="mt-1.5 space-y-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCommentId(null);
                            }}
                            className="px-2 py-1 text-[10px] font-extrabold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-md transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!editingCommentText.trim()) return;
                              try {
                                const updatedComments = updateCommentTextInArray(data.comments || [], comment.id, editingCommentText.trim());
                                const postRef = doc(db, 'rc_posts', data.id);
                                await updateDoc(postRef, { comments: updatedComments });
                                setEditingCommentId(null);
                                toast('Comment updated');
                              } catch (err) {
                                console.error('Error updating comment:', err);
                              }
                            }}
                            className="px-2.5 py-1 text-[10px] font-extrabold bg-[#1877F2] text-white rounded-md transition hover:bg-blue-600 active:scale-95"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-800 leading-relaxed break-words whitespace-pre-wrap">
                        {formatCommentText(comment.text)}
                      </p>
                    )}
                  </div>

                  {/* Actions line */}
                  <div className="flex items-center gap-3.5 mt-1 text-[10px] text-neutral-500 font-bold px-1">
                    <button 
                      onClick={() => onReactToComment && onReactToComment(data.id, comment.id, 'like')}
                      className={`flex items-center gap-1 hover:text-[#1877F2] transition ${hasLikedComment ? 'text-[#1877F2]' : ''}`}
                    >
                      <ThumbsUp size={11} className={hasLikedComment ? 'fill-[#1877F2]' : ''} />
                      <span>{comment.likes?.length || 0}</span>
                    </button>

                    <button 
                      onClick={() => onReactToComment && onReactToComment(data.id, comment.id, 'dislike')}
                      className={`flex items-center gap-1 hover:text-red-500 transition ${hasDislikedComment ? 'text-red-500' : ''}`}
                    >
                      <ThumbsDown size={11} className={hasDislikedComment ? 'fill-red-500 text-red-500' : ''} />
                      <span>{comment.dislikes?.length || 0}</span>
                    </button>

                    <button 
                      onClick={() => {
                        setReplyingToId(replyingToId === comment.id ? null : comment.id);
                        setReplyText('');
                      }}
                      className={`flex items-center gap-1 hover:text-emerald-500 transition ${replyingToId === comment.id ? 'text-emerald-500' : ''}`}
                    >
                      <Reply size={11} />
                      <span>Reply</span>
                    </button>
                  </div>

                  {/* Inline reply box */}
                  {replyingToId === comment.id && (
                    <div className="relative mt-2.5 flex gap-2 items-start pl-2 animate-fadeIn bg-neutral-50 p-2 rounded-xl border border-neutral-100">
                      <img 
                        // FIXED ERROR 2
                        src={currentUser.avatar || "/default-avatar.png"} 
                        onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                        alt="Avatar" 
                        className="w-6 h-6 rounded-full object-cover border shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="relative flex items-center bg-white rounded-lg border border-neutral-200 px-2 py-1 focus-within:border-neutral-350">
                          <textarea
                            value={replyText}
                            onChange={(e) => handleTextChange(e.target.value, 'reply')}
                            placeholder={`Reply to ${comment.userFullName}...`}
                            rows={1}
                            className="w-full bg-transparent text-xs text-neutral-900 focus:outline-none resize-none placeholder-neutral-400 py-0.5"
                          />
                          <button 
                            onClick={() => {
                              if (replyText.trim() && onReplyToComment) {
                                onReplyToComment(data.id, comment.id, replyText.trim());
                                setReplyText('');
                                setReplyingToId(null);
                                setShowMentionsFor(null);
                              }
                            }}
                            className="text-neutral-400 hover:text-emerald-500 p-1 transition rounded hover:bg-neutral-100"
                          >
                            <Send size={12} />
                          </button>
                        </div>

                        {/* Quick emoji helper */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {quickEmojis.map(emoji => (
                            <button 
                              key={emoji}
                              type="button"
                              onClick={() => handleAddEmoji(emoji, 'reply')}
                              className="text-[10px] hover:bg-neutral-100 px-1 py-0.5 rounded transition"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {/* Mentions popup inside reply */}
                        {showMentionsFor === 'reply' && filteredUsers.length > 0 && (
                          <div className="absolute left-0 top-full mt-1 w-60 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-36 overflow-y-auto z-40 p-1">
                            {filteredUsers.map((u: any) => (
                              <button
                                key={u.id}
                                onClick={() => handleSelectMention(u, 'reply')}
                                className="w-full flex items-center gap-2 p-1 hover:bg-neutral-50 rounded-lg transition text-left"
                              >
                                <img 
                                  // FIXED ERROR 2
                                  src={u.avatar || "/default-avatar.png"} 
                                  onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                                  alt={u.fullName} 
                                  className="w-4 h-4 rounded-full object-cover shrink-0" 
                                />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-bold text-neutral-850 truncate">{u.fullName}</p>
                                  <p className="text-[8px] text-neutral-400 truncate">@{u.username}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recursive Replies list */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="space-y-1.5 mt-1">
                  {comment.replies
                    .filter((reply: any) => !hiddenCommentIds.includes(reply.id))
                    .sort((a: any, b: any) => {
                      const aPinned = a.isPinned ? 1 : 0;
                      const bPinned = b.isPinned ? 1 : 0;
                      return bPinned - aPinned;
                    })
                    .map((reply: any) => renderComment(reply, depth + 1))}
                </div>
              )}
            </div>
          );
        };

        return (
          <AnimatePresence>
            {showCommentsList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 pt-4 border-t border-neutral-150/60 space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-1">
                  <h4 className="font-extrabold text-xs text-neutral-900 uppercase tracking-widest">Comments ({totalCommentsCount})</h4>
                  <button 
                    onClick={() => setShowCommentsList(false)}
                    className="text-[10px] text-neutral-400 hover:text-neutral-600 font-bold uppercase tracking-wide transition"
                  >
                    Hide
                  </button>
                </div>

                {/* List Container */}
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {(() => {
                    const visibleComments = (data.comments || [])
                      .filter((comment: any) => !hiddenCommentIds.includes(comment.id))
                      .sort((a: any, b: any) => {
                        const aPinned = a.isPinned ? 1 : 0;
                        const bPinned = b.isPinned ? 1 : 0;
                        return bPinned - aPinned;
                      });
                    
                    if (visibleComments.length === 0) {
                      return <p className="text-center py-6 text-xs text-neutral-400 font-medium">No comments yet. Start the conversation!</p>;
                    }
                    
                    return visibleComments.map((comment: any) => renderComment(comment));
                  })()}
                </div>

                {/* Main Comment Input Section */}
                <div className="relative pt-3.5 border-t border-neutral-100">
                  <div className="flex gap-3">
                    <img 
                      // FIXED ERROR 2
                      src={currentUser.avatar || "/default-avatar.png"} 
                      onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                      alt="Avatar" 
                      className="w-8 h-8 rounded-full object-cover border border-neutral-150 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="relative flex items-center bg-neutral-50 rounded-xl border border-neutral-200 focus-within:border-neutral-350 px-3 py-2">
                        <textarea
                          value={commentText}
                          onChange={(e) => handleTextChange(e.target.value, 'main')}
                          placeholder="Write a comment..."
                          rows={1}
                          className="w-full bg-transparent text-xs text-neutral-900 focus:outline-none resize-none placeholder-neutral-400 max-h-24 py-0.5"
                        />
                        <button 
                          onClick={() => {
                            if (commentText.trim() && onComment) {
                              onComment(data.id, commentText.trim());
                              setCommentText('');
                              setShowMentionsFor(null);
                            }
                          }}
                          className="text-neutral-400 hover:text-[#1877F2] p-1.5 transition rounded-full hover:bg-neutral-100 active:scale-95 shrink-0"
                        >
                          <Send size={14} />
                        </button>
                      </div>

                      {/* Quick emojis selection bar */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {quickEmojis.map(emoji => (
                          <button 
                            key={emoji}
                            type="button"
                            onClick={() => handleAddEmoji(emoji, 'main')}
                            className="text-xs hover:bg-neutral-100 px-1 py-0.5 rounded transition"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Mentions search suggestion popup */}
                      {showMentionsFor === 'main' && filteredUsers.length > 0 && (
                        <div className="absolute left-0 bottom-full mb-1 w-64 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-40 p-1">
                          {filteredUsers.map((u: any) => (
                            <button
                              key={u.id}
                              onClick={() => handleSelectMention(u, 'main')}
                              className="w-full flex items-center gap-2 p-1.5 hover:bg-neutral-50 rounded-lg transition text-left"
                            >
                              <img 
                                // FIXED ERROR 2
                                src={u.avatar || "/default-avatar.png"} 
                                onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                                alt={u.fullName} 
                                className="w-5 h-5 rounded-full object-cover shrink-0" 
                              />
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-neutral-850 truncate">{u.fullName}</p>
                                <p className="text-[9px] text-neutral-400 truncate">@{u.username}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );
      })()}

      {/* Long-press Comment Options Menu / Bottom Sheet */}
      <AnimatePresence>
        {isCommentMenuOpen && selectedComment && (
          <>
            {/* Backdrop overlay to dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[1px]"
              onClick={() => setIsCommentMenuOpen(false)}
            />

            {contextMenuPos ? (
              /* Desktop Context Menu */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{ 
                  position: 'fixed',
                  left: Math.min(contextMenuPos.x, window.innerWidth - 220),
                  top: Math.min(contextMenuPos.y, window.innerHeight - 360),
                }}
                className="w-52 bg-white border border-neutral-200 rounded-2xl shadow-2xl z-55 p-1.5 text-neutral-800 flex flex-col pointer-events-auto"
              >
                {/* Copy Comment */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedComment.text);
                    toast('Comment copied');
                    setIsCommentMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold hover:bg-neutral-50 rounded-xl transition cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>Copy Comment</span>
                </button>

                {/* Reply */}
                <button
                  onClick={() => {
                    setReplyingToId(selectedComment.id);
                    setReplyText('');
                    setIsCommentMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold hover:bg-neutral-50 rounded-xl transition cursor-pointer"
                >
                  <Reply className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>Reply</span>
                </button>

                {/* Edit */}
                {currentUser.id === selectedComment.userId && (
                  <button
                    onClick={() => {
                      setEditingCommentId(selectedComment.id);
                      setEditingCommentText(selectedComment.text);
                      setIsCommentMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold hover:bg-neutral-50 rounded-xl transition cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>Edit Comment</span>
                  </button>
                )}

                {/* Delete */}
                {currentUser.id === selectedComment.userId && (
                  <button
                    onClick={async () => {
                      try {
                        const updated = deleteCommentInArray(data.comments || [], selectedComment.id);
                        const postRef = doc(db, 'rc_posts', data.id);
                        await updateDoc(postRef, { comments: updated });
                        toast('Comment deleted');
                        setIsCommentMenuOpen(false);
                      } catch (err) {
                        console.error('Error deleting comment:', err);
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold hover:bg-red-50 text-red-500 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Delete Comment</span>
                  </button>
                )}

                {/* Pin Comment */}
                {(currentUser.id === data.userId || currentUser.isAdmin || currentUser.role === 'admin') && (
                  <button
                    onClick={async () => {
                      try {
                        const updated = togglePinCommentInArray(data.comments || [], selectedComment.id);
                        const postRef = doc(db, 'rc_posts', data.id);
                        await updateDoc(postRef, { comments: updated });
                        toast(selectedComment.isPinned ? 'Comment unpinned' : 'Comment pinned');
                        setIsCommentMenuOpen(false);
                      } catch (err) {
                        console.error('Error pinning comment:', err);
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold hover:bg-neutral-50 rounded-xl transition cursor-pointer"
                  >
                    <Pin className={`w-4 h-4 shrink-0 ${selectedComment.isPinned ? 'text-[#1877F2] fill-[#1877F2]' : 'text-neutral-400'}`} />
                    <span>{selectedComment.isPinned ? 'Unpin Comment' : 'Pin Comment'}</span>
                  </button>
                )}

                {/* Report Comment */}
                <button
                  onClick={() => {
                    setShowCommentReportModal(true);
                    setReportReason('Spam');
                    setReportDetails('');
                    setIsCommentMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold hover:bg-neutral-50 rounded-xl transition cursor-pointer"
                >
                  <Flag className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>Report Comment</span>
                </button>

                {/* Hide Comment */}
                <button
                  onClick={() => {
                    setHiddenCommentIds(prev => [...prev, selectedComment.id]);
                    toast('Comment hidden');
                    setIsCommentMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold hover:bg-neutral-50 rounded-xl transition cursor-pointer"
                >
                  <EyeOff className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>Hide Comment</span>
                </button>

                {/* View Profile */}
                <button
                  onClick={() => {
                    if (onViewProfile) onViewProfile(selectedComment.userId);
                    setIsCommentMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold hover:bg-neutral-50 rounded-xl transition cursor-pointer"
                >
                  <User className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>View Profile</span>
                </button>

                {/* Cancel */}
                <div className="border-t border-neutral-100 mt-1 pt-1">
                  <button
                    onClick={() => setIsCommentMenuOpen(false)}
                    className="w-full px-3 py-1.5 text-center text-xs font-bold hover:bg-neutral-100 rounded-xl transition cursor-pointer text-neutral-500"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Mobile Bottom Sheet */
              <div className="fixed inset-0 z-55 flex items-end justify-center p-0 pointer-events-none">
                <motion.div
                  initial={{ y: '100%', opacity: 0.5 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0.5 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="pointer-events-auto w-full max-w-md bg-white border-t border-neutral-200 rounded-t-3xl p-5 pb-8 shadow-2xl text-neutral-800 flex flex-col"
                >
                  {/* Drag Handle indicator */}
                  <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-5" />

                  <div className="flex justify-between items-center mb-4 border-b border-neutral-100 pb-3">
                    <h3 className="text-sm font-extrabold text-neutral-900">Comment Options</h3>
                    <button 
                      onClick={() => setIsCommentMenuOpen(false)}
                      className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-50 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[60vh] pr-0.5">
                    {/* Copy Comment */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedComment.text);
                        toast('Comment copied');
                        setIsCommentMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-neutral-50 rounded-xl transition text-neutral-700 cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>Copy Comment</span>
                    </button>

                    {/* Reply */}
                    <button
                      onClick={() => {
                        setReplyingToId(selectedComment.id);
                        setReplyText('');
                        setIsCommentMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-neutral-50 rounded-xl transition text-neutral-700 cursor-pointer"
                    >
                      <Reply className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>Reply</span>
                    </button>

                    {/* Edit */}
                    {currentUser.id === selectedComment.userId && (
                      <button
                        onClick={() => {
                          setEditingCommentId(selectedComment.id);
                          setEditingCommentText(selectedComment.text);
                          setIsCommentMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-neutral-50 rounded-xl transition text-neutral-700 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4 text-neutral-400 shrink-0" />
                        <span>Edit Comment</span>
                      </button>
                    )}

                    {/* Delete */}
                    {currentUser.id === selectedComment.userId && (
                      <button
                        onClick={async () => {
                          try {
                            const updated = deleteCommentInArray(data.comments || [], selectedComment.id);
                            const postRef = doc(db, 'rc_posts', data.id);
                            await updateDoc(postRef, { comments: updated });
                            toast('Comment deleted');
                            setIsCommentMenuOpen(false);
                          } catch (err) {
                            console.error('Error deleting comment:', err);
                          }
                        }}
                        className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-red-50 rounded-xl transition text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                        <span>Delete Comment</span>
                      </button>
                    )}

                    {/* Pin Comment */}
                    {(currentUser.id === data.userId || currentUser.isAdmin || currentUser.role === 'admin') && (
                      <button
                        onClick={async () => {
                          try {
                            const updated = togglePinCommentInArray(data.comments || [], selectedComment.id);
                            const postRef = doc(db, 'rc_posts', data.id);
                            await updateDoc(postRef, { comments: updated });
                            toast(selectedComment.isPinned ? 'Comment unpinned' : 'Comment pinned');
                            setIsCommentMenuOpen(false);
                          } catch (err) {
                            console.error('Error pinning comment:', err);
                          }
                        }}
                        className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-neutral-50 rounded-xl transition text-neutral-700 cursor-pointer"
                      >
                        <Pin className={`w-4 h-4 shrink-0 ${selectedComment.isPinned ? 'text-[#1877F2] fill-[#1877F2]' : 'text-neutral-400'}`} />
                        <span>{selectedComment.isPinned ? 'Unpin Comment' : 'Pin Comment'}</span>
                      </button>
                    )}

                    {/* Report Comment */}
                    <button
                      onClick={() => {
                        setShowCommentReportModal(true);
                        setReportReason('Spam');
                        setReportDetails('');
                        setIsCommentMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-neutral-50 rounded-xl transition text-neutral-700 cursor-pointer"
                    >
                      <Flag className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>Report Comment</span>
                    </button>

                    {/* Hide Comment */}
                    <button
                      onClick={() => {
                        setHiddenCommentIds(prev => [...prev, selectedComment.id]);
                        toast('Comment hidden');
                        setIsCommentMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-neutral-50 rounded-xl transition text-neutral-700 cursor-pointer"
                    >
                      <EyeOff className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>Hide Comment</span>
                    </button>

                    {/* View Profile */}
                    <button
                      onClick={() => {
                        if (onViewProfile) onViewProfile(selectedComment.userId);
                        setIsCommentMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-neutral-50 rounded-xl transition text-neutral-700 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>View Profile</span>
                    </button>
                  </div>

                  {/* Cancel Button */}
                  <div className="border-t border-neutral-100 mt-4 pt-3">
                    <button
                      onClick={() => setIsCommentMenuOpen(false)}
                      className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-sm font-extrabold transition text-neutral-700 text-center cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Comment Report Modal overlay */}
      <AnimatePresence>
        {showCommentReportModal && selectedComment && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-55 flex items-center justify-center p-4 backdrop-blur-[2px]"
              onClick={() => setShowCommentReportModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md text-neutral-850 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4 border-b border-neutral-100 pb-3">
                  <h3 className="text-base font-extrabold text-neutral-900">Report Comment</h3>
                  <button onClick={() => setShowCommentReportModal(false)} className="text-neutral-400 hover:text-neutral-600 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Reason</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none text-neutral-800"
                    >
                      <option value="Spam">Spam / Advertising</option>
                      <option value="Harassment">Harassment / Hate speech</option>
                      <option value="Inappropriate">Inappropriate content</option>
                      <option value="Intellectual Property">Intellectual property violation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Additional details</label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Please provide any context or details..."
                      rows={3}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none resize-none text-neutral-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowCommentReportModal(false)}
                    className="px-4 py-2 text-xs font-extrabold text-neutral-500 hover:bg-neutral-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await submitCommentReportToFirestore(
                          data.id,
                          selectedComment.id,
                          currentUser.id,
                          reportReason,
                          reportDetails,
                          []
                        );
                        toast('Report submitted successfully');
                        setShowCommentReportModal(false);
                      } catch (err) {
                        console.error('Error submitting report:', err);
                        toast('Failed to submit report');
                      }
                    }}
                    className="px-5 py-2 text-xs font-extrabold bg-red-500 hover:bg-red-600 text-white rounded-xl transition shadow-md active:scale-95"
                  >
                    Submit Report
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
        {/* Post Options Menu / Bottom Sheet */}
        <AnimatePresence>
          {isPostMenuOpen && (() => {
            const isOwner = !!(
              currentUser &&
              data &&
              (
                (currentUser.uid && data.ownerId && currentUser.uid === data.ownerId) ||
                (currentUser.id && data.userId && currentUser.id === data.userId) ||
                (currentUser.uid && data.userId && currentUser.uid === data.userId) ||
                (currentUser.id && data.ownerId && currentUser.id === data.ownerId)
              )
            );

            return (
              <>
                {/* Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsPostMenuOpen(false)}
                  className="fixed inset-0 bg-black/50 z-50 transition-opacity"
                />
                
                {/* Bottom Sheet */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
                  style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
                >
                  <div className="p-4">
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
                    
                    <div className="flex flex-col space-y-1">
                      {/* Interested / Not Interested / Report - Safe public non-admin options */}
                      {!isOwner && (
                        <>
                          <button
                            onClick={() => {
                              if (confirm('Most of your post will be like this')) {
                                setIsInterested(true);
                                setIsPostMenuOpen(false);
                                toast('Marked as interested');
                              }
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <ThumbsUp className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Interested</span>
                              <span className="text-[11px] text-slate-500">Show more posts like this</span>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              setIsPostMenuOpen(false);
                              setHidePostState(true);
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Not interested</span>
                              <span className="text-[11px] text-slate-500">Show fewer posts like this</span>
                            </div>
                          </button>

                          <button
                            onClick={toggleNotifications}
                            className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left w-full"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                {notificationsOn ? (
                                  <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                                ) : (
                                  <BellOff className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Turn {notificationsOn ? 'off' : 'on'} notifications</span>
                                <span className="text-[11px] text-slate-500">For this post</span>
                              </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full transition-colors relative ${notificationsOn ? 'bg-[#1877F2]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                              <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-transform ${notificationsOn ? 'right-1 translate-x-0' : 'left-1 translate-x-0'}`} />
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              setIsPostMenuOpen(false);
                              window.dispatchEvent(new CustomEvent('open-report-post', { detail: { postId: data.id } }));
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <Flag className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Report post</span>
                              <span className="text-[11px] text-slate-500">I'm concerned about this post</span>
                            </div>
                          </button>
                        </>
                      )}

                      <button
                        onClick={async () => {
                          setIsPostMenuOpen(false);
                          if (onSavePost) {
                              await onSavePost(data.id);
                              setIsSaved(!isSaved);
                              toast(isSaved ? 'Post unsaved' : 'Post saved');
                          }
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <Bookmark className={`w-5 h-5 text-slate-700 dark:text-slate-300 ${isSaved ? 'fill-current' : ''}`} />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">{isSaved ? 'Unsave post' : 'Save post'}</span>
                          <span className="text-[11px] text-slate-500">{isSaved ? 'Remove from saved items' : 'Add this to your saved items'}</span>
                        </div>
                      </button>

                      {/* Owner-only administrative options */}
                      {isOwner && (
                        <>
                          <button
                            onClick={async () => {
                              const isPinned = !!data.pinned;
                              await updateDoc(doc(db, 'rc_posts', data.id), {
                                pinned: !isPinned,
                                pinnedAt: !isPinned ? Date.now() : null
                              });
                              setIsPostMenuOpen(false);
                              toast(!isPinned ? 'Post pinned' : 'Post unpinned');
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <Pin className={`w-5 h-5 text-slate-700 dark:text-slate-300 ${data.pinned ? 'fill-current' : ''}`} />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">{data.pinned ? 'Unpin post' : 'Pin post'}</span>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => {
                              setIsPostMenuOpen(false);
                              window.dispatchEvent(new CustomEvent('edit-post', { detail: { postId: data.id } }));
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <Edit3 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Edit post</span>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              setIsPostMenuOpen(false);
                              window.dispatchEvent(new CustomEvent('edit-comment-privacy', { detail: { postId: data.id } }));
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <MessageCircle className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Who can comment</span>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              setIsPostMenuOpen(false);
                              setShowPrivacyModalForId(data.id);
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <Lock className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Edit Privacy</span>
                            </div>
                          </button>

                          <button
                            onClick={async () => {
                              await updateDoc(doc(db, 'rc_posts', data.id), { inTrash: true });
                              setIsPostMenuOpen(false);
                              toast('Post moved to trash');
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                              <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-rose-600 dark:text-rose-400 block">Move to trash</span>
                            </div>
                          </button>

                          <button
                            onClick={toggleNotifications}
                            className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left w-full"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                {notificationsOn ? (
                                  <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                                ) : (
                                  <BellOff className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Turn {notificationsOn ? 'off' : 'on'} notifications</span>
                                <span className="text-[11px] text-slate-500">For this post</span>
                              </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full transition-colors relative ${notificationsOn ? 'bg-[#1877F2]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                              <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-transform ${notificationsOn ? 'right-1 translate-x-0' : 'left-1 translate-x-0'}`} />
                            </div>
                          </button>

                        </>
                      )}

                      {/* Copy link - Safe public option */}
                      <button
                        onClick={() => {
                          setIsPostMenuOpen(false);
                          toast('You have copied this post link');
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <Link2 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Copy link</span>
                          <span className="text-[11px] text-slate-500">Copy link to clipboard</span>
                        </div>
                      </button>
                    </div>
                    
                    <div className="border-t border-slate-100 dark:border-slate-800 mt-4 pt-3">
                      <button
                        onClick={() => setIsPostMenuOpen(false)}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl text-sm font-extrabold transition text-slate-700 dark:text-slate-300 text-center cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
                {/* Privacy Modal */}
                {showPrivacyModalForId && (
                  <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPrivacyModalForId(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                      <h3 className="font-black text-lg mb-4 text-slate-900 dark:text-slate-100">Who can see your post?</h3>
                      {['public', 'followers', 'close_friends', 'only_me'].map((opt) => (
                        <button 
                          key={opt}
                          onClick={() => handleUpdatePrivacy(showPrivacyModalForId, opt as any)}
                          className="w-full text-left p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 capitalize text-slate-900 dark:text-slate-100"
                        >
                          {opt.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </AnimatePresence>
      </>
      )}
    </div>
  );
}
