import React, { useState } from 'react';
import { 
  Settings, ShieldAlert, LogOut, Sun, Moon, Users, Heart, BookOpenCheck, 
  ChevronRight, Activity, Search, ArrowLeft, BarChart3, Folder, Lock, ShieldCheck, Eye
} from 'lucide-react';
import { User, Post } from '../types';

// Sub-components
import CreatorDashboard from './CreatorDashboard';
import CommunityGroups from './CommunityGroups';
import ContentManagement from './ContentManagement';
import SettingsScreen from './SettingsScreen';
import SecurityCheckup from './SecurityCheckup';
import EncryptedChatSecurity from './EncryptedChatSecurity';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface MenuProps {
  currentUser: User;
  users: User[];
  posts: Post[];
  onUpdateProfile: (updated: User) => void;
  onFollowToggle: (userId: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  postsCount: number;
  marketplaceCount: number;
  onTabChange: (tab: string) => void;
  blockedWords: string[];
  onAddBlockedWord: (word: string) => void;
  onRemoveBlockedWord: (word: string) => void;
  themeChoice?: 'light' | 'dark' | 'system';
  onChangeThemeChoice?: (choice: 'light' | 'dark' | 'system') => void;
  appLanguage?: string;
  onChangeLanguage?: (lang: string) => void;
  onViewProfile?: (userId: string) => void;
}

export default function Menu({
  currentUser,
  users,
  posts,
  onUpdateProfile,
  onFollowToggle,
  isDarkMode,
  onToggleDarkMode,
  onLogout,
  postsCount,
  marketplaceCount,
  onTabChange,
  blockedWords,
  onAddBlockedWord,
  onRemoveBlockedWord,
  themeChoice = 'light',
  onChangeThemeChoice,
  appLanguage = 'en',
  onChangeLanguage,
  onViewProfile
}: MenuProps) {
  
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [subView, setSubView] = useState<null | 'analytics' | 'community' | 'content' | 'settings' | 'security' | 'encrypted-chat'>(null);

  // Other users to discover
  const otherUsers = users.filter(u => u.id !== currentUser.id);

  // Filter based on search discovery input
  const filteredDiscover = otherUsers.filter(u => {
    const q = discoverQuery.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  const guidelines = [
    { title: 'Preserve Unity & Respect', desc: 'Constructive interactions. Encourage, share, and support fellow members.' },
    { title: 'Maintain Integrity', desc: 'No false news or inflammatory topics. Share validated resource details.' },
    { title: 'Cultural Promotion', desc: 'Share poetry, Hanifi script tips, food recipes, and traditional designs.' },
  ];

  // SUB-VIEW ROUTER RENDERING
  if (subView === 'analytics') {
    return (
      <div className="w-full max-w-2xl mx-auto px-1 sm:px-4 pb-20 select-none">
        <button 
          onClick={() => setSubView(null)} 
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 font-extrabold mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Control Panel
        </button>
        <CreatorDashboard currentUser={currentUser} />
      </div>
    );
  }

  if (subView === 'community') {
    return (
      <div className="w-full max-w-2xl mx-auto px-1 sm:px-4 pb-20 select-none">
        <button 
          onClick={() => setSubView(null)} 
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 font-extrabold mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Control Panel
        </button>
        <CommunityGroups 
          currentUser={currentUser} 
          users={users} 
          blockedWords={blockedWords}
          onAddBlockedWord={onAddBlockedWord}
          onRemoveBlockedWord={onRemoveBlockedWord}
        />
      </div>
    );
  }

  if (subView === 'content') {
    return (
      <div className="w-full max-w-2xl mx-auto px-1 sm:px-4 pb-20 select-none">
        <button 
          onClick={() => setSubView(null)} 
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 font-extrabold mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Control Panel
        </button>
        <ContentManagement currentUser={currentUser} posts={posts} />
      </div>
    );
  }

  if (subView === 'settings') {
    return (
      <div className="w-full max-w-2xl mx-auto px-1 sm:px-4 pb-20 select-none">
        <button 
          onClick={() => setSubView(null)} 
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 font-extrabold mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Control Panel
        </button>
        <SettingsScreen 
          currentUser={currentUser} 
          users={users}
          onUpdateProfile={onUpdateProfile} 
          onTabChange={onTabChange}
          themeChoice={themeChoice}
          onChangeThemeChoice={onChangeThemeChoice}
          appLanguage={appLanguage}
          onChangeLanguage={onChangeLanguage}
        />
      </div>
    );
  }

  if (subView === 'security') {
    return (
      <div className="w-full max-w-2xl mx-auto px-1 sm:px-4 pb-20 select-none">
        <button 
          onClick={() => setSubView(null)} 
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 font-extrabold mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Control Panel
        </button>
        <SecurityCheckup currentUser={currentUser} />
      </div>
    );
  }

  if (subView === 'encrypted-chat') {
    return (
      <div className="w-full max-w-2xl mx-auto px-1 sm:px-4 pb-20 select-none">
        <button 
          onClick={() => setSubView(null)} 
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 font-extrabold mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Control Panel
        </button>
        <EncryptedChatSecurity currentUser={currentUser} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-1 sm:px-4 pb-20 select-none">
      
      {/* 3-LINE DASHBOARD HEADER */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 text-white mb-6 shadow-md shadow-emerald-500/10">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 animate-spin-slow" /> Control Panel & Settings
        </h2>
        <p className="text-xs text-emerald-100 mt-1 font-light">Configure your settings, browse statistics, and discover new connections.</p>
      </div>

      {/* SYSTEM METRICS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
          <Users className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
          <span className="text-sm font-black text-slate-800 dark:text-slate-150">{users.length}</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Total Users</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
          <Activity className="w-5 h-5 text-teal-500 mx-auto mb-1.5" />
          <span className="text-sm font-black text-slate-800 dark:text-slate-150">{postsCount}</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Timeline Posts</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
          <ShieldAlert className="w-5 h-5 text-sky-500 mx-auto mb-1.5" />
          <span className="text-sm font-black text-slate-800 dark:text-slate-150">{marketplaceCount}</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Market Listings</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
          <Heart className="w-5 h-5 text-rose-500 mx-auto mb-1.5" />
          <span className="text-sm font-black text-slate-800 dark:text-slate-150">{currentUser.following.length}</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Following</p>
        </div>
      </div>

      {/* DISCOVER PEOPLE SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-6 shadow-sm transition">
        
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Users className="w-5 h-5 text-emerald-500" /> Discover Connections
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Search and follow other Rohingya community members on RohingyaConnect.</p>
          </div>

          <div className="relative flex-grow sm:max-w-[200px]">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={discoverQuery}
              onChange={(e) => setDiscoverQuery(e.target.value)}
              placeholder="Search user..."
              className="w-full pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs rounded-lg outline-none"
            />
          </div>
        </div>

        {/* List of other users */}
        <div className="space-y-3.5 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 scrollbar-thin">
          {filteredDiscover.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">No matching users found.</p>
          ) : (
            filteredDiscover.map((user) => {
              const isFollowing = currentUser.following.includes(user.id);
              return (
                <div 
                  key={user.id}
                  className="flex justify-between items-center gap-3 pt-3 first:pt-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img 
                      src={user.avatar} 
                      alt={user.fullName} 
                      className="w-8.5 h-8.5 rounded-full object-cover border cursor-pointer hover:opacity-85 transition" 
                      referrerPolicy="no-referrer" 
                      onClick={() => onViewProfile && onViewProfile(user.id)}
                    />
                    <div className="min-w-0">
                      <h5 
                        className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug cursor-pointer hover:underline flex items-center gap-1"
                        onClick={() => onViewProfile && onViewProfile(user.id)}
                      >
                        {user.fullName}
                        {user.isVerified && <BlueVerifiedTick className="w-3.5 h-3.5" />}
                      </h5>
                      <span className="text-[9px] text-slate-400 truncate block">@{user.username}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onFollowToggle(user.id)}
                    className={`text-[10px] font-bold px-3.5 py-1.5 rounded-lg border transition duration-150 cursor-pointer ${isFollowing ? 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-750' : 'bg-emerald-600 border-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/10'}`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* COMMUNITY GUIDELINES PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-3">
          <BookOpenCheck className="w-5 h-5 text-emerald-500" /> Community Safety & Guidelines
        </h3>
        
        <div className="space-y-3.5">
          {guidelines.map((g, idx) => (
            <div key={idx} className="flex gap-2.5 items-start">
              <span className="w-5 h-5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center justify-center rounded-full flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div>
                <h5 className="text-xs font-bold text-slate-850 dark:text-slate-200 leading-snug">{g.title}</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed font-light mt-0.5">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SETTINGS MENU SELECTIONS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm mb-6">
        
        {/* Creator Dashboard & Analytics */}
        <div 
          onClick={() => setSubView('analytics')}
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition group"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-emerald-500 group-hover:animate-pulse" />
            <div>
              <span className="text-xs font-bold text-slate-750 dark:text-slate-200 block">Creator Dashboard & Analytics</span>
              <span className="text-[9px] text-slate-450 block">Views, Engagement, Demographics, Media Breakdown.</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Community & Group Management */}
        <div 
          onClick={() => setSubView('community')}
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition group"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-teal-500" />
            <div>
              <span className="text-xs font-bold text-slate-750 dark:text-slate-200 block">Community Spaces & Moderation</span>
              <span className="text-[9px] text-slate-450 block">Moderation Assist, blocked keywords, joined groups, invites.</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Content Management, Library & Playlists */}
        <div 
          onClick={() => setSubView('content')}
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition group"
        >
          <div className="flex items-center gap-3">
            <Folder className="w-5 h-5 text-sky-500" />
            <div>
              <span className="text-xs font-bold text-slate-750 dark:text-slate-200 block">Content Library & Playlists</span>
              <span className="text-[9px] text-slate-450 block">Media vault grids, sequential audio playlists, collaborations.</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Account & Search Settings Tree */}
        <div 
          onClick={() => setSubView('settings')}
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition group"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-xs font-bold text-slate-750 dark:text-slate-200 block">Account Settings & Privacy</span>
              <span className="text-[9px] text-slate-450 block">Search indexing, discovery controls, Account Center.</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Security Audit & Device Check */}
        <div 
          onClick={() => setSubView('security')}
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition group"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            <div>
              <span className="text-xs font-bold text-slate-750 dark:text-slate-200 block">Device list & Security Audits</span>
              <span className="text-[9px] text-slate-450 block">Device session manager, email logs, security checkup wizard.</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* E2EE Messaging Security */}
        <div 
          onClick={() => setSubView('encrypted-chat')}
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition group"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-purple-500" />
            <div>
              <span className="text-xs font-bold text-slate-750 dark:text-slate-200 block">E2EE Chat Cryptography</span>
              <span className="text-[9px] text-slate-450 block">Key change warnings, secure offline storage seed mnemonic.</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Control & Moderator Center Entry */}
        {(currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'moderator' || (currentUser as any).isAdmin) && (
          <div 
            onClick={() => onTabChange('admin')}
            className="flex justify-between items-center p-4 cursor-pointer bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition text-amber-600 dark:text-amber-400 font-extrabold"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span className="text-xs">Control & Moderator Center</span>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500" />
          </div>
        )}

        {/* Toggle Theme inline */}
        <div 
          onClick={onToggleDarkMode}
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition"
        >
          <div className="flex items-center gap-3">
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
            <span className="text-xs font-bold text-slate-750 dark:text-slate-200">
              {isDarkMode ? 'Toggle Light Theme' : 'Toggle Dark Theme'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* LOGOUT BUTTON */}
        <div 
          onClick={onLogout}
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/20 transition group"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-rose-500" />
            <span className="text-xs font-extrabold text-rose-500">Sign Out of RohingyaConnect</span>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-400" />
        </div>

      </div>

    </div>
  );
}
