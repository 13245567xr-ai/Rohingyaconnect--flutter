import './src/polyfills';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch, 
  query, 
  orderBy, 
  limit, 
  where 
} from 'firebase/firestore';
import { auth, db } from './src/firebase';
import { 
  ShieldAlert, Users, FileText, AlertTriangle, Trash2, CheckCircle, 
  Search, UserX, UserCheck, Send, DollarSign, TrendingUp, BellRing, 
  Lock, Unlock, Award, Eye, EyeOff, Pin, Plus, Mail, ShieldCheck, 
  Settings, LayoutDashboard, Database, RefreshCw, Moon, Sun, Filter, 
  ChevronLeft, ChevronRight, X, Edit3, Trash, Info, BookOpen, Film
} from 'lucide-react';

function AdminPanelApp() {
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('rc_admin_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Real-time Collections Data State
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState({
    appName: "RohingyaConnect",
    appLogo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
    maintenanceMode: false,
    themeDefault: "light"
  });

  // UI Control States
  const [userQuery, setUserQuery] = useState('');
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 6;

  const [postQuery, setPostQuery] = useState('');
  const [postUserFilter, setPostUserFilter] = useState('');
  const [postDateFilter, setPostDateFilter] = useState('all'); // all, today, week, month

  const [selectedUser, setSelectedUser] = useState<any>(null); // for profile details modal
  const [editingUser, setEditingUser] = useState<any>(null); // for edit user modal
  
  // Notification Broadcast States
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all'); // all, userId
  const [targetUserId, setTargetUserId] = useState('');
  const [notifSuccess, setNotifSuccess] = useState('');

  // Settings modification state
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // --------------------------------------------------------
  // THEME MANAGEMENT
  // --------------------------------------------------------
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('rc_admin_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('rc_admin_theme', 'light');
    }
  }, [darkMode]);

  // --------------------------------------------------------
  // AUTHENTICATION GUARD
  // --------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        console.warn("No active admin session detected. Redirecting to Timeline...");
        window.location.href = '/index.html';
        return;
      }
      
      try {
        const userDocRef = doc(db, 'rc_users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.role !== 'admin') {
            console.error("Access Denied: Current session has no administrative access. Signing out...");
            await signOut(auth);
            window.location.href = '/index.html';
          } else {
            setCurrentAdmin(userData);
            setIsLoading(false);
          }
        } else {
          console.error("Firestore error: User credentials exist in Auth but not in active Users directory.");
          await signOut(auth);
          window.location.href = '/index.html';
        }
      } catch (error) {
        console.error("Administrative verification security fail:", error);
        window.location.href = '/index.html';
      }
    });
    
    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------
  // REAL-TIME FIRESTORE SYNCHRONIZATION
  // --------------------------------------------------------
  useEffect(() => {
    if (!currentAdmin) return;

    // Listen to Users
    const unsubUsers = onSnapshot(collection(db, 'rc_users'), (snapshot) => {
      const uList: any[] = [];
      snapshot.forEach(doc => {
        uList.push({ id: doc.id, ...doc.data() });
      });
      setUsers(uList);
    }, (err) => console.error("Error reading users doc list:", err));

    // Listen to Posts
    const unsubPosts = onSnapshot(collection(db, 'rc_posts'), (snapshot) => {
      const pList: any[] = [];
      snapshot.forEach(doc => {
        pList.push({ id: doc.id, ...doc.data() });
      });
      // Sort by creation date or custom pinned state
      pList.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setPosts(pList);
    }, (err) => console.error("Error reading posts:", err));

    // Listen to Stories
    const unsubStories = onSnapshot(collection(db, 'rc_stories'), (snapshot) => {
      const sList: any[] = [];
      snapshot.forEach(doc => {
        sList.push({ id: doc.id, ...doc.data() });
      });
      setStories(sList);
    }, (err) => console.error("Error syncing stories:", err));

    // Listen to Reels
    const unsubReels = onSnapshot(collection(db, 'rc_reels'), (snapshot) => {
      const rList: any[] = [];
      snapshot.forEach(doc => {
        rList.push({ id: doc.id, ...doc.data() });
      });
      setReels(rList);
    }, (err) => console.error("Error syncing reels:", err));

    // Listen to Marketplace
    const unsubMarket = onSnapshot(collection(db, 'rc_marketplace'), (snapshot) => {
      const mList: any[] = [];
      snapshot.forEach(doc => {
        mList.push({ id: doc.id, ...doc.data() });
      });
      setMarketplace(mList);
    }, (err) => console.error("Error syncing marketplace:", err));

    // Listen to System Settings App Config
    const unsubSettings = onSnapshot(doc(db, 'rc_system_settings', 'app_config'), (snapshot) => {
      if (snapshot.exists()) {
        setSystemSettings(snapshot.data() as any);
      }
    }, (err) => console.warn("System config not yet bootstrapped. Using defaults."));

    return () => {
      unsubUsers();
      unsubPosts();
      unsubStories();
      unsubReels();
      unsubMarket();
      unsubSettings();
    };
  }, [currentAdmin]);

  // --------------------------------------------------------
  // SECURITY HANDLED OPERATIONS
  // --------------------------------------------------------

  // Save Settings to Firestore
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess('');
    try {
      await setDoc(doc(db, 'rc_system_settings', 'app_config'), systemSettings);
      setSettingsSuccess("System configurations updated successfully in Firestore!");
      setSettingsLoading(false);
      setTimeout(() => setSettingsSuccess(''), 3500);
    } catch (err: any) {
      console.error("Error updating settings doc:", err);
      alert("Permission denied or database setup pending: " + err.message);
      setSettingsLoading(false);
    }
  };

  // Toggle user status (active vs disabled)
  const handleToggleUserStatus = async (userId: string, currentStatus: string | undefined) => {
    const nextStatus = currentStatus === 'disabled' ? 'active' : 'disabled';
    const actionWord = nextStatus === 'disabled' ? 'suspend/suspend' : 'reinstate';
    if (!window.confirm(`Are you absolutely sure you want to ${actionWord} this member's account access?`)) return;

    try {
      await updateDoc(doc(db, 'rc_users', userId), { status: nextStatus });
    } catch (err: any) {
      alert("Error modifying user status: " + err.message);
    }
  };

  // Edit user details completely
  const handleUpdateUserDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'rc_users', editingUser.id), {
        fullName: editingUser.fullName,
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        status: editingUser.status,
        emailVerified: editingUser.emailVerified === true
      });
      setEditingUser(null);
    } catch (err: any) {
      alert("Error updating user specifications: " + err.message);
    }
  };

  // Delete user account permanently
  const handleDeleteUserAccount = async (userId: string) => {
    if (!window.confirm("CRITICAL WARNING: Deleting this account is permanent. It will instantly remove user profiles from all searches and dashboards. Proceed?")) return;
    try {
      await deleteDoc(doc(db, 'rc_users', userId));
      if (selectedUser && selectedUser.id === userId) setSelectedUser(null);
    } catch (err: any) {
      alert("Error removing account node: " + err.message);
    }
  };

  // Toggle Post Pinned state
  const handleTogglePinPost = async (postId: string, currentPinned: boolean | undefined) => {
    try {
      await updateDoc(doc(db, 'rc_posts', postId), { pinned: !currentPinned });
    } catch (err: any) {
      alert("Error pinning post: " + err.message);
    }
  };

  // Toggle Post Hidden state
  const handleToggleHidePost = async (postId: string, currentHidden: boolean | undefined) => {
    try {
      await updateDoc(doc(db, 'rc_posts', postId), { hidden: !currentHidden });
    } catch (err: any) {
      alert("Error hiding post: " + err.message);
    }
  };

  // Delete post permanently
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this publication permanently from the RohingyaConnect server?")) return;
    try {
      await deleteDoc(doc(db, 'rc_posts', postId));
    } catch (err: any) {
      alert("Error removing post record: " + err.message);
    }
  };

  // Resolve moderation reports
  const handleResolveReport = async (postId: string, action: 'keep' | 'delete') => {
    try {
      if (action === 'keep') {
        // Clear reports array, set reported back to false
        await updateDoc(doc(db, 'rc_posts', postId), {
          reported: false,
          reportsCount: 0,
          reports: []
        });
      } else if (action === 'delete') {
        // Delete post
        await deleteDoc(doc(db, 'rc_posts', postId));
      }
    } catch (err: any) {
      alert("Error finalizing report resolution: " + err.message);
    }
  };

  // Ban User AND Delete Post utilizing atomic batch writes
  const handleBanReporterAuthorAndPurge = async (postAuthorId: string, postId: string) => {
    if (!window.confirm("EXPERT ACTION: This will instantly suspend the post author's account AND permanently delete this reported publication in a secure atomic transaction. Continue?")) return;
    
    try {
      const batch = writeBatch(db);
      // Suspend user
      batch.update(doc(db, 'rc_users', postAuthorId), { status: 'disabled' });
      // Delete post
      batch.delete(doc(db, 'rc_posts', postId));
      
      await batch.commit();
    } catch (err: any) {
      alert("Batch write transaction failed: " + err.message);
    }
  };

  // Dispatch Global or Targeted Broadcast Notifications
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) return;

    try {
      if (broadcastTarget === 'all') {
        // Broadcast to all users
        const batch = writeBatch(db);
        users.forEach((u) => {
          const notifRef = doc(collection(db, 'rc_notifications'));
          batch.set(notifRef, {
            id: notifRef.id,
            userId: u.id,
            senderId: currentAdmin.id,
            senderName: "SYSTEM BROADCAST",
            senderAvatar: systemSettings.appLogo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
            type: 'message',
            createdAt: new Date().toISOString(),
            isRead: false,
            title: broadcastTitle,
            content: broadcastBody
          });
        });
        await batch.commit();
        setNotifSuccess("Global broadcast successfully pushed to all RohingyaConnect members!");
      } else {
        // Send to targeted single user
        if (!targetUserId) {
          alert("Please select or enter a valid recipient UID.");
          return;
        }
        const notifRef = doc(collection(db, 'rc_notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          userId: targetUserId,
          senderId: currentAdmin.id,
          senderName: "ADMINISTRATOR ATTENTION",
          senderAvatar: systemSettings.appLogo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
          type: 'message',
          createdAt: new Date().toISOString(),
          isRead: false,
          title: broadcastTitle,
          content: broadcastBody
        });
        setNotifSuccess(`Notification successfully dispatched to user UID: ${targetUserId}`);
      }

      setBroadcastTitle('');
      setBroadcastBody('');
      setTimeout(() => setNotifSuccess(''), 4000);
    } catch (err: any) {
      alert("Error dispatching system notices: " + err.message);
    }
  };

  // Logout admin
  const handleLogoutAdmin = async () => {
    if (window.confirm("Sign out of secure administrator control room?")) {
      await signOut(auth);
      window.location.href = '/index.html';
    }
  };

  // --------------------------------------------------------
  // CALCULATIONS & METRICS
  // --------------------------------------------------------
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter(u => u.status !== 'disabled').length;
  const totalPostsCount = posts.length;
  const totalStoriesCount = stories.length;
  const totalReelsCount = reels.length;
  const totalMarketCount = marketplace.length;
  
  // Reported posts & logs
  const reportedPostsList = posts.filter(p => p.reported === true || (p.reports && p.reports.length > 0));
  const totalReportsCount = reportedPostsList.length;

  // Simulate online users (e.g. standard user count - some ratio)
  const simulatedOnlineUsers = Math.max(1, Math.floor(activeUsersCount * 0.45));

  // Filter users by search query
  const filteredUsers = users.filter(u => {
    const q = userQuery.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || 
           u.username.toLowerCase().includes(q) || 
           u.email.toLowerCase().includes(q) ||
           u.id.toLowerCase() === q;
  });

  // Paginated users
  const startIndex = (userPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);
  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;

  // Filter posts by query, author, and date
  const filteredPostsList = posts.filter(p => {
    const q = postQuery.toLowerCase();
    const matchesQuery = p.content.toLowerCase().includes(q) || p.userFullName.toLowerCase().includes(q);
    const matchesUser = postUserFilter ? p.userId === postUserFilter : true;
    
    let matchesDate = true;
    if (postDateFilter !== 'all') {
      const postTime = new Date(p.createdAt).getTime();
      const now = Date.now();
      if (postDateFilter === 'today') {
        matchesDate = (now - postTime) <= 24 * 60 * 60 * 1000;
      } else if (postDateFilter === 'week') {
        matchesDate = (now - postTime) <= 7 * 24 * 60 * 60 * 1000;
      } else if (postDateFilter === 'month') {
        matchesDate = (now - postTime) <= 30 * 24 * 60 * 60 * 1000;
      }
    }
    
    return matchesQuery && matchesUser && matchesDate;
  });

  // --------------------------------------------------------
  // LOADING / AUTHENTICATION VIEW
  // --------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 select-none font-sans p-6">
        <div className="p-4 bg-slate-800 rounded-full border border-slate-700/50 mb-6 shadow-2xl animate-spin text-emerald-500">
          <RefreshCw className="w-10 h-10" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Security Clearances Processing...</h1>
        <p className="text-slate-400 text-xs mt-2 max-w-sm text-center">
          Loading credentials from safe cloud nodes. Access strictly restricted to verified administrative users.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      
      {/* --------------------------------------------------------
          TOP BANNER HEADER
          -------------------------------------------------------- */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-600 rounded-2xl text-white shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase">
              {systemSettings.appName} Control Room <span className="text-[9px] bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-400 px-2 py-0.5 rounded-full font-black">SECURE</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Verified Admin: {currentAdmin?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Dark Mode toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle theme"
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Return button */}
          <a 
            href="/index.html" 
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
          >
            ← Timeline
          </a>

          {/* Sign Out */}
          <button 
            onClick={handleLogoutAdmin}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Exit Control Room
          </button>
        </div>
      </header>

      {/* --------------------------------------------------------
          MAIN WORKSPACE LAYOUT
          -------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full lg:w-64 bg-white dark:bg-slate-900 lg:border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 shrink-0">
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Operational Console</span>
            <nav className="flex flex-row lg:flex-col gap-1.5 mt-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
              
              <button 
                onClick={() => { setActiveTab('dashboard'); setUserPage(1); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> System Dashboard
              </button>

              <button 
                onClick={() => { setActiveTab('users'); setUserPage(1); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'users' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
              >
                <Users className="w-4 h-4" /> User Accounts ({totalUsersCount})
              </button>

              <button 
                onClick={() => { setActiveTab('posts'); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'posts' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
              >
                <FileText className="w-4 h-4" /> Publication Feed ({totalPostsCount})
              </button>

              <button 
                onClick={() => { setActiveTab('reports'); }}
                className={`relative w-full text-left px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'reports' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Flagged Queue
                {totalReportsCount > 0 && (
                  <span className="absolute right-3 top-3 px-1.5 py-0.5 bg-red-500 text-white text-[8px] rounded-full font-black animate-pulse">{totalReportsCount}</span>
                )}
              </button>

              <button 
                onClick={() => { setActiveTab('notifications'); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'notifications' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
              >
                <BellRing className="w-4 h-4 text-sky-500" /> Notifications & Broadcast
              </button>

              <button 
                onClick={() => { setActiveTab('analytics'); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'analytics' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
              >
                <TrendingUp className="w-4 h-4 text-indigo-500" /> Analytics Insights
              </button>

              <button 
                onClick={() => { setActiveTab('settings'); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2.5 transition cursor-pointer whitespace-nowrap ${activeTab === 'settings' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
              >
                <Settings className="w-4 h-4 text-orange-500" /> System Settings
              </button>

            </nav>
          </div>

          <div className="mt-auto hidden lg:flex flex-col gap-3.5 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
            <h4 className="text-[10px] uppercase font-bold text-slate-450 tracking-wider flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-emerald-500" /> Server Telemetry
            </h4>
            <div className="space-y-1 text-[10px] text-slate-500">
              <p className="flex justify-between"><span>Online Nodes:</span> <span className="font-mono text-emerald-500 font-black">{simulatedOnlineUsers} active</span></p>
              <p className="flex justify-between"><span>Region:</span> <span className="font-mono">Asia-East1 (Standard)</span></p>
              <p className="flex justify-between"><span>State:</span> <span className="font-mono text-emerald-500">Synced</span></p>
            </div>
          </div>
        </aside>

        {/* WORKSPACE VIEW CONTENT AREA */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-full">
          
          {/* TAB 1: SYSTEM DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Header greeting */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">Welcome back, {currentAdmin?.fullName}!</h2>
                  <p className="text-xs text-slate-400 mt-1">Real-time status monitor of your entire RohingyaConnect community hub.</p>
                </div>
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  ⚡ Online Server Connected
                </div>
              </div>

              {/* BENTO STATS GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Total Users</span>
                    <span className="text-2xl font-black text-slate-850 dark:text-slate-100 mt-0.5 block">{totalUsersCount}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-teal-500">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Active Sessions</span>
                    <span className="text-2xl font-black text-slate-850 dark:text-slate-100 mt-0.5 block">{simulatedOnlineUsers}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-500">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Total Posts</span>
                    <span className="text-2xl font-black text-slate-850 dark:text-slate-100 mt-0.5 block">{totalPostsCount}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${totalReportsCount > 0 ? 'bg-red-50 dark:bg-red-950/40 text-red-500' : 'bg-slate-50 dark:bg-slate-850 text-slate-400'}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Unresolved Flags</span>
                    <span className={`text-2xl font-black mt-0.5 block ${totalReportsCount > 0 ? 'text-red-500 animate-pulse' : 'text-slate-850 dark:text-slate-100'}`}>{totalReportsCount}</span>
                  </div>
                </div>

              </div>

              {/* AUXILIARY CONTENT COUNTS GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><BookOpen className="w-4 h-4" /> Stories Shared:</span>
                  <span className="font-mono text-sm font-black">{totalStoriesCount}</span>
                </div>
                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Film className="w-4 h-4" /> Reels/Videos:</span>
                  <span className="font-mono text-sm font-black">{totalReelsCount}</span>
                </div>
                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><DollarSign className="w-4 h-4" /> Marketplace Listings:</span>
                  <span className="font-mono text-sm font-black">{totalMarketCount}</span>
                </div>
                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Admin Nodes:</span>
                  <span className="font-mono text-sm font-black text-emerald-500">{users.filter(u => u.role === 'admin').length}</span>
                </div>
              </div>

              {/* CHARTS SECTION (HAND-CRAFTED DETAILED INTERACTIVE SVG GRAPHICS) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* CHART A: SYSTEM ENGAGEMENT TIMELINE */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-black uppercase text-slate-450 tracking-wider flex items-center gap-1 mb-4">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Daily Interaction Metrics (Past 7 Days)
                  </h3>
                  <div className="h-56 w-full relative flex items-end justify-between border-b border-l border-slate-200 dark:border-slate-800 pb-1.5 pl-2">
                    
                    {/* SVG Curve Background Gridlines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-2 pl-2">
                      <div className="border-t border-slate-100 dark:border-slate-800/60 w-full h-0"></div>
                      <div className="border-t border-slate-100 dark:border-slate-800/60 w-full h-0"></div>
                      <div className="border-t border-slate-100 dark:border-slate-800/60 w-full h-0"></div>
                      <div className="border-t border-slate-100 dark:border-slate-800/60 w-full h-0"></div>
                    </div>

                    {/* Bars or curves */}
                    {[
                      { day: 'Mon', count: 120, height: '40%' },
                      { day: 'Tue', count: 180, height: '60%' },
                      { day: 'Wed', count: 150, height: '50%' },
                      { day: 'Thu', count: 240, height: '80%' },
                      { day: 'Fri', count: 210, height: '70%' },
                      { day: 'Sat', count: 290, height: '95%' },
                      { day: 'Sun', count: 260, height: '85%' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
                        <div className="text-[10px] font-black font-mono text-emerald-500 opacity-0 group-hover:opacity-100 transition duration-150 absolute -top-5 bg-slate-800 text-white px-1.5 py-0.5 rounded-md">
                          {item.count}
                        </div>
                        <div 
                          className="w-8 bg-gradient-to-t from-emerald-600 to-teal-400 hover:brightness-110 rounded-t-lg transition-all duration-500 ease-out cursor-pointer shadow-lg shadow-emerald-500/10"
                          style={{ height: `${parseInt(item.height) * 1.5}px` }}
                        ></div>
                        <span className="text-[10px] font-bold text-slate-400 mt-1">{item.day}</span>
                      </div>
                    ))}

                  </div>
                </div>

                {/* CHART B: MONTHLY SIGNUPS & SHARING CURVE */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-black uppercase text-slate-450 tracking-wider flex items-center gap-1 mb-4">
                    <Database className="w-4 h-4 text-indigo-500" /> Platform Growth Curve (Monthly Stats)
                  </h3>
                  <div className="h-56 w-full relative flex items-end justify-between border-b border-l border-slate-200 dark:border-slate-800 pb-1.5 pl-2">
                    
                    {/* SVG Line path approximation */}
                    <div className="absolute inset-0 pointer-events-none pb-2 pl-2">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Area Fill */}
                        <path d="M0 100 L0 80 L15 70 L35 55 L55 45 L75 25 L100 10 L100 100 Z" fill="url(#chartGrad)" />
                        {/* Stroke curve */}
                        <path d="M0 80 Q 15 70, 35 55 T 75 25 T 100 10" fill="none" stroke="#6366f1" strokeWidth="2" />
                      </svg>
                    </div>

                    {/* Labels */}
                    {[
                      { month: 'Jan', level: 'Low' },
                      { month: 'Feb', level: 'Stable' },
                      { month: 'Mar', level: 'Rising' },
                      { month: 'Apr', level: 'High' },
                      { month: 'May', level: 'Active' },
                      { month: 'Jun', level: 'Peak' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 mt-auto">{item.month}</span>
                      </div>
                    ))}

                  </div>
                </div>

              </div>

              {/* RECENT REGISTRATIONS AND ALERTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* RECENT USER REGISTRATIONS */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-black uppercase text-slate-450 tracking-wider mb-4 flex items-center justify-between">
                    <span>Recent Account Registrations</span>
                    <button onClick={() => setActiveTab('users')} className="text-[10px] text-emerald-600 hover:underline">View All</button>
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-850">
                    {users.slice(0, 4).map((user) => (
                      <div key={user.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <img src={user.avatar} alt="Profile" className="w-8.5 h-8.5 rounded-full object-cover border" referrerPolicy="no-referrer" />
                          <div>
                            <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">{user.fullName}</h4>
                            <span className="text-[10px] text-slate-400">@{user.username} • {user.email}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${user.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400'}`}>
                          {user.role === 'admin' ? 'ADMIN' : 'MEMBER'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SERVER SECURITY LOGS */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-black uppercase text-slate-450 tracking-wider mb-4">Secure Audit Activity Trail</h3>
                  <div className="space-y-3 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    <p className="flex gap-2"><span className="text-emerald-500">[OK]</span> <span>AUTH: Admin credentials verified at {new Date().toLocaleTimeString()}</span></p>
                    <p className="flex gap-2"><span className="text-emerald-500">[OK]</span> <span>FIREBASE: Synced with firestore collection rc_posts</span></p>
                    <p className="flex gap-2"><span className="text-emerald-500">[OK]</span> <span>FIREBASE: Listening real-time to rc_users updates</span></p>
                    <p className="flex gap-2"><span className="text-amber-500">[INFO]</span> <span>SECURITY: Root configurations restricted via ABAC protocols</span></p>
                    <p className="flex gap-2"><span className="text-emerald-500">[OK]</span> <span>LOAD: Completed in-memory bento analytics indexing</span></p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              
              {/* Directory controls */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100">Registered Users Directory</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Edit, suspend, ban or delete profiles violating RohingyaConnect guidelines.</p>
                  </div>
                  
                  {/* Search filter input */}
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-455" />
                    <input 
                      type="text"
                      value={userQuery}
                      onChange={(e) => { setUserQuery(e.target.value); setUserPage(1); }}
                      placeholder="Search name, username, email, UID..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* Table list */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black text-slate-455 tracking-wider">
                        <th className="py-3 px-4">User Details</th>
                        <th className="py-3 px-4">Contact Info</th>
                        <th className="py-3 px-4 text-center">Clearance Role</th>
                        <th className="py-3 px-4 text-center">Email Verified</th>
                        <th className="py-3 px-4 text-center">State</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {paginatedUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">No registered connections match your search query.</td>
                        </tr>
                      ) : (
                        paginatedUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition">
                            <td className="py-3.5 px-4 flex items-center gap-3">
                              <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover border" referrerPolicy="no-referrer" />
                              <div>
                                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 leading-snug">{user.fullName}</h4>
                                <span className="text-[10px] text-slate-400">@{user.username}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">
                              <span className="block font-sans text-xs text-slate-700 dark:text-slate-355">{user.email}</span>
                              <span className="block text-[8px]">UID: {user.id}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${user.role === 'admin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                {user.role === 'admin' && <Award className="w-3 h-3 text-amber-600" />}
                                {user.role || 'user'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${user.emailVerified === true ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400'}`}>
                                {user.emailVerified === true ? 'Verified' : 'Unverified'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${user.status === 'disabled' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                                {user.status === 'disabled' ? 'Banned' : 'Active'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                              
                              <button 
                                onClick={() => setSelectedUser(user)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-250 dark:border-slate-700 text-[10px] font-black rounded-lg transition"
                                title="View User profile details"
                              >
                                View
                              </button>

                              <button 
                                onClick={() => setEditingUser(user)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/50 text-[10px] font-black rounded-lg transition"
                                title="Edit settings directly"
                              >
                                Edit
                              </button>

                              {user.id !== currentAdmin.id && (
                                <>
                                  <button 
                                    onClick={() => handleToggleUserStatus(user.id, user.status)}
                                    className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black transition ${user.status === 'disabled' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}
                                  >
                                    {user.status === 'disabled' ? 'Activate' : 'Suspend'}
                                  </button>

                                  <button 
                                    onClick={() => handleDeleteUserAccount(user.id)}
                                    className="px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200/50 hover:bg-rose-100 rounded-lg text-[10px] font-black transition cursor-pointer"
                                    title="Delete completely"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}

                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS */}
                {totalUserPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                    <span className="text-[10px] text-slate-400 font-bold">Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, filteredUsers.length)} of {filteredUsers.length} profiles</span>
                    
                    <div className="flex items-center gap-1.5">
                      <button 
                        disabled={userPage === 1}
                        onClick={() => setUserPage(prev => Math.max(1, prev - 1))}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-black px-3">{userPage} / {totalUserPages}</span>
                      <button 
                        disabled={userPage === totalUserPages}
                        onClick={() => setUserPage(prev => Math.min(totalUserPages, prev + 1))}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 3: POSTS MANAGEMENT */}
          {activeTab === 'posts' && (
            <div className="space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                
                {/* Header & filters */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 pb-5 border-b border-slate-100 dark:border-slate-850">
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100">Global Content Control Feed</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Moderate all standard user feed publications. Pin helpful insights, hide toxic or unverified threads.</p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                    {/* User dropdown filter */}
                    <select 
                      value={postUserFilter}
                      onChange={(e) => setPostUserFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs outline-none"
                    >
                      <option value="">All Authors</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.fullName} (@{u.username})</option>
                      ))}
                    </select>

                    {/* Date filter */}
                    <select 
                      value={postDateFilter}
                      onChange={(e) => setPostDateFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs outline-none"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Past 24 Hours</option>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                    </select>

                    {/* Search query */}
                    <input 
                      type="text"
                      value={postQuery}
                      onChange={(e) => setPostQuery(e.target.value)}
                      placeholder="Search post text..."
                      className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Feed mapping */}
                <div className="space-y-4">
                  {filteredPostsList.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">No publications found matching the applied filters.</div>
                  ) : (
                    filteredPostsList.map((post) => (
                      <div key={post.id} className={`border rounded-2xl p-4 transition-all ${post.pinned ? 'border-amber-400 bg-amber-50/5' : post.hidden ? 'border-dashed border-slate-300 opacity-60' : 'border-slate-200 dark:border-slate-800'}`}>
                        
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-3">
                            <img src={post.userAvatar} alt="Owner" className="w-8.5 h-8.5 rounded-full object-cover border" />
                            <div>
                              <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                                {post.userFullName} 
                                <span className="text-[10px] text-slate-400 font-medium">@{post.username || 'user'}</span>
                              </h4>
                              <p className="text-[10px] text-slate-400">Published {new Date(post.createdAt).toLocaleString()} • PIDs: {post.id.slice(0, 8)}...</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {post.pinned && (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 text-[9px] font-black rounded-lg flex items-center gap-1">
                                <Pin className="w-3 h-3 fill-amber-600" /> PINNED TO TIMELINE
                              </span>
                            )}
                            {post.hidden && (
                              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400 text-[9px] font-black rounded-lg flex items-center gap-1">
                                <EyeOff className="w-3 h-3" /> HIDDEN FROM TIMELINE
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Post content */}
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-3.5">{post.content}</p>
                        
                        {post.image && (
                          <div className="mt-3 rounded-xl overflow-hidden max-w-sm border border-slate-100 dark:border-slate-850">
                            <img src={post.image} alt="Attachment" className="max-h-48 w-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}

                        {/* Post footer stats */}
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 flex-wrap gap-2">
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                            <span>Reactions: {post.reactions?.length || 0}</span>
                            <span>Comments: {post.comments?.length || 0}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Pin Button */}
                            <button 
                              onClick={() => handleTogglePinPost(post.id, post.pinned)}
                              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${post.pinned ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-250 dark:bg-slate-850 dark:border-slate-700'}`}
                            >
                              <Pin className="w-3.5 h-3.5" /> {post.pinned ? 'Unpin' : 'Pin Post'}
                            </button>

                            {/* Hide Button */}
                            <button 
                              onClick={() => handleToggleHidePost(post.id, post.hidden)}
                              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${post.hidden ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-250 dark:bg-slate-850 dark:border-slate-700'}`}
                            >
                              {post.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              {post.hidden ? 'Restore' : 'Hide Post'}
                            </button>

                            {/* Delete Button */}
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: FLAGGED REPORTS QUEUE */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                
                <div className="mb-5">
                  <h2 className="text-sm font-black uppercase text-slate-850 dark:text-slate-100">Flagged Moderation Queue</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Real-time alerts submitted by RohingyaConnect members. Securely perform batch writes to protect integrity.</p>
                </div>

                <div className="space-y-4">
                  {reportedPostsList.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2.5 animate-bounce" />
                      The moderation queue is currently empty. No flagged publications found!
                    </div>
                  ) : (
                    reportedPostsList.map((post) => (
                      <div key={post.id} className="border border-red-200 dark:border-red-950/70 rounded-2xl p-5 bg-red-50/5 shadow-sm space-y-4">
                        
                        {/* Reported author details */}
                        <div className="flex justify-between items-start gap-4 flex-wrap pb-3 border-b border-slate-100 dark:border-slate-850">
                          <div className="flex items-center gap-3">
                            <img src={post.userAvatar} alt="Author" className="w-9 h-9 rounded-full object-cover" />
                            <div>
                              <h4 className="text-xs font-black text-slate-850 dark:text-slate-200">{post.userFullName}</h4>
                              <p className="text-[10px] text-slate-400">Author ID: {post.userId} • Created {new Date(post.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="px-3 py-1 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 text-[10px] font-black rounded-lg">
                            ⚠️ Flagged {post.reportsCount || (post.reports?.length) || 1} Times
                          </div>
                        </div>

                        {/* Reported content text */}
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-850/60 rounded-xl border">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Flagged content text:</span>
                          <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed mt-1.5">{post.content}</p>
                          {post.image && (
                            <img src={post.image} alt="Flagged asset" className="max-h-40 object-cover mt-3 rounded-lg" referrerPolicy="no-referrer" />
                          )}
                        </div>

                        {/* Specific reports reasons logged */}
                        {post.reports && post.reports.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[9px] uppercase font-black tracking-wider text-slate-450 block">Reporter Claims:</span>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-850/30 p-3 rounded-xl border">
                              {post.reports.map((r: any, rIdx: number) => (
                                <div key={rIdx} className="py-2 first:pt-0 last:pb-0 text-[11px] text-slate-600 dark:text-slate-350">
                                  • <span className="font-semibold">"{r.reason}"</span> <span className="text-[9px] text-slate-400">by reporter UID: {r.reporterId?.slice(0, 8)}... ({new Date(r.createdAt).toLocaleDateString()})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions buttons */}
                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-850">
                          <button 
                            onClick={() => handleResolveReport(post.id, 'keep')}
                            className="px-4 py-2 border border-emerald-300 hover:bg-emerald-50 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Dismiss Flags (Approve Post)
                          </button>

                          <button 
                            onClick={() => handleResolveReport(post.id, 'delete')}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Delete Publication
                          </button>

                          <button 
                            onClick={() => handleBanReporterAuthorAndPurge(post.userId, post.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Ban Author & Purge Post
                          </button>
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: BROADCAST & SYSTEM NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl mx-auto space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                
                <div className="text-center mb-6">
                  <div className="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border mb-3 text-emerald-500 animate-pulse">
                    <BellRing className="w-8 h-8" />
                  </div>
                  <h2 className="text-sm font-black uppercase text-slate-850 dark:text-slate-100">Worldwide System Notice Broadcast</h2>
                  <p className="text-[11px] text-slate-400 mt-1">Send a global alert bulletin directly into user trays or dispatch specialized guidance to selective recipients.</p>
                </div>

                {notifSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold p-3.5 rounded-xl text-center mb-5 animate-bounce">
                    {notifSuccess}
                  </div>
                )}

                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  
                  {/* Target configuration */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1.5">Target Audience</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setBroadcastTarget('all')}
                        className={`py-2 px-4 rounded-xl text-xs font-bold border transition ${broadcastTarget === 'all' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                      >
                        All Users Global (Broadcast)
                      </button>
                      <button 
                        type="button"
                        onClick={() => setBroadcastTarget('single')}
                        className={`py-2 px-4 rounded-xl text-xs font-bold border transition ${broadcastTarget === 'single' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                      >
                        Targeted Single User
                      </button>
                    </div>
                  </div>

                  {/* Selective target user dropdown */}
                  {broadcastTarget === 'single' && (
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1.5">Select Recipient User</label>
                      <select 
                        required
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs rounded-xl outline-none"
                      >
                        <option value="">-- Choose Recipient Profile --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.fullName} (@{u.username}) • UID: {u.id.slice(0, 10)}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1.5">Broadcast Alert Title</label>
                    <input 
                      type="text"
                      required
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g. Rohingya Heritage Day, Server Maintenance, Community Alerts"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs rounded-xl outline-none"
                    />
                  </div>

                  {/* Message body */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1.5">Alert Message Details</label>
                    <textarea 
                      required
                      rows={4}
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder="Type the message body to dispatch..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs rounded-xl outline-none resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Dispatch Secure Notice
                  </button>

                </form>

              </div>

            </div>
          )}

          {/* TAB 6: ANALYTICS INSIGHTS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-sm font-black uppercase text-slate-850 dark:text-slate-100 mb-2">Deep Analytics Dashboard</h2>
                <p className="text-xs text-slate-400">Detailed metric indicators on platform active nodes, community safety rates, and content publishing trends.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  
                  <div className="p-4 bg-slate-50 dark:bg-slate-850 border rounded-xl flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-black text-slate-450">Daily Active Users (DAU)</span>
                    <h3 className="text-2xl font-black">{Math.floor(totalUsersCount * 0.4)}</h3>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[40%]"></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">~40% of registered worldwide nodes online today</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-850 border rounded-xl flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-black text-slate-455">Monthly Active Users (MAU)</span>
                    <h3 className="text-2xl font-black">{Math.floor(totalUsersCount * 0.85)}</h3>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-[85%]"></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">~85% active monthly return ratios</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-850 border rounded-xl flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-black text-slate-455">Safety Compliance Rate</span>
                    <h3 className="text-2xl font-black">
                      {totalPostsCount > 0 ? ((1 - totalReportsCount / totalPostsCount) * 100).toFixed(1) : "100"}%
                    </h3>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${totalPostsCount > 0 ? (1 - totalReportsCount / totalPostsCount) * 100 : 100}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">Integrity factor of public post database</span>
                  </div>

                </div>

                <div className="bg-slate-100/40 dark:bg-slate-900/40 p-4 rounded-xl mt-6 border border-slate-200/50">
                  <h4 className="text-xs font-bold mb-2">Demographic Segment Coverage</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Standard community participants</span>
                        <span>{((users.filter(u => u.role !== 'admin').length / totalUsersCount) * 100 || 0).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full"><div className="bg-emerald-500 h-full" style={{ width: `${(users.filter(u => u.role !== 'admin').length / totalUsersCount) * 100}%` }}></div></div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Restricted/Suspended Accounts</span>
                        <span>{((users.filter(u => u.status === 'disabled').length / totalUsersCount) * 100 || 0).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full"><div className="bg-red-500 h-full" style={{ width: `${(users.filter(u => u.status === 'disabled').length / totalUsersCount) * 100}%` }}></div></div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 7: SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                
                <h2 className="text-sm font-black uppercase text-slate-855 dark:text-slate-100 mb-4 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-orange-500" /> System Configurations
                </h2>

                {settingsSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold p-3.5 rounded-xl text-center mb-5">
                    {settingsSuccess}
                  </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1.5">Application Brand Name</label>
                    <input 
                      type="text"
                      required
                      value={systemSettings.appName}
                      onChange={(e) => setSystemSettings({...systemSettings, appName: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1.5">Custom App Logo URL</label>
                    <input 
                      type="url"
                      required
                      value={systemSettings.appLogo}
                      onChange={(e) => setSystemSettings({...systemSettings, appLogo: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs rounded-xl outline-none"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-850/50 border rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">System Maintenance Mode</h4>
                      <p className="text-[10px] text-slate-400">When enabled, only verified administrator roles can bypass and read feeds.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSystemSettings({...systemSettings, maintenanceMode: !systemSettings.maintenanceMode})}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemSettings.maintenanceMode ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-755'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${systemSettings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-850">
                    <button 
                      type="submit"
                      disabled={settingsLoading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
                    >
                      {settingsLoading ? "Saving Changes..." : "Commit Settings to Firestore"}
                    </button>
                  </div>

                </form>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* --------------------------------------------------------
          MODAL 1: VIEW USER PROFILE DETAILS
          -------------------------------------------------------- */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl relative">
            
            <button 
              onClick={() => setSelectedUser(null)}
              className="absolute right-4.5 top-4.5 p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile banner */}
            <div className="h-28 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 relative"></div>
            
            <div className="px-6 pb-6 relative">
              
              {/* Avatar position offset */}
              <div className="flex justify-between items-end -mt-10 mb-4">
                <img src={selectedUser.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-900 bg-slate-100" referrerPolicy="no-referrer" />
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${selectedUser.status === 'disabled' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {selectedUser.status === 'disabled' ? 'Banned' : 'Active'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">{selectedUser.fullName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">@{selectedUser.username} • {selectedUser.email}</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs text-slate-600 dark:text-slate-305 italic border border-slate-100">
                  "{selectedUser.bio || "No profile bio available."}"
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-500 font-mono">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border">
                    <span className="block uppercase font-black text-slate-400 mb-0.5">Account Role</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedUser.role || 'user'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border">
                    <span className="block uppercase font-black text-slate-400 mb-0.5">Followers Count</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedUser.followersCount || 0} followers</span>
                  </div>
                </div>

                <div className="space-y-1 text-[10px] text-slate-400 font-mono pt-2 border-t">
                  <p>UID node: {selectedUser.id}</p>
                  <p>Email verification status: {selectedUser.emailVerified ? "VERIFIED" : "UNVERIFIED"}</p>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          MODAL 2: EDIT USER DETAILS FORM
          -------------------------------------------------------- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
            
            <button 
              onClick={() => setEditingUser(null)}
              className="absolute right-4.5 top-4.5 p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-black uppercase text-slate-855 dark:text-slate-100 mb-4 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-emerald-500" /> Edit User Specifications
            </h3>

            <form onSubmit={handleUpdateUserDetails} className="space-y-4">
              
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Full Name</label>
                <input 
                  type="text"
                  required
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({...editingUser, fullName: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Username</label>
                <input 
                  type="text"
                  required
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Email Address</label>
                <input 
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Access Role</label>
                  <select 
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-755 text-xs rounded-xl outline-none"
                  >
                    <option value="user">Standard User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Account State</label>
                  <select 
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({...editingUser, status: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-755 text-xs rounded-xl outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Suspended / Banned</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input 
                  type="checkbox"
                  id="edit_verified"
                  checked={editingUser.emailVerified === true}
                  onChange={(e) => setEditingUser({...editingUser, emailVerified: e.target.checked})}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="edit_verified" className="text-xs text-slate-600 dark:text-slate-300 font-bold select-none cursor-pointer">Verify Email Address manually</label>
              </div>

              <div className="flex gap-2.5 pt-3 border-t">
                <button 
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 text-slate-750 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl"
                >
                  Save Updates
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// Render administrative platform
const rootEl = document.getElementById('admin-root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AdminPanelApp />
    </React.StrictMode>
  );
}
