import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Globe, 
  UserCheck, 
  Lock, 
  MessageCircle, 
  ChevronRight, 
  Upload, 
  Check, 
  X, 
  Music, 
  MapPin, 
  Users,
  Heart,
  EyeOff,
  Eye,
  Search
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { addPostToFirestore, addNotificationToFirestore } from '../utils/firebaseSync';
import { usePostCreationStore } from './CreatePostScreen';

interface PostSettingsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  currentUser?: any;
  onClose?: () => void;
  onPostCreated?: (post: any) => void;
}

export default function PostSettingsScreen({ navigation, currentUser, onClose, onPostCreated }: PostSettingsScreenProps) {
  const [postState, setPostState] = usePostCreationStore();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showFriendSelection, setShowFriendSelection] = useState<string | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const authorName = currentUser?.fullName || "Pro Rashed";
  const authorAvatar = currentUser?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";

  // onPress Upload: Save post to Firebase 'posts' collection + send notification "Uploaded your post"
  const handlePressUpload = async () => {
    if (!postState.text.trim() && !postState.mediaUrl) {
      alert("Please add some text or media before uploading.");
      return;
    }

    setUploading(true);
    try {
      const isEditing = !!postState.postIdToEdit;

      if (isEditing && postState.postIdToEdit) {
        const postRef = doc(db, 'rc_posts', postState.postIdToEdit);
        await updateDoc(postRef, {
          content: postState.text || '',
          image: !postState.isVideo ? postState.mediaUrl : undefined,
          videoUrl: postState.isVideo ? postState.mediaUrl : undefined,
          isVideo: !!postState.isVideo,
          taggedUsers: (postState.taggedUsers || []).map(u => u.name),
          location: postState.location || undefined,
          music: postState.music ? `${postState.music.title} - ${postState.music.artist}` : undefined,
          privacy: postState.privacy,
          whoCanComment: postState.whoCanComment,
        });

        // Reset store
        postState.text = '';
        postState.mediaUrl = undefined;
        postState.isVideo = false;
        postState.music = undefined;
        postState.taggedUsers = [];
        postState.location = undefined;
        postState.postIdToEdit = undefined;

        alert("Post updated successfully!");

        if (onClose) {
          onClose();
        } else {
          navigation.goBack();
        }
        return;
      }

      const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const newPostData = {
        id: postId,
        userId: currentUser?.id || 'user-1',
        authorName: authorName,
        authorAvatar: authorAvatar,
        content: postState.text || '',
        image: !postState.isVideo ? postState.mediaUrl : undefined,
        videoUrl: postState.isVideo ? postState.mediaUrl : undefined,
        isVideo: !!postState.isVideo,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: [],
        reactions: {},
        taggedUsers: (postState.taggedUsers || []).map(u => u.name),
        location: postState.location || undefined,
        music: postState.music ? `${postState.music.title} - ${postState.music.artist}` : undefined,
        privacy: postState.privacy,
        whoCanComment: postState.whoCanComment,
      };

      // 1. Save post to Firebase 'posts' collection
      try {
        await addDoc(collection(db, 'posts'), newPostData);
      } catch (err) {
        console.warn("Error saving to 'posts' collection:", err);
      }

      // Also save to 'rc_posts' via app sync helper so the live UI feed updates immediately
      try {
        await addPostToFirestore(newPostData as any);
      } catch (err) {
        console.warn("Error saving via addPostToFirestore:", err);
      }

      // 2. Send notification "Uploaded your post"
      const notifData = {
        userId: currentUser?.id || 'user-1',
        senderId: currentUser?.id || 'user-1',
        senderName: authorName,
        senderAvatar: authorAvatar,
        type: 'system',
        text: 'Uploaded your post',
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      try {
        await addDoc(collection(db, 'notifications'), notifData);
      } catch (err) {
        console.warn("Error saving to 'notifications' collection:", err);
      }

      try {
        await addNotificationToFirestore(notifData as any);
      } catch (err) {
        console.warn("Error saving via addNotificationToFirestore:", err);
      }

      // Trigger callback if passed from feed
      if (onPostCreated) {
        onPostCreated(newPostData);
      }

      // Reset store
      postState.text = '';
      postState.mediaUrl = undefined;
      postState.isVideo = false;
      postState.music = undefined;
      postState.taggedUsers = [];
      postState.location = undefined;

      alert("Uploaded your post");

      // Navigate back / close
      if (onClose) {
        onClose();
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Something went wrong while uploading your post.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Bar with Upload button right */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onClose ? onClose() : navigation.goBack()}
            disabled={uploading}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition disabled:opacity-50"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Post Settings</h1>
        </div>

        {/* Top right: Upload button */}
        <button
          onClick={handlePressUpload}
          disabled={uploading || (!postState.text.trim() && !postState.mediaUrl)}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1877F2] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition shadow-sm"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full flex flex-col gap-6">
        
        {/* Title: Who can see my post */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#1877F2]" />
            Who can see my post
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Your post will appear in Feed, on your profile, and in search results depending on this selection.
          </p>

          {/* Privacy Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { id: 'Public', icon: Globe, desc: 'Anyone on or off app' },
              { id: 'Friends/Followers', icon: UserCheck, desc: 'Your connected followers' },
              { id: 'Close friends', icon: Heart, desc: 'Your close friends list' },
              { id: 'Don\'t show to...', icon: EyeOff, desc: 'Hide from specific people' },
              { id: 'Only show to...', icon: Eye, desc: 'Show to specific people' },
              { id: 'Only me', icon: Lock, desc: 'Visible only to you' }
            ].map(opt => {
              const Icon = opt.icon;
              const isSelected = postState.privacy === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (opt.id === 'Only show to...' || opt.id === 'Don\'t show to...') {
                      setShowFriendSelection(opt.id);
                    } else {
                      setPostState({ privacy: opt.id as any });
                    }
                  }}
                  className={`flex flex-col items-start p-3.5 rounded-2xl border transition cursor-pointer text-left ${isSelected ? 'bg-blue-50/80 dark:bg-blue-950/40 border-[#1877F2] ring-1 ring-[#1877F2]' : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[#1877F2]' : 'text-slate-500'}`} />
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#1877F2] text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{opt.id}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row: Who can Comment -> tap opens modal with: Public, Followers, Profile you mention */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div 
            onClick={() => setShowCommentModal(true)}
            className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl transition -m-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#1877F2] flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 block">Who can comment</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">Choose who is allowed to reply to this post</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-[#1877F2]">
              <span>{postState.whoCanComment}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Post Summary Preview */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">Post Preview</span>
          
          <div className="flex items-center gap-3 mb-3">
            <img src={authorAvatar} alt={authorName} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
            <div>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">{authorName}</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>{postState.privacy}</span>
                {postState.location && <span>• 📍 {postState.location}</span>}
              </div>
            </div>
          </div>

          {postState.text && (
            <p className="text-sm text-slate-800 dark:text-slate-200 mb-3 whitespace-pre-line leading-relaxed">{postState.text}</p>
          )}

          {postState.mediaUrl && (
            <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 max-h-48 flex items-center justify-center mb-3">
              {postState.isVideo ? (
                <video src={postState.mediaUrl} className="max-h-48 object-contain" />
              ) : (
                <img src={postState.mediaUrl} alt="Preview" className="max-h-48 object-contain" />
              )}
            </div>
          )}

          {(postState.music || (postState.taggedUsers && postState.taggedUsers.length > 0)) && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              {postState.music && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-semibold">
                  <Music className="w-3 h-3" /> {postState.music.title}
                </span>
              )}
              {postState.taggedUsers && postState.taggedUsers.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold">
                  <Users className="w-3 h-3" /> With {postState.taggedUsers.length} people
                </span>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Modal: Who can Comment -> tap opens modal with: Public, Followers, Profile you mention */}
      {showCommentModal && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#1877F2]" />
                Who can comment?
              </h3>
              <button onClick={() => setShowCommentModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Public', desc: 'Anyone can reply to your post' },
                { label: 'Followers', desc: 'Only your followers can reply' },
                { label: 'Profile you mention', desc: 'Only accounts tagged or mentioned can reply' },
              ].map((opt) => {
                const isSelected = postState.whoCanComment === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setPostState({ whoCanComment: opt.label as any });
                      setShowCommentModal(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer text-left ${isSelected ? 'bg-blue-50 dark:bg-blue-950/30 border-[#1877F2]' : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">{opt.label}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">{opt.desc}</span>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#1877F2] text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowCommentModal(false)}
              className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-750 transition mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}


      {/* Friend Selection Modal */}
      {showFriendSelection && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                {showFriendSelection}
              </h3>
              <button onClick={() => setShowFriendSelection(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input 
                  type="text" 
                  placeholder="Search friends..." 
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-9 pr-4 text-sm focus:ring-2 focus:ring-[#1877F2] outline-none dark:text-white"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-2 flex-1">
              {['Hossain Ali', 'Aisha Begum', 'Mohammed Rahman', 'Fatima Khatun', 'Ali Akbar'].map((friendName, idx) => {
                const id = `mock_${idx}`;
                const isSelected = selectedFriends.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFriends(selectedFriends.filter(fid => fid !== id));
                      } else {
                        setSelectedFriends([...selectedFriends, id]);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-300">
                        {friendName.charAt(0)}
                      </div>
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{friendName}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${isSelected ? 'bg-[#1877F2] border-[#1877F2] text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
              <button
                onClick={() => {
                  setPostState({ privacy: showFriendSelection as any });
                  setShowFriendSelection(null);
                }}
                className="w-full py-3 rounded-xl bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-sm transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

