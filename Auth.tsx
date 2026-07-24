import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, UserPlus, HeartHandshake, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createUserDoc } from '../utils/firebaseSync';

interface AuthProps {
  onLoginSuccess: (user: User) => void;
  users: User[];
  onRegisterUser: (newUser: User) => void;
}

export default function Auth({ onLoginSuccess, users, onRegisterUser }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthProviderDisabled, setIsAuthProviderDisabled] = useState(false);

  const handleQuickDemoLogin = (isAdmin: boolean) => {
    const demoUser = users.find(u => isAdmin ? u.role === 'admin' : (u.role === 'user' && u.email !== 'admin@rohingyaconnect.com')) || users[0] || {
      id: isAdmin ? 'admin_root' : 'demo_user_1',
      email: isAdmin ? 'admin@rohingyaconnect.com' : 'voice@arakan.org',
      fullName: isAdmin ? 'RohingyaConnect Administrator' : 'Nurul Islam',
      username: isAdmin ? 'admin' : 'nurul_arakan',
      avatar: isAdmin 
        ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
      coverPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&h=300&q=80',
      bio: isAdmin ? 'Official Admin Account of RohingyaConnect.' : 'Human rights activist and community organizer.',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      followers: [],
      following: [],
      role: isAdmin ? 'admin' : 'user',
      status: 'active'
    };
    onLoginSuccess(demoUser);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsAuthProviderDisabled(false);
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      // Firebase Authentication Login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      // Retrieve user document from Firestore
      const docRef = doc(db, 'rc_users', fbUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.status === 'disabled') {
          setError('This account has been suspended by the administrator.');
          await auth.signOut();
          return;
        }
        onLoginSuccess(userData as User);
      } else {
        // Fallback: create user document if they are not in Firestore
        const newUser = await createUserDoc(fbUser.uid, {
          email: fbUser.email || email,
          fullName: fbUser.displayName || email.split('@')[0],
          username: fbUser.displayName ? fbUser.displayName.toLowerCase().replace(/ /g, '') : email.split('@')[0]
        });
        onLoginSuccess(newUser as User);
      }
    } catch (err: any) {
      console.error(err);
      let friendlyError = 'Incorrect email or password.';
      if (err.code === 'auth/user-not-found') friendlyError = 'No account found with this email.';
      if (err.code === 'auth/wrong-password') friendlyError = 'Incorrect password.';
      if (err.code === 'auth/invalid-email') friendlyError = 'Invalid email address.';
      if (err.code === 'auth/invalid-credential') friendlyError = 'Incorrect email or password. Please verify your credentials or register a new account.';
      if (err.code === 'auth/operation-not-allowed') {
        friendlyError = 'Email/Password sign-in is currently disabled in your Firebase project.';
        setIsAuthProviderDisabled(true);
      }
      setError(friendlyError);
    }
  };

  const [registerStep, setRegisterStep] = useState(1);
  const [birthdayDay, setBirthdayDay] = useState('');
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayYear, setBirthdayYear] = useState('');
  const [gender, setGender] = useState('');
  const [customGender, setCustomGender] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'phone' | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const validateStep1 = () => {
    if (!email || !password || !fullName || !username) {
      setError('Please fill in all required fields.');
      return false;
    }
    if (username.includes(' ') || username.startsWith('@')) {
      setError('Username should not contain spaces or start with @.');
      return false;
    }
    return true;
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (validateStep1()) {
      setRegisterStep(2);
    }
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!birthdayDay || !birthdayMonth || !birthdayYear || !gender || (gender === 'Others' && !customGender)) {
      setError('Please fill in all required fields for step 2.');
      return;
    }
    setRegisterStep(3);
  };

  const handleFinalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!verificationMethod || (verificationMethod === 'phone' && !phoneNumber)) {
      setError('Please select a verification method and fill in required fields.');
      return;
    }

    try {
      // Firebase Auth creation
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      if (verificationMethod === 'email') {
        await sendEmailVerification(fbUser);
      } else if (verificationMethod === 'phone') {
        // NOTE: Phone auth requires additional Firebase configuration (Phone Auth Provider).
        // This is a placeholder for actual OTP logic.
        console.log('Initiating phone verification for', phoneNumber);
      }

      // Create user profile document in Firestore
      const newUser = await createUserDoc(fbUser.uid, {
        email,
        fullName,
        username: username.toLowerCase(),
        securityQuestion: 'What is your favorite cultural dish?', 
        securityAnswer,
        dateOfBirth: `${birthdayYear}-${birthdayMonth.padStart(2, '0')}-${birthdayDay.padStart(2, '0')}`,
        birthday: `${birthdayYear}-${birthdayMonth.padStart(2, '0')}-${birthdayDay.padStart(2, '0')}`,
        birthdayDay,
        birthdayMonth,
        birthdayYear,
        gender,
        customGender: gender === 'Others' ? customGender : undefined,
        verificationMethod,
        phoneNumber: verificationMethod === 'phone' ? phoneNumber : undefined,
        createdAt: new Date().toISOString()
      });

      onRegisterUser(newUser as User);
      setSuccess('Registration successful! Logging you in...');
      setTimeout(() => {
        onLoginSuccess(newUser as User);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      let friendlyError = 'Registration failed. Try a different email.';
      if (err.code === 'auth/email-already-in-use') friendlyError = 'This email is already registered.';
      if (err.code === 'auth/weak-password') friendlyError = 'Password is too weak. Must be at least 6 characters.';
      if (err.code === 'auth/invalid-credential') friendlyError = 'Invalid registration credentials or configuration.';
      setError(friendlyError);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset link successfully sent to your inbox via Firebase!');
      setTimeout(() => {
        setIsForgot(false);
        setIsLogin(true);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError('Error sending reset email. Please try again.');
    }
  };


  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-900 px-4 py-8">
      
      {/* Branding and Greeting Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md rounded-2xl border border-emerald-500/30 p-8 shadow-2xl text-white transition-all">
        
        {/* App Logo & Name */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/20 rounded-2xl border border-emerald-400/40 mb-3 animate-pulse">
            <HeartHandshake className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            RohingyaConnect
          </h1>
          <p className="text-sm text-emerald-300/80 mt-2 font-medium">
            Version 1.0 • Connecting Hearts, Sharing Stories
          </p>
        </div>

        {/* INSTANT PREVIEW ACCESS BOX */}
        <div className="bg-gradient-to-r from-emerald-900/70 to-teal-900/70 border border-emerald-400/40 rounded-xl p-4 mb-6 shadow-lg backdrop-blur-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2.5 flex items-center gap-1.5 justify-center">
            <span>⚡ Instant Preview Access (One-Click Demo)</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin(false)}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-3 rounded-lg transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>👤 Community Demo</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin(true)}
              className="bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 font-semibold text-xs py-2.5 px-3 rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🛡️ Admin Demo</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-300/80 text-center mt-2">
            No Firebase sign-in required. Explore real-time messaging, stories & community tools immediately!
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-lg p-3 mb-4 animate-shake">
            {error}
          </div>
        )}

        {isAuthProviderDisabled && (
          <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-4 mb-4 text-amber-200 text-xs space-y-2">
            <p className="font-bold text-sm text-amber-400">⚠️ Firebase Auth Configuration Required</p>
            <p>
              The <strong>Email/Password sign-in provider</strong> has not been enabled in your Firebase project. To fix this:
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
              <li>Open your <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline hover:text-emerald-300 font-semibold">Firebase Console</a>.</li>
              <li>Go to <strong>Authentication</strong> &gt; <strong>Sign-in method</strong>.</li>
              <li>Click <strong>Add new provider</strong> (or click <strong>Email/Password</strong>).</li>
              <li>Toggle <strong>Email/Password</strong> to <strong>Enabled</strong> and click <strong>Save</strong>.</li>
              <li>Once enabled, refresh this page and try again!</li>
            </ol>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-lg p-3 mb-4">
            {success}
          </div>
        )}

        {isForgot ? (
          /* Forgot Password Mode */
          <form onSubmit={handleForgot} className="space-y-4">
            <h2 className="text-xl font-semibold mb-2">Forgot Password?</h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter your registered email address and we will simulate a secure reset link.
            </p>

            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-emerald-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-500 text-sm outline-none transition"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30 cursor-pointer"
            >
              Reset Password
            </button>

            <button
              type="button"
              onClick={() => setIsForgot(false)}
              className="w-full text-slate-400 hover:text-white text-xs text-center transition py-1"
            >
              Back to Login
            </button>
          </form>
        ) : isLogin ? (
          /* Login Mode */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-emerald-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-500 text-sm outline-none transition"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-emerald-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-500 text-sm outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex justify-between items-center text-xs">
              <label className="flex items-center text-slate-400 cursor-pointer">
                <input type="checkbox" defaultChecked className="mr-1.5 accent-emerald-500" /> Remember me
              </label>
              <button
                type="button"
                onClick={() => setIsForgot(true)}
                className="text-emerald-400 hover:text-emerald-300 hover:underline transition"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              Sign In
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-bold tracking-wider">OR</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="w-full bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 border border-emerald-500/25 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Create New Account
            </button>
          </form>
        ) : (
          /* Register Mode */
          <form onSubmit={registerStep === 1 ? handleNextStep1 : registerStep === 2 ? handleNextStep2 : handleFinalRegister} className="space-y-4">
            {registerStep === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-emerald-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:border-emerald-500 text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-emerald-500 font-bold">@</span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:border-emerald-500 text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-emerald-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:border-emerald-500 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-emerald-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create Password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:border-emerald-500 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>

                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-750">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-1">
                    Security Question (For Reset)
                  </label>
                  <p className="text-[11px] text-slate-300 mb-2">What is your favorite cultural dish?</p>
                  <input
                    type="text"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="e.g. Rohingya Mohinga or Biryani"
                    className="w-full px-3 py-1.5 bg-slate-850 border border-slate-700 rounded-lg focus:border-emerald-500 text-xs text-white outline-none"
                  />
                </div>
              </>
            ) : registerStep === 2 ? (
              <>
                <h2 className="text-lg font-semibold text-white">Step 2: Personal Details</h2>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-750">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-2">Date of Birth</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" placeholder="Day" value={birthdayDay} onChange={(e) => setBirthdayDay(e.target.value)} className="w-full px-2 py-1.5 bg-slate-850 border border-slate-700 rounded-lg text-xs text-white outline-none" />
                    <input type="number" placeholder="Month" value={birthdayMonth} onChange={(e) => setBirthdayMonth(e.target.value)} className="w-full px-2 py-1.5 bg-slate-850 border border-slate-700 rounded-lg text-xs text-white outline-none" />
                    <input type="number" placeholder="Year" value={birthdayYear} onChange={(e) => setBirthdayYear(e.target.value)} className="w-full px-2 py-1.5 bg-slate-850 border border-slate-700 rounded-lg text-xs text-white outline-none" />
                  </div>
                </div>

                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-750">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-2">Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('Male')}
                      className={`px-2 py-2 rounded-lg text-xs border transition-colors ${gender === 'Male' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-850 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('Female')}
                      className={`px-2 py-2 rounded-lg text-xs border transition-colors ${gender === 'Female' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-850 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      Female
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('Others')}
                      className={`px-2 py-2 rounded-lg text-xs border transition-colors ${gender === 'Others' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-850 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      Others
                    </button>
                  </div>
                  {gender === 'Others' && (
                    <input type="text" placeholder="Please specify your gender" value={customGender} onChange={(e) => setCustomGender(e.target.value)} className="w-full mt-2 px-3 py-1.5 bg-slate-850 border border-slate-700 rounded-lg text-xs text-white outline-none" />
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-white">Step 3: Verification</h2>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-750">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-2">Choose Method</label>
                  <div className="grid grid-cols-2 gap-2 relative z-50 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => setVerificationMethod('email')}
                      className={`px-2 py-2 rounded-lg text-xs border transition-colors ${verificationMethod === 'email' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-850 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationMethod('phone')}
                      className={`px-2 py-2 rounded-lg text-xs border transition-colors ${verificationMethod === 'phone' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-850 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      Phone
                    </button>
                  </div>
                  {verificationMethod === 'phone' && (
                    <input type="tel" placeholder="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full mt-2 px-3 py-1.5 bg-slate-850 border border-slate-700 rounded-lg text-xs text-white outline-none" />
                  )}
                </div>
              </>
            )}

            <div className="flex gap-3">
              {registerStep > 1 && (
                <button
                  type="button"
                  onClick={() => setRegisterStep(registerStep - 1)}
                  className="w-1/3 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-lg cursor-pointer"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                className={`w-full ${registerStep > 1 ? 'w-2/3' : ''} bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer`}
              >
                {registerStep === 3 ? 'Create Account' : 'Next'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
                setRegisterStep(1);
              }}
              className="w-full text-slate-400 hover:text-white text-[11px] text-center transition"
            >
              Already have an account? Sign In
            </button>
          </form>
        )
        }

        <div className="mt-8 pt-4 border-t border-slate-850 text-center">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            By connecting, you agree to RohingyaConnect Community Guidelines to protect unity, heritage, and mutual respect.
          </p>
        </div>
      </div>
    </div>
  );
}
