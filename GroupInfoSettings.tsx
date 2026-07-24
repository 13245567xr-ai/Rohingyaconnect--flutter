import React, { useState, useEffect } from 'react';
import { X, Camera, MoreVertical, UserPlus, Search, Palette, Users, List, Mic, Bell, Eye, ShieldAlert, Flag, Share2, ArrowLeft } from 'lucide-react';
import { CommunityGroup } from '../types';
import { subscribeToGroupSettings, updateGroupSettings, GroupSettings, addMembersToGroup, setMemberNickname, removeMemberNickname, blockMember, unblockMember, uploadGroupAvatar } from '../services/groupSettingsService';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface GroupInfoSettingsProps {
  group: CommunityGroup;
  onClose: () => void;
}

export default function GroupInfoSettings({ group, onClose }: GroupInfoSettingsProps) {
  const [page, setPage] = useState<'info' | 'members' | 'nicknames' | 'search' | 'customize' | 'invites' | 'media' | 'pinned' | 'block' | 'report'>('info');
  const [settings, setSettings] = useState<GroupSettings>({
      mute: false,
      notifications: true,
      readReceipts: true,
      typingIndicator: true,
      themeColor: '#10b981'
  });

  useEffect(() => {
    const unsubscribe = subscribeToGroupSettings(group.id, (newSettings) => {
        setSettings(newSettings);
    });
    return () => unsubscribe();
  }, [group.id]);

  const handleToggle = (key: keyof GroupSettings, value: boolean) => {
    updateGroupSettings(group.id, { [key]: value });
  };

  const admins = group?.members?.filter((m) => m.role === 'admin') || [];
  const members = group?.members?.filter((m) => m.role === 'member') || [];
  const inviteLink = `https://rc.app/join/${group.id}`;

  const handleInvite = async () => {
    if (navigator.share) {
      await navigator.share({ title: group.name, text: `Join ${group.name}: ${inviteLink}` });
    } else {
      navigator.clipboard.writeText(inviteLink);
      alert('Invite link copied');
    }
  };

  const handleUpdatePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        await uploadGroupAvatar(group.id, e.target.files[0]);
    }
  };

  // UI rendering based on 'page'
  if (page === 'members') {
    return (
      <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-900 flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <button onClick={() => setPage('info')}><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">Group Members</h2>
        </div>
        <div className="p-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Admins ({admins.length})</h3>
          {admins.map((m) => (
            <div key={m.userId} className="w-full flex items-center p-3 border-b border-slate-100 dark:border-slate-800">
              <img src={m.avatar} alt={m.fullName} className="w-10 h-10 rounded-full object-cover" />
              <span className="ml-3 text-sm font-bold text-slate-800 dark:text-slate-100">{m.fullName}</span>
            </div>
          ))}
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-6 mb-2">Members ({members.length})</h3>
          {members.map((m) => (
            <div key={m.userId} className="w-full flex items-center p-3 border-b border-slate-100 dark:border-slate-800">
              <img src={m.avatar} alt={m.fullName} className="w-10 h-10 rounded-full object-cover" />
              <span className="ml-3 text-sm font-bold text-slate-800 dark:text-slate-100">{m.fullName}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-900 flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
        <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">Group Info</h2>
        <button onClick={() => alert('Options menu')}><MoreVertical className="w-5 h-5 text-slate-500" /></button>
      </div>

      <div className="flex flex-col items-center py-6 border-b border-slate-200 dark:border-slate-800">
        <label className="cursor-pointer">
          <input type="file" className="hidden" accept="image/*" onChange={handleUpdatePhoto} />
          <img src={group.avatar} alt={group.name} className="w-24 h-24 rounded-full object-cover border" />
        </label>
        <span className="text-lg font-black text-slate-800 dark:text-slate-100 text-center mt-4">{group.name}</span>
      </div>

      <div className="p-4 border-b border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-2">
        <button className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl" onClick={handleInvite}><Share2 className="w-5 h-5 text-emerald-600" /><span className="text-[10px] font-bold">Invite</span></button>
        <button className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl" onClick={() => setPage('nicknames')}><Users className="w-5 h-5 text-emerald-600" /><span className="text-[10px] font-bold">Nicknames</span></button>
        <button className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl" onClick={() => setPage('search')}><Search className="w-5 h-5 text-emerald-600" /><span className="text-[10px] font-bold">Search</span></button>
        <button className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl" onClick={() => setPage('customize')}><Palette className="w-5 h-5 text-emerald-600" /><span className="text-[10px] font-bold">Customize</span></button>
      </div>

      <div className="py-2">
        <button className="w-full px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-3" onClick={() => setPage('members')}><Users className="w-4 h-4" /> View members ({admins.length + members.length})</button>
        <button className="w-full px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-3" onClick={() => setPage('invites')}> <UserPlus className="w-4 h-4" /> Invites & requests</button>
        <button className="w-full px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-3" onClick={() => setPage('media')}> <Camera className="w-4 h-4" /> View media, files & links</button>
        <button className="w-full px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-3" onClick={() => setPage('pinned')}><List className="w-4 h-4" /> Pinned messages</button>
      </div>

      <div className="py-2 border-t border-slate-200 dark:border-slate-800">
        <div className="px-4 py-3 flex justify-between items-center text-xs font-bold">
            <span className="flex items-center gap-3 text-slate-700 dark:text-slate-200"><Bell className="w-4 h-4" /> Mute Group</span>
            <input type="checkbox" checked={settings.mute} onChange={(e) => handleToggle('mute', e.target.checked)} className="h-5 w-5 accent-emerald-600" />
        </div>
        <div className="px-4 py-3 flex justify-between items-center text-xs font-bold">
            <span className="flex items-center gap-3 text-slate-700 dark:text-slate-200"><Bell className="w-4 h-4" /> Notifications & sounds</span>
            <input type="checkbox" checked={settings.notifications} onChange={(e) => handleToggle('notifications', e.target.checked)} className="h-5 w-5 accent-emerald-600" />
        </div>
        <div className="px-4 py-3 flex justify-between items-center text-xs font-bold">
            <span className="flex items-center gap-3 text-slate-700 dark:text-slate-200"><Eye className="w-4 h-4" /> Read Receipts</span>
            <input type="checkbox" checked={settings.readReceipts} onChange={(e) => handleToggle('readReceipts', e.target.checked)} className="h-5 w-5 accent-emerald-600" />
        </div>
        <div className="px-4 py-3 flex justify-between items-center text-xs font-bold">
            <span className="flex items-center gap-3 text-slate-700 dark:text-slate-200"><Mic className="w-4 h-4" /> Typing indicator</span>
            <input type="checkbox" checked={settings.typingIndicator} onChange={(e) => handleToggle('typingIndicator', e.target.checked)} className="h-5 w-5 accent-emerald-600" />
        </div>
        <button className="w-full px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-3" onClick={() => setPage('block')}><ShieldAlert className="w-4 h-4" /> Block member</button>
        <button className="w-full px-4 py-3 text-xs font-bold text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-3" onClick={() => setPage('report')}><Flag className="w-4 h-4" /> Report</button>
      </div>
    </div>
  );
}
