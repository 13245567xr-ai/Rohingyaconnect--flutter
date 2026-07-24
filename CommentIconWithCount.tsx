import React from 'react';

interface CommentIconWithCountProps {
  count: number;
  size?: number | string;
  className?: string;
}

export function CommentIconWithCount({ count, size = 20, className = "" }: CommentIconWithCountProps) {
  const displayCount = count > 99 ? '99+' : (count >= 0 ? count.toString() : '0');
  
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
      >
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
        <text 
          x="13" 
          y="13.8" 
          textAnchor="middle" 
          fill="currentColor" 
          stroke="none" 
          fontSize={count > 9 ? (count > 99 ? "5.5" : "6.5") : "7.5"} 
          fontWeight="900" 
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        >
          {displayCount}
        </text>
      </svg>
    </div>
  );
}

export default CommentIconWithCount;
