import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { 
  Bell, 
  Trash2, 
  Flag, 
  Check, 
  Bookmark, 
  VolumeX, 
  Volume2,
  MoreVertical, 
  ChevronRight, 
  UserPlus, 
  MessageSquare, 
  Phone, 
  Video, 
  Heart, 
  MessageCircle, 
  Share2, 
  Users, 
  Shield, 
  Sparkles, 
  Cpu, 
  RefreshCw, 
  X, 
  Search,
  Camera,
  ExternalLink,
  ChevronLeft,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, type Notification } from '../types';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface NotificationCenterProps {
  currentUser: User;
  notifications: Notification[];
  onMarkNotificationsAsRead: () => void;
  onTabChange: (tab: string) => void;
  onViewProfile: (userId: string) => void;
  setActiveChatUserId: (userId: string | null) => void;
  onUpdateNotification?: (notifId: string, updates: Partial<Notification>) => void;
  onDeleteNotification?: (notifId: string) => void;
  onReportUser?: (report: any) => void;
}

export default function NotificationCenter({
  currentUser,
  notifications,
  onMarkNotificationsAsRead,
  onTabChange,
  onViewProfile,
  setActiveChatUserId,
  onUpdateNotification,
  onDeleteNotification,
  onReportUser
}: NotificationCenterProps) {
  
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'unread' | 'saved' | 'trash'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Reporting state
  const [reportingNotif, setReportingNotif] = useState<Notification | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [reportReason, setReportReason] = useState('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [reportEvidence, setReportEvidence] = useState<string | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isCapturingEvidence, setIsCapturingEvidence] = useState(false);

  // Active dropdown or popup states
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [mutedSenders, setMutedSenders] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('rc_muted_senders') || '[]');
  });

  useEffect(() => {
    localStorage.setItem('rc_muted_senders', JSON.stringify(mutedSenders));
  }, [mutedSenders]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const userDocRef = doc(db, 'rc_users', currentUser.id);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const firebaseMuted = data.mutedSenders || [];
        setMutedSenders(firebaseMuted);
        localStorage.setItem('rc_muted_senders', JSON.stringify(firebaseMuted));
      }
    }, (err) => {
      console.warn("Error listening to muted senders in NotificationCenter: ", err);
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    // Keep it unique by dismissing after 3 seconds
    setTimeout(() => {
      setToastMessage(prev => prev === message ? null : prev);
    }, 3000);
  };

  // Local-only persistence cache for saved/trash states if callbacks aren't available
  const [localSavedIds, setLocalSavedIds] = useState<string[]>([]);
  const [localTrashIds, setLocalTrashIds] = useState<string[]>([]);
  const [localReadIds, setLocalReadIds] = useState<string[]>([]);

  // Filter notifications based on sub-tab and search query
  const filteredNotifications = notifications.filter(notif => {
    // Determine active status
    const isTrash = notif.isTrash || localTrashIds.includes(notif.id);
    const isSaved = notif.isSaved || localSavedIds.includes(notif.id);
    const isRead = notif.isRead || localReadIds.includes(notif.id);

    if (activeSubTab === 'trash') {
      if (!isTrash) return false;
    } else {
      if (isTrash) return false;
      if (activeSubTab === 'unread' && isRead) return false;
      if (activeSubTab === 'saved' && !isSaved) return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchText = `${notif.senderName} ${notif.type} ${getNotificationDescription(notif)}`.toLowerCase();
      return matchText.includes(q);
    }

    return true;
  });

  const handleMarkAsRead = (notif: Notification) => {
    setLocalReadIds(prev => [...prev, notif.id]);
    if (onUpdateNotification) {
      onUpdateNotification(notif.id, { isRead: true });
    }
  };

  const handleToggleSave = (notif: Notification) => {
    const isCurrentlySaved = notif.isSaved || localSavedIds.includes(notif.id);
    if (isCurrentlySaved) {
      setLocalSavedIds(prev => prev.filter(id => id !== notif.id));
      if (onUpdateNotification) onUpdateNotification(notif.id, { isSaved: false });
    } else {
      setLocalSavedIds(prev => [...prev, notif.id]);
      if (onUpdateNotification) onUpdateNotification(notif.id, { isSaved: true });
    }
    setActiveDropdownId(null);
  };

  const handleToggleMute = async (notif: Notification) => {
    const isMuted = mutedSenders.includes(notif.senderId);
    let nextMuted: string[];
    if (isMuted) {
      nextMuted = mutedSenders.filter(id => id !== notif.senderId);
      showToastNotification(`You unmute this notification from ${notif.senderName}`);
    } else {
      nextMuted = [...mutedSenders, notif.senderId];
      showToastNotification(`You mute this notification from ${notif.senderName}`);
    }
    
    setMutedSenders(nextMuted);
    localStorage.setItem('rc_muted_senders', JSON.stringify(nextMuted));
    
    if (currentUser?.id) {
      try {
        const userDocRef = doc(db, 'rc_users', currentUser.id);
        await updateDoc(userDocRef, {
          mutedSenders: nextMuted
        });
      } catch (err) {
        console.warn("Failed to save muted sender to Firestore:", err);
      }
    }
    setActiveDropdownId(null);
  };

  const handleReportNotification = async (notif: Notification) => {
    const reportData = {
      title: `Notification Report: ${notif.type}`,
      reason: 'reported_notification',
      description: `Notification ID: ${notif.id}. Sender Name: ${notif.senderName}. Content: ${getNotificationDescription(notif)}. Receiver ID: ${currentUser.id}`,
      reportedUserId: notif.senderId,
      reporterUserId: currentUser.id,
      createdAt: new Date().toISOString()
    };

    if (onReportUser) {
      try {
        await onReportUser(reportData);
      } catch (err) {
        console.error("Error in onReportUser:", err);
      }
    }

    try {
      await addDoc(collection(db, 'rc_reports'), {
        ...reportData,
        type: 'notification_report',
        timestamp: new Date().toISOString(),
        notificationId: notif.id,
        notificationType: notif.type,
        senderId: notif.senderId,
        senderName: notif.senderName
      });
    } catch (err) {
      console.error("Error writing report to Firestore:", err);
    }

    setActiveDropdownId(null);
    showToastNotification("Notification reported successfully.");
  };

  const handleMoveToTrash = (notif: Notification) => {
    setLocalTrashIds(prev => [...prev, notif.id]);
    if (onUpdateNotification) {
      onUpdateNotification(notif.id, { isTrash: true });
    }
    setActiveDropdownId(null);
    showToastNotification("You trashed this notification.");
  };

  const handlePermanentDelete = (notifId: string) => {
    if (onDeleteNotification) {
      onDeleteNotification(notifId);
    }
    setLocalTrashIds(prev => prev.filter(id => id !== notifId));
  };

  const handleRestoreFromTrash = (notif: Notification) => {
    setLocalTrashIds(prev => prev.filter(id => id !== notif.id));
    if (onUpdateNotification) {
      onUpdateNotification(notif.id, { isTrash: false });
    }
  };

  const handleTriggerReport = (notif: Notification) => {
    setReportingNotif(notif);
    setReportTitle(`Report regarding ${notif.senderName}`);
    setReportReason('spam');
    setReportDescription('');
    setReportEvidence(null);
    setReportSubmitted(false);
    setActiveDropdownId(null);
  };

  const handleSimulateEvidenceUpload = () => {
    setIsCapturingEvidence(true);
    setTimeout(() => {
      setReportEvidence('https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?auto=format&fit=crop&w=600&q=80');
      setIsCapturingEvidence(false);
    }, 1200);
  };

  const handleSubmitReport = () => {
    if (!reportingNotif) return;
    const reportData = {
      title: reportTitle,
      reason: reportReason,
      description: reportDescription,
      evidenceUrl: reportEvidence || '',
      reportedUserId: reportingNotif.senderId,
      reporterUserId: currentUser.id,
      createdAt: new Date().toISOString()
    };

    if (onReportUser) {
      onReportUser(reportData);
    }
    setReportSubmitted(true);
    setTimeout(() => {
      setReportingNotif(null);
      setReportSubmitted(false);
    }, 2000);
  };

  // Helper to determine notification category visual elements
  function getNotificationIcon(type: string) {
    switch (type) {
      case 'follow':
      case 'follow_request':
        return { icon: UserPlus, color: 'bg-blue-500 text-white' };
      case 'message':
      case 'message_request':
      case 'message_request_accept':
      case 'story_reply':
      case 'marketplace_buyer_message':
        return { icon: MessageSquare, color: 'bg-emerald-500 text-white' };
      case 'audio_call':
        return { icon: Phone, color: 'bg-indigo-500 text-white' };
      case 'video_call':
        return { icon: Video, color: 'bg-purple-500 text-white' };
      case 'like':
      case 'react_love':
      case 'reel_like':
      case 'story_reaction':
        return { icon: Heart, color: 'bg-rose-500 text-white' };
      case 'comment':
      case 'video_comment':
      case 'comment_reply':
      case 'reel_comment':
        return { icon: MessageCircle, color: 'bg-amber-500 text-white' };
      case 'shared_post':
        return { icon: Share2, color: 'bg-teal-500 text-white' };
      case 'saved_post':
        return { icon: Bookmark, color: 'bg-blue-600 text-white' };
      case 'group_post':
      case 'group_mention':
      case 'group_invite':
        return { icon: Users, color: 'bg-pink-500 text-white' };
      case 'ai_recommendation':
      case 'ai_weekly_report':
        return { icon: Sparkles, color: 'bg-indigo-600 text-white text-emerald-400' };
      case 'security_login':
      case 'security_password':
        return { icon: Shield, color: 'bg-red-500 text-white' };
      default:
        return { icon: Bell, color: 'bg-slate-500 text-white' };
    }
  }

  function getNotificationTitle(notif: Notification) {
    switch (notif.type) {
      case 'follow': return 'New Follower';
      case 'follow_accept': return 'Follow Request Accepted';
      case 'follow_request': return 'Follow Request';
      case 'message': return 'New Message';
      case 'message_request': return 'Message Request';
      case 'message_request_accept': return 'Message Request Approved';
      case 'audio_call': return 'Missed Audio Call';
      case 'video_call': return 'Missed Video Call';
      case 'like': return 'Liked Your Post';
      case 'react_love': return 'Reacted Love ❤️';
      case 'react_happy': return 'Reacted Happy 😊';
      case 'react_haha': return 'Reacted Haha 😂';
      case 'react_angry': return 'Reacted Angry 😡';
      case 'comment': return 'Commented on Post';
      case 'comment_reply': return 'Replied to Comment';
      case 'video_comment': return 'Comment on Reel';
      case 'mention': return 'Mentioned You';
      case 'tag': return 'Tagged You';
      case 'shared_post': return 'Shared Your Post';
      case 'saved_post': return 'Saved to Bookmarks';
      case 'story_reaction': return 'Story Reaction';
      case 'story_reply': return 'Story Reply';
      case 'reel_like': return 'Liked Your Reel';
      case 'reel_comment': return 'Comment on Reel';
      case 'marketplace_buyer_message': return 'Marketplace Inquiry';
      case 'marketplace_offer_received': return 'Offer Received';
      case 'marketplace_item_sold': return 'Item Sold 🎉';
      case 'group_post': return 'New Group Post';
      case 'group_mention': return 'Mentioned in Group';
      case 'group_invite': return 'Group Invitation';
      case 'ai_recommendation': return 'AI Learning Tip';
      case 'ai_weekly_report': return 'AI Weekly Impact Report';
      case 'security_login': return 'New Login Alert';
      case 'security_password': return 'Password Changed';
      case 'birthday': return 'Happy Birthday!';
      case 'system_feature': return 'New Voice Tool Live';
      case 'system_maintenance': return 'System Maintenance Scheduled';
      default: return 'New Interaction';
    }
  }

  function getNotificationDescription(notif: Notification) {
    switch (notif.type) {
      case 'follow': return `${notif.senderName} started following your profile. Connect and collaborate!`;
      case 'follow_accept': return `${notif.senderName} accepted your follow request.`;
      case 'follow_request': return `${notif.senderName} requested to follow your private profile.`;
      case 'message': return `${notif.senderName} sent you a private message. Click to view conversation.`;
      case 'message_request': return `${notif.senderName} sent you a new message request. Tap to accept or decline.`;
      case 'message_request_accept': return `${notif.senderName} accepted your message request. Start chatting now!`;
      case 'audio_call': return `You missed an audio call from ${notif.senderName}. Tap to call back.`;
      case 'video_call': return `You missed a video call from ${notif.senderName}. Tap to video call back.`;
      case 'like': return `${notif.senderName} liked your recent post in the community forum.`;
      case 'react_love': return `${notif.senderName} reacted with Love ❤️ on your recent post.`;
      case 'react_happy': return `${notif.senderName} reacted with Happy 😊 on your recent post.`;
      case 'react_haha': return `${notif.senderName} reacted with Haha 😂 on your post.`;
      case 'react_angry': return `${notif.senderName} reacted with Angry 😡 on your post.`;
      case 'comment': return `${notif.senderName} commented: "This is really helpful!"`;
      case 'comment_reply': return `${notif.senderName} replied to your comment: "Exactly what I thought too!"`;
      case 'video_comment': return `${notif.senderName} commented on your reel: "Such a beautiful video!"`;
      case 'mention': return `${notif.senderName} mentioned you in a comment thread.`;
      case 'tag': return `${notif.senderName} tagged you in their post. Click to view.`;
      case 'shared_post': return `${notif.senderName} shared your update on their feed.`;
      case 'saved_post': return `Your bookmarked item was saved securely. Tap to access your saved shelf.`;
      case 'story_reaction': return `${notif.senderName} reacted "🔥" to your active story update.`;
      case 'story_reply': return `${notif.senderName} replied to your story: "Where is this location?"`;
      case 'reel_like': return `${notif.senderName} liked your video reel. Keep sharing cultural heritage!`;
      case 'reel_comment': return `${notif.senderName} commented on your video reel. Click to read.`;
      case 'marketplace_buyer_message': return `${notif.senderName} asked about your item: "Is this Rohingya Textbook still available?"`;
      case 'marketplace_offer_received': return `${notif.senderName} offered $15.00 for your solar charger listing.`;
      case 'marketplace_item_sold': return `Congratulations! Your solar charger was purchased. Tap to view logistics.`;
      case 'group_post': return `${notif.senderName} shared an announcement in Rohingya Youth Coalition.`;
      case 'group_mention': return `You were mentioned in Rohingya Educators Forum. Tap to join the chat.`;
      case 'group_invite': return `${notif.senderName} invited you to join Cox's Bazar Creative Writers.`;
      case 'ai_recommendation': return `Learn 5 new standard Rohingya words with our AI speech tool today!`;
      case 'ai_weekly_report': return `Your Rohingya language learning streak reached 5 days! View your full report.`;
      case 'security_login': return `New login detected from Chrome on Windows near Cox's Bazar. Was this you?`;
      case 'security_password': return `Your password was successfully updated. Account security is fully optimized.`;
      case 'birthday': return `🎂 Happy Birthday, ${currentUser.fullName}! We wish you a wonderful year ahead.`;
      case 'system_feature': return `Try our new automated voice transcription assistant for faster posting!`;
      case 'system_maintenance': return `RohingyaConnect will undergo scheduled database tuning on July 1st, 02:00 UTC.`;
      default: return `${notif.senderName} interacted with your profile page or post content.`;
    }
  }

  // Handle deep link actions to actually navigate
  const handleNotifTap = (notif: Notification) => {
    // 1. Mark as read immediately
    handleMarkAsRead(notif);
    
    // 2. Direct redirection
    handleDeepLinkExecute(notif);
  };

  const handleDeepLinkExecute = (notif: Notification) => {
    switch (notif.type) {
      case 'follow':
      case 'follow_accept':
        onViewProfile(notif.senderId);
        onTabChange('profile');
        break;
      
      case 'follow_request':
        onTabChange('follow_requests');
        break;
      
      case 'message':
      case 'message_request':
      case 'message_request_accept':
      case 'story_reply':
      case 'marketplace_buyer_message':
        setActiveChatUserId(notif.senderId);
        onTabChange('inbox');
        break;

      case 'audio_call':
      case 'video_call':
        // Navigate to chat/calls inside inbox
        setActiveChatUserId(notif.senderId);
        onTabChange('inbox');
        break;

      case 'like':
      case 'react_love':
      case 'react_happy':
      case 'react_haha':
      case 'react_angry':
      case 'comment':
      case 'comment_reply':
      case 'mention':
      case 'tag':
      case 'shared_post':
        // Navigate to feed home
        onTabChange('home');
        break;

      case 'reel_like':
      case 'reel_comment':
      case 'video_comment':
        onTabChange('video');
        break;

      case 'marketplace_offer_received':
      case 'marketplace_item_sold':
        onTabChange('marketplace');
        break;

      case 'saved_post':
        onTabChange('menu');
        break;

      case 'story_reaction':
        onTabChange('home');
        break;

      case 'group_post':
      case 'group_mention':
      case 'group_invite':
        // Group features mapped inside Inbox/Chat
        onTabChange('inbox');
        break;

      case 'ai_recommendation':
      case 'ai_weekly_report':
        onTabChange('home'); // or any AI overlay
        break;

      case 'security_login':
      case 'security_password':
        onTabChange('menu');
        break;

      case 'system_feature':
      case 'system_maintenance':
        onTabChange('menu');
        break;

      default:
        onTabChange('home');
        break;
    }
  };

  const totalUnreadCount = filteredNotifications.filter(n => !(n.isRead || localReadIds.includes(n.id))).length;

  return (
    <div className="w-full max-w-4xl mx-auto py-2 px-1 sm:px-4 text-slate-800 dark:text-slate-100 pb-20 select-none">
      
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-emerald-500" />
            Notification Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time interactive notifications synced across all of your active sessions.
          </p>
        </div>

        {/* Unread badge in red requested */}
        <div className="flex items-center gap-3">
          {totalUnreadCount > 0 && (
            <span className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-lg shadow-rose-500/20 animate-pulse flex items-center gap-1.5 transition">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              {totalUnreadCount} unread
            </span>
          )}
          {totalUnreadCount > 0 && (
            <button
              onClick={() => {
                filteredNotifications.forEach(n => handleMarkAsRead(n));
                onMarkNotificationsAsRead();
              }}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-bold"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* SEARCH AND SUB-TABS RAIL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter notifications by content or sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-transparent focus:bg-white dark:focus:bg-slate-850 focus:border-emerald-500 outline-none transition"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-2 text-xs font-bold text-slate-400 hover:text-slate-650"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sub-tabs Grid */}
        <div className="grid grid-cols-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
          {(['all', 'unread', 'saved', 'trash'] as const).map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveSubTab(sub)}
              className={`py-2 text-xs font-bold rounded-lg transition capitalize flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === sub
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              {sub === 'all' && <Bell className="w-3.5 h-3.5" />}
              {sub === 'unread' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
              {sub === 'saved' && <Bookmark className="w-3.5 h-3.5" />}
              {sub === 'trash' && <Trash2 className="w-3.5 h-3.5" />}
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* NOTIFICATION FEED LIST */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 p-6"
            >
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-450 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350">No notifications found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {activeSubTab === 'trash' 
                  ? "Your trash folder is currently clean. Deleted alerts automatically expire." 
                  : "We didn't find any notification matching your current view or filter."}
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((notif) => {
              const isRead = notif.isRead || localReadIds.includes(notif.id);
              const isSaved = notif.isSaved || localSavedIds.includes(notif.id);
              const isTrash = notif.isTrash || localTrashIds.includes(notif.id);
              const isMuted = mutedSenders.includes(notif.senderId);
              const vis = getNotificationIcon(notif.type);
              const IconComp = vis.icon;

              if (isMuted && activeSubTab !== 'all' && activeSubTab !== 'trash') return null;

              return (
                <motion.div
                  key={notif.id}
                  layoutId={`notif-card-${notif.id}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                  className={`relative group rounded-2xl border border-slate-150 dark:border-slate-800 ${
                    activeDropdownId === notif.id ? 'overflow-visible z-30' : 'overflow-hidden'
                  }`}
                >
                  
                  {/* Swipe Actions Background Layers */}
                  <div className="absolute inset-0 bg-slate-100 dark:bg-slate-850 flex justify-between items-center px-4 -z-10">
                    <div className="flex items-center gap-3 text-emerald-600 font-black text-xs">
                      <Check className="w-4.5 h-4.5" /> Right: Mark Read / Save
                    </div>
                    <div className="flex items-center gap-3 text-rose-500 font-black text-xs">
                      Left: Mute / Trash <Trash2 className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  {/* Notification Card main container (using drag gesture from framer-motion) */}
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: -140, right: 140 }}
                    dragElastic={0.4}
                    onDragEnd={(event, info) => {
                      if (info.offset.x < -100) {
                        // Swipe Left: Move to trash or Mute
                        handleMoveToTrash(notif);
                      } else if (info.offset.x > 100) {
                        // Swipe Right: Mark as read & Toggle Save
                        handleMarkAsRead(notif);
                        handleToggleSave(notif);
                      }
                    }}
                    className={`bg-white dark:bg-slate-900 p-4 transition-colors duration-200 cursor-grab active:cursor-grabbing flex items-start gap-4 select-none ${
                      !isRead ? 'bg-gradient-to-r from-emerald-500/5 to-transparent border-l-4 border-emerald-500' : ''
                    } ${isMuted ? 'opacity-60 bg-slate-50 dark:bg-slate-950/20' : ''}`}
                  >
                    
                    {/* User Avatar with Badge Indicator */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={notif.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                        alt={notif.senderName}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                        referrerPolicy="no-referrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProfile(notif.senderId);
                          onTabChange('profile');
                        }}
                      />
                      {/* Notification Icon Badge on avatar */}
                      <span className={`absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full flex items-center justify-center border border-white dark:border-slate-900 shadow-sm ${vis.color}`}>
                        <IconComp className="w-3 h-3" />
                      </span>
                    </div>

                    {/* Content text */}
                    <div className="flex-grow min-w-0" onClick={() => handleNotifTap(notif)}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-850 dark:text-slate-100 hover:underline cursor-pointer">
                          {notif.senderName}
                        </span>
                        
                        {/* Verified Badge */}
                        <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />
                        
                        {isSaved && (
                          <span className="text-[8px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                            <Bookmark className="w-2 h-2 fill-current" /> Saved
                          </span>
                        )}
                        
                        {isTrash && (
                          <span className="text-[8px] bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300 px-1.5 py-0.5 rounded font-black">
                            Trash
                          </span>
                        )}

                        {isMuted && (
                          <span className="text-[8px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                            <VolumeX className="w-2.5 h-2.5 text-slate-500" /> Muted
                          </span>
                        )}
                      </div>

                      <h4 className="text-[12px] font-extrabold text-slate-800 dark:text-slate-200 mt-1 leading-snug">
                        {getNotificationTitle(notif)}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-0.5 leading-snug">
                        {getNotificationDescription(notif)}
                      </p>

                      {/* Created time */}
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Right Hand Controls: Unread Dot + 3 Dot Menu */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-center">
                      {!isRead && (
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-md shadow-rose-500/50"></span>
                      )}

                      {/* 3 Dot Menu Trigger */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === notif.id ? null : notif.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Items */}
                        {activeDropdownId === notif.id && (
                          <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 animate-fadeIn">
                            
                            {isTrash ? (
                              <div className="py-1">
                                {/* Restore Alert */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestoreFromTrash(notif);
                                    setActiveDropdownId(null);
                                    showToastNotification('Notification restored.');
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center gap-2 cursor-pointer transition"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                                  Restore Alert
                                </button>

                                {/* Delete permanent */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePermanentDelete(notif.id);
                                    setActiveDropdownId(null);
                                    showToastNotification('Notification permanently deleted.');
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 cursor-pointer transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  Delete permanent
                                </button>
                              </div>
                            ) : (
                              <div className="py-1 space-y-0.5">
                                {/* Delete */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToTrash(notif);
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 cursor-pointer transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  Delete
                                </button>

                                {/* Mute or unmute (switch select button) */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleMute(notif);
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 flex items-center gap-2 cursor-pointer transition"
                                >
                                  {isMuted ? (
                                    <>
                                      <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                                      Unmute
                                    </>
                                  ) : (
                                    <>
                                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                                      Mute
                                    </>
                                  )}
                                </button>

                                {/* Report issues to notification team */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTriggerReport(notif);
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 text-[11px] font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 flex items-center gap-2 cursor-pointer transition"
                                >
                                  <Flag className="w-3.5 h-3.5 text-amber-500" />
                                  Report issues to notification team
                                </button>
                              </div>
                            )}

                          </div>
                        )}
                      </div>

                    </div>

                  </motion.div>

                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* QUICK INSTRUCTION TIPS */}
      <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-2xl flex gap-3">
        <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Senior Designer Tips:</h4>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 leading-snug">
            • <b>Swipe Gestures</b>: You can literally drag notification cards left or right using your cursor or touchscreen! Dragging left moves to Trash instantly; dragging right marks as read & bookmarks it!
            <br />
            • <b>Deep Linking System</b>: Tapping any notification opens a precise detail view mapped to the corresponding content node with custom interaction capabilities.
          </p>
        </div>
      </div>

      {/* Dynamic Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-800 text-xs font-bold"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REUSABLE REPORT sender MODAL requested */}
      <AnimatePresence>
        {reportingNotif && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              
              {/* Header */}
              <div className="bg-slate-50 dark:bg-slate-850 p-5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-rose-600 font-extrabold text-sm">
                  <Flag className="w-4.5 h-4.5" />
                  Report Sender Profile
                </div>
                <button
                  onClick={() => setReportingNotif(null)}
                  className="p-1 rounded-full hover:bg-slate-250 dark:hover:bg-slate-800 text-slate-400 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4">
                {reportSubmitted ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Report Successfully Submitted</h3>
                    <p className="text-xs text-slate-450">
                      Our moderation team is reviewing {reportingNotif.senderName} for policy violations.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                      <img
                        src={reportingNotif.senderAvatar}
                        alt="reported avatar"
                        className="w-10 h-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {reportingNotif.senderName}
                        </h4>
                        <p className="text-[10px] text-slate-400">Sender profile will be audited.</p>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Report Subject Title</label>
                      <input
                        type="text"
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        placeholder="e.g., Harassment via DM or comments"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-755 text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500"
                      />
                    </div>

                    {/* Reason Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Reason Category</label>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-755 text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500"
                      >
                        <option value="spam">Spam / Excessive Self-Promotion</option>
                        <option value="harassment">Harassment / Bullying</option>
                        <option value="hate_speech">Hate Speech or Racism</option>
                        <option value="scam">Scam / Financial Exploitation</option>
                        <option value="fake_account">Fake Account / Impersonation</option>
                        <option value="other">Other policy violations</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Issue Description</label>
                      <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        rows={3}
                        placeholder="Describe the incident in detail so moderators can respond rapidly..."
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-755 text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500 resize-none"
                      />
                    </div>

                    {/* Optional Screenshot upload requested */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider flex items-center justify-between">
                        <span>Upload Photo / Screenshot Evidence</span>
                        <span className="text-[8px] text-slate-400 font-mono">Optional</span>
                      </label>
                      
                      {reportEvidence ? (
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-850 h-28">
                          <img src={reportEvidence} alt="evidence" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setReportEvidence(null)}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full text-xs"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleSimulateEvidenceUpload}
                          disabled={isCapturingEvidence}
                          className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition text-slate-400 hover:text-slate-650"
                        >
                          <Camera className="w-5 h-5 text-slate-400" />
                          <span className="text-[10px] font-bold">
                            {isCapturingEvidence ? "Processing secure capture..." : "Take Photo or Upload Screenshot"}
                          </span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              {!reportSubmitted && (
                <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setReportingNotif(null)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    disabled={!reportTitle || !reportDescription}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-black transition shadow-lg shadow-rose-500/15 cursor-pointer"
                  >
                    Submit Report
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
