import React, { useState } from 'react';
import { ShieldCheck, MessageSquare, Plus, Users, Share2, Search, Trash2, CheckCircle, AlertTriangle, UserPlus, Sparkles, AlertCircle } from 'lucide-react';
import { User } from '../types';

interface CommunityGroupsProps {
  currentUser: User;
  users: User[];
  blockedWords: string[];
  onAddBlockedWord: (word: string) => void;
  onRemoveBlockedWord: (word: string) => void;
}

interface Group {
  id: string;
  name: string;
  category: string;
  description: string;
  membersCount: number;
  image: string;
  isPrivate: boolean;
}

interface FlaggedComment {
  id: string;
  author: string;
  avatar: string;
  commentText: string;
  flaggedWord: string;
  postTitle: string;
}

export default function CommunityGroups({ 
  currentUser, 
  users,
  blockedWords,
  onAddBlockedWord,
  onRemoveBlockedWord
}: CommunityGroupsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'moderation'>('groups');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. GROUPS & INVITATIONS STATE
  const [groups, setGroups] = useState<Group[]>([
    {
      id: 'g1',
      name: 'Hanifi Script Academy',
      category: 'Education & Language',
      description: 'Learn and preserve the Hanifi Rohingya writing system. Daily lessons and calligraphy contests.',
      membersCount: 1420,
      image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&auto=format&fit=crop&q=60',
      isPrivate: false,
    },
    {
      id: 'g2',
      name: 'Cox\'s Bazar Support Network',
      category: 'Relief & Support',
      description: 'Coordinating local mutual-aid efforts, food distribution updates, and medical camp resources.',
      membersCount: 3840,
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=200&auto=format&fit=crop&q=60',
      isPrivate: false,
    },
    {
      id: 'g3',
      name: 'Traditional Rohingya Poetry',
      category: 'Art & Literature',
      description: 'Sharing classic Rohingya folklore, oral history, stories, and poetic prose.',
      membersCount: 890,
      image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=200&auto=format&fit=crop&q=60',
      isPrivate: false,
    },
  ]);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCat, setNewGroupCat] = useState('Community');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isGroupPrivate, setIsGroupPrivate] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState<string | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]); // Track simulated invitations

  // 2. MODERATION STATE
  const [newWord, setNewWord] = useState('');
  const [autoModEnabled, setAutoModEnabled] = useState(true);
  
  const [flaggedComments, setFlaggedComments] = useState<FlaggedComment[]>([
    {
      id: 'fc1',
      author: 'Mohammad Farooq',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60',
      commentText: 'This looks like a massive spam link, do not click it!',
      flaggedWord: 'spam',
      postTitle: 'Rohingya Youth Tech Workshop Announcement',
    },
    {
      id: 'fc2',
      author: 'Anwara Begum',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=60',
      commentText: 'Report this scam post, the seller is charging double price!',
      flaggedWord: 'scam',
      postTitle: 'Used Mobile Phone Sale on Marketplace',
    }
  ]);

  // Handlers for Group Creation
  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newG: Group = {
      id: `g_new_${Date.now()}`,
      name: newGroupName.trim(),
      category: newGroupCat,
      description: newGroupDesc.trim() || 'No description provided.',
      membersCount: 1, // Creator is first member
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&auto=format&fit=crop&q=60',
      isPrivate: isGroupPrivate,
    };

    setGroups([newG, ...groups]);
    setNewGroupName('');
    setNewGroupDesc('');
    setIsGroupPrivate(false);
    setShowCreateGroup(false);
    alert(`"${newG.name}" community group has been created!`);
  };

  const handleAddBlockedWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newWord.trim().toLowerCase();
    if (!word) return;
    if (blockedWords.includes(word)) {
      alert("Word already in list!");
      return;
    }
    onAddBlockedWord(word);
    setNewWord('');
  };

  const handleRemoveBlockedWord = (word: string) => {
    onRemoveBlockedWord(word);
  };

  const handleResolveComment = (id: string, action: 'approve' | 'delete') => {
    setFlaggedComments(flaggedComments.filter(c => c.id !== id));
    alert(action === 'approve' ? 'Comment approved and restored.' : 'Comment removed from database.');
  };

  const handleSimulateInvite = (userId: string) => {
    setInvitedUsers([...invitedUsers, userId]);
  };

  const handleCopyInviteLink = (groupName: string) => {
    const fakeLink = `https://rohingyaconnect.com/join/grp_${groupName.toLowerCase().replace(/\s+/g, '_')}`;
    navigator.clipboard.writeText(fakeLink);
    alert(`Invitation link copied to clipboard: ${fakeLink}`);
  };

  const otherUsers = users.filter(u => u.id !== currentUser.id);
  const filteredUsers = otherUsers.filter(u => 
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* Sub-tab selections */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-1.5 gap-2 border">
        <button
          onClick={() => setActiveSubTab('groups')}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${activeSubTab === 'groups' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
        >
          <Users className="w-4 h-4" /> Joined Groups & Invites
        </button>
        <button
          onClick={() => setActiveSubTab('moderation')}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${activeSubTab === 'moderation' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
        >
          <ShieldCheck className="w-4 h-4" /> Comments & Moderation Assist
        </button>
      </div>

      {/* 1. GROUPS SECTION */}
      {activeSubTab === 'groups' && (
        <div className="space-y-6">
          
          {/* Header Action block */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900 rounded-3xl p-5 border border-slate-800 text-white">
            <div>
              <h2 className="text-sm font-black tracking-widest text-emerald-400 uppercase">Community Spaces</h2>
              <h3 className="text-lg font-black tracking-tight mt-0.5">Explore Joined & Nearby Groups</h3>
              <p className="text-[11px] text-slate-400 leading-snug">Connect with others in specific education, support, and literature cohorts.</p>
            </div>
            
            <button
              onClick={() => setShowCreateGroup(!showCreateGroup)}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition duration-150 cursor-pointer text-white self-start sm:self-auto"
            >
              <Plus className="w-4.5 h-4.5" /> Create New Group
            </button>
          </div>

          {/* Create Group Form Panel */}
          {showCreateGroup && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-md animate-fadeIn">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-3.5 flex items-center gap-1.5">
                <Sparkles className="text-emerald-500 w-4 h-4" /> Setup Your Community Group
              </h4>
              
              <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Group Name</label>
                    <input
                      type="text"
                      required
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g. Hanifi Script Learners"
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                    <select
                      value={newGroupCat}
                      onChange={(e) => setNewGroupCat(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                    >
                      <option>Education & Language</option>
                      <option>Relief & Support</option>
                      <option>Art & Literature</option>
                      <option>Sports & Wellness</option>
                      <option>Community Discussion</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Group Description</label>
                  <textarea
                    rows={2}
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Describe group purpose, guidelines, and meetup details..."
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Privacy Setting Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-850">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      checked={isGroupPrivate}
                      onChange={(e) => setIsGroupPrivate(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <label htmlFor="isPrivate" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                      Make this group Private
                    </label>
                  </div>
                  <span className="text-[9px] text-slate-400 font-light">Private groups require admin approval to join.</span>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Publish Group
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Group Grid system */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groups.map((grp) => (
              <div key={grp.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-emerald-500/20 transition-all duration-300">
                <div>
                  <div className="h-28 w-full bg-slate-100 dark:bg-slate-950 relative">
                    <img src={grp.image} alt={grp.name} className="w-full h-full object-cover" />
                    {grp.isPrivate && (
                      <span className="absolute top-2.5 right-2.5 bg-black/60 text-white text-[8px] tracking-wider uppercase font-extrabold px-2 py-0.5 rounded-full">Private</span>
                    )}
                  </div>
                  <div className="p-4.5">
                    <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">{grp.category}</span>
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mt-1 leading-snug">{grp.name}</h4>
                    <p className="text-[10px] text-slate-400 font-light mt-1.5 leading-relaxed">{grp.description}</p>
                  </div>
                </div>

                <div className="px-4.5 pb-4.5 pt-2 border-t border-slate-100 dark:border-slate-850/50 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">{grp.membersCount} Members</span>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCopyInviteLink(grp.name)}
                      className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-500 transition cursor-pointer"
                      title="Copy Share Link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowInviteModal(grp.id)}
                      className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> <span className="text-[10px]">Invite</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* INVITATION USER SELECTOR MODAL (Simulated) */}
          {showInviteModal && (
            <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-fadeIn select-none">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-400">Invite Friends & Neighbors</h3>
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">Invite to Group</h4>
                  </div>
                  <button 
                    onClick={() => {
                      setShowInviteModal(null);
                      setSearchQuery('');
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    &times;
                  </button>
                </div>

                {/* Search field */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search people to invite..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs rounded-xl outline-none"
                  />
                </div>

                {/* User invite list */}
                <div className="space-y-3 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850/50 scrollbar-thin">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6">No users found.</p>
                  ) : (
                    filteredUsers.map((user) => {
                      const isAlreadyInvited = invitedUsers.includes(user.id);
                      return (
                        <div key={user.id} className="flex justify-between items-center gap-3 pt-3 first:pt-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={user.avatar} alt={user.fullName} className="w-8 h-8 rounded-full object-cover border" referrerPolicy="no-referrer" />
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">{user.fullName}</h5>
                              <span className="text-[9px] text-slate-400 truncate block">@{user.username}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleSimulateInvite(user.id)}
                            disabled={isAlreadyInvited}
                            className={`text-[9px] font-extrabold px-3 py-1.5 rounded-lg border transition ${isAlreadyInvited ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-transparent font-bold flex items-center gap-1' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 cursor-pointer'}`}
                          >
                            {isAlreadyInvited ? (
                              <>
                                <CheckCircle className="w-3 h-3" /> Invited
                              </>
                            ) : (
                              'Invite'
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-850 flex justify-end">
                  <button
                    onClick={() => {
                      setShowInviteModal(null);
                      setSearchQuery('');
                    }}
                    className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Close & Send Invites
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. MODERATION SECTION */}
      {activeSubTab === 'moderation' && (
        <div className="space-y-6">
          
          {/* Moderation Assistant Header info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Moderation Assist Center
                </h3>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">Automatic Content Filtering</h4>
                <p className="text-[11px] text-slate-400 font-light leading-snug">Protect your posts from automated bots, hate speech, or vulgar keywords.</p>
              </div>

              {/* Toggle switch */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] font-bold uppercase text-slate-400">Auto Filter System</span>
                <button
                  onClick={() => setAutoModEnabled(!autoModEnabled)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ${autoModEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${autoModEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Flagged words management panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Box: Word filters */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <h4 className="text-xs font-black uppercase text-slate-850 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="text-amber-500 w-4.5 h-4.5" /> Blocked Keyword Vault
              </h4>
              
              <form onSubmit={handleAddBlockedWord} className="flex gap-2 mb-4">
                <input
                  type="text"
                  required
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="e.g. offensive_word"
                  className="flex-grow bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 outline-none"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 rounded-xl cursor-pointer"
                >
                  Block
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                {blockedWords.map((word) => (
                  <span 
                    key={word} 
                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-850 border dark:border-slate-800 text-slate-650 dark:text-slate-300 px-2.5 py-1 rounded-lg"
                  >
                    <span>{word}</span>
                    <button 
                      onClick={() => handleRemoveBlockedWord(word)}
                      className="text-slate-400 hover:text-rose-500 font-extrabold text-xs ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Right Box: Flagged Queue */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <h4 className="text-xs font-black uppercase text-slate-850 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <MessageSquare className="text-emerald-500 w-4.5 h-4.5" /> Pending Flagged Comments ({flaggedComments.length})
              </h4>

              <div className="space-y-3 max-h-56 overflow-y-auto scrollbar-thin">
                {flaggedComments.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 animate-bounce" />
                    <p className="text-xs text-slate-400 font-bold">Inbox is pristine! No flagged comments found.</p>
                  </div>
                ) : (
                  flaggedComments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <img src={comment.avatar} alt={comment.author} className="w-6.5 h-6.5 rounded-full object-cover" />
                        <div>
                          <h5 className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{comment.author}</h5>
                          <p className="text-[8px] text-slate-400">Post: "{comment.postTitle.substring(0, 32)}..."</p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border text-[10px] text-slate-600 dark:text-slate-300 leading-normal relative">
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-bold rounded-md">
                          Key: {comment.flaggedWord}
                        </span>
                        "{comment.commentText}"
                      </div>

                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleResolveComment(comment.id, 'approve')}
                          className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold rounded-lg hover:bg-emerald-500 hover:text-white transition cursor-pointer"
                        >
                          Approve Comment
                        </button>
                        <button
                          onClick={() => handleResolveComment(comment.id, 'delete')}
                          className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[9px] font-extrabold rounded-lg hover:bg-rose-500 hover:text-white transition cursor-pointer"
                        >
                          Block Comment
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
