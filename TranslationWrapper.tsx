import React, { useState, useEffect } from 'react';
import { Loader2, Globe } from 'lucide-react';

interface TranslationWrapperProps {
  text: string;
  className?: string;
  textClassName?: string;
  isDarkTheme?: boolean;
}

const getCacheKey = (text: string) => {
  try {
    return `tr_v2_${btoa(unescape(encodeURIComponent(text.slice(0, 150))))}`;
  } catch {
    return `tr_v2_${text.slice(0, 30)}`;
  }
};

const getTranslationFromCache = (key: string): string | null => {
  try {
    return sessionStorage.getItem(`${key}_val`) || null;
  } catch {
    return null;
  }
};

const saveTranslationToCache = (key: string, translated: string) => {
  try {
    sessionStorage.setItem(`${key}_val`, translated);
  } catch {}
};

const getDetectionFromCache = (key: string): boolean | null => {
  try {
    const val = sessionStorage.getItem(`${key}_is_en`);
    return val !== null ? val === 'true' : null;
  } catch {
    return null;
  }
};

const saveDetectionToCache = (key: string, isEnglish: boolean) => {
  try {
    sessionStorage.setItem(`${key}_is_en`, isEnglish ? 'true' : 'false');
  } catch {}
};

const hasNonEnglishCharacters = (text: string): boolean => {
  const nonLatinRegex = /[^\x00-\x7F\u00C0-\u017F]/;
  return nonLatinRegex.test(text);
};

export default function TranslationWrapper({
  text,
  className = '',
  textClassName = '',
  isDarkTheme = false,
}: TranslationWrapperProps) {
  const [isEnglish, setIsEnglish] = useState<boolean>(true);
  const [showTranslated, setShowTranslated] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = getCacheKey(text);

  useEffect(() => {
    setShowTranslated(false);
    setTranslatedText(null);
    setError(null);

    if (!text || text.trim() === '') {
      setIsEnglish(true);
      return;
    }

    if (hasNonEnglishCharacters(text)) {
      setIsEnglish(false);
      saveDetectionToCache(cacheKey, false);
      return;
    }

    const cachedDetection = getDetectionFromCache(cacheKey);
    if (cachedDetection !== null) {
      setIsEnglish(cachedDetection);
      return;
    }

    const detectLanguage = async () => {
      setIsDetecting(true);
      try {
        const res = await fetch('/api/translate/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (res.ok) {
          const data = await res.json();
          setIsEnglish(data.isEnglish);
          saveDetectionToCache(cacheKey, data.isEnglish);
        } else {
          setIsEnglish(true);
        }
      } catch (e) {
        console.error('Error detecting language:', e);
        setIsEnglish(true);
      } finally {
        setIsDetecting(false);
      }
    };

    detectLanguage();
  }, [text, cacheKey]);

  const handleTranslate = async () => {
    if (showTranslated) {
      setShowTranslated(false);
      setError(null);
      return;
    }

    const cachedTranslation = getTranslationFromCache(cacheKey);
    if (cachedTranslation) {
      setTranslatedText(cachedTranslation);
      setShowTranslated(true);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const res = await fetch('/api/translate/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const data = await res.json();
        const trText = data.translatedText;
        setTranslatedText(trText);
        saveTranslationToCache(cacheKey, trText);
        setShowTranslated(true);
      } else {
        setError('Translation unavailable');
      }
    } catch (e) {
      console.error('Translation error:', e);
      setError('Translation unavailable');
    } finally {
      setIsTranslating(false);
    }
  };

  const displayText = showTranslated && translatedText ? translatedText : text;

  const linkColor = isDarkTheme 
    ? "text-emerald-400 hover:text-emerald-300 font-bold" 
    : "text-[#1877F2] hover:underline font-semibold";

  return (
    <div className={`flex flex-col ${className}`}>
      <span className={textClassName}>{displayText}</span>
      
      {!isEnglish && !isDetecting && (
        <div className="flex items-center gap-2 mt-1.5 text-[11px] select-none">
          {isTranslating ? (
            <span className="flex items-center gap-1 text-neutral-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Translating...</span>
            </span>
          ) : error ? (
            <span className="text-red-500 font-medium">{error}</span>
          ) : (
            <button
              onClick={handleTranslate}
              className={`flex items-center gap-1 ${linkColor} transition-colors duration-150 cursor-pointer pointer-events-auto`}
            >
              <Globe className="w-3 h-3" />
              <span>{showTranslated ? 'See Original' : 'See Translation'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
