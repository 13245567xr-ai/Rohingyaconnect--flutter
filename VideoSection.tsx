import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Share2, Plus, MessageSquare, MoreHorizontal, Check, Search, Calendar, Heart, Play, ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Reel, Post, User, ReactionType, Comment } from '../types';
import CustomVideoPlayer from './CustomVideoPlayer';
import VideoToolsSheet from './VideoToolsSheet';
import CommentIconWithCount from './CommentIconWithCount';
import { ReactionPanel, getReactionDetails, REACTION_OPTIONS } from './ReactionPanel';
import { addCommentToPostInFirestore } from '../utils/firebaseSync';
import VerticalVideoPlayer from './VerticalVideoPlayer';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface VideoSectionProps {
  reels: Reel[];
  posts: Post[];
  currentUser: User;
  users: User[];
  onAddPost: (content: string, image?: string, videoUrl?: string, isVideo?: boolean) => void;
  onReactToPost: (postId: string, reactionType: ReactionType) => void;
  onViewProfile: (userId: string) => void;
  onFollowToggle: (userId: string) => void;
  onSharePost: (postId: string) => void;
  activeVideoId?: string | null;
  onCloseVideo?: () => void;
  onOpenCreatePostModal?: (options?: { isVideo?: boolean; videoUrl?: string; description?: string }) => void;
}

export default function VideoSection({
  reels,
  posts,
  currentUser,
  users,
  onAddPost,
  onReactToPost,
  onViewProfile,
  onFollowToggle,
  onSharePost,
  activeVideoId,
  onCloseVideo,
  onOpenCreatePostModal
}: VideoSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeToolsVideo, setActiveToolsVideo] = useState<{ id: string; url: string } | null>(null);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [fullScreenVideoId, setFullScreenVideoId] = useState<string | null>(null);

  const currentActiveVideoId = activeVideoId || fullScreenVideoId;

  // Filter and compute community videos (posts where isVideo is true or has a valid videoUrl)
  const videoPosts = useMemo(() => {
    let filtered = posts.filter(p => p.isVideo || p.videoUrl);

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.content || '').toLowerCase().includes(q) || 
        (p.userFullName || '').toLowerCase().includes(q)
      );
    }

    // Sort by latest created
    return [...filtered].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [posts, searchQuery]);

  if (currentActiveVideoId) {
    return (
      <VerticalVideoPlayer
        initialVideoId={currentActiveVideoId}
        videoPool={videoPosts}
        currentUser={currentUser}
        users={users}
        isOverlay={true}
        onClose={() => {
          if (activeVideoId && onCloseVideo) {
            onCloseVideo();
          } else {
            setFullScreenVideoId(null);
          }
        }}
        onViewProfile={onViewProfile}
        onFollowToggle={onFollowToggle}
        onSharePost={onSharePost}
        onUseAudio={(audio) => {
          if (onOpenCreatePostModal) {
            onOpenCreatePostModal({
              isVideo: true,
              description: `Check out this video with audio: ${audio.title} #${audio.artist.replace(/\s+/g, '')}`
            });
          }
        }}
      />
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-12 text-slate-850 dark:text-slate-150 transition-colors duration-200">
      
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/80 p-5 md:p-6 mb-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              📺 Community Videos
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Explore educational guides, community event recordings, and media shared by RohingyaConnect members.
            </p>
          </div>
          <button
            onClick={() => {
              if (onOpenCreatePostModal) {
                onOpenCreatePostModal({ isVideo: true });
              }
            }}
            className="self-start md:self-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center gap-2 transition hover:scale-102 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Share Community Video
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-0">
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search videos or creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-850 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium shadow-sm placeholder-slate-450"
          />
        </div>

        {/* Video Posts Stream */}
        <div className="space-y-6">
          {videoPosts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
              <p className="text-slate-400 text-sm font-semibold">No community videos found matching your query.</p>
              <button 
                onClick={() => setSearchQuery('')} 
                className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            videoPosts.map((video) => {
              const foundUser = users.find(u => u.id === video.userId);
              const creator = {
                id: video.userId,
                fullName: foundUser?.fullName || video.userFullName || 'Anonymous',
                avatar: foundUser?.avatar || video.userAvatar || 'https://i.pravatar.cc/150?u=anon',
                username: (foundUser?.username || video.userFullName || 'user').toLowerCase().replace(/\s+/g, ''),
                isVerified: foundUser?.isVerified || false,
                invitesCount: foundUser?.invitesCount || 0
              };
              return (
                <VideoPostCard
                  key={video.id}
                  video={video}
                  creator={creator as User}
                  currentUser={currentUser}
                  users={users}
                  onReactToPost={onReactToPost}
                  onViewProfile={onViewProfile}
                  onSharePost={onSharePost}
                  onOpenTools={(url) => setActiveToolsVideo({ id: video.id, url })}
                  isCommentsExpanded={expandedCommentsPostId === video.id}
                  onToggleComments={() => setExpandedCommentsPostId(expandedCommentsPostId === video.id ? null : video.id)}
                  onOpenFullScreen={() => setFullScreenVideoId(video.id)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Floating Video Tools Settings Overlay (Report, Playback settings, Cache etc.) */}
      {activeToolsVideo && (
        <VideoToolsSheet
          videoId={activeToolsVideo.id}
          videoUrl={activeToolsVideo.url}
          onClose={() => setActiveToolsVideo(null)}
        />
      )}
    </div>
  );
}

/* Card item rendered for each video post */
function VideoPostCard({
  video,
  creator,
  currentUser,
  users,
  onReactToPost,
  onViewProfile,
  onSharePost,
  onOpenTools,
  isCommentsExpanded,
  onToggleComments,
  onOpenFullScreen
}: {
  video: Post;
  creator: User;
  currentUser: User;
  users: User[];
  onReactToPost: (postId: string, reactionType: ReactionType) => void;
  onViewProfile: (userId: string) => void;
  onSharePost: (postId: string) => void;
  onOpenTools: (url: string) => void;
  isCommentsExpanded: boolean;
  onToggleComments: () => void;
  onOpenFullScreen: () => void;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>(video.comments || []);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const lastVideoTap = useRef<number>(0);
  const videoClickTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastVideoTap.current < DOUBLE_PRESS_DELAY) {
      if (videoClickTimeout.current) {
        clearTimeout(videoClickTimeout.current);
        videoClickTimeout.current = null;
      }
      onReactToPost(video.id, 'like');
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 800);
    } else {
      lastVideoTap.current = now;
      videoClickTimeout.current = setTimeout(() => {
        onOpenFullScreen();
        videoClickTimeout.current = null;
      }, DOUBLE_PRESS_DELAY);
    }
  };

  useEffect(() => {
    setLocalComments(video.comments || []);
  }, [video.comments]);

  // Check if current user has reacted to this post
  const userReaction = useMemo(() => {
    return video.reactions?.find(r => r.userId === currentUser.id);
  }, [video.reactions, currentUser.id]);

  const activeReaction = getReactionDetails(userReaction?.type);

  const formattedDate = useMemo(() => {
    if (!video.createdAt) return '';
    try {
      const date = new Date(video.createdAt);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  }, [video.createdAt]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      await addCommentToPostInFirestore(video.id, {
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        userAvatar: currentUser.avatar,
        text: commentText.trim(),
        createdAt: new Date().toISOString()
      }, video.userId);
      setCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden p-4 md:p-5 flex flex-col text-left">
      
      {/* Post Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3">
          <img
            onClick={() => onViewProfile(creator.id)}
            src={creator.avatar}
            alt={creator.fullName}
            className="w-10 h-10 rounded-full object-cover border border-emerald-500/25 shadow-sm cursor-pointer"
            referrerPolicy="no-referrer"
          />
          <div>
            <h4 
              onClick={() => onViewProfile(creator.id)}
              className="text-xs font-black text-slate-900 dark:text-white cursor-pointer hover:underline flex items-center gap-1"
            >
              {creator.fullName}
              {(creator.isVerified || (creator.invitesCount || 0) >= 5) && (
                <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />
              )}
            </h4>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
              <span>@{creator.username || 'user'}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Calendar className="w-3 h-3" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* 3 dots trigger for Tools Sheet */}
        <button
          onClick={() => onOpenTools(video.videoUrl || '')}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
          title="Video Tools & Settings"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs font-normal text-slate-700 dark:text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap select-text">
        {video.content}
      </p>

      {/* Video Player Frame */}
      {video.videoUrl && (
        <div 
          onClick={handleVideoClick}
          className="relative rounded-2xl overflow-hidden aspect-[9/16] max-h-[500px] mx-auto w-full bg-black mb-4 border border-slate-100 dark:border-slate-800 shadow-inner group cursor-pointer"
        >
          {!videoError ? (
            <>
              <video 
                src={video.videoUrl} 
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

              {/* Floating heart overlay */}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center">
              <span className="text-xs font-bold text-slate-200">Video Temporarily Unavailable</span>
              <span className="text-[10px] text-slate-500 mt-1">Please check your network connection</span>
            </div>
          )}
        </div>
      )}

      {/* Reaction Counts info bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full font-bold">
            👍 {video.reactions?.length || 0}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onToggleComments} className="hover:underline">
            {localComments.length} {localComments.length === 1 ? 'comment' : 'comments'}
          </button>
        </div>
      </div>

      {/* Action Buttons Strip */}
      <div className="flex items-center justify-between pt-2.5 relative">
        {/* React Button */}
        <div 
          className="relative flex-1"
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          <button
            onClick={() => onReactToPost(video.id, 'like')}
            className={`w-full py-2 flex items-center justify-center gap-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-xs font-bold ${
              userReaction ? activeReaction.color : 'text-slate-500'
            }`}
          >
            <span>{userReaction ? activeReaction.icon : '👍'}</span>
            <span>{userReaction ? activeReaction.name : 'Like'}</span>
          </button>

          {/* Pop-up Reaction Panel on Hover */}
          <AnimatePresence>
            {showReactions && (
              <div className="absolute bottom-11 left-4 z-50">
                <ReactionPanel 
                  onSelect={(type) => {
                    onReactToPost(video.id, type as ReactionType);
                    setShowReactions(false);
                  }}
                  onClose={() => setShowReactions(false)}
                />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Comment Button */}
        <button
          onClick={onToggleComments}
          className="flex-1 py-2 flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-750 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-xs font-bold"
        >
          <CommentIconWithCount count={localComments.length} size={16} />
          <span>Comment</span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => onSharePost(video.id)}
          className="flex-1 py-2 flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-750 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-xs font-bold"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
      </div>

      {/* Slide-down Interactive Comments Thread */}
      <AnimatePresence>
        {isCommentsExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-800"
          >
            {/* List of comments */}
            <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1 mb-4">
              {localComments.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-2">No comments shared yet. Be the first!</p>
              ) : (
                localComments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5 text-xs select-text">
                    <img
                      src={comment.userAvatar}
                      alt={comment.userFullName}
                      className="w-7 h-7 rounded-full object-cover mt-0.5"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-grow bg-slate-50 dark:bg-slate-850 p-2.5 rounded-2xl">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          {comment.userFullName}
                          {users.find(u => u.id === comment.userId)?.isVerified && <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-350 leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input form */}
            <form onSubmit={handlePostComment} className="flex gap-2 pt-1">
              <input
                type="text"
                required
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write an educational comment..."
                className="flex-grow px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-850 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
              />
              <button
                type="submit"
                disabled={isSubmittingComment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
