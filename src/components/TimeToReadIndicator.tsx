import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Message } from '../types';
import { calculateConversationStats } from '../utils/readingTime';
import { Clock, Check, BookOpen, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface TimeToReadIndicatorProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  messages: Message[];
  isStreaming?: boolean;
  readabilityMode?: boolean;
  isAboveSendButton?: boolean;
}

export function TimeToReadIndicator({
  scrollContainerRef,
  messages,
  isStreaming = false,
  readabilityMode = false,
  isAboveSendButton = false,
}: TimeToReadIndicatorProps) {
  const [readingProgress, setReadingProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [completedCardsCount, setCompletedCardsCount] = useState(0);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);

  // Compute aggregated word count and baseline reading times (250 WPM)
  const stats = useMemo(() => {
    return calculateConversationStats(messages, 250);
  }, [messages]);

  // Circumference of the r=17 circle (2 * PI * 17)
  const circumference = 106.814;

  const calculateReadProgress = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || stats.totalSeconds <= 0) {
      setReadingProgress(0);
      setRemainingSeconds(stats.totalSeconds);
      setCompletedCardsCount(0);
      setIsScrollable(false);
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const maxScroll = scrollHeight - clientHeight;
    const scrollable = maxScroll > 24;
    setIsScrollable(scrollable);

    // If container is at the very bottom (or within 15px), mark 100% read
    if (scrollable && scrollTop + clientHeight >= scrollHeight - 15) {
      setReadingProgress(100);
      setRemainingSeconds(0);
      setCompletedCardsCount(stats.messageStats.length);
      setActiveCardIndex(Math.max(0, stats.messageStats.length - 1));
      return;
    }

    const containerRect = container.getBoundingClientRect();
    // Focal read line is approximately 38% down the visible viewport
    const focalLine = containerRect.top + containerRect.height * 0.38;

    let cumulativeCompletedSeconds = 0;
    let fullCardsCompleted = 0;
    let currentActiveIdx = 0;

    const cardElements = container.querySelectorAll<HTMLElement>('[data-message-card]');

    if (cardElements.length === 0) {
      // Fallback to pure scroll percentage if no cards are detected
      const pct = maxScroll > 0 ? Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)) : 0;
      setReadingProgress(pct);
      const remaining = Math.max(0, Math.round(stats.totalSeconds * (1 - pct / 100)));
      setRemainingSeconds(remaining);
      return;
    }

    // Map each message stat to its DOM element
    stats.messageStats.forEach((msgStat, idx) => {
      const el = container.querySelector<HTMLElement>(`[data-message-card="${msgStat.id}"]`);
      if (!el) {
        return;
      }

      const rect = el.getBoundingClientRect();
      const cardHeight = Math.max(rect.height, 1);

      if (rect.bottom <= focalLine) {
        // Completely scrolled past
        cumulativeCompletedSeconds += msgStat.readingSeconds;
        fullCardsCompleted++;
      } else if (rect.top >= focalLine + containerRect.height * 0.4) {
        // Not reached yet
      } else {
        // Currently in reading focal area
        currentActiveIdx = idx;
        const scrolledPortion = (focalLine - rect.top) / cardHeight;
        const portion = Math.min(1, Math.max(0, scrolledPortion));
        cumulativeCompletedSeconds += msgStat.readingSeconds * portion;
      }
    });

    const calculatedProgress = stats.totalSeconds > 0
      ? Math.min(100, Math.max(0, (cumulativeCompletedSeconds / stats.totalSeconds) * 100))
      : 0;

    const remaining = Math.max(0, Math.round(stats.totalSeconds - cumulativeCompletedSeconds));

    setReadingProgress(calculatedProgress);
    setRemainingSeconds(remaining);
    setCompletedCardsCount(fullCardsCompleted);
    setActiveCardIndex(currentActiveIdx);
  }, [scrollContainerRef, stats]);

  // Scroll and resize listeners
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    calculateReadProgress();

    const onScroll = () => {
      calculateReadProgress();
    };

    container.addEventListener('scroll', onScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        calculateReadProgress();
      });
      resizeObserver.observe(container);
      if (container.firstElementChild) {
        resizeObserver.observe(container.firstElementChild);
      }
    }

    window.addEventListener('resize', calculateReadProgress);

    return () => {
      container.removeEventListener('scroll', onScroll);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', calculateReadProgress);
    };
  }, [scrollContainerRef, calculateReadProgress, messages]);

  // Recalculate during streaming as new tokens arrive
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(calculateReadProgress, 150);
      return () => clearInterval(interval);
    }
  }, [isStreaming, calculateReadProgress]);

  // Jump to the next unread card or back to top
  const handleJumpClick = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (readingProgress >= 99) {
      // Completed reading -> smooth scroll back to top
      container.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Scroll to the next card that isn't fully past the focal plane
    const containerRect = container.getBoundingClientRect();
    const focalLine = containerRect.top + containerRect.height * 0.35;
    const cardElements = Array.from(container.querySelectorAll<HTMLElement>('[data-message-card]'));

    const nextUnreadCard = cardElements.find((card) => {
      const rect = card.getBoundingClientRect();
      return rect.bottom > focalLine;
    });

    if (nextUnreadCard) {
      nextUnreadCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // If none found, scroll to bottom
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  // Determine whether to display the indicator
  // Show when there is genuine reading content (multiple messages or over 30 words)
  const isVisible = messages.length > 0 && (isScrollable || stats.totalWords > 40 || messages.length > 1);

  if (!isVisible) {
    return null;
  }

  // Format the remaining time for display inside the indicator
  const formatRemainingShort = () => {
    if (readingProgress >= 99) {
      return 'Done';
    }
    const mins = Math.ceil(remainingSeconds / 60);
    if (remainingSeconds <= 30 && remainingSeconds > 0) {
      return '< 1m left';
    }
    if (mins <= 1) {
      return '1m left';
    }
    return `${mins}m left`;
  };

  // Format detailed time for tooltip card
  const formatDetailedRemaining = () => {
    if (readingProgress >= 99) {
      return 'Reading complete';
    }
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    if (mins === 0) {
      return `~${secs}s remaining`;
    }
    return `~${mins}m ${secs > 0 ? `${secs}s ` : ''}remaining`;
  };

  const roundedPercentage = Math.round(readingProgress);
  const strokeDashoffset = circumference * (1 - Math.min(100, Math.max(0, readingProgress)) / 100);
  const isComplete = readingProgress >= 99;

  return (
    <div
      ref={indicatorRef}
      className={
        isAboveSendButton
          ? 'relative z-30 select-none transition-all duration-200 flex items-center justify-center'
          : `fixed z-30 select-none transition-all duration-300 ${
              readabilityMode
                ? 'right-4 sm:right-10 bottom-6 sm:bottom-8'
                : 'right-3 sm:right-6 bottom-28'
            }`
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Expanded Editorial Flyout Card on Hover */}
      {isHovered && (
        <div
          className={
            isAboveSendButton
              ? 'absolute right-0 bottom-full mb-3 w-72 rounded-2xl border border-[#d4af37]/35 bg-[#0c0e14]/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 text-left z-50'
              : `absolute right-full mr-3.5 bottom-0 w-72 rounded-2xl border border-[#d4af37]/35 bg-[#0c0e14]/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-150 text-left ${
                  readabilityMode ? 'ring-1 ring-[#d4af37]/20' : ''
                }`
          }
          role="tooltip"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#f3e7cb]">
              <BookOpen className="h-4 w-4 text-[#d4af37]" />
              <span className="font-serif tracking-wide">Reading Progress</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#e5b974]">
              <span>{roundedPercentage}%</span>
              {isComplete && <Sparkles className="h-3 w-3 text-[#d4af37]" />}
            </div>
          </div>

          {/* Mini Visual Progress Track inside flyout */}
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#9a7b1c] via-[#d4af37] to-[#f5d77f] transition-all duration-200"
              style={{ width: `${roundedPercentage}%` }}
            />
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Pace remaining:</span>
              <span className="font-mono text-[#f3e7cb] font-medium">{formatDetailedRemaining()}</span>
            </div>

            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Total duration:</span>
              <span className="font-mono text-neutral-200">{stats.formattedTotal} (250 WPM)</span>
            </div>

            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Message cards:</span>
              <span className="font-mono text-neutral-200">
                {completedCardsCount} of {stats.messageStats.length} scrolled past
              </span>
            </div>

            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Words read:</span>
              <span className="font-mono text-neutral-200">
                {Math.round((readingProgress / 100) * stats.totalWords).toLocaleString()} / {stats.totalWords.toLocaleString()} words
              </span>
            </div>
          </div>

          {/* Action hint */}
          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <span>
              {isComplete ? 'Click to return to top' : 'Click to jump to next card'}
            </span>
            {isComplete ? (
              <ChevronUp className="h-3.5 w-3.5 text-[#d4af37]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#d4af37]" />
            )}
          </div>
        </div>
      )}

      {/* Visual Percentage-Read Indicator: Bespoke Capsule in Readability Mode */}
      {readabilityMode ? (
        <button
          type="button"
          onClick={handleJumpClick}
          aria-label={`Percentage read: ${roundedPercentage}%. ${formatDetailedRemaining()}. Click to jump.`}
          title={!isHovered ? `Reading progress: ${roundedPercentage}% read • ${formatDetailedRemaining()}` : undefined}
          className={`group flex items-center gap-3 rounded-full border bg-[#0c0e14]/95 py-2 pl-2.5 pr-4 shadow-2xl backdrop-blur-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 active:scale-95 ${
            isComplete
              ? 'border-[#d4af37]/60 shadow-[0_0_20px_rgba(212,175,55,0.35)] ring-1 ring-[#d4af37]/30'
              : 'border-[#d4af37]/30 hover:border-[#d4af37]/65 hover:shadow-[0_0_18px_rgba(212,175,55,0.22)]'
          }`}
        >
          {/* Circular SVG Radial Gauge */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <svg
              className="absolute inset-0 h-full w-full -rotate-90 pointer-events-none"
              viewBox="0 0 44 44"
            >
              <defs>
                <linearGradient id="readPercentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f7e199" />
                  <stop offset="50%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#aa8214" />
                </linearGradient>
              </defs>

              {/* Ambient track ring */}
              <circle
                cx="22"
                cy="22"
                r="17"
                className="stroke-[#d4af37]/15 fill-none"
                strokeWidth="2.75"
              />

              {/* Dynamic Fill Ring */}
              <circle
                cx="22"
                cy="22"
                r="17"
                className="fill-none transition-[stroke-dashoffset] duration-150 ease-out"
                stroke="url(#readPercentGrad)"
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>

            {/* Icon or Centered Percent */}
            {isComplete ? (
              <Check className="relative z-10 h-4 w-4 text-[#e5b974] stroke-[2.5] animate-in zoom-in-75 duration-200" />
            ) : (
              <span className="relative z-10 font-mono text-[10px] font-bold text-[#f5ebd7] tracking-tighter">
                {roundedPercentage}%
              </span>
            )}
          </div>

          {/* Typography Readout for Readability Mode */}
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-mono text-sm font-bold text-[#f5ebd7] tracking-tight">
                {roundedPercentage}%
              </span>
              <span className="font-serif text-[10px] font-semibold uppercase tracking-wider text-[#d4af37]/90">
                READ
              </span>
            </div>
            <span className="font-mono text-[10.5px] text-neutral-400 leading-none mt-1">
              {isComplete ? '100% Complete' : formatRemainingShort()}
            </span>
          </div>
        </button>
      ) : (
        /* Circular Percentage & Time Gauge in Normal Mode */
        <button
          type="button"
          onClick={handleJumpClick}
          aria-label={`Time-to-read progress: ${roundedPercentage}%. ${formatDetailedRemaining()}. Click to jump.`}
          title={!isHovered ? `Reading progress: ${roundedPercentage}% • ${formatDetailedRemaining()}` : undefined}
          className={`group relative flex h-12 w-12 items-center justify-center rounded-full bg-[#0c0e14]/90 p-0.5 backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 ${
            isComplete
              ? 'border border-[#d4af37]/40 shadow-[0_0_16px_rgba(212,175,55,0.35)]'
              : 'border border-[#d4af37]/25 shadow-lg shadow-black/60 hover:border-[#d4af37]/50 hover:scale-105 active:scale-95'
          }`}
        >
          {/* SVG Circular Ring Gauge */}
          <svg
            className="absolute inset-0 h-full w-full -rotate-90 pointer-events-none"
            viewBox="0 0 44 44"
          >
            <defs>
              <linearGradient id="normalReadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f7e199" />
                <stop offset="50%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#aa8214" />
              </linearGradient>
            </defs>

            {/* Ambient track ring */}
            <circle
              cx="22"
              cy="22"
              r="17"
              className="stroke-[#d4af37]/15 fill-none"
              strokeWidth="2.5"
            />

            {/* Dynamic Fill Ring */}
            <circle
              cx="22"
              cy="22"
              r="17"
              className="fill-none transition-[stroke-dashoffset] duration-150 ease-out"
              stroke="url(#normalReadGrad)"
              strokeWidth="2.75"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          {/* Center Indicator (Percentage or Checkmark) */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            {isComplete ? (
              <Check className="h-4 w-4 text-[#f3e7cb] stroke-[2.5] animate-in zoom-in-75 duration-200" />
            ) : (
              <>
                <span className="font-mono text-[10.5px] font-bold text-[#f3e7cb] tracking-tighter leading-none">
                  {roundedPercentage}%
                </span>
                <span className="font-mono text-[8px] text-neutral-400 tracking-tightest leading-none mt-0.5 scale-90">
                  read
                </span>
              </>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
