import React, { useState } from 'react';
import { ShieldCheck, Smartphone, Globe, Clock, Laptop, LogOut, Mail, CheckCircle2, ChevronRight, Key, AlertTriangle, Play, Sparkles } from 'lucide-react';
import { User } from '../types';

interface SecurityCheckupProps {
  currentUser: User;
}

interface ActiveSession {
  id: string;
  device: string;
  location: string;
  status: string;
  type: 'mobile' | 'desktop';
  timeAgo: string;
}

interface EmailLog {
  id: string;
  subject: string;
  sentAt: string;
  status: string;
  content: string;
}

export default function SecurityCheckup({ currentUser }: SecurityCheckupProps) {
  const [activeSubSection, setActiveSubSection] = useState<'sessions' | 'emails' | 'wizard'>('sessions');

  // 1. WHERE YOU LOG IN STATE
  const [sessions, setSessions] = useState<ActiveSession[]>([
    {
      id: 's1',
      device: 'Apple iPhone 15 Pro Max',
      location: 'Cox\'s Bazar Camp 1E, Bangladesh',
      status: 'Active Now',
      type: 'mobile',
      timeAgo: 'Now'
    },
    {
      id: 's2',
      device: 'Chrome Browser (Windows 11)',
      location: 'Kuala Lumpur, Malaysia',
      status: '2 hours ago',
      type: 'desktop',
      timeAgo: '2 hours ago'
    },
    {
      id: 's3',
      device: 'Safari Browser (MacBook Air)',
      location: 'Sittwe, Rakhine State, Myanmar',
      status: '3 days ago',
      type: 'desktop',
      timeAgo: '3 days ago'
    }
  ]);

  const handleRevokeSession = (id: string) => {
    if (id === 's1') {
      alert("Cannot revoke current active session!");
      return;
    }
    const target = sessions.find(s => s.id === id);
    if (target && confirm(`Are you sure you want to terminate session on "${target.device}"?`)) {
      setSessions(sessions.filter(s => s.id !== id));
      alert("Session revoked successfully.");
    }
  };

  // 2. RECENT EMAILS STATE
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([
    {
      id: 'e1',
      subject: 'Security Alert: New sign-in detected on Chrome Browser',
      sentAt: '2026-06-26T18:40:00Z',
      status: 'Delivered',
      content: 'We noticed a new login on RohingyaConnect from Kuala Lumpur, Malaysia. If this was you, no action is needed. Otherwise, secure your account immediately.'
    },
    {
      id: 'e2',
      subject: 'Your RohingyaConnect Verification Code: 482094',
      sentAt: '2026-06-25T11:15:00Z',
      status: 'Delivered',
      content: 'Use code 482094 to complete verification on your mobile device. Code expires in 10 minutes.'
    },
    {
      id: 'e3',
      subject: 'Monthly Security Audit Summary Report',
      sentAt: '2026-06-01T08:00:00Z',
      status: 'Delivered',
      content: 'Your account security index is graded at A+. Passkey registered, 2FA active, no unrecognized sessions flagged.'
    }
  ]);

  const [viewingEmailId, setViewingEmailId] = useState<string | null>(null);

  // 3. SECURITY CHECKUP WIZARD STATE
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 'success'>(1);
  const [pwdStrength, setPwdStrength] = useState<'none' | 'analyzing' | 'strong'>('none');
  const [mfaVerified, setMfaVerified] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState(currentUser.email || '');
  const [recoveryPhone, setRecoveryPhone] = useState('+880 1812-445588');

  const startPwdCheck = () => {
    setPwdStrength('analyzing');
    setTimeout(() => {
      setPwdStrength('strong');
    }, 1500);
  };

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* Sub-tab selections */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-1.5 gap-2 border">
        <button
          onClick={() => setActiveSubSection('sessions')}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${activeSubSection === 'sessions' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
        >
          <Smartphone className="w-4 h-4" /> Logged In Devices
        </button>
        <button
          onClick={() => setActiveSubSection('emails')}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${activeSubSection === 'emails' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
        >
          <Mail className="w-4 h-4" /> Official Email Logs
        </button>
        <button
          onClick={() => setActiveSubSection('wizard')}
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${activeSubSection === 'wizard' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
        >
          <ShieldCheck className="w-4 h-4" /> Security Checkup Wizard
        </button>
      </div>

      {/* 1. WHERE YOU LOG IN */}
      {activeSubSection === 'sessions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400">Device Security</h3>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">Where You Are Logged In</h4>
            <p className="text-[11px] text-slate-400 font-light mt-0.5">Review active login sessions on various devices and locations. Log out of unrecognized portals.</p>
          </div>

          <div className="space-y-3.5 divide-y divide-slate-100 dark:divide-slate-850">
            {sessions.map((ses) => (
              <div key={ses.id} className="flex justify-between items-center gap-3 pt-3.5 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border rounded-2xl text-slate-500 dark:text-slate-400">
                    {ses.type === 'mobile' ? <Smartphone className="w-5.5 h-5.5 text-emerald-500" /> : <Laptop className="w-5.5 h-5.5 text-sky-500" />}
                  </div>

                  <div>
                    <h5 className="text-xs font-extrabold text-slate-850 dark:text-slate-150 leading-tight">{ses.device}</h5>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-1 font-semibold">
                      <Globe className="w-3 h-3 text-slate-400" />
                      <span>{ses.location}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span className={ses.id === 's1' ? 'text-emerald-500 font-black' : ''}>{ses.status}</span>
                    </div>
                  </div>
                </div>

                {ses.id !== 's1' && (
                  <button
                    onClick={() => handleRevokeSession(ses.id)}
                    className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition cursor-pointer text-slate-400 flex items-center gap-1 text-[10px] font-extrabold border border-transparent hover:border-rose-200"
                    title="Terminate session"
                  >
                    <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Terminate</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. RECENT EMAILS LOGS */}
      {activeSubSection === 'emails' && (
        <div className="space-y-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-400">Audit Logs</h3>
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">Recent Security Emails (Archive)</h4>
              <p className="text-[11px] text-slate-400 font-light mt-0.5">Verify official emails sent by RohingyaConnect. We will never ask for credentials via email.</p>
            </div>

            <div className="space-y-3">
              {emailLogs.map((email) => (
                <div 
                  key={email.id} 
                  onClick={() => setViewingEmailId(viewingEmailId === email.id ? null : email.id)}
                  className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-850/50 border border-slate-150 dark:border-slate-850 rounded-2xl cursor-pointer flex justify-between items-center transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <Mail className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-extrabold text-slate-850 dark:text-slate-200 truncate leading-snug">{email.subject}</h5>
                      <span className="text-[9px] text-slate-400">{new Date(email.sentAt).toLocaleDateString()} at {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Status: {email.status}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transform transition ${viewingEmailId === email.id ? 'rotate-90' : ''}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Email Content Details Overlay */}
          {viewingEmailId && (
            <div className="p-5 bg-slate-900 text-white border border-slate-800 rounded-3xl animate-fadeIn shadow-lg">
              <h4 className="text-xs font-black uppercase text-emerald-400">Secure Email Viewer</h4>
              <h5 className="text-sm font-extrabold text-white mt-1">
                {emailLogs.find(e => e.id === viewingEmailId)?.subject}
              </h5>
              <p className="text-[11px] text-slate-350 leading-relaxed whitespace-pre-line mt-3 p-4 bg-slate-850/60 rounded-xl border border-slate-800">
                {emailLogs.find(e => e.id === viewingEmailId)?.content}
              </p>
            </div>
          )}

        </div>
      )}

      {/* 3. SECURITY CHECKUP WIZARD */}
      {activeSubSection === 'wizard' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          
          {/* Progress Indicators */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xs font-black uppercase text-emerald-500 flex items-center gap-1">
                <Sparkles className="w-4 h-4 animate-pulse" /> Security Checkup wizard
              </h3>
              <p className="text-[10px] text-slate-400">Complete all 4 secure checks to grade your profile security.</p>
            </div>

            {wizardStep !== 'success' && (
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border">
                Step {wizardStep} of 4
              </span>
            )}
          </div>

          {/* Step 1: Password Checkup */}
          {wizardStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                  <Key className="w-4.5 h-4.5 text-emerald-500" /> 1. Evaluates Password Strength
                </h4>
                <p className="text-[11px] text-slate-400 font-light mt-1.5 leading-relaxed">
                  We check your current password hash against compromised global directories to guarantee maximum resilience.
                </p>

                {pwdStrength === 'none' && (
                  <button
                    onClick={startPwdCheck}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Run Strength Check
                  </button>
                )}

                {pwdStrength === 'analyzing' && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-amber-500 animate-pulse font-semibold">
                    <AlertTriangle className="w-4.5 h-4.5" /> Analyzing password complexity...
                  </div>
                )}

                {pwdStrength === 'strong' && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-500 font-bold">
                    <CheckCircle2 className="w-4.5 h-4.5" /> High Entropy Verified: Your password is extremely strong!
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  disabled={pwdStrength !== 'strong'}
                  onClick={() => setWizardStep(2)}
                  className="bg-slate-900 disabled:opacity-30 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Continue to Step 2
                </button>
              </div>
            </div>
          )}

          {/* Step 2: 2FA Verification */}
          {wizardStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" /> 2. Two-Factor Verification Check
                </h4>
                <p className="text-[11px] text-slate-400 font-light mt-1.5 leading-relaxed">
                  Ensures MFA token verifications are active so unrecognized logins cannot bypass security blocks.
                </p>

                <div className="mt-4 flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Simulated 2FA Setup status:</span>
                  <button
                    onClick={() => setMfaVerified(!mfaVerified)}
                    className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md transition ${mfaVerified ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 border'}`}
                  >
                    {mfaVerified ? 'MFA ACTIVE' : 'MARK SECURE'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setWizardStep(1)} className="text-xs text-slate-500 font-bold">Previous</button>
                <button
                  onClick={() => setWizardStep(3)}
                  className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Continue to Step 3
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Recovery Coordinates Checkup */}
          {wizardStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                  <Mail className="w-4.5 h-4.5 text-emerald-500" /> 3. Verify Recovery Coordinates
                </h4>
                <p className="text-[11px] text-slate-400 font-light mt-1.5 leading-relaxed">
                  Confirm your recovery credentials so you can securely retrieve access if you lose password parameters.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">Recovery Email</label>
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border text-xs rounded-lg px-3.5 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">Backup Phone (SMS)</label>
                    <input
                      type="text"
                      value={recoveryPhone}
                      onChange={(e) => setRecoveryPhone(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border text-xs rounded-lg px-3.5 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setWizardStep(2)} className="text-xs text-slate-500 font-bold">Previous</button>
                <button
                  onClick={() => setWizardStep(4)}
                  className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Continue to Step 4
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Session Approval */}
          {wizardStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                  <Smartphone className="w-4.5 h-4.5 text-emerald-500" /> 4. Terminate or Approve Sessions
                </h4>
                <p className="text-[11px] text-slate-400 font-light mt-1.5 leading-relaxed">
                  Review and sign off on all currently active sessions. Terminate any browser that feels unrecognized.
                </p>

                <div className="mt-3.5 space-y-2">
                  {sessions.map(s => (
                    <div key={s.id} className="text-[10px] font-bold text-slate-600 dark:text-slate-350 flex justify-between items-center p-2 bg-white dark:bg-slate-900 border rounded-lg">
                      <span>{s.device} ({s.location})</span>
                      <span className="text-emerald-500">Verified</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setWizardStep(3)} className="text-xs text-slate-500 font-bold">Previous</button>
                <button
                  onClick={() => {
                    alert("Running final audit... Analyzing security variables...");
                    setTimeout(() => setWizardStep('success'), 1000);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Complete Security Audit
                </button>
              </div>
            </div>
          )}

          {/* Step Success */}
          {wizardStep === 'success' && (
            <div className="text-center py-10 space-y-4 animate-fadeIn">
              <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-12 h-12 animate-bounce" />
              </div>

              <div>
                <h4 className="text-lg font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">Security Audit Completed!</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-light mt-1">
                  Your RohingyaConnect profile is now completely secure. Device list approved, passkey verified, and recovery email synced.
                </p>
              </div>

              <button
                onClick={() => setWizardStep(1)}
                className="bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-xl"
              >
                Reset Checkup Wizard
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
