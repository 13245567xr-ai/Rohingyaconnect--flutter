import React, { useState } from 'react';
import { Mail, Phone, Lock, User as UserIcon, ShieldCheck, ArrowLeft, Chrome, Smartphone, Send, CheckCircle2 } from 'lucide-react';
import { AccountSession } from '../types';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAccount: AccountSession) => void;
}

export default function AuthOverlay({ isOpen, onClose, onSuccess }: AuthOverlayProps) {
  const [step, setStep] = useState<'options' | 'manual' | 'otp' | 'success'>('options');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [channel, setChannel] = useState<'phone' | 'email'>('phone');
  const [phoneOrEmailValue, setPhoneOrEmailValue] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    setLoading(true);
    setError('');
    setTimeout(() => {
      setLoading(false);
      const googleUsername = 'alam_connect_' + Math.floor(1000 + Math.random() * 9000);
      const newAcc: AccountSession = {
        id: 'g_' + Math.random().toString(36).substring(2, 9),
        fullName: 'Jafar Alam (Google)',
        username: googleUsername,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60',
        isActive: true,
        email: 'jafar.alam.connect@gmail.com'
      };
      onSuccess(newAcc);
      setStep('success');
    }, 1500);
  };

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !username.trim() || !phoneOrEmailValue.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (username.includes(' ') || username.startsWith('@')) {
      setError('Username should not contain spaces or start with @.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Generate a mock 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);
      setStep('otp');
      // Trigger a browser notification mockup
      alert(`[DEMO SYSTEM - OTP Verification Delivery]
Channel: ${channel === 'phone' ? 'Phone SMS/WhatsApp' : 'Gmail Inbox'}
Recipient: ${phoneOrEmailValue}
Your Rohingya Connect OTP verification code is: ${code}`);
    }, 1200);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otpCode.trim() !== sentCode && otpCode.trim() !== '123456') {
      setError('Invalid or expired OTP verification code. Please try again.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
      const newAcc: AccountSession = {
        id: 'man_' + Math.random().toString(36).substring(2, 9),
        fullName: fullName.trim(),
        username: cleanUsername,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanUsername}`,
        isActive: true,
        email: channel === 'email' ? phoneOrEmailValue.trim() : `${cleanUsername}@rohingyaconnect.org`
      };
      onSuccess(newAcc);
      setStep('success');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300"
        id="auth-overlay-container"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-[#1877F2] blur-md rounded-full" />

        {step === 'options' && (
          <div className="space-y-6 text-center">
            <div>
              <div className="mx-auto w-12 h-12 bg-slate-800 border border-slate-700 text-[#1877F2] flex items-center justify-center rounded-2xl mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-100 tracking-tight">Add Additional Session</h3>
              <p className="text-xs text-slate-400 mt-1">Authenticate and link multiple accounts for instant switching.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition duration-150 active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Chrome className="w-4.5 h-4.5 text-rose-500" />
                )}
                Sign up with Google
              </button>

              <button
                onClick={() => setStep('manual')}
                className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-[#1877F2]/10 transition duration-150 active:scale-98 cursor-pointer"
              >
                <UserIcon className="w-4.5 h-4.5" />
                Create New Account (Manual)
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition cursor-pointer pt-2 block mx-auto"
            >
              Cancel and Return
            </button>
          </div>
        )}

        {step === 'manual' && (
          <form onSubmit={handleSendOTP} className="space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <button 
                type="button" 
                onClick={() => setStep('options')} 
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">Manual Setup</h3>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-bold">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rohid Anwar"
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl pl-9 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:border-[#1877F2] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username (Handle)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. rohid_anwar"
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl pl-8 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:border-[#1877F2] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Verification Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChannel('phone');
                      setPhoneOrEmailValue('');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition duration-150 ${channel === 'phone' ? 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Phone (SMS/WhatsApp)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChannel('email');
                      setPhoneOrEmailValue('');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition duration-150 ${channel === 'email' ? 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                  >
                    <Mail className="w-4 h-4" />
                    Gmail Address
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {channel === 'phone' ? 'Phone Number (with Country Code)' : 'Gmail Account'}
                </label>
                <div className="relative">
                  {channel === 'phone' ? (
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  ) : (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  )}
                  <input
                    type={channel === 'phone' ? 'tel' : 'email'}
                    required
                    value={phoneOrEmailValue}
                    onChange={(e) => setPhoneOrEmailValue(e.target.value)}
                    placeholder={channel === 'phone' ? 'e.g. +60123456789' : 'e.g. rohid.anwar@gmail.com'}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl pl-9 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:border-[#1877F2] outline-none transition"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Verification Code
                </>
              )}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-5 text-center">
            <div>
              <div className="mx-auto w-12 h-12 bg-[#1877F2]/10 border border-[#1877F2]/20 text-[#1877F2] flex items-center justify-center rounded-2xl mb-3">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-base font-black text-slate-100">Verification OTP Sent</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter the 6-digit confirmation code delivered to{' '}
                <span className="font-extrabold text-slate-200">{phoneOrEmailValue}</span>
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-bold">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                className="w-40 text-center bg-slate-950 border border-slate-800 text-lg font-mono font-black tracking-[0.4em] rounded-xl px-4 py-3 text-slate-100 placeholder-slate-700 focus:border-[#1877F2] outline-none transition mx-auto block"
              />
              <p className="text-[10px] text-slate-500">
                Didn't receive the code?{' '}
                <button 
                  type="button" 
                  onClick={() => {
                    const code = Math.floor(100000 + Math.random() * 900000).toString();
                    setSentCode(code);
                    alert(`[OTP RESENT] Your new Rohingya Connect OTP verification code is: ${code}`);
                  }}
                  className="text-[#1877F2] font-bold hover:underline"
                >
                  Resend Code
                </button>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('manual')}
                className="w-1/3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold py-3 rounded-xl transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Verify & Link'
                )}
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="space-y-5 text-center py-4">
            <div className="mx-auto w-14 h-14 bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center rounded-full border border-[#1877F2]/20 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100">Verification Successful!</h3>
              <p className="text-xs text-slate-400 mt-1">Your new account is now linked and active in your session switcher.</p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer"
            >
              Open Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
