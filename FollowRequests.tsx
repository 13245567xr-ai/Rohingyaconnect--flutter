import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  X, 
  Check, 
  ChevronRight, 
  Search, 
  Clock, 
  Sparkles,
  UserX,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { 
  FollowRequest, 
  sendFollowRequestInFirestore, 
  cancelFollowRequestInFirestore, 
  acceptFollowRequestInFirestore, 
  rejectFollowRequestInFirestore,
  blockUserInFirestore
} from '../utils/firebaseSync';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface FollowRequestsProps {
  currentUser: User;
  users: User[];
  followRequests: FollowRequest[];
  onViewProfile: (userId: string) => void;
  onTabChange: (tabId: string) => void;
}

export default function FollowRequests({
  currentUser,
  users,
  followRequests,
  onViewProfile,
  onTabChange
}: FollowRequestsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local state for hidden suggestions (persisted in localStorage)
  const [hiddenSuggestionIds, setHiddenSuggestionIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('rc_hidden_suggestions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Local state to track which cancelled requests now show a Block button
  const [showBlockButton, setShowBlockButton] = useState<Record<string, boolean>>({});

  useEffect(() => {
    localStorage.setItem('rc_hidden_suggestions', JSON.stringify(hiddenSuggestionIds));
  }, [hiddenSuggestionIds]);

  // Actions
  const handleAccept = async (req: FollowRequest, sender: User) => {
    try {
      await acceptFollowRequestInFirestore(
        req.id,
        req.senderId,
        req.receiverId,
        sender.fullName,
        sender.avatar,
        currentUser.fullName,
        currentUser.avatar
      );
    } catch (err) {
      console.error("Error accepting follow request:", err);
    }
  };

  const handleCancel = async (req: FollowRequest) => {
    try {
      await rejectFollowRequestInFirestore(req.id);
      // Requirement: Replace buttons with [Block User]
      setShowBlockButton(prev => ({ ...prev, [req.senderId]: true }));
    } catch (err) {
      console.error("Error rejecting follow request:", err);
    }
  };

  const handleBlock = async (userId: string) => {
    try {
      await blockUserInFirestore(currentUser.id, userId);
      // Optionally remove the block button after blocking
      setShowBlockButton(prev => ({ ...prev, [userId]: false }));
    } catch (err) {
      console.error("Error blocking user:", err);
    }
  };

  const handleAddFollow = async (targetUser: User) => {
    try {
      await sendFollowRequestInFirestore(
        currentUser.id,
        targetUser.id,
        currentUser.fullName,
        currentUser.avatar
      );
    } catch (err) {
      console.error("Error sending follow request:", err);
    }
  };

  const handleCancelSentRequest = async (targetUser: User) => {
    try {
      await cancelFollowRequestInFirestore(currentUser.id, targetUser.id);
    } catch (err) {
      console.error("Error cancelling sent follow request:", err);
    }
  };

  const handleHideSuggestion = (userId: string) => {
    setHiddenSuggestionIds(prev => [...prev, userId]);
  };

  // 1. Compute pending incoming follow requests (where receiver is current user)
  const incomingRequests = followRequests.filter(
    r => r.receiverId === currentUser?.id && r.status === 'pending'
  );

  // 2. Compute pending outgoing follow requests (where sender is current user)
  const outgoingRequests = followRequests.filter(
    r => r.senderId === currentUser?.id && r.status === 'pending'
  );

  // Helper: check if request is sent to a user
  const isRequestSentTo = (userId: string) => {
    return outgoingRequests.some(r => r.receiverId === userId);
  };

  // Helper: compute mutual followers
  const getMutualFollowersCount = (otherUser: User) => {
    const myFollowing = currentUser?.following || [];
    const otherFollowers = otherUser.followers || [];
    const mutuals = users.filter(u => myFollowing.includes(u.id) && otherFollowers.includes(u.id));
    return {
      count: mutuals.length,
      list: mutuals.slice(0, 3) // show up to 3 avatars
    };
  };

  // 3. Compute suggestions (People You May Know)
  const suggestions = users.filter(user => {
    // Cannot suggest self
    if (user.id === currentUser?.id) return false;
    // Cannot suggest if already following
    if (currentUser?.following?.includes(user.id)) return false;
    // Cannot suggest if blocked
    if (currentUser?.blockedUsers?.includes(user.id)) return false;
    // Cannot suggest if they blocked us
    if (user.blockedUsers?.includes(currentUser?.id)) return false;
    // Cannot suggest if hidden by user
    if (hiddenSuggestionIds.includes(user.id)) return false;
    // Filter out if currently pending incoming request (they should be accepted in section 1!)
    if (incomingRequests.some(r => r.senderId === user.id)) return false;
    
    return true;
  });

  // Filter lists based on search query
  const filteredIncoming = incomingRequests.filter(req => {
    const sender = users.find(u => u.id === req.senderId);
    if (!sender) return false;
    return (
      sender.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sender.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredSuggestions = suggestions.filter(user => {
    return (
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Relative time helper
  const getRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12" id="follow-requests-view">
      
      {/* HEADER CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Follow Requests
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Review incoming connections and find members you may know in the Rohingya community.
          </p>
        </div>

        {/* SEARCH BOX */}
        <div className="relative w-full md:w-80 group/search">
          <div className="absolute left-3.5 top-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within/search:text-emerald-500 transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests & people..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80 text-xs rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:focus:border-emerald-400 text-slate-800 dark:text-slate-100 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1 — FOLLOW REQUESTS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Pending Follow Requests
            </span>
            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {incomingRequests.length}
            </span>
          </div>
        </div>

        {filteredIncoming.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {searchQuery ? 'No matching follow requests found.' : 'No pending follow requests.'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try searching another name or username' : 'Incoming follow requests will appear here in real time.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredIncoming.map((req) => {
                const sender = users.find(u => u.id === req.senderId);
                if (!sender) return null;

                const { count: mutualCount, list: mutualAvatars } = getMutualFollowersCount(sender);

                return (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition duration-200 group"
                  >
                    <div className="flex items-start gap-3">
                      <img 
                        src={sender.avatar} 
                        alt={sender.fullName} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm cursor-pointer hover:scale-105 transition"
                        onClick={() => onViewProfile(sender.id)}
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-grow">
                        <h4 
                          onClick={() => onViewProfile(sender.id)}
                          className="text-xs font-black text-slate-800 dark:text-slate-100 truncate hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer flex items-center gap-1"
                        >
                          {sender.fullName}
                          {(sender.isVerified || (sender.invitesCount || 0) >= 5) && <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">@{sender.username}</p>
                        
                        {/* Mutual Followers indicator */}
                        {mutualCount > 0 ? (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {mutualAvatars.map((u) => (
                                <img
                                  key={u.id}
                                  className="inline-block h-4.5 w-4.5 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                                  src={u.avatar}
                                  alt={u.fullName}
                                  referrerPolicy="no-referrer"
                                />
                              ))}
                            </div>
                            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                              {mutualCount} mutual follower{mutualCount > 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[9px] text-slate-400 mt-2">No mutual followers</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {getRelativeTime(req.createdAt)}
                      </span>
                      
                      <div className="flex gap-2">
                        {showBlockButton[sender.id] ? (
                          <button
                            onClick={() => handleBlock(sender.id)}
                            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-extrabold transition active:scale-95 cursor-pointer flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3 h-3" /> Block User
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleCancel(req)}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-extrabold transition active:scale-95 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleAccept(req, sender)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-extrabold shadow-sm shadow-emerald-500/10 transition active:scale-95 flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Accept
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* SECTION 2 — PEOPLE YOU MAY KNOW */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            People You May Know
          </span>
        </div>

        {filteredSuggestions.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <UserX className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              No recommendations available right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredSuggestions.map((user) => {
                const { count: mutualCount, list: mutualAvatars } = getMutualFollowersCount(user);
                const isSent = isRequestSentTo(user.id);

                return (
                  <motion.div
                    key={user.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <img 
                        src={user.avatar} 
                        alt={user.fullName} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm cursor-pointer hover:scale-105 transition"
                        onClick={() => onViewProfile(user.id)}
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-grow">
                        <h4 
                          onClick={() => onViewProfile(user.id)}
                          className="text-xs font-black text-slate-800 dark:text-slate-100 truncate hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer flex items-center gap-1"
                        >
                          {user.fullName}
                          {(user.isVerified || (user.invitesCount || 0) >= 5) && <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">@{user.username}</p>
                        
                        {/* Mutual Followers indicator */}
                        {mutualCount > 0 ? (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {mutualAvatars.map((u) => (
                                <img
                                  key={u.id}
                                  className="inline-block h-4.5 w-4.5 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                                  src={u.avatar}
                                  alt={u.fullName}
                                  referrerPolicy="no-referrer"
                                />
                              ))}
                            </div>
                            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                              {mutualCount} mutual follower{mutualCount > 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[9px] text-slate-400 mt-2">No mutual followers</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                      <button
                        onClick={() => handleHideSuggestion(user.id)}
                        className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-extrabold transition active:scale-95 cursor-pointer text-center"
                      >
                        Remove
                      </button>

                      {isSent ? (
                        <button
                          onClick={() => handleCancelSentRequest(user)}
                          className="flex-1 py-2 bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-[10px] font-extrabold transition active:scale-95 cursor-pointer text-center border border-slate-300 dark:border-slate-700"
                        >
                          Cancel Request
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddFollow(user)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-extrabold shadow-sm shadow-emerald-500/10 transition active:scale-95 flex items-center justify-center gap-1 cursor-pointer text-center"
                        >
                          <UserPlus className="w-3 h-3" /> Add Follow
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
}
