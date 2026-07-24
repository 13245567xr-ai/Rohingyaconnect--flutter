import React, { useState } from 'react';
import { X, CheckCircle2, Info, ChevronRight } from 'lucide-react';
import { User } from '../types';
import { updateUserDoc } from '../utils/firebaseSync';
import { BlueVerifiedTick } from './BlueVerifiedTick';

interface VerifiedBadgeMenuProps {
  currentUser: User;
  onClose: () => void;
}

export function VerifiedBadgeMenu({ currentUser, onClose }: VerifiedBadgeMenuProps) {
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(currentUser.verificationRequested || false);

  const handleRequestVerification = async () => {
    setLoading(true);
    try {
      await updateUserDoc(currentUser.id, { verificationRequested: true });
      setRequested(true);
      alert("Verification request successfully submitted! We will review your account shortly.");
    } catch (err) {
      console.error(err);
      alert("Failed to request verification. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-100 dark:border-slate-800 animate-slideUp">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <BlueVerifiedTick className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Verified Badge</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
              <BlueVerifiedTick className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Get Verified on RohingyaConnect</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              A verified badge confirms that this is the authentic profile for this public figure, community leader, or organization.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-4">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Requirements:</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Authentic profile with real name and photo</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Active community participation</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Refer or invite at least 5 members</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          {currentUser.isVerified ? (
            <div className="w-full py-3.5 px-4 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> You are already verified
            </div>
          ) : requested ? (
            <div className="w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2">
              <Info className="w-5 h-5" /> Verification Request Pending
            </div>
          ) : (
            <button
              onClick={handleRequestVerification}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Apply for Verification <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
