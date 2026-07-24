import React from 'react';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import { X } from 'lucide-react';


interface FullScreenImageViewerProps {
  children: React.ReactElement;
  imageUrl: string;
  userAvatar?: string;
  userFullName?: string;
  timestamp?: string | number; // ISO string or timestamp
}

export default function FullScreenImageViewer({
  children,
  imageUrl,
  userAvatar,
  userFullName,
  timestamp
}: FullScreenImageViewerProps) {
  return (
    <PhotoProvider
      maskOpacity={0.95}
      overlayRender={({ onClose }) => (
        <div className="absolute top-0 left-0 right-0 z-[9999] p-4 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-3">
            {userAvatar && (
              <img 
                src={userAvatar} 
                alt={userFullName} 
                className="w-10 h-10 rounded-full object-cover border border-white/20" 
              />
            )}
            <div className="text-white drop-shadow-md">
              {userFullName && <p className="font-bold text-sm">{userFullName}</p>}
              {timestamp && (
                <p className="text-xs text-white/80">
                  {new Date(typeof timestamp === 'string' ? timestamp : Number(timestamp)).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="pointer-events-auto p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    >
      <PhotoView src={imageUrl}>
        {children}
      </PhotoView>
    </PhotoProvider>
  );
}
