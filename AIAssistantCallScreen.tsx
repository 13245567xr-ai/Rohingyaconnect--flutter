import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, 
  Monitor, RefreshCw, Globe, Sparkles, Check, Play, Loader2,
  ChevronDown, HelpCircle, Lock, ShieldCheck, HeartPulse, Info,
  Volume1, ArrowLeft, Disc, Square, AlertCircle, MessageSquare
} from 'lucide-react';
import { User } from '../types';

interface AIAssistantCallScreenProps {
  callType: 'audio' | 'video';
  targetUser: User;
  onEndCall: () => void;
}

const SUPPORTED_LANGUAGES = [
  { name: 'English', code: 'en-US' },
  { name: 'Bangla', code: 'bn-BD' },
  { name: 'Rohingya', code: 'rhn-MM' }, // fallback to bn-BD or en-US internally
  { name: 'Arabic', code: 'ar-SA' },
  { name: 'Urdu', code: 'ur-PK' },
  { name: 'Hindi', code: 'hi-IN' },
  { name: 'Chinese', code: 'zh-CN' },
  { name: 'Japanese', code: 'ja-JP' },
  { name: 'French', code: 'fr-FR' },
  { name: 'Spanish', code: 'es-ES' },
  { name: 'German', code: 'de-DE' },
  { name: 'Turkish', code: 'tr-TR' },
  { name: 'Malay', code: 'ms-MY' },
  { name: 'Indonesian', code: 'id-ID' }
];

const AI_VOICES = [
  { 
    id: 'female-1', 
    name: 'Female 1', 
    gender: 'female', 
    characteristics: 'Soft, Friendly, Natural', 
    locale: 'en-US', 
    pitch: 1.15, 
    rate: 0.9,
    previewText: "Hello! This is Female 1. I am soft, friendly, and natural." 
  },
  { 
    id: 'female-2', 
    name: 'Female 2', 
    gender: 'female', 
    characteristics: 'Professional, Confident, Calm', 
    locale: 'en-GB', 
    pitch: 1.0, 
    rate: 1.05,
    previewText: "Good day. This is Female 2. I am professional, confident, and calm." 
  },
  { 
    id: 'male-1', 
    name: 'Male 1', 
    gender: 'male', 
    characteristics: 'Deep, Friendly, Warm', 
    locale: 'en-US', 
    pitch: 0.72, 
    rate: 0.85,
    previewText: "Hey there! This is Male 1. I am deep, friendly, and warm." 
  },
  { 
    id: 'male-2', 
    name: 'Male 2', 
    gender: 'male', 
    characteristics: 'Professional, Strong, Mature', 
    locale: 'en-US', 
    pitch: 0.82, 
    rate: 0.95,
    previewText: "Greetings. This is Male 2. I am professional, strong, and mature." 
  }
];

export default function AIAssistantCallScreen({
  callType,
  targetUser,
  onEndCall
}: AIAssistantCallScreenProps) {
  // Call State
  const [status, setStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [seconds, setSeconds] = useState(0);
  
  // Media Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  // Custom Sheets
  const [showLangSheet, setShowLangSheet] = useState(false);
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0]);
  const [selectedVoice, setSelectedVoice] = useState(AI_VOICES[0]);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // AI & Speech States
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiSpeechOutput, setAiSpeechOutput] = useState('');
  const [conversationLog, setConversationLog] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([]);

  // Fallback Manual Keyboard Input
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const [keyboardText, setKeyboardText] = useState('');

  // Local camera stream for Picture-in-Picture
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const ringerIntervalRef = useRef<any>(null);

  // 1. Ringing state & auto-answer simulation
  useEffect(() => {
    // Play ringing tone synthesis
    let audioCtx: AudioContext | null = null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        ringerIntervalRef.current = setInterval(() => {
          if (!audioCtx) return;
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          osc1.type = 'sine';
          osc1.frequency.value = 400;
          osc2.type = 'sine';
          osc2.frequency.value = 440;
          
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
          
          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc1.start();
          osc2.start();
          osc1.stop(audioCtx.currentTime + 1);
          osc2.stop(audioCtx.currentTime + 1);
        }, 1200);
      }
    } catch (e) {
      console.warn("Could not start ringer synthesis:", e);
    }

    // Auto connect after 2 seconds
    const connectTimer = setTimeout(() => {
      if (ringerIntervalRef.current) {
        clearInterval(ringerIntervalRef.current);
      }
      setStatus('connected');
      // Speak initial greeting
      speakText("Hello! This is RC Assistant. I am ready to assist you. How can I help you today?");
    }, 2000);

    return () => {
      clearTimeout(connectTimer);
      if (ringerIntervalRef.current) {
        clearInterval(ringerIntervalRef.current);
      }
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, []);

  // 2. Call duration timer
  useEffect(() => {
    let interval: any;
    if (status === 'connected') {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  // 3. Setup user camera stream for PIP
  useEffect(() => {
    if (status === 'connected') {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: callType === 'video' ? { facingMode: facingMode } : false,
            audio: true
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          // Setup WebSocket
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const ws = new WebSocket(`${protocol}//${window.location.host}/api/live`);
          wsRef.current = ws;

          ws.onopen = () => console.log("WebSocket connected to Live API");
          ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.audio) {
              // ... playback logic would go here
              console.log("Received audio chunk");
            }
          };

        } catch (err) {
          console.warn("Could not open local camera stream inside iframe sandbox. Normal operation continues:", err);
        }
      };
      startCamera();
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [status, callType, facingMode]);

  // 4. Setup Continuous Speech Recognition
  useEffect(() => {
    if (status !== 'connected') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn("SpeechRecognition is not supported in this browser. Fallback keyboard option is fully functional.");
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    
    // Choose the best match language code
    rec.lang = selectedLanguage.code === 'rhn-MM' ? 'bn-BD' : selectedLanguage.code;

    rec.onstart = () => {
      console.log("Speech recognition started...");
    };

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (text && text.trim().length > 0) {
        setTranscript(text);
        handleUserSpeech(text);
      }
    };

    rec.onerror = (e: any) => {
      console.log("Speech recognition error / silent pause:", e.error);
    };

    rec.onend = () => {
      // Loop restarts if we are connected, not thinking, not speaking, and not muted!
      if (status === 'connected' && !isThinking && !isSpeaking && !isMuted) {
        try {
          rec.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = rec;

    if (!isMuted && !isThinking && !isSpeaking) {
      try {
        rec.start();
      } catch (e) {}
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [status, isMuted, isThinking, isSpeaking, selectedLanguage]);

  // 5. Speech Synthesis Helper
  const speakText = (text: string, voiceOverride?: typeof AI_VOICES[0]) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    // Add to logs
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setConversationLog(prev => [...prev, { role: 'assistant', text, time: timeString }]);
    setAiSpeechOutput(text);

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select correct language locale for speech synthesis
    utterance.lang = selectedLanguage.code === 'rhn-MM' ? 'bn-BD' : selectedLanguage.code;

    // Apply voice selections
    const systemVoices = synthRef.current.getVoices();
    let matchedVoice = null;
    
    const activeVoice = voiceOverride || selectedVoice;

    const isEnglish = selectedLanguage.code === 'en-US' || selectedLanguage.code === 'en-GB' || selectedLanguage.code === 'en-AU';
    const searchLocale = isEnglish ? activeVoice.locale : selectedLanguage.code;

    // Filter candidates matching locale or fall back to English
    let candidates = systemVoices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(searchLocale.toLowerCase().split('-')[0]));
    if (candidates.length === 0) {
      candidates = systemVoices.filter(v => v.lang.toLowerCase().startsWith('en'));
    }

    if (activeVoice.gender === 'male') {
      // Find premium/natural/neural male voices first in browser candidates
      let premiumMale = candidates.find(v => {
        const name = v.name.toLowerCase();
        const hasMaleIndicator = name.includes('male') || name.includes('david') || name.includes('mark') || name.includes('daniel') || name.includes('fred') || name.includes('alex') || name.includes('guy') || name.includes('george') || name.includes('sam');
        const isPremium = name.includes('natural') || name.includes('neural') || name.includes('online');
        return hasMaleIndicator && isPremium;
      });

      if (!premiumMale) {
        premiumMale = candidates.find(v => {
          const name = v.name.toLowerCase();
          return name.includes('male') || name.includes('david') || name.includes('mark') || name.includes('daniel') || name.includes('fred') || name.includes('alex') || name.includes('guy') || name.includes('george') || name.includes('sam');
        });
      }

      matchedVoice = premiumMale;

      // Global system voice search fallback for david/mark/alex/daniel/fred/male/guy
      if (!matchedVoice) {
        matchedVoice = systemVoices.find(v => {
          const name = v.name.toLowerCase();
          return name.includes('david') || name.includes('mark') || name.includes('daniel') || name.includes('fred') || name.includes('alex') || name.includes('male') || name.includes('guy');
        });
      }
    } else {
      // Find premium/natural/neural female voices first in browser candidates
      let premiumFemale = candidates.find(v => {
        const name = v.name.toLowerCase();
        const hasFemaleIndicator = name.includes('female') || name.includes('zira') || name.includes('hazel') || name.includes('aria') || name.includes('susan') || name.includes('haruka') || name.includes('siri');
        const isPremium = name.includes('natural') || name.includes('neural') || name.includes('online');
        return hasFemaleIndicator && isPremium;
      });

      if (!premiumFemale) {
        premiumFemale = candidates.find(v => {
          const name = v.name.toLowerCase();
          return name.includes('female') || name.includes('zira') || name.includes('hazel') || name.includes('aria') || name.includes('susan') || name.includes('haruka') || name.includes('siri');
        });
      }

      matchedVoice = premiumFemale;
    }

    // Fallback to any matching locale candidate
    if (!matchedVoice && candidates.length > 0) {
      matchedVoice = candidates[0];
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    // Speech parameters
    utterance.rate = activeVoice.rate;
    utterance.pitch = activeVoice.pitch;
    utterance.volume = isSpeakerOn ? 1.0 : 0.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      // Abort active recognition to avoid echo feedback loop
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      // Restart recognition
      if (status === 'connected' && !isMuted) {
        setTimeout(() => {
          try {
            if (recognitionRef.current) recognitionRef.current.start();
          } catch (e) {}
        }, 500);
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    synthRef.current.speak(utterance);
  };

  // 6. Handle User Input (Spoken or Typed)
  const handleUserSpeech = async (text: string) => {
    if (isThinking) return;
    setIsThinking(true);
    setTranscript(text);

    // Add user text to logs
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setConversationLog(prev => [...prev, { role: 'user', text, time: timeString }]);

    // Stop recognition during API fetch
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    try {
      // Live screen share visual observation
      let activeScreenshot: string | null = null;
      if (isScreenSharing && screenStreamRef.current) {
        // Capture frame from active screen capture track
        activeScreenshot = await captureScreenFrame();
      }

      // Context conversation history
      const historyPayload = conversationLog.slice(-8).map(log => ({
        sender: log.role === 'user' ? 'user' : 'model',
        text: log.text
      }));

      let accumulatedText = "";
      let attempt = 0;
      const maxAttempts = 3;
      let delay = 1000;
      let streamSuccess = false;

      while (attempt < maxAttempts && !streamSuccess) {
        try {
          if (attempt > 0) {
            // Wait for exponential backoff delay before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
          }

          attempt++;

          const controller = new AbortController();
          const connectionTimeout = setTimeout(() => {
            controller.abort();
          }, 15000); // 15s connection timeout

          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `[Active Calling Session. Spoken Language Instruction: Please respond ONLY in ${selectedLanguage.name}. Speak conversationally as a voice assistant.] User query: ${text}`,
              history: historyPayload,
              imageUrl: activeScreenshot,
              stream: true
            }),
            signal: controller.signal
          });

          clearTimeout(connectionTimeout);

          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            while (true) {
              const readTimeout = setTimeout(() => {
                controller.abort();
              }, 15000); // 15s read timeout
              
              const { done, value } = await reader.read();
              clearTimeout(readTimeout);

              if (done) {
                streamSuccess = true;
                break;
              }

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.text) {
                      accumulatedText += data.text;
                    }
                  } catch (e) {
                    // partial chunk
                  }
                }
              }
            }
          } else {
            throw new Error("No reader available");
          }

        } catch (err: any) {
          console.warn(`Call screen stream attempt ${attempt} failed:`, err);
        }
      }

      // Fallback to standard non-streaming HTTP chat response if stream failed completely
      if (!streamSuccess) {
        try {
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `[Active Calling Session. Spoken Language Instruction: Please respond ONLY in ${selectedLanguage.name}. Speak conversationally as a voice assistant.] User query: ${text}`,
              history: historyPayload,
              imageUrl: activeScreenshot,
              stream: false // standard HTTP chat response
            })
          });

          if (!response.ok) {
            throw new Error(`Fallback HTTP error ${response.status}`);
          }

          const data = await response.json();
          if (data && data.text) {
            accumulatedText = data.text;
            streamSuccess = true;
          } else {
            throw new Error("Empty fallback response");
          }
        } catch (fallbackErr) {
          console.error("Call screen fallback failed:", fallbackErr);
        }
      }

      const cleanedReply = accumulatedText.trim() || (streamSuccess ? "I'm here to support you." : "");
      if (cleanedReply) {
        setIsThinking(false);
        speakText(cleanedReply);
      } else {
        throw new Error("Failed to generate response");
      }

    } catch (error) {
      console.error("RC Assistant Call Error:", error);
      setIsThinking(false);
      speakText("I am having trouble connecting to the network right now. Please try saying that again.");
    }
  };

  // Helper to capture active screen sharing stream frame
  const captureScreenFrame = (): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        if (!screenStreamRef.current) {
          resolve(null);
          return;
        }
        const videoTrack = screenStreamRef.current.getVideoTracks()[0];
        if (!videoTrack) {
          resolve(null);
          return;
        }

        const video = document.createElement('video');
        video.srcObject = screenStreamRef.current;
        video.muted = true;
        video.playsInline = true;
        video.play().then(() => {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            resolve(dataUrl);
          } else {
            resolve(null);
          }
          // Clean up
          video.srcObject = null;
        }).catch((err) => {
          console.warn("Screen canvas capture failed:", err);
          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  };

  // 7. Screen Sharing Control
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share
      setIsScreenSharing(false);
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      speakText("I have stopped viewing your screen.");
    } else {
      // Start screen share
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        speakText("Screen sharing started. I can now observe your screen and assist you live.");
        
        // Auto stop screen share if user stops from browser UI
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
          speakText("Screen sharing ended.");
        };
      } catch (err) {
        console.warn("DisplayMedia blocked or cancelled:", err);
        alert("Screen sharing requires browser permissions.");
      }
    }
  };

  // 8. Recording Controls (User & AI Call)
  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    } else {
      // Start recording local audio
      try {
        const stream = localStreamRef.current || await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const options = { mimeType: 'audio/webm' };
        
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, options);
        } catch (e) {
          recorder = new MediaRecorder(stream);
        }

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Download voice recording file
          const link = document.createElement('a');
          link.href = audioUrl;
          link.download = `rc_call_recording_${Date.now()}.webm`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Download conversation transcript as well!
          const transcriptText = conversationLog.map(l => `[${l.time}] ${l.role.toUpperCase()}: ${l.text}`).join('\n');
          const textBlob = new Blob([transcriptText], { type: 'text/plain' });
          const textUrl = URL.createObjectURL(textBlob);
          const textLink = document.createElement('a');
          textLink.href = textUrl;
          textLink.download = `rc_call_transcript_${Date.now()}.txt`;
          document.body.appendChild(textLink);
          textLink.click();
          document.body.removeChild(textLink);
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
        setRecordingStartTime(Date.now());
        alert("Call recording started! Standard audio and transcript logs will save on ending call.");
      } catch (err) {
        console.warn("Could not start MediaRecorder on user microphone:", err);
      }
    }
  };

  const handleEndCall = () => {
    if (synthRef.current) synthRef.current.cancel();
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
    }
    onEndCall();
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard Submission Fallback
  const handleKeyboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyboardText.trim().length === 0) return;
    const text = keyboardText.trim();
    setKeyboardText('');
    setShowKeyboardInput(false);
    handleUserSpeech(text);
  };

  return (
    <div id="ai_call_screen" className="fixed inset-0 z-[9999] bg-[#070b0d] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      
      {/* Background glowing gradients */}
      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-indigo-950/20 via-slate-950 to-emerald-950/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TOP HEADER SECTION */}
      <div className="relative z-10 px-5 py-5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button 
          onClick={handleEndCall}
          className="p-2.5 hover:bg-white/10 active:scale-95 rounded-full transition text-slate-300 hover:text-white flex items-center gap-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            <Lock className="w-2.5 h-2.5 text-indigo-400" /> AI Assistant Real-time Call
          </span>
          <h3 className="text-base font-extrabold text-white mt-2 leading-none flex items-center gap-1.5">
            {targetUser.fullName}
            <span className="bg-blue-500 text-white rounded-full p-0.5 inline-flex items-center justify-center w-4 h-4" title="Verified AI">
              <Check className="w-2.5 h-2.5 stroke-[4px]" />
            </span>
          </h3>
          <p className="text-[11px] text-emerald-400 mt-1 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            {status === 'ringing' ? 'Ringing...' : `Connected • ${formatTimer(seconds)}`}
          </p>
        </div>

        {/* Call options (Mute user speaker synthesis) */}
        <button 
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          className={`p-2.5 rounded-full transition ${!isSpeakerOn ? 'bg-rose-500/20 text-rose-400' : 'hover:bg-white/10 text-slate-300'}`}
          title={isSpeakerOn ? "Mute Speaker" : "Unmute Speaker"}
        >
          {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* 2. DYNAMIC CENTER DISPLAY BLOCK */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 min-h-0 w-full">
        
        {/* VOICE CALL VIEW */}
        {callType === 'audio' && (
          <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-sm">
            {/* Avatar block with active waveform overlay */}
            <div className="relative">
              <div className={`w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 p-1 shadow-2xl relative z-10 flex items-center justify-center transition-all duration-500 ${isThinking ? 'animate-bounce' : ''}`}>
                <img 
                  src={targetUser.avatar} 
                  alt={targetUser.fullName} 
                  className="w-full h-full rounded-full object-cover border-4 border-slate-900"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Animated waveform ripple ring */}
              {isSpeaking && (
                <div className="absolute -inset-4 rounded-full border border-indigo-500/40 animate-ping opacity-75 z-0" />
              )}
              {isThinking && (
                <div className="absolute -inset-2 rounded-full border border-dashed border-indigo-400 animate-spin opacity-50 z-0" />
              )}
            </div>

            {/* Active Subtitle Display */}
            <div className="text-center space-y-2 w-full">
              {isThinking ? (
                <div className="flex items-center justify-center gap-1.5 text-indigo-400 text-xs font-bold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>RC Assistant is formulating response...</span>
                </div>
              ) : isSpeaking ? (
                <div className="space-y-1">
                  <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-black">Speaking</p>
                  <p className="text-xs text-slate-300 font-semibold italic max-h-24 overflow-y-auto px-4 leading-relaxed bg-white/5 py-2.5 rounded-2xl">
                    "{aiSpeechOutput}"
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Listening</p>
                  <p className="text-xs text-slate-200 font-semibold italic">
                    {transcript ? `"${transcript}"` : "Speak naturally, I am listening..."}
                  </p>
                </div>
              )}
            </div>

            {/* Custom SVG Active Audio Waveform bars */}
            <div className="flex items-center gap-1.5 h-10 px-4 justify-center">
              {[...Array(12)].map((_, idx) => {
                const heightClass = isSpeaking 
                  ? ['h-3 animate-[pulse_0.4s_infinite]', 'h-8 animate-[pulse_0.5s_infinite]', 'h-5 animate-[pulse_0.6s_infinite]', 'h-9 animate-[pulse_0.3s_infinite]'][idx % 4]
                  : isThinking 
                  ? 'h-2 animate-bounce' 
                  : 'h-1.5 bg-slate-700';
                return (
                  <span 
                    key={idx} 
                    className={`w-1 rounded-full bg-indigo-500 transition-all duration-300 ${heightClass}`} 
                    style={{ animationDelay: `${idx * 50}ms` }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* VIDEO CALL VIEW WITH ANIMATED AVATAR */}
        {callType === 'video' && (
          <div className="relative w-full h-full max-w-sm aspect-[3/4] bg-slate-950/80 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl flex flex-col justify-between p-6">
            
            {/* Background Avatar face vector loop */}
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center">
              <div className="w-44 h-44 relative flex items-center justify-center">
                {/* Orbital tech glow circles */}
                <div className={`absolute inset-0 rounded-full border border-indigo-500/20 transition-all duration-700 ${isThinking ? 'scale-125 animate-spin border-indigo-400/50' : 'animate-pulse'}`} />
                <div className={`absolute inset-2 rounded-full border border-dashed border-emerald-500/20 transition-all duration-700 ${isSpeaking ? 'scale-110 animate-bounce' : ''}`} />
                
                {/* Fully interactive SVG Avatar face */}
                <svg viewBox="0 0 100 100" className="w-32 h-32 relative z-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                  {/* Outer head silhouette */}
                  <circle cx="50" cy="50" r="42" fill="url(#headGrad)" stroke="#6366f1" strokeWidth="2" className="animate-[pulse_4s_infinite]" />
                  
                  {/* Subtle inner circuitry lines */}
                  <path d="M 50,15 A 35,35 0 0,0 15,50" stroke="rgba(99,102,241,0.2)" fill="none" strokeWidth="1" />
                  <path d="M 50,85 A 35,35 0 0,0 85,50" stroke="rgba(16,185,129,0.2)" fill="none" strokeWidth="1" />

                  {/* Left Eye */}
                  <g className="translate-x-[-12] translate-y-[-5]">
                    {/* Blink overlay */}
                    <ellipse cx="42" cy="42" rx="6" ry={isThinking ? "3" : "6"} fill="#070b0d" />
                    <ellipse cx="42" cy="42" rx="4" ry={isThinking ? "1" : "4"} fill="#6366f1" className="animate-[pulse_1s_infinite]">
                      {/* Sub-pupil pupil movement saccades */}
                      <animate attributeName="cx" values="41;43;42;41" dur="4s" repeatCount="indefinite" />
                    </ellipse>
                  </g>

                  {/* Right Eye */}
                  <g className="translate-x-[12] translate-y-[-5]">
                    <ellipse cx="58" cy="42" rx="6" ry={isThinking ? "3" : "6"} fill="#070b0d" />
                    <ellipse cx="58" cy="42" rx="4" ry={isThinking ? "1" : "4"} fill="#6366f1" className="animate-[pulse_1s_infinite]">
                      <animate attributeName="cx" values="57;59;58;57" dur="4s" repeatCount="indefinite" />
                    </ellipse>
                  </g>

                  {/* Mouth (Lip syncing mouth curvature!) */}
                  {isSpeaking ? (
                    // Speaking path: moves mouth up and down dynamically
                    <ellipse cx="50" cy="62" rx="10" ry="6" fill="#10b981">
                      <animate attributeName="ry" values="2;8;4;9;3" dur="0.8s" repeatCount="indefinite" />
                    </ellipse>
                  ) : isThinking ? (
                    // Thinking shape: thin line
                    <line x1="42" y1="62" x2="58" y2="62" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
                  ) : (
                    // Resting shape: happy elegant curved smile
                    <path d="M 40,60 Q 50,68 60,60" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                  )}

                  {/* Gradients definition */}
                  <defs>
                    <radialGradient id="headGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#1e1b4b" />
                      <stop offset="100%" stopColor="#020617" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>

              {/* Status Banner */}
              <div className="mt-4 text-center z-10">
                <span className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full ${
                  isThinking 
                    ? 'bg-indigo-500/20 text-indigo-400 animate-pulse border border-indigo-500/30' 
                    : isSpeaking 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-white/5 text-slate-400'
                }`}>
                  {isThinking ? "Generating Spoken Speech..." : isSpeaking ? "Speaking Accented Voice..." : "Listening continuously..."}
                </span>
              </div>
            </div>

            {/* Float HUD: Active screen capture info */}
            {isScreenSharing && (
              <div className="absolute top-4 left-4 right-4 bg-emerald-600/95 backdrop-blur-md text-white text-[10px] py-2 px-3 rounded-2xl flex items-center justify-between shadow-lg z-20 border border-emerald-500/20">
                <span className="font-extrabold flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5 animate-pulse" /> Live Screen Observation Active
                </span>
                <button 
                  onClick={handleToggleScreenShare}
                  className="bg-white/20 hover:bg-white/30 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-lg uppercase transition"
                >
                  Stop Sharing
                </button>
              </div>
            )}

            {/* DYNAMIC SUBTITLE CAPTION overlay at bottom of the feed */}
            <div className="relative z-10 w-full mt-auto bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center space-y-1">
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">
                {isSpeaking ? "RC Assistant Says" : "Spoken Input Transcript"}
              </p>
              <p className="text-xs font-semibold leading-relaxed line-clamp-3">
                {isThinking ? "Analyzing user query..." : isSpeaking ? aiSpeechOutput : (transcript || "I'm listening. Ask me anything!")}
              </p>
            </div>

            {/* PIP SCREEN - USER REAL CAMERA STREAM overlay in top right corner */}
            <div className="absolute top-4 right-4 w-24 h-32 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-2xl bg-slate-900 z-10">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] text-white font-bold uppercase">
                You
              </div>
            </div>
          </div>
        )}

        {/* Global/Voice Floating side selectors (FB Messenger / Meta AI style) */}
        <div className="absolute right-6 top-24 flex flex-col gap-3.5 z-20">
          {/* Language translation global icon */}
          <button 
            onClick={() => {
              setShowLangSheet(true);
              setShowVoiceSheet(false);
            }}
            className="w-10 h-10 rounded-full bg-slate-900/90 border border-white/10 hover:bg-white/10 text-slate-300 flex items-center justify-center transition shadow-lg relative cursor-pointer active:scale-95"
            title="Translate Spoken Language"
          >
            <Globe className="w-5 h-5 text-indigo-400" />
            <span className="absolute -top-1 -right-1 bg-indigo-500 text-[8px] text-white font-black rounded-full px-1 py-0.5">
              {selectedLanguage.name.substring(0, 2).toUpperCase()}
            </span>
          </button>

          {/* Voice selection speaker icon */}
          <button 
            onClick={() => {
              setShowVoiceSheet(true);
              setShowLangSheet(false);
            }}
            className="w-10 h-10 rounded-full bg-slate-900/90 border border-white/10 hover:bg-white/10 text-slate-300 flex items-center justify-center transition shadow-lg relative cursor-pointer active:scale-95"
            title="Switch Voice Accent"
          >
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-[8px] text-white font-black rounded-full px-1 py-0.5">
              V{AI_VOICES.indexOf(selectedVoice) + 1}
            </span>
          </button>

          {/* Manual Keyboard Input Option (in case mic has no system access) */}
          <button 
            onClick={() => setShowKeyboardInput(!showKeyboardInput)}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition shadow-lg cursor-pointer active:scale-95 ${
              showKeyboardInput ? 'bg-indigo-600 border-transparent text-white' : 'bg-slate-900/90 border-white/10 text-slate-300'
            }`}
            title="Type manual text input fallback"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic keyboard manual input form */}
        {showKeyboardInput && (
          <form 
            onSubmit={handleKeyboardSubmit}
            className="absolute bottom-28 left-6 right-6 z-30 bg-slate-900 border border-white/15 p-3 rounded-2xl shadow-2xl flex gap-2"
          >
            <input 
              type="text" 
              value={keyboardText}
              onChange={(e) => setKeyboardText(e.target.value)}
              placeholder="Type message fallback..."
              className="flex-1 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white"
              autoFocus
            />
            <button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition"
            >
              Send
            </button>
          </form>
        )}
      </div>

      {/* 3. BOTTOM BUTTONS CONTROL BAR */}
      <div className="relative z-10 px-5 py-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col items-center gap-4">
        
        {/* Row of quick controllers */}
        <div className="flex items-center gap-4 sm:gap-6 justify-center w-full max-w-sm">
          
          {/* MUTE USER MICROPHONE CONTROLLER */}
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-full transition-all duration-300 flex flex-col items-center justify-center shadow-lg active:scale-90 relative cursor-pointer ${
              isMuted ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[9px] font-bold text-slate-400 mt-1 absolute -bottom-5">Mute</span>
          </button>

          {/* SCREEN SHARING OBSERVATION CONTROLLER */}
          <button 
            onClick={handleToggleScreenShare}
            className={`p-3.5 rounded-full transition-all duration-300 flex flex-col items-center justify-center shadow-lg active:scale-90 relative cursor-pointer ${
              isScreenSharing ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
            title="Share Screen with AI"
          >
            <Monitor className="w-5 h-5" />
            <span className="text-[9px] font-bold text-slate-400 mt-1 absolute -bottom-5">Share</span>
          </button>

          {/* FLIP LOCAL CAMERA CONTROLLER (For video call) */}
          {callType === 'video' && (
            <button 
              onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
              className="p-3.5 rounded-full bg-white/10 text-slate-300 hover:bg-white/20 transition-all duration-300 flex flex-col items-center justify-center shadow-lg active:scale-90 relative cursor-pointer"
              title="Flip Camera Stream"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="text-[9px] font-bold text-slate-400 mt-1 absolute -bottom-5">Flip</span>
            </button>
          )}

          {/* MANUAL CALL RECORDING CONTROLLER */}
          <button 
            onClick={handleToggleRecording}
            className={`p-3.5 rounded-full transition-all duration-300 flex flex-col items-center justify-center shadow-lg active:scale-90 relative cursor-pointer ${
              isRecording ? 'bg-amber-600 text-white hover:bg-amber-500 animate-pulse' : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
            title={isRecording ? "Stop Recording" : "Record Call"}
          >
            {isRecording ? <Square className="w-5 h-5 text-red-400" /> : <Disc className="w-5 h-5" />}
            <span className="text-[9px] font-bold text-slate-400 mt-1 absolute -bottom-5">Record</span>
          </button>

          {/* TERMINATE END CALL BUTTON */}
          <button 
            onClick={handleEndCall}
            className="p-3.5 bg-rose-600 text-white hover:bg-rose-500 rounded-full transition-all duration-300 flex flex-col items-center justify-center shadow-2xl active:scale-90 relative cursor-pointer hover:rotate-90"
            title="Terminate Call Session"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-[9px] font-bold text-rose-400 mt-1 absolute -bottom-5">End</span>
          </button>

        </div>
        
        {/* Spacer for button labels */}
        <div className="h-2" />
      </div>

      {/* 4. LANGUAGE SELECTOR HALF-SHEET */}
      {showLangSheet && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end justify-center">
          <div className="absolute inset-0" onClick={() => setShowLangSheet(false)} />
          <div className="relative w-full max-w-md bg-slate-900/95 border-t border-white/15 rounded-t-[32px] p-6 shadow-2xl space-y-4 animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Language Translation Settings</span>
                <h4 className="text-sm font-extrabold text-white mt-0.5">Select Spoken Language</h4>
              </div>
              <button 
                onClick={() => setShowLangSheet(false)}
                className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              RC Assistant will immediately translate its thoughts, replies, and vocal accents into your selected native tongue.
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage.name === lang.name;
                return (
                  <button
                    key={lang.name}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setShowLangSheet(false);
                      speakText(`Language translation changed to ${lang.name}.`);
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition ${
                      isSelected 
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' 
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xs font-bold">{lang.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. VOICE SELECTOR HALF-SHEET */}
      {showVoiceSheet && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end justify-center">
          <div className="absolute inset-0" onClick={() => setShowVoiceSheet(false)} />
          <div className="relative w-full max-w-md bg-slate-900/95 border-t border-white/15 rounded-t-[32px] p-6 shadow-2xl space-y-4 animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Synthesis Voice Settings</span>
                <h4 className="text-sm font-extrabold text-white mt-0.5">Select Spoken Accent & Gender</h4>
              </div>
              <button 
                onClick={() => setShowVoiceSheet(false)}
                className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              Choose one of four native sounding accents. Tap preview button next to voice to listen.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {AI_VOICES.map((voice) => {
                const isSelected = selectedVoice.id === voice.id;
                return (
                  <div
                    key={voice.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                      isSelected 
                        ? 'bg-emerald-600/10 border-emerald-500/40' 
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedVoice(voice);
                        setShowVoiceSheet(false);
                        speakText(`Synthesis voice changed to ${voice.name}.`, voice);
                      }}
                      className="flex-1 text-left"
                    >
                      <h5 className={`text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {voice.name} ({voice.gender === 'female' ? 'Female' : 'Male'})
                      </h5>
                      <p className="text-[10px] text-slate-400 mt-0.5">Characteristics: {voice.characteristics}</p>
                    </button>
                    
                    <button 
                      onClick={() => speakText(voice.previewText, voice)}
                      className="bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 rounded-lg p-2 flex items-center gap-1.5 transition text-[10px] font-black uppercase tracking-wider"
                      title="Preview Accent Sound"
                    >
                      <Volume1 className="w-3.5 h-3.5" /> Preview
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
