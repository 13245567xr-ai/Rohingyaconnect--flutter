import React, { useState } from 'react';
import { Grid, Folder, Plus, Users, Play, ListVideo, Trash2, CheckCircle2, XCircle, ChevronRight, Video, FileAudio, FileImage, Sparkles, FolderOpen, Headphones } from 'lucide-react';
import { User, Post } from '../types';

interface ContentManagementProps {
  currentUser: User;
  posts: Post[];
}

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  size: string;
  uploadedAt: string;
}

interface CollabInvitation {
  id: string;
  senderName: string;
  senderAvatar: string;
  postProposal: string;
  mediaType: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface Playlist {
  id: string;
  name: string;
  mediaType: 'video' | 'audio';
  items: Array<{ title: string; duration: string; url: string }>;
}

export default function ContentManagement({ currentUser, posts }: ContentManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'library' | 'collabs' | 'playlists'>('library');

  // 1. CONTENT LIBRARY STATE
  const [libraryFiles, setLibraryFiles] = useState<MediaFile[]>([
    {
      id: 'lf1',
      name: 'traditional_music_snippet.mp3',
      type: 'audio',
      url: '',
      size: '4.2 MB',
      uploadedAt: '2026-06-25T14:20:00Z',
    },
    {
      id: 'lf2',
      name: 'community_bazaar_overview.mp4',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      size: '18.4 MB',
      uploadedAt: '2026-06-24T10:15:00Z',
    },
    {
      id: 'lf3',
      name: 'family_gathering_illustration.jpg',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=60',
      size: '1.8 MB',
      uploadedAt: '2026-06-26T08:30:00Z',
    }
  ]);

  const [activeLibFilter, setActiveLibFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'image' | 'video' | 'audio'>('image');
  const [newFileUrl, setNewFileUrl] = useState('');

  // 2. COLLABORATIONS STATE
  const [collabInvites, setCollabInvites] = useState<CollabInvitation[]>([
    {
      id: 'ci1',
      senderName: 'Sufia Khatun',
      senderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=60',
      postProposal: 'Co-author an educational article highlighting calligraphy lessons for kids.',
      mediaType: 'Article & PDF',
      status: 'pending',
    },
    {
      id: 'ci2',
      senderName: 'Jafar Alam',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60',
      postProposal: 'Joint photo journal of traditional embroidery art patterns used in Rohingya garments.',
      mediaType: 'Photo Journal',
      status: 'pending',
    }
  ]);

  const [pastCollabs, setPastCollabs] = useState([
    {
      id: 'pc1',
      partner: 'Mohammad Farooq',
      postTitle: 'Rohingya Folk Poetry Anthology Vol 1',
      date: 'June 18, 2026',
      readsCount: 1240,
    }
  ]);

  // 3. PLAYLISTS STATE
  const [playlists, setPlaylists] = useState<Playlist[]>([
    {
      id: 'pl1',
      name: 'Hanifi Writing Video Guides',
      mediaType: 'video',
      items: [
        { title: 'Lesson 1: Intro to Alphabet Letters', duration: '5:20', url: '#' },
        { title: 'Lesson 2: Vowels and Diacritics', duration: '8:45', url: '#' },
        { title: 'Lesson 3: Advanced Word Forms', duration: '12:10', url: '#' }
      ]
    },
    {
      id: 'pl2',
      name: 'Poetic Chants & Songs',
      mediaType: 'audio',
      items: [
        { title: 'Oral Ballad of Arakan', duration: '3:50', url: '#' },
        { title: 'Children Wedding Rhymes', duration: '2:15', url: '#' }
      ]
    }
  ]);

  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistType, setNewPlaylistType] = useState<'video' | 'audio'>('video');

  // HANDLERS
  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !newFileUrl.trim()) return;

    const newMedia: MediaFile = {
      id: `lf_${Date.now()}`,
      name: newFileName.trim(),
      type: newFileType,
      url: newFileUrl.trim(),
      size: `${(Math.random() * 8 + 1).toFixed(1)} MB`,
      uploadedAt: new Date().toISOString()
    };

    setLibraryFiles([newMedia, ...libraryFiles]);
    setNewFileName('');
    setNewFileUrl('');
    alert(`"${newMedia.name}" successfully added to your secure content library!`);
  };

  const handleDeleteFile = (id: string) => {
    setLibraryFiles(libraryFiles.filter(f => f.id !== id));
  };

  const handleCollabAction = (id: string, status: 'accepted' | 'declined') => {
    setCollabInvites(collabInvites.map(inv => inv.id === id ? { ...inv, status } : inv));
    alert(status === 'accepted' ? 'Collaboration request accepted! Co-author space ready.' : 'Collaboration request declined.');
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const newPl: Playlist = {
      id: `pl_${Date.now()}`,
      name: newPlaylistName.trim(),
      mediaType: newPlaylistType,
      items: []
    };

    setPlaylists([...playlists, newPl]);
    setNewPlaylistName('');
    setShowCreatePlaylist(false);
    alert(`Linear media playlist "${newPl.name}" created! You can now queue tracks into it.`);
  };

  const filteredLibrary = libraryFiles.filter(f => activeLibFilter === 'all' || f.type === activeLibFilter);
  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* Tab selection menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-1.5 gap-2 border">
        <button
          onClick={() => setActiveSubTab('library')}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${activeSubTab === 'library' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
        >
          <Folder className="w-4 h-4" /> Content Library
        </button>
        <button
          onClick={() => setActiveSubTab('collabs')}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${activeSubTab === 'collabs' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
        >
          <Users className="w-4 h-4" /> Co-Authors & Collabs
        </button>
        <button
          onClick={() => setActiveSubTab('playlists')}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${activeSubTab === 'playlists' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
        >
          <ListVideo className="w-4 h-4" /> Playlists (Video/Audio)
        </button>
      </div>

      {/* 1. CONTENT LIBRARY DISPLAY */}
      {activeSubTab === 'library' && (
        <div className="space-y-6">
          
          {/* Header & Add Asset Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Add Assets to Content Vault</h3>
            
            <form onSubmit={handleUploadFile} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Asset title or file name..."
                className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3.5 py-2 text-slate-800 dark:text-slate-100 outline-none"
              />
              <input
                type="url"
                required
                value={newFileUrl}
                onChange={(e) => setNewFileUrl(e.target.value)}
                placeholder="Media source link/URL..."
                className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3.5 py-2 text-slate-800 dark:text-slate-100 outline-none"
              />
              <select
                value={newFileType}
                onChange={(e) => setNewFileType(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3.5 py-2 text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="image">Image Attachment</option>
                <option value="video">Video Stream</option>
                <option value="audio">Audio Voice Note</option>
              </select>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl transition cursor-pointer"
              >
                Upload Asset
              </button>
            </form>
          </div>

          {/* Library Sorting Toggles */}
          <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl max-w-sm">
            {(['all', 'image', 'video', 'audio'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveLibFilter(f)}
                className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-xl capitalize transition cursor-pointer ${activeLibFilter === f ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-650'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Grid Layout separating files */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {filteredLibrary.map((file) => (
              <div key={file.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                
                {/* Media Preview Box */}
                <div className="h-32 bg-slate-50 dark:bg-slate-950 flex items-center justify-center relative overflow-hidden group">
                  {file.type === 'image' && (
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                  )}
                  {file.type === 'video' && (
                    <div className="flex flex-col items-center">
                      <Video className="w-8 h-8 text-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-mono mt-1 text-slate-400">Stream Source</span>
                    </div>
                  )}
                  {file.type === 'audio' && (
                    <div className="flex flex-col items-center">
                      <Headphones className="w-8 h-8 text-sky-500 animate-pulse" />
                      <span className="text-[9px] font-mono mt-1 text-slate-400">Audio Voice Clip</span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col justify-between flex-grow">
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">{file.name}</h5>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-1 font-semibold uppercase">
                      {file.type === 'image' && <FileImage className="w-3 h-3 text-emerald-500" />}
                      {file.type === 'video' && <Video className="w-3 h-3 text-teal-500" />}
                      {file.type === 'audio' && <FileAudio className="w-3 h-3 text-sky-500" />}
                      <span>{file.type} • {file.size}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-850 mt-3 flex justify-between items-center">
                    <span className="text-[9px] text-slate-400 font-light">Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      title="Remove asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* 2. COLLABORATIONS SECTION */}
      {activeSubTab === 'collabs' && (
        <div className="space-y-6">
          
          {/* Active Collaborations Invitations */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Users className="w-4.5 h-4.5 text-emerald-500" /> Co-Authoring Received Invitations ({collabInvites.filter(c => c.status === 'pending').length})
            </h3>

            <div className="space-y-3.5">
              {collabInvites.filter(c => c.status === 'pending').length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">No pending invitations.</p>
              ) : (
                collabInvites.filter(c => c.status === 'pending').map((inv) => (
                  <div key={inv.id} className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-3 items-start">
                      <img src={inv.senderAvatar} alt={inv.senderName} className="w-8 h-8 rounded-full object-cover border" />
                      <div>
                        <h5 className="text-xs font-bold text-slate-850 dark:text-slate-200">{inv.senderName} <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded ml-1 uppercase">{inv.mediaType}</span></h5>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">"{inv.postProposal}"</p>
                      </div>
                    </div>

                    <div className="flex gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleCollabAction(inv.id, 'declined')}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" /> Decline
                      </button>
                      <button
                        onClick={() => handleCollabAction(inv.id, 'accepted')}
                        className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm px-3.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Accept Invite
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Past collaborations archive */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-4">Past Co-Authored Publications</h4>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-850">
              {pastCollabs.map((collab) => (
                <div key={collab.id} className="py-3 flex justify-between items-center gap-3 first:pt-0">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{collab.postTitle}</h5>
                    <span className="text-[9px] text-slate-400">Co-Author: {collab.partner} • Published {collab.date}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">{collab.readsCount} views</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 3. PLAYLISTS SECTION */}
      {activeSubTab === 'playlists' && (
        <div className="space-y-6">
          
          {/* Header actions */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900 rounded-3xl p-5 border border-slate-800 text-white">
            <div>
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-4.5 h-4.5" /> Sequential Media Playlists
              </h3>
              <h4 className="text-lg font-black tracking-tight mt-0.5">Group Video & Audio Items</h4>
              <p className="text-[11px] text-slate-400 leading-snug">Create linear queue playlists to group language modules or cultural folk ballads.</p>
            </div>

            <button
              onClick={() => setShowCreatePlaylist(!showCreatePlaylist)}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer text-white self-start sm:self-auto"
            >
              <Plus className="w-4.5 h-4.5" /> New Playlist
            </button>
          </div>

          {/* Setup Playlist Form */}
          {showCreatePlaylist && (
            <form onSubmit={handleCreatePlaylist} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-md space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Playlist Name</label>
                  <input
                    type="text"
                    required
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="e.g. Traditional Folk Songs Vol 1"
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3.5 py-2 text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Media Type</label>
                  <select
                    value={newPlaylistType}
                    onChange={(e) => setNewPlaylistType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3.5 py-2 text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="video">Video Playlist</option>
                    <option value="audio">Audio/Voice Notes Playlist</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePlaylist(false)}
                  className="text-xs text-slate-450 hover:text-slate-600 px-3 py-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Create Playlist
                </button>
              </div>
            </form>
          )}

          {/* Active play queue display */}
          {activePlaylist && (
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl animate-fadeIn">
              <div className="flex justify-between items-start mb-4 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">{activePlaylist.mediaType} Playlist</span>
                  <h4 className="text-sm font-black text-white mt-0.5">{activePlaylist.name}</h4>
                </div>
                <button 
                  onClick={() => setActivePlaylistId(null)}
                  className="text-slate-400 hover:text-white text-xs font-extrabold"
                >
                  &times; Hide Queue
                </button>
              </div>

              <div className="space-y-2">
                {activePlaylist.items.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-4 font-light">Playlist queue is empty. Add audio notes or videos to begin.</p>
                ) : (
                  activePlaylist.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-slate-850/60 rounded-xl hover:bg-emerald-600/10 hover:border-emerald-500/20 border border-slate-800 flex justify-between items-center gap-3 cursor-pointer group transition duration-150"
                      onClick={() => alert(`Simulating playback for: "${item.title}"`)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 text-[10px] font-black flex items-center justify-center text-slate-400">
                          {idx + 1}
                        </span>
                        <h5 className="text-xs font-bold truncate text-slate-250 group-hover:text-emerald-400">{item.title}</h5>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">{item.duration}</span>
                        <span className="p-1 rounded-md bg-slate-800 group-hover:bg-emerald-600 group-hover:text-white transition text-slate-400"><Play className="w-3 h-3" /></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Playlist collection grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playlists.map((pl) => (
              <div 
                key={pl.id} 
                onClick={() => setActivePlaylistId(pl.id)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex justify-between items-center cursor-pointer hover:border-emerald-500/20 hover:bg-slate-50/20 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${pl.mediaType === 'video' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
                    {pl.mediaType === 'video' ? <Video className="w-6 h-6" /> : <Headphones className="w-6 h-6" />}
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-100 leading-snug">{pl.name}</h4>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider mt-1 block font-bold">{pl.items.length} sequential tracks • {pl.mediaType}</span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
