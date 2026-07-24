import React, { useState, useEffect } from 'react';
import { User } from '../types';
import CallScreen from './CallScreen';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface CallOverlayProps {
  callType: 'audio' | 'video';
  targetUser: User;
  onEndCall: () => void;
  users?: User[];
  callId?: string;
  isIncoming?: boolean;
}

export default function CallOverlay({ 
  callType, 
  targetUser, 
  onEndCall, 
  users: propUsers,
  callId,
  isIncoming
}: CallOverlayProps) {
  const [users, setUsers] = useState<User[]>(propUsers || []);

  useEffect(() => {
    if (!propUsers || propUsers.length === 0) {
      getDocs(collection(db, 'rc_users'))
        .then((snapshot) => {
          const list: User[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as User);
          });
          setUsers(list);
        })
        .catch((err) => {
          console.error("Error loading users in CallOverlay:", err);
        });
    }
  }, [propUsers]);

  return (
    <CallScreen 
      callType={callType}
      targetUser={targetUser}
      users={users}
      callId={callId}
      isIncoming={isIncoming}
      onEndCall={onEndCall}
    />
  );
}
