import React from 'react';
import { 
  ChevronLeft, Phone, Video, Search, MoreVertical, 
  BellOff, Clock, Palette, Trash2, AlertTriangle, MessageSquarePlus, List
} from 'lucide-react';
import { User } from '../types';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface ChatHeaderProps {
  targetUser: User | null;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
  onStartCall: (type: 'audio' | 'video', target: User) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isMoreMenuOpen: boolean;
  setIsMoreMenuOpen: (open: boolean) => void;
  activeStatusColor: string;
  onDisappearingMessagesClick?: () => void;
  onNewChat?: () => void;
  onChatList?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  targetUser,
  onClose,
  onViewProfile,
  onStartCall,
  isSearchOpen,
  setIsSearchOpen,
  isMoreMenuOpen,
  setIsMoreMenuOpen,
  activeStatusColor,
  onDisappearingMessagesClick,
  onNewChat,
  onChatList
}) => {
  // RESTOREED OLD HEADER items: Mute, Disappearing, Theme, Clear, Report
  return (
    <div id="chat_appbar" className="relative z-15 flex items-center justify-between px-3 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-2 max-w-[70%]">
        <button 
          id="back_to_inbox_btn"
          onClick={onClose} 
          className="p-1.5 md:hidden hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5px]" />
        </button>
        
        <div 
          onClick={() => targetUser && onViewProfile(targetUser.id)}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="relative">
            <img 
              // FIXED ERROR 2
              src={(targetUser?.avatar && targetUser.avatar !== '') ? targetUser.avatar : '/default-avatar.png'} 
              onError={(e) => e.currentTarget.src = "/default-avatar.png"}
              alt={targetUser?.fullName} 
              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800 group-hover:scale-105 transition duration-200"
              referrerPolicy="no-referrer"
            />
            <span 
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"
              style={{ backgroundColor: activeStatusColor }}
            />
          </div>
          
          <div className="min-w-0">
            <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-100 truncate group-hover:text-emerald-500 transition duration-150 leading-tight flex items-center gap-1">
              {targetUser?.fullName}
              {targetUser?.isVerified && <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />}
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
              @{targetUser?.username}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 relative">
        {targetUser?.id === 'rc_assistant' && (
          <>
            {onNewChat && (
              <button 
                onClick={onNewChat}
                className="flex items-center gap-1.5 px-3 py-1.5 mr-1 text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition duration-150 border border-emerald-500/25 bg-emerald-500/5 cursor-pointer"
                title="Start New Chat"
                id="new_chat_header_btn"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
                <span>New</span>
              </button>
            )}
            {onChatList && (
              <button 
                onClick={onChatList}
                className="flex items-center gap-1.5 px-3 py-1.5 mr-1 text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-full transition duration-150 border border-blue-500/25 bg-blue-500/5 cursor-pointer"
                title="Chat List"
                id="chat_list_header_btn"
              >
                <List className="w-3.5 h-3.5 shrink-0" />
                <span>List</span>
              </button>
            )}
          </>
        )}
        <button 
          onClick={() => targetUser && onStartCall('audio', targetUser)}
          className="p-2 text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
          title="Voice Call"
        >
          <Phone className="w-4.5 h-4.5" />
        </button>

        <button 
          onClick={() => targetUser && onStartCall('video', targetUser)}
          className="p-2 text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
          title="Video Call"
        >
          <Video className="w-4.5 h-4.5" />
        </button>
        <button 
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className={`p-2 rounded-full transition ${isSearchOpen ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Search Conversation"
        >
          <Search className="w-4.5 h-4.5" />
        </button>
        <button 
          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          className="p-2 text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
          title="More Options"
        >
          <MoreVertical className="w-4.5 h-4.5" />
        </button>

        {isMoreMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-20 bg-transparent" 
              onClick={() => setIsMoreMenuOpen(false)} 
            />
            <div className="absolute right-0 top-11 z-30 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 animate-fadeIn overflow-hidden">
              <button 
                onClick={() => { setIsMoreMenuOpen(false); alert('Mute notifications'); }}
                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition"
              >
                <BellOff className="w-4 h-4 text-slate-500" /> Mute notifications
              </button>
              
              <button 
                onClick={() => { 
                  setIsMoreMenuOpen(false); 
                  if (onDisappearingMessagesClick) onDisappearingMessagesClick(); 
                }}
                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition"
              >
                <Clock className="w-4 h-4 text-blue-500" /> Disappearing messages
              </button>

              <button 
                onClick={() => { setIsMoreMenuOpen(false); alert('Wallpaper/Theme'); }}
                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition"
              >
                <Palette className="w-4 h-4 text-purple-500" /> Wallpaper/Theme
              </button>

              <button 
                onClick={() => { setIsMoreMenuOpen(false); alert('Clear chat'); }}
                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition"
              >
                <Trash2 className="w-4 h-4 text-rose-500" /> Clear chat
              </button>

              <button 
                onClick={() => { setIsMoreMenuOpen(false); alert('Report'); }}
                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition"
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
