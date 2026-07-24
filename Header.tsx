import React, { useState } from 'react';
import { Search, MessageSquare, Sun, Moon, HeartHandshake, LogOut, Check, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { User, type Notification, AccountSession } from '../types';
import { updateMessageRequestStatusInFirestore, FollowRequest } from '../utils/firebaseSync';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface HeaderProps {
  currentUser: User;
  onTabChange: (tab: string) => void;
  activeTab: string;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  onSearchFocus?: () => void;
  isSearchActive?: boolean;
  onSearchCancel?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  notifications: Notification[];
  onMarkNotificationsAsRead: () => void;
  onLogout: () => void;
  setActiveChatUserId?: (userId: string | null) => void;
  
  // Multi-Account Management
  loggedAccounts: AccountSession[];
  onSwitchAccount: (username: string) => void;
  onAddAccountClick: () => void;
  onRemoveAccount: (username: string) => void;
  followRequests?: FollowRequest[];
  appName?: string;
  appLogo?: string;
}

export default function Header({
  currentUser,
  onTabChange,
  activeTab,
  onSearchChange,
  searchQuery,
  onSearchFocus,
  isSearchActive,
  onSearchCancel,
  isDarkMode,
  onToggleDarkMode,
  notifications,
  onMarkNotificationsAsRead,
  onLogout,
  setActiveChatUserId,
  loggedAccounts,
  onSwitchAccount,
  onAddAccountClick,
  onRemoveAccount,
  followRequests = [],
  appName = "RohingyaConnect",
  appLogo
}: HeaderProps) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo and Title */}
        <div 
          onClick={() => onTabChange('home')}
          className="flex items-center gap-2 cursor-pointer flex-shrink-0"
        >
          {appLogo ? (
            <img 
              // FIXED ERROR 2
              src={appLogo || "/default-avatar.png"} 
              onError={(e) => e.currentTarget.src = "/default-avatar.png"}
              className="w-9 h-9 rounded-xl object-cover shadow" 
              alt="Logo" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-md shadow-emerald-500/25">
              <HeartHandshake className="w-5 h-5" />
            </div>
          )}
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent hidden sm:inline-block">
            {appName}
          </span>
        </div>

        {/* Search Bar - Centers on desktop, takes up free space */}
        <div className="flex-grow max-w-md relative flex items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={onSearchFocus}
              placeholder="Search posts or people..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 border border-transparent focus:bg-white dark:focus:bg-slate-850 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition duration-200"
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-2 text-xs font-semibold text-emerald-500 dark:text-emerald-400 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          {isSearchActive && (
            <button
              onClick={onSearchCancel}
              className="ml-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          
          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-750" />}
          </button>

          {/* Inbox Quick Link */}
          <button
            onClick={() => onTabChange('inbox')}
            className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative ${activeTab === 'inbox' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : ''}`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* User Account Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-1 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <img
                // FIXED ERROR 2
                src={currentUser.avatar || "/default-avatar.png"}
                onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                alt={currentUser.fullName}
                className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                referrerPolicy="no-referrer"
              />
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 animate-fadeIn overflow-hidden">
                {/* Active user header */}
                <div 
                  onClick={() => {
                    setShowUserDropdown(false);
                    onTabChange('profile');
                  }}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-3"
                >
                  <img 
                    // FIXED ERROR 2
                    src={currentUser.avatar || "/default-avatar.png"} 
                    onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                    alt="active avatar" 
                    className="w-9 h-9 rounded-full object-cover border border-slate-250 dark:border-slate-700" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="min-w-0 flex-grow">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <span className="truncate">{currentUser.fullName}</span>
                      {(currentUser.isVerified || (currentUser.invitesCount || 0) >= 5) && <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">@{currentUser.username}</p>
                  </div>
                </div>

                {/* Linked Accounts Section */}
                <div className="py-2 px-3 space-y-2 max-h-48 overflow-y-auto bg-slate-50/55 dark:bg-slate-950/25">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Linked Accounts</span>
                    <span className="text-[8px] text-slate-400 font-mono">Sessions: {loggedAccounts.length}</span>
                  </div>

                  <div className="space-y-1.5">
                    {loggedAccounts.map((acc) => {
                      const isActive = acc.username === currentUser.username;
                      return (
                        <div key={acc.username} className="flex justify-between items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <img 
                              // FIXED ERROR 2
                              src={acc.avatar || "/default-avatar.png"} 
                              onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                              alt={acc.fullName} 
                              className="w-6.5 h-6.5 rounded-full object-cover border" 
                              referrerPolicy="no-referrer" 
                            />
                            <div className="min-w-0">
                              <p className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1 leading-tight">
                                <span className="truncate">{acc.fullName}</span>
                                {(acc.isVerified || (acc.invitesCount || 0) >= 5) && <BlueVerifiedTick className="w-2.5 h-2.5 shrink-0" />}
                              </p>
                              <span className="text-[8px] text-slate-400 block">@{acc.username}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {isActive ? (
                              <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5 font-bold" /> Active
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setShowUserDropdown(false);
                                    onSwitchAccount(acc.username);
                                  }}
                                  className="text-[8px] font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 px-2 py-1 rounded cursor-pointer transition"
                                >
                                  Switch
                                </button>
                                <button
                                  onClick={() => onRemoveAccount(acc.username)}
                                  className="text-slate-400 hover:text-rose-500 p-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-850"
                                  title="Unlink session"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Switcher Controls & Standard Links */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onAddAccountClick();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-2 font-black cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 font-bold" /> Add New Account
                  </button>

                  {((currentUser as any).role === 'admin' || (currentUser as any).role === 'moderator' || (currentUser as any).isAdmin) && (
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onTabChange('admin');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-2 font-black cursor-pointer border-t border-slate-105 dark:border-slate-850"
                    >
                      🛡️ Control & Moderator Center
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onTabChange('menu');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-750 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-2 cursor-pointer"
                  >
                    View Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
