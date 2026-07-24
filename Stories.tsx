import React, { useState, useEffect } from 'react';
import * as ImagePicker from '../utils/expo-image-picker-web';
import { Plus, X, ChevronLeft, ChevronRight, Clock, Share2 } from 'lucide-react';
import { Story, User } from '../types';
import { BlueVerifiedTick } from './BlueVerifiedTick';

const TouchableOpacity = ({ onPress, onClick, children, className, ...props }: any) => (
  <div onClick={onPress || onClick} className={className} {...props}>
    {children}
  </div>
);

interface StoriesProps {
  stories: Story[];
  currentUser: User;
  onAddStory: (image: string) => void;
  onShareStory?: (story: Story) => void;
  navigation?: any;
}

export default function Stories({ stories, currentUser, onAddStory, onShareStory, navigation = { navigate: (screen: string, params?: any) => (window as any)._navigate?.(screen, params) } }: StoriesProps) {
  const handleCreateStory = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return alert('Permission needed')

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // For multiple photos
      quality: 1,
    })

    if (!result.canceled) {
      navigation.navigate('StoryEditScreen', { images: result.assets })
    }
  }

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [previewStoryUrl, setPreviewStoryUrl] = useState<string | null>(null);
  const [previewVideoError, setPreviewVideoError] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewVideoError(false);
  }, [previewStoryUrl]);

  // Group stories by user to avoid repetitive circles
  const sortedStories = [...stories].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Simulate story auto-play
  useEffect(() => {
    let interval: any;
    if (activeStoryIndex !== null) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            // Next story
            if (activeStoryIndex < sortedStories.length - 1) {
              setActiveStoryIndex(activeStoryIndex + 1);
              return 0;
            } else {
              // Close viewer
              setActiveStoryIndex(null);
              return 0;
            }
          }
          return prev + 2; // Increments to reach 100 in 5 seconds (50 * 100ms = 5000ms)
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [activeStoryIndex, sortedStories.length]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviewStoryUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublishStory = () => {
    if (previewStoryUrl) {
      onAddStory(previewStoryUrl);
      setPreviewStoryUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentActiveStory = activeStoryIndex !== null ? sortedStories[activeStoryIndex] : null;

  return (
    <div className="w-full select-none mb-6">
      
      {/* Hidden native input for Story */}
      <input 
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Scrollable Circle List */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        
        {/* ADD STORY BUTTON FOR CURRENT USER */}
        <TouchableOpacity 
          onPress={handleCreateStory}
          className="flex-shrink-0 w-28 h-40 bg-slate-100 rounded-2xl relative overflow-hidden border border-slate-200 cursor-pointer hover:shadow-md transition duration-250 flex flex-col justify-between"
        >
          <img 
            src={currentUser.avatar} 
            alt="My Profile" 
            className="w-full h-2/3 object-cover brightness-95"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
          <div className="absolute top-[60%] left-1/2 -translate-x-1/2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white p-2 rounded-full border-4 border-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition">
            <Plus className="w-4 h-4" />
          </div>
          <div className="pb-2 text-center">
            <span className="text-[10px] font-bold text-slate-800">Create Story</span>
          </div>
        </TouchableOpacity>

        {/* FEED STORIES LIST */}
        {sortedStories.map((story, idx) => (
          <div 
            key={story.id}
            onClick={() => setActiveStoryIndex(idx)}
            className="flex-shrink-0 w-28 h-40 rounded-2xl relative overflow-hidden cursor-pointer hover:scale-102 hover:shadow-md transition-all border-2 border-[#1877F2] bg-slate-900"
          >
            <img 
              src={(typeof (story.mediaUrl || story.media || story.image || story.imageUrl || story.videoUrl || story.url) === 'string' && !(story.mediaUrl || story.media || story.image || story.imageUrl || story.videoUrl || story.url).startsWith('blob:') && !(story.mediaUrl || story.media || story.image || story.imageUrl || story.videoUrl || story.url).startsWith('file:')) ? (story.mediaUrl || story.media || story.image || story.imageUrl || story.videoUrl || story.url) : 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&h=1000&q=80'} 
              alt={story.userFullName || 'User Story'} 
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&h=1000&q=80'; }}
              className="w-full h-full object-cover brightness-85"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
            
            {/* User Profile Ring */}
            <div className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full border-2 border-[#1877F2] overflow-hidden shadow-lg">
              <img 
                src={story.userAvatar} 
                alt={story.userFullName} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* User Name Tag */}
            <div className="absolute bottom-2 left-2 right-2">
              <span className="text-[10px] font-bold text-white truncate leading-tight drop-shadow-md flex items-center gap-1">
                <span className="truncate">{story.userFullName.split(' ')[0]}</span>
                {(story.isVerified || story.user?.isVerified || (story.user?.invitesCount || 0) >= 5) && <BlueVerifiedTick className="w-2.5 h-2.5 shrink-0" />}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* FULL-SCREEN STORY VIEWER MODAL */}
      {currentActiveStory && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col justify-center items-center">
          
          <div className="w-full max-w-md h-full sm:h-[85vh] relative bg-black rounded-none sm:rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl">
            
            {/* Countdown Progress Bars */}
            <div className="absolute top-4 left-4 right-4 z-50 flex gap-1">
              {sortedStories.map((s, idx) => (
                <div key={s.id} className="h-1 flex-grow bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#1877F2] transition-all duration-100 ease-linear"
                    style={{ 
                      width: activeStoryIndex === idx 
                        ? `${progress}%` 
                        : (activeStoryIndex !== null && idx < activeStoryIndex) ? '100%' : '0%' 
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Top Info Bar */}
            <div className="absolute top-8 left-4 right-4 z-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img 
                  src={currentActiveStory.userAvatar} 
                  alt={currentActiveStory.userFullName} 
                  className="w-9 h-9 rounded-full object-cover border border-white/50"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-xs font-bold text-white drop-shadow-md flex items-center gap-1">
                    {currentActiveStory.userFullName}
                    {(currentActiveStory.isVerified || currentActiveStory.user?.isVerified || (currentActiveStory.user?.invitesCount || 0) >= 5) && <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />}
                  </h4>
                  <span className="text-[9px] text-white/70 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(currentActiveStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Actions Button Bar */}
              <div className="flex items-center gap-1.5 z-50">
                {onShareStory && currentActiveStory && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareStory(currentActiveStory);
                    }}
                    className="p-1.5 bg-black/40 hover:bg-black/60 text-[#1877F2] rounded-full transition cursor-pointer"
                    title="Share Story"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={() => setActiveStoryIndex(null)}
                  className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Left & Right Tap Overlays for Navigation */}
            <div className="absolute inset-0 z-30 flex">
              <div 
                onClick={() => {
                  if (activeStoryIndex !== null && activeStoryIndex > 0) {
                    setActiveStoryIndex(activeStoryIndex - 1);
                  }
                }}
                className="w-1/3 h-full cursor-west-resize"
              ></div>
              <div 
                onClick={() => {
                  if (activeStoryIndex !== null && activeStoryIndex < sortedStories.length - 1) {
                    setActiveStoryIndex(activeStoryIndex + 1);
                  } else {
                    setActiveStoryIndex(null);
                  }
                }}
                className="w-2/3 h-full cursor-east-resize"
              ></div>
            </div>

            {/* Main Story Image */}
            <img 
              src={(typeof (currentActiveStory.mediaUrl || currentActiveStory.media || currentActiveStory.image || currentActiveStory.imageUrl || currentActiveStory.videoUrl || currentActiveStory.url) === 'string' && !(currentActiveStory.mediaUrl || currentActiveStory.media || currentActiveStory.image || currentActiveStory.imageUrl || currentActiveStory.videoUrl || currentActiveStory.url).startsWith('blob:') && !(currentActiveStory.mediaUrl || currentActiveStory.media || currentActiveStory.image || currentActiveStory.imageUrl || currentActiveStory.videoUrl || currentActiveStory.url).startsWith('file:')) ? (currentActiveStory.mediaUrl || currentActiveStory.media || currentActiveStory.image || currentActiveStory.imageUrl || currentActiveStory.videoUrl || currentActiveStory.url) : 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&h=1000&q=80'} 
              alt={`Story by ${currentActiveStory.userFullName || 'User'}`} 
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&h=1000&q=80'; }}
              style={{
                transform: `translate(${currentActiveStory.cropOffsetX || 0}px, ${currentActiveStory.cropOffsetY || 0}px) rotate(${currentActiveStory.cropRotation || 0}deg) scale(${currentActiveStory.cropZoom || 1})`,
                transition: 'transform 0.2s ease'
              }}
              className="w-full h-full object-contain bg-slate-950"
              referrerPolicy="no-referrer"
            />

            {/* Navigation Arrows for desktop */}
            <div className="hidden md:block">
              {activeStoryIndex !== null && activeStoryIndex > 0 && (
                <button 
                  onClick={() => setActiveStoryIndex(activeStoryIndex - 1)}
                  className="absolute -left-16 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition z-50"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {activeStoryIndex !== null && activeStoryIndex < sortedStories.length - 1 && (
                <button 
                  onClick={() => setActiveStoryIndex(activeStoryIndex + 1)}
                  className="absolute -right-16 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition z-50"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* FULL-SCREEN STORY PORTRAIT VIEW PREVIEW */}
      {previewStoryUrl && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-55 flex flex-col justify-center items-center select-none">
          <div className="w-full max-w-md h-full sm:h-[85vh] relative bg-black rounded-none sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-white/10">
            
            {/* Top Preview Title */}
            <div className="absolute top-6 left-4 right-4 z-50 flex justify-between items-center bg-black/50 p-3 rounded-2xl backdrop-blur-md border border-white/10">
              <span className="text-xs font-black text-white uppercase tracking-wider">Preview Your Story</span>
              <button 
                onClick={() => setPreviewStoryUrl(null)}
                className="text-white hover:text-slate-300 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Portrait Preview Content */}
            <div className="w-full h-full flex items-center justify-center bg-slate-900">
              {previewStoryUrl.startsWith('data:video') ? (
                previewVideoError ? (
                  <div className="text-center p-4 text-white text-xs">
                    <p className="font-semibold">Video preview failed to load</p>
                  </div>
                ) : (
                  <video 
                    key={previewStoryUrl}
                    src={previewStoryUrl} 
                    controls 
                    autoPlay 
                    loop 
                    onError={() => setPreviewVideoError(true)}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <img 
                  src={previewStoryUrl} 
                  alt="Story Preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            {/* Bottom Publishing Actions Overlay */}
            <div className="absolute bottom-6 left-4 right-4 z-50 flex gap-3">
              <button
                onClick={() => setPreviewStoryUrl(null)}
                className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishStory}
                className="flex-1 py-3.5 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold text-xs rounded-xl transition shadow-lg cursor-pointer"
              >
                Publish Story
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
