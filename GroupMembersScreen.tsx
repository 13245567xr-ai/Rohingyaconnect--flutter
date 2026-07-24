import React from 'react';
import { Users, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { CommunityGroup } from '../types';

// Mock data fetcher - in a real app this would come from a context or API
const getGroupData = (groupId: string): CommunityGroup | null => {
  // Placeholder: In a real app, fetch from store/API
  return null; 
};

export default function GroupMembersScreen() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  
  // Placeholder for real data
  const group = getGroupData(groupId || '');

  if (!group) return <div className="p-4">Group not found: {groupId}</div>;

  const admins = group.members.filter(m => m.role === 'admin');
  const members = group.members.filter(m => m.role === 'member');

  const MemberRow = ({ member, role }: { member: any; role: 'admin' | 'member' }) => (
    <div 
      className="flex items-center p-4 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
      onClick={() => navigate(`/member/${member.userId}?role=${role}`)}
    >
      <img src={member.avatar} alt={member.fullName} className="w-10 h-10 rounded-full" />
      <div className="ml-3 flex-grow">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{member.fullName}</h4>
        <span className="text-[10px] text-slate-500 uppercase">{role}</span>
      </div>
      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">{role}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[10000] bg-white dark:bg-slate-900 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
        <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">Group Members</h2>
      </div>

      <div className="p-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Admins</h3>
        {admins.map(m => <MemberRow key={m.userId} member={m} role="admin" />)}
        
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-6 mb-2">Members</h3>
        {members.map(m => <MemberRow key={m.userId} member={m} role="member" />)}
      </div>
    </div>
  );
}
