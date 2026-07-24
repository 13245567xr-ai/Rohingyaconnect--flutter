import React from "react";
import { ChatMessage, User } from "../types";

interface MessageActionsMenuProps {
  message: ChatMessage;
  currentUser: User | any;
  onDeleteForEveryone: () => void;
  onDeleteForMe: () => void;
  onCancel: () => void;
}

export default function MessageActionsMenu({
  message,
  currentUser,
  onDeleteForEveryone,
  onDeleteForMe,
  onCancel,
}: MessageActionsMenuProps) {
  // Determine if the message is sent by the current user
  const isSender = 
    message.senderId === currentUser?.id || 
    message.senderId === currentUser?.uid ||
    (message as any).sender === currentUser?.id ||
    (message as any).sender === currentUser?.uid;

  return (
    <div className="fixed inset-0 z-55 bg-black/70 backdrop-blur-sm flex items-end justify-center p-0 animate-fade-in" id="message-actions-menu-overlay">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onCancel} />
      
      {/* Bottom Sheet Container */}
      <div 
        className="relative w-full max-w-md bg-slate-950 rounded-t-3xl border-t border-slate-800/80 px-6 pt-5 pb-8 flex flex-col gap-3 shadow-2xl animate-slide-up z-10"
        id="message-actions-menu-sheet"
      >
        {/* Handle bar for visual indicator of bottom sheet */}
        <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-4" />
        
        {isSender && (
          <button
            onClick={onDeleteForEveryone}
            className="w-full py-4 text-center text-emerald-500 font-bold hover:bg-slate-900 active:bg-slate-900 rounded-2xl transition-colors cursor-pointer text-sm tracking-wide"
            id="btn-delete-for-everyone"
          >
            Delete for everyone
          </button>
        )}
        
        <button
          onClick={onDeleteForMe}
          className="w-full py-4 text-center text-emerald-500 font-bold hover:bg-slate-900 active:bg-slate-900 rounded-2xl transition-colors cursor-pointer text-sm tracking-wide border-t border-slate-900"
          id="btn-delete-for-me"
        >
          Delete for me
        </button>
        
        <button
          onClick={onCancel}
          className="w-full py-4 text-center text-emerald-500 font-bold hover:bg-slate-900 active:bg-slate-900 rounded-2xl transition-colors cursor-pointer text-sm tracking-wide border-t border-slate-900"
          id="btn-cancel-delete"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
