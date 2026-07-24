import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, CheckCircle } from 'lucide-react';

interface SecurityCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  securityCode: string;
  qrData: string;
  onVerify: () => void;
  isVerified: boolean;
}

export const SecurityCodeModal: React.FC<SecurityCodeModalProps> = ({ 
  isOpen, onClose, securityCode, qrData, onVerify, isVerified 
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-11/12 max-w-sm animate-zoomIn" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Verify Security</h3>
            <button onClick={onClose}><X className="w-5 h-5" /></button>
          </div>
          
          <div className="flex justify-center mb-4">
            <QRCodeSVG value={qrData} size={200} />
          </div>
          
          <div className="text-center mb-6">
            <p className="font-mono text-xl tracking-widest bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
              {securityCode}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Scan this QR with the other person to verify. If codes match, your messages are encrypted.
            </p>
          </div>

          <button 
            onClick={onVerify}
            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold ${isVerified ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            {isVerified ? <CheckCircle className="w-5 h-5" /> : null}
            {isVerified ? 'Verified' : 'Compare with other person'}
          </button>
        </div>
      </div>
    </>
  );
};
