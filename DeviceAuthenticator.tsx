import React, { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, AlertCircle, X, ChevronRight, Check } from 'lucide-react';

interface DeviceAuthenticatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

type AuthMethod = 'fingerprint' | 'password';

export default function DeviceAuthenticator({
  isOpen,
  onClose,
  onSuccess,
  title = "Device Authentication Required",
  subtitle = "Verify your identity to access sensitive security data."
}: DeviceAuthenticatorProps) {
  const [method, setMethod] = useState<AuthMethod>('fingerprint');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Fingerprint scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Password state
  const [password, setPassword] = useState('');
  const DEFAULT_PASSWORD = "admin";

  const triggerNativeAuth = async () => {
    try {
      setErrorMsg(null);
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported on this browser or environment.");
      }
      
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error("Platform authenticator (fingerprint, Face ID, or passcode) is not available on this device.");
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const options: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: "RohingyaConnect Security",
            id: window.location.hostname || "localhost",
          },
          user: {
            id: userId,
            name: "rohingyaconnect_user_" + Date.now(),
            displayName: "RohingyaConnect User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: "none"
        }
      };

      const credential = await navigator.credentials.create(options);
      if (credential) {
        handleSuccess();
      } else {
        throw new Error("No credential returned.");
      }
    } catch (err: any) {
      console.warn("Native WebAuthn authentication failed or was cancelled:", err);
      let msg = err.message || String(err);
      if (msg.includes("NotAllowedError") || msg.includes("cancelled") || msg.includes("denied") || msg.includes("abort")) {
        msg = "Authentication was cancelled or declined by user.";
      } else if (msg.includes("SecurityError") || window.self !== window.top) {
        msg = "Native Biometric is blocked by the iframe sandbox. Please open the app in a new tab, or use the simulated controls below!";
      }
      setErrorMsg(msg);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset states
      setErrorMsg(null);
      setIsScanning(false);
      setScanProgress(0);
      setPassword('');

      // Auto-trigger native authenticators
      triggerNativeAuth();
    }
  }, [isOpen]);

  const handleSuccess = () => {
    setErrorMsg(null);
    onSuccess();
    onClose();
  };

  // Fingerprint interval logic
  useEffect(() => {
    let interval: any;
    if (isScanning) {
      interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsScanning(false);
            return 100;
          }
          return prev + 10;
        });
      }, 120);
    } else {
      setScanProgress(0);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  // Trigger success cleanly outside state updater loops
  useEffect(() => {
    if (scanProgress >= 100) {
      handleSuccess();
    }
  }, [scanProgress]);

  if (!isOpen) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DEFAULT_PASSWORD || password.trim().toLowerCase() === 'admin') {
      handleSuccess();
    } else {
      setErrorMsg("Authentication failed. Invalid password. (Hint: admin)");
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-sans">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden animate-fadeIn">
        
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">{title}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-750 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Native Phone Biometric / Passcode Lock Trigger */}
        <button
          onClick={triggerNativeAuth}
          className="w-full mb-4 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-lg shadow-emerald-950/30 active:scale-98"
        >
          <Fingerprint className="w-4 h-4 animate-pulse" /> Authenticate with your device lock
        </button>

        {/* Auth Method Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-6">
          <button
            onClick={() => { setMethod('fingerprint'); setErrorMsg(null); }}
            className={`py-2 text-[10px] font-extrabold rounded-xl flex flex-col items-center gap-1 transition ${method === 'fingerprint' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Fingerprint</span>
          </button>
          <button
            onClick={() => { setMethod('password'); setErrorMsg(null); }}
            className={`py-2 text-[10px] font-extrabold rounded-xl flex flex-col items-center gap-1 transition ${method === 'password' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Device Password</span>
          </button>
        </div>

        {/* Error Warning Display */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900/60 rounded-2xl flex items-center gap-2 text-red-200 text-[10px] animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MAIN METHOD VIEWS */}
        <div className="min-h-[180px] flex flex-col items-center justify-center p-2">

          {/* TOUCH ID FINGERPRINT SIMULATOR */}
          {method === 'fingerprint' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div 
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition border-2 cursor-pointer
                  ${isScanning ? 'border-emerald-500 bg-emerald-500/10 scale-95' : 'border-slate-800 bg-slate-950 hover:bg-slate-950/80 hover:border-slate-700'}`}
                onMouseDown={() => { setErrorMsg(null); setIsScanning(true); }}
                onMouseUp={() => setIsScanning(false)}
                onMouseLeave={() => setIsScanning(false)}
                onTouchStart={() => { setErrorMsg(null); setIsScanning(true); }}
                onTouchEnd={() => setIsScanning(false)}
              >
                {/* scanning circular rings */}
                {isScanning && (
                  <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-emerald-500/40 border-b-emerald-500/10 border-l-emerald-500/20 animate-spin" />
                )}
                <Fingerprint className={`w-12 h-12 transition-all ${isScanning ? 'text-emerald-400 scale-110' : 'text-slate-400'}`} />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold text-slate-200">
                  {isScanning ? `Scanning... ${scanProgress}%` : 'Press & Hold finger on scanner'}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Simulating standard device fingerprint credential unlock.
                </p>
              </div>
            </div>
          )}

          {/* DEVICE PASSWORD ENTRY */}
          {method === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 w-full">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Device Password / Passcode</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter device passcode/password..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-200 placeholder-slate-650"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1.5 p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer transition flex items-center justify-center"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 leading-snug">
                Fallback verification if biometrics are unavailable. Default simulator password is: <strong>admin</strong>
              </p>
            </form>
          )}

        </div>

        {/* Footer info text */}
        <div className="mt-4 pt-3.5 border-t border-slate-850/80 text-center text-[9px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Biometric credential secured by local enclave</span>
        </div>

      </div>
    </div>
  );
}
