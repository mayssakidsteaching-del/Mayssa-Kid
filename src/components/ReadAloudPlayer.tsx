import { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Gauge,
  UserCheck,
  ChevronDown,
  Globe,
  Search,
} from 'lucide-react';
import { EditorialVoice } from '../hooks/useReadAloud';
import { SupportedLanguage } from '../utils/languageDetector';

interface ReadAloudPlayerProps {
  isSpeaking: boolean;
  isPaused: boolean;
  progress: number;
  currentChunkIndex: number;
  totalChunks: number;
  rate: number;
  selectedVoice: SpeechSynthesisVoice | null;
  availableVoices: EditorialVoice[];
  detectedLanguage?: SupportedLanguage;
  onTogglePlay: () => void;
  onStop: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onChangeRate: (rate: number) => void;
  onChangeVoice: (voice: SpeechSynthesisVoice) => void;
}

export function ReadAloudPlayer({
  isSpeaking,
  isPaused,
  progress,
  currentChunkIndex,
  totalChunks,
  rate,
  selectedVoice,
  availableVoices,
  detectedLanguage,
  onTogglePlay,
  onStop,
  onSkipForward,
  onSkipBackward,
  onChangeRate,
  onChangeVoice,
}: ReadAloudPlayerProps) {
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>('all');

  const speedOptions = [
    { label: '0.85x', value: 0.85, title: 'Deliberate & Scholarly' },
    { label: '0.95x', value: 0.95, title: 'Editorial Cadence' },
    { label: '1.1x', value: 1.1, title: 'Brisk Analysis' },
    { label: '1.25x', value: 1.25, title: 'Expedited' },
  ];

  // Group languages present in user's available browser voices
  const languageOptions = useMemo(() => {
    const langMap = new Map<string, { code: string; name: string; flag: string; count: number }>();
    for (const v of availableVoices) {
      if (!langMap.has(v.langCode)) {
        langMap.set(v.langCode, {
          code: v.langCode,
          name: v.langName,
          flag: v.flag,
          count: 0,
        });
      }
      langMap.get(v.langCode)!.count += 1;
    }
    return Array.from(langMap.values()).sort((a, b) => {
      // Keep English and detected language near top
      if (detectedLanguage && a.code === detectedLanguage.code) return -1;
      if (detectedLanguage && b.code === detectedLanguage.code) return 1;
      if (a.code === 'en') return -1;
      if (b.code === 'en') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [availableVoices, detectedLanguage]);

  // Filter voices according to active search query and language filter
  const filteredVoices = useMemo(() => {
    return availableVoices.filter((v) => {
      if (selectedLanguageFilter !== 'all' && v.langCode !== selectedLanguageFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = v.voice.name.toLowerCase().includes(q);
        const matchesLang = v.langName.toLowerCase().includes(q) || v.accent.toLowerCase().includes(q);
        return matchesName || matchesLang;
      }
      return true;
    });
  }, [availableVoices, selectedLanguageFilter, searchQuery]);

  return (
    <div className="mt-4 rounded-xl border border-[#d4af37]/30 bg-[#0d1017] p-3.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Top player header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2.5">
          {/* Animated sound equalizer */}
          <div className="flex items-end gap-0.5 h-4 w-5 px-0.5">
            <span
              className={`w-1 rounded-full bg-[#d4af37] transition-all duration-150 ${
                isSpeaking && !isPaused ? 'h-4 animate-pulse' : 'h-1.5 opacity-40'
              }`}
            />
            <span
              className={`w-1 rounded-full bg-[#e5b974] transition-all duration-200 ${
                isSpeaking && !isPaused ? 'h-3 animate-pulse delay-75' : 'h-2 opacity-40'
              }`}
            />
            <span
              className={`w-1 rounded-full bg-[#f3e7cb] transition-all duration-150 ${
                isSpeaking && !isPaused ? 'h-3.5 animate-pulse delay-150' : 'h-1.5 opacity-40'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-xs font-semibold text-[#f3e7cb]">
                Editorial Narration
              </span>
              {detectedLanguage && (
                <span className="inline-flex items-center gap-1 rounded bg-[#d4af37]/15 border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[10px] font-medium text-[#e5b974]">
                  <span>{detectedLanguage.flag}</span>
                  <span>{detectedLanguage.nativeName}</span>
                </span>
              )}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              {isPaused
                ? 'Narration Paused'
                : isSpeaking
                ? `Reading segment ${currentChunkIndex + 1} of ${totalChunks || 1}`
                : 'Universal Speech Synthesizer Ready'}
            </div>
          </div>
        </div>

        {/* Universal Voice & Language Picker */}
        <div className="relative">
          <button
            onClick={() => setShowVoicePicker(!showVoicePicker)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono text-neutral-300 hover:border-[#d4af37]/40 hover:text-white transition-colors"
            title="Select Voice & Language for Audio Narration"
          >
            <UserCheck className="h-3 w-3 text-[#d4af37]" />
            <span className="max-w-[130px] truncate">
              {selectedVoice?.name
                ? selectedVoice.name.replace(/(Google|Microsoft|Apple)\s*/i, '')
                : 'Universal Voice'}
            </span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {/* Voice Dropdown with Multilingual Filtering */}
          {showVoicePicker && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-80 rounded-xl border border-white/15 bg-[#12151e] p-3 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#e5b974] font-medium">
                  <Globe className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>Multilingual Speech Voices</span>
                </div>
                <span className="font-mono text-[10px] text-neutral-500">
                  {availableVoices.length} voices
                </span>
              </div>

              {/* Search & Filter */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2 h-3 w-3 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search voice or accent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 py-1.5 pl-7 pr-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:border-[#d4af37]/50 focus:outline-none"
                />
              </div>

              {/* Language Chips */}
              {languageOptions.length > 1 && (
                <div className="flex gap-1 overflow-x-auto pb-1.5 mb-2 no-scrollbar border-b border-white/5">
                  <button
                    onClick={() => setSelectedLanguageFilter('all')}
                    className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] transition-colors ${
                      selectedLanguageFilter === 'all'
                        ? 'bg-[#d4af37]/20 text-[#f3e7cb] font-semibold border border-[#d4af37]/30'
                        : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    All ({availableVoices.length})
                  </button>
                  {languageOptions.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLanguageFilter(lang.code)}
                      className={`shrink-0 flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] transition-colors ${
                        selectedLanguageFilter === lang.code
                          ? 'bg-[#d4af37]/20 text-[#f3e7cb] font-semibold border border-[#d4af37]/30'
                          : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      <span className="text-[9px] opacity-60">({lang.count})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Voice List */}
              <div className="max-h-52 overflow-y-auto space-y-1">
                {filteredVoices.length === 0 ? (
                  <div className="py-4 text-center text-xs text-neutral-400">
                    No voices matched the selected filter.
                  </div>
                ) : (
                  filteredVoices.map((ev, idx) => {
                    const isSelected = selectedVoice?.name === ev.voice.name;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          onChangeVoice(ev.voice);
                          setShowVoicePicker(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-[#d4af37]/20 text-[#e5b974] font-medium border border-[#d4af37]/30'
                            : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="text-sm shrink-0">{ev.flag}</span>
                          <div className="truncate">
                            <div className="truncate text-xs font-medium text-neutral-200">
                              {ev.voice.name.replace(/(Google|Microsoft|Apple)\s*/i, '')}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono">
                              {ev.langName} • {ev.accent}
                            </div>
                          </div>
                        </div>
                        {ev.voice.default && (
                          <span className="shrink-0 rounded bg-white/10 px-1 py-0.5 font-mono text-[8px] text-neutral-400">
                            OS Default
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress timeline scrubber bar */}
      <div className="my-2.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full bg-gradient-to-r from-[#b38f2a] to-[#e5b974] transition-all duration-300 rounded-full"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </div>
      </div>

      {/* Controls & Speed Selector Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Playback action controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSkipBackward}
            disabled={!isSpeaking || currentChunkIndex === 0}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-30"
            title="Previous segment"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/20 px-3 py-1.5 text-xs font-semibold text-[#f3e7cb] hover:bg-[#d4af37]/30 transition-all shadow-sm"
            title={isPaused ? 'Resume narration' : 'Pause narration'}
          >
            {isPaused ? (
              <>
                <Play className="h-3.5 w-3.5 fill-current text-[#e5b974]" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 fill-current text-[#e5b974]" />
                <span>Pause</span>
              </>
            )}
          </button>

          <button
            onClick={onSkipForward}
            disabled={!isSpeaking || currentChunkIndex >= totalChunks - 1}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-30"
            title="Next segment"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onStop}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-500/15 hover:text-red-300 transition-colors"
            title="Stop narration"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Speed presets */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span className="text-neutral-500 mr-1 flex items-center gap-1">
            <Gauge className="h-3 w-3" />
            Cadence:
          </span>
          {speedOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChangeRate(opt.value)}
              className={`rounded-md px-1.5 py-0.5 transition-colors ${
                Math.abs(rate - opt.value) < 0.04
                  ? 'bg-[#d4af37]/25 text-[#e5b974] font-semibold border border-[#d4af37]/40'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200 border border-transparent'
              }`}
              title={opt.title}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
