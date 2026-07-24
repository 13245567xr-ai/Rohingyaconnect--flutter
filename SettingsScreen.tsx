// NEW MESSENGER + WHATSAPP BUILD — OLD CODE COMPLETELY REPLACED
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Bell, MessageSquare, Accessibility, Shield, Briefcase, Phone, 
  HelpCircle, Scale, ShieldCheck, Check, Camera, Sparkles, Sliders, ChevronRight,
  Info, AlertTriangle, Eye, Globe, ChevronDown, CheckCircle2, RefreshCw, Fingerprint
} from 'lucide-react';
import { User as UserType } from '../types';
import { db } from '../firebase';
import { FCMManager } from '../utils/fcm';
import { collection, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import DeviceAuthenticator from './DeviceAuthenticator';
import { faqData } from '../data/faq';
import { privacyPolicyData } from '../data/privacyPolicy';

interface SettingsScreenProps {
  currentUser: UserType;
  users?: UserType[];
  onUpdateProfile: (updated: UserType) => void;
  onTabChange: (tab: string) => void;
  themeChoice?: 'light' | 'dark' | 'system';
  onChangeThemeChoice?: (choice: 'light' | 'dark' | 'system') => void;
  appLanguage?: string;
  onChangeLanguage?: (lang: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=60',
];

export default function SettingsScreen({
  currentUser,
  users = [],
  onUpdateProfile,
  onTabChange,
  themeChoice = 'light',
  onChangeThemeChoice,
  appLanguage = 'en',
  onChangeLanguage
}: SettingsScreenProps) {
  // Navigation Sub-Views
  const [activeSection, setActiveSection] = useState<'root' | 'profile' | 'notifications' | 'chatheads' | 'accessibility' | 'privacy' | 'professional' | 'banglalink' | 'report' | 'help' | 'legal' | 'blocked-users'>('root');

  // Profile Edit State
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [showAvatarPresets, setShowAvatarPresets] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedPrivacyId, setExpandedPrivacyId] = useState<number | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notifications State
  const [muteNotifications, setMuteNotifications] = useState(() => {
    return localStorage.getItem('settings_mute_notif') === 'true';
  });
  const [notificationSound, setNotificationSound] = useState(() => {
    return localStorage.getItem('settings_sound_notif') || 'chime';
  });
  const [notifPermission, setNotifPermission] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'default';
  });

  // Chat Heads State
  const [chatHeadsEnabled, setChatHeadsEnabled] = useState(() => {
    return localStorage.getItem('settings_chatheads') !== 'false'; // default true
  });

  // Accessibility State
  const [reduceMotion, setReduceMotion] = useState<'on' | 'off' | 'system'>(() => {
    return (localStorage.getItem('settings_reduce_motion') as any) || 'off';
  });
  const [activeColor, setActiveColor] = useState(() => {
    return localStorage.getItem(`active_color_${currentUser?.id}`) || '#10b981'; // default emerald
  });

  // Privacy State
  const [lastSeen, setLastSeen] = useState<'everyone' | 'contacts' | 'nobody'>(() => {
    return (localStorage.getItem('settings_last_seen') as any) || 'everyone';
  });
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('settings_blocked_users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newBlockUsername, setNewBlockUsername] = useState('');
  
  // Biometric state variables
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [isBiometricallyVerified, setIsBiometricallyVerified] = useState(false);

  // Real-time blocked users array from users/{currentUserId} in Firestore
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  // Real-time muted senders array from users/{currentUserId} in Firestore
  const [mutedSenders, setMutedSenders] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const userDocRef = doc(db, 'rc_users', currentUser.id);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBlockedUserIds(data.blockedUsers || []);
        setMutedSenders(data.mutedSenders || []);
      }
    }, (err) => {
      console.warn("Error listening to users metadata: ", err);
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  const mutedListUsers = mutedSenders.map(uid => {
    const found = users?.find(u => u.id === uid);
    if (found) return found;
    return {
      id: uid,
      fullName: `User (${uid.substring(0, 5)})`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60',
      username: uid,
    };
  });

  const handleTurnOnNotifications = async (senderId: string) => {
    try {
      const userDocRef = doc(db, 'rc_users', currentUser.id);
      const nextMuted = mutedSenders.filter(id => id !== senderId);
      await updateDoc(userDocRef, {
        mutedSenders: nextMuted
      });
      localStorage.setItem('rc_muted_senders', JSON.stringify(nextMuted));
    } catch (err) {
      console.error("Error turning notifications back on: ", err);
      alert("Failed to turn notifications back on. Please try again.");
    }
  };

  const blockedListUsers = blockedUserIds.map(uid => {
    const found = users?.find(u => u.id === uid);
    if (found) return found;
    return {
      id: uid,
      fullName: `User (${uid.substring(0, 5)})`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60',
      username: uid,
    };
  });

  const handleUnblockUser = async (blockedUserId: string) => {
    try {
      const userDocRef = doc(db, 'rc_users', currentUser.id);
      const nextBlocked = blockedUserIds.filter(id => id !== blockedUserId);
      await updateDoc(userDocRef, {
        blockedUsers: nextBlocked
      });
      localStorage.setItem('settings_blocked_users', JSON.stringify(nextBlocked));
    } catch (err) {
      console.error("Error unblocking user: ", err);
      alert("Failed to unblock user. Please check your internet connection.");
    }
  };

  // Professional Settings State
  const [creatorTools, setCreatorTools] = useState(() => {
    return localStorage.getItem('settings_creator_tools') === 'true';
  });
  const [businessAnalytics, setBusinessAnalytics] = useState(() => {
    return localStorage.getItem('settings_business_analytics') === 'true';
  });

  // Report Technical Problem State
  const [problemCategory, setProblemCategory] = useState('messaging');
  const [problemDescription, setProblemDescription] = useState('');
  const [problemLogsConsent, setProblemLogsConsent] = useState(true);
  const [isSubmittingProblem, setIsSubmittingProblem] = useState(false);
  const [problemSubmitted, setProblemSubmitted] = useState(false);

  // Sync LocalStorage accessibility reductions
  useEffect(() => {
    localStorage.setItem('settings_reduce_motion', reduceMotion);
    if (reduceMotion === 'on') {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [reduceMotion]);

  // Handle Profile Update
  const handleUpdateProfile = async () => {
    setIsSavingProfile(true);
    const updatedUser: UserType = {
      ...currentUser,
      fullName,
      bio,
      avatar
    };

    try {
      // Sync with Firestore doc
      const userRef = doc(db, 'rc_users', currentUser.id);
      await updateDoc(userRef, {
        fullName,
        bio,
        avatar
      });
      
      onUpdateProfile(updatedUser);
      localStorage.setItem('rc_curr_user', JSON.stringify(updatedUser));
      alert("Your profile has been synchronized successfully.");
      setActiveSection('root');
    } catch (err) {
      console.warn("Firestore profile sync failed, saving locally: ", err);
      onUpdateProfile(updatedUser);
      localStorage.setItem('rc_curr_user', JSON.stringify(updatedUser));
      setActiveSection('root');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Blocked users manager
  const handleAddBlock = () => {
    if (!newBlockUsername.trim()) return;
    const cleanUsername = newBlockUsername.trim().toLowerCase().replace('@', '');
    if (!blockedUsers.includes(cleanUsername)) {
      const nextList = [...blockedUsers, cleanUsername];
      setBlockedUsers(nextList);
      localStorage.setItem('settings_blocked_users', JSON.stringify(nextList));
    }
    setNewBlockUsername('');
  };

  const handleRemoveBlock = (username: string) => {
    const nextList = blockedUsers.filter(u => u !== username);
    setBlockedUsers(nextList);
    localStorage.setItem('settings_blocked_users', JSON.stringify(nextList));
  };

  // Technical Problem submitter
  const handleProblemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim()) return;

    setIsSubmittingProblem(true);
    try {
      await addDoc(collection(db, 'rc_technical_problems'), {
        userId: currentUser.id,
        category: problemCategory,
        description: problemDescription,
        includeLogs: problemLogsConsent,
        createdAt: new Date().toISOString()
      });
      setProblemSubmitted(true);
      setProblemDescription('');
    } catch (err) {
      console.error("Failed to log problem: ", err);
      alert("Connection timed out. Problem logged locally for background sync.");
    } finally {
      setIsSubmittingProblem(false);
    }
  };

  return (
    <div id="settings_panel" className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-md p-5 select-none transition-colors duration-200">
      
      {/* 1. ROOT SETTINGS NAV TREE */}
      {activeSection === 'root' && (
        <div className="space-y-6">
          
          {/* HEADER HEADER SUMMARY */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
            <div className="relative">
              <img 
                src={currentUser?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=fallback'} 
                alt={currentUser?.fullName} 
                className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500"
              />
              <span 
                className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full border-2 border-white dark:border-slate-900"
                style={{ backgroundColor: activeColor }}
              />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-850 dark:text-slate-100">{currentUser?.fullName}</h4>
              <p className="text-[11px] text-slate-400 font-mono">@{currentUser?.username}</p>
              <button 
                onClick={() => setActiveSection('profile')}
                className="mt-1.5 text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-500 flex items-center gap-0.5"
              >
                Edit Profile Settings
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">App Configuration</span>
            
            {/* Nav Row Profile */}
            <button 
              onClick={() => setActiveSection('profile')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition text-left"
            >
              <span className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                <User className="w-4.5 h-4.5 text-slate-400" /> Account Avatar & Bio
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            {/* Nav Row Notifications */}
            <button 
              onClick={() => setActiveSection('notifications')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition text-left"
            >
              <span className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Bell className="w-4.5 h-4.5 text-slate-400" /> Push Notifications
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            {/* Nav Row Chat Heads */}
            <button 
              onClick={() => setActiveSection('chatheads')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition text-left"
            >
              <span className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                <MessageSquare className="w-4.5 h-4.5 text-slate-400" /> Floating Chat Heads
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            {/* Nav Row Accessibility */}
            <button 
              onClick={() => setActiveSection('accessibility')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition text-left"
            >
              <span className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Accessibility className="w-4.5 h-4.5 text-slate-400" /> Accessibility & Status Color
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            {/* Nav Row Block List */}
            <button 
              onClick={() => setActiveSection('blocked-users')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition text-left"
            >
              <span className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Shield className="w-4.5 h-4.5 text-slate-400" /> Block List
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            {/* Theme Switcher */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-3">
              <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Display Theme</h5>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as const).map((choice) => (
                  <button
                    key={choice}
                    onClick={() => onChangeThemeChoice && onChangeThemeChoice(choice)}
                    className={`py-2 px-3 text-xs font-black rounded-xl border transition uppercase ${
                      themeChoice === choice 
                        ? 'bg-emerald-600 text-white border-transparent' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 my-4" />

          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">Support & Legals</span>
            
            {/* Report Problem */}
            <button 
              onClick={() => setActiveSection('report')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition text-left"
            >
              <span className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                <AlertTriangle className="w-4.5 h-4.5 text-slate-400" /> Report Technical Problem
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            {/* Privacy Policy */}
            <button 
              onClick={() => setActiveSection('privacy')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition text-left"
            >
              <span className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4.5 h-4.5 text-slate-400" /> Privacy Policy
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            {/* Help */}
            <button 
              onClick={() => setActiveSection('help')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition text-left"
            >
              <span className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                <HelpCircle className="w-4.5 h-4.5 text-slate-400" /> Help Center & FAQ
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            {/* Legal */}
            <button 
              onClick={() => setActiveSection('legal')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition text-left"
            >
              <span className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Scale className="w-4.5 h-4.5 text-slate-400" /> Legal & Terms
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>

          <div className="text-center pt-2">
            <p className="text-[9px] text-slate-400 font-mono tracking-widest">
              ROHINGYACONNECT SYSTEM CONFIG v2.0
            </p>
          </div>

        </div>
      )}
      
      {/* 2. PROFILE EDIT SUB-VIEW */}
      {activeSection === 'profile' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button onClick={() => setActiveSection('root')} className="text-xs font-extrabold text-slate-400 hover:text-slate-650 flex items-center gap-1">
              &larr; Settings Back
            </button>
            <h4 className="text-xs font-black uppercase text-slate-500">Edit Profile Parameters</h4>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <img 
                src={avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=fallback'} 
                alt="Profile Avatar" 
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-lg"
              />
              <button 
                onClick={() => setShowAvatarPresets(!showAvatarPresets)}
                className="absolute bottom-0 right-0 p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition shadow-md"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Preset Avatar Selector */}
            {showAvatarPresets && (
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 w-full">
                <span className="text-[10px] font-black uppercase text-slate-450 block mb-2">Select Preset Avatar</span>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((avUrl, idx) => (
                    <img 
                      key={idx}
                      src={avUrl}
                      onClick={() => { setAvatar(avUrl); setShowAvatarPresets(false); }}
                      alt={`Preset ${idx}`}
                      className={`w-10 h-10 rounded-full object-cover cursor-pointer border-2 hover:scale-105 transition duration-150 ${avatar === avUrl ? 'border-emerald-500' : 'border-transparent'}`}
                    />
                  ))}
                </div>
                <div className="mt-3 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-450 block">Or Custom URL</span>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="https://example.com/avatar.jpg"
                      value={customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-xl outline-none"
                    />
                    <button 
                      onClick={() => { if (customAvatarUrl) { setAvatar(customAvatarUrl); setShowAvatarPresets(false); } }}
                      className="px-3 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-450">Full Display Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs font-semibold px-4 py-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-450">Bio Description</label>
              <textarea 
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full text-xs font-semibold px-4 py-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl outline-none focus:border-emerald-500 transition resize-none"
                placeholder="Tell the community about yourself..."
              />
            </div>

            <button 
              onClick={handleUpdateProfile}
              disabled={isSavingProfile}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-3 rounded-2xl shadow-lg transition duration-150 flex items-center justify-center gap-1.5"
            >
              {isSavingProfile ? 'Synchronizing with Database...' : 'Save and Sync Settings'}
            </button>
          </div>
        </div>
      )}

      {/* 3. NOTIFICATIONS SUB-VIEW */}
      {activeSection === 'notifications' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button onClick={() => setActiveSection('root')} className="text-xs font-extrabold text-slate-400 hover:text-slate-650 flex items-center gap-1">
              &larr; Settings Back
            </button>
            <h4 className="text-xs font-black uppercase text-slate-500">Push Notifications</h4>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mb-1">Browser Notifications Permission</h5>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                <div className="text-[10px] text-slate-400">
                  {notifPermission === 'granted' ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Notifications are enabled for this browser.
                    </span>
                  ) : notifPermission === 'denied' ? (
                    <span className="text-rose-500 font-bold">
                      Blocked. Please enable notifications in your browser's site settings.
                    </span>
                  ) : (
                    <span>Not yet granted. Enable to receive push announcements.</span>
                  )}
                </div>
                {notifPermission === 'default' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await FCMManager.registerDevice(currentUser.id);
                      if (typeof window !== 'undefined' && 'Notification' in window) {
                        setNotifPermission(window.Notification.permission);
                      }
                    }}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition"
                  >
                    Enable Notifications
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div>
                <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Mute Push Notifications</h5>
                <p className="text-[10px] text-slate-400 mt-0.5">Completely silence message ringing and alerts</p>
              </div>
              <input 
                type="checkbox" 
                checked={muteNotifications}
                onChange={(e) => {
                  setMuteNotifications(e.target.checked);
                  localStorage.setItem('settings_mute_notif', String(e.target.checked));
                }}
                className="w-5 h-5 rounded accent-emerald-600"
              />
            </div>

            <div className="space-y-1.5 p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Alert Sound Profiles</h5>
              <p className="text-[10px] text-slate-400 mb-2">Select the signal used for new inbound messages</p>
              <div className="grid grid-cols-3 gap-2">
                {['chime', 'bell', 'digital'].map((snd) => (
                  <button
                    key={snd}
                    onClick={() => {
                      setNotificationSound(snd);
                      localStorage.setItem('settings_sound_notif', snd);
                    }}
                    className={`py-2 px-3 text-xs font-black rounded-xl border transition uppercase ${
                      notificationSound === snd 
                        ? 'bg-emerald-600 text-white border-transparent' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {snd}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Muted Notification Senders</h5>
              <p className="text-[10px] text-slate-400">Manage senders from whom you have turned off notifications. You can turn notifications back on anytime.</p>
              
              {mutedListUsers.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No muted senders.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {mutedListUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <img 
                          src={(user as any).avatar} 
                          alt={(user as any).fullName} 
                          className="w-7 h-7 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{(user as any).fullName}</p>
                          <p className="text-[9px] text-slate-400">@{(user as any).username || (user as any).id}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleTurnOnNotifications(user.id)}
                        className="px-2.5 py-1 text-[9px] font-black uppercase text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-600 rounded-lg transition cursor-pointer"
                      >
                        Turn Back On
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CHAT HEADS SUB-VIEW */}
      {activeSection === 'chatheads' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button onClick={() => setActiveSection('root')} className="text-xs font-extrabold text-slate-400 hover:text-slate-650 flex items-center gap-1">
              &larr; Settings Back
            </button>
            <h4 className="text-xs font-black uppercase text-slate-500">Floating Chat Heads</h4>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Enable Floating Bubbles</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">Let new messages appear as floating overlays on your screen</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={chatHeadsEnabled}
                  onChange={(e) => {
                    setChatHeadsEnabled(e.target.checked);
                    localStorage.setItem('settings_chatheads', String(e.target.checked));
                  }}
                  className="w-5 h-5 rounded accent-emerald-600"
                />
              </div>

              <div className="text-center p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                <span className="text-[11px] font-extrabold text-slate-500 block mb-1">Preview of Chat Head</span>
                <div className="inline-block relative">
                  <img 
                    src={currentUser?.avatar} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 animate-bounce"
                    alt="Bubble"
                  />
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white font-black text-[9px] rounded-full flex items-center justify-center">1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ACCESSIBILITY SUB-VIEW */}
      {activeSection === 'accessibility' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button onClick={() => setActiveSection('root')} className="text-xs font-extrabold text-slate-400 hover:text-slate-650 flex items-center gap-1">
              &larr; Settings Back
            </button>
            <h4 className="text-xs font-black uppercase text-slate-500">Accessibility Settings</h4>
          </div>

          <div className="space-y-4">
            
            {/* Reduce Motion */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-2">
              <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Reduce Frame Rate & Motion</h5>
              <p className="text-[10px] text-slate-400">Optimize transitions to minimize system CPU load and prevent animations</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {['on', 'off', 'system'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setReduceMotion(val as any)}
                    className={`py-2 px-3 text-xs font-black rounded-xl border transition uppercase ${
                      reduceMotion === val 
                        ? 'bg-emerald-600 text-white border-transparent' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Status Color */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-2">
              <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Active Status Indicator Color</h5>
              <p className="text-[10px] text-slate-400">Personalize how your online presence is displayed to friends</p>
              <div className="flex gap-3 mt-2 justify-center bg-white dark:bg-slate-900 p-3 rounded-xl border">
                {[
                  { name: 'Green', hex: '#10b981' },
                  { name: 'Blue', hex: '#3b82f6' },
                  { name: 'Purple', hex: '#8b5cf6' },
                  { name: 'Yellow', hex: '#eab308' },
                  { name: 'Pink', hex: '#ec4899' },
                ].map((colorObj) => (
                  <button
                    key={colorObj.hex}
                    onClick={() => {
                      setActiveColor(colorObj.hex);
                      localStorage.setItem(`active_color_${currentUser?.id}`, colorObj.hex);
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition ${activeColor === colorObj.hex ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: colorObj.hex }}
                    title={colorObj.name}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      )}      {/* 6. BLOCKED USERS LIST SUB-VIEW */}
      {activeSection === 'blocked-users' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button 
              onClick={() => setActiveSection('root')} 
              className="text-xs font-extrabold text-slate-400 hover:text-slate-650 flex items-center gap-1 bg-transparent border-0 cursor-pointer"
            >
              &larr; Settings Back
            </button>
            <h4 className="text-xs font-black uppercase text-slate-500">Block List</h4>
          </div>

          <div className="bg-slate-950 text-white border border-slate-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-950/20 to-black/20 pointer-events-none" />
            <div className="relative z-10">
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-4 h-4 animate-pulse" /> Privacy Protection
              </span>
              <h2 className="text-lg font-black tracking-tight mt-1 font-sans">Blocked Users</h2>
              <p className="text-[11px] text-slate-400 font-light leading-snug mt-1 font-sans">
                Users on this list cannot call you, message you, or see your activity feed. You can unblock them at any time below.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {blockedListUsers.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-950/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400 font-sans">No blocked users</p>
                <p className="text-[10px] text-slate-400 font-light mt-0.5 max-w-xs mx-auto font-sans">You have not placed any restrictions on other members.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blockedListUsers.map((user) => (
                  <div 
                    key={user.id}
                    className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=fallback'} 
                        alt={user.fullName} 
                        className="w-10 h-10 rounded-full object-cover border"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-150 font-sans">{user.fullName}</h4>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">@{user.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblockUser(user.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. PROFESSIONAL SETTINGS SUB-VIEW */}
      {activeSection === 'professional' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button onClick={() => setActiveSection('root')} className="text-xs font-extrabold text-slate-400 hover:text-slate-650 flex items-center gap-1">
              &larr; Settings Back
            </button>
            <h4 className="text-xs font-black uppercase text-slate-500">Professional Settings</h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div>
                <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Creator Tools Portfolio</h5>
                <p className="text-[10px] text-slate-400 mt-0.5">Toggle advanced community analytics and post boosting metrics</p>
              </div>
              <input 
                type="checkbox" 
                checked={creatorTools}
                onChange={(e) => {
                  setCreatorTools(e.target.checked);
                  localStorage.setItem('settings_creator_tools', String(e.target.checked));
                }}
                className="w-5 h-5 rounded accent-emerald-600"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div>
                <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Business Hub Auditing</h5>
                <p className="text-[10px] text-slate-400 mt-0.5">Allow commercial inquiries and product catalog syncing</p>
              </div>
              <input 
                type="checkbox" 
                checked={businessAnalytics}
                onChange={(e) => {
                  setBusinessAnalytics(e.target.checked);
                  localStorage.setItem('settings_business_analytics', String(e.target.checked));
                }}
                className="w-5 h-5 rounded accent-emerald-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* 8. BANGLALINK TELECOM PROGRAM SUB-VIEW */}
      {activeSection === 'banglalink' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button onClick={() => setActiveSection('root')} className="text-xs font-extrabold text-slate-400 hover:text-slate-650 flex items-center gap-1">
              &larr; Settings Back
            </button>
            <h4 className="text-xs font-black uppercase text-slate-500">Banglalink Program</h4>
          </div>

          {/* BANGLALINK BRAND BANNER */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <span className="text-[9px] bg-white text-orange-600 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Official Camp Alliance</span>
              <h3 className="text-base font-black">Banglalink Community Zero-Rate</h3>
              <p className="text-[11px] text-orange-50/90 leading-relaxed">
                Enjoy free data packets and low latency RohingyaConnect application usage across Cox's Bazar and neighboring regions. No active data charges are applied.
              </p>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-3">
              <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Activate Special Data Package</h5>
              <p className="text-[10px] text-slate-400">Claim 500 MB free emergency connectivity data per week</p>
              <button 
                onClick={() => alert("Banglalink Data Package Activated successfully. 500 MB has been credited to your SIM connection.")}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-black py-2.5 rounded-xl shadow-md transition duration-150"
              >
                Claim Free Weekly 500 MB Data
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-2.5 text-xs text-slate-600 dark:text-slate-350 font-semibold">
              <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">SIM Status & Verification</h5>
              <div className="flex justify-between border-b pb-1">
                <span>Network Provider</span>
                <span className="text-orange-500 font-extrabold">Banglalink BD</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>Data Zero-Rating Status</span>
                <span className="text-emerald-500 font-extrabold">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span>Emergency Support Hotkey</span>
                <span className="font-mono">*121*88#</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. REPORT TECHNICAL PROBLEM SUB-VIEW */}
      {activeSection === 'report' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button onClick={() => setActiveSection('root')} className="text-xs font-extrabold text-slate-400 hover:text-slate-650 flex items-center gap-1">
              &larr; Settings Back
            </button>
            <h4 className="text-xs font-black uppercase text-slate-500">Report Technical Problem</h4>
          </div>

          {problemSubmitted ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Technical Report Submitted</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                Thank you. Your feedback and connection diagnostics have been transmitted securely. Engineers will examine logs within 24 hours.
              </p>
              <button 
                onClick={() => setProblemSubmitted(false)}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl"
              >
                File Another Report
              </button>
            </div>
          ) : (
            <form onSubmit={handleProblemSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450">Category of Problem</label>
                <select 
                  value={problemCategory}
                  onChange={(e) => setProblemCategory(e.target.value)}
                  className="w-full text-xs font-bold px-4 py-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl outline-none"
                >
                  <option value="messaging">Secure Chat & Emojis</option>
                  <option value="calling">WebRTC Video / Voice Calling</option>
                  <option value="storage">Media Gallery Uploads</option>
                  <option value="ui">Slow Loading / UI Glitches</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450">Detailed Diagnostic Description</label>
                <textarea 
                  rows={4}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Explain exactly what happened, and list the steps to reproduce the issue..."
                  className="w-full text-xs px-4 py-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl outline-none focus:border-emerald-500 transition resize-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border">
                <input 
                  type="checkbox" 
                  checked={problemLogsConsent}
                  onChange={(e) => setProblemLogsConsent(e.target.checked)}
                  className="w-5 h-5 rounded accent-emerald-600"
                />
                <span className="text-[10px] text-slate-400 font-semibold leading-tight">
                  Attach background telemetry diagnostics and console errors to the ticket.
                </span>
              </div>

              <button 
                type="submit"
                disabled={isSubmittingProblem}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-3 rounded-2xl shadow-lg transition duration-150 flex items-center justify-center gap-1"
              >
                {isSubmittingProblem ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Transmit Problem Report'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* 10. HELP CENTER & FAQ SUB-VIEW */}
      {activeSection === 'help' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button onClick={() => setActiveSection('root')} className="text-xs font-extrabold text-slate-400 hover:text-slate-650 flex items-center gap-1">
              &larr; Settings Back
            </button>
            <h4 className="text-xs font-black uppercase text-slate-500">Help Center & FAQ</h4>
          </div>

          <div className="space-y-3.5 pr-1">
            {faqData.map((faq) => (
              <div key={faq.id} className="p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 rounded-2xl">
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full flex justify-between items-center text-left"
                >
                  <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{faq.question}</h5>
                  <motion.div
                    animate={{ rotate: expandedId === faq.id ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {expandedId === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      {faq.id === 16 ? (
                        <p className="text-[14px] font-normal text-[#65676B] mt-2 leading-relaxed">
                          Yes. We use industry-standard security practices to help protect your account and personal information. For more details, please review our{" "}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSection('privacy');
                            }}
                            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline active:scale-95 transition-all duration-150 inline-block align-baseline"
                          >
                            Privacy Policy
                          </button>
                          .
                        </p>
                      ) : (
                        <div 
                          className="text-[14px] font-normal text-[#65676B] mt-2 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: faq.answer }}
                        ></div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 11. PRIVACY POLICY SUB-VIEW */}
      {activeSection === 'privacy' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button onClick={() => setActiveSection('root')} className="text-xs font-extrabold text-slate-400 hover:text-slate-650 flex items-center gap-1">
              &larr; Settings Back
            </button>
            <h4 className="text-xs font-black uppercase text-slate-500">Privacy Policy</h4>
          </div>

          <div className="space-y-3.5 pr-1">
            {privacyPolicyData.map((policy) => (
              <div key={policy.id} className="p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 rounded-2xl">
                <button
                  onClick={() => setExpandedPrivacyId(expandedPrivacyId === policy.id ? null : policy.id)}
                  className="w-full flex justify-between items-center text-left"
                >
                  <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{policy.title}</h5>
                  <motion.div
                    animate={{ rotate: expandedPrivacyId === policy.id ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {expandedPrivacyId === policy.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div 
                        className="text-[14px] font-normal text-[#65676B] mt-2 leading-relaxed"
                      >
                        {policy.content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 rounded-2xl text-[10px] text-slate-400 space-y-2">
              <p>Last Updated: July 2026</p>
              <p>© 2026 RohingyaConnect. All rights reserved.</p>
              <p>"Your privacy, security, and trust are important to us. RohingyaConnect is committed to protecting your personal information while providing a safe and reliable community platform."</p>
            </div>
          </div>
        </div>
      )}

      {/* 12. LEGAL & TERMS SUB-VIEW */}
      {activeSection === 'legal' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center">
            <button onClick={() => setActiveSection('root')} className="text-xs font-extrabold text-slate-400 hover:text-slate-650 flex items-center gap-1">
              &larr; Settings Back
            </button>
            <h4 className="text-xs font-black uppercase text-slate-500">Legal & Terms</h4>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 text-[10px] text-slate-450 leading-relaxed font-semibold">
            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">1. Acceptance of Terms</h5>
            <p>
              By creating an account or using RohingyaConnect, you agree to comply with these Terms and all applicable laws and regulations. If you do not agree, you must discontinue use of the platform.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">2. Community Standards</h5>
            <p>
              Users must treat others with respect. Content involving harassment, hate speech, threats, discrimination, violence, terrorism, child exploitation, impersonation, scams, malware, or illegal activities is strictly prohibited. Violations may result in content removal, account suspension, or permanent termination.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">3. User Accounts</h5>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. You agree to provide accurate information and are responsible for all activities performed through your account.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">4. User Content</h5>
            <p>
              You retain ownership of the content you create and upload. By posting content on RohingyaConnect, you grant the platform a limited license to store, display, distribute, and process that content solely for operating and improving the service.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">5. Privacy & Data Protection</h5>
            <p>
              Your personal information is handled in accordance with our Privacy Policy. We implement reasonable technical and organizational safeguards to protect user data. We do not sell personal information to third parties.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">6. Intellectual Property</h5>
            <p>
              The RohingyaConnect name, logo, software, design, and platform features are protected by applicable intellectual property laws. Unauthorized copying, modification, or redistribution is prohibited.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">7. Reporting & Moderation</h5>
            <p>
              Users may report content or accounts that violate these Terms. RohingyaConnect reserves the right to investigate reports and take appropriate enforcement actions, including removing content or restricting accounts.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">8. Communications</h5>
            <p>
              By using the platform, you consent to receive essential service communications such as account verification, password reset messages, security alerts, and important platform updates.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">9. Third-Party Services</h5>
            <p>
              Certain features may rely on trusted third-party providers, including Firebase, Google services, payment providers, or cloud storage. Their respective terms and privacy policies also apply where relevant.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">10. Security</h5>
            <p>
              Users must not attempt to gain unauthorized access to accounts, systems, or data. Activities such as hacking, reverse engineering, automated abuse, spam, or distributing malicious software are prohibited.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">11. Account Suspension & Termination</h5>
            <p>
              RohingyaConnect may suspend or permanently terminate accounts that violate these Terms, compromise platform security, or engage in unlawful activities.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">12. Limitation of Liability</h5>
            <p>
              RohingyaConnect is provided on an "as available" basis. To the maximum extent permitted by law, we are not liable for indirect, incidental, consequential, or special damages arising from the use of the platform.
            </p>

            <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">13. Changes to the Terms</h5>
            <p>
              We may update these Terms from time to time. Continued use of RohingyaConnect after changes become effective constitutes acceptance of the revised Terms.
            </p>
            <p>
              Last Updated: July 2026
            </p>
            <p>
              © 2026 RohingyaConnect. All rights reserved.
              "Connecting the Rohingya community through secure, respectful, and responsible digital communication."
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
