import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Check, Eye, Clock, Phone, Video, Info, User as UserIcon,
  Plus, X, Settings, Camera, Image as ImageIcon, BarChart3, Calendar, 
  UserCheck, MoreVertical, AlertTriangle, UserMinus, ShieldAlert, CheckSquare, Search, Trash2,
  ChevronLeft, Sparkles
} from 'lucide-react';
import { ChatMessage, User, MessageRequest, Story } from '../types';
import { db, auth, uploadMedia } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { sendMessageRequestInFirestore, updateMessageRequestStatusInFirestore, addStoryToFirestore } from '../utils/firebaseSync';
import ChatScreen from './ChatScreen';
import MediaEditor from './MediaEditor';
import FullScreenImageViewer from './FullScreenImageViewer';
import { BlueVerifiedTick } from './BlueVerifiedTick';
import StoryViewer from './StoryViewer';
import GroupInfoSettings from './GroupInfoSettings';

interface InboxProps {
  currentUser: User;
  users: User[];
  messages: ChatMessage[];
  onSendMessage: (receiverId: string, text: string) => void;
  onReceiveMessage: (senderId: string, text: string) => void;
  activeChatUserId: string | null;
  setActiveChatUserId: (userId: string | null) => void;
  onStartCall?: (type: 'audio' | 'video', target: User) => void;
  onViewProfile?: (userId: string) => void;
  messageRequests?: MessageRequest[];
  stories?: Story[];
}

// Interfaces for advanced local state
interface GroupMember {
  userId: string;
  fullName: string;
  username: string;
  avatar: string;
  role: 'admin' | 'member';
}

interface GroupPoll {
  question: string;
  options: { text: string; votes: string[] }[]; // userIds
}

interface GroupEvent {
  title: string;
  date: string;
  location: string;
  description: string;
  rsvps: { [userId: string]: 'going' | 'interested' | 'not_going' };
}

interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  attachmentUrl?: string;
  attachmentType?: 'gallery' | 'camera';
  poll?: GroupPoll;
  event?: GroupEvent;
}

interface CommunityGroup {
  id: string;
  name: string;
  adminId: string;
  members: GroupMember[];
  avatar: string;
  messages: GroupMessage[];
}

interface CallLogItem {
  id: string;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  user: User;
  timestamp: string;
  isRed: boolean; // Missed calls start red, turn grey on callback
}

export default function Inbox({
  currentUser,
  users,
  messages,
  onSendMessage,
  onReceiveMessage,
  activeChatUserId,
  setActiveChatUserId,
  onStartCall,
  onViewProfile,
  messageRequests = [],
  stories = []
}: InboxProps) {
  
  // -----------------------------------------------------------------
  // 1. CHAT LISTS AND SELECTION STATE
  // -----------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'calls'>('chats');
  const [mainTab, setMainTab] = useState<'hub' | 'calls'>('hub');
  const [hubSubTab, setHubSubTab] = useState<'chats' | 'groups'>('chats');
  const [inputText, setInputText] = useState('');
  const [followerSearchQuery, setFollowerSearchQuery] = useState('');
  const [activeStoryUserId, setActiveStoryUserId] = useState<string | null>(null);

  const defaultMockStories = [
    {
      id: 'story_mock_1',
      userId: 'zahed_alam',
      userFullName: 'Zahed Alam',
      userAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80',
      mediaUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&h=1000&q=80',
      createdAt: new Date().toISOString(),
      viewers: [] as string[]
    },
    {
      id: 'story_mock_2',
      userId: 'yasmin_begum',
      userFullName: 'Yasmin Begum',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
      mediaUrl: 'https://images.unsplash.com/photo-1617043786394-f977fa12eddf?auto=format&fit=crop&w=600&h=1000&q=80',
      createdAt: new Date().toISOString(),
      viewers: [] as string[]
    },
    {
      id: 'story_mock_3',
      userId: 'nur_islam',
      userFullName: 'Nur Islam',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
      mediaUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&h=1000&q=80',
      createdAt: new Date().toISOString(),
      viewers: [] as string[]
    }
  ];

  const activeStories = [...(stories || []), ...defaultMockStories];

  const groupedStories: Record<string, any[]> = {};
  activeStories.forEach((s: any) => {
    const uid = s.userId || 'unknown';
    if (!groupedStories[uid]) {
      groupedStories[uid] = [];
    }
    const avatarVal = s.userAvatar || s.avatar || 'https://via.placeholder.com/150';
    const mediaVal = s.mediaUrl || s.media || s.image || '';
    groupedStories[uid].push({
      id: s.id,
      userId: uid,
      username: s.userName || s.userFullName || uid,
      userFullName: s.userFullName || s.userName || uid,
      avatar: avatarVal,
      userAvatar: avatarVal,
      media: mediaVal,
      mediaUrl: mediaVal,
      image: mediaVal,
      mediaType: s.mediaType || 'image',
      createdAt: s.createdAt,
      viewers: s.viewers || []
    });
  });

  const storyUserIds = Object.keys(groupedStories);

  const userHasUnviewedStories = (uid: string) => {
    const uStories = groupedStories[uid];
    return uStories.some(s => !s.viewers || !s.viewers.includes(currentUser.id));
  };

  const anyUnviewedStories = storyUserIds.some(uid => userHasUnviewedStories(uid));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [editingMediaFile, setEditingMediaFile] = useState<File | null>(null);
  
  const [hiddenChats, setHiddenChats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const chatsColl = collection(db, 'chats');
    const unsubscribe = onSnapshot(chatsColl, (snap) => {
      const hidden: Record<string, boolean> = {};
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.hiddenFor && data.hiddenFor[currentUser.id]) {
          const otherId = data.participants?.find((p: string) => p !== currentUser.id);
          if (otherId) {
            hidden[otherId] = true;
          }
        }
      });
      setHiddenChats(hidden);
    }, (err) => {
      console.warn("Non-blocking hidden chats sync offline warning/error:", err);
    });
    return () => unsubscribe();
  }, [currentUser.id]);

  const chatTargets = users
    .filter(u => u.id !== currentUser.id)
    .filter(u => !hiddenChats[u.id])
    .filter(u => {
      if (!followerSearchQuery) return true;
      const q = followerSearchQuery.toLowerCase();
      return u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    });

  // -----------------------------------------------------------------
  // 2. COMMUNITY GROUPS STATE
  // -----------------------------------------------------------------
  const [groups, setGroups] = useState<CommunityGroup[]>(() => {
    const saved = localStorage.getItem('rc_community_groups');
    if (saved) return JSON.parse(saved);

    // Initial default groups for high-fidelity testing
    const defaultGroupAdmins = users.find(u => u.id !== currentUser.id) || currentUser;
    return [
      {
        id: 'g-1',
        name: 'Cox\'s Bazar Volunteer Assoc.',
        adminId: defaultGroupAdmins.id,
        avatar: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        members: [
          { userId: currentUser.id, fullName: currentUser.fullName, username: currentUser.username, avatar: currentUser.avatar, role: 'member' },
          { userId: defaultGroupAdmins.id, fullName: defaultGroupAdmins.fullName, username: defaultGroupAdmins.username, avatar: defaultGroupAdmins.avatar, role: 'admin' },
          ...(users.filter(u => u.id !== currentUser.id && u.id !== defaultGroupAdmins.id).slice(0, 2).map(u => ({
            userId: u.id, fullName: u.fullName, username: u.username, avatar: u.avatar, role: 'member' as const
          })))
        ],
        messages: [
          {
            id: 'gm-1',
            senderId: defaultGroupAdmins.id,
            senderName: defaultGroupAdmins.fullName,
            senderAvatar: defaultGroupAdmins.avatar,
            text: 'Welcome everyone to the Rohingya Relief Volunteer Group! We coordinate food distribution and educational materials here.',
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            id: 'gm-2',
            senderId: currentUser.id,
            senderName: currentUser.fullName,
            senderAvatar: currentUser.avatar,
            text: 'Glad to be here! Let me know when the next volunteer drive is.',
            createdAt: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      }
    ];
  });
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('rc_community_groups', JSON.stringify(groups));
  }, [groups]);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const activeGroup = groups.find(g => g.id === activeGroupId);

  // Synchronize active chat/group state with window history for Android back button support
  useEffect(() => {
    const isChatOpen = !!(activeChatUserId || activeGroupId);
    
    // Hide bottom navigation completely when inside a chat
    const bottomNav = document.querySelector('nav.fixed.bottom-0.md\\:hidden');
    if (bottomNav) {
      if (isChatOpen) {
        (bottomNav as HTMLElement).style.display = 'none';
      } else {
        (bottomNav as HTMLElement).style.display = '';
      }
    }

    // When a chat opens, if we don't already have history.state indicating chatOpen, push state
    if (isChatOpen && !window.history.state?.chatOpen) {
      window.history.pushState({ chatOpen: true }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      // If the state is popped and it is not chatOpen, clear active chats
      if (!e.state || !e.state.chatOpen) {
        setActiveChatUserId(null);
        setActiveGroupId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeChatUserId, activeGroupId, setActiveChatUserId, setActiveGroupId]);

  const handleCloseChat = () => {
    setActiveChatUserId(null);
    setActiveGroupId(null);
    if (window.history.state?.chatOpen) {
      window.history.back();
    }
  };

  // Group creation modal states
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // Group Member click sub-menu state
  const [selectedMemberMenu, setSelectedMemberMenu] = useState<{ userId: string; x: number; y: number } | null>(null);

  // -----------------------------------------------------------------
  // 3. CALL LOGS & INCOMING CALL SIMULATION STATE
  // -----------------------------------------------------------------
  const [callLogs, setCallLogs] = useState<CallLogItem[]>(() => {
    const saved = localStorage.getItem('rc_call_logs');
    if (saved) return JSON.parse(saved);

    // Initial missed call log item in red
    const caller = users.find(u => u.id !== currentUser.id) || currentUser;
    return [
      {
        id: 'c-1',
        type: 'audio',
        direction: 'missed',
        user: caller,
        timestamp: new Date(Date.now() - 3600000 * 3).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRed: true
      },
      {
        id: 'c-2',
        type: 'video',
        direction: 'incoming',
        user: caller,
        timestamp: new Date(Date.now() - 3600000 * 5).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRed: false
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('rc_call_logs', JSON.stringify(callLogs));
  }, [callLogs]);

  // Simulated active/incoming call overlays
  const [activeCallSim, setActiveCallSim] = useState<{ type: 'audio' | 'video'; user: User; status: 'ringing' | 'connected' } | null>(null);

  // -----------------------------------------------------------------
  // 4. CHAT TOOLBAR & ATTACHMENT ACTION STATE
  // -----------------------------------------------------------------
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);

  // Poll creation states
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '', '']);

  // Event creation states
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  // -----------------------------------------------------------------
  // 5. CHAT THEME & PRIVACY SETTINGS STATE
  // -----------------------------------------------------------------
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [onlineStatusPrivacy, setOnlineStatusPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>(() => {
    return (localStorage.getItem('rc_online_privacy') as any) || 'everyone';
  });
  const [chatTheme, setChatTheme] = useState<'local' | 'sunset' | 'ocean' | 'forest'>(() => {
    return (localStorage.getItem('rc_chat_theme') as any) || 'local';
  });

  // -----------------------------------------------------------------
  // 6. EFFECT FOR INBOX SELECTION
  // -----------------------------------------------------------------
  // useEffect(() => {
  //   if (!activeChatUserId && !activeGroupId) {
  //     setActiveChatUserId('rc_assistant');
  //   }
  // }, [activeChatUserId, activeGroupId, setActiveChatUserId]);

  const activeTargetUser = users.find(u => u.id === activeChatUserId);

  const isFollowedByTarget = activeTargetUser ? (
    activeTargetUser.following?.includes(currentUser.id) || 
    currentUser.followers?.includes(activeTargetUser.id)
  ) : false;

  const incomingRequest = activeTargetUser ? messageRequests?.find(
    r => r.senderId === activeTargetUser.id && r.receiverId === currentUser.id
  ) : null;

  const outgoingRequest = activeTargetUser ? messageRequests?.find(
    r => r.senderId === currentUser.id && r.receiverId === activeTargetUser.id
  ) : null;

  const isUnlocked = !activeTargetUser || isFollowedByTarget || 
    incomingRequest?.status === 'accepted' || 
    outgoingRequest?.status === 'accepted';

  const handleSendMessageRequest = async () => {
    if (!activeTargetUser) return;
    try {
      await sendMessageRequestInFirestore(
        auth.currentUser?.uid || currentUser.id,
        activeTargetUser.id,
        currentUser.fullName,
        currentUser.avatar
      );
      alert("Message request sent!");
    } catch (err) {
      console.error("Error sending message request:", err);
      alert("Failed to send message request. Please try again.");
    }
  };

  const conversationMessages = messages.filter(
    msg => 
      (msg.senderId === currentUser.id && msg.receiverId === activeChatUserId) ||
      (msg.senderId === activeChatUserId && msg.receiverId === currentUser.id)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages, activeGroup?.messages]);

  // -----------------------------------------------------------------
  // 7. MESSAGE SENDING ACTIONS
  // -----------------------------------------------------------------
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (activeGroupId) {
      // Send group message
      const newMsg: GroupMessage = {
        id: `gm-${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        senderAvatar: currentUser.avatar,
        text: inputText.trim(),
        createdAt: new Date().toISOString()
      };
      
      setGroups(prev => prev.map(g => {
        if (g.id === activeGroupId) {
          return { ...g, messages: [...g.messages, newMsg] };
        }
        return g;
      }));
      setInputText('');

      // Simulated group replies
      const activeGrp = groups.find(g => g.id === activeGroupId);
      if (activeGrp) {
        const otherMembers = activeGrp.members.filter(m => m.userId !== currentUser.id);
        if (otherMembers.length > 0) {
          setTimeout(() => {
            const replier = otherMembers[Math.floor(Math.random() * otherMembers.length)];
            const automaticGroupReplies = [
              "Interesting point! Let's schedule a meeting to discuss this further.",
              "I completely agree. Solidarity within our community is our greatest strength.",
              "Thank you for sharing this update! Let me know how I can help.",
              "We should post this as a public notice card on the community billboard."
            ];
            const grpReply: GroupMessage = {
              id: `gm-${Date.now() + 1}`,
              senderId: replier.userId,
              senderName: replier.fullName,
              senderAvatar: replier.avatar,
              text: automaticGroupReplies[Math.floor(Math.random() * automaticGroupReplies.length)],
              createdAt: new Date().toISOString()
            };
            setGroups(prev => prev.map(g => {
              if (g.id === activeGroupId) {
                return { ...g, messages: [...g.messages, grpReply] };
              }
              return g;
            }));
          }, 2000);
        }
      }

    } else if (activeChatUserId) {
      // Send direct message
      const sentText = inputText.trim();
      onSendMessage(activeChatUserId, sentText);
      setInputText('');

    }
  };

  const getLastMessageInThread = (targetId: string) => {
    const thread = messages.filter(
      msg => 
        (msg.senderId === currentUser.id && msg.receiverId === targetId) ||
        (msg.senderId === targetId && msg.receiverId === currentUser.id)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(b.createdAt).getTime());

    return thread.length > 0 ? thread[thread.length - 1] : null;
  };

  // -----------------------------------------------------------------
  // 8. GROUP OPERATIONS
  // -----------------------------------------------------------------
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGroupMembers: GroupMember[] = [
      { userId: currentUser.id, fullName: currentUser.fullName, username: currentUser.username, avatar: currentUser.avatar, role: 'admin' },
      ...selectedGroupMembers.map(uid => {
        const u = users.find(user => user.id === uid)!;
        return { userId: uid, fullName: u.fullName, username: u.username, avatar: u.avatar, role: 'member' as const };
      })
    ];

    const newGroup: CommunityGroup = {
      id: `g-${Date.now()}`,
      name: newGroupName.trim(),
      adminId: currentUser.id,
      avatar: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      members: newGroupMembers,
      messages: [
        {
          id: `gm-${Date.now()}`,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          senderAvatar: currentUser.avatar,
          text: `Created group "${newGroupName.trim()}"! Feel free to add members and coordinate events.`,
          createdAt: new Date().toISOString()
        }
      ]
    };

    setGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
    setSelectedGroupMembers([]);
    setIsCreateGroupOpen(false);
    setActiveGroupId(newGroup.id);
    setActiveChatUserId(null);
    alert("Group created successfully!");
  };

  const handleGroupMemberAction = (action: 'make-admin' | 'remove' | 'view' | 'report', memberId: string) => {
    if (!activeGroup) return;

    if (action === 'make-admin') {
      setGroups(prev => prev.map(g => {
        if (g.id === activeGroupId) {
          return {
            ...g,
            members: g.members.map(m => m.userId === memberId ? { ...m, role: 'admin' } : m)
          };
        }
        return g;
      }));
      alert("Member promoted to Admin!");
    } else if (action === 'remove') {
      setGroups(prev => prev.map(g => {
        if (g.id === activeGroupId) {
          return {
            ...g,
            members: g.members.filter(m => m.userId !== memberId)
          };
        }
        return g;
      }));
      alert("Member removed from the group.");
    } else if (action === 'view') {
      setActiveChatUserId(memberId);
      setActiveGroupId(null);
      // Simulate profile redirection info
      alert(`Redirecting to view ${users.find(u => u.id === memberId)?.fullName || 'user'}'s profile...`);
    } else if (action === 'report') {
      alert(`User reported to community moderator panel successfully.`);
    }
    setSelectedMemberMenu(null);
  };

  // -----------------------------------------------------------------
  // 9. CALL ACTIONS (CALLBACK & OVERLAYS)
  // -----------------------------------------------------------------
  const triggerCallback = (log: CallLogItem) => {
    // Revert text color from red to normal upon callback
    setCallLogs(prev => prev.map(item => item.id === log.id ? { ...item, isRed: false } : item));
    
    // Simulate active outgoing call
    setActiveCallSim({
      type: log.type,
      user: log.user,
      status: 'ringing'
    });

    // Ring for 2.5 seconds then connect
    setTimeout(() => {
      setActiveCallSim(prev => prev ? { ...prev, status: 'connected' } : null);
    }, 2500);
  };

  // -----------------------------------------------------------------
  // 10. TOOLBAR ATTACHMENTS (POLLS, EVENTS, CAMERA, GALLERY)
  // -----------------------------------------------------------------
  const handleCreatePoll = () => {
    if (!pollQuestion.trim()) return;

    const pollMsg: GroupMessage = {
      id: `gm-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderAvatar: currentUser.avatar,
      text: `📊 Created a Poll: "${pollQuestion}"`,
      createdAt: new Date().toISOString(),
      poll: {
        question: pollQuestion.trim(),
        options: pollOptions.filter(o => o.trim() !== '').map(text => ({ text, votes: [] }))
      }
    };

    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        return { ...g, messages: [...g.messages, pollMsg] };
      }
      return g;
    }));

    // Reset states
    setPollQuestion('');
    setPollOptions(['', '', '']);
    setIsCreatePollOpen(false);
    setIsToolbarOpen(false);
  };

  const handleVotePoll = (msgId: string, optionIdx: number) => {
    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        return {
          ...g,
          messages: g.messages.map(m => {
            if (m.id === msgId && m.poll) {
              const updatedOptions = m.poll.options.map((opt, idx) => {
                // Clear voter from other choices to enforce single choice
                let votes = opt.votes.filter(v => v !== currentUser.id);
                if (idx === optionIdx) {
                  votes.push(currentUser.id);
                }
                return { ...opt, votes };
              });
              return { ...m, poll: { ...m.poll, options: updatedOptions } };
            }
            return m;
          })
        };
      }
      return g;
    }));
  };

  const handleCreateEvent = () => {
    if (!eventTitle.trim() || !eventDate || !eventLocation) return;

    const eventMsg: GroupMessage = {
      id: `gm-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderAvatar: currentUser.avatar,
      text: `📅 New Event Created: "${eventTitle}"`,
      createdAt: new Date().toISOString(),
      event: {
        title: eventTitle.trim(),
        date: eventDate,
        location: eventLocation.trim(),
        description: eventDesc.trim(),
        rsvps: { [currentUser.id]: 'going' }
      }
    };

    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        return { ...g, messages: [...g.messages, eventMsg] };
      }
      return g;
    }));

    // Reset states
    setEventTitle('');
    setEventDate('');
    setEventLocation('');
    setEventDesc('');
    setIsCreateEventOpen(false);
    setIsToolbarOpen(false);
  };

  const handleRsvpEvent = (msgId: string, status: 'going' | 'interested' | 'not_going') => {
    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        return {
          ...g,
          messages: g.messages.map(m => {
            if (m.id === msgId && m.event) {
              const updatedRsvps = {
                ...(m.event.rsvps || {}),
                [currentUser.id]: status
              };
              return { ...m, event: { ...m.event, rsvps: updatedRsvps } };
            }
            return m;
          })
        };
      }
      return g;
    }));
  };

  const handleMediaSelected = async (e: React.ChangeEvent<HTMLInputElement>, isFromCamera = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setEditingMediaFile(files[0]);
    e.target.value = '';
  };

  const handleMediaEditorDone = async (editedFile: File, viewOnceValue: boolean) => {
    setEditingMediaFile(null);
    const downloadUrl = await uploadMedia(editedFile, 'chat_images');
    if (!downloadUrl) {
      alert("Failed to upload image. Please try again.");
      return;
    }

    if (activeGroupId) {
      const galleryMsg: GroupMessage = {
        id: `gm-${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        senderAvatar: currentUser.avatar,
        text: '🖼️ Sent an image',
        createdAt: new Date().toISOString(),
        attachmentUrl: downloadUrl,
        attachmentType: 'gallery'
      };
      setGroups(prev => prev.map(g => {
        if (g.id === activeGroupId) return { ...g, messages: [...g.messages, galleryMsg] };
        return g;
      }));
    } else if (activeChatUserId) {
      onSendMessage(activeChatUserId, `IMAGE_ATTACHMENT:${downloadUrl}`);
    }
    setIsToolbarOpen(false);
  };

  // -----------------------------------------------------------------
  // 11. HELPER TO DETERMINE CHATWALLPAPER STYLE
  // -----------------------------------------------------------------
  const getThemeWallpaperClass = () => {
    switch (chatTheme) {
      case 'sunset':
        return 'bg-gradient-to-tr from-amber-500/10 via-rose-500/5 to-purple-500/10 dark:from-amber-950/20 dark:via-rose-950/15 dark:to-purple-950/25';
      case 'ocean':
        return 'bg-gradient-to-tr from-cyan-500/10 via-teal-500/5 to-blue-500/10 dark:from-cyan-950/20 dark:via-teal-950/15 dark:to-blue-950/25';
      case 'forest':
        return 'bg-gradient-to-tr from-green-500/10 via-emerald-500/5 to-lime-500/10 dark:from-green-950/20 dark:via-emerald-950/15 dark:to-lime-950/25';
      default:
        return 'bg-slate-50/20 dark:bg-slate-950/5';
    }
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] select-none font-sans flex flex-col">
      
      {/* HIDDEN INPUTS & EDITOR */}
      <input type="file" ref={cameraInputRef} onChange={(e) => handleMediaSelected(e, true)} accept="image/*" capture="environment" className="hidden" />
      <input type="file" ref={galleryInputRef} onChange={(e) => handleMediaSelected(e, false)} accept="image/*" className="hidden" />
      
      {editingMediaFile && (
        <MediaEditor
          file={editingMediaFile}
          onDone={handleMediaEditorDone}
          onClose={() => setEditingMediaFile(null)}
        />
      )}
      
      {/* FULL PANEL FLEX CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border-none overflow-hidden flex h-full transition duration-200 flex-1">
        
        {/* LEFT PANEL: CONVERSATION & GROUP DIRECTORY */}
        <div className={`w-full md:w-1/3 ${(activeChatUserId || activeGroupId) ? 'hidden md:flex' : 'flex'} border-r border-slate-200 dark:border-slate-800 flex-col h-full bg-slate-50 dark:bg-slate-950/20`}>
          
          {/* Header controls with group addition */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
            {/* Title & Settings */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-1">
                  RohingyaConnect
                  {anyUnviewedStories && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full inline-block animate-pulse" />
                  )}
                </h1>
              </div>
              
              <div className="flex gap-1">
                <button 
                  onClick={() => setIsChatSettingsOpen(true)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-xl text-slate-500 dark:text-slate-400 cursor-pointer"
                  title="Chat Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-xl text-emerald-600 dark:text-emerald-450 cursor-pointer"
                  title="Create Group"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* FOLLOWER SEARCH BAR */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={followerSearchQuery}
                onChange={(e) => setFollowerSearchQuery(e.target.value)}
                placeholder="Search followers..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-xl text-xs focus:ring-1 focus:ring-blue-500 transition-colors text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
            </div>

            {/* TAB SELECTOR: Communication Hub vs Call History */}
            <div className="flex bg-slate-200/55 dark:bg-slate-850/80 p-1 rounded-xl text-[10px] font-black">
              <button 
                onClick={() => {
                  setMainTab('hub');
                  setActiveTab(hubSubTab);
                }}
                className={`flex-1 text-center py-2 rounded-lg transition flex items-center justify-center gap-1.5 relative ${mainTab === 'hub' ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-white shadow-xs' : 'text-slate-400 dark:text-slate-500'}`}
              >
                <span>Communication Hub</span>
                {anyUnviewedStories && (
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                )}
              </button>
              <button 
                onClick={() => {
                  setMainTab('calls');
                  setActiveTab('calls');
                }}
                className={`flex-1 text-center py-2 rounded-lg transition ${mainTab === 'calls' ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-white shadow-xs' : 'text-slate-400 dark:text-slate-500'}`}
              >
                Call History
              </button>
            </div>

            {/* SUB-TABS: Chats vs Groups (only shown when mainTab is 'hub') */}
            {mainTab === 'hub' && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setHubSubTab('chats');
                    setActiveTab('chats');
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${activeTab === 'chats' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-400 hover:bg-slate-200/60'}`}
                >
                  Direct Chats
                </button>
                <button
                  onClick={() => {
                    setHubSubTab('groups');
                    setActiveTab('groups');
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${activeTab === 'groups' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-400 hover:bg-slate-200/60'}`}
                >
                  Community Groups
                </button>
              </div>
            )}
          </div>

          {/* STORIES TRAY (only shown when mainTab is 'hub') */}
          {mainTab === 'hub' && (
            <div className="flex overflow-x-auto gap-4 px-4 py-3 bg-white dark:bg-slate-900/40 border-b border-slate-150 dark:border-slate-850 scrollbar-none shrink-0">
              {/* My story upload circle */}
              <div 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e: any) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadMedia(file, 'stories');
                      if (url) {
                        await addStoryToFirestore({
                          userId: currentUser.id,
                          userFullName: currentUser.fullName,
                          userAvatar: currentUser.avatar,
                          mediaUrl: url,
                          mediaType: 'image',
                          createdAt: new Date().toISOString(),
                        });
                        alert('Story added successfully!');
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  };
                  input.click();
                }}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer space-y-1"
              >
                <div className="w-14 h-14 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 transition relative">
                  <Plus className="w-5 h-5 text-slate-400" />
                  <img src={currentUser.avatar} className="w-5 h-5 rounded-full absolute bottom-0 right-0 border object-cover" />
                </div>
                <span className="text-[10px] text-slate-400 text-center truncate block w-14">
                  Add Story
                </span>
              </div>

              {/* Render dynamic users with stories */}
              {storyUserIds.map(uid => {
                const userStories = groupedStories[uid];
                const firstStory = userStories[0];
                const hasUnviewed = userHasUnviewedStories(uid);
                return (
                  <div 
                    key={uid} 
                    onClick={() => setActiveStoryUserId(uid)}
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer space-y-1 relative"
                  >
                    <div className={`p-[2px] rounded-full transition-transform duration-200 active:scale-95 ${hasUnviewed ? 'bg-gradient-to-tr from-blue-500 via-indigo-500 to-[#1877F2] p-[2.5px] shadow-[0_0_8px_rgba(24,119,242,0.3)]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <div className="bg-white dark:bg-slate-900 rounded-full p-[1px]">
                        <img 
                          src={firstStory.userAvatar} 
                          alt={firstStory.userFullName} 
                          className="w-11 h-11 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                    {hasUnviewed && (
                      <span className="absolute top-0 right-1 w-2.5 h-2.5 bg-blue-500 border border-white dark:border-slate-900 rounded-full" />
                    )}
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono text-center truncate block w-14">
                      @{uid}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex-grow overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 scrollbar-thin">
            
            {/* DIRECT CHATS TAB */}
            {activeTab === 'chats' && (
              <div
                onClick={() => {
                  setActiveChatUserId('rc_assistant');
                  setActiveGroupId(null);
                }}
                className={`flex gap-3 p-3 cursor-pointer transition ${activeChatUserId === 'rc_assistant' && !activeGroupId ? 'bg-indigo-500/10 dark:bg-indigo-950/35 border-l-4 border-indigo-500' : 'hover:bg-slate-100/50 dark:hover:bg-slate-850/50'}`}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md relative overflow-hidden">
                    <span className="text-sm font-black relative z-10 animate-pulse">🤖</span>
                    <div className="absolute inset-0 bg-white/20 animate-ping opacity-25 rounded-full" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 bg-emerald-500" />
                </div>
                <div className="overflow-hidden flex-grow">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                    RC Assistant
                    <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[8px] font-black uppercase bg-indigo-500/10 text-indigo-500 px-1 py-0.5 rounded-sm">Official AI</span>
                  </h5>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-light">
                    Ask me anything! I am online.
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'chats' && chatTargets.map((user) => {
              const lastMsg = getLastMessageInThread(user.id);
              const isActive = activeChatUserId === user.id && !activeGroupId;
              const isOffline = onlineStatusPrivacy === 'nobody' ? true : user.isMock && user.id.charCodeAt(0) % 2 === 0;

              return (
                <div
                  key={user.id}
                  onClick={() => {
                    setActiveChatUserId(user.id);
                    setActiveGroupId(null);
                  }}
                  className={`flex gap-3 p-3 cursor-pointer transition ${isActive ? 'bg-emerald-500/10 dark:bg-emerald-950/35 border-l-4 border-emerald-500' : 'hover:bg-slate-100/50 dark:hover:bg-slate-850/50'}`}
                >
                  <div className="relative">
                    <img 
                      src={user.avatar} 
                      alt={user.fullName} 
                      className="w-9 h-9 rounded-full object-cover border"
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 ${isOffline ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                  </div>
                  <div className="overflow-hidden flex-grow">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                      {user.fullName}
                      {user.isVerified && <BlueVerifiedTick className="w-3.5 h-3.5 shrink-0" />}
                    </h5>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-light">
                      {lastMsg ? lastMsg.text : 'No messages yet. Send a greeting!'}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* GROUPS TAB */}
            {activeTab === 'groups' && groups.map((g) => {
              const isActive = activeGroupId === g.id;
              const lastGroupMsg = g.messages[g.messages.length - 1];

              return (
                <div
                  key={g.id}
                  onClick={() => {
                    setActiveGroupId(g.id);
                    setActiveChatUserId(null);
                  }}
                  className={`flex gap-3 p-3 cursor-pointer transition ${isActive ? 'bg-emerald-500/10 dark:bg-emerald-950/35 border-l-4 border-emerald-500' : 'hover:bg-slate-100/50 dark:hover:bg-slate-850/50'}`}
                >
                  <img 
                    src={g.avatar} 
                    alt={g.name} 
                    className="w-9 h-9 rounded-2xl object-cover border"
                    referrerPolicy="no-referrer"
                  />
                  <div className="overflow-hidden flex-grow">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{g.name}</h5>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-light">
                      {lastGroupMsg ? `${lastGroupMsg.senderName.split(' ')[0]}: ${lastGroupMsg.text}` : 'No group updates yet.'}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* CALL LOGS TAB */}
            {activeTab === 'calls' && (
              <div className="p-2 space-y-2">
                <button 
                  onClick={() => {
                    const friend = users.find(u => u.id !== currentUser.id) || currentUser;
                    setCallLogs(prev => [
                      {
                        id: `c-${Date.now()}`,
                        type: Math.random() > 0.5 ? 'audio' : 'video',
                        direction: 'missed',
                        user: friend,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isRed: true
                      },
                      ...prev
                    ]);
                  }}
                  className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 text-[10px] font-bold text-rose-600 dark:text-rose-450 border border-dashed border-rose-200 dark:border-rose-900 rounded-xl"
                >
                  + Simulate Missed Call Notification
                </button>

                {callLogs.map((log) => (
                  <div 
                    key={log.id}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl flex justify-between items-center gap-2"
                  >
                    <div className="flex gap-2.5 items-center min-w-0">
                      <img src={log.user.avatar} alt="caller" className="w-8 h-8 rounded-full object-cover border" />
                      <div className="min-w-0">
                        <h6 className={`text-[11px] font-bold truncate ${log.isRed ? 'text-rose-600 dark:text-rose-400 font-extrabold animate-pulse' : 'text-slate-700 dark:text-slate-350'}`}>
                          {log.isRed ? 'Missed Call' : log.direction === 'missed' ? 'Missed Call Log' : 'Call Answered'}
                        </h6>
                        <p className="text-[9px] text-slate-400 mt-0.5">{log.timestamp} • {log.user.fullName}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => triggerCallback(log)}
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg cursor-pointer flex items-center justify-center"
                      title="Callback"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

        {/* RIGHT PANEL: ACTIVE CHAT SCREEN */}
        <div className={`w-full md:w-2/3 ${(activeChatUserId || activeGroupId) ? 'flex' : 'hidden md:flex'} flex-col h-full bg-white dark:bg-slate-900 justify-between relative`}>
          
          {/* DIRECT CHAT WRAPPER */}
          {activeChatUserId && (activeTargetUser || activeChatUserId === 'rc_assistant') && !activeGroupId ? (
            <ChatScreen 
              currentUser={currentUser}
              activeChatUserId={activeChatUserId}
              users={users}
              onClose={handleCloseChat}
              onStartCall={onStartCall}
              onViewProfile={onViewProfile}
            />
          ) : activeTargetUser && !activeGroupId && (
            <>
              {/* Direct Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleCloseChat}
                    className="p-1.5 md:hidden hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400 mr-1"
                    title="Back"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5px]" />
                  </button>
                  <img 
                    src={activeTargetUser.avatar} 
                    alt={activeTargetUser.fullName} 
                    className="w-9 h-9 rounded-full object-cover border"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight flex items-center gap-1">
                      {activeTargetUser.fullName}
                      {activeTargetUser.isVerified && <BlueVerifiedTick className="w-4 h-4 shrink-0" />}
                    </h4>
                    <button
                      onClick={() => onViewProfile && onViewProfile(activeTargetUser.id)}
                      className="text-[9px] text-emerald-500 font-semibold mt-0.5 block hover:underline cursor-pointer text-left focus:outline-none"
                      title="View Profile Details"
                    >
                      Tap here for contact info
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <button 
                    onClick={() => onStartCall ? onStartCall('audio', activeTargetUser) : alert("Calling simulation...")} 
                    className={`p-1.5 rounded-lg cursor-pointer transition ${!isUnlocked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    disabled={!isUnlocked}
                    title={isUnlocked ? "Audio Call" : "Audio Call (Unlock Required)"}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onStartCall ? onStartCall('video', activeTargetUser) : alert("Calling video simulation...")} 
                    className={`p-1.5 rounded-lg cursor-pointer transition ${!isUnlocked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    disabled={!isUnlocked}
                    title={isUnlocked ? "Video Call" : "Video Call (Unlock Required)"}
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message Request Inline Actions/Banners */}
              {incomingRequest && incomingRequest.status === 'pending' && (
                <div className="bg-amber-50/90 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-900/40 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-250 animate-slideDown z-20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span><span className="font-bold">{activeTargetUser.fullName}</span> has sent you a message request.</span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={async () => {
                        try {
                          await updateMessageRequestStatusInFirestore(incomingRequest.id, 'accepted', activeTargetUser.id, currentUser.id, currentUser.fullName, currentUser.avatar);
                        } catch (err) {
                          console.error("Error accepting request:", err);
                          alert("Failed to accept request.");
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-extrabold transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Check className="w-3 h-3" /> Accept
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await updateMessageRequestStatusInFirestore(incomingRequest.id, 'declined');
                        } catch (err) {
                          console.error("Error declining request:", err);
                          alert("Failed to decline request.");
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-extrabold transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <X className="w-3 h-3" /> Decline
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await updateMessageRequestStatusInFirestore(incomingRequest.id, 'blocked', activeTargetUser.id, currentUser.id);
                        } catch (err) {
                          console.error("Error blocking user:", err);
                          alert("Failed to block user.");
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 rounded-xl text-[10px] font-extrabold transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      Block
                    </button>
                  </div>
                </div>
              )}

              {!isUnlocked && (!incomingRequest || incomingRequest.status !== 'pending') && (
                <div className="bg-amber-50/80 dark:bg-amber-950/15 border-b border-amber-200/50 dark:border-amber-900/40 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-250 animate-slideDown z-20">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span><span className="font-semibold">{activeTargetUser.fullName}</span> doesn't follow you yet. Send a request to start chatting.</span>
                </div>
              )}

              {/* Chat thread space with theme wallpaper */}
              <div className={`flex-grow p-4 overflow-y-auto space-y-4 scrollbar-thin ${getThemeWallpaperClass()}`}>
                {conversationMessages.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">Start of conversation</h5>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto font-light">
                      Send a polite greeting to start chatting with {activeTargetUser.fullName}.
                    </p>
                  </div>
                ) : (
                  conversationMessages.map((msg, idx) => {
                    const isMyMsg = msg.senderId === currentUser.id;
                    const isLastMsg = idx === conversationMessages.length - 1;
                    return (
                      <div 
                        key={msg.id}
                        className={`flex gap-2 items-start ${isMyMsg ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMyMsg && (
                          <img 
                            src={activeTargetUser.avatar} 
                            alt="avatar" 
                            className="w-6 h-6 rounded-full object-cover border mt-1"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="max-w-[75%]">
                          <div className={`px-3.5 py-2 rounded-2xl shadow-sm text-xs ${isMyMsg ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/40 dark:border-slate-800'}`}>
                            <p className="leading-relaxed font-light whitespace-pre-line">{msg.text}</p>
                          </div>
                          
                          <div className={`flex items-center gap-1.5 mt-1 text-[8px] text-slate-450 ${isMyMsg ? 'justify-end' : 'justify-start'}`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMyMsg && (
                              <span className="flex items-center gap-0.5 text-blue-500 font-bold">
                                <span>Seen</span> <Eye className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input area with custom attachments bar */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                {isUnlocked ? (
                  <form onSubmit={handleSend} className="flex gap-2 items-center">
                    
                    {/* Plus Icon Trigger for Gallery/Camera/Polls/Events */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                        className={`p-2.5 rounded-xl transition ${isToolbarOpen ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-slate-850 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-750'} cursor-pointer`}
                        title="Attach options"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
  
                      {/* Chat Toolbar overlay dropdown */}
                      {isToolbarOpen && (
                        <div className="absolute left-0 bottom-14 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer text-slate-700 dark:text-slate-255"
                          >
                            <ImageIcon className="w-4 h-4 text-emerald-500" />
                            <span>Gallery (Photo)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer text-slate-700 dark:text-slate-255"
                          >
                            <Camera className="w-4 h-4 text-blue-500" />
                            <span>Camera Capture</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatePollOpen(true);
                              setIsToolbarOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer text-slate-700 dark:text-slate-255"
                            disabled={!activeGroupId}
                            title={!activeGroupId ? 'Polls only available in groups' : ''}
                          >
                            <BarChart3 className="w-4 h-4 text-amber-500" />
                            <span className={!activeGroupId ? 'opacity-40' : ''}>Create Poll</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreateEventOpen(true);
                              setIsToolbarOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer text-slate-700 dark:text-slate-255"
                            disabled={!activeGroupId}
                            title={!activeGroupId ? 'Events only available in groups' : ''}
                          >
                            <Calendar className="w-4 h-4 text-purple-500" />
                            <span className={!activeGroupId ? 'opacity-40' : ''}>Create Event</span>
                          </button>
                        </div>
                      )}
                    </div>
  
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={`Write message to ${activeTargetUser.fullName.split(' ')[0]}...`}
                      className="flex-grow text-xs bg-slate-100 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700 outline-none rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-3 rounded-xl shadow transition duration-150 cursor-pointer flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center space-y-3.5">
                    {outgoingRequest?.status === 'pending' ? (
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-350 rounded-2xl text-xs font-extrabold shadow-sm">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span>Message Request Sent</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-1.5">Waiting for {activeTargetUser.fullName} to accept your request.</p>
                      </div>
                    ) : (
                      <div className="w-full max-w-sm space-y-3">
                        <p className="text-[10px] text-slate-450 dark:text-slate-350 font-bold">You cannot start the conversation directly until they accept your request.</p>
                        <button
                          type="button"
                          onClick={handleSendMessageRequest}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black transition active:scale-98 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>Send Message Request</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* COMMUNITY GROUP WRAPPER */}
          {activeGroup && !activeChatUserId && (
            <div className="flex h-full">
              
              {/* GROUP MAIN CHAT SCREEN AREA */}
              <div className="flex-grow flex flex-col h-full justify-between border-r border-slate-100 dark:border-slate-850">
                {/* Group Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleCloseChat}
                      className="p-1.5 md:hidden hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400 mr-1"
                      title="Back"
                    >
                      <ChevronLeft className="w-5 h-5 stroke-[2.5px]" />
                    </button>
                    <img 
                      src={activeGroup.avatar} 
                      alt={activeGroup.name} 
                      className="w-9 h-9 rounded-xl object-cover border"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{activeGroup.name}</h4>
                      <span className="text-[9px] text-slate-400 font-bold mt-0.5 block">{activeGroup.members.length} group members</span>
                    </div>
                  </div>
                  <button onClick={() => setShowGroupSettings(true)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition">
                    <MoreVertical className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {/* Group Settings Modal */}
                {showGroupSettings && (
                  <GroupInfoSettings
                    group={activeGroup}
                    onClose={() => setShowGroupSettings(false)}
                    onUpdateGroup={(updated) => {
                      setGroups(groups.map(g => g.id === updated.id ? updated : g));
                    }}
                    onDeleteGroup={() => {
                        setGroups(groups.filter(g => g.id !== activeGroup.id));
                        setShowGroupSettings(false);
                        setActiveGroupId(null);
                    }}
                    onLeaveGroup={() => {
                        // Implement leave logic
                        alert('You left the group!');
                        setShowGroupSettings(false);
                    }}
                  />
                )}

                {/* Group messages layout */}
                <div className={`flex-grow p-4 overflow-y-auto space-y-4 scrollbar-thin ${getThemeWallpaperClass()}`}>
                  {activeGroup.messages.map((msg) => {
                    const isMyMsg = msg.senderId === currentUser.id;
                    return (
                      <div 
                        key={msg.id}
                        className={`flex gap-2.5 items-start ${isMyMsg ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMyMsg && (
                          <img 
                            src={msg.senderAvatar} 
                            alt="sender avatar" 
                            className="w-7 h-7 rounded-full object-cover border mt-1"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="max-w-[80%] space-y-1">
                          {!isMyMsg && (
                            <span className="text-[9px] font-black text-slate-400 block px-0.5">
                              {msg.senderName}
                            </span>
                          )}
                          
                          <div className={`px-3.5 py-2.5 rounded-2xl shadow-xs text-xs space-y-3 ${isMyMsg ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/40 dark:border-slate-800'}`}>
                            <p className="leading-relaxed font-light whitespace-pre-line">{msg.text}</p>
                            
                            {/* Render Attachment Photo if available */}
                            {msg.attachmentUrl && (
                              <div className="rounded-xl overflow-hidden border border-white/10 shadow-md">
                                <FullScreenImageViewer imageUrl={msg.attachmentUrl!}>
                                  <img src={msg.attachmentUrl} alt="sent attach" className="max-w-full h-32 object-cover cursor-pointer" />
                                </FullScreenImageViewer>
                              </div>
                            )}

                            {/* Render Poll Choice Box if available */}
                            {msg.poll && (
                              <div className="bg-white/10 dark:bg-black/15 p-3 rounded-xl border border-white/5 space-y-2.5 text-slate-100 text-[11px]">
                                <h5 className="font-extrabold flex items-center gap-1">
                                  <BarChart3 className="w-3.5 h-3.5 text-amber-400" /> {msg.poll.question}
                                </h5>
                                <div className="space-y-1.5">
                                  {msg.poll.options.map((opt, optIdx) => {
                                    const totalVotes = msg.poll!.options.reduce((acc, current) => acc + current.votes.length, 0);
                                    const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                                    const hasVoted = opt.votes.includes(currentUser.id);

                                    return (
                                      <div 
                                        key={optIdx}
                                        onClick={() => handleVotePoll(msg.id, optIdx)}
                                        className={`p-2 rounded-lg cursor-pointer flex justify-between items-center relative overflow-hidden border ${hasVoted ? 'bg-[#1877F2]/20 border-[#1877F2]' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}
                                      >
                                        <div className="absolute left-0 top-0 bottom-0 bg-[#1877F2]/10 transition-all duration-300 pointer-events-none" style={{ width: `${pct}%` }} />
                                        <span className="font-bold relative z-10">{opt.text}</span>
                                        <span className="text-[9px] font-mono font-bold relative z-10 text-slate-355">{pct}% ({opt.votes.length} votes)</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Render Event Card if available */}
                            {msg.event && (
                              <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 text-slate-800 dark:text-slate-200 space-y-3">
                                <div className="flex gap-2.5 items-start">
                                  <div className="p-2 bg-[#1877F2]/15 text-[#1877F2] rounded-xl">
                                    <Calendar className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-black leading-tight">{msg.event.title}</h5>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{msg.event.date} • {msg.event.location}</p>
                                  </div>
                                </div>

                                {msg.event.description && (
                                  <p className="text-[10px] text-slate-400 leading-normal font-light italic">"{msg.event.description}"</p>
                                )}

                                <div className="pt-2 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center text-[9px] font-bold">
                                  <span>RSVP Status:</span>
                                  <div className="flex gap-1">
                                    {(['going', 'interested', 'not_going'] as const).map((rsvp) => {
                                      const label = rsvp === 'going' ? 'Going' : rsvp === 'interested' ? 'Interested' : 'Decline';
                                      const isSelected = msg.event!.rsvps[currentUser.id] === rsvp;
                                      return (
                                        <button
                                          key={rsvp}
                                          onClick={() => handleRsvpEvent(msg.id, rsvp)}
                                          className={`px-2 py-1 rounded-md transition border ${isSelected ? 'bg-[#1877F2] border-transparent text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                          
                          <div className={`flex items-center gap-1 text-[8px] text-slate-450 ${isMyMsg ? 'justify-end' : 'justify-start'}`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Group Chat Input Area */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <form onSubmit={handleSend} className="flex gap-2 items-center">
                    
                    {/* Toolbar button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                        className={`p-2.5 rounded-xl transition ${isToolbarOpen ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-slate-850 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-750'} cursor-pointer`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      {/* Dropdown with all four toolbar options */}
                      {isToolbarOpen && (
                        <div className="absolute left-0 bottom-14 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer text-slate-700 dark:text-slate-255"
                          >
                            <ImageIcon className="w-4 h-4 text-[#1877F2]" />
                            <span>Gallery (Photo)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer text-slate-700 dark:text-slate-255"
                          >
                            <Camera className="w-4 h-4 text-blue-500" />
                            <span>Camera Capture</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatePollOpen(true);
                              setIsToolbarOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer text-slate-700 dark:text-slate-255"
                          >
                            <BarChart3 className="w-4 h-4 text-amber-500" />
                            <span>Create Poll</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreateEventOpen(true);
                              setIsToolbarOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer text-slate-700 dark:text-slate-255"
                          >
                            <Calendar className="w-4 h-4 text-purple-500" />
                            <span>Create Event</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={`Post update to group "${activeGroup.name}"...`}
                      className="flex-grow text-xs bg-slate-100 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700 outline-none rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:border-[#1877F2]"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="bg-[#1877F2] hover:bg-[#1877F2]/90 disabled:opacity-40 text-white p-3 rounded-xl shadow transition duration-150 cursor-pointer flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>

              {/* GROUP SIDE INFORMATION BAR: MEMBERS DIRECTORY LIST */}
              <div className="w-48 bg-slate-50 dark:bg-slate-950/20 p-3 h-full flex flex-col justify-between overflow-y-auto border-l border-slate-100 dark:border-slate-850">
                <div className="space-y-4">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Group Directory</h5>
                  </div>
                  
                  <div className="space-y-3">
                    {activeGroup.members.map((member) => (
                      <div 
                        key={member.userId}
                        className="flex items-center gap-2 relative"
                      >
                        <img src={member.avatar} alt="avatar" className="w-7 h-7 rounded-full object-cover border" />
                        <div className="min-w-0 flex-grow">
                          {/* Clicking the name triggers the admin sub-menu or redirect */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              // Toggle Member Context sub-menu (Admins can perform Make Admin/Remove/etc)
                              const rect = e.currentTarget.getBoundingClientRect();
                              setSelectedMemberMenu({
                                userId: member.userId,
                                x: Math.min(rect.left - 150, window.innerWidth - 180),
                                y: rect.top - 80
                              });
                            }}
                            className="text-[10px] font-extrabold text-slate-750 dark:text-slate-200 truncate hover:text-[#1877F2] flex items-center gap-1 text-left w-full transition"
                          >
                            {member.fullName}
                            {users.find(u => u.id === member.userId)?.isVerified && <BlueVerifiedTick className="w-3 h-3 shrink-0" />}
                          </button>
                          <span className="text-[8px] text-slate-400 block font-mono">
                            {member.role === 'admin' ? '🛡️ Admin' : 'Member'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-menu Context panel for clicked member */}
                {selectedMemberMenu && (
                  <div 
                    className="fixed w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-55 p-1 animate-fadeIn text-[10px] font-bold space-y-1"
                    style={{ left: `${selectedMemberMenu.x}px`, top: `${selectedMemberMenu.y}px` }}
                  >
                    <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-850 text-[9px] text-slate-450 uppercase tracking-widest">
                      Member Actions
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGroupMemberAction('view', selectedMemberMenu.userId)}
                      className="w-full text-left px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-slate-755 dark:text-slate-255"
                    >
                      View Profile
                    </button>

                    {/* Admin permissions toggle options */}
                    {activeGroup.adminId === currentUser.id && selectedMemberMenu.userId !== currentUser.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleGroupMemberAction('make-admin', selectedMemberMenu.userId)}
                          className="w-full text-left px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-slate-755 dark:text-slate-255"
                        >
                          Make Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupMemberAction('remove', selectedMemberMenu.userId)}
                          className="w-full text-left px-2 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/25 text-rose-600 dark:text-rose-400 rounded-lg"
                        >
                          Remove Member
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleGroupMemberAction('report', selectedMemberMenu.userId)}
                      className="w-full text-left px-2 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/25 text-amber-600 dark:text-amber-400 rounded-lg"
                    >
                      Report Member
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMemberMenu(null)}
                      className="w-full text-center px-2 py-1 text-slate-400 hover:text-slate-600 border-t border-slate-100 dark:border-slate-850"
                    >
                      Close Menu
                    </button>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[8px] text-slate-400 text-center leading-normal">
                    Admins can click any member's name to promote, ban, or inspect profile.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* CHAT EMPTY PLACEHOLDER */}
          {!activeChatUserId && !activeGroupId && (
            <div className="flex flex-col justify-center items-center h-full p-4 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No chat selected</h4>
              <p className="text-xs text-slate-450 mt-1">Select a connection thread or community group to begin collaborating.</p>
            </div>
          )}

        </div>

      </div>


      {/* FULL SCREEN IMAGE VIEWER */}
      {/* Removed viewingImage state usage */}

      {/* End-to-End Encrypted Banner */}
      <div className="w-full text-center py-1 opacity-40 select-none pointer-events-none text-[8px] text-slate-400 dark:text-slate-500 font-bold z-10">
        🔒 End-to-end encrypted
      </div>

      {/* -----------------------------------------------------------------
          12. OVERLAYS & SIMULATION DIALOGS
          ----------------------------------------------------------------- */}

      {/* CREATE GROUP MODAL */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Create Community Group</h3>
              <button onClick={() => setIsCreateGroupOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Group Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Rohingya Food Security Committee"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-700 outline-none rounded-xl px-3.5 py-3 text-slate-800 dark:text-slate-200 focus:border-[#1877F2]"
                />
              </div>

              {/* Members search list */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Add Members</label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search connected friends..."
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    className="w-full text-[11px] pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border rounded-xl outline-none"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto divide-y border rounded-xl p-1 bg-slate-50/50 dark:bg-slate-950/20">
                  {chatTargets.filter(u => u.fullName.toLowerCase().includes(groupSearchQuery.toLowerCase())).map((user) => {
                    const isSelected = selectedGroupMembers.includes(user.id);
                    return (
                      <div 
                        key={user.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedGroupMembers(prev => prev.filter(id => id !== user.id));
                          } else {
                            setSelectedGroupMembers(prev => [...prev, user.id]);
                          }
                        }}
                        className="flex items-center justify-between p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-850 transition rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <img src={user.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover border" />
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-255 flex items-center gap-1">
                            {user.fullName}
                            {user.isVerified && <BlueVerifiedTick className="w-3 h-3 shrink-0" />}
                          </span>
                        </div>
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#1877F2] border-transparent text-white' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreateGroupOpen(false)} 
                  className="px-4 py-2 text-xs font-bold text-slate-450 hover:text-slate-650"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-extrabold text-xs rounded-xl shadow transition"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHATWALLPAPER & ONLINE STATUS SETTINGS MODAL */}
      {isChatSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Chat Settings & Theme</h3>
              <button onClick={() => setIsChatSettingsOpen(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            {/* Privacy selection */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Who can see when I am online</h4>
              <div className="space-y-1.5">
                {[
                  { key: 'everyone', label: 'Everyone (Public)' },
                  { key: 'contacts', label: 'My contacts only' },
                  { key: 'nobody', label: 'Nobody (Private mode)' }
                ].map((opt) => {
                  const isSelected = onlineStatusPrivacy === opt.key;
                  return (
                    <div
                      key={opt.key}
                      onClick={() => {
                        setOnlineStatusPrivacy(opt.key as any);
                        localStorage.setItem('rc_online_privacy', opt.key);
                      }}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/25 border rounded-xl cursor-pointer transition text-xs font-bold"
                    >
                      <span className="text-slate-700 dark:text-slate-200">{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-500 stroke-[3px]" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Theme picker selection */}
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chat Wallpapers Theme</h4>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-black">
                {[
                  { code: 'local', label: 'Local Theme (Default)', color: 'bg-slate-100' },
                  { code: 'sunset', label: 'Sunset Glow', color: 'bg-rose-100 dark:bg-rose-950/20' },
                  { code: 'ocean', label: 'Ocean Tide', color: 'bg-cyan-100 dark:bg-cyan-950/20' },
                  { code: 'forest', label: 'Facebook Blue', color: 'bg-blue-100 dark:bg-blue-950/20' }
                ].map((theme) => {
                  const isSelected = chatTheme === theme.code;
                  return (
                    <div
                      key={theme.code}
                      onClick={() => {
                        setChatTheme(theme.code as any);
                        localStorage.setItem('rc_chat_theme', theme.code);
                      }}
                      className={`p-3 border rounded-xl cursor-pointer text-center space-y-1 transition ${isSelected ? 'border-[#1877F2] bg-[#1877F2]/10' : 'border-slate-200'}`}
                    >
                      <div className={`w-6 h-6 mx-auto rounded-full ${theme.color} border`} />
                      <span className="block text-slate-700 dark:text-slate-300 truncate">{theme.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button 
                onClick={() => setIsChatSettingsOpen(false)} 
                className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-black text-xs rounded-xl"
              >
                Apply preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE POLL OVERLAY */}
      {isCreatePollOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Create Poll</h3>
              <button onClick={() => setIsCreatePollOpen(false)} className="text-slate-400 hover:text-slate-650"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Poll Question</label>
                <input 
                  type="text"
                  placeholder="e.g. What is our focus for next distribution campaign?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-850 border rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase">Choices Options</label>
                {pollOptions.map((opt, idx) => (
                  <input 
                    key={idx}
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[idx] = e.target.value;
                      setPollOptions(updated);
                    }}
                    className="w-full text-[11px] p-2 bg-slate-50 dark:bg-slate-850 border rounded-lg outline-none"
                  />
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setIsCreatePollOpen(false)} className="text-xs text-slate-450 font-bold px-3 py-1.5">Cancel</button>
              <button 
                onClick={handleCreatePoll}
                className="px-4 py-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white text-xs font-black rounded-xl"
                disabled={!pollQuestion.trim()}
              >
                Post Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EVENT OVERLAY */}
      {isCreateEventOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Create Group Event</h3>
              <button onClick={() => setIsCreateEventOpen(false)} className="text-slate-400 hover:text-slate-650"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Event Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rohingya Literacy Volunteer Meeting"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-850 border rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Date & Time</label>
                <input 
                  type="text" 
                  placeholder="e.g. July 12, 2026 at 4:00 PM"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-850 border rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Location / Boundary Coordinates</label>
                <input 
                  type="text" 
                  placeholder="e.g. Kutupalong Camp Block D-4 Center"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-850 border rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Brief Description (Optional)</label>
                <textarea 
                  rows={2}
                  placeholder="Briefly explain goals, items to bring, etc."
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-850 border rounded-xl outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setIsCreateEventOpen(false)} className="text-xs text-slate-450 font-bold px-3 py-1.5">Cancel</button>
              <button 
                onClick={handleCreateEvent}
                className="px-4 py-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white text-xs font-black rounded-xl animate-scaleUp"
                disabled={!eventTitle.trim() || !eventDate || !eventLocation}
              >
                Publish Event
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ACTIVE CALL OVERLAY */}
      {activeCallSim && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-55 flex flex-col justify-between p-8 text-white text-center">
          <div className="pt-16 space-y-3">
            <div className="w-24 h-24 rounded-full border-2 border-[#1877F2] overflow-hidden shadow-2xl mx-auto p-1 bg-slate-800">
              <img src={activeCallSim.user.avatar} alt="caller" className="w-full h-full object-cover rounded-full" />
            </div>
            <div>
              <h3 className="text-base font-black leading-tight">{activeCallSim.user.fullName}</h3>
              <p className="text-xs text-[#1877F2] mt-1 font-mono font-bold tracking-wider capitalize animate-pulse">
                {activeCallSim.status === 'ringing' ? '☎️ Ringing...' : '🟢 Connected (Secure Line)'}
              </p>
            </div>
          </div>

          {activeCallSim.type === 'video' && activeCallSim.status === 'connected' && (
            <div className="w-full max-w-sm h-48 bg-slate-900 rounded-3xl mx-auto border border-slate-800 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-cover bg-center opacity-70" style={{ backgroundImage: `url(${activeCallSim.user.avatar})` }} />
              <div className="absolute bottom-3 right-3 w-20 h-28 bg-slate-950 rounded-lg border overflow-hidden">
                <img src={currentUser.avatar} alt="my view" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className="pb-16 space-y-4">
            <p className="text-[10px] text-slate-500 max-w-xs mx-auto font-mono">
              CALL_ID: SECURE_ROHINGYA_CONN_SSL_ON
            </p>

            <button 
              onClick={() => setActiveCallSim(null)}
              className="bg-rose-600 hover:bg-rose-500 p-4 rounded-full text-white cursor-pointer mx-auto shadow-lg flex items-center justify-center h-12 w-12 transition transform active:scale-90"
              title="End Call"
            >
              <X className="w-6 h-6 stroke-[3px]" />
            </button>
          </div>
        </div>
      )}

      {activeStoryUserId && (
        <StoryViewer 
          userId={activeStoryUserId} 
          onClose={() => setActiveStoryUserId(null)} 
          stories={groupedStories[activeStoryUserId] || []}
        />
      )}

    </div>
  );
}
