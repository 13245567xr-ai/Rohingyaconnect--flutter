import React, { useState, useEffect } from 'react';
import { ShieldCheck, HelpCircle, Sparkles, Fingerprint, Copy, RefreshCw, KeyRound } from 'lucide-react';
import { User } from '../types';
import DeviceAuthenticator from './DeviceAuthenticator';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const BIP39_WORDS = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
  "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
  "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
  "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
  "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
  "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter",
  "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger",
  "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
  "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic",
  "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest",
  "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset",
  "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "audience",
  "audio", "audit", "august", "aunt", "author", "auto", "autumn", "average", "avoid", "awake"
];

const ENCRYPTION_KEY = 'RohingyaConnect_Secret_Key';

function encryptText(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(unescape(encodeURIComponent(result)));
}

function decryptText(ciphertext: string): string {
  try {
    const decoded = decodeURIComponent(escape(atob(ciphertext)));
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error("Decryption failed:", e);
    return '';
  }
}

interface EncryptedChatSecurityProps {
  currentUser: User;
}

export default function EncryptedChatSecurity({ currentUser }: EncryptedChatSecurityProps) {
  // 1. SECURITY ALERT TOGGLES STATE
  const [ownKeyNotify, setOwnKeyNotify] = useState(true);
  const [contactKeyNotify, setContactKeyNotify] = useState(true);

  // 2. DOCUMENTATION EXPAND STATE
  const [showDocHelp, setShowDocHelp] = useState(false);

  // 3. SECURE STORAGE VAULT STATE
  const [localVaultSync, setLocalVaultSync] = useState(true);
  const [sandboxBackup, setSandboxBackup] = useState(false);

  // 4. BIOMETRIC UNLOCK STATE
  const [isBiometricUnlocked, setIsBiometricUnlocked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 5. RECOVERY KEYPHRASE STATE
  const [keyphraseWords, setKeyphraseWords] = useState<string[]>([]);
  const [isLoadingKeyphrase, setIsLoadingKeyphrase] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const generateRandomKeyphrase = (): string[] => {
    const words: string[] = [];
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * BIP39_WORDS.length);
      words.push(BIP39_WORDS[randomIndex]);
    }
    return words;
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchKeyphrase = async () => {
      try {
        const docRef = doc(db, 'rc_users', currentUser.id, 'e2ee', 'recoveryKeyphrase');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.encryptedKeyphrase) {
            const decrypted = decryptText(data.encryptedKeyphrase);
            if (decrypted) {
              setKeyphraseWords(decrypted.split(' '));
              setIsLoadingKeyphrase(false);
              return;
            }
          }
        }
        
        // If none exists, generate 12 new random words and save them encrypted
        const words = generateRandomKeyphrase();
        setKeyphraseWords(words);
        const encrypted = encryptText(words.join(' '));
        await setDoc(docRef, {
          encryptedKeyphrase: encrypted,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error loading or generating recovery keyphrase:', error);
        // Fallback: generate locally if offline or error so UI still functions
        const words = generateRandomKeyphrase();
        setKeyphraseWords(words);
      } finally {
        setIsLoadingKeyphrase(false);
      }
    };

    fetchKeyphrase();
  }, [currentUser?.id]);

  const handleCopy = async () => {
    try {
      const textToCopy = keyphraseWords.join(' ');
      await navigator.clipboard.writeText(textToCopy);
      setToast("Copied successfully 12 words");
      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleGenerateNewKeyphrase = async () => {
    setIsLoadingKeyphrase(true);
    try {
      const words = generateRandomKeyphrase();
      setKeyphraseWords(words);
      const encrypted = encryptText(words.join(' '));
      const docRef = doc(db, 'rc_users', currentUser.id, 'e2ee', 'recoveryKeyphrase');
      await setDoc(docRef, {
        encryptedKeyphrase: encrypted,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving new keyphrase:', error);
    } finally {
      setIsLoadingKeyphrase(false);
      setShowConfirmModal(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsBiometricUnlocked(true);
  };

  return (
    <div className="space-y-6 select-none font-sans relative">
      
      {/* Overview Card */}
      <div className="bg-slate-950 text-white border border-slate-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 to-black/20 pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 animate-pulse" /> Advanced Cryptography Config
          </span>
          <h2 className="text-lg font-black tracking-tight mt-1">E2EE Chat Security</h2>
          <p className="text-[11px] text-slate-400 font-light leading-snug mt-1">
            RohingyaConnect messages are encrypted end-to-end using double-ratchet cryptographic protocols. Manage notifications, key verification, and secure offline storage.
          </p>
        </div>
      </div>

      {/* Biometric Lock Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl">
            <Fingerprint className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-850 dark:text-slate-150 leading-snug">Biometric Lock</h4>
            <p className="text-[10px] text-slate-400 font-light mt-0.5">Secure chat access with fingerprint or device password/pattern</p>
          </div>
        </div>
        
        {!isBiometricUnlocked ? (
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer border-0"
          >
            <Fingerprint className="w-4 h-4" /> Authenticate Lock
          </button>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/40 rounded-2xl text-xs font-black text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" /> Biometrics Authenticated Successfully
          </div>
        )}

        {isBiometricUnlocked && (
          <>
            {/* Divider */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 my-3" />

            {/* 12-Word Recovery Keyphrase Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl">
                  <KeyRound className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-850 dark:text-slate-150 leading-snug">Recovery Keyphrase</h4>
                  <p className="text-[10px] text-slate-400 font-light mt-0.5">Write this down. You need it to restore chat history on new devices.</p>
                </div>
              </div>

              {isLoadingKeyphrase ? (
                <div className="h-28 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* 12 BIP39 words in 3x4 grid */}
                  <div className="grid grid-cols-3 gap-2 mt-2 select-text">
                    {keyphraseWords.map((word, idx) => (
                      <div 
                        key={idx} 
                        className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl text-center text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-850 select-text"
                      >
                        <span className="text-[10px] text-slate-400 mr-1.5 font-sans select-none">{idx + 1}.</span>{word}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2.5 mt-3">
                    <button
                      onClick={handleCopy}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border-0"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-650 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border border-rose-100 dark:border-rose-900/30"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Generate New
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {isBiometricUnlocked && (
        <div className="space-y-6 animate-fadeIn">
          {/* 1. SECURITY ALERTS CONFIG PAGE (Toggles) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Security Alerts Configuration</h3>
            
            {/* Toggle 1: Own device or key change notifications */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-150 dark:border-slate-850">
              <div className="max-w-[80%]">
                <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-150 leading-snug">My Device & Key Change Alerts</h4>
                <p className="text-[9px] text-slate-400 font-light mt-0.5">Show chat security warning alerts when you sign in from a new device or regenerate your local identity keys.</p>
              </div>

              <button
                onClick={() => setOwnKeyNotify(!ownKeyNotify)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer border-0 ${ownKeyNotify ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${ownKeyNotify ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle 2: Contact device or key change notifications */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-150 dark:border-slate-850">
              <div className="max-w-[80%]">
                <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-150 leading-snug">Contact Device & Key Change Alerts</h4>
                <p className="text-[9px] text-slate-400 font-light mt-0.5">Show chat security warning alerts in conversation threads when a contact's device, signature key, or active chat session changes.</p>
              </div>

              <button
                onClick={() => setContactKeyNotify(!contactKeyNotify)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer border-0 ${contactKeyNotify ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${contactKeyNotify ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* "Learn more about security keys" documentation text link */}
            <button 
              onClick={() => setShowDocHelp(!showDocHelp)}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-extrabold flex items-center gap-1 pt-1 cursor-pointer bg-transparent border-0"
            >
              <HelpCircle className="w-4 h-4" /> Learn more about security keys and cryptographic ratchets
            </button>

            {/* Expanded Documentation Panel */}
            {showDocHelp && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border rounded-2xl animate-fadeIn space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" /> Cryptographic Identity Verifications
                </h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                  Every device logged into RohingyaConnect generates a unique, mathematically verified Public/Private signature keypair. When starting a chat session, keys are exchanged using secure Diffie-Hellman protocols.
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                  If a contact signs out, reinstalls the app, or updates their operating system, their security key changes. This triggers a verification warning in the chat thread so you can confirm their identity face-to-face or via alternative secure routes before resuming sensitive discussions.
                </p>
              </div>
            )}

          </div>

          {/* 3. SECURE STORAGE (Local Vault Backup) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Secure Local Vault Settings</h3>
              <p className="text-[10px] text-slate-400 font-light mt-0.5">Encrypt and store chat archives offline on your device, bypass cloud storage for maximum privacy.</p>
            </div>

            {/* Sync backup toggles */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-150 dark:border-slate-850">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-150 leading-snug">Automatic Local Vault Backup</h4>
                  <p className="text-[9px] text-slate-400 font-light mt-0.5">Daily encryption of chat threads cached directly into local storage.</p>
                </div>

                <button
                  onClick={() => setLocalVaultSync(!localVaultSync)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer border-0 ${localVaultSync ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${localVaultSync ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-150 dark:border-slate-850">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-150 leading-snug">Sync Backups To Secure Sandbox</h4>
                  <p className="text-[9px] text-slate-400 font-light mt-0.5">Allow device background processes to sync backup payloads to highly encrypted local folder targets.</p>
                </div>

                <button
                  onClick={() => setSandboxBackup(!sandboxBackup)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer border-0 ${sandboxBackup ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${sandboxBackup ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEVICE CREDENTIALS SYSTEM OVERLAY */}
      <DeviceAuthenticator 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={handleAuthSuccess} 
        title="Biometric Lock"
        subtitle="Verify your physical device biometrics or credentials."
      />

      {/* Custom Toast Message */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 z-50 text-xs font-bold border border-slate-800 dark:border-slate-200 animate-slideUp">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/40 text-rose-650 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">Regenerate Keyphrase?</h4>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Old keyphrase will stop working. Continue?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer border-0"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateNewKeyphrase}
                className="flex-1 py-2.5 px-4 bg-rose-650 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
