import React, { useState, useEffect, useRef } from 'react';
import FullScreenImageViewer from './FullScreenImageViewer';
import { 
  Camera, Edit3, Image as ImageIcon, MapPin, Globe, Check, ArrowLeft, Pin, 
  Trash2, Heart, MessageSquare, Briefcase, GraduationCap, Cake, Home, 
  Plus, X, Save, Edit2, LayoutDashboard, FileText, Share2, Music, Video,
  Crop, Sparkles, Clock, Palette, MoreVertical, ShieldAlert, CheckCircle, Eye,
  Award, CheckSquare, Settings, Users, AlertTriangle, UserMinus, PlusCircle, MonitorPlay,
  MessageCircle, ThumbsUp, UserCheck, UserPlus, Flag, Ban, Edit, Link, Bookmark, Lock, BadgeCheck, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Post } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import CreatorDashboard from './CreatorDashboard';
import { getTranslation } from '../utils/i18n';
import { submitProfileReportToFirestore, blockUserInFirestore, getRealCommentsCount } from '../utils/firebaseSync';
import CommentIconWithCount from './CommentIconWithCount';
import { safeStorage } from '../utils/safeStorage';
import { VerifiedBadgeMenu } from './VerifiedBadgeMenu';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface ProfileProps {
  key?: string;
  currentUser: User;
  appLanguage?: string;
  viewingUserId: string;
  onViewProfile: (userId: string) => void;
  onUpdateProfile: (updatedUser: User) => any;
  posts: Post[];
  onDeletePost: (postId: string) => any;
  users: User[];
  onFollowToggle: (userId: string) => any;
  parentNavigate?: (path: string, params?: any) => void;
  onAddPost: (content: string, image?: string, videoUrl?: string, isVideo?: boolean, taggedUsers?: string[], isProfileUpdatePost?: boolean) => any;
  onStartChat: (userId: string) => void;
  onShareProfile?: (user: User) => void;
  onReactToPost?: (postId: string, reactionType: string) => void;
  onBack?: () => void;
}

export default function Profile({
  currentUser: propCurrentUser,
  appLanguage = 'en',
  viewingUserId,
  onViewProfile,
  onUpdateProfile,
  posts,
  onDeletePost,
  users,
  onFollowToggle,
  parentNavigate,
  onAddPost,
  onStartChat,
  onShareProfile,
  onReactToPost,
  onBack
}: ProfileProps) {
  
  // Custom public view simulator state
  const [isPublicViewActive, setIsPublicViewActive] = useState(false);

  // 1. State Setup using safeStorage
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = safeStorage.getItem('rc_current_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      } catch (e) {}
    }
    return propCurrentUser;
  });

  const [viewedUser, setViewedUser] = useState<User>(() => users.find(u => u.id === viewingUserId) || currentUser);

  useEffect(() => {
    setViewedUser(users.find(u => u.id === viewingUserId) || currentUser);
  }, [viewingUserId, users, currentUser]);

  const [following, setFollowing] = useState<string[]>(() => {
    const saved = safeStorage.getItem('rc_following');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return currentUser?.following || [];
  });

  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    const saved = safeStorage.getItem('rc_blocked');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const isFollowing = following.includes(viewedUser.id);
  const isBlocked = blockedUsers.includes(viewedUser.id);
  const [showShareBox, setShowShareBox] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Double tap heart animations state and tap refs
  const [heartAnimPosts, setHeartAnimPosts] = useState<Record<string, boolean>>({});
  const [sharedHeartAnimPosts, setSharedHeartAnimPosts] = useState<Record<string, boolean>>({});
  const lastProfileVideoTap = useRef<Record<string, number>>({});
  const profileVideoClickTimeout = useRef<Record<string, NodeJS.Timeout | null>>({});
  const lastProfileSharedVideoTap = useRef<Record<string, number>>({});
  const profileSharedVideoClickTimeout = useRef<Record<string, NodeJS.Timeout | null>>({});

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // navigate function simulator
  const navigate = (path: string) => {
    if (path.startsWith('/chat/')) {
      const chatId = path.replace('/chat/', '');
      onStartChat(chatId);
    } else if (path.startsWith('/report')) {
      setShowReportModal(true);
      setReportStep(1);
      setReportExplanation('');
    } else if (path === '/edit-profile') {
      setIsEditing(true);
    } else {
      showToast(`Navigating to ${path}`);
    }
  };

  // 2. Core Logic Functions
  const followUser = (userId: string) => {
    const newFollowing = [...following, userId];
    setFollowing(newFollowing);
    safeStorage.setJSON('rc_following', newFollowing);
    
    setViewedUser(prev => {
      let updatedFollowers: any = prev.followers;
      if (Array.isArray(prev.followers)) {
        if (!prev.followers.includes(currentUser.id)) {
          updatedFollowers = [...prev.followers, currentUser.id];
        }
      } else if (typeof prev.followers === 'number') {
        updatedFollowers = prev.followers + 1;
      } else {
        updatedFollowers = [currentUser.id];
      }
      return {
        ...prev,
        followers: updatedFollowers,
        followersCount: typeof prev.followersCount === 'number' ? prev.followersCount + 1 : 1
      };
    });
    
    showToast(`You are now following ${viewedUser.fullName || viewedUser.username || 'this user'}`);
    if (onFollowToggle) {
      onFollowToggle(userId);
    }
  };

  const unfollowUser = (userId: string) => {
    const newFollowing = following.filter((id: string) => id !== userId);
    setFollowing(newFollowing);
    safeStorage.setJSON('rc_following', newFollowing);
    
    setViewedUser(prev => {
      let updatedFollowers: any = prev.followers;
      if (Array.isArray(prev.followers)) {
        updatedFollowers = prev.followers.filter(id => id !== currentUser.id);
      } else if (typeof prev.followers === 'number') {
        updatedFollowers = Math.max(0, prev.followers - 1);
      } else {
        updatedFollowers = [];
      }
      return {
        ...prev,
        followers: updatedFollowers,
        followersCount: typeof prev.followersCount === 'number' ? Math.max(0, prev.followersCount - 1) : 0
      };
    });
    
    showToast(`Unfollowed ${viewedUser.fullName || viewedUser.username || 'this user'}`);
    if (onFollowToggle) {
      onFollowToggle(userId);
    }
  };

  const blockUser = (userId: string) => {
    const newBlocked = [...blockedUsers, userId];
    setBlockedUsers(newBlocked);
    safeStorage.setJSON('rc_blocked', newBlocked);
    if (isFollowing) {
      unfollowUser(userId);
    }
    showToast(`You have blocked ${viewedUser.fullName || viewedUser.username || 'this user'}`);
    setShowBlockModal(false);
  };

  const unblockUser = (userId: string) => {
    const newBlocked = blockedUsers.filter((id: string) => id !== userId);
    setBlockedUsers(newBlocked);
    safeStorage.setJSON('rc_blocked', newBlocked);
    showToast(`You have unblocked ${viewedUser.fullName || viewedUser.username || 'this user'}`);
  };

  // If public view simulator is active, force isOwnProfile to false to test visitor view!
  const isOwnProfile = isPublicViewActive ? false : (viewedUser.id === currentUser.id);

  const [profileTab, setProfileTab] = useState<'timeline' | 'connections'>('timeline');
  const [connectionsTab, setConnectionsTab] = useState<'followers' | 'following'>('followers');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'photos' | 'shared'>('all');

  // Header Stats Inline Tabs States
  const [showVideosTab, setShowVideosTab] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<'posts' | 'followers' | 'following' | 'videos'>('posts');

  // Multi-Step Moderation & Reporting States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStep, setReportStep] = useState<1 | 2 | 3>(1);
  const [reportReasonChain, setReportReasonChain] = useState<string[]>([]);
  const [reportExplanation, setReportExplanation] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Three-Stage Blocking States (Confirm -> Loading -> Success)
  const [blockModalStep, setBlockModalStep] = useState<1 | 2 | 3>(1);

  // Invite Dialog State
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteTargetUserId, setInviteTargetUserId] = useState('');

  // Tag Review States
  const [showTagReview, setShowTagReview] = useState(false);
  const [approvedPostIds, setApprovedPostIds] = useState<string[]>([]);
  const [rejectedPostIds, setRejectedPostIds] = useState<string[]>([]);

  // Advanced Create & URL States
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [createMediaType, setCreateMediaType] = useState<'photo' | 'video' | null>(null);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [localVideoInputFile, setLocalVideoInputFile] = useState<File | null>(null);

  // Banner cropping states
  const [bannerImageToCrop, setBannerImageToCrop] = useState<string | null>(null);
  const [isCroppingBanner, setIsCroppingBanner] = useState(false);

  // Interactive Touch drag / Pinch-to-Zoom gesture states
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState({ x: 0, y: 0 });
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);

  useEffect(() => {
    setProfileTab('timeline');
    setTimelineFilter('all');
    setActiveNavTab('posts');
  }, [viewingUserId]);

  const [isSaved, setIsSaved] = useState(false);
  const [showVerifiedBadgeMenu, setShowVerifiedBadgeMenu] = useState(false);
  useEffect(() => {
    if (viewedUser?.id) {
      const savedList = safeStorage.getJSON<any[]>('rc_saved_profiles', []);
      setIsSaved(savedList.includes(viewedUser.id));
    }
  }, [viewedUser?.id]);

  // Modal open states
  const [isEditing, setIsEditing] = useState(false); // Main profile edit dialog
  const [isCreatorDashboardOpen, setIsCreatorDashboardOpen] = useState(false); // Dashboard modal
  const [activePostMenuId, setActivePostMenuId] = useState<string | null>(null); // Post 3-dot menu
  const [showPrivacyModalForId, setShowPrivacyModalForId] = useState<string | null>(null);

  const handleUpdatePrivacy = async (postId: string, privacy: 'public' | 'followers' | 'close_friends' | 'only_me') => {
    await updateDoc(doc(db, 'rc_posts', postId), { privacy });
    setShowPrivacyModalForId(null);
  };
  const [showDeleteConfirmFor, setShowDeleteConfirmFor] = useState<string | null>(null);
  const [showRemoveTagConfirmFor, setShowRemoveTagConfirmFor] = useState<string | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false); // Create post modal

  // Create post form states
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [newPostVideo, setNewPostVideo] = useState('');

  // Inline details editing states
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [generalCity, setGeneralCity] = useState(currentUser.currentCity || "Dhaka");
  const [generalHome, setGeneralHome] = useState(currentUser.homeTown || "Cox's Bazar");
  const [generalBirthday, setGeneralBirthday] = useState(currentUser.birthday || "October 12, 1998");

  const [isEditingWork, setIsEditingWork] = useState(false);
  const [workVal, setWorkVal] = useState(currentUser.workExperience || "Volunteer at Kutupalong Learning Center");

  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [eduVal, setEduVal] = useState(currentUser.education || "Cox's Bazar Technical School");

  const [isEditingHobbies, setIsEditingHobbies] = useState(false);
  const [hobbiesVal, setHobbiesVal] = useState((currentUser.hobbies || ["Photography", "Football", "Painting", "Learning Languages"]).join(', '));

  // Deep meta-data state fields
  const [generalRelationship, setGeneralRelationship] = useState(currentUser.relationshipStatus || "Single");
  const [generalWebsite, setGeneralWebsite] = useState(currentUser.contactWebsite || "");
  const [generalEmail, setGeneralEmail] = useState(currentUser.contactEmail || "");
  const [generalMediaKit, setGeneralMediaKit] = useState(currentUser.contactMediaKit || "");
  const [profileCategory, setProfileCategory] = useState(currentUser.profileCategory || "Rohingya Advocate & Scholar");

  // Hyper-granular privacy settings states
  const [cityPrivacy, setCityPrivacy] = useState<'public' | 'friends' | 'only_me'>((currentUser.privacySettings as any)?.currentCity || 'public');
  const [homePrivacy, setHomePrivacy] = useState<'public' | 'friends' | 'only_me'>((currentUser.privacySettings as any)?.homeTown || 'public');
  const [birthdayPrivacy, setBirthdayPrivacy] = useState<'public' | 'friends' | 'only_me'>((currentUser.privacySettings as any)?.birthday || 'public');
  const [relationshipPrivacy, setRelationshipPrivacy] = useState<'public' | 'friends' | 'only_me'>((currentUser.privacySettings as any)?.relationshipStatus || 'public');
  const [websitePrivacy, setWebsitePrivacy] = useState<'public' | 'friends' | 'only_me'>((currentUser.privacySettings as any)?.contactWebsite || 'public');
  const [emailPrivacy, setEmailPrivacy] = useState<'public' | 'friends' | 'only_me'>((currentUser.privacySettings as any)?.contactEmail || 'public');
  const [mediaKitPrivacy, setMediaKitPrivacy] = useState<'public' | 'friends' | 'only_me'>((currentUser.privacySettings as any)?.contactMediaKit || 'public');

  // Input refs for file picking
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  // Cropping state parameters
  const [avatarImageToCrop, setAvatarImageToCrop] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState<number>(1);
  const [cropOffsetX, setCropOffsetX] = useState<number>(0);
  const [cropOffsetY, setCropOffsetY] = useState<number>(0);

  // Facebook profile picture wizard states
  const [profilePicCaption, setProfilePicCaption] = useState('');
  const [shareToFeed, setShareToFeed] = useState(true);
  const [selectedFrame, setSelectedFrame] = useState<'none' | 'gold' | 'emerald' | 'pride'>('none');
  const [selectedFilter, setSelectedFilter] = useState<'normal' | 'grayscale' | 'sepia' | 'cool' | 'warm'>('normal');
  const [showAdvancedCrop, setShowAdvancedCrop] = useState(false);
  const [temporaryDuration, setTemporaryDuration] = useState<'permanent' | '1hour' | '1day' | '1week'>('permanent');
  const [activeWizardSubmenu, setActiveWizardSubmenu] = useState<'restyle' | 'temporary' | 'frame' | null>(null);

  const [isEditingBannerOrAvatarModal, setIsEditingBannerOrAvatarModal] = useState(false);

  // Triple dot context drawer state
  const [isTripleDotOpen, setIsTripleDotOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit fields (standard dialog modal)
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [coverPhoto, setCoverPhoto] = useState(currentUser.coverPhoto);
  const [error, setError] = useState('');

  // Filter posts created by this user (including shares which have userId = viewedUser.id)
  const myPosts = posts.filter(p => p.userId === viewedUser.id || p.sharedBy === viewedUser.id);

  // Apply Timeline filters
  const filteredPosts = myPosts.filter(post => {
    if (timelineFilter === 'photos') {
      return !!(post.image || post.videoUrl || post.isVideo);
    }
    if (timelineFilter === 'shared') {
      return !!(post.sharedBy === viewedUser.id || post.sharedFromFullName);
    }
    return true; // 'all'
  });

  const handleSaveStandard = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !username.trim()) {
      setError('Name and username are required.');
      return;
    }

    if (username.includes(' ') || username.startsWith('@')) {
      setError('Username should not contain spaces or start with @.');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      avatar: avatar.trim(),
      coverPhoto: coverPhoto.trim()
    };

    onUpdateProfile(updatedUser);
    setIsEditing(false);
  };

  const startEditingGeneral = () => {
    setGeneralCity(currentUser.currentCity || "Dhaka");
    setGeneralHome(currentUser.homeTown || "Cox's Bazar");
    setGeneralBirthday(currentUser.birthday || "October 12, 1998");
    setGeneralRelationship(currentUser.relationshipStatus || "Single");
    setGeneralWebsite(currentUser.contactWebsite || "");
    setGeneralEmail(currentUser.contactEmail || "");
    setGeneralMediaKit(currentUser.contactMediaKit || "");
    
    const priv = (currentUser.privacySettings as any) || {};
    setCityPrivacy(priv.currentCity || 'public');
    setHomePrivacy(priv.homeTown || 'public');
    setBirthdayPrivacy(priv.birthday || 'public');
    setRelationshipPrivacy(priv.relationshipStatus || 'public');
    setWebsitePrivacy(priv.contactWebsite || 'public');
    setEmailPrivacy(priv.contactEmail || 'public');
    setMediaKitPrivacy(priv.contactMediaKit || 'public');
    
    setIsEditingGeneral(true);
  };

  const startEditingWork = () => {
    setWorkVal(currentUser.workExperience || "Volunteer at Kutupalong Learning Center");
    setIsEditingWork(true);
  };

  const startEditingEducation = () => {
    setEduVal(currentUser.education || "Cox's Bazar Technical School");
    setIsEditingEducation(true);
  };

  const startEditingHobbies = () => {
    setHobbiesVal((currentUser.hobbies || ["Photography", "Football", "Painting", "Learning Languages"]).join(', '));
    setIsEditingHobbies(true);
  };

  // Save General details
  const handleSaveGeneral = () => {
    const updatedUser = {
      ...currentUser,
      currentCity: generalCity.trim(),
      homeTown: generalHome.trim(),
      birthday: generalBirthday.trim(),
      relationshipStatus: generalRelationship.trim(),
      contactWebsite: generalWebsite.trim(),
      contactEmail: generalEmail.trim(),
      contactMediaKit: generalMediaKit.trim(),
      privacySettings: {
        ...((currentUser.privacySettings as any) || {}),
        currentCity: cityPrivacy,
        homeTown: homePrivacy,
        birthday: birthdayPrivacy,
        relationshipStatus: relationshipPrivacy,
        contactWebsite: websitePrivacy,
        contactEmail: emailPrivacy,
        contactMediaKit: mediaKitPrivacy
      }
    };
    onUpdateProfile(updatedUser);
    setIsEditingGeneral(false);
  };

  // Save Work status
  const handleSaveWork = () => {
    const updatedUser = {
      ...currentUser,
      workExperience: workVal.trim()
    };
    onUpdateProfile(updatedUser);
    setIsEditingWork(false);
  };

  // Save Education status
  const handleSaveEducation = () => {
    const updatedUser = {
      ...currentUser,
      education: eduVal.trim()
    };
    onUpdateProfile(updatedUser);
    setIsEditingEducation(false);
  };

  // Save Hobbies
  const handleSaveHobbies = () => {
    const list = hobbiesVal.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const updatedUser = {
      ...currentUser,
      hobbies: list
    };
    onUpdateProfile(updatedUser);
    setIsEditingHobbies(false);
  };

  // Handle publishing a post from profile
  const handlePublishPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !newPostImage.trim() && !newPostVideo.trim()) return;

    onAddPost(
      newPostContent,
      newPostImage.trim() ? newPostImage.trim() : undefined,
      newPostVideo.trim() ? newPostVideo.trim() : undefined,
      !!newPostVideo.trim()
    );

    setNewPostContent('');
    setNewPostImage('');
    setNewPostVideo('');
    setIsCreatePostOpen(false);
    alert("Post published successfully!");
  };

  // Helper to open standard modal
  const openStandardEdit = () => {
    setFullName(currentUser.fullName);
    setUsername(currentUser.username);
    setBio(currentUser.bio);
    setAvatar(currentUser.avatar);
    setCoverPhoto(currentUser.coverPhoto);
    setError('');
    setIsEditing(true);
  };

  // Followed list
  const followedUsers = users.filter(u => (viewedUser.following || []).includes(u.id));

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setBannerImageToCrop(base64String);
        setIsCroppingBanner(true);
        setCropScale(1);
        setCropOffsetX(0);
        setCropOffsetY(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmBannerCrop = () => {
    if (!bannerImageToCrop) return;
    const img = new Image();
    img.src = bannerImageToCrop;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const width = 800;
      const height = 300;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext?.('2d') || null;
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        
        ctx.save();
        
        // Apply filters to canvas context
        if (selectedFilter === 'grayscale') {
          ctx.filter = 'grayscale(100%)';
        } else if (selectedFilter === 'sepia') {
          ctx.filter = 'sepia(100%)';
        } else if (selectedFilter === 'cool') {
          ctx.filter = 'contrast(1.1) brightness(1.05) saturate(1.2) hue-rotate(30deg)';
        } else if (selectedFilter === 'warm') {
          ctx.filter = 'contrast(0.95) brightness(1.02) sepia(40%) saturate(1.4)';
        } else {
          ctx.filter = 'none';
        }

                // Calculate cover proportions (object-fit: cover logic)
        const imgAspect = img.width / img.height;
        const canvasAspect = width / height;
        let baseDrawWidth = width;
        let baseDrawHeight = height;
        
        if (imgAspect > canvasAspect) {
          // image is wider than canvas
          baseDrawHeight = height;
          baseDrawWidth = height * imgAspect;
        } else {
          // image is taller than canvas
          baseDrawWidth = width;
          baseDrawHeight = width / imgAspect;
        }
        
        const drawWidth = baseDrawWidth * cropScale;
        const drawHeight = baseDrawHeight * cropScale;
        const drawX = (width - drawWidth) / 2 + cropOffsetX;
        const drawY = (height - drawHeight) / 2 + cropOffsetY;
        
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        const croppedBase64 = canvas.toDataURL('image/jpeg');
        
        onUpdateProfile({
          ...currentUser,
          coverPhoto: croppedBase64
        });

        if (shareToFeed) {
          onAddPost(profilePicCaption.trim() || "Updated my cover photo banner", croppedBase64, undefined, false, undefined, true);
        }

        // Reset
        setBannerImageToCrop(null);
        setIsCroppingBanner(false);
        setCropScale(1);
        setCropOffsetX(0);
        setCropOffsetY(0);
        setProfilePicCaption('');
      }
    };
  };

  // Interactive Touch and Mouse Drag / Pinch-to-Zoom Gesture Engine
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      setTouchStartDist(dist);
    } else if (e.touches.length === 1) {
      setIsDraggingImage(true);
      setDragStartPoint({
        x: e.touches[0].clientX - cropOffsetX,
        y: e.touches[0].clientY - cropOffsetY
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / touchStartDist;
      setCropScale(prev => Math.min(Math.max(prev * ratio, 0.5), 4));
      setTouchStartDist(dist);
    } else if (e.touches.length === 1 && isDraggingImage) {
      const offsetX = e.touches[0].clientX - dragStartPoint.x;
      const offsetY = e.touches[0].clientY - dragStartPoint.y;
      setCropOffsetX(offsetX);
      setCropOffsetY(offsetY);
    }
  };

  const handleTouchEnd = () => {
    setIsDraggingImage(false);
    setTouchStartDist(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingImage(true);
    setDragStartPoint({
      x: e.clientX - cropOffsetX,
      y: e.clientY - cropOffsetY
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingImage) {
      const offsetX = e.clientX - dragStartPoint.x;
      const offsetY = e.clientY - dragStartPoint.y;
      setCropOffsetX(offsetX);
      setCropOffsetY(offsetY);
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDraggingImage(false);
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const simulatedUrl = URL.createObjectURL(file);
      setMediaUrlInput(simulatedUrl);
      setLocalVideoInputFile(file);
      setCreateMediaType('video');
      setShowCreateDropdown(false);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarImageToCrop(reader.result as string);
        setCropScale(1);
        setCropOffsetX(0);
        setCropOffsetY(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmCrop = () => {
    if (!avatarImageToCrop) return;
    const img = new Image();
    img.src = avatarImageToCrop;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext?.('2d') || null;
      if (ctx) {
        ctx.clearRect(0, 0, size, size);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();

        // Apply filters to canvas context
        if (selectedFilter === 'grayscale') {
          ctx.filter = 'grayscale(100%)';
        } else if (selectedFilter === 'sepia') {
          ctx.filter = 'sepia(100%)';
        } else if (selectedFilter === 'cool') {
          ctx.filter = 'contrast(1.1) brightness(1.05) saturate(1.2) hue-rotate(30deg)';
        } else if (selectedFilter === 'warm') {
          ctx.filter = 'contrast(0.95) brightness(1.02) sepia(40%) saturate(1.4)';
        } else {
          ctx.filter = 'none';
        }

        const drawWidth = size * cropScale;
        const drawHeight = size * cropScale;
        const drawX = (size - drawWidth) / 2 + cropOffsetX;
        const drawY = (size - drawHeight) / 2 + cropOffsetY;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        // Draw beautiful circular border frame
        if (selectedFrame !== 'none') {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
          if (selectedFrame === 'gold') {
            ctx.strokeStyle = '#D4AF37'; // gold
            ctx.lineWidth = 6;
          } else if (selectedFrame === 'emerald') {
            ctx.strokeStyle = '#10B981'; // emerald green
            ctx.lineWidth = 6;
          } else if (selectedFrame === 'pride') {
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#E11D48');
            gradient.addColorStop(0.25, '#F59E0B');
            gradient.addColorStop(0.5, '#10B981');
            gradient.addColorStop(0.75, '#3B82F6');
            gradient.addColorStop(1, '#8B5CF6');
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 6;
          }
          ctx.stroke();
        }
        
        const croppedBase64 = canvas.toDataURL('image/jpeg');
        
        // Update user profile picture
        onUpdateProfile({
          ...currentUser,
          avatar: croppedBase64
        });

        // Synced automatic timeline feed posting
        if (shareToFeed) {
          let finalCaption = profilePicCaption.trim();
          if (temporaryDuration !== 'permanent') {
            const tempLabel = temporaryDuration === '1hour' ? '1 hour' : temporaryDuration === '1day' ? '1 day' : '1 week';
            finalCaption = finalCaption 
              ? `${finalCaption} (Temporary for ${tempLabel})`
              : `Updated my profile picture (Temporary for ${tempLabel})`;
          } else if (!finalCaption) {
            finalCaption = "Updated my profile picture";
          }
          onAddPost(finalCaption, croppedBase64, undefined, false, undefined, true);
        }

        // Clean up wizard states
        setAvatarImageToCrop(null);
        setProfilePicCaption('');
        setShareToFeed(true);
        setSelectedFrame('none');
        setSelectedFilter('normal');
        setShowAdvancedCrop(false);
        setTemporaryDuration('permanent');
        setCropScale(1);
        setCropOffsetX(0);
        setCropOffsetY(0);
      }
    };
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 pb-20 select-none">
      
      {/* Hidden Native Device File Pickers */}
      <input 
        type="file" 
        ref={coverInputRef} 
        onChange={handleCoverFileChange} 
        accept="image/jpeg,image/png,image/webp" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={avatarInputRef} 
        onChange={handleAvatarFileChange} 
        accept="image/jpeg,image/png,image/webp" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={videoInputRef} 
        onChange={handleVideoFileChange} 
        accept="video/*" 
        className="hidden" 
      />

      {/* 1. NATIVE PROFILE HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200 mb-6">
        
        {/* Cover Photo Banner */}
        <div className="w-full aspect-[3/1] bg-slate-100 dark:bg-slate-950 relative group overflow-hidden">
            {viewedUser.coverPhoto ? (
              <img 
                // FIXED ERROR 2
                src={viewedUser.coverPhoto || "/default-avatar.png"} 
                onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                alt="Profile Cover Banner" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>

          {/* Professional Back Arrow in Facebook mobile style (top-left overlay) */}
          <button
            onClick={() => {
              if (onBack) {
                onBack();
              } else if (parentNavigate) {
                parentNavigate('/home');
              } else if (onViewProfile) {
                onViewProfile(currentUser.id);
              }
            }}
            id="profile-nav-back-button"
            className="absolute top-4 left-4 z-20 w-9 h-9 bg-black/40 hover:bg-black/60 active:scale-95 text-white rounded-full flex items-center justify-center transition shadow-md backdrop-blur-[2px] border border-white/15 cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          
          {/* Cover Edit Trigger Button overlay (Only for Owner) */}
          {isOwnProfile && (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-4 right-4 bg-black/65 hover:bg-black/85 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer backdrop-blur-xs shadow-md border border-white/10"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Edit Cover Image</span>
            </button>
          )}
        </div>

        {/* Profile details block */}
        <div className="px-5 pb-6 relative flex flex-col items-center text-center">
          
          {/* Overlapping circular avatar image with Camera Icon overlay */}
          <div className="relative -mt-16 sm:-mt-20 mb-3 z-10 group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-slate-900 overflow-hidden shadow-xl bg-slate-200">
              <img 
                // FIXED ERROR 2
                src={viewedUser.avatar || "/default-avatar.png"} 
                onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                alt={viewedUser.fullName} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Hover/Pencil camera overlay (Only for Owner) */}
            {isOwnProfile && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-1 right-1 bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-full shadow-lg border border-white dark:border-slate-900 transition cursor-pointer"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-w-md">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight flex items-center justify-center gap-1.5">
              <span>{viewedUser.fullName}</span>
              
              {/* Dynamic Blue Tick Verification Badge */}
              {(viewedUser.isVerified || (viewedUser.invitesCount || 0) >= 5) && (
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-verification-menu'))}
                  className="inline-block ml-1"
                >
                  <BlueVerifiedTick className="w-5 h-5" />
                </button>
              )}
            </h2>
            
            {/* Dynamic Profile Category Sub-label */}
            <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mt-1 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-100/50 dark:border-emerald-900/30 inline-block">
              {viewedUser.profileCategory || "Rohingya Advocate & Educator"}
            </p>
            
            <span className="text-xs text-slate-400 font-semibold tracking-wider block mt-1.5">@{viewedUser.username}</span>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 px-4 leading-relaxed font-normal italic">
              "{viewedUser.bio || "No bio added yet."}"
            </p>

            {/* Inline Bio Tags based on hobbies */}
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {(viewedUser.hobbies && viewedUser.hobbies.length > 0 ? viewedUser.hobbies : ["Community", "Heritage", "Unity"]).map((hobby, idx) => (
                <span 
                  key={idx} 
                  className="px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-850/80 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 transition"
                >
                  #{hobby.replace(/\s+/g, '')}
                </span>
              ))}
            </div>
          </div>

          {/* Followers/Following Stats line (Stats Navigation Actions) */}
          <div className="flex gap-4 sm:gap-6 mt-5 py-3 border-y border-slate-100 dark:border-slate-800/80 w-full max-w-lg justify-center select-none">
            {/* 1. Post Tab */}
            <div 
              id="tab-posts-nav"
              onClick={() => {
                setShowVideosTab(true);
                setActiveNavTab('posts');
                setProfileTab('timeline');
                const target = document.getElementById('profile-timeline-start');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`text-center cursor-pointer hover:opacity-80 transition group px-3 py-1 rounded-xl flex-1 max-w-[100px] ${activeNavTab === 'posts' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'border border-transparent'}`}
            >
              <span className={`text-sm sm:text-base font-black ${activeNavTab === 'posts' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {viewedUser.postsCount || 0}
              </span>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {getTranslation(appLanguage, 'posts')}
              </p>
            </div>

            {/* 2. Followers Tab */}
            <div 
              id="tab-followers-nav"
              onClick={() => {
                setActiveNavTab('followers');
                setProfileTab('connections');
                setConnectionsTab('followers');
              }}
              className={`text-center cursor-pointer hover:opacity-80 transition group px-3 py-1 rounded-xl flex-1 max-w-[100px] ${activeNavTab === 'followers' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'border border-transparent'}`}
            >
              <span className={`text-sm sm:text-base font-black ${activeNavTab === 'followers' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {viewedUser.followersCount || 0}
              </span>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {getTranslation(appLanguage, 'followers')}
              </p>
            </div>

            {/* 3. Following Tab */}
            <div 
              id="tab-following-nav"
              onClick={() => {
                setActiveNavTab('following');
                setProfileTab('connections');
                setConnectionsTab('following');
              }}
              className={`text-center cursor-pointer hover:opacity-80 transition group px-3 py-1 rounded-xl flex-1 max-w-[100px] ${activeNavTab === 'following' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'border border-transparent'}`}
            >
              <span className={`text-sm sm:text-base font-black ${activeNavTab === 'following' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {viewedUser.followingCount || 0}
              </span>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {getTranslation(appLanguage, 'following')}
              </p>
            </div>

            {/* 4. Videos Tab (Revealed when Post is clicked) */}
            {(showVideosTab || activeNavTab === 'videos') && (
              <div 
                id="tab-videos-nav"
                onClick={() => {
                  setActiveNavTab('videos');
                  setProfileTab('timeline');
                }}
                className={`text-center cursor-pointer hover:opacity-80 transition group px-3 py-1 rounded-xl flex-1 max-w-[100px] animate-fadeIn ${activeNavTab === 'videos' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'border border-transparent'}`}
              >
                <span className={`text-sm sm:text-base font-black ${activeNavTab === 'videos' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {myPosts.filter(p => p.videoUrl || p.isVideo).length}
                </span>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {getTranslation(appLanguage, 'videos')}
                </p>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS ROW */}
          <div className="flex gap-1.5 sm:gap-2 items-center relative w-full max-w-lg mt-5">
            {isOwnProfile ? (
              // OWNER GRID: Message, Dashboard, +Create, Edit, 3-dot Menu (5 inline buttons)
              <div className="flex-1 grid grid-cols-5 gap-1.5 sm:gap-2">
                <button
                  id="owner-message-btn"
                  onClick={() => onStartChat(currentUser.id)}
                  className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white py-2.5 px-0.5 rounded-2xl text-[10px] sm:text-xs font-black flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm transition transform active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="truncate">{getTranslation(appLanguage, 'message')}</span>
                </button>

                <button
                  id="owner-dashboard-btn"
                  onClick={() => setIsCreatorDashboardOpen(true)}
                  className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white py-2.5 px-0.5 rounded-2xl text-[10px] sm:text-xs font-black flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm transition transform active:scale-95 cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="truncate">{getTranslation(appLanguage, 'dashboard')}</span>
                </button>

                <button
                  id="owner-create-btn"
                  onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                  className={`py-2.5 px-0.5 rounded-2xl text-[10px] sm:text-xs font-black flex flex-col sm:flex-row items-center justify-center gap-1 transition transform active:scale-95 cursor-pointer border ${showCreateDropdown ? 'bg-[#1877F2] border-transparent text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="truncate">{getTranslation(appLanguage, 'create')}</span>
                </button>

                <button
                  id="owner-edit-btn"
                  onClick={() => setIsEditingBannerOrAvatarModal(true)}
                  className="bg-[#E4E6EB] hover:bg-[#E4E6EB]/90 text-[#050505] py-2.5 px-0.5 rounded-2xl text-[10px] sm:text-xs font-black flex flex-col sm:flex-row items-center justify-center gap-1 transition transform active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#050505]" />
                  <span className="truncate">{getTranslation(appLanguage, 'edit')}</span>
                </button>

                <button
                  id="owner-options-btn"
                  onClick={() => setIsTripleDotOpen(!isTripleDotOpen)}
                  className={`py-2.5 px-0.5 rounded-2xl text-[10px] sm:text-xs font-black flex flex-col sm:flex-row items-center justify-center gap-1 transition transform active:scale-95 cursor-pointer border ${isTripleDotOpen ? 'bg-slate-300 text-slate-900 border-transparent' : 'bg-slate-100 hover:bg-slate-200 text-slate-850 border-slate-200'}`}
                >
                  <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{getTranslation(appLanguage, 'more')}</span>
                </button>
              </div>
            ) : (
              // VISITOR GRID: [ Message ] [ Follow / Unfollow ] [ Options 3-dot ]
              <div className="flex-1 grid grid-cols-3 gap-2">
                <button
                  id="visitor-message-btn"
                  onClick={() => onStartChat(viewedUser.id)}
                  className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white py-2.5 rounded-2xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 shadow-sm transition transform active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="truncate">{getTranslation(appLanguage, 'message')}</span>
                </button>

                <button
                  id="visitor-follow-btn"
                  onClick={() => isFollowing ? unfollowUser(viewedUser.id) : followUser(viewedUser.id)}
                  className={`py-2.5 rounded-2xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 transition transform active:scale-95 cursor-pointer border ${
                    isFollowing
                      ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                      : "bg-[#1877F2] hover:bg-[#1877F2]/90 text-white border-transparent"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#1877F2] stroke-[3px]" />
                      <span className="truncate">{getTranslation(appLanguage, 'following')}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span className="truncate">{getTranslation(appLanguage, 'follow')}</span>
                    </>
                  )}
                </button>

                <button
                  id="visitor-options-btn"
                  onClick={() => setIsTripleDotOpen(!isTripleDotOpen)}
                  className={`py-2.5 rounded-2xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 transition transform active:scale-95 cursor-pointer border ${isTripleDotOpen ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white border-transparent' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-100 border-slate-200 dark:border-slate-700'}`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                  <span className="truncate">{getTranslation(appLanguage, 'more')}</span>
                </button>
              </div>
            )}

            {/* Facebook-style Bottom Sheet or Dialog */}
            <AnimatePresence>
              {isTripleDotOpen && (
                <>
                  {/* Backdrop overlay to dismiss */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-50 backdrop-blur-[1px]" 
                    onClick={() => setIsTripleDotOpen(false)} 
                  />
                  
                  {/* Responsive bottom sheet / modal container */}
                  <div className="fixed inset-0 z-55 flex items-end sm:items-center sm:justify-center p-0 sm:p-4 pointer-events-none">
                    <motion.div
                      initial={{ y: '100%', opacity: 0.5, scale: 0.95 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: '100%', opacity: 0.5, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      className="pointer-events-auto w-full sm:max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:p-6 shadow-2xl text-slate-800 dark:text-slate-100 flex flex-col"
                    >
                      {/* Drag handle visible only on mobile */}
                      <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5 sm:hidden" />
                      
                      <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {isOwnProfile ? 'Manage Profile' : `${viewedUser.fullName || 'User'}'s Options`}
                        </h3>
                        <button 
                          onClick={() => setIsTripleDotOpen(false)} 
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        {/* Copy Profile Link */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`https://rohconnect.app/u/${viewedUser.username || viewedUser.id}`); 
                            showToast('Profile link copied');
                            setIsTripleDotOpen(false);
                          }}
                          className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Link className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Copy Profile Link</span>
                        </button>

                        {/* Share Profile */}
                        <button
                          onClick={() => {
                            setIsTripleDotOpen(false);
                            if (onShareProfile) {
                              onShareProfile(viewedUser);
                            } else {
                              navigator.clipboard.writeText(`https://rohconnect.app/u/${viewedUser.username || viewedUser.id}`); 
                              showToast('Profile link copied to share');
                            }
                          }}
                          className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Share Profile</span>
                        </button>

                        {/* View As */}
                        <button
                          onClick={() => {
                            if (isOwnProfile) {
                              setIsPublicViewActive(!isPublicViewActive);
                              setIsTripleDotOpen(false);
                              showToast(isPublicViewActive ? "Switched to Owner view" : "Viewing profile as public visitor");
                            } else {
                              showToast("Viewing this profile as a visitor");
                              setIsTripleDotOpen(false);
                            }
                          }}
                          className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{isOwnProfile && isPublicViewActive ? "Exit View As" : "View As"}</span>
                        </button>

                        {/* Save Profile */}
                        <button
                          onClick={() => {
                            const savedList = safeStorage.getJSON<any[]>('rc_saved_profiles', []);
                            if (savedList.includes(viewedUser.id)) {
                              const updated = savedList.filter((id: string) => id !== viewedUser.id);
                              safeStorage.setJSON('rc_saved_profiles', updated);
                              setIsSaved(false);
                              showToast('Profile removed from saved list');
                            } else {
                              savedList.push(viewedUser.id);
                              safeStorage.setJSON('rc_saved_profiles', savedList);
                              setIsSaved(true);
                              showToast('Profile saved successfully');
                            }
                            setIsTripleDotOpen(false);
                          }}
                          className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Bookmark className={`w-4 h-4 shrink-0 ${isSaved ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'}`} />
                          <span>{isSaved ? "Saved Profile" : "Save Profile"}</span>
                        </button>

                        {/* Verified Badge */}
                        <button
                          onClick={() => {
                            setIsTripleDotOpen(false);
                            setShowVerifiedBadgeMenu(true);
                          }}
                          className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <BlueVerifiedTick className="w-4 h-4" />
                          <span>Verified Badge</span>
                        </button>

                        {/* Report Profile */}
                        <button
                          onClick={() => {
                            setShowReportModal(true);
                            setReportStep(1);
                            setReportExplanation('');
                            setIsTripleDotOpen(false);
                          }}
                          className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Flag className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Report Profile</span>
                        </button>

                        {/* Block User - only when viewing another user's profile */}
                        {!isOwnProfile && (
                          <button
                            onClick={() => {
                              setIsTripleDotOpen(false);
                              if (isBlocked) {
                                unblockUser(viewedUser.id);
                              } else {
                                setShowBlockModal(true);
                              }
                            }}
                            className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition text-red-500 dark:text-red-400 cursor-pointer"
                          >
                            <Ban className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                            <span>{isBlocked ? "Unblock User" : "Block User"}</span>
                          </button>
                        )}
                      </div>

                      {/* Cancel Option */}
                      <div className="border-t border-slate-100 dark:border-slate-800/60 mt-4 pt-3">
                        <button
                          onClick={() => setIsTripleDotOpen(false)}
                          className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-xl text-sm font-bold transition text-slate-700 dark:text-slate-200 text-center cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {isBlocked ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 py-16 px-4 text-center transition-colors duration-200 mt-6 shadow-sm">
          <Ban className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">This profile is unavailable</h4>
          <p className="text-xs text-slate-450 mt-1 max-w-sm mx-auto">You have blocked this user. To view their profile content and posts, you must first unblock them.</p>
        </div>
      ) : (
        <>
          {/* TIMELINE VS CONNECTIONS CONTROLLERS */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 bg-white dark:bg-slate-900 rounded-2xl p-1.5 gap-2 border shadow-xs transition-colors duration-200">
        <button
          onClick={() => setProfileTab('timeline')}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition ${profileTab === 'timeline' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
        >
          {isOwnProfile ? "My Timeline Feed" : `${viewedUser.fullName}'s Feed`} ({myPosts.length})
        </button>
        <button
          onClick={() => setProfileTab('connections')}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition ${profileTab === 'connections' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
        >
          {isOwnProfile ? "My Connections" : `${viewedUser.fullName}'s Connections`} ({(viewedUser.following || []).length})
        </button>
      </div>

      {profileTab === 'timeline' ? (
        /* TWO COLUMN TIMELINE GRID */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: EDITABLE PERSONAL DETAILS CARD BLOCKS (md:col-span-5) */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Block 1: Personal Details (Lives in, From, Birthday, Relationship, Contact fields) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative transition-colors duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Personal Details</h3>
                {isOwnProfile && !isEditingGeneral && (
                  <button 
                    onClick={startEditingGeneral}
                    className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer"
                    title="Edit Details"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditingGeneral ? (
                <div className="space-y-4">
                  {/* Current City */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase">Current City</label>
                      <select 
                        value={cityPrivacy}
                        onChange={(e) => setCityPrivacy(e.target.value as any)}
                        className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-0.5 text-slate-600 dark:text-slate-350 cursor-pointer outline-none"
                      >
                        <option value="public">🌐 Public</option>
                        <option value="friends">👥 Friends</option>
                        <option value="only_me">🔒 Only Me</option>
                      </select>
                    </div>
                    <input 
                      type="text" 
                      value={generalCity}
                      onChange={(e) => setGeneralCity(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="e.g. Dhaka"
                    />
                  </div>

                  {/* Home Town */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase">Home Town</label>
                      <select 
                        value={homePrivacy}
                        onChange={(e) => setHomePrivacy(e.target.value as any)}
                        className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-0.5 text-slate-600 dark:text-slate-350 cursor-pointer outline-none"
                      >
                        <option value="public">🌐 Public</option>
                        <option value="friends">👥 Friends</option>
                        <option value="only_me">🔒 Only Me</option>
                      </select>
                    </div>
                    <input 
                      type="text" 
                      value={generalHome}
                      onChange={(e) => setGeneralHome(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="e.g. Cox's Bazar"
                    />
                  </div>

                  {/* Birthday */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase">Birthday</label>
                      <select 
                        value={birthdayPrivacy}
                        onChange={(e) => setBirthdayPrivacy(e.target.value as any)}
                        className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-0.5 text-slate-600 dark:text-slate-350 cursor-pointer outline-none"
                      >
                        <option value="public">🌐 Public</option>
                        <option value="friends">👥 Friends</option>
                        <option value="only_me">🔒 Only Me</option>
                      </select>
                    </div>
                    <input 
                      type="text" 
                      value={generalBirthday}
                      onChange={(e) => setGeneralBirthday(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="e.g. October 12, 1998"
                    />
                  </div>

                  {/* Relationship Status */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase">Relationship Status</label>
                      <select 
                        value={relationshipPrivacy}
                        onChange={(e) => setRelationshipPrivacy(e.target.value as any)}
                        className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-0.5 text-slate-600 dark:text-slate-350 cursor-pointer outline-none"
                      >
                        <option value="public">🌐 Public</option>
                        <option value="friends">������ Friends</option>
                        <option value="only_me">🔒 Only Me</option>
                      </select>
                    </div>
                    <input 
                      type="text" 
                      value={generalRelationship}
                      onChange={(e) => setGeneralRelationship(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="e.g. Single, In a relationship"
                    />
                  </div>

                  {/* Contact Website */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase">Contact Website</label>
                      <select 
                        value={websitePrivacy}
                        onChange={(e) => setWebsitePrivacy(e.target.value as any)}
                        className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-0.5 text-slate-600 dark:text-slate-350 cursor-pointer outline-none"
                      >
                        <option value="public">🌐 Public</option>
                        <option value="friends">👥 Friends</option>
                        <option value="only_me">🔒 Only Me</option>
                      </select>
                    </div>
                    <input 
                      type="text" 
                      value={generalWebsite}
                      onChange={(e) => setGeneralWebsite(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="e.g. https://rashedconnect.org"
                    />
                  </div>

                  {/* Contact Email */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase">Contact Email</label>
                      <select 
                        value={emailPrivacy}
                        onChange={(e) => setEmailPrivacy(e.target.value as any)}
                        className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-0.5 text-slate-600 dark:text-slate-350 cursor-pointer outline-none"
                      >
                        <option value="public">🌐 Public</option>
                        <option value="friends">👥 Friends</option>
                        <option value="only_me">🔒 Only Me</option>
                      </select>
                    </div>
                    <input 
                      type="email" 
                      value={generalEmail}
                      onChange={(e) => setGeneralEmail(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="e.g. rashed@rohingyaconnect.com"
                    />
                  </div>

                  {/* Contact Media Kit */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase">Contact Media Kit (URL)</label>
                      <select 
                        value={mediaKitPrivacy}
                        onChange={(e) => setMediaKitPrivacy(e.target.value as any)}
                        className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-0.5 text-slate-600 dark:text-slate-350 cursor-pointer outline-none"
                      >
                        <option value="public">🌐 Public</option>
                        <option value="friends">👥 Friends</option>
                        <option value="only_me">🔒 Only Me</option>
                      </select>
                    </div>
                    <input 
                      type="text" 
                      value={generalMediaKit}
                      onChange={(e) => setGeneralMediaKit(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="e.g. https://drive.google.com/..."
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => setIsEditingGeneral(false)}
                      className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleSaveGeneral}
                      className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                  {/* Current City display */}
                  {((isOwnProfile || (viewedUser.privacySettings as any)?.currentCity !== 'only_me')) && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Lives in</p>
                        <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{viewedUser.currentCity || "Dhaka"}</p>
                      </div>
                      <span className="text-[10px]" title={`Privacy: ${(viewedUser.privacySettings as any)?.currentCity || 'public'}`}>
                        {(viewedUser.privacySettings as any)?.currentCity === 'only_me' ? '🔒' : (viewedUser.privacySettings as any)?.currentCity === 'friends' ? '👥' : '🌐'}
                      </span>
                    </div>
                  )}

                  {/* Home Town display */}
                  {((isOwnProfile || (viewedUser.privacySettings as any)?.homeTown !== 'only_me')) && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                        <Home className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">From</p>
                        <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{viewedUser.homeTown || "Cox's Bazar"}</p>
                      </div>
                      <span className="text-[10px]" title={`Privacy: ${(viewedUser.privacySettings as any)?.homeTown || 'public'}`}>
                        {(viewedUser.privacySettings as any)?.homeTown === 'only_me' ? '🔒' : (viewedUser.privacySettings as any)?.homeTown === 'friends' ? '👥' : '🌐'}
                      </span>
                    </div>
                  )}

                  {/* Birthday display */}
                  {((isOwnProfile || (viewedUser.privacySettings as any)?.birthday !== 'only_me')) && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20">
                        <Cake className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Birthday</p>
                        <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{viewedUser.birthday || "October 12, 1998"}</p>
                      </div>
                      <span className="text-[10px]" title={`Privacy: ${(viewedUser.privacySettings as any)?.birthday || 'public'}`}>
                        {(viewedUser.privacySettings as any)?.birthday === 'only_me' ? '🔒' : (viewedUser.privacySettings as any)?.birthday === 'friends' ? '👥' : '🌐'}
                      </span>
                    </div>
                  )}

                  {/* Relationship display */}
                  {((isOwnProfile || (viewedUser.privacySettings as any)?.relationshipStatus !== 'only_me')) && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20">
                        <Heart className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Relationship</p>
                        <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{viewedUser.relationshipStatus || "Single"}</p>
                      </div>
                      <span className="text-[10px]" title={`Privacy: ${(viewedUser.privacySettings as any)?.relationshipStatus || 'public'}`}>
                        {(viewedUser.privacySettings as any)?.relationshipStatus === 'only_me' ? '🔒' : (viewedUser.privacySettings as any)?.relationshipStatus === 'friends' ? '👥' : '🌐'}
                      </span>
                    </div>
                  )}

                  {/* Website display */}
                  {((isOwnProfile || (viewedUser.privacySettings as any)?.contactWebsite !== 'only_me')) && viewedUser.contactWebsite && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                        <Globe className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Website</p>
                        <a 
                          href={viewedUser.contactWebsite.startsWith('http') ? viewedUser.contactWebsite : `https://${viewedUser.contactWebsite}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline mt-0.5 block break-all"
                        >
                          {viewedUser.contactWebsite}
                        </a>
                      </div>
                      <span className="text-[10px]" title={`Privacy: ${(viewedUser.privacySettings as any)?.contactWebsite || 'public'}`}>
                        {(viewedUser.privacySettings as any)?.contactWebsite === 'only_me' ? '🔒' : (viewedUser.privacySettings as any)?.contactWebsite === 'friends' ? '👥' : '🌐'}
                      </span>
                    </div>
                  )}

                  {/* Email display */}
                  {((isOwnProfile || (viewedUser.privacySettings as any)?.contactEmail !== 'only_me')) && viewedUser.contactEmail && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/20">
                        <Edit2 className="w-4 h-4 text-teal-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Email</p>
                        <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 break-all">{viewedUser.contactEmail}</p>
                      </div>
                      <span className="text-[10px]" title={`Privacy: ${(viewedUser.privacySettings as any)?.contactEmail || 'public'}`}>
                        {(viewedUser.privacySettings as any)?.contactEmail === 'only_me' ? '🔒' : (viewedUser.privacySettings as any)?.contactEmail === 'friends' ? '👥' : '🌐'}
                      </span>
                    </div>
                  )}

                  {/* Media Kit display */}
                  {((isOwnProfile || (viewedUser.privacySettings as any)?.contactMediaKit !== 'only_me')) && viewedUser.contactMediaKit && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                        <FileText className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Media Kit</p>
                        <a 
                          href={viewedUser.contactMediaKit.startsWith('http') ? viewedUser.contactMediaKit : `https://${viewedUser.contactMediaKit}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5 block break-all"
                        >
                          View Creator Media Kit
                        </a>
                      </div>
                      <span className="text-[10px]" title={`Privacy: ${(viewedUser.privacySettings as any)?.contactMediaKit || 'public'}`}>
                        {(viewedUser.privacySettings as any)?.contactMediaKit === 'only_me' ? '🔒' : (viewedUser.privacySettings as any)?.contactMediaKit === 'friends' ? '👥' : '🌐'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Block 2: Work block */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative transition-colors duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Work Experience</h3>
                {isOwnProfile && !isEditingWork && (
                  <button 
                    onClick={startEditingWork}
                    className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer"
                    title="Edit Work"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditingWork ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Work Status</label>
                    <textarea 
                      rows={2}
                      value={workVal}
                      onChange={(e) => setWorkVal(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 resize-none dark:text-white"
                      placeholder="e.g. Volunteer / Teacher"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsEditingWork(false)}
                      className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleSaveWork}
                      className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/20 shrink-0">
                    <Briefcase className="w-4 h-4 text-teal-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500">Current Work Experience:</p>
                    <p className="font-extrabold text-slate-800 dark:text-slate-150 mt-1">{viewedUser.workExperience || "Volunteer at Kutupalong Learning Center"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Block 3: Education block */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative transition-colors duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Education</h3>
                {isOwnProfile && !isEditingEducation && (
                  <button 
                    onClick={startEditingEducation}
                    className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer"
                    title="Edit Education"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditingEducation ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Education Institute</label>
                    <input 
                      type="text" 
                      value={eduVal}
                      onChange={(e) => setEduVal(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="e.g. Cox's Bazar Technical School"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsEditingEducation(false)}
                      className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleSaveEducation}
                      className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 shrink-0">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500">Education Background:</p>
                    <p className="font-extrabold text-slate-800 dark:text-slate-150 mt-1">{viewedUser.education || "Cox's Bazar Technical School"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Block 4: Hobbies block */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative transition-colors duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Hobbies</h3>
                {isOwnProfile && !isEditingHobbies && (
                  <button 
                    onClick={startEditingHobbies}
                    className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer"
                    title="Edit Hobbies"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditingHobbies ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Hobbies (comma-separated list)</label>
                    <input 
                      type="text" 
                      value={hobbiesVal}
                      onChange={(e) => setHobbiesVal(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 dark:text-white"
                      placeholder="e.g. Photography, Football, Painting"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsEditingHobbies(false)}
                      className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleSaveHobbies}
                      className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-[11px] text-slate-400 block font-medium">Interests and activities:</span>
                  <div className="flex flex-wrap gap-2">
                    {(viewedUser.hobbies || ["Photography", "Football", "Painting", "Learning Languages"]).map((hobby, idx) => (
                      <span 
                        key={idx} 
                        className="px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-850/80 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800"
                      >
                        🎨 {hobby}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: ACTION PANEL & TIMELINE FEED (md:col-span-7) */}
          <div className="md:col-span-7 space-y-6">

            {/* SMOOTH SCROLLING TIMELINE TARGET */}
            <div id="profile-timeline-start" />

            {/* TIMELINE TAB SUB-FILTERS ROW matching image 1000189890.jpg */}
            <div className="flex bg-white dark:bg-slate-900 rounded-3xl p-1.5 border border-slate-200 dark:border-slate-800 shadow-sm gap-2 justify-between transition-colors duration-200">
              <button
                onClick={() => setTimelineFilter('all')}
                className={`flex-1 text-center py-2 text-xs font-extrabold rounded-xl transition ${timelineFilter === 'all' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
              >
                All
              </button>
              <button
                onClick={() => setTimelineFilter('photos')}
                className={`flex-1 text-center py-2 text-xs font-extrabold rounded-xl transition ${timelineFilter === 'photos' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
              >
                Post / Media
              </button>
              <button
                onClick={() => setTimelineFilter('shared')}
                className={`flex-1 text-center py-2 text-xs font-extrabold rounded-xl transition ${timelineFilter === 'shared' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
              >
                Shared
              </button>
            </div>

            {/* TIMELINE LIST */}
            <div className="space-y-5">
              {filteredPosts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 py-16 px-4 text-center transition-colors duration-200">
                  <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2.5" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No profile items found</h4>
                  <p className="text-[11px] text-slate-450 mt-1">There are no posts matching the current sub-filter `{timelineFilter}`.</p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <div 
                    key={post.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition duration-200"
                  >
                    
                    {/* Shared origin banner if applicable */}
                    {(post.sharedFromFullName || post.sharedBy) && (
                      <div className="flex items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-850 mb-3.5 text-[10px] text-emerald-600 dark:text-emerald-450 font-extrabold tracking-wide">
                        <Share2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Shared from {post.sharedFromFullName || "another creator"}'s timeline</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-3.5">
                      <div className="flex items-center gap-3">
                        <img 
                          // FIXED ERROR 2
                          src={post.userAvatar || "/default-avatar.png"} 
                          onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                          alt="Profile Avatar" 
                          className="w-9 h-9 rounded-full object-cover border border-slate-100 dark:border-slate-800 cursor-pointer hover:opacity-85 transition" 
                          referrerPolicy="no-referrer"
                          onClick={() => onViewProfile && onViewProfile(post.userId)}
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 
                              className="text-xs font-extrabold text-slate-800 dark:text-slate-100 cursor-pointer hover:underline transition flex items-center gap-1"
                              onClick={() => onViewProfile && onViewProfile(post.userId)}
                            >
                              {post.userFullName}
                              {users.find(u => u.id === post.userId)?.isVerified && <BlueVerifiedTick className="w-3.5 h-3.5" />}
                            </h4>
                            {post.isProfileUpdatePost && (
                              <span className="text-[10px] text-slate-500 font-semibold dark:text-slate-400">
                                updated their profile picture.
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[9px] text-slate-400 font-semibold">{new Date(post.createdAt).toLocaleDateString()}</span>
                            {post.pinned && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const isOwner = !!(
                                    currentUser &&
                                    (
                                      (currentUser.uid && currentUser.uid === post.userId) ||
                                      (currentUser.id && currentUser.id === post.userId) ||
                                      (currentUser.uid && currentUser.uid === post.ownerId) ||
                                      (currentUser.id && currentUser.id === post.ownerId)
                                    )
                                  );
                                  if (isOwner) {
                                    try {
                                      await updateDoc(doc(db, 'rc_posts', post.id), {
                                        pinned: false,
                                        pinnedAt: null
                                      });
                                    } catch (err) {
                                      console.error("Error unpinning post:", err);
                                    }
                                  }
                                }}
                                className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full transition ${
                                  currentUser &&
                                  (
                                    (currentUser.uid && currentUser.uid === post.userId) ||
                                    (currentUser.id && currentUser.id === post.userId) ||
                                    (currentUser.uid && currentUser.uid === post.ownerId) ||
                                    (currentUser.id && currentUser.id === post.ownerId)
                                  )
                                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 cursor-pointer'
                                    : 'bg-neutral-50 text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400 cursor-default'
                                }`}
                                title={
                                  currentUser &&
                                  (
                                    (currentUser.uid && currentUser.uid === post.userId) ||
                                    (currentUser.id && currentUser.id === post.userId) ||
                                    (currentUser.uid && currentUser.uid === post.ownerId) ||
                                    (currentUser.id && currentUser.id === post.ownerId)
                                  )
                                    ? 'Click to unpin'
                                    : 'Pinned Post'
                                }
                              >
                                <Pin size={8} className="fill-current rotate-[45deg]" />
                                <span>Pinned</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePostMenuId(post.id);
                        }}
                        className="p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-250 mb-3.5 leading-relaxed whitespace-pre-line">{post.content}</p>

                    {/* Shared Post Embedding for Profile */}
                    {(post.originalPostId || post.sharedFromPostId) && posts && (
                      (() => {
                        const originalPostId = post.originalPostId || post.sharedFromPostId;
                        const originalPost = posts.find(p => p.id === originalPostId);
                        
                        let canViewOriginal = false;
                        if (originalPost) {
                          canViewOriginal = true;
                          if (originalPost.userId !== currentUser.id) {
                            if (originalPost.privacy === 'only_me') {
                              canViewOriginal = false;
                            } else if (originalPost.privacy === 'followers') {
                              if (!currentUser?.following?.includes(originalPost.userId)) {
                                canViewOriginal = false;
                              }
                            } else if (originalPost.privacy === 'close_friends') {
                              if (!currentUser?.following?.includes(originalPost.userId)) {
                                canViewOriginal = false; // Simplified friends check
                              }
                            }
                          }
                        }
                        
                        if (originalPost && canViewOriginal) {
                          return (
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-3 mb-3 bg-slate-50 dark:bg-slate-950/50">
                              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                                <img 
                                  // FIXED ERROR 2
                                  src={originalPost.userAvatar || "/default-avatar.png"} 
                                  onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                                  className="w-8 h-8 rounded-full object-cover" 
                                  alt="Original Author" 
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                                    {originalPost.userFullName}
                                    {originalPost.isVerifiedCreator && <BlueVerifiedTick className="w-3.5 h-3.5" />}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-medium">{new Date(originalPost.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              {originalPost.content && (
                                <div className="p-3 pb-2 text-sm text-slate-700 dark:text-slate-300">
                                  <p className="whitespace-pre-line">{originalPost.content}</p>
                                </div>
                              )}
                              
                              {/* Media embedding */}
                              {originalPost.isVideo ? (
                                <div 
                                  className="w-full relative bg-slate-950 flex items-center justify-center cursor-pointer group mx-auto" 
                                  style={{ aspectRatio: '9/16', maxHeight: '500px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const now = Date.now();
                                    const DOUBLE_PRESS_DELAY = 300;
                                    const lastTap = lastProfileSharedVideoTap.current[post.id] || 0;
                                    if (now - lastTap < DOUBLE_PRESS_DELAY) {
                                      if (profileSharedVideoClickTimeout.current[post.id]) {
                                        clearTimeout(profileSharedVideoClickTimeout.current[post.id]!);
                                        profileSharedVideoClickTimeout.current[post.id] = null;
                                      }
                                      // Like original post!
                                      if (onReactToPost) {
                                        onReactToPost(originalPost.id, 'like');
                                      }
                                      setSharedHeartAnimPosts(prev => ({ ...prev, [post.id]: true }));
                                      setTimeout(() => setSharedHeartAnimPosts(prev => ({ ...prev, [post.id]: false })), 800);
                                    } else {
                                      lastProfileSharedVideoTap.current[post.id] = now;
                                      // There is no dedicated player overlay inside profile view other than default play or full screen,
                                      // so we can just let standard tap toggle the video play/pause or controls. Since originalPost.video has controls,
                                      // we can just wait or do nothing here.
                                    }
                                  }}
                                >
                                  <video 
                                    src={originalPost.videoUrl} 
                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                    muted
                                    playsInline
                                    preload="metadata"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-90 group-hover:opacity-100 group-hover:bg-black/40 transition duration-200">
                                    <div className="p-3 bg-emerald-600/90 text-white rounded-full shadow-lg transform group-hover:scale-110 transition duration-200">
                                      <Play className="w-5 h-5 fill-white text-white" />
                                    </div>
                                  </div>

                                  {/* Floating heart overlay */}
                                  <AnimatePresence>
                                    {sharedHeartAnimPosts[post.id] && (
                                      <motion.div
                                        initial={{ scale: 0.3, opacity: 0 }}
                                        animate={{ scale: [0.3, 1.2, 1.0], opacity: [0, 1, 1] }}
                                        exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.2 } }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                                      >
                                        <div className="bg-white/20 backdrop-blur-xs p-6 rounded-full shadow-2xl">
                                          <ThumbsUp className="w-16 h-16 text-rose-500 fill-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ) : (
                                (originalPost.image) ? (
                                  <FullScreenImageViewer imageUrl={originalPost.image || ''} userAvatar={originalPost.userAvatar || ''} userFullName={originalPost.userFullName || ''} timestamp={originalPost.createdAt}>
                                    <img 
                                      // FIXED ERROR 2
                                      src={originalPost.image || "/default-avatar.png"} 
                                      onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                                      className="w-full object-cover max-h-96 border-t border-slate-200 dark:border-slate-800 cursor-pointer" 
                                      alt="Original Attachment" 
                                    />
                                  </FullScreenImageViewer>
                                ) : null
                              )}
                            </div>
                          );
                        } else {
                          return (
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-900 mt-3 mb-3">
                              <p className="text-xs text-slate-500 font-bold">This content isn't available right now</p>
                              <p className="text-[10px] text-slate-400 mt-1">When this happens, it's usually because the owner only shared it with a small group of people, changed who can see it or it's been deleted.</p>
                            </div>
                          );
                        }
                      })()
                    )}
                    
                    {post.image && (
                      <div className="w-full max-h-80 overflow-hidden rounded-2xl border bg-slate-50 dark:bg-slate-950/40 mb-3.5 border-slate-100 dark:border-slate-850">
                        <FullScreenImageViewer imageUrl={post.image || ''} userAvatar={post.userAvatar} userFullName={post.userFullName} timestamp={post.createdAt}>
                          <img 
                            // FIXED ERROR 2
                            src={post.image || "/default-avatar.png"} 
                            onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                            alt="Attachment preview" 
                            className="w-full h-full object-cover cursor-pointer" 
                            referrerPolicy="no-referrer" 
                          />
                        </FullScreenImageViewer>
                      </div>
                    )}

                    {post.isVideo && post.videoUrl && (
                      <div 
                        className="w-full aspect-[9/16] max-h-[500px] mx-auto rounded-2xl overflow-hidden bg-black mb-3.5 border border-slate-150 dark:border-slate-800 flex items-center justify-center relative cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          const now = Date.now();
                          const DOUBLE_PRESS_DELAY = 300;
                          const lastTap = lastProfileVideoTap.current[post.id] || 0;
                          const hasLikedPost = post.reactions?.some((r: any) => r.userId === currentUser.id);
                          if (now - lastTap < DOUBLE_PRESS_DELAY) {
                            if (profileVideoClickTimeout.current[post.id]) {
                              clearTimeout(profileVideoClickTimeout.current[post.id]!);
                              profileVideoClickTimeout.current[post.id] = null;
                            }
                            if (onReactToPost && !hasLikedPost) {
                              onReactToPost(post.id, 'like');
                            }
                            setHeartAnimPosts(prev => ({ ...prev, [post.id]: true }));
                            setTimeout(() => setHeartAnimPosts(prev => ({ ...prev, [post.id]: false })), 800);
                          } else {
                            lastProfileVideoTap.current[post.id] = now;
                          }
                        }}
                      >
                        <video 
                          src={post.videoUrl} 
                          controls 
                          className="w-full h-full object-contain" 
                          onError={(e) => {
                            (e.currentTarget as HTMLVideoElement).style.display = 'none';
                            const parent = (e.currentTarget as HTMLVideoElement).parentElement;
                            if (parent) {
                              let errEl = parent.querySelector('.video-error-text');
                              if (!errEl) {
                                errEl = document.createElement('div');
                                errEl.className = 'video-error-text p-4 text-center text-xs text-slate-400 bg-slate-900 flex flex-col items-center justify-center gap-1 w-full h-full min-h-[120px]';
                                errEl.innerHTML = '<span class="text-xs font-semibold text-slate-200">Video Unavailable</span><span class="text-[10px] text-slate-500">The video stream source could not be loaded</span>';
                                parent.appendChild(errEl);
                              }
                            }
                          }}
                        />

                        {/* Floating heart overlay */}
                        <AnimatePresence>
                          {heartAnimPosts[post.id] && (
                            <motion.div
                              initial={{ scale: 0.3, opacity: 0 }}
                              animate={{ scale: [0.3, 1.2, 1.0], opacity: [0, 1, 1] }}
                              exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.2 } }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                            >
                              <div className="bg-white/20 backdrop-blur-xs p-6 rounded-full shadow-2xl">
                                <ThumbsUp className="w-16 h-16 text-rose-500 fill-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Likes & Comments stats bottom */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-2.5 border-t border-slate-100 dark:border-slate-850">
                      <span className="flex items-center gap-1"><ThumbsUp size={14} className="fill-[#1877F2] text-[#1877F2] mr-0.5" /> {post.reactions?.length || 0} Likes</span>
                      <span>{getRealCommentsCount(post)} comments</span>
                    </div>

                    {/* Interactive Action Buttons - Facebook style */}
                    <div className="flex justify-around items-center border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-2.5 text-slate-700 dark:text-slate-300">
                      {(() => {
                        const hasLikedPost = post.reactions?.some((r: any) => r.userId === currentUser.id);
                        return (
                          <button 
                            onClick={() => {
                              if (onReactToPost) {
                                onReactToPost(post.id, hasLikedPost ? 'unlike' : 'like');
                              }
                            }}
                            className={`flex items-center justify-center gap-1.5 py-2 flex-1 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg text-sm !font-bold transition active:scale-95 cursor-pointer ${
                              hasLikedPost ? 'text-[#1877F2]' : '!text-slate-900 dark:!text-slate-100'
                            }`}
                          >
                            <ThumbsUp className={`w-4.5 h-4.5 ${hasLikedPost ? 'text-[#1877F2] fill-[#1877F2]' : '!text-slate-900 dark:!text-slate-100'}`} />
                            <span className="!font-bold text-[14px]">Like</span>
                          </button>
                        );
                      })()}
                      <button 
                        onClick={() => alert("Comments")}
                        className="flex items-center justify-center gap-1.5 py-2 flex-1 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg text-sm !font-bold transition active:scale-95 cursor-pointer !text-slate-900 dark:!text-slate-100"
                      >
                        <CommentIconWithCount count={getRealCommentsCount(post)} size={18} className="!text-slate-900 dark:!text-slate-100" />
                        <span className="!font-bold text-[14px] !text-slate-900 dark:!text-slate-100">Comment</span>
                      </button>
                      <button 
                        onClick={() => alert("Share post")}
                        className="flex items-center justify-center gap-1.5 py-2 flex-1 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg text-sm !font-bold transition active:scale-95 cursor-pointer !text-slate-900 dark:!text-slate-100"
                      >
                        <Share2 className="w-4.5 h-4.5 !text-slate-900 dark:!text-slate-100" />
                        <span className="!font-bold text-[14px] !text-slate-900 dark:!text-slate-100">Share</span>
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>

        </div>
      ) : (
        /* 2. MY CONNECTIONS VIEW (Followers/Following) with interactive segment selection */
        <div className="space-y-4">
          <div className="flex bg-white dark:bg-slate-900 rounded-2xl p-1 border border-slate-200 dark:border-slate-800 shadow-sm gap-2 transition-colors duration-200">
            <button
              onClick={() => setConnectionsTab('followers')}
              className={`flex-1 text-center py-2 text-xs font-extrabold rounded-xl transition ${connectionsTab === 'followers' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
            >
              Followers ({users.filter(u => (viewedUser.followers || []).includes(u.id) || (u.following || []).includes(viewedUser.id)).length})
            </button>
            <button
              onClick={() => setConnectionsTab('following')}
              className={`flex-1 text-center py-2 text-xs font-extrabold rounded-xl transition ${connectionsTab === 'following' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
            >
              Following ({users.filter(u => (viewedUser.following || []).includes(u.id)).length})
            </button>
          </div>

          {(() => {
            const activeList = connectionsTab === 'followers'
              ? users.filter(u => (viewedUser.followers || []).includes(u.id) || (u.following || []).includes(viewedUser.id))
              : users.filter(u => (viewedUser.following || []).includes(u.id));

            if (activeList.length === 0) {
              return (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 py-16 px-4 text-center transition-colors duration-200">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    No {connectionsTab === 'followers' ? 'followers' : 'following'} found
                  </h4>
                  <p className="text-[11px] text-slate-450 mt-1">
                    {connectionsTab === 'followers' 
                      ? "Users who follow this profile will appear here." 
                      : "Users followed by this profile will appear here."}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeList.map((user) => {
                  const isFollowingTarget = currentUser.following.includes(user.id);
                  const isOwnConnectionItem = user.id === currentUser.id;

                  return (
                    <div 
                      key={user.id}
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center gap-4 hover:shadow-md transition duration-200"
                    >
                      <div 
                        onClick={() => {
                          onViewProfile(user.id);
                          setProfileTab('timeline');
                        }}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <img 
                          // FIXED ERROR 2
                          src={user.avatar || "/default-avatar.png"} 
                          onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                          alt={user.fullName} 
                          className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-slate-800 group-hover:border-emerald-500 transition duration-200" 
                          referrerPolicy="no-referrer" 
                        />
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-150 leading-snug group-hover:text-emerald-600 transition duration-200 flex items-center gap-1">
                            {user.fullName}
                            {user.isVerified && <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold block">@{user.username}</span>
                        </div>
                      </div>

                      {!isOwnConnectionItem && (
                        <button
                          onClick={() => onFollowToggle(user.id)}
                          className={`text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                            isFollowingTarget
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-900/30"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white"
                          }`}
                        >
                          {isFollowingTarget ? "Unfollow" : "Follow"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
      </>
      )}

      {/* MODAL 1: EDIT PROFILE DIALOG MODAL (STANDARD) */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-800 dark:text-slate-100">
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Edit Profile Details</h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <p className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] p-2.5 rounded-xl mb-4 font-semibold">
                {error}
              </p>
            )}

            <form onSubmit={handleSaveStandard} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1">Bio Description</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short summary about yourself..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="Avatar URL link"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1">Cover/Banner URL</label>
                <input
                  type="url"
                  value={coverPhoto}
                  onChange={(e) => setCoverPhoto(e.target.value)}
                  placeholder="Banner cover URL"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-1/2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CUSTOM MODAL 1.1: EDIT BANNER OR AVATAR POPUP OPTIONS */}
      {isEditingBannerOrAvatarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-850 dark:text-slate-100">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">Edit Profile Visuals</h3>
              <button 
                onClick={() => setIsEditingBannerOrAvatarModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setIsEditingBannerOrAvatarModal(false);
                  avatarInputRef.current?.click();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300 font-extrabold text-xs flex items-center gap-3 transition"
              >
                <Camera className="w-5 h-5 text-blue-500" />
                <span>Update Profile Avatar Picture</span>
              </button>

              <button
                onClick={() => {
                  setIsEditingBannerOrAvatarModal(false);
                  coverInputRef.current?.click();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center gap-3 transition"
              >
                <ImageIcon className="w-5 h-5 text-emerald-500" />
                <span>Update Cover Photo Banner</span>
              </button>

              <button
                onClick={() => {
                  setIsEditingBannerOrAvatarModal(false);
                  openStandardEdit();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs flex items-center gap-3 transition"
              >
                <Edit3 className="w-5 h-5 text-slate-500" />
                <span>Edit Bio & Professional Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM MODAL 1.2: +CREATE DROPDOWN POPUP OR URL POST WIZARD */}
      {showCreateDropdown && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-850 dark:text-slate-100">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">{createMediaType ? `Post ${createMediaType === 'photo' ? 'Photo' : 'Video'}` : "Create New Post"}</h3>
              <button 
                onClick={() => {
                  setShowCreateDropdown(false);
                  setCreateMediaType(null);
                  setMediaUrlInput('');
                  setLocalVideoInputFile(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!createMediaType ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCreateMediaType('photo')}
                  className="p-5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 dark:border-emerald-900/30 flex flex-col items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 transition"
                >
                  <ImageIcon className="w-8 h-8" />
                  <span className="font-bold text-xs">Photo URL / Upload</span>
                </button>
                <button
                  onClick={() => setCreateMediaType('video')}
                  className="p-5 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 dark:border-blue-900/30 flex flex-col items-center justify-center gap-2 text-blue-700 dark:text-blue-300 transition"
                >
                  <MonitorPlay className="w-8 h-8" />
                  <span className="font-bold text-xs">Video URL / Upload</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Caption / Description</label>
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Describe this media..."
                    className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white resize-none"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{createMediaType === 'photo' ? 'Photo URL' : 'Video URL'}</label>
                  <input
                    type="text"
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    placeholder={createMediaType === 'photo' ? 'https://example.com/photo.jpg' : 'https://example.com/video.mp4'}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                  />
                </div>

                {mediaUrlInput && (
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-2 bg-slate-50 dark:bg-slate-950 flex justify-center max-h-40 overflow-hidden">
                    {createMediaType === 'photo' ? (
                      <img 
                        // FIXED ERROR 2
                        src={mediaUrlInput || "/default-avatar.png"} 
                        onError={(e) => e.currentTarget.src = "/default-avatar.png"}
                        alt="Preview URL" 
                        className="object-contain h-full max-h-36 rounded-xl" 
                      />
                    ) : (
                      <video 
                        src={mediaUrlInput} 
                        controls 
                        className="object-contain h-full max-h-36 rounded-xl" 
                        onError={(e) => {
                          (e.currentTarget as HTMLVideoElement).style.display = 'none';
                          const parent = (e.currentTarget as HTMLVideoElement).parentElement;
                          if (parent) {
                            let errEl = parent.querySelector('.video-error-text');
                            if (!errEl) {
                              errEl = document.createElement('div');
                              errEl.className = 'video-error-text p-4 text-center text-xs text-slate-400 bg-slate-900 flex flex-col items-center justify-center gap-1 w-full h-full';
                              errEl.innerHTML = '<span class="text-xs font-semibold text-slate-300">Preview Unavailable</span><span class="text-[9px] text-slate-500">Invalid video stream source URL</span>';
                              parent.appendChild(errEl);
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (createMediaType === 'photo') {
                        avatarInputRef.current?.click();
                      } else {
                        videoInputRef.current?.click();
                      }
                    }}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Choose local file</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!mediaUrlInput && !newPostContent) return;
                      if (createMediaType === 'photo') {
                        onAddPost(newPostContent, mediaUrlInput, undefined, false, undefined, false);
                      } else {
                        onAddPost(newPostContent, undefined, mediaUrlInput, true, undefined, false);
                      }
                      setShowCreateDropdown(false);
                      setCreateMediaType(null);
                      setMediaUrlInput('');
                      setNewPostContent('');
                      setLocalVideoInputFile(null);
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black transition shadow"
                  >
                    Publish Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM MODAL 1.3: RECTANGULAR BANNER COVER CROPPING STAGE */}
      {bannerImageToCrop && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-55 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-slate-850 dark:text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">Adjust Cover Banner Photo</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setBannerImageToCrop(null);
                    setIsCroppingBanner(false);
                  }}
                  className="px-4 py-1.5 rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBannerCrop}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-1.5 rounded-full text-xs tracking-wide transition shadow active:scale-95"
                >
                  Save Banner
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Cover drag stage */}
              <div 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative w-full aspect-[3/1] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing select-none"
              >
                <img 
                  src={bannerImageToCrop} 
                  alt="Banner Preview" 
                  style={{
                    transform: `scale(${cropScale}) translate(${cropOffsetX}px, ${cropOffsetY}px)`,
                    filter: selectedFilter === 'grayscale' ? 'grayscale(100%)' :
                            selectedFilter === 'sepia' ? 'sepia(100%)' :
                            selectedFilter === 'cool' ? 'contrast(1.1) brightness(1.05) saturate(1.2) hue-rotate(30deg)' :
                            selectedFilter === 'warm' ? 'contrast(0.95) brightness(1.02) sepia(40%) saturate(1.4)' : 'none',
                    transition: 'transform 0.1s ease-out'
                  }}
                  className="max-w-full max-h-full object-contain pointer-events-none select-none"
                />
                
                {/* Safe grid framing overlay */}
                <div className="absolute inset-0 pointer-events-none border border-dashed border-white/20 flex flex-col justify-between">
                  <div className="h-0.5 w-full bg-white/10" />
                  <div className="h-0.5 w-full bg-white/10" />
                </div>
              </div>

              {/* Adjustments */}
              <div className="bg-slate-50 dark:bg-slate-855 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <span>Zoom Scale</span>
                    <span>{cropScale.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="4" 
                    step="0.1"
                    value={cropScale}
                    onChange={(e) => setCropScale(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Filters Row */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Color Preset Filter</label>
                  <div className="grid grid-cols-5 gap-1.5 text-[9px] font-bold text-center">
                    {(['normal', 'grayscale', 'sepia', 'cool', 'warm'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setSelectedFilter(filter)}
                        className={`py-2 rounded-xl capitalize transition cursor-pointer ${selectedFilter === filter ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM MODAL 1.4: SEARCHABLE INVITE DIALOG */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-850 dark:text-slate-100">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">Invite Members</h3>
              <button 
                onClick={() => {
                  setShowInviteDialog(false);
                  setInviteTargetUserId('');
                }}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Search by full name or advocate background..."
                onChange={(e) => setInviteTargetUserId(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
              />

              <div className="max-h-60 overflow-y-auto space-y-2.5">
                {users
                  .filter(u => u.id !== currentUser.id && u.fullName.toLowerCase().includes(inviteTargetUserId.toLowerCase()))
                  .map(u => (
                    <div key={u.id} className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-855 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <img src={u.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                            {u.fullName}
                            {u.isVerified && <BlueVerifiedTick className="w-3.5 h-3.5" />}
                          </p>
                          <p className="text-[9px] text-slate-400">{u.profileCategory || "Member"}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          alert(`Notification invitation sent successfully to ${u.fullName}!`);
                          setShowInviteDialog(false);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-full shadow"
                      >
                        Invite
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM MODAL 1.5: TAG REVIEW INTERFACE */}
      {showTagReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-850 dark:text-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">Review Tagged Posts ({posts.filter(p => p.content.includes(`@${currentUser.username}`) && !approvedPostIds.includes(p.id) && !rejectedPostIds.includes(p.id)).length})</h3>
              </div>
              <button 
                onClick={() => setShowTagReview(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4">
              {posts
                .filter(p => p.content.includes(`@${currentUser.username}`) && !approvedPostIds.includes(p.id) && !rejectedPostIds.includes(p.id))
                .map(post => (
                  <div key={post.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-855 border border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <img src={post.userAvatar} alt="Author" className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-bold flex items-center gap-1">
                          {post.userFullName}
                          {users.find(u => u.id === post.userId)?.isVerified && <BlueVerifiedTick className="w-3.5 h-3.5" />}
                        </p>
                        <p className="text-[9px] text-slate-400">{post.createdAt}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-350">{post.content}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setApprovedPostIds(prev => [...prev, post.id]);
                          alert("Successfully approved tag! The post is now shown on your profile timeline.");
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] transition"
                      >
                        Approve Tag
                      </button>
                      <button
                        onClick={() => {
                          setRejectedPostIds(prev => [...prev, post.id]);
                          alert("Tag rejected and deleted from your profile timeline.");
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 font-extrabold text-[10px] dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 transition"
                      >
                        Reject & Hide Tag
                      </button>
                    </div>
                  </div>
                ))}

              {posts.filter(p => p.content.includes(`@${currentUser.username}`) && !approvedPostIds.includes(p.id) && !rejectedPostIds.includes(p.id)).length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">All caught up! No tagged posts require review.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM MODAL 1.6: PUBLIC SAFETY & REPORTING MULTI-STEP FLOW */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-850 dark:text-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">Report Member / Content</h3>
              </div>
              <button 
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 1: SELECT PRIMARY REASON */}
            {reportStep === 1 && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-350">Why are you reporting this user? Please select the primary reason below:</p>
                <div className="space-y-2">
                  {[
                    { id: 'suicide', label: 'Suicidal Tendencies & Self-Harm', desc: 'Content encouraging self-injury, depression, or distress.' },
                    { id: 'harassment', label: 'Harassment & Targeted Cyberbullying', desc: 'Intimidating, hateful language, or targeted degradation.' },
                    { id: 'hacked', label: 'Hacked or Compromised Profile Account', desc: 'Unauthorized profile access, imposter, or phishing behavior.' }
                  ].map(reason => (
                    <button
                      key={reason.id}
                      onClick={() => {
                        setReportReasonChain([reason.label]);
                        setReportStep(2);
                      }}
                      className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-855 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition flex flex-col gap-1 cursor-pointer"
                    >
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">{reason.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{reason.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: EXPANDED DETAILED REASON CHAIN & SUBMIT */}
            {reportStep === 2 && (
              <div className="space-y-4">
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Category: {reportReasonChain[0]}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Detailed Explanation Note</label>
                  <textarea
                    value={reportExplanation}
                    onChange={(e) => setReportExplanation(e.target.value)}
                    placeholder="Provide relevant details or context to aid review..."
                    className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent dark:text-white resize-none"
                    rows={4}
                    required
                  />
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setReportStep(1)}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={async () => {
                      if (!reportExplanation.trim()) {
                        alert("Please provide an explanation note.");
                        return;
                      }
                      setReportSubmitting(true);
                      try {
                        await submitProfileReportToFirestore(
                          currentUser.id,
                          viewedUser.id,
                          reportReasonChain,
                          reportExplanation.trim()
                        );
                        setReportStep(3);
                      } catch (err) {
                        console.error(err);
                        alert("An error occurred. Please try again.");
                      } finally {
                        setReportSubmitting(false);
                      }
                    }}
                    disabled={reportSubmitting}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition shadow flex items-center justify-center gap-1.5"
                  >
                    {reportSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SUCCESS CONFIRMATION SCREEN */}
            {reportStep === 3 && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">Report Ingestion Complete</h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">This case has been securely logged with report ID reference. Our administrators will review and take immediate protective actions.</p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM MODAL 1.7: PIC 3 SPECIFIED USER BLOCKING MODAL */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4 animate-fadeIn text-white">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative">
            <h2 className="font-bold text-lg text-white">Are you sure you want to block {viewedUser.fullName || viewedUser.username}?</h2>
            <p className="text-neutral-450 text-sm mt-2">{viewedUser.fullName || viewedUser.username} will no longer be able to:</p>
            <ul className="list-disc pl-5 text-sm text-neutral-300 mt-2 space-y-1">
              <li>See your posts on profile</li>
              <li>Invite you on groups</li>
              <li>Start conversation with you</li>
              <li>Add you as a follower</li>
            </ul>
            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => setShowBlockModal(false)} 
                className="flex-1 py-2.5 rounded bg-neutral-800 hover:bg-neutral-750 transition font-bold text-sm text-white cursor-pointer"
              >
                Cancel
              </button>
              <button 
                className="flex-1 py-2.5 rounded bg-red-600 hover:bg-red-500 transition font-semibold text-sm text-white cursor-pointer" 
                onClick={() => blockUser(viewedUser.id)}
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATOR DASHBOARD MODAL */}
      {isCreatorDashboardOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sm:rounded-3xl shadow-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden text-slate-850 dark:text-slate-100">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-800">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Creator Analytics Dashboard</h3>
              <button 
                onClick={() => setIsCreatorDashboardOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <CreatorDashboard currentUser={currentUser} />
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 px-6 py-3 border-t border-slate-150 dark:border-slate-800/85 flex justify-end">
              <button
                onClick={() => setIsCreatorDashboardOpen(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-5 rounded-xl transition"
              >
                Close Dashboard
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: CREATE POST MODAL */}
      {isCreatePostOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-850 dark:text-slate-100">
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Create New Post</h3>
              <button 
                onClick={() => setIsCreatePostOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishPost} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1">What's on your mind?</label>
                <textarea
                  required
                  rows={4}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share news, heritage art, educational guides, or traditional recipes..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-3 outline-none focus:border-emerald-500 resize-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1">Photo Image URL (Optional)</label>
                <input
                  type="url"
                  value={newPostImage}
                  onChange={(e) => setNewPostImage(e.target.value)}
                  placeholder="e.g., https://images.unsplash.com/..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-450 mb-1">Video MP4 URL (Optional)</label>
                <input
                  type="url"
                  value={newPostVideo}
                  onChange={(e) => setNewPostVideo(e.target.value)}
                  placeholder="e.g., https://assets.mixkit.co/videos/preview/..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePostOpen(false)}
                  className="w-1/2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPostContent.trim() && !newPostImage.trim() && !newPostVideo.trim()}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Publish Post
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
            {/* MODAL 4: PHOTO CROPPING & ADJUSTMENT PREVIEW (FACEBOOK WIZARD SCREEN) */}
      {avatarImageToCrop && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-55 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-850 dark:text-slate-100 transition-colors duration-200">
            
            {/* Header Row: Back button, Title, Save button */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setAvatarImageToCrop(null);
                    setProfilePicCaption('');
                    setSelectedFrame('none');
                    setSelectedFilter('normal');
                    setTemporaryDuration('permanent');
                    setActiveWizardSubmenu(null);
                  }}
                  className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-350 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">Preview profile picture</h3>
              </div>
              <button
                onClick={handleConfirmCrop}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-1.5 rounded-full text-xs tracking-wide transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
              >
                SAVE
              </button>
            </div>

            {/* Scrollable Wizard content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-grow">
              
              {/* Description Caption Text box */}
              <div className="space-y-1.5">
                <textarea
                  value={profilePicCaption}
                  onChange={(e) => setProfilePicCaption(e.target.value)}
                  placeholder="Say something about your profile picture..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white resize-none"
                  rows={2}
                />
              </div>

              {/* Centered Image Crop Preview Frame */}
              <div className="flex flex-col items-center">
                <div 
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="relative w-64 h-64 sm:w-72 sm:h-72 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing select-none"
                  title="Drag to reposition, pinch-to-zoom on touch screens!"
                >
                  
                  {/* Photo subject to Zoom Scale and Position Panning offsets */}
                  <img 
                    src={avatarImageToCrop} 
                    alt="Wizard preview" 
                    style={{
                      transform: `scale(${cropScale}) translate(${cropOffsetX}px, ${cropOffsetY}px)`,
                      filter: selectedFilter === 'grayscale' ? 'grayscale(100%)' :
                              selectedFilter === 'sepia' ? 'sepia(100%)' :
                              selectedFilter === 'cool' ? 'contrast(1.1) brightness(1.05) saturate(1.2) hue-rotate(30deg)' :
                              selectedFilter === 'warm' ? 'contrast(0.95) brightness(1.02) sepia(40%) saturate(1.4)' : 'none',
                      transition: 'transform 0.1s ease-out'
                    }}
                    className="max-w-full max-h-full object-contain pointer-events-none select-none"
                  />

                  {/* Circular mask layer overlay exactly matching Facebook crop */}
                  <div className="absolute inset-0 pointer-events-none border-[16px] border-black/45 flex items-center justify-center">
                    <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-white/35 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                      
                      {/* Live Frame Render Overlay */}
                      {selectedFrame === 'gold' && (
                        <div className="absolute inset-[-4px] rounded-full border-[6px] border-[#D4AF37] pointer-events-none shadow-md animate-pulse" />
                      )}
                      {selectedFrame === 'emerald' && (
                        <div className="absolute inset-[-4px] rounded-full border-[6px] border-emerald-500 pointer-events-none shadow-md" />
                      )}
                      {selectedFrame === 'pride' && (
                        <div className="absolute inset-[-4px] rounded-full p-[6px] bg-gradient-to-tr from-[#E11D48] via-[#10B981] to-[#3B82F6] pointer-events-none shadow-md">
                          <div className="w-full h-full rounded-full border border-white/20" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Square crop / resize tool icon at bottom-left */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedCrop(!showAdvancedCrop)}
                    className={`absolute bottom-3 left-3 p-2.5 rounded-full shadow-lg border transition duration-200 z-10 flex items-center justify-center cursor-pointer ${
                      showAdvancedCrop 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                    title="Toggle resizing/panning panel"
                  >
                    <Crop className="w-4.5 h-4.5" />
                  </button>

                  {/* Temporary duration status pill in preview */}
                  {temporaryDuration !== 'permanent' && (
                    <span className="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow z-10 animate-pulse flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {temporaryDuration === '1hour' ? '1 Hour' : temporaryDuration === '1day' ? '1 Day' : '1 Week'}
                    </span>
                  )}
                </div>
              </div>

              {/* Conditional Advanced Resize & Panning controls */}
              {showAdvancedCrop && (
                <div className="bg-slate-50 dark:bg-slate-855 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-fadeIn">
                  {/* Slider */}
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                      <span>Zoom Scale</span>
                      <span>{cropScale.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="3" 
                      step="0.1"
                      value={cropScale}
                      onChange={(e) => setCropScale(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-750 border border-transparent rounded-lg appearance-none"
                    />
                  </div>

                  {/* Panning pad */}
                  <div className="flex flex-col items-center">
                    <label className="text-[9px] font-black text-slate-450 uppercase tracking-widest mb-2">Pan Photo</label>
                    <div className="grid grid-cols-3 gap-1.5 w-28">
                      <div />
                      <button 
                        type="button" 
                        onClick={() => setCropOffsetY(prev => prev - 10)}
                        className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex justify-center cursor-pointer text-slate-600 dark:text-slate-300 transition text-center"
                        title="Pan Up"
                      >
                        ▲
                      </button>
                      <div />

                      <button 
                        type="button" 
                        onClick={() => setCropOffsetX(prev => prev - 10)}
                        className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex justify-center cursor-pointer text-slate-600 dark:text-slate-300 transition text-center"
                        title="Pan Left"
                      >
                        ◀
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setCropOffsetX(0); setCropOffsetY(0); }}
                        className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:opacity-90 rounded-xl text-[9px] font-bold flex justify-center items-center cursor-pointer text-slate-750 dark:text-slate-200 transition"
                        title="Reset Panning"
                      >
                        Reset
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setCropOffsetX(prev => prev + 10)}
                        className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex justify-center cursor-pointer text-slate-600 dark:text-slate-300 transition text-center"
                        title="Pan Right"
                      >
                        ▶
                      </button>

                      <div />
                      <button 
                        type="button" 
                        onClick={() => setCropOffsetY(prev => prev + 10)}
                        className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex justify-center cursor-pointer text-slate-600 dark:text-slate-300 transition text-center"
                        title="Pan Down"
                      >
                        ▼
                      </button>
                      <div />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Pill options: [Restyle] [Make temporary] [Add frame] */}
              <div className="flex flex-wrap gap-2.5 justify-center py-1">
                <button
                  type="button"
                  onClick={() => setActiveWizardSubmenu(activeWizardSubmenu === 'restyle' ? null : 'restyle')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full border transition cursor-pointer ${
                    activeWizardSubmenu === 'restyle'
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Restyle
                </button>

                <button
                  type="button"
                  onClick={() => setActiveWizardSubmenu(activeWizardSubmenu === 'temporary' ? null : 'temporary')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full border transition cursor-pointer ${
                    activeWizardSubmenu === 'temporary'
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Make temporary
                </button>

                <button
                  type="button"
                  onClick={() => setActiveWizardSubmenu(activeWizardSubmenu === 'frame' ? null : 'frame')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full border transition cursor-pointer ${
                    activeWizardSubmenu === 'frame'
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  Add frame
                </button>
              </div>

              {/* Sub-menu panel: Restyle filters */}
              {activeWizardSubmenu === 'restyle' && (
                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 animate-fadeIn">
                  <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest text-center">Select Art Filter</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'normal', label: 'Normal' },
                      { id: 'grayscale', label: 'Noir' },
                      { id: 'sepia', label: 'Sepia' },
                      { id: 'cool', label: 'Cool' },
                      { id: 'warm', label: 'Warm' }
                    ].map((filt) => (
                      <button
                        key={filt.id}
                        type="button"
                        onClick={() => setSelectedFilter(filt.id as any)}
                        className={`py-2 text-[10px] font-bold rounded-xl transition border text-center cursor-pointer ${
                          selectedFilter === filt.id
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {filt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-menu panel: Temporary status */}
              {activeWizardSubmenu === 'temporary' && (
                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 animate-fadeIn">
                  <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest text-center">Set duration limit</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'permanent', label: 'Permanent' },
                      { id: '1hour', label: '1 Hour' },
                      { id: '1day', label: '1 Day' },
                      { id: '1week', label: '1 Week' }
                    ].map((dur) => (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => setTemporaryDuration(dur.id as any)}
                        className={`py-2 text-[10px] font-bold rounded-xl transition border text-center cursor-pointer ${
                          temporaryDuration === dur.id
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {dur.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-menu panel: Add Frame */}
              {activeWizardSubmenu === 'frame' && (
                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 animate-fadeIn">
                  <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest text-center">Select Profile Frame</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'gold', label: 'Gold Ring' },
                      { id: 'emerald', label: 'Emerald' },
                      { id: 'pride', label: 'Pride Ring' }
                    ].map((frm) => (
                      <button
                        key={frm.id}
                        type="button"
                        onClick={() => setSelectedFrame(frm.id as any)}
                        className={`py-2 text-[10px] font-bold rounded-xl transition border text-center cursor-pointer ${
                          selectedFrame === frm.id
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {frm.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Share your update to Feed section */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <label className="flex items-start gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={shareToFeed}
                    onChange={(e) => setShareToFeed(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 accent-blue-600 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition">
                      Share your update to Feed
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Generate a beautiful timeline post to announce your fresh avatar picture update automatically.
                    </p>
                  </div>
                </label>
              </div>

            </div>

            {/* Bottom Footer block containing explicit Action triggers */}
            <div className="flex gap-3 px-6 py-4 bg-slate-55 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAvatarImageToCrop(null);
                  setProfilePicCaption('');
                  setSelectedFrame('none');
                  setSelectedFilter('normal');
                  setTemporaryDuration('permanent');
                  setActiveWizardSubmenu(null);
                }}
                className="w-1/2 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCrop}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-750 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow text-center font-extrabold"
              >
                Save Photo
              </button>
            </div>

          </div>
        </div>
      )}



      {/* Global customized Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-neutral-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold z-55 border border-neutral-850 animate-slideUp flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Profile Post 3-Dot Menu Modal */}
      <AnimatePresence>
        {activePostMenuId && (() => {
          const post = posts.find(p => p.id === activePostMenuId);
          // Strict owner check with support for both standard and specific fields
          const isOwner = !!(
            currentUser &&
            post &&
            (
              (currentUser.uid && post.ownerId && currentUser.uid === post.ownerId) ||
              (currentUser.id && post.userId && currentUser.id === post.userId) ||
              (currentUser.uid && post.userId && currentUser.uid === post.userId) ||
              (currentUser.id && post.ownerId && currentUser.id === post.ownerId)
            )
          );

          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActivePostMenuId(null)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
              >
                <div className="p-4">
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
                  
                  <div className="flex flex-col space-y-1">
                    {/* Pin post - Restricted */}
                    {isOwner && post && (() => {
                      const isPinned = !!post.pinned;
                      return (
                        <button
                          onClick={async () => {
                            setActivePostMenuId(null);
                            try {
                              await updateDoc(doc(db, 'rc_posts', post.id), {
                                pinned: !isPinned,
                                pinnedAt: !isPinned ? Date.now() : null
                              });
                              setToastMessage(!isPinned ? 'Post pinned to top of profile' : 'Post unpinned from profile');
                            } catch (err) {
                              console.error("Error toggling pin in profile sheet:", err);
                            }
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Pin className={`w-5 h-5 text-slate-700 dark:text-slate-300 ${isPinned ? 'fill-current rotate-[45deg]' : ''}`} />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                              {isPinned ? 'Unpin post' : 'Pin post'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {isPinned ? 'Remove this post from top' : 'Pins post to the top of your profile'}
                            </span>
                          </div>
                        </button>
                      );
                    })()}

                    {/* Save post - Safe public option */}
                    <button
                      onClick={() => {
                        setActivePostMenuId(null);
                        window.dispatchEvent(new CustomEvent('open-save-post', { detail: { postId: activePostMenuId } }));
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Bookmark className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Save post</span>
                        <span className="text-[11px] text-slate-500">Add this to your saved items</span>
                      </div>
                    </button>

                    {/* Pin post - Restricted */}
                    {isOwner && (
                      <button
                        onClick={async () => {
                          const isPinned = !!post.pinned;
                          await updateDoc(doc(db, 'rc_posts', post.id), {
                            pinned: !isPinned,
                            pinnedAt: !isPinned ? Date.now() : null
                          });
                          setActivePostMenuId(null);
                          alert(!isPinned ? 'Post pinned to top of profile' : 'Post unpinned from profile');
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <Pin className={`w-5 h-5 text-slate-700 dark:text-slate-300 ${post.pinned ? 'fill-current' : ''}`} />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">{post.pinned ? 'Unpin post' : 'Pin post'}</span>
                          <span className="text-[11px] text-slate-500">{post.pinned ? 'Remove from top' : 'Pin to top of profile'}</span>
                        </div>
                      </button>
                    )}

                    {/* Edit post - Restricted */}
                    {isOwner && (
                      <button
                        onClick={() => {
                          setActivePostMenuId(null);
                          window.dispatchEvent(new CustomEvent('edit-post', { detail: { postId: post.id } }));
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <Edit3 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Edit post</span>
                          <span className="text-[11px] text-slate-500">Modify your post content</span>
                        </div>
                      </button>
                    )}

                    {/* Who can comment on your post? - Restricted */}
                    {isOwner && (
                      <button
                        onClick={() => {
                          setActivePostMenuId(null);
                          window.dispatchEvent(new CustomEvent('edit-comment-privacy', { detail: { postId: post.id } }));
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <MessageCircle className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Who can comment</span>
                          <span className="text-[11px] text-slate-500">Control who can reply to this</span>
                        </div>
                      </button>
                    )}

                    {/* Save post - Restricted */}
                    <button
                      onClick={() => {
                        setActivePostMenuId(null);
                        window.dispatchEvent(new CustomEvent('open-save-post', { detail: { postId: post.id } }));
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Bookmark className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Save post</span>
                        <span className="text-[11px] text-slate-500">Add to saved items</span>
                      </div>
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => {
                          setActivePostMenuId(null);
                          setShowPrivacyModalForId(post.id);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <Lock className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Edit Privacy</span>
                          <span className="text-[11px] text-slate-500">Change who can see this post</span>
                        </div>
                      </button>
                    )}

                    {/* Turn off notifications for this post - Restricted */}
                    {isOwner && (
                      <button
                        onClick={() => {
                          setActivePostMenuId(null);
                          alert('Notifications turned off for this post');
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Turn off notifications for this post</span>
                        </div>
                      </button>
                    )}

                    {/* Move to trash - Restricted */}
                    {isOwner && (
                      <button
                        onClick={() => {
                          setShowDeleteConfirmFor(activePostMenuId);
                          setActivePostMenuId(null);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                          <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-rose-600 dark:text-rose-400 block">Move to trash</span>
                          <span className="text-[11px] text-rose-500/70">Items in trash are deleted after 30 days</span>
                        </div>
                      </button>
                    )}

                    {post && post.userId !== currentUser.id && post.content.includes(`@${currentUser.username}`) && (
                      <button
                        onClick={() => {
                          setShowRemoveTagConfirmFor(activePostMenuId);
                          setActivePostMenuId(null);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                          <Ban className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-rose-600 dark:text-rose-400 block">Remove tag</span>
                          <span className="text-[11px] text-rose-500/70">Remove this tag from your profile</span>
                        </div>
                      </button>
                    )}

                    {/* Copy link - Safe public option */}
                    <button
                      onClick={() => {
                        setActivePostMenuId(null);
                        alert('You have copied this post link');
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Link className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Copy link</span>
                        <span className="text-[11px] text-slate-500">Copy link to clipboard</span>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmFor && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Are you sure to delete this post?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This item will be moved to the Trash folder and automatically deleted after 30 days.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirmFor(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onDeletePost(showDeleteConfirmFor);
                  setShowDeleteConfirmFor(null);
                }}
                className="flex-1 py-2.5 bg-[#1877F2] hover:bg-blue-600 text-white font-bold rounded-xl transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Remove Tag Confirmation Modal */}
      {showRemoveTagConfirmFor && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Remove tag?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">You won't be tagged in this post anymore. It will no longer appear on your timeline.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowRemoveTagConfirmFor(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setRejectedPostIds(prev => [...prev, showRemoveTagConfirmFor]);
                  setShowRemoveTagConfirmFor(null);
                  alert('Tag removed successfully.');
                }}
                className="flex-1 py-2.5 bg-[#1877F2] hover:bg-blue-600 text-white font-bold rounded-xl transition"
              >
                Yes, remove tag
              </button>
            </div>
          </div>
        </div>
      )}
      {showPrivacyModalForId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPrivacyModalForId(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-lg mb-4 text-slate-900 dark:text-slate-100">Who can see your post?</h3>
            {['public', 'followers', 'close_friends', 'only_me'].map((opt) => (
              <button 
                key={opt}
                onClick={() => handleUpdatePrivacy(showPrivacyModalForId, opt as any)}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 capitalize text-slate-900 dark:text-slate-100"
              >
                {opt.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {showVerifiedBadgeMenu && (
        <VerifiedBadgeMenu
          currentUser={currentUser}
          onClose={() => setShowVerifiedBadgeMenu(false)}
        />
      )}
    </div>
  );
}
