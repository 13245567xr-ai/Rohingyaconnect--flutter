import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface DisappearingMessagesScreenProps {
  chatId: string;
  onClose: () => void;
}

export default function DisappearingMessagesScreen({ chatId, onClose }: DisappearingMessagesScreenProps) {
  const [timer, setTimer] = useState<number>(0);
  
  // load from firestore chats/{chatId}.disappearingTimer
  useEffect(() => {
    const loadTimer = async () => {
      try {
        const d = await getDoc(doc(db, 'chats', chatId));
        if (d.exists()) {
          setTimer(d.data().disappearingTimer || 0);
        }
      } catch (e) {
        console.error("Error loading disappearing timer", e);
      }
    };
    loadTimer();
  }, [chatId]);

  const handleSelect = async (val: number) => {
    setTimer(val);
    try {
      const chatRef = doc(db, 'chats', chatId);
      const d = await getDoc(chatRef);
      if (d.exists()) {
        await updateDoc(chatRef, { disappearingTimer: val });
      } else {
        await setDoc(chatRef, { disappearingTimer: val });
      }
    } catch (e) {
      console.error("Error updating disappearing timer", e);
    }
  };

  const OPTIONS = [
    { label: '24 hours', value: 86400 },
    { label: '7 days', value: 604800 },
    { label: '90 days', value: 7776000 },
    { label: 'Off', value: 0 },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-[#0B141A] text-[#E9EDEF] flex flex-col font-sans">
      <div className="flex items-center gap-4 p-4 bg-[#202C33] shadow-md border-b border-transparent">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition">
          <ArrowLeft className="w-6 h-6 text-[#E9EDEF]" />
        </button>
        <h1 className="text-lg font-medium">Disappearing messages</h1>
      </div>
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="p-6 flex flex-col items-center text-center max-w-sm mx-auto">
          <Clock className="w-24 h-24 text-[#00A884] mb-6" strokeWidth={1.5} />
          <p className="text-[#8696A0] text-[15px] leading-relaxed">
            Make messages in this chat disappear. For more privacy and storage, new messages will disappear from this chat for everyone after the selected duration except when kept. Anyone in the chat can change this setting.
          </p>
        </div>
        <div className="bg-[#111B21] py-2 mt-4">
          <h2 className="px-6 py-2 text-[#8696A0] text-sm font-medium mb-1">Message timer</h2>
          {OPTIONS.map(opt => (
            <button 
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#202C33] transition cursor-pointer"
            >
              <span className="text-base text-[#E9EDEF]">{opt.label}</span>
              <div className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center ${timer === opt.value ? 'border-[#00A884]' : 'border-[#8696A0]'}`}>
                {timer === opt.value && <div className="w-2.5 h-2.5 bg-[#00A884] rounded-full" />}
              </div>
            </button>
          ))}
        </div>
        
        <div className="bg-[#111B21] mt-4">
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#202C33] transition cursor-pointer">
             <span className="text-base text-[#E9EDEF]">Try a default message timer</span>
             <span className="text-[#8696A0]">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
