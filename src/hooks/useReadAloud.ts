import { useState, useEffect, useRef, useCallback } from 'react';
import {
  detectLanguage,
  getLanguageFromTag,
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
} from '../utils/languageDetector';

export interface EditorialVoice {
  voice: SpeechSynthesisVoice;
  displayName: string;
  isEditorialDefault: boolean;
  accent: string;
  langCode: string; // ISO 639-1 prefix e.g. 'en', 'es', 'fr'
  langName: string; // e.g. 'Spanish', 'French'
  flag: string;     // e.g. '🇪🇸'
  score: number;
}

export interface ReadAloudState {
  isSpeaking: boolean;
  isPaused: boolean;
  progress: number; // 0 to 100
  currentChunkIndex: number;
  totalChunks: number;
  selectedVoice: SpeechSynthesisVoice | null;
  availableVoices: EditorialVoice[];
  detectedLanguage: SupportedLanguage;
  rate: number; // 0.85 to 1.5
  pitch: number;
  activeTextId: string | null;
}

// Convert markdown text into oratorical, editorial-style spoken text
export function cleanTextForReadAloud(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // Replace code blocks with an elegant oratorical note
  text = text.replace(/```(?:[a-zA-Z0-9_-]+)?[\s\S]*?```/g, ' [Technical code specification omitted for audio narration.] ');

  // Replace math blocks
  text = text.replace(/\$\$[\s\S]*?\$\$/g, ' [Mathematical formula omitted.] ');
  text = text.replace(/\$([^\$]+)\$/g, '$1');

  // Inline code
  text = text.replace(/`([^`]+)`/g, '$1');

  // Image markdown
  text = text.replace(/!\[(.*?)\]\(.*?\)/g, '$1');

  // Link markdown: preserve text
  text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');

  // Markdown headers: prefix with slight pause
  text = text.replace(/^#{1,6}\s+(.*?)$/gm, '. $1. ');

  // Bold / Italics / Strikethrough
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/~~(.*?)~~/g, '$1');

  // Blockquotes
  text = text.replace(/^>\s+/gm, ' ');

  // Lists: convert bullet points smoothly
  text = text.replace(/^[\s]*[-*+]\s+/gm, '. ');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '. ');

  // Remove bracketed references [1], [2]
  text = text.replace(/\[\d+\]/g, '');

  // Remove URLs
  text = text.replace(/https?:\/\/[^\s]+/g, 'external reference');

  // Normalize spacing and periods
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\.{2,}/g, '.');
  text = text.trim();

  return text;
}

// Split into balanced editorial sentence chunks to bypass Chromium 15s freeze
function splitIntoEditorialChunks(text: string): string[] {
  if (!text) return [];

  // Match sentences ending in punctuation or quotes across languages (including ¿ ¡ 。！？ etc.)
  const sentenceRegex = /[^.!?。！？\n]+[.!?。！？]+["']?|[^.!?。！？\n]+$/g;
  const rawSentences = text.match(sentenceRegex) || [text];

  const chunks: string[] = [];
  let current = '';

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    // Keep chunks under ~180 chars for optimal Web Speech fluidity
    if (current && (current.length + trimmed.length > 180)) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

// Universal scoring for voices in any language to surface the highest quality voices
function scoreVoiceQuality(voice: SpeechSynthesisVoice): number {
  let score = 50;
  const name = voice.name.toLowerCase();

  // Natural / Neural / Studio / Premium qualities (available in modern browsers & OSs)
  if (name.includes('natural') || name.includes('online')) score += 40;
  if (name.includes('neural') || name.includes('premium')) score += 35;
  if (name.includes('studio')) score += 35;
  if (name.includes('enhanced')) score += 25;
  if (name.includes('google')) score += 30;
  if (name.includes('apple') || name.includes('siri')) score += 25;
  if (name.includes('microsoft')) score += 20;

  // Prestigious, acclaimed vocal actors across major languages
  const prestigiousNames = [
    // English
    'daniel', 'oliver', 'arthur', 'george', 'malcolm', 'serena', 'kate', 'samantha', 'alex', 'ava', 'allison',
    // Spanish
    'monica', 'jorge', 'paulino', 'helena', 'sabina', 'alvaro',
    // French
    'thomas', 'audrey', 'amelie', 'aurelie', 'paul',
    // German
    'marlene', 'hans', 'katja', 'stefan',
    // Italian
    'alice', 'elsa', 'cosimo', 'luca',
    // Japanese
    'kyoko', 'otoya', 'nanami', 'keita',
    // Chinese
    'xiaoxiao', 'yunxi', 'ting-ting', 'mei-jia',
    // Portuguese
    'luciana', 'joana', 'francisca',
  ];

  for (const p of prestigiousNames) {
    if (name.includes(p)) {
      score += 25;
      break;
    }
  }

  // Default browser voice bonus
  if (voice.default) score += 15;

  return score;
}

export function useReadAloud() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [rate, setRate] = useState(0.95); // Measured, dignified editorial cadence
  const [pitch, setPitch] = useState(1.0);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage>(SUPPORTED_LANGUAGES[0]);

  const [availableVoices, setAvailableVoices] = useState<EditorialVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const chunksRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isStoppingRef = useRef(false);

  const supportsSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Discover and catalog voices in ANY language supported by browser & operating system
  const populateVoices = useCallback(() => {
    if (!supportsSpeech) return;

    const rawVoices = window.speechSynthesis.getVoices();
    if (!rawVoices || rawVoices.length === 0) return;

    // Remove duplicates by name & language
    const uniqueMap = new Map<string, SpeechSynthesisVoice>();
    for (const v of rawVoices) {
      const key = `${v.name}_${v.lang}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, v);
      }
    }
    const pool = Array.from(uniqueMap.values());

    const scored = pool
      .map((voice) => {
        const langInfo = getLanguageFromTag(voice.lang);
        const score = scoreVoiceQuality(voice);

        // Derive regional dialect / accent
        const parts = voice.lang.split(/[-_]/);
        const regionCode = parts[1]?.toUpperCase() || '';
        let accent = regionCode || langInfo.name;

        if (voice.lang.toLowerCase().startsWith('en')) {
          if (regionCode === 'GB' || regionCode === 'UK') accent = 'British';
          else if (regionCode === 'US') accent = 'American';
          else if (regionCode === 'AU') accent = 'Australian';
        } else if (voice.lang.toLowerCase().startsWith('es')) {
          if (regionCode === 'ES') accent = 'Spain';
          else if (regionCode === 'MX') accent = 'Mexico';
        } else if (voice.lang.toLowerCase().startsWith('fr')) {
          if (regionCode === 'FR') accent = 'France';
          else if (regionCode === 'CA') accent = 'Canada';
        }

        return {
          voice,
          displayName: `${voice.name} (${langInfo.name})`,
          score,
          accent,
          langCode: langInfo.code,
          langName: langInfo.name,
          flag: langInfo.flag,
        };
      })
      .sort((a, b) => b.score - a.score);

    const catalog: EditorialVoice[] = scored.map((item, idx) => ({
      voice: item.voice,
      displayName: item.displayName,
      isEditorialDefault: idx === 0,
      accent: item.accent,
      langCode: item.langCode,
      langName: item.langName,
      flag: item.flag,
      score: item.score,
    }));

    setAvailableVoices(catalog);

    // Default to the highest ranked voice if not yet set
    setSelectedVoice((prev) => {
      if (prev && catalog.some((v) => v.voice.name === prev.name)) return prev;
      return catalog[0]?.voice || null;
    });
  }, [supportsSpeech]);

  useEffect(() => {
    if (!supportsSpeech) return;

    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    return () => {
      if (supportsSpeech) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supportsSpeech, populateVoices]);

  // Stop playback cleanly
  const stop = useCallback(() => {
    if (!supportsSpeech) return;
    isStoppingRef.current = true;
    window.speechSynthesis.cancel();
    activeUtteranceRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentChunkIndex(0);
    setTotalChunks(0);
    setActiveTextId(null);
    chunksRef.current = [];
    currentIndexRef.current = 0;
  }, [supportsSpeech]);

  // Speak next chunk in queue with exact linguistic configuration
  const speakChunk = useCallback(
    (index: number) => {
      if (!supportsSpeech || isStoppingRef.current) return;

      const chunks = chunksRef.current;
      if (index >= chunks.length) {
        // Completed reading all chunks
        stop();
        return;
      }

      currentIndexRef.current = index;
      setCurrentChunkIndex(index);
      setProgress(Math.round(((index + 1) / chunks.length) * 100));

      const chunkText = chunks[index];
      const utterance = new SpeechSynthesisUtterance(chunkText);
      activeUtteranceRef.current = utterance;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else if (detectedLanguage) {
        utterance.lang = detectedLanguage.code;
      }

      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onend = () => {
        if (!isStoppingRef.current && isSpeaking) {
          speakChunk(index + 1);
        }
      };

      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        console.warn('SpeechSynthesis chunk error:', e);
        if (index + 1 < chunks.length && !isStoppingRef.current) {
          speakChunk(index + 1);
        } else {
          stop();
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [supportsSpeech, selectedVoice, detectedLanguage, rate, pitch, isSpeaking, stop]
  );

  // Start or toggle reading with automatic language detection and voice matching
  const startReadAloud = useCallback(
    (textId: string, rawText: string) => {
      if (!supportsSpeech) return;

      // If already active on this text
      if (activeTextId === textId && isSpeaking) {
        if (isPaused) {
          window.speechSynthesis.resume();
          setIsPaused(false);
        } else {
          window.speechSynthesis.pause();
          setIsPaused(true);
        }
        return;
      }

      // New reading session
      stop();
      isStoppingRef.current = false;

      // 1. Detect language of the target message
      const lang = detectLanguage(rawText);
      setDetectedLanguage(lang);

      // 2. Automatically select native voice for detected language if current voice is mismatched
      if (availableVoices.length > 0) {
        const currentVoiceLang = selectedVoice?.lang?.split(/[-_]/)[0]?.toLowerCase();
        if (!currentVoiceLang || currentVoiceLang !== lang.code) {
          // Find matching native voice in catalog
          const matchingVoice = availableVoices.find((v) => v.langCode === lang.code);
          if (matchingVoice) {
            setSelectedVoice(matchingVoice.voice);
          }
        }
      }

      const clean = cleanTextForReadAloud(rawText);
      if (!clean) return;

      const chunks = splitIntoEditorialChunks(clean);
      chunksRef.current = chunks;
      setTotalChunks(chunks.length);
      setActiveTextId(textId);
      setIsSpeaking(true);
      setIsPaused(false);

      // Small delay to allow cancel() to resolve cleanly
      setTimeout(() => {
        if (!isStoppingRef.current) {
          speakChunk(0);
        }
      }, 50);
    },
    [supportsSpeech, activeTextId, isSpeaking, isPaused, availableVoices, selectedVoice, stop, speakChunk]
  );

  // Pause
  const pause = useCallback(() => {
    if (!supportsSpeech || !isSpeaking) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [supportsSpeech, isSpeaking]);

  // Resume
  const resume = useCallback(() => {
    if (!supportsSpeech || !isSpeaking) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [supportsSpeech, isSpeaking]);

  // Skip to next chunk
  const skipForward = useCallback(() => {
    if (!supportsSpeech || !isSpeaking) return;
    const next = currentIndexRef.current + 1;
    if (next < chunksRef.current.length) {
      window.speechSynthesis.cancel();
      speakChunk(next);
    } else {
      stop();
    }
  }, [supportsSpeech, isSpeaking, speakChunk, stop]);

  // Skip back a chunk
  const skipBackward = useCallback(() => {
    if (!supportsSpeech || !isSpeaking) return;
    const prev = Math.max(0, currentIndexRef.current - 1);
    window.speechSynthesis.cancel();
    speakChunk(prev);
  }, [supportsSpeech, isSpeaking, speakChunk]);

  // Set speed
  const changeRate = useCallback(
    (newRate: number) => {
      setRate(newRate);
      if (isSpeaking && !isPaused && activeUtteranceRef.current) {
        const currentIdx = currentIndexRef.current;
        window.speechSynthesis.cancel();
        setTimeout(() => {
          speakChunk(currentIdx);
        }, 50);
      }
    },
    [isSpeaking, isPaused, speakChunk]
  );

  // Set voice
  const changeVoice = useCallback(
    (voice: SpeechSynthesisVoice) => {
      setSelectedVoice(voice);
      const voiceLang = getLanguageFromTag(voice.lang);
      setDetectedLanguage(voiceLang);

      if (isSpeaking && !isPaused) {
        const currentIdx = currentIndexRef.current;
        window.speechSynthesis.cancel();
        setTimeout(() => {
          speakChunk(currentIdx);
        }, 50);
      }
    },
    [isSpeaking, isPaused, speakChunk]
  );

  return {
    supportsSpeech,
    isSpeaking,
    isPaused,
    progress,
    currentChunkIndex,
    totalChunks,
    rate,
    pitch,
    activeTextId,
    selectedVoice,
    availableVoices,
    detectedLanguage,
    startReadAloud,
    pause,
    resume,
    stop,
    skipForward,
    skipBackward,
    changeRate,
    changeVoice,
    setPitch,
  };
}
