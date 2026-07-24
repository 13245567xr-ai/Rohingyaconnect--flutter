import React from 'react';
import { Check } from 'lucide-react';

export function BlueVerifiedTick({ className = "w-4 h-4", onClick }: { className?: string, onClick?: () => void }) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
    if ((window as any)._navigate) {
      (window as any)._navigate('/verified-profile');
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`${className} bg-blue-500 rounded-full flex items-center justify-center p-[1px] cursor-pointer transition-transform active:scale-90`}
    >
      <Check className="w-[60%] h-[60%] text-white stroke-[3px]" />
    </div>
  );
}
