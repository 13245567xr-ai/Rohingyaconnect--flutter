import React, { useState } from 'react';
import { User } from '../types';
import { Check, Plus, Music, X } from 'lucide-react';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface SuggestedPeopleCardProps {
  users: User[];
  currentUser: User;
  onFollowToggle: (userId: string) => void;
  onClose: () => void; 
}

export default function SuggestedPeopleCard({
  users,
  currentUser,
  onFollowToggle,
  onClose
}: SuggestedPeopleCardProps) {
  // Simple algorithm: exclude self, already followed, blocked.
  const [displayedUsers, setDisplayedUsers] = useState(
    users.filter(u => u.id !== currentUser.id && 
                      !(currentUser.following || []).includes(u.id) &&
                      !(currentUser.blockedUsers || []).includes(u.id))
         .slice(0, 15)
  );

  const handleRemove = (userId: string) => {
    setDisplayedUsers(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 p-4 snap-start relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Suggested People</h2>
        <button onClick={onClose} className="text-zinc-500"><X /></button>
      </div>
      
      <div className="flex-grow overflow-x-auto flex gap-4 scrollbar-none items-start pb-4">
        {displayedUsers.map(user => (
          <div key={user.id} className="min-w-[160px] bg-zinc-900 rounded-lg p-4 flex flex-col items-center">
             <img src={user.avatar} alt={user.fullName} className="w-20 h-20 rounded-full mb-3 object-cover" />
             <div className="text-white font-bold text-center truncate w-full">{user.fullName}</div>
             <div className="text-zinc-400 text-sm mb-1">@{user.username}</div>
             {user.isVerified && <BlueVerifiedTick className="w-4 h-4 mb-2" />}
             <div className="text-zinc-500 text-xs mb-4">{user.followersCount} followers</div>
             <div className="text-zinc-500 text-xs mb-4 line-clamp-2 text-center h-8">{user.bio}</div>
             <button
                onClick={() => onFollowToggle(user.id)}
                className={`w-full py-2 rounded-md font-bold text-sm ${currentUser.following?.includes(user.id) ? 'bg-zinc-700 text-white' : 'bg-emerald-500 text-white'}`}
             >
               {currentUser.following?.includes(user.id) ? 'Following' : 'Follow'}
             </button>
             <button onClick={() => handleRemove(user.id)} className="mt-2 text-zinc-500 text-xs">Remove</button>
          </div>
        ))}
      </div>
      
      {/* Music Section */}
      <div className="mt-auto p-4 bg-zinc-900 rounded-lg flex items-center gap-4 border border-zinc-800">
        <div className="w-12 h-12 bg-zinc-800 rounded-md flex items-center justify-center">
          <Music className="text-emerald-500" />
        </div>
        <div>
            <div className="text-white font-bold">Trending Audio Title</div>
            <div className="text-zinc-400 text-sm">Artist Name</div>
        </div>
      </div>
    </div>
  );
}
