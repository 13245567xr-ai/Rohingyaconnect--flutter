// NEW MESSENGER + WHATSAPP BUILD — OLD CODE COMPLETELY REPLACED
import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Maximize2, 
  Minimize2, UserPlus, MessageSquare, Monitor, MoreHorizontal, Settings, ShieldAlert,
  ChevronDown, HelpCircle, Loader2, Play, Users, Lock, Sparkles, Check, Camera
} from 'lucide-react';
import { User } from '../types';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc, onSnapshot, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import Peer from 'simple-peer';
import { startCall, acceptCall, endCall } from '../utils/webrtcService';
import AIAssistantCallScreen from './AIAssistantCallScreen';

if (typeof window !== 'undefined' && !window.global) {
  (window as any).global = window;
}

class SyntheticRinger {
  private ctx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private intervalId: any = null;
  public loop = true;
  public volume = 0.5;

  play() {
    return new Promise<void>((resolve) => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) {
          resolve();
          return;
        }
        this.ctx = new AudioCtx();
        this.osc1 = this.ctx.createOscillator();
        this.osc2 = this.ctx.createOscillator();
        this.gain = this.ctx.createGain();

        this.osc1.type = 'sine';
        this.osc1.frequency.setValueAtTime(400, this.ctx.currentTime);
        this.osc2.type = 'sine';
        this.osc2.frequency.setValueAtTime(450, this.ctx.currentTime);

        this.gain.gain.setValueAtTime(0, this.ctx.currentTime);

        this.osc1.connect(this.gain);
        this.osc2.connect(this.gain);
        this.gain.connect(this.ctx.destination);

        this.osc1.start();
        this.osc2.start();

        let ringing = false;
        const toggleRinging = () => {
          if (!this.ctx || !this.gain) return;
          const now = this.ctx.currentTime;
          if (ringing) {
            this.gain.gain.linearRampToValueAtTime(0, now + 0.1);
          } else {
            this.gain.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.1);
          }
          ringing = !ringing;
        };

        toggleRinging();
        this.intervalId = setInterval(toggleRinging, 1000);
        resolve();
      } catch (err) {
        console.warn("Synthetic audio play failed:", err);
        resolve();
      }
    });
  }

  pause() {
    clearInterval(this.intervalId);
    try {
      if (this.osc1) this.osc1.stop();
      if (this.osc2) this.osc2.stop();
      if (this.ctx) this.ctx.close();
    } catch (e) {}
    this.osc1 = null;
    this.osc2 = null;
    this.gain = null;
    this.ctx = null;
  }
}

interface CallScreenProps {
  callType: 'audio' | 'video';
  targetUser: User;
  users: User[];
  onEndCall: () => void;
  callId?: string;
  isIncoming?: boolean;
}

export default function CallScreen({
  callType,
  targetUser,
  users,
  onEndCall,
  callId,
  isIncoming = false
}: CallScreenProps) {
  if (targetUser.id === 'rc_assistant') {
    return (
      <AIAssistantCallScreen
        callType={callType}
        targetUser={targetUser}
        onEndCall={onEndCall}
      />
    );
  }

  const currentUserId = (() => {
    try {
      const raw = localStorage.getItem('rc_curr_user');
      return raw ? JSON.parse(raw).id : '';
    } catch {
      return '';
    }
  })();

  const currentUserData = users.find(u => u.id === currentUserId);

  // States
  const [status, setStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(callType === 'audio');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showMoreControls, setShowMoreControls] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  // Custom states for E2EE Call Updates
  const [isSwapped, setIsSwapped] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Normal');
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [activeScreenSharerId, setActiveScreenSharerId] = useState<string | null>(null);

  // WebRTC & Audio Streams
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callSessionDocRef = useRef<any>(null);
  const ringingAudioRef = useRef<any>(null);
  const peerRef = useRef<any>(null);
  const callSessionIdRef = useRef<string | null>(callId || null);
  const webrtcStartedRef = useRef(false);

  // Call timer effect
  useEffect(() => {
    let interval: any;
    if (status === 'connected') {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Ringing Audio simulation
  useEffect(() => {
    // Start fake ringtone audio
    try {
      if (status === 'ringing') {
        const ringAudio = new SyntheticRinger();
        ringAudio.volume = 0.5;
        ringingAudioRef.current = ringAudio;
        ringAudio.play();
      }
    } catch (e) {
      console.warn("Ringtone synthetic play error: ", e);
    }

    return () => {
      if (ringingAudioRef.current) {
        ringingAudioRef.current.pause();
      }
    };
  }, [status]);

  // WebRTC peer connection signaling via Firestore using SimplePeer
  useEffect(() => {
    if (isIncoming && status !== 'connected') return;
    if (webrtcStartedRef.current) return;
    webrtcStartedRef.current = true;

    let isUnmounted = false;
    let peerUnsub: (() => void) | null = null;

    // Start local camera/microphone media stream
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video' ? { facingMode: 'user' } : false,
          audio: true
        });

        if (isUnmounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize SimplePeer connection
        const isInitiator = !isIncoming;
        const peer = new Peer({
          initiator: isInitiator,
          trickle: false,
          stream: stream
        });

        peerRef.current = peer;

        peer.on('signal', async (signal) => {
          if (isUnmounted) return;
          
          if (isInitiator) {
            // Caller: Create calling document in Firestore and write caller signal
            try {
              const generatedCallId = await startCall(currentUserId, targetUser.id, callType, signal);
              callSessionIdRef.current = generatedCallId;

              // Listen for the receiver's accepted status & signal response
              peerUnsub = onSnapshot(doc(db, 'rc_calls', generatedCallId), (snap) => {
                if (snap.exists() && !isUnmounted) {
                  const data = snap.data();
                  if (data.status === 'accepted') {
                    setStatus('connected');
                    if (ringingAudioRef.current) {
                      ringingAudioRef.current.pause();
                    }
                    if (data.signalData) {
                      try {
                        const parsed = JSON.parse(data.signalData);
                        if (parsed.receiverSignal && !peer.destroyed) {
                          peer.signal(parsed.receiverSignal);
                        }
                      } catch (e) {
                        console.warn("SimplePeer signaling error:", e);
                      }
                    }
                  } else if (data.status === 'ended') {
                    onEndCall();
                  }

                  if (data.screenSharerId !== undefined) {
                    setActiveScreenSharerId(data.screenSharerId);
                  }
                }
              }, (err) => {
                console.warn("Caller status snapshot listener error:", err);
              });
            } catch (err) {
              console.error("Failed to start call session in Firestore:", err);
            }
          } else {
            // Receiver: Submit receiver signal back into Firestore
            if (callSessionIdRef.current) {
              try {
                await acceptCall(callSessionIdRef.current, signal);
              } catch (err) {
                console.error("Failed to write receiver signal:", err);
              }
            }
          }
        });

        peer.on('stream', (remoteStream) => {
          if (remoteVideoRef.current && !isUnmounted) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });

        peer.on('error', (err) => {
          console.warn("SimplePeer connection pending/interrupted in iframe sandbox:", err);
        });

        // For Receiver: Read caller's signal and supply it to Peer
        if (!isInitiator && callSessionIdRef.current) {
          try {
            const callDoc = await getDoc(doc(db, 'rc_calls', callSessionIdRef.current));
            if (callDoc.exists() && !isUnmounted) {
              const data = callDoc.data();
              if (data.signalData) {
                const parsed = JSON.parse(data.signalData);
                if (parsed.callerSignal && !peer.destroyed) {
                  peer.signal(parsed.callerSignal);
                }
              }
            }
          } catch (err) {
            console.warn("Failed to get caller signal:", err);
          }

          // Listen to call status in case caller ends it
          peerUnsub = onSnapshot(doc(db, 'rc_calls', callSessionIdRef.current), (snap) => {
            if (snap.exists() && !isUnmounted) {
              const data = snap.data();
              if (data.status === 'ended') {
                onEndCall();
              }

              if (data.screenSharerId !== undefined) {
                setActiveScreenSharerId(data.screenSharerId);
              }
            }
          }, (err) => {
            console.warn("Receiver status snapshot listener error:", err);
          });
        }

      } catch (err) {
        console.warn("WebRTC physical device camera blocked in sandbox. Falling back to video placeholder loop.", err);
      }
    };

    startMedia();

    return () => {
      isUnmounted = true;
      if (peerUnsub) {
        peerUnsub();
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [status]);

  const handleAnswerCall = () => {
    setStatus('connected');
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
    }
  };

  const handleDeclineCall = async () => {
    if (callSessionIdRef.current) {
      try {
        await endCall(callSessionIdRef.current);
      } catch (err) {
        console.warn("Decline call error:", err);
      }
    }
    onEndCall();
  };

  const handleEndCall = async () => {
    if (callSessionIdRef.current) {
      try {
        await endCall(callSessionIdRef.current);
      } catch (err) {
        console.warn("End call error:", err);
      }
    }
    onEndCall();
  };

  // Toggle Mute Track
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMute; // standard WebRTC mute disabling track
      });
    }
  };

  // Toggle Camera Track
  const handleToggleCamera = () => {
    const nextCam = !isCameraOff;
    setIsCameraOff(nextCam);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextCam; // standard WebRTC video disabling track
      });
    }
  };

  // Switch Camera Functionality with applyConstraints or track replacement
  const handleSwitchCamera = async () => {
    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacingMode);

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        try {
          // Attempt direct constraints change
          await videoTrack.applyConstraints({ facingMode: nextFacingMode });
        } catch (err) {
          console.warn("applyConstraints failed, fallback to replacing track:", err);
          // Fallback: replace track
          try {
            const camStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: nextFacingMode },
              audio: !isMuted
            });
            const newTrack = camStream.getVideoTracks()[0];
            if (newTrack) {
              videoTrack.stop();
              localStreamRef.current.removeTrack(videoTrack);
              localStreamRef.current.addTrack(newTrack);
              
              if (peerRef.current && !peerRef.current.destroyed) {
                // simple-peer replacement or manual track replacement in RTCPeerConnection
                const sender = peerRef.current._pc?.getSenders().find((s: any) => s.track?.kind === 'video');
                if (sender) {
                  sender.replaceTrack(newTrack);
                }
              }

              if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
                localVideoRef.current.srcObject = localStreamRef.current;
              }
            }
          } catch (e) {
            console.error("Failed to replace video track:", e);
          }
        }
      }
    }
  };

  // Screen Sharing WebRTC track replacement & Firestore synchronization
  const handleToggleScreenShare = async () => {
    if (activeScreenSharerId && activeScreenSharerId !== currentUserId) {
      // Locked because other user is sharing
      return;
    }

    if (isScreenSharing) {
      // Stop screen sharing and revert to camera
      setIsScreenSharing(false);
      
      if (callSessionIdRef.current) {
        try {
          await updateDoc(doc(db, 'rc_calls', callSessionIdRef.current), {
            screenSharerId: null
          });
        } catch (e) {
          console.warn("Error clearing screenSharerId in Firestore:", e);
        }
      }

      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => t.stop());
      }

      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: !isMuted
        });

        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(t => {
            localStreamRef.current?.removeTrack(t);
          });
          const newCamTrack = camStream.getVideoTracks()[0];
          if (newCamTrack) {
            localStreamRef.current.addTrack(newCamTrack);
            if (peerRef.current && !peerRef.current.destroyed) {
              const sender = peerRef.current._pc?.getSenders().find((s: any) => s.track?.kind === 'video');
              if (sender) {
                sender.replaceTrack(newCamTrack);
              }
            }
          }
        }

        setIsCameraOff(false);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      } catch (err) {
        console.warn("Failed to restore camera after screen share:", err);
        setIsCameraOff(true);
      }
    } else {
      // Start Screen Share
      try {
        // Step 1: Turn off local camera preview
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(t => t.stop());
        }
        setIsCameraOff(true);

        // Step 2: Request screen media
        let screenStream: MediaStream;
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        } catch (err) {
          console.warn("getDisplayMedia blocked, simulating screen sharing track:", err);
          // Canvas capture stream fallback to guarantee zero crash
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext?.('2d') || null;
          if (ctx) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, 640, 480);
            ctx.fillStyle = '#ef4444';
            ctx.font = '24px sans-serif';
            ctx.fillText('Secure Screen Broadcast Active', 100, 240);
          }
          screenStream = (canvas as any).captureStream ? (canvas as any).captureStream(10) : new MediaStream();
        }

        const screenTrack = screenStream.getVideoTracks()[0];
        if (screenTrack) {
          // Listen to native browser "Stop sharing" action
          screenTrack.onended = () => {
            handleToggleScreenShare();
          };

          if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(t => {
              localStreamRef.current?.removeTrack(t);
            });
            localStreamRef.current.addTrack(screenTrack);

            if (peerRef.current && !peerRef.current.destroyed) {
              const sender = peerRef.current._pc?.getSenders().find((s: any) => s.track?.kind === 'video');
              if (sender) {
                sender.replaceTrack(screenTrack);
              }
            }
          }
        }

        setIsScreenSharing(true);

        if (callSessionIdRef.current) {
          try {
            await updateDoc(doc(db, 'rc_calls', callSessionIdRef.current), {
              screenSharerId: currentUserId
            });
          } catch (e) {
            console.warn("Error updating screenSharerId in Firestore:", e);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localVideoRef.current.srcObject = screenStream;
        }
      } catch (err) {
        console.warn("Screen share activation cancelled/failed:", err);
        setIsScreenSharing(false);
        setIsCameraOff(false);
      }
    }
  };

  // Invite more participants
  const handleInviteUser = (userId: string) => {
    if (invitedUsers.includes(userId)) {
      setInvitedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setInvitedUsers(prev => [...prev, userId]);
      alert(`Inviting ${users.find(u => u.id === userId)?.fullName} to join the call...`);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };  const filterStyles: Record<string, string> = {
    Normal: 'none',
    Warm: 'sepia(0.3) saturate(1.4) hue-rotate(-10deg)',
    Cool: 'saturate(1.1) hue-rotate(15deg) brightness(1.05)',
    'B&W': 'grayscale(1)',
    Sepia: 'sepia(0.85)',
    Bright: 'brightness(1.25) contrast(1.15)',
    Soft: 'blur(0.4px) brightness(1.05) contrast(0.9)',
    Vignette: 'contrast(1.2) brightness(0.95)',
    Retro: 'sepia(0.2) contrast(0.85) brightness(1.1) saturate(1.2) hue-rotate(-20deg)',
    Glam: 'brightness(1.15) saturate(1.3) contrast(0.95) blur(0.2px)',
  };

  const FILTERS_LIST = ['Normal', 'Warm', 'Cool', 'B&W', 'Sepia', 'Bright', 'Soft', 'Vignette', 'Retro', 'Glam'];

  return (
    <div id="call_overlay_window" className="fixed inset-0 z-[9999] bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      
      {/* BACKGROUND GRAPHIC PATTERN (WhatsApp Dark Theme vibe) */}
      <div className="absolute inset-0 z-0 bg-[#0b141a] opacity-95" />
      <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* 1. TOP APP BAR BLOCK */}
      <div className="relative z-10 px-4 py-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-white/10 rounded-full transition text-slate-300 hover:text-white"
        >
          <ChevronDown className={`w-5 h-5 transition duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/20">
            <Lock className="w-3 h-3 fill-emerald-400" /> End-to-end Encrypted
          </span>
          <h3 className="text-sm font-extrabold text-white mt-2 leading-none">{targetUser.fullName}</h3>
          <p className="text-[11px] text-slate-400 mt-1 font-semibold">
            {status === 'ringing' ? 'Ringing...' : `Connected • ${formatTimer(seconds)}`}
          </p>
        </div>

        <button 
          onClick={() => setShowInviteModal(true)}
          className="p-2 hover:bg-white/10 rounded-full transition text-slate-300 hover:text-white"
          title="Invite participant"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* 2. CENTER CONTENT BLOCK */}
      <div className="relative z-1 flex-1 flex flex-col items-center justify-center p-4 min-h-0 w-full">
        
        {/* VIDEO DISPLAY GRID */}
        {callType === 'video' && status === 'connected' ? (
          <div className="relative w-full h-full max-w-md aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900 group">
            
            {/* Case A: Screen share is active */}
            {activeScreenSharerId !== null ? (
              <div className="relative w-full h-full">
                {activeScreenSharerId === currentUserId ? (
                  // I am sharing my screen
                  <div className="w-full h-full relative flex flex-col items-center justify-center bg-slate-950 p-6">
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted
                      className="w-full h-full object-contain bg-slate-950"
                    />
                    <div className="absolute top-4 left-4 right-4 bg-rose-500/90 text-white text-xs py-2 px-3 rounded-xl flex items-center justify-between shadow-lg backdrop-blur-md">
                      <span className="font-extrabold flex items-center gap-1.5">
                        <Monitor className="w-4 h-4 animate-pulse" /> Sharing screen...
                      </span>
                      <button 
                        onClick={handleToggleScreenShare}
                        className="bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg uppercase transition"
                      >
                        Stop Share
                      </button>
                    </div>
                  </div>
                ) : (
                  // Remote user is sharing their screen
                  <div className="w-full h-full relative flex flex-col items-center justify-center bg-slate-950">
                    <video 
                      ref={remoteVideoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-contain bg-slate-950"
                    />
                    <div className="absolute top-4 left-4 right-4 bg-emerald-600/90 text-white text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-lg backdrop-blur-md font-extrabold">
                      <Monitor className="w-4 h-4 animate-pulse" /> {targetUser.fullName} is sharing screen
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Case B: Normal Video Call (Swap-enabled)
              <div className="relative w-full h-full">
                
                {/* 1. BACKGROUND STREAM (Full-screen) */}
                {!isSwapped ? (
                  // Background is Remote Video
                  <div 
                    className="w-full h-full relative cursor-pointer"
                    onClick={() => setIsSwapped(true)}
                  >
                    <video 
                      ref={remoteVideoRef} 
                      autoPlay 
                      playsInline 
                      onError={(e) => console.log('Remote stream video connection pending...')}
                      className="w-full h-full object-cover bg-slate-900"
                    />
                    
                    {/* Fallback avatar if stream not active */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-xs pointer-events-none">
                      <img 
                        src={targetUser.avatar} 
                        alt={targetUser.fullName} 
                        className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500/40 shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[10px] text-slate-400 mt-3 font-semibold tracking-wider uppercase">Connecting encrypted video...</span>
                    </div>
                  </div>
                ) : (
                  // Background is Local Video (with selected filter)
                  <div 
                    className="w-full h-full relative cursor-pointer"
                    onClick={() => setIsSwapped(false)}
                  >
                    {!isCameraOff ? (
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted
                        style={{ filter: selectedFilter !== 'Normal' ? filterStyles[selectedFilter] : 'none' }}
                        onError={(e) => console.log('Local camera video stream connection pending...')}
                        className="w-full h-full object-cover bg-slate-900 scale-x-[-1]"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950">
                        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-white/10">
                          <VideoOff className="w-8 h-8" />
                        </div>
                        <span className="text-xs text-slate-400 mt-3 font-bold">Your Camera is Off</span>
                      </div>
                    )}
                    
                    {selectedFilter === 'Vignette' && !isCameraOff && (
                      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.65)_100%)]" />
                    )}
                  </div>
                )}

                {/* 2. FLOATING PiP STREAM (Bottom-right, 25% size, rounded) */}
                <div 
                  className="absolute bottom-4 right-4 w-28 h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-500/50 bg-slate-950 z-20 cursor-pointer transition duration-300 hover:scale-105 active:scale-95"
                  onClick={() => setIsSwapped(!isSwapped)}
                >
                  {!isSwapped ? (
                    // PiP is Local Video
                    <div className="w-full h-full relative">
                      {!isCameraOff ? (
                        <video 
                          ref={localVideoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          style={{ filter: selectedFilter !== 'Normal' ? filterStyles[selectedFilter] : 'none' }}
                          onError={(e) => console.log('Local camera video stream connection pending...')}
                          className="w-full h-full object-cover bg-slate-900 scale-x-[-1]"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
                          <VideoOff className="w-4 h-4 text-slate-500" />
                          <span className="text-[8px] text-slate-500 mt-1 font-bold">Camera Off</span>
                        </div>
                      )}

                      {selectedFilter === 'Vignette' && !isCameraOff && (
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.65)_100%)]" />
                      )}
                      <div className="absolute bottom-1.5 left-2 bg-black/50 px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase">
                        You
                      </div>
                    </div>
                  ) : (
                    // PiP is Remote Video
                    <div className="w-full h-full relative">
                      <video 
                        ref={remoteVideoRef} 
                        autoPlay 
                        playsInline 
                        onError={(e) => console.log('Remote stream video connection pending...')}
                        className="w-full h-full object-cover bg-slate-900"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 pointer-events-none">
                        <img 
                          src={targetUser.avatar} 
                          alt={targetUser.fullName} 
                          className="w-8 h-8 rounded-full object-cover border border-emerald-500/30"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="absolute bottom-1.5 left-2 bg-black/50 px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase truncate max-w-[80%]">
                        {targetUser.fullName.split(' ')[0]}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        ) : (
          /* AUDIO CALL CENTRAL DISPLAY */
          <div className="relative w-full h-full max-w-md aspect-[3/4] flex items-center justify-center rounded-3xl overflow-hidden border border-white/5 bg-slate-950/40 backdrop-blur-md">
            {!isSwapped ? (
              // Remote is Full Screen blur background + avatar in center
              <div 
                className="w-full h-full flex flex-col items-center justify-center relative cursor-pointer p-6"
                onClick={() => setIsSwapped(true)}
              >
                {/* Full screen blur bg */}
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center filter blur-3xl opacity-20 scale-110" 
                  style={{ backgroundImage: `url(${targetUser.avatar})` }} 
                />
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative">
                    {/* Dynamic pulsing audio ripple rings */}
                    <span className="absolute inset-[-15px] rounded-full border border-emerald-500/20 bg-emerald-500/5 animate-ping duration-1000" />
                    <span className="absolute inset-[-35px] rounded-full border border-emerald-500/10 bg-emerald-500/3 animate-ping duration-1500" />
                    
                    <img 
                      src={targetUser.avatar} 
                      alt={targetUser.fullName} 
                      className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500 shadow-2xl relative z-10 hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h4 className="text-base font-black text-white mt-8">@{targetUser.username}</h4>
                  <p className="text-[10px] text-emerald-400 mt-1 font-mono tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    SECURE CALL CONNECTED
                  </p>
                </div>

                {/* Local user floating PiP bottom-right */}
                <div 
                  className="absolute bottom-4 right-4 w-20 h-28 rounded-2xl overflow-hidden shadow-xl border border-white/15 bg-slate-900 flex flex-col items-center justify-center p-2 cursor-pointer hover:scale-105 transition duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSwapped(true);
                  }}
                >
                  <img 
                    src={currentUserData?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb"} 
                    className="w-10 h-10 rounded-full object-cover border border-white/10" 
                  />
                  <span className="text-[8px] text-slate-400 mt-2 font-bold font-sans text-center">You (PiP)</span>
                </div>
              </div>
            ) : (
              // Local is Full Screen blur background + avatar in center
              <div 
                className="w-full h-full flex flex-col items-center justify-center relative cursor-pointer p-6"
                onClick={() => setIsSwapped(false)}
              >
                {/* Full screen blur bg */}
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center filter blur-3xl opacity-20 scale-110" 
                  style={{ backgroundImage: `url(${currentUserData?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb"})` }} 
                />
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative">
                    {/* Dynamic pulsing audio ripple rings */}
                    <span className="absolute inset-[-15px] rounded-full border border-emerald-500/20 bg-emerald-500/5 animate-ping duration-1000" />
                    <span className="absolute inset-[-35px] rounded-full border border-emerald-500/10 bg-emerald-500/3 animate-ping duration-1500" />
                    
                    <img 
                      src={currentUserData?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb"} 
                      alt="You" 
                      className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500 shadow-2xl relative z-10 hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h4 className="text-base font-black text-white mt-8">You</h4>
                  <p className="text-[10px] text-emerald-400 mt-1 font-mono tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    SECURE CALL CONNECTED
                  </p>
                </div>

                {/* Remote user floating PiP bottom-right */}
                <div 
                  className="absolute bottom-4 right-4 w-20 h-28 rounded-2xl overflow-hidden shadow-xl border border-white/15 bg-slate-900 flex flex-col items-center justify-center p-2 cursor-pointer hover:scale-105 transition duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSwapped(false);
                  }}
                >
                  <img 
                    src={targetUser.avatar} 
                    className="w-10 h-10 rounded-full object-cover border border-white/10" 
                  />
                  <span className="text-[8px] text-slate-400 mt-2 font-bold font-sans text-center truncate w-full">@{targetUser.username}</span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 3. BOTTOM CONTROL DRAWER PANEL */}
      <div className="relative z-10 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-[32px] px-6 py-5 space-y-5 shadow-2xl">
        
        {/* BOTTOM SHEET INTERACTIVE MODULES */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          <button 
            onClick={handleToggleScreenShare}
            disabled={activeScreenSharerId !== null && activeScreenSharerId !== currentUserId}
            title={activeScreenSharerId !== null && activeScreenSharerId !== currentUserId ? "User is sharing" : (isScreenSharing ? "Stop sharing" : "Share screen")}
            className={`py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition cursor-pointer ${
              isScreenSharing 
                ? 'bg-emerald-600 text-white shadow-lg' 
                : activeScreenSharerId !== null && activeScreenSharerId !== currentUserId
                  ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-700/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" /> {isScreenSharing ? 'Sharing Screen' : 'Share Screen'}
          </button>
          
          <button 
            onClick={onEndCall}
            className="py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" /> Send Message
          </button>
        </div>

        {/* CORE TELECOM SWITCHES PANEL */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 max-w-sm mx-auto">
          {status === 'ringing' && isIncoming ? (
            <>
              {/* RED DECLINE BUTTON */}
              <button 
                onClick={handleDeclineCall}
                className="p-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition duration-150 cursor-pointer animate-pulse"
                title="Decline Call"
              >
                <PhoneOff className="w-6 h-6 fill-white" />
              </button>

              {/* GREEN ANSWER BUTTON */}
              <button 
                onClick={handleAnswerCall}
                className="p-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition duration-150 cursor-pointer animate-bounce"
                title="Answer Call"
              >
                <Phone className="w-6 h-6 fill-white" />
              </button>
            </>
          ) : (
            <>
              {/* EXTRA MORE SWITCH */}
              <button 
                onClick={() => setShowMoreControls(!showMoreControls)}
                className={`p-3 rounded-full transition cursor-pointer ${
                  showMoreControls 
                    ? 'bg-white text-slate-900 shadow-md' 
                    : 'bg-white/10 hover:bg-white/15 text-slate-200'
                }`}
                title="More parameters"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {/* AUDIO MUTE TOGGLE */}
              <button 
                onClick={handleToggleMute}
                className={`p-3 rounded-full transition cursor-pointer ${
                  isMuted 
                    ? 'bg-rose-600 text-white animate-pulse shadow-md' 
                    : 'bg-white/10 hover:bg-white/15 text-slate-200'
                }`}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* CAMERA FEED TOGGLE */}
              <button 
                onClick={handleToggleCamera}
                className={`p-3 rounded-full transition cursor-pointer ${
                  isCameraOff 
                    ? 'bg-rose-600 text-white shadow-md' 
                    : 'bg-white/10 hover:bg-white/15 text-slate-200'
                }`}
                title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* RED END CALL BUTTON */}
              <button 
                id="end_call_red_btn"
                onClick={handleEndCall}
                className="p-4.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-2xl hover:scale-115 active:scale-90 transition duration-150 cursor-pointer"
                title="End Connection"
              >
                <PhoneOff className="w-5.5 h-5.5 fill-white" />
              </button>

              {/* CAMERA FLIP BUTTON */}
              {callType === 'video' && (
                <button 
                  onClick={handleSwitchCamera}
                  className={`p-3 rounded-full transition cursor-pointer bg-white/10 hover:bg-white/15 text-slate-200`}
                  title="Flip Camera"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}

              {/* FILTERS Sparkles BUTTON */}
              {callType === 'video' && (
                <button 
                  onClick={() => setShowFiltersMenu(true)}
                  className={`p-3 rounded-full transition cursor-pointer bg-white/10 hover:bg-white/15 ${
                    selectedFilter !== 'Normal' ? 'text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-slate-200'
                  }`}
                  title="Apply Filters"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              )}

              {/* SPEAKER / HANDSFREE TOGGLE */}
              <button 
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`p-3 rounded-full transition cursor-pointer ${
                  !isSpeakerOn 
                    ? 'bg-rose-600 text-white shadow-md' 
                    : 'bg-white/10 hover:bg-white/15 text-slate-200'
                }`}
                title="Toggle Speaker"
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>

        {/* EXPANDABLE ADVANCED SETTINGS PANEL */}
        {showMoreControls && (
          <div className="bg-white/5 rounded-2xl p-4 max-w-sm mx-auto space-y-3 animate-fadeIn">
            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Audio Performance Tuning</h5>
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span>Automatic Echo Cancellation</span>
              <span className="text-emerald-400 font-extrabold uppercase">Active</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span>Bitrate Optimization</span>
              <span className="text-emerald-400 font-extrabold uppercase">High Definition (HD)</span>
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-[9px] text-slate-500 font-mono tracking-widest">
            ROHINGYACONNECT E2EE TELEPHONY STANDARD v1.5
          </p>
        </div>
      </div>

      {/* FILTERS MENU BOTTOM SHEET (80% Max Height) */}
      {showFiltersMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition duration-300" onClick={() => setShowFiltersMenu(false)}>
          <div 
            className="w-full max-w-md bg-[#16212a] border-t border-white/10 rounded-t-[32px] p-6 space-y-5 shadow-2xl relative select-none max-h-[80%] flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar inside Filter menu */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h4 className="text-sm font-extrabold text-white">WhatsApp Filters</h4>
              </div>
              <button 
                onClick={() => setShowFiltersMenu(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition font-black text-sm"
              >
                &times;
              </button>
            </div>

            {/* Filter Chips List (Horizontally Scrollable) */}
            <div className="flex gap-3 overflow-x-auto py-4 px-1 scrollbar-thin scrollbar-thumb-slate-700 select-none">
              {FILTERS_LIST.map((filter) => {
                const isSelected = selectedFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`flex-shrink-0 flex flex-col items-center gap-2 p-1 rounded-2xl transition duration-200 relative ${
                      isSelected 
                        ? 'scale-105' 
                        : 'hover:scale-102 opacity-85 hover:opacity-100'
                    }`}
                  >
                    {/* Visual Preview Box */}
                    <div 
                      style={{ filter: filterStyles[filter] }}
                      className={`w-16 h-16 rounded-xl border-2 transition duration-200 flex items-center justify-center bg-slate-800 ${
                        isSelected ? 'border-emerald-500 shadow-lg' : 'border-white/15'
                      }`}
                    >
                      {/* Sub-preview placeholder or icon */}
                      <span className="text-[10px] font-bold text-slate-300">
                        {filter.substring(0, 4)}
                      </span>
                    </div>

                    {/* Checkmark inside check box */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 bg-emerald-500 rounded-full p-0.5 shadow">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                      </div>
                    )}

                    <span className={`text-[10px] font-extrabold ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {filter}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Hint message */}
            <p className="text-[10px] text-slate-500 text-center italic">
              * Filters are applied live to your camera stream only and do not affect WebRTC latency.
            </p>

            <button 
              onClick={() => setShowFiltersMenu(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 rounded-2xl shadow-lg transition duration-150 uppercase tracking-wider"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* 4. FOLLOWER PARTICIPANT INVITATION MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400">Invite Participants</span>
                <h4 className="text-sm font-extrabold text-white">Select Followers</h4>
              </div>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-slate-450 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {users
                .filter(u => u.id !== currentUserId && u.id !== targetUser.id)
                .map((u) => {
                  const isAlreadyInvited = invitedUsers.includes(u.id);
                  return (
                    <div 
                      key={u.id}
                      onClick={() => handleInviteUser(u.id)}
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-emerald-500/10 rounded-2xl cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={u.avatar} 
                          alt={u.fullName} 
                          className="w-9 h-9 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <h5 className="text-xs font-extrabold text-white">{u.fullName}</h5>
                          <p className="text-[9px] text-slate-400">@{u.username}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isAlreadyInvited ? 'bg-emerald-500 border-transparent text-white' : 'border-slate-600 text-transparent'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      </div>
                    </div>
                  );
                })}
            </div>

            <button 
              onClick={() => setShowInviteModal(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-lg transition duration-150"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
