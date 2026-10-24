import React, { useState } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Award,
  Target,
  Type,
  FileDown,
  Keyboard,
  X,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Clock,
  Flame,
} from 'lucide-react';

interface ReaderDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  focusActiveSeconds: number;
  isFocusActive: boolean;
  isFocusPaused: boolean;
  isIdlePaused?: boolean;
  onToggleFocusTimer: () => void;
  onResetFocusTimer: () => void;
  dailyReadingMinutes: number;
  dailyArticlesFinished: number;
  dailyWordsRead: number;
  dailyGoalMinutes: number;
  onChangeDailyGoal: (minutes: number) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  fontWeight?: 'light' | 'normal' | 'bold';
  onChangeFontWeight?: (weight: 'light' | 'normal' | 'bold') => void;
  onToggleSoftKeyboard: () => void;
  isSoftKeyboardOpen: boolean;
  onExportStatsPdf: () => void;
  isExportingPdf?: boolean;
}

export function ReaderDashboardModal({
  isOpen,
  onClose,
  focusActiveSeconds,
  isFocusActive,
  isFocusPaused,
  isIdlePaused = false,
  onToggleFocusTimer,
  onResetFocusTimer,
  dailyReadingMinutes,
  dailyArticlesFinished,
  dailyWordsRead,
  dailyGoalMinutes,
  onChangeDailyGoal,
  fontSize,
  onChangeFontSize,
  fontWeight = 'normal',
  onChangeFontWeight,
  onToggleSoftKeyboard,
  isSoftKeyboardOpen,
  onExportStatsPdf,
  isExportingPdf = false,
}: ReaderDashboardModalProps) {
  if (!isOpen) return null;

  // Format focus timer seconds into HH:MM:SS
  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  // Goal calculation
  const totalMinutesIncludingSession =
    dailyReadingMinutes + Math.floor(focusActiveSeconds / 60);
  const goalPercentage = Math.min(
    100,
    Math.round((totalMinutesIncludingSession / Math.max(1, dailyGoalMinutes)) * 100)
  );

  // SVG progress ring math (r=42, circumference ~263.89)
  const ringCircumference = 2 * Math.PI * 42;
  const strokeOffset = ringCircumference * (1 - goalPercentage / 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-[#d4af37]/35 bg-[#0c0e14] shadow-2xl overflow-hidden text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-gradient-to-r from-[#141724] via-[#0c0e14] to-[#141724]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30">
              <BookOpen className="h-5 w-5 text-[#d4af37]" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-white tracking-wide">
                Reader Dashboard
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Long-form reading telemetry, focus tracking & goal progress
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Close Dashboard (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Top Row: Focus Session Timer & Daily Goal Ring */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Focus Session Timer Card */}
            <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#12151f] p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-[#d4af37]" />
                  <span className="font-serif text-sm font-semibold text-white">
                    Focus Session Timer
                  </span>
                </div>

                {/* Live Auto-Pause / Active Status Badge */}
                <div className="flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded-full border border-white/10">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isFocusActive && !isFocusPaused && !isIdlePaused
                        ? 'bg-emerald-400 animate-pulse'
                        : isIdlePaused
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-neutral-500'
                    }`}
                  />
                  <span
                    className={
                      isFocusActive && !isFocusPaused && !isIdlePaused
                        ? 'text-emerald-400'
                        : isIdlePaused
                        ? 'text-amber-300'
                        : 'text-neutral-400'
                    }
                  >
                    {isFocusActive && !isFocusPaused && !isIdlePaused
                      ? 'Active Reading'
                      : isIdlePaused
                      ? 'Auto-Paused (Idle)'
                      : isFocusPaused
                      ? 'Paused'
                      : 'Standby'}
                  </span>
                </div>
              </div>

              {/* Timer Display */}
              <div className="my-3 text-center">
                <div className="font-mono text-4xl font-bold tracking-tight text-[#f5ebd7]">
                  {formatTimer(focusActiveSeconds)}
                </div>
                <p className="mt-1 text-[11px] text-neutral-400 font-mono">
                  {isIdlePaused
                    ? 'Timer paused because you scrolled away or paused interaction'
                    : 'Automatically pauses when idle and resumes on page scroll'}
                </p>
              </div>

              {/* Timer Action Buttons */}
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={onToggleFocusTimer}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 font-mono text-xs font-semibold transition-all ${
                    isFocusActive && !isFocusPaused
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-[#d4af37] text-neutral-950 shadow-md hover:bg-[#e2bd4e]'
                  }`}
                >
                  {isFocusActive && !isFocusPaused ? (
                    <>
                      <Pause className="h-3.5 w-3.5 fill-current" />
                      <span>Pause Session</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{focusActiveSeconds > 0 ? 'Resume' : 'Start Focus'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onResetFocusTimer}
                  disabled={focusActiveSeconds === 0}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-mono text-xs text-neutral-400 border border-white/10 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Reset Timer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Daily Goal & Progress Ring Card */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#12151f] p-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#d4af37]" />
                  <span className="font-serif text-sm font-semibold text-white">
                    Daily Reading Target
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-bold text-white">
                      {totalMinutesIncludingSession}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">
                      / {dailyGoalMinutes} min goal
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-400">
                    {goalPercentage >= 100
                      ? 'Daily target attained! Superb intellectual momentum.'
                      : `${Math.max(0, dailyGoalMinutes - totalMinutesIncludingSession)} min remaining today`}
                  </p>
                </div>

                {/* Target Selector */}
                <div className="pt-2 flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-[10px] text-neutral-500">Goal:</span>
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => onChangeDailyGoal(mins)}
                      className={`rounded px-2 py-0.5 text-[11px] transition-all ${
                        dailyGoalMinutes === mins
                          ? 'bg-[#d4af37]/25 text-[#f3cf65] border border-[#d4af37]/45 font-semibold'
                          : 'bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Ring Visual */}
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="stroke-white/10 fill-none"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="fill-none transition-[stroke-dashoffset] duration-500 ease-out"
                    stroke="#d4af37"
                    strokeWidth="8"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-base font-bold text-white">
                    {goalPercentage}%
                  </span>
                  <span className="font-serif text-[9px] uppercase tracking-wider text-[#d4af37]">
                    Goal
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cumulative Reading Session Metrics (3 Stat Pills) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-[#12151f] p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[#d4af37] mb-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-serif text-xs font-semibold">Total Minutes</span>
              </div>
              <div className="font-mono text-xl font-bold text-white">
                {totalMinutesIncludingSession}m
              </div>
              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Read Today</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#12151f] p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[#d4af37] mb-1">
                <Award className="h-3.5 w-3.5" />
                <span className="font-serif text-xs font-semibold">Articles Finished</span>
              </div>
              <div className="font-mono text-xl font-bold text-white">
                {dailyArticlesFinished}
              </div>
              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">100% Completed</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#12151f] p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[#d4af37] mb-1">
                <Flame className="h-3.5 w-3.5" />
                <span className="font-serif text-xs font-semibold">Words Explored</span>
              </div>
              <div className="font-mono text-xl font-bold text-white">
                {dailyWordsRead.toLocaleString()}
              </div>
              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Editorial Words</p>
            </div>
          </div>

          {/* Reading Experience Controls: Font Size Slider & Soft Keyboard */}
          <div className="rounded-xl border border-white/10 bg-[#12151f] p-4 space-y-4">
            <h3 className="font-serif text-sm font-semibold text-white flex items-center gap-2">
              <Type className="h-4 w-4 text-[#d4af37]" />
              <span>Readability Typography & Tools</span>
            </h3>

            {/* Font Size Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-mono">Prose Font Size</span>
                <span className="font-mono font-bold text-[#e5b974]">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-500 font-serif">A</span>
                <input
                  type="range"
                  min="15"
                  max="26"
                  step="1"
                  value={fontSize}
                  onChange={(e) => onChangeFontSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
                />
                <span className="text-lg text-neutral-300 font-serif">A</span>
              </div>
            </div>

            {/* Serif Font Weight Toggle: Thin, Regular, Bold */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-mono">Serif Typeface Weight</span>
                <span className="font-mono font-bold text-[#e5b974] capitalize">
                  {fontWeight === 'light' ? 'Thin (300)' : fontWeight === 'bold' ? 'Bold (700)' : 'Regular (400)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'light', label: 'Thin', weightClass: 'font-light', desc: 'Editorial 300' },
                  { id: 'normal', label: 'Regular', weightClass: 'font-normal', desc: 'Book 400' },
                  { id: 'bold', label: 'Bold', weightClass: 'font-bold', desc: 'Heavy 700' },
                ].map((variant) => {
                  const isSelected = fontWeight === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => onChangeFontWeight?.(variant.id as 'light' | 'normal' | 'bold')}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#f3cf65] shadow-sm'
                          : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className={`font-serif text-sm tracking-wide ${variant.weightClass}`}>
                        {variant.label}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        {variant.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions: Soft Keyboard & PDF Export */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
              {/* Soft Keyboard Toggle */}
              <button
                onClick={onToggleSoftKeyboard}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-mono transition-all ${
                  isSoftKeyboardOpen
                    ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#f3cf65]'
                    : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Keyboard className="h-4 w-4 text-[#d4af37]" />
                <span>{isSoftKeyboardOpen ? 'Hide Soft Keyboard' : 'Launch Soft Keyboard for Notes'}</span>
              </button>

              {/* Export to PDF */}
              <button
                onClick={onExportStatsPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-2 rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/10 px-3.5 py-2 text-xs font-mono text-[#f3e7cb] hover:bg-[#d4af37]/20 transition-all shadow-sm disabled:opacity-40"
              >
                <FileDown className="h-4 w-4 text-[#d4af37]" />
                <span>{isExportingPdf ? 'Exporting PDF...' : 'Export Reading Report to PDF'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-white/5 px-6 py-3 bg-[#0a0c12] flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <span>Focus data is preserved in private client session storage</span>
          <span>Berno Editorial Reader Engine</span>
        </div>
      </div>
    </div>
  );
}
