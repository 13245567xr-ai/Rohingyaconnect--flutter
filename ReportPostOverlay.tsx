import React, { useState } from 'react';
import { X, Flag, AlertTriangle, ChevronRight, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ReportPostOverlayProps {
  isOpen: boolean;
  postId: string | null;
  onClose: () => void;
  onSubmitReport: (postId: string, reason: string) => void;
}

interface ReportCategory {
  id: string;
  label: string;
  desc: string;
}

export default function ReportPostOverlay({
  isOpen,
  postId,
  onClose,
  onSubmitReport
}: ReportPostOverlayProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [evidence, setEvidence] = useState('');
  const [error, setError] = useState('');

  const categories: ReportCategory[] = [
    { id: 'hate_speech', label: 'Hate Speech & Racism', desc: 'Slanderous content attacking national, ethnic or religious status.' },
    { id: 'harassment', label: 'Harassment or Personal Abuse', desc: 'Direct threats, intimidation, or cyber-harassment against a community member.' },
    { id: 'fake_news', label: 'Disinformation & Fake News', desc: 'False reporting, scam aid requests, or fabricated crisis details.' },
    { id: 'compromised', label: 'Impersonation or Compromised Profile', desc: 'Fake profiles or hacked sessions spreading misleading instructions.' },
    { id: 'illegal', label: 'Dangerous or Illegal Activities', desc: 'Sourcing illegal border crossing routes, weapon trading, or violence.' }
  ];

  if (!isOpen || !postId) return null;

  const handleSelectCategory = (cat: ReportCategory) => {
    setSelectedCategory(cat);
    setStep(2);
  };

  const handleNextStep = () => {
    if (!evidence.trim() || evidence.trim().length < 10) {
      setError('Please provide at least 10 characters of supporting explanation or evidence.');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleSubmit = () => {
    if (!selectedCategory) return;
    const compiledReason = `[Category: ${selectedCategory.label}] Details: ${evidence}`;
    onSubmitReport(postId, compiledReason);
    setStep(4);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
      {/* Click outside to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-300 z-10 flex flex-col p-5 space-y-4 text-slate-100"
        id="report-post-overlay-container"
      >
        {/* Top warning accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-600" />

        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            <div>
              <span className="text-[8px] font-black uppercase tracking-wider text-rose-500 block">Step {step} of 3 • Safety Review</span>
              <h4 className="text-xs font-black uppercase text-slate-100">Community Protection</h4>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <h5 className="text-[11px] font-bold text-slate-300">Select Violation Category</h5>
              <p className="text-[9px] text-slate-500 mt-0.5">Which community guideline does this post violate?</p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  className="w-full text-left p-3 rounded-xl bg-slate-950/30 hover:bg-slate-850/80 border border-slate-850/80 hover:border-slate-800 transition flex justify-between items-center group cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[11px] font-extrabold block text-slate-200 group-hover:text-rose-400 transition">
                      {cat.label}
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5 leading-relaxed">
                      {cat.desc}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-650 group-hover:text-slate-350 transition flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Contextual details / evidence input */}
        {step === 2 && selectedCategory && (
          <div className="space-y-3 animate-slideLeft">
            <div className="flex gap-2 p-2.5 bg-rose-950/20 rounded-xl border border-rose-950/30">
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-rose-400 block">Selected: {selectedCategory.label}</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">{selectedCategory.desc}</span>
              </div>
            </div>

            <div>
              <h5 className="text-[11px] font-bold text-slate-300">Provide Additional Context</h5>
              <p className="text-[9px] text-slate-500 mt-0.5">Explain why this post is inappropriate or dangerous to our network.</p>
            </div>

            {error && (
              <span className="text-[9px] font-bold text-rose-400 block bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                {error}
              </span>
            )}

            <textarea
              required
              rows={4}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Provide context (at least 10 characters)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-rose-600 placeholder-slate-700 leading-relaxed"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold py-3 rounded-xl transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="w-2/3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs py-3 rounded-xl transition"
              >
                Continue to Final Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Final Review */}
        {step === 3 && selectedCategory && (
          <div className="space-y-4 animate-slideLeft">
            <div className="space-y-3">
              <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Final Report Review</h5>
              <p className="text-[9px] text-slate-500">Please review the details of your report before submitting. Reports are audited by community administrators within 15 minutes.</p>
            </div>

            <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-850">
              <div className="flex gap-2">
                <Flag className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider block">Violation Category</span>
                  <span className="text-xs font-bold text-slate-100">{selectedCategory.label}</span>
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-850 pt-3">
                <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider block">Evidence Commentary</span>
                  <span className="text-xs text-slate-300 block mt-1 leading-relaxed whitespace-pre-line italic">
                    "{evidence}"
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold py-3 rounded-xl transition"
              >
                Back
              </button>
              
              {/* High visibility primary action colored button */}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-2/3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs py-3.5 rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Flag className="w-4 h-4 fill-white" /> Submit Report
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success Message */}
        {step === 4 && (
          <div className="py-8 text-center space-y-3 animate-slideUp">
            <div className="mx-auto w-12 h-12 bg-emerald-950/40 text-emerald-400 flex items-center justify-center rounded-full border border-emerald-500/30 animate-pulse">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h5 className="text-sm font-black text-slate-100">Report Successfully Filed</h5>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed px-4">Thank you. This item has been flagged and submitted to community administrators for rapid investigation.</p>
            </div>
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-extrabold py-2 px-6 rounded-xl transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
