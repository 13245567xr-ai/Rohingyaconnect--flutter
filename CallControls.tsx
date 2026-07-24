import React, { useState } from "react";
import { Camera, Sparkles } from "lucide-react";

const FILTERS = [
  "none", "grayscale(100%)", "sepia(100%)", "contrast(150%)", 
  "brightness(130%)", "saturate(200%)", "invert(100%)", 
  "blur(2px)", "hue-rotate(90deg)", "drop-shadow(0 0 10px #00ff88)"
];

export default function CallControls({ 
  onSwitchCamera, 
  localVideoRef 
}: { 
  onSwitchCamera: () => void, 
  localVideoRef: React.RefObject<HTMLVideoElement> 
}) {
  const [filterIndex, setFilterIndex] = useState(0);

  const applyFilter = () => {
    const next = (filterIndex + 1) % FILTERS.length;
    setFilterIndex(next);
    if(localVideoRef.current) {
      localVideoRef.current.style.filter = FILTERS[next];
    }
  };

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-3 z-10">
      <button onClick={onSwitchCamera} className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors" id="btn-switch-camera">
        <Camera className="w-6 h-6 text-white" />
      </button>
      <button onClick={applyFilter} className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors" id="btn-apply-filter">
        <Sparkles className="w-6 h-6 text-white" />
      </button>
      <div className="text-white bg-black/40 px-2 py-0.5 rounded-full text-xs text-center">{filterIndex+1}/10</div>
    </div>
  );
}
