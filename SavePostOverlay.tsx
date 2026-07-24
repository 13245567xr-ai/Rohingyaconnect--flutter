import React, { useState } from 'react';
import { X, Bookmark, Plus, Lock, FolderPlus, Check, Sparkles } from 'lucide-react';

interface SavePostOverlayProps {
  isOpen: boolean;
  postId: string | null;
  onClose: () => void;
  onSave: (postId: string, collectionName?: string) => void;
  currentUser: { id: string; savedPosts?: string[] };
}

interface CollectionItem {
  name: string;
  count: number;
  privacy: string;
}

export default function SavePostOverlay({
  isOpen,
  postId,
  onClose,
  onSave,
  currentUser
}: SavePostOverlayProps) {
  const [collections, setCollections] = useState<CollectionItem[]>([
    { name: 'Heritage & History', count: 12, privacy: 'Only me' },
    { name: 'Community Announcements', count: 4, privacy: 'Only me' },
    { name: 'Preservation Art', count: 9, privacy: 'Only me' },
    { name: 'Personal Reference', count: 2, privacy: 'Only me' }
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [selectedCol, setSelectedCol] = useState<string>('Personal Reference');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !postId) return null;

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const nextCols = [
      ...collections,
      { name: newColName.trim(), count: 0, privacy: 'Only me' }
    ];
    setCollections(nextCols);
    setSelectedCol(newColName.trim());
    setNewColName('');
    setShowCreate(false);
  };

  const handleSaveConfirm = () => {
    onSave(postId, selectedCol);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
      {/* Click outside to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-300 z-10 flex flex-col p-5 space-y-4 text-slate-100"
        id="save-post-overlay-container"
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500" />

        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
              <Bookmark className="w-3 h-3 fill-amber-500" /> Archiving Engine
            </span>
            <h4 className="text-xs font-black uppercase text-slate-100 mt-0.5">Save to Collection</h4>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-amber-500/10 text-amber-400 flex items-center justify-center rounded-full border border-amber-500/30 animate-bounce">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h5 className="text-sm font-black text-slate-100">Saved Successfully!</h5>
              <p className="text-[10px] text-slate-400 mt-0.5">Post successfully added to collection <span className="font-bold text-amber-400">"{selectedCol}"</span></p>
            </div>
          </div>
        ) : (
          <>
            {/* Create Collection workflow */}
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-850">
              <span className="text-[10px] font-bold text-slate-400">Add to Collection</span>
              <button 
                onClick={() => setShowCreate(!showCreate)} 
                className="text-[10px] font-black text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Create New
              </button>
            </div>

            {showCreate && (
              <form onSubmit={handleCreateCollection} className="space-y-2 p-2.5 bg-slate-950 rounded-xl border border-slate-850 animate-slideDown">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="Collection name (e.g. My Favorites)"
                    className="flex-grow bg-slate-900 border border-slate-800 text-[10px] text-slate-100 rounded-lg px-2.5 py-2 outline-none placeholder-slate-600 focus:border-amber-500"
                  />
                  <button 
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] px-3 rounded-lg transition"
                  >
                    Add
                  </button>
                </div>
                <div className="flex items-center gap-1 text-[8px] text-slate-500 pl-0.5">
                  <Lock className="w-2.5 h-2.5 text-slate-500" />
                  <span>Privacy default: Only me</span>
                </div>
              </form>
            )}

            {/* List of Collections */}
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1" id="save-collections-list">
              {collections.map((col) => {
                const isSelected = selectedCol === col.name;
                return (
                  <button
                    key={col.name}
                    onClick={() => setSelectedCol(col.name)}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between border transition duration-150 ${isSelected ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-950/30 hover:bg-slate-850 border-slate-850/80'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Bookmark className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <div>
                        <span className={`text-[11px] font-extrabold block ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                          {col.name}
                        </span>
                        <span className="text-[9px] text-slate-500 block mt-0.5">
                          {col.count} saved items
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Contextual metadata displaying status Only me styled elegantly */}
                      <span className="inline-flex items-center gap-0.5 text-[8px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-750 font-medium">
                        <Lock className="w-2 h-2 text-slate-400" /> {col.privacy}
                      </span>
                      {isSelected && (
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-850">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold py-3 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfirm}
                className="w-2/3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/15 transition active:scale-95"
              >
                <Bookmark className="w-4 h-4 fill-white" /> Save to "{selectedCol}"
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
