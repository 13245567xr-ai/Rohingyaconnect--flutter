import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Users, 
  UserPlus, 
  Check, 
  X, 
  UserCheck
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { usePostCreationStore, TaggedUser } from './CreatePostScreen';

interface TagCollaborateScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: any;
  };
  currentUser?: any;
  users?: any[];
  onClose?: () => void;
}

export default function TagCollaborateScreen({ navigation, route, currentUser, users: propUsers, onClose }: TagCollaborateScreenProps) {
  const [postState, setPostState] = usePostCreationStore();
  const [activeTab, setActiveTab] = useState<'tag' | 'collaborate'>('tag');
  const [searchQuery, setSearchQuery] = useState('');
  const [userList, setUserList] = useState<TaggedUser[]>([]);
  const [selectedList, setSelectedList] = useState<TaggedUser[]>(postState.taggedUsers || []);
  const [loading, setLoading] = useState(false);

  const handleReturnToCreatePost = () => {
    setPostState({ taggedUsers: selectedList });
    navigation.navigate('CreatePostScreen', {
      music: postState.music || route?.params?.currentMusic,
      tagged: selectedList || route?.params?.currentTagged,
      location: postState.location || route?.params?.currentLocation
    });
  };

  // Fetch users from Firebase or use prop/mock users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        if (propUsers && propUsers.length > 0) {
          setUserList(propUsers.map(u => ({
            id: u.id,
            name: u.fullName || u.name || 'User',
            username: u.username || 'user',
            avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          })));
        } else {
          const snap = await getDocs(collection(db, 'rc_users'));
          if (!snap.empty) {
            const items: TaggedUser[] = [];
            snap.forEach(doc => {
              const d = doc.data();
              if (doc.id !== currentUser?.id) {
                items.push({
                  id: doc.id,
                  name: d.fullName || d.name || 'User',
                  username: d.username || 'user',
                  avatar: d.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                });
              }
            });
            setUserList(items);
          } else {
            setUserList([]);
          }
        }
      } catch (err) {
        console.warn("User fetch error, using fallback:", err);
        setUserList([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [propUsers, currentUser?.id]);

  const handleToggleUser = (user: TaggedUser) => {
    const isCollab = activeTab === 'collaborate';
    const exists = selectedList.some(s => s.id === user.id);

    if (exists) {
      setSelectedList(prev => prev.filter(s => s.id !== user.id));
    } else {
      setSelectedList(prev => [...prev, { ...user, isCollaborator: isCollab }]);
    }
  };

  // Done button: save selected users
  const handleDone = () => {
    handleReturnToCreatePost();
  };

  const displayedUsers = userList.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleReturnToCreatePost()}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Tag & Collaborate</h1>
        </div>
        <button
          onClick={handleDone}
          className="px-5 py-2 rounded-lg bg-[#1877F2] text-white font-bold text-sm hover:bg-blue-600 transition shadow-sm"
        >
          Done
        </button>
      </div>

      {/* 2 Tabs: [Tag people] [Invite collaborator] */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4">
        <div className="max-w-2xl mx-auto flex gap-6">
          <button
            onClick={() => setActiveTab('tag')}
            className={`py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'tag' ? 'border-[#1877F2] text-[#1877F2]' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <Users className="w-4 h-4" />
            <span>Tag people</span>
          </button>
          <button
            onClick={() => setActiveTab('collaborate')}
            className={`py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'collaborate' ? 'border-[#1877F2] text-[#1877F2]' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite collaborator</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'tag' ? "Who are you with?" : "Search followers to invite as collaborator..."}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-10 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1877F2] transition placeholder-slate-400 font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Selected badges row */}
      {selectedList.length > 0 && (
        <div className="px-4 py-2.5 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40">
          <div className="max-w-2xl mx-auto flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[11px] font-extrabold uppercase text-blue-600 dark:text-blue-400 shrink-0 mr-1">Selected ({selectedList.length}):</span>
            {selectedList.map((user) => (
              <div 
                key={user.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-2xs shrink-0"
              >
                <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full object-cover" />
                <span>{user.name} {user.isCollaborator ? '(Collab)' : ''}</span>
                <button onClick={() => handleToggleUser(user)} className="hover:opacity-75 p-0.5 ml-0.5"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follower suggestions list */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
          {activeTab === 'tag' ? 'Follower suggestions' : 'Collaborator suggestions'}
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 animate-pulse">Loading followers...</div>
        ) : displayedUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-medium">No users found matching your search.</div>
        ) : (
          <div className="space-y-1.5">
            {displayedUsers.map((user) => {
              const isSelected = selectedList.some(s => s.id === user.id);
              const selectedItem = selectedList.find(s => s.id === user.id);

              return (
                <div
                  key={user.id}
                  onClick={() => handleToggleUser(user)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs" 
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{user.name}</span>
                        {selectedItem?.isCollaborator && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase rounded">
                            Collab
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">@{user.username}</span>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${isSelected ? 'bg-[#1877F2] text-white' : 'border-2 border-slate-300 dark:border-slate-700 text-transparent'}`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
