import React from 'react';
import { Star, Check, CheckCheck, Play, Pause, Loader2, Forward } from 'lucide-react';
import FullScreenImageViewer from './FullScreenImageViewer';

export const ChatBubble = ({ 
  msg, 
  isSender, 
  currentTheme, 
  onLongPress, 
  isSelected,
  onForward
}: any) => {
  const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
  const isStarred = msg.isStarred;

  return (
    <div 
      className={`flex flex-col max-w-[85%] sm:max-w-[70%] group relative ${isSender ? 'ml-auto items-end' : 'mr-auto items-start'} cursor-pointer select-none transition-all duration-200 ${
        isSelected ? 'bg-emerald-500/10 dark:bg-emerald-500/15 rounded-2xl p-2 ring-2 ring-emerald-500/45' : ''
      }`}
      onContextMenu={(e) => { e.preventDefault(); onLongPress(msg); }}
      onTouchStart={(e) => { 
        // Need to implement long press timer here if not already done in parent
        onLongPress(msg);
      }}
    >
      <div className="flex items-center gap-2 w-full">
        {/* Forward icon */}
        {isSender && (
          <button 
            onClick={() => onForward(msg)}
            className="opacity-0 group-hover:opacity-100 p-1 bg-slate-100 dark:bg-slate-850 rounded-full text-slate-450 hover:text-slate-700 transition cursor-pointer self-center"
          >
            <Forward className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Bubble */}
        <div 
          className={`relative px-4 py-3 rounded-2xl shadow-sm transition duration-150 break-words w-full ${
            isSender ? currentTheme.bubbleSender : currentTheme.bubbleReceiver
          } ${msg.isDeleted ? 'italic opacity-60 font-mono text-[10px]' : ''}`}
        >
          {isStarred && <Star className="absolute top-1 right-1 w-3 h-3 fill-yellow-400 stroke-yellow-400" />}

          {/* Image */}
          {msg.imageUrl && (
            <div className="mb-2 overflow-hidden rounded-xl border border-black/5 bg-slate-950/20 max-w-full">
              <FullScreenImageViewer imageUrl={msg.imageUrl} userFullName={msg.senderName} timestamp={msg.createdAt}>
                <img 
                  // FIXED ERROR 2
                  src={msg.imageUrl || "/default-avatar.png"} 
                  onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                  alt="Sent media" 
                  className="w-full h-auto max-h-64 object-contain cursor-pointer" 
                  referrerPolicy="no-referrer" 
                />
              </FullScreenImageViewer>
            </div>
          )}

          {/* Text/Other */}
          {msg.text && <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>}

          {/* Footer */}
          <div className="flex items-center justify-end gap-1 mt-1 opacity-70 text-[9px] font-mono">
            <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            {isSender && (
              msg.readBy && Object.keys(msg.readBy).length > 1 ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> : <Check className="w-3.5 h-3.5 text-slate-300" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
