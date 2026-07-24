import React, { useState, useRef, useEffect } from 'react';
import { 
  motion, AnimatePresence 
} from 'motion/react';
import { 
  X, Copy, Check, MessageSquare, Send, Globe, Users, Bookmark, 
  Share2, Compass, Layers, QrCode, Eye, Heart, Smile, MoreHorizontal, 
  Sparkles, Plus, Search, Image as ImageIcon, ShieldAlert, CheckCircle,
  Smartphone, Volume2, ArrowRight
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { User, Post, type Notification } from '../types';
import { addNotificationToFirestore, addPostToFirestore } from '../utils/firebaseSync';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface ShareOverlayProps {
  isOpen: boolean;
  postId?: string | null;
  profileId?: string | null;
  postContent?: string;
  imageUrl?: string;
  title?: string;
  onClose: () => void;
  currentUser: User;
  users: User[];
}

export interface ShareTarget {
  id: string;
  type: 'post' | 'reel' | 'video' | 'photo' | 'story' | 'profile';
  title?: string;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  authorName?: string;
  authorAvatar?: string;
}

export default function ShareOverlay({
  isOpen,
  postId,
  profileId,
  postContent,
  imageUrl,
  title = "Rohingya Connect Update",
  onClose,
  currentUser,
  users
}: ShareOverlayProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Interactive Composer States
  const [caption, setCaption] = useState('');
  const [destination, setDestination] = useState<'feed' | 'story' | 'message' | 'group'>('feed');
  const [audience, setAudience] = useState<'public' | 'followers' | 'friends' | 'only_me' | 'custom'>('public');
  const [showDestinationMenu, setShowDestinationMenu] = useState(false);
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);
  
  // Recipients Selection
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');

  // Auto-expanding textarea reference
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [caption]);

  if (!isOpen) return null;

  // Derive ShareTarget from props
  const target: ShareTarget = {
    id: profileId || postId || 'general',
    type: profileId ? 'profile' : (imageUrl?.includes('story') ? 'story' : (postContent?.includes('Reel') || postContent?.includes('caption') ? 'reel' : (postContent?.toLowerCase().includes('video') ? 'video' : (imageUrl ? 'photo' : 'post')))),
    content: postContent || '',
    imageUrl: imageUrl || '',
    title: title
  };

  // Generate deep links depending on share type
  const deepLink = target.type === 'profile' 
    ? `${window.location.origin}/profile/${target.id}` 
    : `${window.location.origin}/watch?v=${target.id}`;

  const descriptionPreview = target.content 
    ? (target.content.length > 80 ? target.content.substring(0, 80) + '...' : target.content)
    : "Join Rohingya Connect - the community preservation network for Rohingya culture, news, and heritage.";

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const trackShareEvent = async (type: 'internal' | 'external' | 'copy_link' | 'qr_scan' | 'composer_share', platform: string) => {
    try {
      await addDoc(collection(db, 'rc_share_analytics'), {
        shareType: type,
        platform,
        targetType: target.type,
        targetId: target.id,
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        timestamp: new Date().toISOString(),
        deepLink,
        imageUrl: target.imageUrl || null
      });
    } catch (err) {
      console.warn("Analytics logger error:", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      await trackShareEvent('copy_link', 'Clipboard');
      showToast("✓ Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = deepLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      await trackShareEvent('copy_link', 'Clipboard');
      showToast("✓ Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // List of Recipients inside RohingyaConnect
  const friendsList = users.map(u => ({
    id: u.id,
    name: u.fullName,
    username: u.username,
    avatar: u.avatar,
    type: 'friend',
    online: true,
    isVerified: u.isVerified || (u.invitesCount || 0) >= 5
  }));

  const groupsList = [
    { id: 'g-1', name: "CRY-General Members", avatar: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=100&auto=format&fit=crop&q=60", type: 'group', members: "1.2k members" },
    { id: 'g-2', name: "Kutupalong Camp 1E Outreach", avatar: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=100&auto=format&fit=crop&q=60", type: 'group', members: "850 members" },
    { id: 'g-3', name: "Arakan Educational Forum", avatar: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=100&auto=format&fit=crop&q=60", type: 'group', members: "450 members" },
    { id: 'g-4', name: "Rohingya Youth Coalition", avatar: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=100&auto=format&fit=crop&q=60", type: 'group', members: "310 members" }
  ];

  const pagesList = [
    { id: 'p-1', name: "Arakan Voice Network", avatar: "https://images.unsplash.com/photo-1495020689067-958852a6565d?w=100&auto=format&fit=crop&q=60", type: 'page', category: "News & Media" },
    { id: 'p-2', name: "Rohingya Cultural Preservation", avatar: "https://images.unsplash.com/photo-1444840535719-195841cb6e2b?w=100&auto=format&fit=crop&q=60", type: 'page', category: "Culture" },
    { id: 'p-3', name: "Rohingya Art Collective", avatar: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=100&auto=format&fit=crop&q=60", type: 'page', category: "Art & Heritage" }
  ];

  // Combined searchable list
  const combinedRecipients = [...friendsList, ...groupsList, ...pagesList];
  const filteredRecipients = combinedRecipients.filter(r => 
    r.name.toLowerCase().includes(recipientSearch.toLowerCase())
  );

  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Quick Action triggers
  const handleQuickAction = async (action: 'story' | 'messenger' | 'groups' | 'saved' | 'ai' | 'marketplace' | 'communities') => {
    if (action === 'saved') {
      try {
        setSaveStatus('saved');
        await trackShareEvent('internal', 'Saved Bookmarks');
        showToast("✓ Saved to your bookmarks");
      } catch (err) {
        console.error("Save bookmark error:", err);
      }
    } else if (action === 'story') {
      setDestination('story');
      showToast("Destination changed to: Your Story");
    } else if (action === 'groups') {
      setDestination('group');
      showToast("Destination changed to: In-App Groups");
    } else if (action === 'messenger') {
      setDestination('message');
      showToast("Destination changed to: Direct Message");
    } else {
      showToast(`Quick action triggered: ${action.toUpperCase()}`);
    }
  };

  // Main share submittal handler
  const handleShareNow = async (retryCount = 0) => {
    setIsSubmitting(true);
    try {
      const shareId = `share_${Date.now()}`;
      
      // 1. Create a detailed share log document in Firestore
      await addDoc(collection(db, 'rc_shares'), {
        id: shareId,
        contentId: target.id,
        contentType: target.type,
        sourceType: destination.toUpperCase(),
        privacySetting: audience.toUpperCase(),
        caption: caption,
        recipientIds: selectedRecipients,
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        userAvatar: currentUser.avatar,
        timestamp: new Date().toISOString(),
        analyticsData: {
          totalShares: 1,
          isExternal: false
        }
      });

            // 2. Increment sharesCount on original post/reel if in database
      if (postId && postId !== 'general') {
        const postRef = doc(db, 'rc_posts', postId);
        try {
          await updateDoc(postRef, { sharesCount: increment(1) });
        } catch (e) {
          console.warn("Could not increment sharesCount on rc_posts, might not exist:", e);
        }
      }

      // If destination is 'feed', create a lightweight shared-post in rc_posts
      if (destination === 'feed' && postId && postId !== 'general') {
        await addDoc(collection(db, 'rc_posts'), {
          userId: currentUser.id,
          userFullName: currentUser.fullName,
          userAvatar: currentUser.avatar,
          content: caption,
          originalPostId: postId,
          sharedFromPostId: postId, // backward compat if needed
          createdAt: new Date().toISOString(),
          reactions: [],
          comments: [],
          sharesCount: 0,
          privacy: audience.toLowerCase()
        });
      }

      // 3. Trigger Central Notifications
      // A notification for the creator of the content (if we can identify them)
      await addNotificationToFirestore({
        userId: currentUser.id, // Notification to user themselves
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        senderAvatar: currentUser.avatar,
        type: 'share',
        postId: postId || undefined,
        createdAt: new Date().toISOString(),
        isRead: false,
        notificationType: 'SHARE_SUCCESS',
        deepLink: deepLink,
        targetType: target.type,
        targetId: target.id
      });

      // Notifications to selected recipients
      for (const recId of selectedRecipients) {
        const isGroup = recId.startsWith('g-') || recId.startsWith('p-');
        const targetRecId = isGroup ? currentUser.id : recId; // Send to specific user if friend
        
        await addNotificationToFirestore({
          userId: targetRecId,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          senderAvatar: currentUser.avatar,
          type: 'message',
          postId: postId || undefined,
          createdAt: new Date().toISOString(),
          isRead: false,
          notificationType: 'SHARE_SENT',
          deepLink: deepLink,
          targetType: target.type,
          targetId: target.id
        });
      }

      // 4. If destination is Feed, write a brand new post (repost) inside Firestore
      if (destination === 'feed') {
        await addPostToFirestore({
          userId: currentUser.id,
          userFullName: currentUser.fullName,
          userAvatar: currentUser.avatar,
          content: caption || `Shared a ${target.type}: ${target.title}`,
          image: target.imageUrl || undefined,
          createdAt: new Date().toISOString(),
          reactions: [],
          comments: [],
          sharesCount: 0,
          isVideo: target.type === 'video' || target.type === 'reel',
          sharedFromFullName: target.title || "Another Creator",
          sharedFromAvatar: target.imageUrl || undefined,
          sharedFromPostId: target.id,
          sharedBy: currentUser.id
        });
      }

      await trackShareEvent('composer_share', destination.toUpperCase());
      showToast("✓ Shared successfully!");
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1000);

    } catch (err) {
      console.error("Sharing error:", err);
      if (retryCount < 2) {
        console.log(`Retrying share operation, attempt ${retryCount + 1}...`);
        showToast(`Sharing... (retry ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return handleShareNow(retryCount + 1);
      }
      showToast("❌ Error performing share operation after retries");
      setIsSubmitting(false);
    }
  };

  const handleAppShare = async (platform: string, shareUrl: string) => {
    await trackShareEvent('external', platform);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: target.title,
          text: `${descriptionPreview} - Shared via RohingyaConnect`,
          url: deepLink,
        });
        showToast(`Shared successfully via ${platform}!`);
        return;
      } catch (err) {
        console.log("Navigator.share declined, opening standard link:", err);
      }
    }
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    showToast(`Shared to ${platform}!`);
  };

  // Define social sharing links
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${target.title}: ${descriptionPreview} ${deepLink}`)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(deepLink)}`;
  const messengerUrl = `fb-messenger://share?link=${encodeURIComponent(deepLink)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(target.title || '')}&url=${encodeURIComponent(deepLink)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(target.title || '')}`;
  const signalUrl = `https://signal.me/#share?url=${encodeURIComponent(deepLink)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(target.title || '')}&body=${encodeURIComponent(`${descriptionPreview}\n\nRead more here: ${deepLink}`)}`;
  const smsUrl = `sms:?&body=${encodeURIComponent(`${target.title} ${deepLink}`)}`;

  const shareApps = [
    { name: 'WhatsApp', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg', url: whatsappUrl },
    { name: 'Facebook', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png', url: facebookUrl },
    { name: 'Messenger', icon: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Facebook_Messenger_logo_2020.svg', url: messengerUrl },
    { name: 'Telegram', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg', url: telegramUrl },
    { name: 'X', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/X_icon_2.svg', url: twitterUrl },
  ];

  // Quick Insert Shortcut Helpers
  const emojis = ['❤️', '👏', '🔥', '✨', '🙌', '💡'];
  const hashtags = ['#Rohingya', '#Arakan', '#Heritage', '#Culture', '#Community'];
  const popularFriends = ['@Zahed', '@Ahmed', '@Noor', '@Yasmin'];

  const appendToCaption = (text: string) => {
    setCaption(prev => {
      const space = prev === '' || prev.endsWith(' ') ? '' : ' ';
      return prev + space + text + ' ';
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 select-none">
        
        {/* Background Click Close */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        {/* Premium Sliding Bottom Sheet */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(event, info) => {
            if (info.offset.y > 150) {
              onClose();
            }
          }}
          className="w-full sm:max-w-lg bg-white border-t sm:border border-slate-200 rounded-t-[32px] sm:rounded-3xl shadow-2xl relative overflow-hidden z-10 flex flex-col max-h-[92vh] touch-none"
          id="share-sheet-container"
        >
          {/* Material Drag Indicator */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-2 flex-shrink-0 cursor-grab active:cursor-grabbing" />

          {/* Dynamic Header */}
          <div className="flex justify-between items-center px-6 pb-4 border-b border-slate-100">
            <div>
              <h4 className="text-base font-black tracking-tight text-slate-900">Share</h4>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                Share this {target.type} with friends, groups, or other apps.
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Container Body */}
          <div className="overflow-y-auto px-6 py-4 space-y-5 scrollbar-none max-h-[64vh] touch-pan-y">
            
            {/* COMPOSER SECTION */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              
              {/* User Profile & Pill Selectors */}
              <div className="flex items-center gap-3">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.fullName} 
                  className="w-11 h-11 rounded-full object-cover border-2 border-[#1877F2] shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-grow">
                  <span className="text-xs font-black text-slate-800 block">{currentUser.fullName}</span>
                  
                  {/* Selector Pills */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    
                    {/* Destination Selector */}
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowDestinationMenu(!showDestinationMenu);
                          setShowAudienceMenu(false);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition cursor-pointer"
                      >
                        {destination === 'feed' && <Compass className="w-3 h-3 text-[#1877F2]" />}
                        {destination === 'story' && <ImageIcon className="w-3 h-3 text-purple-500" />}
                        {destination === 'message' && <MessageSquare className="w-3 h-3 text-blue-500" />}
                        {destination === 'group' && <Users className="w-3 h-3 text-amber-500" />}
                        <span className="capitalize">{destination}</span>
                        <span className="text-[8px]">▼</span>
                      </button>

                      {showDestinationMenu && (
                        <div className="absolute left-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-200 z-50 p-1 space-y-0.5">
                          <button 
                            onClick={() => { setDestination('feed'); setShowDestinationMenu(false); }}
                            className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-2 text-slate-700"
                          >
                            <Compass className="w-3.5 h-3.5 text-[#1877F2]" /> Share to Feed
                          </button>
                          <button 
                            onClick={() => { setDestination('story'); setShowDestinationMenu(false); }}
                            className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-2 text-slate-700"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-purple-500" /> Share to Story
                          </button>
                          <button 
                            onClick={() => { setDestination('message'); setShowDestinationMenu(false); }}
                            className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-2 text-slate-700"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Direct Message
                          </button>
                          <button 
                            onClick={() => { setDestination('group'); setShowDestinationMenu(false); }}
                            className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-2 text-slate-700"
                          >
                            <Users className="w-3.5 h-3.5 text-amber-500" /> Share to Group
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Audience Selector */}
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowAudienceMenu(!showAudienceMenu);
                          setShowDestinationMenu(false);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Globe className="w-3 h-3 text-[#1877F2]" />
                        <span className="capitalize">{audience.replace('_', ' ')}</span>
                        <span className="text-[8px]">▼</span>
                      </button>

                      {showAudienceMenu && (
                        <div className="absolute left-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-200 z-50 p-1 space-y-0.5">
                          <button 
                            onClick={() => { setAudience('public'); setShowAudienceMenu(false); }}
                            className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-2 text-slate-700"
                          >
                            🌍 Public
                          </button>
                          <button 
                            onClick={() => { setAudience('followers'); setShowAudienceMenu(false); }}
                            className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-2 text-slate-700"
                          >
                            👥 Followers
                          </button>
                          <button 
                            onClick={() => { setAudience('friends'); setShowAudienceMenu(false); }}
                            className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-2 text-slate-700"
                          >
                            🤝 Friends
                          </button>
                          <button 
                            onClick={() => { setAudience('only_me'); setShowAudienceMenu(false); }}
                            className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-2 text-slate-700"
                          >
                            🔒 Only Me
                          </button>
                          <button 
                            onClick={() => { setAudience('custom'); setShowAudienceMenu(false); }}
                            className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-2 text-slate-700"
                          >
                            ⚙️ Custom Audience
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>

              {/* Caption Input Area */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Say something... add hashtags (#), mentions (@) or emojis!"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1877F2] resize-none min-h-[64px]"
                />
              </div>

              {/* Quick Insert Shortcut Chips */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase mr-1">Insert Emojis:</span>
                  {emojis.map(e => (
                    <button 
                      key={e} 
                      onClick={() => appendToCaption(e)}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-xs transition cursor-pointer"
                    >
                      {e}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase mr-1">Hashtags:</span>
                  {hashtags.map(h => (
                    <button 
                      key={h} 
                      onClick={() => appendToCaption(h)}
                      className="px-2 py-0.5 bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white border border-[#1877F2]/20 rounded-full text-[9px] font-black transition cursor-pointer"
                    >
                      {h}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase mr-1">Mentions:</span>
                  {popularFriends.map(f => (
                    <button 
                      key={f} 
                      onClick={() => appendToCaption(f)}
                      className="px-2 py-0.5 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-100 rounded-full text-[9px] font-bold transition cursor-pointer"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* SECTION 1: INTERNAL SHARE RECIPIENTS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Share to RohingyaConnect</span>
                <span className="text-[9px] bg-[#1877F2]/10 text-[#1877F2] px-2.5 py-0.5 rounded-full font-black">Multi-Select</span>
              </div>

              {/* Recipient Search Filter */}
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search friends, groups, page channels..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Scrollable Recipients list */}
              <div className="flex gap-4 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {filteredRecipients.map((rec) => {
                  const isSelected = selectedRecipients.includes(rec.id);
                  return (
                    <button 
                      key={rec.id}
                      onClick={() => toggleRecipient(rec.id)}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16 text-center group transition focus:outline-none cursor-pointer relative"
                    >
                      <div className="relative">
                        <img 
                          src={rec.avatar} 
                          alt={rec.name} 
                          className={`w-12 h-12 rounded-full object-cover transition shadow-xs ${isSelected ? 'border-4 border-[#1877F2] scale-102' : 'border border-slate-200 group-hover:scale-105'}`}
                          referrerPolicy="no-referrer"
                        />
                        {/* Selected Indicator Badge */}
                        {isSelected ? (
                          <div className="absolute -top-1.5 -right-1.5 bg-[#1877F2] text-white rounded-full p-0.5 border border-white shadow-md">
                            <Check className="w-3 h-3 stroke-[4]" />
                          </div>
                        ) : (
                          rec.type === 'friend' && (rec as any).online && (
                            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-[#1877F2] border-2 border-white rounded-full"></span>
                          )
                        )}
                      </div>
                      <div className="min-w-0 w-full">
                        <p className={`text-[10px] font-bold truncate leading-none flex items-center justify-center gap-0.5 ${isSelected ? 'text-[#1877F2] font-extrabold' : 'text-slate-800'}`}>
                          <span className="truncate">{rec.name.split(' ')[0]}</span>
                          {(rec as any).isVerified && <BlueVerifiedTick className="w-2.5 h-2.5 shrink-0" />}
                        </p>
                        <p className="text-[7.5px] text-slate-400 truncate mt-0.5">
                          {rec.type === 'friend' ? `@${(rec as any).username}` : ((rec as any).members || (rec as any).category)}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {filteredRecipients.length === 0 && (
                  <div className="w-full text-center py-4 text-slate-400 text-[11px] font-bold">
                    No matching accounts found
                  </div>
                )}
              </div>
            </div>

            {/* QUICK ACTIONS SECTION */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Quick Actions</span>
              <div className="grid grid-cols-4 gap-2 text-center text-[9px] font-black text-slate-700">
                <button 
                  onClick={() => handleQuickAction('story')}
                  className={`p-2.5 rounded-2xl border transition flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 ${destination === 'story' ? 'bg-purple-500/10 border-purple-500/50 text-purple-600' : 'bg-slate-50 border-slate-100'}`}
                >
                  <ImageIcon className="w-4 h-4 text-purple-500" />
                  <span>Your Story</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('messenger')}
                  className={`p-2.5 rounded-2xl border transition flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 ${destination === 'message' ? 'bg-blue-500/10 border-blue-500/50 text-blue-600' : 'bg-slate-50 border-slate-100'}`}
                >
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span>Messenger</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('groups')}
                  className={`p-2.5 rounded-2xl border transition flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 ${destination === 'group' ? 'bg-amber-500/10 border-amber-500/50 text-amber-600' : 'bg-slate-50 border-slate-100'}`}
                >
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>Groups</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('saved')}
                  className={`p-2.5 rounded-2xl border transition flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 ${saveStatus === 'saved' ? 'bg-[#1877F2]/10 border-[#1877F2]/50 text-[#1877F2]' : 'bg-slate-50 border-slate-100'}`}
                >
                  <Bookmark className={`w-4 h-4 ${saveStatus === 'saved' ? 'fill-[#1877F2] text-[#1877F2]' : 'text-[#1877F2]'}`} />
                  <span>Saved</span>
                </button>
                
                <button 
                  onClick={() => handleQuickAction('ai')}
                  className="p-2.5 bg-slate-50 hover:bg-[#1877F2]/10 border border-slate-100 rounded-2xl transition flex flex-col items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-[#1877F2]" />
                  <span>AI Assistant</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('marketplace')}
                  className="p-2.5 bg-slate-50 hover:bg-[#1877F2]/10 border border-slate-100 rounded-2xl transition flex flex-col items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Smartphone className="w-4 h-4 text-rose-500" />
                  <span>Marketplace</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('communities')}
                  className="p-2.5 bg-slate-50 hover:bg-[#1877F2]/10 border border-slate-100 rounded-2xl transition flex flex-col items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Layers className="w-4 h-4 text-orange-500" />
                  <span>Communities</span>
                </button>
                <button 
                  onClick={() => {
                    setShowQr(!showQr);
                    trackShareEvent('qr_scan', 'QR Generator');
                  }}
                  className={`p-2.5 rounded-2xl border transition flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 ${showQr ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-slate-50 border-slate-100'}`}
                >
                  <QrCode className="w-4 h-4 text-orange-500" />
                  <span>QR Code</span>
                </button>
              </div>
            </div>

            {/* QR Code expansion block */}
            {showQr && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-slate-50 p-4 rounded-3xl border border-slate-200/60 flex flex-col items-center text-center space-y-3"
              >
                <div className="bg-white p-3 rounded-2xl shadow-md border">
                  <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="5" width="20" height="20" rx="2" fill="black" />
                    <rect x="75" y="5" width="20" height="20" rx="2" fill="black" />
                    <rect x="5" y="75" width="20" height="20" rx="2" fill="black" />
                    <rect x="10" y="10" width="10" height="10" fill="white" />
                    <rect x="80" y="10" width="10" height="10" fill="white" />
                    <rect x="10" y="80" width="10" height="10" fill="white" />
                    <path d="M 35 10 L 40 10 L 40 20 L 35 20 Z" fill="black" />
                    <path d="M 50 10 L 60 10 L 60 15 L 50 15 Z" fill="black" />
                    <path d="M 45 25 L 55 25 L 55 35 L 45 35 Z" fill="black" />
                    <path d="M 15 35 L 25 35 L 25 45 L 15 45 Z" fill="black" />
                    <path d="M 65 35 L 75 35 L 75 55 L 65 55 Z" fill="black" />
                    <path d="M 35 45 L 45 45 L 45 65 L 35 65 Z" fill="black" />
                    <path d="M 15 55 L 25 55 L 25 65 L 15 65 Z" fill="black" />
                    <path d="M 55 60 L 65 60 L 65 80 L 55 80 Z" fill="black" />
                    <path d="M 75 75 L 85 75 L 85 85 L 75 85 Z" fill="black" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-[11px] font-black text-slate-800">Scan QR Code to Read Details</h5>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Let others scan this screen to immediately view this update on their mobile device.</p>
                </div>
              </motion.div>
            )}

            {/* SECTION 2: SHARE VIA OUTSIDE APPS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Share via</span>
                <span className="text-[9px] bg-blue-500/10 text-[#1877F2] px-2.5 py-0.5 rounded-full font-black">External Apps</span>
              </div>

              {/* Social platform horizontal scroll */}
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {shareApps.map(app => (
                  <button 
                    key={app.name} 
                    onClick={() => handleAppShare(app.name, app.url)} 
                    className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer active:scale-95 focus:outline-none"
                  >
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm p-2 flex items-center justify-center border border-slate-200">
                      <img src={app.icon} alt={app.name} className="w-8 h-8 object-contain" />
                    </div>
                    <span className="text-[10px] text-[#050505] font-bold mt-1">{app.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* DIRECT CONNECTION LINK COPY */}
            <div className="space-y-2 pt-2 border-t border-slate-150">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Direct Connection Link</span>
              <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/50">
                <input 
                  type="text" 
                  readOnly 
                  value={deepLink}
                  className="flex-grow bg-transparent text-[10px] font-mono text-slate-600 px-2 outline-none select-all truncate font-bold"
                />
                <button 
                  onClick={handleCopyLink}
                  className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white px-3.5 py-2 rounded-xl flex items-center justify-center gap-1 text-[10px] font-black transition active:scale-95 cursor-pointer flex-shrink-0 shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Control Bar with big "Share Now" Button */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
            <span className="text-[10px] text-slate-400 font-bold">
              {selectedRecipients.length > 0 ? `${selectedRecipients.length} Recipient(s) selected` : "Direct sharing enabled"}
            </span>
            <button
              onClick={() => handleShareNow(0)}
              disabled={isSubmitting}
              className={`px-6 py-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all ${isSubmitting ? 'bg-slate-300 text-slate-500' : 'bg-[#1877F2] hover:bg-[#1877F2]/90 active:scale-95 text-white shadow-[#1877F2]/10'}`}
            >
              <span>{isSubmitting ? 'Sharing...' : 'Share Now'}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Floating Action Confirmation Toast inside bottom sheet */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-20 left-4 right-4 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 text-xs font-bold border dark:border-slate-200"
              >
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
