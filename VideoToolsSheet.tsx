import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  Plus, 
  HardDrive, 
  Compass, 
  Heart, 
  ThumbsDown, 
  Gauge, 
  Link as LinkIcon, 
  Settings, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Check, 
  AlertTriangle,
  Mail
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface VideoToolsSheetProps {
  videoId: string;
  videoUrl: string;
  onClose: () => void;
  onHideVideo?: (videoId: string) => void;
}

export default function VideoToolsSheet({
  videoId,
  videoUrl,
  onClose,
  onHideVideo
}: VideoToolsSheetProps) {
  // Screens navigation state: 'main' | 'playlist' | 'playlist_create' | 'report_step1' | 'report_step2' | 'report_step3' | 'speed' | 'quality'
  const [currentScreen, setCurrentScreen] = useState<'main' | 'playlist' | 'report_step1' | 'report_step2' | 'report_step3' | 'speed' | 'quality'>('main');

  // Toasts / Snackbars
  const [toast, setToast] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; onUndo?: () => void } | null>(null);

  // States for Row 1: Loop Video
  const [isLooping, setIsLooping] = useState(false);

  // States for Row 2: Playlist
  const [playlists, setPlaylists] = useState<string[]>(['For later']);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // States for Row 3: Offline cache
  const [isCached, setIsCached] = useState(false);

  // States for Row 7: Playback Speed
  const [playbackSpeed, setPlaybackSpeed] = useState('1x');

  // States for Row 9: Quality
  const [videoQuality, setVideoQuality] = useState('Auto');
  const [isDataSaver, setIsDataSaver] = useState(false);

  // States for SECTION 2: 3-step report flow
  const [reportStep1Reason, setReportStep1Reason] = useState('');
  const [reportStep2SubReason, setReportStep2SubReason] = useState('');
  const [reportIssues, setReportIssues] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Load initial settings
  useEffect(() => {
    // Check if loop is enabled on the current video player
    const video = document.getElementById('videoPlayer') as HTMLVideoElement | null;
    if (video) {
      setIsLooping(video.loop);
      setPlaybackSpeed(`${video.playbackRate}x`);
    }

    // Load custom playlists from localStorage
    const savedPlaylists = localStorage.getItem('rohingya_custom_playlists');
    if (savedPlaylists) {
      try {
        const parsed = JSON.parse(savedPlaylists);
        if (Array.isArray(parsed)) {
          setPlaylists(Array.from(new Set(['For later', ...parsed])));
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Load which playlists this video is already in
    const videoPlaylists = localStorage.getItem(`rohingya_video_playlists_${videoId}`);
    if (videoPlaylists) {
      try {
        const parsed = JSON.parse(videoPlaylists);
        if (Array.isArray(parsed)) {
          setSelectedPlaylists(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Check Offline cache state
    const checkCache = async () => {
      try {
        if ('caches' in window) {
          const cache = await caches.open('rohingya-videos-v1');
          const matched = await cache.match(videoUrl);
          setIsCached(!!matched);
        }
      } catch (e) {
        console.error("Cache matching error:", e);
      }
    };
    checkCache();
  }, [videoId, videoUrl]);

  // Helper to show custom toast
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 1500);
  };

  // Helper to count words
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // Switch Toggles handlers
  const handleToggleLoop = () => {
    const video = document.getElementById('videoPlayer') as HTMLVideoElement | null;
    const newValue = !isLooping;
    setIsLooping(newValue);
    if (video) {
      video.loop = newValue;
    }
    triggerToast(newValue ? "Loop: On" : "Loop: Off");
  };

  const handleToggleCache = async () => {
    const newValue = !isCached;
    setIsCached(newValue);

    try {
      if ('caches' in window) {
        const cache = await caches.open('rohingya-videos-v1');
        if (newValue) {
          await cache.add(videoUrl);
          triggerToast("Saved for offline");
        } else {
          await cache.delete(videoUrl);
          triggerToast("Removed from offline");
        }
      } else {
        triggerToast(newValue ? "Saved for offline (Simulated)" : "Removed from offline (Simulated)");
      }
    } catch (e) {
      console.error(e);
      triggerToast(newValue ? "Saved for offline (Simulated)" : "Removed from offline (Simulated)");
    }
  };

  // Playlist handlers
  const togglePlaylistSelection = (playlist: string) => {
    let updated: string[];
    if (selectedPlaylists.includes(playlist)) {
      updated = selectedPlaylists.filter(p => p !== playlist);
      triggerToast(`Removed from ${playlist}`);
    } else {
      updated = [...selectedPlaylists, playlist];
      triggerToast(`Added to ${playlist}`);
    }
    setSelectedPlaylists(updated);
    localStorage.setItem(`rohingya_video_playlists_${videoId}`, JSON.stringify(updated));
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;

    const updatedPlaylists = Array.from(new Set([...playlists, name]));
    setPlaylists(updatedPlaylists);
    localStorage.setItem('rohingya_custom_playlists', JSON.stringify(updatedPlaylists.filter(p => p !== 'For later')));
    
    // Automatically select the new playlist for this video
    const updatedSelections = Array.from(new Set([...selectedPlaylists, name]));
    setSelectedPlaylists(updatedSelections);
    localStorage.setItem(`rohingya_video_playlists_${videoId}`, JSON.stringify(updatedSelections));

    setNewPlaylistName('');
    triggerToast(`Added to ${name}`);
  };

  // Speed selector
  const handleSelectSpeed = (speedStr: string) => {
    setPlaybackSpeed(speedStr);
    const speedVal = parseFloat(speedStr.replace('x', ''));
    const video = document.getElementById('videoPlayer') as HTMLVideoElement | null;
    if (video && !isNaN(speedVal)) {
      video.playbackRate = speedVal;
    }
    triggerToast(`Speed: ${speedStr}`);
    setCurrentScreen('main');
  };

  // Quality selector
  const handleSelectQuality = (quality: string) => {
    if (isDataSaver && quality !== 'Auto' && parseInt(quality) > 480) {
      triggerToast("Data saver is active. Force 480p max.");
      return;
    }
    setVideoQuality(quality);
    triggerToast(`Quality set to ${quality}`);
    setCurrentScreen('main');
  };

  const handleToggleDataSaver = () => {
    const newValue = !isDataSaver;
    setIsDataSaver(newValue);
    if (newValue) {
      // Force quality to max 480p or Auto
      setVideoQuality('480p');
      triggerToast("Data saver ON: forcing 480p max");
    } else {
      triggerToast("Data saver OFF");
    }
  };

  // Copy Link
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(videoUrl);
      triggerToast("Successfully copied");
    } catch (e) {
      triggerToast("Failed to copy link");
    }
  };

  // Interest tracker
  const handleMarkInterest = () => {
    try {
      const interests = JSON.parse(localStorage.getItem('rohingya_interest_videos') || '[]');
      if (!interests.includes(videoId)) {
        interests.push(videoId);
        localStorage.setItem('rohingya_interest_videos', JSON.stringify(interests));
      }
      triggerToast("You will see more like this for a while");
      setTimeout(() => onClose(), 1200);
    } catch (e) {
      console.error(e);
    }
  };

  // Not interested tracker (Hide)
  const handleMarkNotInterested = () => {
    try {
      const hidden = JSON.parse(localStorage.getItem('rohingya_hidden_videos') || '[]');
      if (!hidden.includes(videoId)) {
        hidden.push(videoId);
        localStorage.setItem('rohingya_hidden_videos', JSON.stringify(hidden));
      }
      
      // Dispatch standard custom window event to notify parent containers reactively
      window.dispatchEvent(new CustomEvent('video-hidden', { detail: { videoId } }));

      // Call callback prop if exists
      if (onHideVideo) {
        onHideVideo(videoId);
      }

      onClose();

      // Trigger snackbar or alert on the parent frame (Simulated inline via standard custom alert/toast)
      alert("Video hidden. You can undo this from your account activity settings.");
    } catch (e) {
      console.error(e);
    }
  };

  // Report Submission handler
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportIssues.trim() || !reportEmail.trim()) return;

    setIsSubmittingReport(true);
    try {
      const reportData = {
        step1_reason: reportStep1Reason,
        step2_subReason: reportStep2SubReason,
        desc_300: reportIssues.trim(),
        email: reportEmail.trim(),
        desc_3000: reportDescription.trim(),
        videoId: videoId,
        timestamp: new Date()
      };

      await addDoc(collection(db, "rc_reports"), reportData);
      
      triggerToast("Report submitted. Thank you.");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      triggerToast("Error: " + err.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Word Validation
  const reportIssuesWordCount = countWords(reportIssues);
  const reportDescriptionWordCount = countWords(reportDescription);

  const isReportValid = 
    reportStep1Reason && 
    reportStep2SubReason && 
    reportIssues.trim() && 
    reportIssuesWordCount <= 300 &&
    reportEmail.trim() && 
    reportEmail.includes('@') &&
    reportDescriptionWordCount <= 3000;

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn select-none">
      {/* Absolute Backdrop close */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Main Content Card Container */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[28px] overflow-hidden shadow-2xl z-10 border-t sm:border border-slate-200 dark:border-slate-800 animate-slideUp max-h-[92vh] flex flex-col">
        
        {/* Top visual handlebar for mobile */}
        <div className="sm:hidden flex justify-center py-3">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>

        {/* -------------------- 1. MAIN MENU SCREEN -------------------- */}
        {currentScreen === 'main' && (
          <div className="flex flex-col flex-grow overflow-y-auto">
            {/* Header */}
            <div className="px-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 pt-1 sm:pt-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-100">
                  📺 Video Tools & Settings
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Customize and optimize video streaming and safety
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Rows list */}
            <div className="p-4 space-y-1 overflow-y-auto">
              
              {/* ROW 1: TOGGLE VIDEO LOOP */}
              <div className="p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Toggle Video Loop</span>
                    <span className="text-[10px] text-slate-400">Replay video automatically</span>
                  </div>
                </div>
                {/* Switch toggle on the right */}
                <button 
                  onClick={handleToggleLoop}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    isLooping ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${
                    isLooping ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* ROW 2: ADD TO PLAYLIST */}
              <button
                onClick={() => setCurrentScreen('playlist')}
                className="w-full text-left p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Add to Playlist</span>
                    <span className="text-[10px] text-slate-400">
                      {selectedPlaylists.length > 0 
                        ? `Saved in: ${selectedPlaylists.join(', ')}` 
                        : 'Save this video for structured study lists'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* ROW 3: OFFLINE CACHE */}
              <div className="p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="text-left flex items-center gap-2">
                    <div>
                      <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Offline Cache</span>
                      <span className="text-[10px] text-slate-400">Download to watch without internet</span>
                    </div>
                    {isCached && (
                      <span className="bg-emerald-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Offline
                      </span>
                    )}
                  </div>
                </div>
                {/* Switch toggle on the right */}
                <button 
                  onClick={handleToggleCache}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    isCached ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${
                    isCached ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* ROW 4: REPORT INAPPROPRIATE VIDEO */}
              <button
                onClick={() => setCurrentScreen('report_step1')}
                className="w-full text-left p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/25 text-rose-500 rounded-lg">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Report Inappropriate Video</span>
                    <span className="text-[10px] text-slate-400">Flag for guideline or copyright review</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* ROW 5: INTEREST */}
              <button
                onClick={handleMarkInterest}
                className="w-full text-left p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-50 dark:bg-pink-950/40 text-pink-500 rounded-lg">
                    <Heart className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Interest</span>
                    <span className="text-[10px] text-slate-400">Show more like this</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* ROW 6: NOT INTEREST */}
              <button
                onClick={handleMarkNotInterested}
                className="w-full text-left p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">
                    <ThumbsDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Not Interest</span>
                    <span className="text-[10px] text-slate-400">Hide this video</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* ROW 7: PLAYBACK SPEED */}
              <button
                onClick={() => setCurrentScreen('speed')}
                className="w-full text-left p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-lg">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Playback speed</span>
                    <span className="text-[10px] text-slate-400">Control video rendering speed</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">{playbackSpeed}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {/* ROW 8: COPY LINK */}
              <button
                onClick={handleCopyLink}
                className="w-full text-left p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Copy link</span>
                    <span className="text-[10px] text-slate-400">Share this video</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* ROW 9: QUALITY SETTING */}
              <button
                onClick={() => setCurrentScreen('quality')}
                className="w-full text-left p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center font-black text-[9px]">
                    HD
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Quality setting</span>
                    <span className="text-[10px] text-slate-400">Adjust video resolution</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">
                    {videoQuality} {isDataSaver && '(Lite)'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

            </div>

            {/* Close Button Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-black rounded-2xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* -------------------- 2. ADD TO PLAYLIST SCREEN -------------------- */}
        {currentScreen === 'playlist' && (
          <div className="flex flex-col flex-grow overflow-y-auto">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/20">
              <button 
                onClick={() => setCurrentScreen('main')}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition cursor-pointer text-slate-500 dark:text-slate-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-100">
                Add to a collection
              </h3>
            </div>

            {/* Playlists List */}
            <div className="p-5 flex-grow overflow-y-auto space-y-3 text-left">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">
                Select Playlists
              </p>

              {playlists.map((playlist) => {
                const isSelected = selectedPlaylists.includes(playlist);
                return (
                  <button
                    key={playlist}
                    onClick={() => togglePlaylistSelection(playlist)}
                    className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 cursor-pointer text-left"
                  >
                    <div>
                      <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">{playlist}</span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {isSelected ? 'Video saved here' : 'Tap to add'}
                      </span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition duration-200 ${
                      isSelected 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                    </div>
                  </button>
                );
              })}

              {/* Inline Create playlist form */}
              <form onSubmit={handleCreatePlaylist} className="mt-6 pt-4 border-t border-slate-150 dark:border-slate-800">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">
                  Create New Playlist
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="E.g. Rohingya History..."
                    className="flex-grow px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-850 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition cursor-pointer"
                  >
                    Create +
                  </button>
                </div>
              </form>
            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentScreen('main')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-black rounded-2xl transition cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* -------------------- 3. PLAYBACK SPEED SCREEN -------------------- */}
        {currentScreen === 'speed' && (
          <div className="flex flex-col flex-grow overflow-y-auto">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/20">
              <button 
                onClick={() => setCurrentScreen('main')}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition cursor-pointer text-slate-500 dark:text-slate-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-100">
                Playback Speed
              </h3>
            </div>

            {/* Speeds */}
            <div className="p-5 flex-grow overflow-y-auto space-y-2 text-left">
              {['0.5x', '0.75x', '1x', '1.25x', '1.5x', '2x'].map((speed) => {
                const isSelected = playbackSpeed === speed;
                return (
                  <button
                    key={speed}
                    onClick={() => handleSelectSpeed(speed)}
                    className={`w-full p-3.5 rounded-2xl border flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 cursor-pointer ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400' 
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black">{speed === '1x' ? '1x (Normal)' : speed}</span>
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* -------------------- 4. QUALITY SCREEN -------------------- */}
        {currentScreen === 'quality' && (
          <div className="flex flex-col flex-grow overflow-y-auto">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/20">
              <button 
                onClick={() => setCurrentScreen('main')}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition cursor-pointer text-slate-500 dark:text-slate-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-100">
                Quality Options
              </h3>
            </div>

            {/* Options list */}
            <div className="p-5 flex-grow overflow-y-auto space-y-4 text-left">
              
              {/* Data Saver card */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex justify-between items-center mb-2">
                <div>
                  <span className="text-xs font-black text-purple-700 dark:text-purple-400 block">Data saver mode</span>
                  <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Force 480p max to conserve network megabytes</span>
                </div>
                <button 
                  onClick={handleToggleDataSaver}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    isDataSaver ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${
                    isDataSaver ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Qualities */}
              <div className="space-y-1.5">
                {['Auto', '1080p', '720p', '640p', '540p', '480p', '360p', '270p', '240p'].map((quality) => {
                  const isSelected = videoQuality === quality;
                  const isQualityDisabled = isDataSaver && quality !== 'Auto' && parseInt(quality) > 480;

                  return (
                    <button
                      key={quality}
                      disabled={isQualityDisabled}
                      onClick={() => handleSelectQuality(quality)}
                      className={`w-full px-4 py-3 rounded-xl border flex justify-between items-center transition duration-150 ${
                        isQualityDisabled 
                          ? 'opacity-30 cursor-not-allowed border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/40 text-slate-400' 
                          : isSelected 
                            ? 'border-purple-500 bg-purple-500/5 text-purple-600 dark:text-purple-450 cursor-pointer font-black' 
                            : 'border-slate-150 dark:border-slate-850 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer font-bold'
                      }`}
                    >
                      <span className="text-xs">{quality}</span>
                      {isSelected && (
                        <div className="w-3 h-3 rounded-full bg-purple-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 5. REPORT STEP 1: CHOOSE MAIN REASON -------------------- */}
        {currentScreen === 'report_step1' && (
          <div className="flex flex-col flex-grow overflow-y-auto">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentScreen('main')}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition cursor-pointer text-slate-500 dark:text-slate-400"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Step 1 of 3</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Choices list */}
            <div className="p-5 flex-grow overflow-y-auto text-left">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-tight mb-5 select-text">
                Why are you reporting this video?
              </h2>

              <div className="space-y-2">
                {[
                  "Problem involving someone under 18",
                  "Violent, hateful or disturbing content",
                  "Adult Content",
                  "Scam, Fraud or false information",
                  "I don't want to see this"
                ].map((reason, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setReportStep1Reason(reason);
                      setCurrentScreen('report_step2');
                    }}
                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 cursor-pointer text-left font-bold text-xs text-slate-800 dark:text-slate-200"
                  >
                    <span>{reason}</span>
                    <ChevronRight className="w-4 h-4 text-slate-450" />
                  </button>
                ))}
              </div>
            </div>

            {/* Back to main */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setCurrentScreen('main')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-2xl transition cursor-pointer"
              >
                Back to Tools
              </button>
            </div>
          </div>
        )}

        {/* -------------------- 6. REPORT STEP 2: CHOOSE DETAIL PROBLEM -------------------- */}
        {currentScreen === 'report_step2' && (
          <div className="flex flex-col flex-grow overflow-y-auto">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentScreen('report_step1')}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition cursor-pointer text-slate-500 dark:text-slate-400"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Step 2 of 3</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-choices list */}
            <div className="p-5 flex-grow overflow-y-auto text-left">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block mb-1.5">
                Category: {reportStep1Reason}
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-tight mb-5 select-text">
                Which best to describe the problem
              </h2>

              <div className="space-y-2">
                {[
                  "Threatening to share intimate image",
                  "Seem like sexual exploitation",
                  "Physical abuse"
                ].map((subReason, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setReportStep2SubReason(subReason);
                      setCurrentScreen('report_step3');
                    }}
                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 cursor-pointer text-left font-bold text-xs text-slate-800 dark:text-slate-200"
                  >
                    <span>{subReason}</span>
                    <ChevronRight className="w-4 h-4 text-slate-450" />
                  </button>
                ))}
              </div>
            </div>

            {/* Back button */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setCurrentScreen('report_step1')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-2xl transition cursor-pointer"
              >
                Back to Reason selection
              </button>
            </div>
          </div>
        )}

        {/* -------------------- 7. REPORT STEP 3: INPUT DETAILS FORM -------------------- */}
        {currentScreen === 'report_step3' && (
          <div className="flex flex-col flex-grow overflow-y-auto">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentScreen('report_step2')}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition cursor-pointer text-slate-500 dark:text-slate-400"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Step 3 of 3</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleReportSubmit} className="flex flex-col flex-grow text-left">
              <div className="p-5 flex-grow overflow-y-auto space-y-4">
                
                {/* Title */}
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight text-center mb-4 select-text">
                  Report details
                </h2>

                {/* Categories breadcrumb info card */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-[10px] font-semibold text-slate-500 leading-relaxed">
                  <p>📁 <span className="font-bold text-slate-700 dark:text-slate-350">Reason:</span> {reportStep1Reason}</p>
                  <p className="mt-1">🔍 <span className="font-bold text-slate-700 dark:text-slate-350">Details:</span> {reportStep2SubReason}</p>
                </div>

                {/* 1. Main Issues Textarea */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Describe main issues <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[9px] font-bold ${reportIssuesWordCount > 300 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {reportIssuesWordCount}/300 words
                    </span>
                  </div>
                  <textarea
                    required
                    value={reportIssues}
                    onChange={(e) => setReportIssues(e.target.value)}
                    placeholder="Describe main issues here"
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-850 dark:text-slate-100 placeholder-slate-450 outline-none focus:ring-1 focus:ring-rose-500 transition-all font-medium resize-none"
                  />
                  {reportIssuesWordCount > 300 && (
                    <span className="text-[9px] text-rose-500 font-bold block mt-1">
                      Main issues exceed the 300 word limit.
                    </span>
                  )}
                </div>

                {/* 2. Contact Email */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Contact Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={reportEmail}
                      onChange={(e) => setReportEmail(e.target.value)}
                      placeholder="Email here"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-850 dark:text-slate-100 placeholder-slate-450 outline-none focus:ring-1 focus:ring-rose-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* 3. Description Textarea */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Description (Optional)
                    </label>
                    <span className={`text-[9px] font-bold ${reportDescriptionWordCount > 3000 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {reportDescriptionWordCount}/3000 words
                    </span>
                  </div>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Description"
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-850 dark:text-slate-100 placeholder-slate-450 outline-none focus:ring-1 focus:ring-rose-500 transition-all font-medium resize-none"
                  />
                  {reportDescriptionWordCount > 3000 && (
                    <span className="text-[9px] text-rose-500 font-bold block mt-1">
                      Detailed description exceeds the 3000 word limit.
                    </span>
                  )}
                </div>

              </div>

              {/* Form submit footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('report_step2')}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-2xl transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!isReportValid || isSubmittingReport}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-xs font-black rounded-2xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingReport ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  Submit
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* -------------------- DYNAMIC GLOBAL TOASTS -------------------- */}
      {toast && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-955 border border-slate-800 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-2xl animate-fadeIn z-[60] max-w-sm w-[90%]">
          <span className="text-xs font-black text-center">{toast}</span>
        </div>
      )}

    </div>
  );
}
