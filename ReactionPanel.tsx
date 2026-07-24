import React from 'react';
import { motion } from 'motion/react';

export interface ReactionOption {
  name: string;
  icon: string;
  type: string;
  color: string;
}

export const REACTION_OPTIONS: ReactionOption[] = [
  { name: 'Like', icon: '👍', type: 'like', color: 'text-[#1877F2]' },
  { name: 'Love', icon: '❤️', type: 'love', color: 'text-rose-500' },
  { name: 'Happy', icon: '😊', type: 'happy', color: 'text-amber-500' },
  { name: 'Haha', icon: '😄', type: 'haha', color: 'text-amber-500' },
  { name: 'Wow', icon: '😲', type: 'wow', color: 'text-amber-500' },
  { name: 'Sad', icon: '😢', type: 'sad', color: 'text-cyan-500' },
  { name: 'Angry', icon: '😡', type: 'angry', color: 'text-orange-500' },
];

export const getReactionDetails = (type?: string | null): ReactionOption => {
  if (!type) return { name: 'Like', icon: '👍', type: 'like', color: 'text-[#1877F2]' };
  const found = REACTION_OPTIONS.find(r => r.type === type.toLowerCase() || r.name.toLowerCase() === type.toLowerCase());
  return found || { name: 'Like', icon: '👍', type: 'like', color: 'text-[#1877F2]' };
};

export const ReactionPanel = ({ 
  onSelect, 
  onClose 
}: { 
  onSelect: (reaction: string, option?: ReactionOption) => void; 
  onClose: () => void; 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      className="absolute -top-14 left-0 bg-white dark:bg-slate-900 shadow-2xl rounded-full px-3 py-2 flex items-center gap-2.5 border border-slate-200 dark:border-slate-750 z-50 animate-bounceIn"
    >
      {REACTION_OPTIONS.map((r) => (
        <button
          key={r.type}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(r.type, r);
            onClose();
          }}
          title={r.name}
          className="group relative flex flex-col items-center text-2xl hover:scale-135 active:scale-95 transition-transform duration-150 cursor-pointer"
        >
          <span className="absolute -top-7 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-md whitespace-nowrap">
            {r.name}
          </span>
          <span>{r.icon}</span>
        </button>
      ))}
    </motion.div>
  );
};

