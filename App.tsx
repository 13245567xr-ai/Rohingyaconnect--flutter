import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { User, Post, Story, Reel, MarketplaceItem, ChatMessage, type Notification as NotificationItem, ReactionType, Comment, AccountSession, MessageRequest } from './types';
import { db, auth } from './firebase';
import { doc, onSnapshot, updateDoc, getDoc, collection, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useTheme } from './context/ThemeContext';
import { safeStorage } from './utils/safeStorage';
import { FCMManager } from './utils/fcm';

import { 
  subscribeUsers,
  subscribePosts,
  subscribeStories,
  subscribeReels,
  subscribeMarketplace,
  subscribeMessages,
  subscribeNotifications,
  subscribeMessageRequests,
  addPostToFirestore,
  deletePostFromFirestore,
  reactToPostInFirestore,
  addCommentToPostInFirestore,
  addStoryToFirestore,
  addMarketItemToFirestore,
  addChatMessageToFirestore,
  markNotificationsAsReadInFirestore,
  toggleFollowInFirestore,
  updateUserDoc,
  toggleSavePostInFirestore,
  reportPostInFirestore,
  createUserDoc,
  deleteNotificationInFirestore,
  updateNotificationInFirestore,
  addNotificationToFirestore,
  reportUserInFirestore,
  submitCommentReportToFirestore,
  subscribeFollowRequests,
  FollowRequest,
  subscribeSystemSettings,
  subscribeAnnouncements
} from './utils/firebaseSync';

// Sub-components
import Auth from './components/Auth';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Feed from './components/Feed';
import StoryViewer from './components/StoryViewer';
import VideoSection from './components/VideoSection';
import ShortsSection from './components/ShortsSection';
import Marketplace from './components/Marketplace';
import Inbox from './components/Inbox';
import Profile from './components/Profile';
import Menu from './components/Menu';
import AdminDashboard from './components/AdminDashboard';
import CallOverlay from './components/CallOverlay';
import VerticalVideoPlayer from './components/VerticalVideoPlayer';
import NotificationCenter from './components/NotificationCenter';
import FollowRequests from './components/FollowRequests';
import { FeedErrorBoundary } from './components/FeedErrorBoundary';

// Global custom overlays
import AuthOverlay from './components/AuthOverlay';
import ShareOverlay from './components/ShareOverlay';
import SavePostOverlay from './components/SavePostOverlay';
import ReportPostOverlay from './components/ReportPostOverlay';
import { VerifiedBadgeMenu } from './components/VerifiedBadgeMenu';
import VerifiedProfilePage from './components/VerifiedProfilePage';
import * as ImagePicker from './utils/expo-image-picker-web';
import StoryEditScreen from './screens/StoryEditScreen';
import { SearchOverlay } from './components/SearchOverlay';

import GroupInfoSettings from './components/GroupInfoSettings';
import GroupMembersScreen from './screens/GroupMembersScreen';
import Placeholder from './screens/Placeholder';

export default function App() {
  
  // 1. CORE APPLICATION STATE
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return safeStorage.getJSON<User | null>('rc_curr_user', null);
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Multi-Account Management State
  const [loggedAccounts, setLoggedAccounts] = useState<AccountSession[]>(() => {
    return safeStorage.getJSON<AccountSession[]>('rc_logged_in_accounts', []);
  });

  // Global custom overlays state
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [showSharePost, setShowSharePost] = useState<Post | null>(null);
  const [showShareProfile, setShowShareProfile] = useState<User | null>(null);
  const [showSavePostId, setShowSavePostId] = useState<string | null>(null);
  const [showReportPostId, setShowReportPostId] = useState<string | null>(null);
  const [showVerificationMenu, setShowVerificationMenu] = useState(false);

  // Sync current user with loggedAccounts
  useEffect(() => {
    if (currentUser) {
      setLoggedAccounts(prev => {
        const exists = prev.some(acc => acc.username === currentUser.username);
        if (exists) {
          const updated = prev.map(acc => ({
            ...acc,
            isActive: acc.username === currentUser.username,
            fullName: acc.username === currentUser.username ? currentUser.fullName : acc.fullName,
            avatar: acc.username === currentUser.username ? currentUser.avatar : acc.avatar
          }));
          safeStorage.setJSON('rc_logged_in_accounts', updated);
          return updated;
        } else {
          const newSession: AccountSession = {
            id: currentUser.id,
            username: currentUser.username,
            fullName: currentUser.fullName,
            avatar: currentUser.avatar,
            isActive: true,
            email: currentUser.email
          };
          const next = [...prev.map(p => ({ ...p, isActive: false })), newSession];
          safeStorage.setJSON('rc_logged_in_accounts', next);
          return next;
        }
      });
    }
  }, [currentUser]);

  // Handle switching between accounts
  const handleSwitchAccount = (username: string) => {
    const target = loggedAccounts.find(acc => acc.username === username);
    if (target) {
      const match = users.find(u => u.username === target.username || u.id === target.id);
      if (match) {
        setCurrentUser(match);
        safeStorage.setJSON('rc_curr_user', match);
      } else {
        const fallbackUser: User = {
          id: target.id || `man_${target.username}`,
          email: target.email || `${target.username}@rohingyaconnect.org`,
          fullName: target.fullName,
          username: target.username,
          avatar: target.avatar,
          coverPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
          bio: `Active Community Member session for ${target.fullName}.`,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          followers: [],
          following: [],
          role: 'user',
          status: 'active'
        };
        setCurrentUser(fallbackUser);
        safeStorage.setJSON('rc_curr_user', fallbackUser);
      }
      
      setLoggedAccounts(prev => {
        const next = prev.map(acc => ({
          ...acc,
          isActive: acc.username === username
        }));
        safeStorage.setJSON('rc_logged_in_accounts', next);
        return next;
      });
    }
  };

  // Add newly authenticated session to the switcher
  const handleAddAccountSuccess = (newAcc: AccountSession) => {
    setLoggedAccounts(prev => {
      const filtered = prev.filter(acc => acc.username !== newAcc.username);
      const next = [...filtered.map(a => ({ ...a, isActive: false })), { ...newAcc, isActive: true }];
      safeStorage.setJSON('rc_logged_in_accounts', next);
      return next;
    });

    const match = users.find(u => u.username === newAcc.username || u.id === newAcc.id);
    if (match) {
      setCurrentUser(match);
      safeStorage.setJSON('rc_curr_user', match);
    } else {
      const newUser: User = {
        id: newAcc.id || `man_${newAcc.username}`,
        email: newAcc.email || `${newAcc.username}@rohingyaconnect.org`,
        fullName: newAcc.fullName,
        username: newAcc.username,
        avatar: newAcc.avatar,
        coverPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
        bio: `Connected session for ${newAcc.fullName}.`,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        followers: [],
        following: [],
        role: 'user',
        status: 'active'
      };
      setCurrentUser(newUser);
      safeStorage.setJSON('rc_curr_user', newUser);
    }
    setShowAuthOverlay(false);
  };

  const handleRemoveAccountSession = (username: string) => {
    if (currentUser && currentUser.username === username) {
      alert("Cannot delete or unlink your currently active session.");
      return;
    }
    setLoggedAccounts(prev => {
      const next = prev.filter(acc => acc.username !== username);
      safeStorage.setJSON('rc_logged_in_accounts', next);
      return next;
    });
  };

  // Calling state
  const [activeCall, setActiveCall] = useState<{
    id?: string;
    isIncoming?: boolean;
    type: 'audio' | 'video';
    user: User;
    status: 'ringing' | 'connected' | 'ended';
  } | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>({
    appName: "RohingyaConnect",
    appLogo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
    maintenanceMode: false,
    themeDefault: "light"
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeSubScreen, setActiveSubScreen] = useState<{name: string, params: any} | null>(null);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [profileResetKey, setProfileResetKey] = useState(0);
  const [inboxResetKey, setInboxResetKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [activeStoryUserId, setActiveStoryUserId] = useState<string | null>(null);
  const [activeStoryEditParams, setActiveStoryEditParams] = useState<any>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState<string>('home');

  // Navigation History Stack (Back Stack) for rich screen returns
  const [navHistory, setNavHistory] = useState<Array<{ tab: string; profileUserId: string | null }>>([]);
  const [isGoingBack, setIsGoingBack] = useState(false);
  const prevNavStateRef = useRef<{ tab: string; profileUserId: string | null } | null>(null);

  useEffect(() => {
    if (isGoingBack) {
      setIsGoingBack(false);
      return;
    }

    const prevState = prevNavStateRef.current;
    const currentState = { tab: activeTab, profileUserId: selectedProfileUserId };

    if (prevState) {
      if (prevState.tab !== currentState.tab || prevState.profileUserId !== currentState.profileUserId) {
        setNavHistory(prev => {
          const last = prev[prev.length - 1];
          if (last && last.tab === prevState.tab && last.profileUserId === prevState.profileUserId) {
            return prev;
          }
          return [...prev, prevState].slice(-50);
        });
      }
    }
    prevNavStateRef.current = currentState;
  }, [activeTab, selectedProfileUserId, isGoingBack]);

  const handleGoBack = () => {
    if (navHistory.length > 0) {
      const nextHistory = [...navHistory];
      const prevState = nextHistory.pop();
      setNavHistory(nextHistory);
      if (prevState) {
        setIsGoingBack(true);
        setActiveTab(prevState.tab);
        setSelectedProfileUserId(prevState.profileUserId);
      }
    } else {
      // Safely fallback to home
      setActiveTab('home');
      setSelectedProfileUserId(null);
    }
  };

  const navigate = (path: string, params?: any) => {
    if (['GroupInfoSettings', 'GroupMembersScreen', 'NicknamesScreen', 'GroupSearchScreen', 'GroupThemeScreen', 'InvitesRequestScreen', 'MediaFilesLinksScreen', 'PinnedMessagesScreen', 'BlockMemberScreen', 'ReportScreen', 'MemberProfileScreen'].includes(path)) {
      setActiveSubScreen({ name: path, params });
      return;
    }
    if (path.startsWith('/story/')) {
      const uId = path.replace('/story/', '');
      setActiveStoryUserId(uId);
    } else if (path === '/story-editor' || path === 'StoryEditScreen') {
      if (params && params.images) {
        setActiveStoryEditParams(params);
      } else {
        ImagePicker.requestMediaLibraryPermissionsAsync().then(({ status }) => {
          if (status !== 'granted') {
            alert('Permission needed');
            return;
          }
          ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
          }).then((result) => {
            if (!result.canceled) {
              setActiveStoryEditParams({ images: result.assets });
            }
          });
        });
      }
    } else if (path.startsWith('/chat/')) {
      const uId = path.replace('/chat/', '').split('?')[0];
      setActiveChatUserId(uId);
      setActiveTab('inbox');
    } else if (path === '/' || path === '/feed' || path === '/home') {
      setActiveTab('home');
    // PROFILE NAV FIX START
    } else if (path.startsWith('/profile/')) {
      const uId = path.replace('/profile/', '');
      setSelectedProfileUserId(uId === 'me' ? currentUser?.id || null : uId);
      setActiveTab('profile');
// PROFILE NAV FIX END
    } else if (path === '/profile') {
      setSelectedProfileUserId(currentUser?.id || null);
      setActiveTab('profile');
    } else if (path === '/notifications') {
      setActiveTab('notifications');
    } else if (path === '/videos') {
      setActiveTab('video');
    } else if (path === '/follow_requests') {
      setActiveTab('follow_requests');
    } else if (path === '/verified-profile') {
      setActiveTab('verified_profile');
    } else {
      console.log(`Navigating to ${path}`);
    }
  };

// PROFILE NAV FIX START
  const handleProfileClick = (tappedUserId: string) => {
    if (currentUser && currentUser.id === tappedUserId) {
      navigate('/profile/me');
    } else {
      navigate(`/profile/${tappedUserId}`);
    }
  };

  const handleViewProfile = (userId: string) => {
    handleProfileClick(userId);
  };
// PROFILE NAV FIX END

  const handleTabChange = (tabId: string, fromNav = false) => {
    if (tabId === 'rc_assistant') {
      setActiveChatUserId('rc_assistant');
      setActiveTab('inbox');
      return;
    }
    if (tabId === 'profile') {
      setSelectedProfileUserId(currentUser?.id || null);
      setProfileResetKey(prev => prev + 1);
    }
    if (tabId === 'inbox' && fromNav) {
      setInboxResetKey(prev => prev + 1);
      setActiveChatUserId(null);
    }
    if (tabId !== 'video' && tabId !== 'home') {
      setActiveVideoId(null);
    }
    setActiveTab(tabId);
  };

  const handleOpenVideoPlayer = (postId: string) => {
    setPreviousTab(activeTab);
    setActiveTab('video');
    setActiveVideoId(postId);
  };

  // Moderation Assist blocked words state
  const [blockedWords, setBlockedWords] = useState<string[]>(() => {
    return safeStorage.getJSON<string[]>('rc_blocked_words', ['spam', 'scam', 'hate', 'harass', 'violence']);
  });

  useEffect(() => {
    safeStorage.setJSON('rc_blocked_words', blockedWords);
  }, [blockedWords]);

  useEffect(() => {
    (window as any)._navigate = (screen: string, params?: any) => {
      navigate(screen, params);
    };
  });

  // Theme & Language preference states
  const { isDarkMode, toggleDarkMode, themeChoice, setThemeChoice } = useTheme();

  const [appLanguage, setAppLanguage] = useState<string>(() => {
    return safeStorage.getItem('rc_language', 'en') || 'en';
  });

  const handleLanguageChange = async (lang: string) => {
    setAppLanguage(lang);
    safeStorage.setItem('rc_language', lang);
    if (currentUser) {
      try {
        await updateUserDoc(currentUser.id, { language: lang });
        setCurrentUser(prev => prev ? { ...prev, language: lang } : null);
      } catch (e) {
        console.warn("Non-blocking language sync error:", e);
      }
    }
  };

  // Apply RTL direction dynamically based on selected language
  useEffect(() => {
    const rtlLanguages = ['ar', 'ur', 'fa', 'he'];
    const isRtl = rtlLanguages.includes(appLanguage);
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = appLanguage;
  }, [appLanguage]);


  // 2. FIREBASE AUTH STATE SUBSCRIPTION
  useEffect(() => {
    // Safety fallback timer so preview loading is fast and never gets stuck!
    const previewFallbackTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 1200);

    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      clearTimeout(previewFallbackTimer);
      if (fbUser) {
        // Fetch user profile doc asynchronously without blocking the render loop / setAuthLoading(false)
        const fetchUserProfile = async () => {
          try {
            const userDocRef = doc(db, 'rc_users', fbUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              const userData = { id: docSnap.id, ...docSnap.data() } as User;
              setCurrentUser(userData);
              safeStorage.setJSON('rc_curr_user', userData);
              if (userData.language) {
                setAppLanguage(userData.language);
                safeStorage.setItem('rc_language', userData.language);
              }
            } else {
              const newUser = await createUserDoc(fbUser.uid, {
                email: fbUser.email || '',
                fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Community Member',
                username: fbUser.email?.split('@')[0] || fbUser.uid.substring(0, 8),
                language: appLanguage
              });
              setCurrentUser(newUser as User);
              safeStorage.setJSON('rc_curr_user', newUser);
            }
          } catch (error) {
            console.warn("Non-blocking profile fetch offline warning/error:", error);
            // Fallback: recover from safeStorage
            const saved = safeStorage.getJSON<User | null>('rc_curr_user', null);
            if (saved) {
              setCurrentUser(saved);
            }
          }
        };
        fetchUserProfile();
      } else {
        const existing = safeStorage.getJSON<User | null>('rc_curr_user', null);
        if (!existing) {
          setCurrentUser(null);
          safeStorage.removeItem('rc_curr_user');
        }
      }
      setAuthLoading(false);
    });

    return () => {
      clearTimeout(previewFallbackTimer);
      unsubscribeAuth();
    };
  }, []);

  // 3. FIREBASE REAL-TIME SUBSCRIPTIONS
  useEffect(() => {
    if (!currentUser || authLoading) return;

    // Setup global subscriptions to keep all users worldwide synchronized in real time
    const unsubUsers = subscribeUsers(setUsers);
    const unsubPosts = subscribePosts(setPosts);
    const unsubStories = subscribeStories(setStories);
    const unsubReels = subscribeReels(setReels);
    const unsubMarketplace = subscribeMarketplace(setMarketplace);
    const unsubMessages = subscribeMessages(currentUser.id, setMessages);
    const unsubMessageRequests = subscribeMessageRequests(currentUser.id, setMessageRequests);
    const unsubFollowRequests = subscribeFollowRequests(currentUser.id, setFollowRequests);
    const unsubSystemSettings = subscribeSystemSettings(setSystemSettings);
    const unsubAnnouncements = subscribeAnnouncements(setAnnouncements);

    return () => {
      unsubUsers();
      unsubPosts();
      unsubStories();
      unsubReels();
      unsubMarketplace();
      unsubMessages();
      unsubMessageRequests();
      unsubFollowRequests();
      unsubSystemSettings();
      unsubAnnouncements();
    };
  }, [currentUser?.id]);

  // Listen to current user changes in Firestore (roles, statuses, follow counts)
  useEffect(() => {
    if (!currentUser) return;
    
    // Birthday Notification Check
    const checkBirthday = async () => {
      if (!currentUser.birthday) return;
      const today = new Date();
      const birthdayParts = currentUser.birthday.split('-');
      if (birthdayParts.length !== 3) return;
      
      const birthMonth = parseInt(birthdayParts[1], 10);
      const birthDay = parseInt(birthdayParts[2], 10);
      const currentYear = today.getFullYear();

      if (today.getMonth() + 1 === birthMonth && today.getDate() === birthDay) {
        const lastSentYear = currentUser.lastBirthdayNotifYear;
        if (lastSentYear !== currentYear) {
           await addNotificationToFirestore({
            userId: currentUser.id,
            senderId: 'admin_root',
            senderName: 'RohingyaConnect',
            senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
            type: 'birthday',
            createdAt: new Date().toISOString(),
            isRead: false
          });
          
          await updateUserDoc(currentUser.id, { lastBirthdayNotifYear: currentYear });
        }
      }
    };
    checkBirthday();

    // Subscribe to current logged in user doc
    const unsubUserDoc = onSnapshot(doc(db, 'rc_users', currentUser.id), (snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        if (uData.status === 'disabled') {
          handleLogout();
          alert("Your account has been suspended by the administrator for violating community guidelines.");
          return;
        }
        const updated = { id: snap.id, ...uData } as User;
        setCurrentUser(updated);
        safeStorage.setJSON('rc_curr_user', updated);
      }
    }, (error) => {
      console.warn("Firestore subscription error (current user doc):", error);
    });

    // Subscribe to current user's live notifications
    const unsubNotifs = subscribeNotifications(currentUser.id, setNotifications);

    return () => {
      unsubUserDoc();
      unsubNotifs();
    };
  }, [currentUser?.id]);

  // 3.5 LISTEN TO INCOMING CALLS FOR LOGGED IN USER
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'rc_calls'),
      where('receiverId', '==', currentUser.id),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.forEach((changeDoc) => {
        const data = changeDoc.data();
        const caller = users.find(u => u.id === data.callerId);
        if (caller) {
          setActiveCall({
            id: changeDoc.id,
            type: data.type,
            user: caller,
            status: 'ringing',
            isIncoming: true
          });
        }
      });
    }, (error) => {
      console.warn("Firestore incoming call subscription failed: ", error);
    });

    return () => unsubscribe();
  }, [currentUser, users]);

  // 3.6 LISTEN TO ACTIVE CALL STATUS UPDATE
  useEffect(() => {
    if (!activeCall || !activeCall.id) return;

    const unsubscribe = onSnapshot(doc(db, 'rc_calls', activeCall.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'ended') {
          setActiveCall(null);
        }
      } else {
        setActiveCall(null);
      }
    }, (error) => {
      console.warn("Firestore active call subscription failed: ", error);
    });

    return () => unsubscribe();
  }, [activeCall?.id]);

  // 3.7 FIREBASE CLOUD MESSAGING & PUSH CAMPAIGN REGISTRATION
  useEffect(() => {
    if (!currentUser) return;

    // Only register/request if the permission has already been granted to prevent unsolicited auto-prompts on mount
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
      FCMManager.registerDevice(currentUser.id).then(token => {
        if (token) {
          console.log("[FCM] Device token successfully registered:", token);
        }
      });
    }

    // Handle foreground incoming push notification messages
    const unsubscribeFCM = FCMManager.subscribeToForeground((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'RohingyaConnect Announcement';
      const body = payload.notification?.body || payload.data?.body || 'New message';
      const image = payload.notification?.image || payload.data?.image || '/icon.png';
      const actionLink = payload.data?.click_action || '/notifications';

      // 1. Log push delivery receipt
      if (payload.data?.announcementId) {
        FCMManager.logDelivery(payload.data.announcementId, currentUser.id, 'delivered');
      }

      // 2. Spawn a browser system notification banner if permission is approved
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        try {
          const banner = new window.Notification(title, {
            body,
            icon: image,
            badge: '/icon.png',
            tag: payload.data?.announcementId || 'foreground-alert'
          });
          banner.onclick = () => {
            window.focus();
            navigate(actionLink);
            if (payload.data?.announcementId) {
              FCMManager.logClick(payload.data.announcementId, currentUser.id);
            }
          };
        } catch (e) {
          console.warn("Could not display Notification construct inside sandbox iframe context:", e);
        }
      }
    });

    // 3. Process direct deep linking analytics from clicked push messages
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const clicked = urlParams.get('notif_click');
      const annId = urlParams.get('ann_id');
      const recId = urlParams.get('rec_id');
      if (clicked === 'true' && annId && recId) {
        FCMManager.logClick(annId, recId);
        // Clean deep-linking search query strings elegantly
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    return () => {
      unsubscribeFCM();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const handleOpenSavePost = (e: any) => {
      setShowSavePostId(e.detail.postId);
    };
    const handleOpenReportPost = (e: any) => {
      setShowReportPostId(e.detail.postId);
    };
    const handleOpenVerificationMenu = () => {
      setShowVerificationMenu(true);
    };
    window.addEventListener('open-save-post', handleOpenSavePost);
    window.addEventListener('open-report-post', handleOpenReportPost);
    window.addEventListener('open-verification-menu', handleOpenVerificationMenu);
    return () => {
      window.removeEventListener('open-save-post', handleOpenSavePost);
      window.removeEventListener('open-report-post', handleOpenReportPost);
      window.removeEventListener('open-verification-menu', handleOpenVerificationMenu);
    };
  }, []);

  // 4. MUTATIONS AND EVENTS
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    safeStorage.setJSON('rc_curr_user', user);
    setActiveTab('home');

    // Request notification permission and register FCM device token when logging in
    FCMManager.registerDevice(user.id).then(token => {
      if (token) {
        console.log("[FCM] Device token successfully registered on login:", token);
      }
    }).catch(err => {
      console.warn("[FCM] Failed to register device on login:", err);
    });
  };

  const handleRegisterUser = (newUser: User) => {
    // Registered through auth directly
  };

  const handleLogout = () => {
    if (currentUser) {
      // Securely deregister device token on logout to block ghost pushes
      FCMManager.deregisterDevice(currentUser.id).catch(e => {
        console.warn("Deregister FCM token warning:", e);
      });
    }
    setCurrentUser(null);
    safeStorage.removeItem('rc_curr_user');
    try {
      auth.signOut();
    } catch (e) {
      console.warn("Auth sign out error:", e);
    }
  };

  // Profile updates
  const handleUpdateProfile = async (updatedUser: User) => {
    if (!currentUser) return;
    try {
      await updateUserDoc(currentUser.id, {
        fullName: updatedUser.fullName,
        avatar: updatedUser.avatar,
        coverPhoto: updatedUser.coverPhoto,
        bio: updatedUser.bio,
        currentCity: updatedUser.currentCity || "",
        homeTown: updatedUser.homeTown || "",
        birthday: updatedUser.birthday || "",
        workExperience: updatedUser.workExperience || "",
        education: updatedUser.education || "",
        hobbies: updatedUser.hobbies || []
      });
      setCurrentUser(updatedUser);
    } catch (err) {
      console.error("Error updating profile in database:", err);
    }
  };

  // Posts mutations
  const handleAddPost = async (content: string, image?: string, videoUrl?: string, isVideo?: boolean, taggedUsers?: string[], isProfileUpdatePost?: boolean) => {
    if (!currentUser) return;
    try {
      await addPostToFirestore({
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        userAvatar: currentUser.avatar,
        content,
        image: image || undefined,
        videoUrl: videoUrl || undefined,
        createdAt: new Date().toISOString(),
        reactions: [],
        comments: [],
        sharesCount: 0,
        isVideo: isVideo || false,
        taggedUsers: taggedUsers || [],
        isProfileUpdatePost: isProfileUpdatePost || false
      });
    } catch (err) {
      console.error("Error creating post:", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) {
      console.error("Unauthorized delete: No logged in user");
      return;
    }
    try {
      // Find post locally first to verify ownership before calling firestore
      const post = posts.find(p => p.id === postId);
      if (post) {
        const ownerId = post.ownerId || post.userId;
        if (ownerId && ownerId !== currentUser.id) {
          console.error("Unauthorized delete: User is not the owner");
          alert("Error: You do not have permission to delete this post.");
          return;
        }
      }
      await deletePostFromFirestore(postId, currentUser.id);
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const handleReactToPost = async (postId: string, reactionType: ReactionType) => {
    if (!currentUser) return;
    try {
      const post = posts.find(p => p.id === postId);
      if (post) {
        await reactToPostInFirestore(
          postId,
          currentUser.id,
          reactionType,
          post.userId,
          currentUser.fullName,
          currentUser.avatar
        );
      }
    } catch (err) {
      console.error("Error toggling post reaction:", err);
    }
  };

  const handleCommentToPost = async (postId: string, text: string) => {
    if (!currentUser) return;
    const containsBlocked = blockedWords.some(word => 
      text.toLowerCase().includes(word.toLowerCase())
    );
    if (containsBlocked) {
      alert("Comment contains restricted words and could not be posted.");
      return;
    }
    try {
      const post = posts.find(p => p.id === postId);
      if (post) {
        await addCommentToPostInFirestore(postId, {
          userId: currentUser.id,
          userFullName: currentUser.fullName,
          userAvatar: currentUser.avatar,
          text,
          createdAt: new Date().toISOString()
        }, post.userId);
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
    }
  };

  const handleReactToComment = async (postId: string, commentId: string, type: 'like' | 'dislike') => {
    if (!currentUser) return;
    try {
      const postRef = doc(db, 'rc_posts', postId);
      const post = posts.find(p => p.id === postId);
      if (post) {
        const updateFn = (c: Comment): Comment => {
          const currentLikes = c.likes || [];
          const currentDislikes = c.dislikes || [];
          if (type === 'like') {
            const hasLiked = currentLikes.includes(currentUser.id);
            const nextLikes = hasLiked 
              ? currentLikes.filter(id => id !== currentUser.id)
              : [...currentLikes, currentUser.id];
            const nextDislikes = currentDislikes.filter(id => id !== currentUser.id);
            return { ...c, likes: nextLikes, dislikes: nextDislikes };
          } else {
            const hasDisliked = currentDislikes.includes(currentUser.id);
            const nextDislikes = hasDisliked
              ? currentDislikes.filter(id => id !== currentUser.id)
              : [...currentDislikes, currentUser.id];
            const nextLikes = currentLikes.filter(id => id !== currentUser.id);
            return { ...c, likes: nextLikes, dislikes: nextDislikes };
          }
        };

        const updateCommentInArray = (list: Comment[]): Comment[] => {
          return list.map(c => {
            if (c.id === commentId) {
              return updateFn(c);
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateCommentInArray(c.replies) };
            }
            return c;
          });
        };

        const updatedComments = updateCommentInArray(post.comments || []);
        await updateDoc(postRef, { comments: updatedComments });
      }
    } catch (err) {
      console.error("Error reacting to comment:", err);
    }
  };

  const handleReplyToComment = async (postId: string, parentCommentId: string, text: string) => {
    if (!currentUser) return;
    const containsBlocked = blockedWords.some(word => 
      text.toLowerCase().includes(word.toLowerCase())
    );
    if (containsBlocked) {
      alert("Comment contains restricted words and could not be posted.");
      return;
    }
    try {
      const postRef = doc(db, 'rc_posts', postId);
      const post = posts.find(p => p.id === postId);
      if (post) {
        const newReply: Comment = {
          id: 'reply_' + Date.now(),
          userId: currentUser.id,
          userFullName: currentUser.fullName,
          userAvatar: currentUser.avatar,
          text,
          createdAt: new Date().toISOString(),
          likes: [],
          dislikes: [],
          replies: []
        };

        const updateCommentInArray = (list: Comment[]): Comment[] => {
          return list.map(c => {
            if (c.id === parentCommentId) {
              const currentReplies = c.replies || [];
              return { ...c, replies: [...currentReplies, newReply] };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateCommentInArray(c.replies) };
            }
            return c;
          });
        };

        const updatedComments = updateCommentInArray(post.comments || []);
        await updateDoc(postRef, { comments: updatedComments });
      }
    } catch (err) {
      console.error("Error replying to comment:", err);
    }
  };

  const handleSharePost = (postId: string) => {
    if (!currentUser) return;
    
    // 1. Check Posts list
    const post = posts.find(p => p.id === postId);
    if (post) {
      if (post.originalPostId || post.sharedFromPostId) {
        const originalId = post.originalPostId || post.sharedFromPostId;
        const originalPost = posts.find(p => p.id === originalId);
        if (originalPost) {
          setShowSharePost(originalPost);
          return;
        }
      }
      setShowSharePost(post);
      return;
    }
    
    // 2. Check Reels list
    const reel = reels.find(r => r.id === postId);
    if (reel) {
      setShowSharePost({
        id: reel.id,
        userId: reel.userId,
        userFullName: reel.userFullName,
        userAvatar: reel.userAvatar,
        content: reel.caption,
        videoUrl: reel.videoUrl,
        isVideo: true,
        createdAt: new Date().toISOString(),
        reactions: [],
        comments: [],
        sharesCount: 0
      });
      return;
    }
  };

  const handleShareStory = (story: Story) => {
    if (!currentUser) return;
    setShowSharePost({
      id: story.id,
      userId: story.userId,
      userFullName: story.userFullName,
      userAvatar: story.userAvatar,
      content: `Check out ${story.userFullName}'s Story!`,
      image: story.image,
      createdAt: story.createdAt,
      reactions: [],
      comments: [],
      sharesCount: 0
    });
  };

  const handleShareProfile = (user: User) => {
    if (!currentUser) return;
    setShowShareProfile(user);
  };

  const handleSavePost = async (postId: string) => {
    if (!currentUser) return;
    try {
      await toggleSavePostInFirestore(currentUser.id, postId);
    } catch (err) {
      console.error("Error saving post:", err);
    }
  };

  const handleReportPost = async (postId: string, reason: string) => {
    if (!currentUser) return;
    try {
      await reportPostInFirestore(postId, currentUser.id, reason);
      alert("This post has been reported to RohingyaConnect administrators for review.");
    } catch (err) {
      console.error("Error reporting post:", err);
    }
  };

  // Stories
  const handleAddStory = async (mediaUrl: string, mediaType: string, metadata?: any) => {
    console.log("handleAddStory called with:", { mediaUrl, mediaType, metadata });
    if (!currentUser) return;
    try {
      await addStoryToFirestore({
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        userAvatar: currentUser.avatar,
        mediaUrl,
        mediaType,
        createdAt: new Date().toISOString(),
        ...(metadata || {})
      });
      console.log("Story successfully added to Firestore");
    } catch (err) {
      console.error("Error creating story:", err);
    }
  };

  // Marketplace
  const handleAddItem = async (
    title: string, 
    price: number, 
    description: string, 
    category: string, 
    image: string, 
    location: string
  ) => {
    if (!currentUser) return;
    try {
      await addMarketItemToFirestore({
        title,
        price,
        description,
        category,
        image,
        sellerId: currentUser.id,
        sellerName: currentUser.fullName,
        sellerAvatar: currentUser.avatar,
        location,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error listing marketplace item:", err);
    }
  };

  // Contact Seller
  const handleContactSeller = (
    sellerId: string, 
    sellerName: string, 
    sellerAvatar: string, 
    initialProductMessage?: string
  ) => {
    if (!currentUser) return;

    if (initialProductMessage) {
      const threadMessages = messages.filter(
        m => (m.senderId === currentUser.id && m.receiverId === sellerId) || 
             (m.senderId === sellerId && m.receiverId === currentUser.id)
      );
      if (threadMessages.length === 0) {
        handleSendMessage(sellerId, initialProductMessage);
      }
    }

    setActiveChatUserId(sellerId);
    setActiveTab('inbox');
  };

  // Messenger Real-time Chat & Auto-Repliers
  const handleSendMessage = async (receiverId: string, text: string) => {
    if (!currentUser) return;

    try {
      await addChatMessageToFirestore({
        senderId: currentUser.id,
        receiverId,
        text,
        createdAt: new Date().toISOString(),
        isRead: false
      }, currentUser.fullName, currentUser.avatar);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleReceiveMessage = () => {
    // Handled by onSnapshot real-time listener!
  };

  // Follow/Unfollow
  const handleFollowToggle = async (targetId: string) => {
    if (!currentUser) return;
    try {
      await toggleFollowInFirestore(
        currentUser.id,
        targetId,
        currentUser.fullName,
        currentUser.avatar
      );
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  const handleMarkNotificationsAsRead = async () => {
    if (!currentUser) return;
    try {
      await markNotificationsAsReadInFirestore(currentUser.id);
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  const [createPostOptions, setCreatePostOptions] = useState<{ isVideo?: boolean } | null>(null);

  const handleOpenCreatePostModal = (options?: { isVideo?: boolean }) => {
    setCreatePostOptions(options || null);
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 4. TAB ROUTER VIEW RENDER
  if (authLoading && !currentUser) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center bg-[#F0F2F5] dark:bg-slate-950 ${isDarkMode ? 'dark' : ''}`}>
        <div className="inline-flex items-center justify-center p-4 bg-[#1877F2]/10 rounded-2xl border border-[#1877F2]/20 mb-3 animate-pulse">
          <svg className="w-10 h-10 text-[#1877F2] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[#1877F2] animate-pulse">
          Connecting to RohingyaConnect...
        </h1>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Auth 
        onLoginSuccess={handleLoginSuccess}
        users={users}
        onRegisterUser={handleRegisterUser}
      />
    );
  }

  // Maintenance Mode Lock
  if (systemSettings?.maintenanceMode === true && currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'moderator') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20 mb-6 text-amber-500 animate-pulse">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black mb-3">
          {systemSettings?.appName || "RohingyaConnect"} is Under Maintenance
        </h1>
        <p className="text-slate-400 max-w-md mb-8 text-xs leading-relaxed font-medium">
          The developers are currently performing active database tuning and platform optimization. We apologize for any inconvenience. Please check back in a few moments.
        </p>
        <div className="text-[10px] text-slate-500 font-mono tracking-wider">
          SYSTEM STATUS: ONLINE (MAINTENANCE STAGE)
        </div>
      </div>
    );
  }

  // Filter out posts from disabled users or hidden posts
  const visiblePosts = posts.filter(p => {
    const author = users.find(u => u.id === p.userId);
    if (author?.status === 'disabled') return false;
    if (p.inTrash && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin' && currentUser?.role !== 'moderator') {
      return false;
    }
    return true;
  });

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return null;
      case 'shorts':
        return (
          <ShortsSection
            currentUser={currentUser}
            users={users}
            onViewProfile={handleViewProfile}
            onFollowToggle={handleFollowToggle}
            onSharePost={handleSharePost}
          />
        );
      case 'video':
        return (
          <VideoSection 
            reels={reels}
            posts={visiblePosts}
            currentUser={currentUser}
            onViewProfile={handleViewProfile}
            onFollowToggle={handleFollowToggle}
            onSharePost={handleSharePost}
            users={users}
            onAddPost={handleAddPost}
            onReactToPost={handleReactToPost}
            activeVideoId={activeVideoId}
            onOpenCreatePostModal={handleOpenCreatePostModal}
            onCloseVideo={() => {
              setActiveVideoId(null);
              if (previousTab === 'home') {
                setActiveTab('home');
              }
            }}
          />
        );
      case 'marketplace':
        return (
          <Marketplace
            items={marketplace}
            currentUser={currentUser}
            users={users}
            onAddItem={handleAddItem}
            onContactSeller={handleContactSeller}
            onViewProfile={handleViewProfile}
          />
        );
      case 'inbox':
        return (
          <Inbox
            key={inboxResetKey}
            currentUser={currentUser}
            users={users}
            messages={messages}
            onSendMessage={handleSendMessage}
            onReceiveMessage={handleReceiveMessage}
            activeChatUserId={activeChatUserId}
            setActiveChatUserId={setActiveChatUserId}
            onStartCall={(type, target) => setActiveCall({ type, user: target, status: 'ringing' })}
            onViewProfile={handleViewProfile}
            messageRequests={messageRequests}
            stories={stories}
          />
        );
      case 'profile':
        return (
          <Profile
            key={`${selectedProfileUserId || currentUser?.id || ""}-${profileResetKey}`}
            currentUser={currentUser}
            appLanguage={appLanguage}
            viewingUserId={selectedProfileUserId || currentUser?.id || ""}
            onViewProfile={handleViewProfile}
            onUpdateProfile={handleUpdateProfile}
            posts={visiblePosts}
            onDeletePost={handleDeletePost}
            users={users}
            onFollowToggle={handleFollowToggle}
            parentNavigate={navigate}
            onAddPost={handleAddPost}
            onStartChat={(userId) => {
               setActiveChatUserId(userId);
               setActiveTab('inbox');
            }}
            onShareProfile={handleShareProfile}
            onReactToPost={handleReactToPost}
            onBack={handleGoBack}
          />
        );
      case 'menu':
        return (
          <Menu
            currentUser={currentUser}
            users={users}
            posts={posts}
            onUpdateProfile={handleUpdateProfile}
            onFollowToggle={handleFollowToggle}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            onLogout={handleLogout}
            postsCount={posts.length}
            marketplaceCount={marketplace.length}
            onTabChange={handleTabChange}
            blockedWords={blockedWords}
            onAddBlockedWord={(word) => setBlockedWords(prev => prev.includes(word) ? prev : [...prev, word])}
            onRemoveBlockedWord={(word) => setBlockedWords(prev => prev.filter(w => w !== word))}
            themeChoice={themeChoice}
            onChangeThemeChoice={setThemeChoice}
            appLanguage={appLanguage}
            onChangeLanguage={handleLanguageChange}
            onViewProfile={handleViewProfile}
          />
        );
      case 'admin':
        return (
          <AdminDashboard
            currentUser={currentUser}
            users={users}
            posts={posts}
            marketplace={marketplace}
            onBackToApp={() => setActiveTab('home')}
            onViewProfile={handleViewProfile}
          />
        );
      case 'notifications':
        return (
          <NotificationCenter
            currentUser={currentUser}
            notifications={notifications}
            onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
            onTabChange={handleTabChange}
            onViewProfile={handleViewProfile}
            setActiveChatUserId={setActiveChatUserId}
            onUpdateNotification={async (notifId, updates) => {
              setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, ...updates } : n));
              try {
                await updateNotificationInFirestore(notifId, updates);
              } catch (err) {
                console.warn("Error updating notification in Firestore:", err);
              }
            }}
            onDeleteNotification={async (notifId) => {
              setNotifications(prev => prev.filter(n => n.id !== notifId));
              try {
                await deleteNotificationInFirestore(notifId);
              } catch (err) {
                console.warn("Error deleting notification from Firestore:", err);
              }
            }}
            onReportUser={async (reportData) => {
              try {
                await reportUserInFirestore(reportData);
              } catch (err) {
                console.warn("Error reporting user in Firestore:", err);
              }
            }}
          />
        );
      case 'FriendsScreen':
      case 'follow_requests':
        return (
          <FollowRequests
            currentUser={currentUser!}
            users={users}
            followRequests={followRequests}
            onViewProfile={handleViewProfile}
            onTabChange={handleTabChange}
          />
        );
      case 'verified_profile':
        return (
          <VerifiedProfilePage 
            currentUser={currentUser!} 
            onBack={() => setActiveTab('home')}
          />
        );
      default:
        return <div>Not found</div>;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 ${isDarkMode ? 'dark' : ''}`}>
      
      {/* HEADER SECTION */}
      <Header
        currentUser={currentUser}
        onTabChange={handleTabChange}
        activeTab={activeTab}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        onSearchFocus={() => setIsSearchActive(true)}
        isSearchActive={isSearchActive}
        onSearchCancel={() => {
          setIsSearchActive(false);
          setSearchQuery('');
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        notifications={notifications}
        onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
        onLogout={handleLogout}
        setActiveChatUserId={setActiveChatUserId}
        loggedAccounts={loggedAccounts}
        onSwitchAccount={handleSwitchAccount}
        onAddAccountClick={() => setShowAuthOverlay(true)}
        onRemoveAccount={handleRemoveAccountSession}
        followRequests={followRequests}
        appName={systemSettings?.appName}
        appLogo={systemSettings?.appLogo}
      />

      {/* GLOBAL BANNER FOR ANNOUNCEMENT */}
      {announcements && announcements.length > 0 && (
        (() => {
          const latestAnn = announcements[0];
          const isDismissed = localStorage.getItem(`rc_dismiss_ann_${latestAnn.id}`) === 'true';
          if (isDismissed) return null;

          return (
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow relative z-40">
              <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 text-xs md:text-sm font-semibold">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="px-1.5 py-0.5 bg-white/20 rounded text-[9px] uppercase font-black tracking-wider shrink-0 animate-pulse">
                    {latestAnn.priority || 'Info'}
                  </span>
                  <p className="truncate">
                    <span className="font-extrabold">{latestAnn.title}:</span> {latestAnn.body}
                  </p>
                  {latestAnn.actionLink && (
                    <a 
                      href={latestAnn.actionLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="underline hover:text-white/80 shrink-0 ml-1 flex items-center gap-0.5 text-[11px] font-bold"
                    >
                      {latestAnn.actionLabel || 'Details'} →
                    </a>
                  )}
                </div>
                <button 
                  onClick={() => {
                    localStorage.setItem(`rc_dismiss_ann_${latestAnn.id}`, 'true');
                    setAnnouncements([...announcements]);
                  }}
                  className="p-1 hover:bg-white/10 rounded-full transition shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })()
      )}

      <SearchOverlay
        isVisible={isSearchActive}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClose={() => setIsSearchActive(false)}
        currentUser={currentUser}
        users={users}
        onFollowToggle={handleFollowToggle}
        onViewProfile={(userId) => {
          setIsSearchActive(false);
          handleViewProfile(userId);
        }}
      />

      {/* CORE BODY GRID */}
      <div className={`${activeTab === 'inbox' ? 'w-full max-w-full' : 'max-w-7xl mx-auto'} flex`}>
        
        {/* DESKTOP SIDEBAR NAVIGATION */}
        
        <Navigation
          activeTab={activeTab}
          onTabChange={(tabId) => handleTabChange(tabId, true)}
          currentUser={currentUser}
          onOpenCreatePostModal={handleOpenCreatePostModal}
          hideBottomNav={activeTab === 'profile' && selectedProfileUserId !== currentUser.id}
        />
        

        {/* ACTIVE TABS PANEL CONTENT RENDERED */}
        <main className={`flex-grow mb-16 md:mb-0 ${activeTab === 'inbox' ? 'p-0 py-0 px-0' : 'py-6 px-4 md:px-6'}`}>
          <div className={activeTab === 'home' ? 'block' : 'hidden'}>
            <FeedErrorBoundary>
              <Feed
                posts={visiblePosts}
                currentUser={currentUser}
                onAddPost={handleAddPost}
                onDeletePost={handleDeletePost}
                onReactToPost={handleReactToPost}
                onCommentToPost={handleCommentToPost}
                onSharePost={handleSharePost}
                stories={stories}
                onAddStory={handleAddStory}
                onShareStory={handleShareStory}
                searchQuery={searchQuery}
                onSavePost={handleSavePost}
                onReportPost={handleReportPost}
                blockedWords={blockedWords}
                onReactToComment={handleReactToComment}
                onReplyToComment={handleReplyToComment}
                onViewProfile={handleViewProfile}
                users={users}
                navigate={navigate}
                onFollowToggle={handleFollowToggle}
                onOpenVideoPlayer={handleOpenVideoPlayer}
                isVideoPlayerOpen={!!activeVideoId}
                createPostOptions={createPostOptions}
                setCreatePostOptions={setCreatePostOptions}
              />
            </FeedErrorBoundary>
          </div>
          {renderActiveView()}
        </main>

      </div>

      {activeCall && (
        <CallOverlay 
          callType={activeCall.type}
          targetUser={activeCall.user}
          callId={activeCall.id}
          isIncoming={activeCall.isIncoming}
          onEndCall={() => setActiveCall(null)} 
        />
      )}

      {/* 4. CUSTOM INTEGRATION OVERLAYS */}
      <AuthOverlay
        isOpen={showAuthOverlay}
        onClose={() => setShowAuthOverlay(false)}
        onSuccess={handleAddAccountSuccess}
      />

      <ShareOverlay
        isOpen={!!showSharePost || !!showShareProfile}
        postId={showSharePost?.id || null}
        profileId={showShareProfile?.id || null}
        postContent={showSharePost?.content || ''}
        imageUrl={showSharePost?.image || showShareProfile?.avatar || ''}
        title={showShareProfile ? `Connect with ${showShareProfile.fullName} on Rohingya Connect` : showSharePost?.content ? (showSharePost.content.substring(0, 50) + '...') : "Rohingya Connect Update"}
        currentUser={currentUser}
        users={users}
        onClose={() => {
          setShowSharePost(null);
          setShowShareProfile(null);
        }}
      />

      <SavePostOverlay
        isOpen={!!showSavePostId}
        postId={showSavePostId}
        currentUser={currentUser}
        onSave={(pid, col) => {
          toggleSavePostInFirestore(currentUser.id, pid);
        }}
        onClose={() => setShowSavePostId(null)}
      />

      <ReportPostOverlay
        isOpen={!!showReportPostId}
        postId={showReportPostId}
        onSubmitReport={(pid, reason) => {
          reportPostInFirestore(pid, currentUser.id, reason);
        }}
        onClose={() => setShowReportPostId(null)}
      />

      {showVerificationMenu && (
        <VerifiedBadgeMenu
          currentUser={currentUser}
          onClose={() => setShowVerificationMenu(false)}
        />
      )}

      {activeStoryUserId && (
        <StoryViewer
          userId={activeStoryUserId}
          onClose={() => setActiveStoryUserId(null)}
          navigate={navigate}
          stories={stories}
        />
      )}

      {activeStoryEditParams && (
        <StoryEditScreen
          images={activeStoryEditParams.images || []}
          currentUser={currentUser}
          onClose={() => setActiveStoryEditParams(null)}
          onShare={async (mediaUrl: string, mediaType: string, metadata?: any) => {
            await handleAddStory(mediaUrl, mediaType, metadata);
            setActiveStoryEditParams(null);
          }}
        />
      )}

    </div>
  );
}
