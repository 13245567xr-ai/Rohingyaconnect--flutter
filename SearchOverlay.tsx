import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, Search as SearchIcon, Clock, UserCheck, Plus, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchOverlayProps {
  isVisible: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  currentUser: User;
  users: User[]; // all users
  onFollowToggle: (userId: string) => Promise<void>;
  onViewProfile: (userId: string) => void;
}

const RECENT_SEARCHES_KEY = 'rohinconnect_recent_searches';

export function SearchOverlay({
  isVisible,
  searchQuery,
  onSearchChange,
  onClose,
  currentUser,
  users,
  onFollowToggle,
  onViewProfile
}: SearchOverlayProps) {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading recent searches', e);
    }
  }, []);

  // Sync to local storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    } catch (e) {
      console.error('Error saving recent searches', e);
    }
  }, [recentSearches]);

  // When unmounting or closing, if there's a query, we might want to save it. But let's only save on enter/search action if we had a form, or debounce it.
  // Actually, we can add to recent searches when the user clicks a result or presses enter (we don't have enter handler yet). Let's do it on unmount if searchQuery is not empty.
  useEffect(() => {
    if (!isVisible && searchQuery.trim().length > 0) {
      addRecentSearch(searchQuery.trim());
    }
  }, [isVisible]);

  const addRecentSearch = (query: string) => {
    setRecentSearches(prev => {
      const newRecent = [query, ...prev.filter(q => q !== query)].slice(0, 5);
      return newRecent;
    });
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
  };

  const handleRemoveRecentSearch = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => prev.filter(q => q !== query));
  };

  const handleFollowClick = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (followLoadingId) return;
    setFollowLoadingId(userId);
    try {
      await onFollowToggle(userId);
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setFollowLoadingId(null);
    }
  };

  // Filter suggested users: exclude current user, and people already following
  const suggestedUsers = users.filter(u => 
    u.id !== currentUser.id && 
    !(currentUser.following && currentUser.following.includes(u.id))
  ).slice(0, 10); // Show top 10

  // Filter active search results if there's a query
  const searchResults = searchQuery.trim().length > 0 
    ? users.filter(u => u.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm overflow-y-auto pt-20 pb-6 px-4 md:px-6"
        >
          <div className="max-w-3xl mx-auto w-full">
            
            {/* If actively searching, show results */}
            {searchQuery.trim().length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">People</h3>
                {searchResults.length > 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    {searchResults.map(user => {
                      const isFollowing = currentUser.following?.includes(user.id);
                      return (
                        <div 
                          key={user.id} 
                          onClick={() => {
                            addRecentSearch(searchQuery.trim());
                            onClose();
                            onViewProfile(user.id);
                          }}
                          className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <img src={user.avatar} alt={user.fullName} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">{user.fullName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">@{user.id.substring(0, 8)}</p>
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => handleFollowClick(user.id, e)}
                            disabled={followLoadingId === user.id}
                            className={`text-[13px] font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center ${
                              isFollowing 
                                ? 'text-neutral-500 dark:text-neutral-400' 
                                : 'text-[#1877F2] hover:text-[#166fe5]'
                            }`}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                    No people found matching "{searchQuery}"
                  </div>
                )}
              </div>
            ) : (
              // Default View: Recent Searches + Suggested Users
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                
                {/* Recent Searches Section */}
                {recentSearches.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Recent Searches</h3>
                      <button 
                        onClick={handleClearRecent}
                        className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map(query => (
                        <div 
                          key={query}
                          onClick={() => onSearchChange(query)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{query}</span>
                          <button 
                            onClick={(e) => handleRemoveRecentSearch(query, e)}
                            className="p-0.5 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full ml-1"
                          >
                            <X className="w-3 h-3 text-slate-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Suggested New Followers Section */}
                {suggestedUsers.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Suggested New Followers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {suggestedUsers.map(user => (
                        <div 
                          key={user.id}
                          onClick={() => {
                            onClose();
                            onViewProfile(user.id);
                          }}
                          className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <img src={user.avatar} alt={user.fullName} className="w-12 h-12 rounded-full object-cover" />
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">{user.fullName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Suggested for you
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleFollowClick(user.id, e)}
                            disabled={followLoadingId === user.id}
                            className="text-[13px] font-bold text-[#1877F2] hover:text-[#166fe5] transition-all active:scale-95 disabled:opacity-50"
                          >
                            Follow
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
