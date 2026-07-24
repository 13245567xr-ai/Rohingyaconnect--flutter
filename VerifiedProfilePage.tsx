import React from 'react';
import { ChevronLeft, CheckCircle2, Shield, Users, Clock, Star, Info, Award } from 'lucide-react';
import { User } from '../types';
import { BlueVerifiedTick } from './BlueVerifiedTick';
import { updateUserDoc } from '../utils/firebaseSync';

interface VerifiedProfilePageProps {
  currentUser: User;
  onBack: () => void;
}

export default function VerifiedProfilePage({ currentUser, onBack }: VerifiedProfilePageProps) {
  const [loading, setLoading] = React.useState(false);
  const [requested, setRequested] = React.useState(currentUser.verificationRequested || false);

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

  // Logic for eligibility
  const hasMinInvites = (currentUser.invitesCount || 0) >= 5;
  const isEligible = hasMinInvites && currentUser.status === 'active';
  
  // Calculate account age (mock or real)
  const createdAt = currentUser.createdAt ? new Date(currentUser.createdAt) : new Date();
  const accountAgeDays = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Verified Profile</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Status Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <BlueVerifiedTick className="w-12 h-12" />
            </div>
            {currentUser.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-4 border-white dark:border-slate-900">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {currentUser.isVerified ? "Verified Account" : "Verification Status"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            The blue badge confirms that this is the authentic profile for this public figure or organization.
          </p>
        </div>

        {/* Requirements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <Users className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Referral Progress</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Invited Members</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.invitesCount || 0} / 5</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${Math.min(((currentUser.invitesCount || 0) / 5) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <Star className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Community Standing</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">Excellent</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Account Age</h3>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {accountAgeDays} <span className="text-sm font-normal text-slate-500">days</span>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Eligibility</h3>
            </div>
            <div className={`text-sm font-bold ${isEligible ? 'text-green-600' : 'text-orange-600'}`}>
              {isEligible ? "Ready for Verification" : "Keep participating to unlock"}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" /> What verification means
          </h3>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-blue-700 dark:text-blue-300" />
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-bold">Authenticity:</span> Verified accounts are confirmed to be who they claim to be.
              </p>
            </li>
            <li className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-blue-700 dark:text-blue-300" />
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-bold">Reach:</span> Content from verified accounts may receive higher visibility in feeds and search.
              </p>
            </li>
            <li className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-blue-700 dark:text-blue-300" />
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-bold">Trust:</span> The badge helps community members find credible sources of information.
              </p>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="pt-4">
          {currentUser.isVerified ? (
            <div className="w-full p-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-2xl font-bold text-center border border-green-200 dark:border-green-800">
              Your account is currently verified
            </div>
          ) : requested ? (
            <div className="w-full p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-center flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700">
              <Clock className="w-5 h-5" /> Verification Pending Review
            </div>
          ) : (
            <button
              onClick={handleRequestVerification}
              disabled={loading || !isEligible}
              className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-[0.98] ${
                isEligible 
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' 
                : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed'
              }`}
            >
              {loading ? "Processing..." : "Apply for Verification"}
            </button>
          )}
          {!isEligible && !currentUser.isVerified && !requested && (
            <p className="text-center text-xs text-slate-500 mt-3 flex items-center justify-center gap-1">
              <Info className="w-3 h-3" /> Complete the referral requirement to unlock applications.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
