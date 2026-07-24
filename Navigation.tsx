import React from 'react';
import { Home, Tv, ShoppingBag, MessageSquare, User, Menu, Plus, BookOpen, Heart, Info, Bell, Film, Sparkles } from 'lucide-react';
import { User as UserType } from '../types';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: UserType;
  onOpenCreatePostModal: (options?: { isVideo?: boolean }) => void;
  hideBottomNav?: boolean;
}

export default function Navigation({
  activeTab,
  onTabChange,
  currentUser,
  onOpenCreatePostModal,
  hideBottomNav = false
}: NavigationProps) {
  
  const mobileNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'shorts', label: 'Shorts', icon: Film },
    { id: 'video', label: 'Videos', icon: Tv },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare },
    { id: 'profile', label: 'My profile', icon: User },
    { id: 'menu', label: 'Menu', icon: Menu },
  ];

  const desktopNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'shorts', label: 'Shorts', icon: Film },
    { id: 'video', label: 'Videos', icon: Tv },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare },
    { id: 'profile', label: 'My profile', icon: User },
    { id: 'menu', label: 'Menu', icon: Menu },
  ];

  return (
    <>
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 md:hidden h-16 px-2 shadow-lg flex items-center justify-around transition-colors duration-200">
          {mobileNavItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex flex-col items-center justify-center flex-1 h-full relative"
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold scale-110' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  <IconComponent className="w-5.5 h-5.5" />
                </div>
                <span className={`text-[9px] mt-0.5 tracking-tight ${isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </nav>
      )}
      {/* DESKTOP LEFT SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-4rem)] sticky top-16 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950 border-r border-slate-200/50 dark:border-slate-800/50 select-none">
        
        {/* User Card */}
        <div 
          onClick={() => onTabChange('profile')}
          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-200/50 dark:hover:bg-slate-900 cursor-pointer transition mb-4 border border-transparent hover:border-slate-300/40 dark:hover:border-slate-800"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.fullName}
            className="w-10 h-10 rounded-full object-cover border border-emerald-500/50 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
              <span className="truncate">{currentUser.fullName}</span>
              {(currentUser.isVerified || (currentUser.invitesCount || 0) >= 5) && <BlueVerifiedTick className="w-4 h-4 shrink-0" />}
            </h4>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">@{currentUser.username}</span>
          </div>
        </div>

        {/* Action Button: Create Post / Video */}
        <button
          onClick={() => onOpenCreatePostModal({ isVideo: false })}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 flex items-center justify-center gap-2 mb-6 transition cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Share Something New
        </button>

        {/* Navigation links */}
        <nav className="flex-grow space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Main Navigation</p>
          {desktopNavItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition duration-150 ${
                  isActive 
                    ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-700 dark:text-emerald-300 border-l-4 border-emerald-500' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Community Resource links Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2.5">Community Resources</p>
          <div className="space-y-2 px-3 text-xs text-slate-500 dark:text-slate-400">
            <a 
              href="#rules" 
              onClick={(e) => { e.preventDefault(); onTabChange('menu'); }}
              className="flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span>Community Guidelines</span>
            </a>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>Language Preservation</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>RohingyaConnect v1.0</span>
            </div>
          </div>
        </div>

      </aside>
    </>
  );
}
