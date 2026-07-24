import React from 'react';

interface BottomSheetOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface BottomSheetMenuProps {
  isOpen: boolean;
  onClose: () => void;
  options: BottomSheetOption[];
}

export const BottomSheetMenu: React.FC<BottomSheetMenuProps> = ({ isOpen, onClose, options }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl z-50 p-4 animate-slideUp">
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />
        <div className="space-y-2">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                option.onClick();
                onClose();
              }}
              className="w-full flex items-center gap-3 p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100"
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
