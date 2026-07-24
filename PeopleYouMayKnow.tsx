import React, { useState, useEffect, useRef } from 'react';
import { X, UserPlus, MoreHorizontal, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface PYMKProps {
  currentUser: any;
  users: any[];
  onViewProfile?: (userId: string) => void;
  onFollow?: (userId: string) => void;
}

export default function PeopleYouMayKnow({ currentUser, users, onViewProfile, onFollow }: PYMKProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // More options bottom sheet
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    if (!users || users.length === 0 || !currentUser) {
      setLoading(false);
      return;
    }

    const computeRecommendations = () => {
      // Exclude logic
      const following = currentUser.following || [];
      const blocked = currentUser.blockedUsers || [];
      const excludeIds = new Set([
        currentUser.id,
        ...following,
        ...blocked,
        ...dismissedIds
      ]);

      const availableUsers = users.filter(u => 
        !excludeIds.has(u.id) &&
        !u.isDeleted &&
        !u.isSuspended
      );

      // Scoring
      const scoredUsers = availableUsers.map(u => {
        let score = 0;
        let reasons: string[] = [];

        // 1. Mutual friends/following
        const theirFollowers = u.followers || [];
        const mutuals = theirFollowers.filter((id: string) => following.includes(id));
        if (mutuals.length > 0) {
          score += mutuals.length * 10;
          reasons.push(`${mutuals.length} mutual connections`);
        }

        // 2. Shared Location
        if (u.location && currentUser.location && u.location === currentUser.location) {
          score += 5;
          reasons.push(`Based in ${u.location}`);
        }

        // 3. Shared Language
        if (u.language && currentUser.language && u.language === currentUser.language) {
          score += 3;
          reasons.push(`Speaks ${u.language}`);
        }

        // 4. Profile Completeness / Verification
        if (u.isVerified) score += 5;
        if (u.avatar && u.avatar.length > 10) score += 2;
        if (u.bio && u.bio.length > 5) score += 1;

        // 5. Shared Interests (Assuming basic array match if interests exists)
        if (u.interests && currentUser.interests) {
          const sharedInterests = u.interests.filter((i: string) => currentUser.interests.includes(i));
          if (sharedInterests.length > 0) {
            score += sharedInterests.length * 4;
            reasons.push(`Shares interests like ${sharedInterests[0]}`);
          }
        }

        return { ...u, pymkScore: score, pymkReasons: reasons };
      });

      // Sort by score desc, then fallback to randomized fallback if same score
      scoredUsers.sort((a, b) => b.pymkScore - a.pymkScore || Math.random() - 0.5);
      
      setRecommendations(scoredUsers.slice(0, 10)); // Top 10
      setLoading(false);
    };

    computeRecommendations();
  }, [users, currentUser, dismissedIds]);

  const handleDismiss = (userId: string) => {
    setDismissedIds(prev => [...prev, userId]);
    // Optionally persist dismissals to localStorage or firestore
  };

  const handleFollow = (userId: string) => {
    if (onFollow) {
      onFollow(userId);
    }
    setDismissedIds(prev => [...prev, userId]);
  };

  if (loading) return null;
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border-y sm:border sm:rounded-xl border-neutral-200 dark:border-slate-800 shadow-sm py-4 my-4">
      <div className="px-4 flex items-center justify-between mb-3">
        <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-[15px]">People You May Know</h3>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none snap-x">
        <AnimatePresence>
          {recommendations.map(user => (
            <motion.div 
              key={user.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, width: 0, margin: 0 }}
              className="min-w-[160px] max-w-[160px] bg-white dark:bg-slate-850 border border-neutral-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm flex flex-col flex-shrink-0 snap-start relative group"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); handleDismiss(user.id); }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center z-10 transition backdrop-blur-sm"
              >
                <X size={16} className="text-white" />
              </button>
              
              <div 
                className="h-[160px] bg-neutral-100 dark:bg-slate-800 cursor-pointer relative"
                onClick={() => onViewProfile && onViewProfile(user.id)}
              >
                <img 
                  src={user.avatar || 'https://i.pravatar.cc/150'} 
                  alt={user.fullName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://i.pravatar.cc/150'; }}
                />
              </div>

              <div className="p-3 flex flex-col flex-1 relative">
                <div 
                  className="cursor-pointer"
                  onClick={() => onViewProfile && onViewProfile(user.id)}
                >
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 line-clamp-1 flex items-center gap-1 hover:underline pr-4">
                    {user.fullName}
                    {(user.isVerified || (user.invitesCount || 0) >= 5) && (
                      <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-verification-menu'))}
                        className="inline-block"
                      >
                        <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    )}
                  </h4>
                  {user.username && (
                    <p className="text-[11px] text-neutral-500 line-clamp-1">@{user.username}</p>
                  )}
                  {user.pymkReasons && user.pymkReasons.length > 0 ? (
                    <p className="text-[11px] text-neutral-500 line-clamp-2 mt-1 min-h-[32px]">
                      {user.pymkReasons[0]}
                    </p>
                  ) : (
                    <p className="text-[11px] text-neutral-500 line-clamp-2 mt-1 min-h-[32px]">
                      Suggested for you
                    </p>
                  )}
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                  className="absolute top-3 right-2 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
                >
                  <MoreHorizontal size={16} />
                </button>

                <div className="mt-auto pt-3">
                  <button 
                    onClick={() => handleFollow(user.id)}
                    className="w-full py-1.5 bg-[#E7F3FF] hover:bg-[#DBE7F2] dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-[#1877F2] dark:text-blue-400 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <UserPlus size={14} /> Add Friend
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom Sheet for More Options */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:p-4 animate-in fade-in">
          <div 
            className="absolute inset-0"
            onClick={() => setSelectedUser(null)}
          />
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl relative z-10 animate-in slide-in-from-bottom flex flex-col overflow-hidden">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1.5 bg-neutral-300 dark:bg-slate-700 rounded-full" />
            </div>
            
            <div className="p-4 border-b border-neutral-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-center">Manage Recommendation</h3>
            </div>
            
            <div className="p-2">
              <button className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-xl transition">
                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <X size={20} className="text-neutral-700 dark:text-neutral-300" />
                </div>
                <div className="text-left" onClick={() => {
                  handleDismiss(selectedUser.id);
                  setSelectedUser(null);
                }}>
                  <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">Hide People You May Know</h4>
                  <p className="text-xs text-neutral-500">Hide this recommendation and show fewer similar suggestions.</p>
                </div>
              </button>

              <div className="px-4 py-3 bg-neutral-50 dark:bg-slate-800/50 rounded-xl mx-2 my-2 border border-neutral-100 dark:border-slate-700">
                <h4 className="font-semibold text-sm mb-1">Why am I seeing this recommendation?</h4>
                <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1 list-disc pl-4">
                  {selectedUser.pymkReasons?.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                  {(!selectedUser.pymkReasons || selectedUser.pymkReasons.length === 0) && (
                    <li>Activity and engagement patterns</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
