import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GroundingSource, Message } from '../types';
import { Globe, ExternalLink, Quote, BookOpen, Compass, Hash } from 'lucide-react';

export interface CitationTooltipProps {
  refNumber: number;
  source?: GroundingSource;
  label?: string;
  className?: string;
  messageIndex?: number;
  currentTurn?: number;
  allMessages?: Message[];
}

export function CitationTooltip({
  refNumber,
  source,
  label,
  className = '',
  messageIndex,
  currentTurn,
  allMessages,
}: CitationTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<any>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [horizontalAlign, setHorizontalAlign] = useState<'center' | 'left' | 'right'>('center');

  const displayText = label || `[Ref ${refNumber}]`;

  // Dynamically calculate the 'Cited in Turn' number relative to the specific message index
  const calculatedTurn = useMemo(() => {
    if (typeof currentTurn === 'number' && currentTurn > 0) {
      return currentTurn;
    }
    if (allMessages && typeof messageIndex === 'number' && messageIndex >= 0) {
      const userCount = allMessages
        .slice(0, messageIndex + 1)
        .filter((m) => m.role === 'user').length;
      return Math.max(1, userCount);
    }
    if (typeof messageIndex === 'number' && messageIndex >= 0) {
      return Math.max(1, Math.floor(messageIndex / 2) + 1);
    }
    return 1;
  }, [currentTurn, allMessages, messageIndex]);

  // Dynamically calculate where this source reference first originated and all turns it was cited in
  const originInfo = useMemo(() => {
    if (source?.citedInTurns && source.citedInTurns.length > 0) {
      return {
        firstTurn: source.citedInTurns[0],
        allTurns: source.citedInTurns,
      };
    }

    if (allMessages && allMessages.length > 0) {
      const matchingTurns: number[] = [];
      let turnCounter = 0;

      for (let i = 0; i < allMessages.length; i++) {
        const msg = allMessages[i];
        if (msg.role === 'user') {
          turnCounter++;
        } else if (msg.groundingSources && Array.isArray(msg.groundingSources)) {
          const tNum = turnCounter || 1;
          const matched = msg.groundingSources.some((s) => {
            if (!s) return false;
            if (s.url && source?.url) {
              const a = s.url.trim().toLowerCase().replace(/\/$/, '');
              const b = source.url.trim().toLowerCase().replace(/\/$/, '');
              if (a === b) return true;
            }
            if (s.title && source?.title) {
              if (s.title.trim().toLowerCase() === source.title.trim().toLowerCase()) return true;
            }
            return false;
          });

          if (matched && !matchingTurns.includes(tNum)) {
            matchingTurns.push(tNum);
          }
        }
      }

      if (matchingTurns.length > 0) {
        return {
          firstTurn: matchingTurns[0],
          allTurns: matchingTurns,
        };
      }
    }

    return {
      firstTurn: calculatedTurn,
      allTurns: [calculatedTurn],
    };
  }, [source, allMessages, calculatedTurn]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Determine horizontal alignment based on distance from viewport edges
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      if (rect.left < 160) {
        setHorizontalAlign('left');
      } else if (viewportWidth - rect.right < 160) {
        setHorizontalAlign('right');
      } else {
        setHorizontalAlign('center');
      }
    }

    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (source?.url) {
      window.open(source.url, '_blank', 'noopener,noreferrer');
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (source?.url) {
        window.open(source.url, '_blank', 'noopener,noreferrer');
      } else {
        setIsOpen((prev) => !prev);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const title = source?.title || `Grounding Reference ${refNumber}`;
  const hostname = source?.hostname || (source?.url ? (() => {
    try {
      return new URL(source.url).hostname.replace(/^www\./, '');
    } catch {
      return 'web source';
    }
  })() : 'web source');
  const snippet = source?.snippet;

  // Alignment classes for floating popover
  const alignmentClass =
    horizontalAlign === 'left'
      ? 'left-0'
      : horizontalAlign === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <span
      ref={containerRef}
      className="relative inline-block align-baseline mx-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Citation reference ${refNumber}: ${title} (Cited in Turn ${calculatedTurn})`}
        aria-expanded={isOpen}
        className={`group inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono font-medium transition-all duration-150 cursor-pointer select-none border border-[#3b82f6]/40 bg-[#1e3a8a]/25 text-[#93c5fd] hover:bg-[#3b82f6]/30 hover:border-[#60a5fa] hover:text-white shadow-sm hover:shadow-[0_0_10px_rgba(59,130,246,0.35)] active:scale-95 ${className}`}
      >
        <BookOpen className="h-2.5 w-2.5 text-[#60a5fa] group-hover:text-white transition-colors" />
        <span>{displayText}</span>
      </button>

      {/* Interactive Floating Preview Tooltip */}
      {isOpen && (
        <span
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute bottom-full mb-2 ${alignmentClass} z-50 w-72 sm:w-88 max-w-[calc(100vw-32px)] rounded-xl border border-[#3b82f6]/40 bg-[#0a1120]/95 p-3.5 shadow-2xl backdrop-blur-xl text-left font-sans animate-in fade-in zoom-in-95 duration-150 pointer-events-auto block`}
        >
          {/* Subtle pointer arrow */}
          <span
            className={`absolute top-full -mt-[1px] h-2 w-2 rotate-45 border-r border-b border-[#3b82f6]/40 bg-[#0a1120] ${
              horizontalAlign === 'left'
                ? 'left-4'
                : horizontalAlign === 'right'
                ? 'right-4'
                : 'left-1/2 -translate-x-1/2'
            }`}
          />

          {/* Popover Header with Ref Number and Hostname */}
          <span className="flex items-center justify-between gap-2 border-b border-[#3b82f6]/20 pb-2 mb-2 text-xs">
            <span className="flex items-center gap-1.5 overflow-hidden">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#3b82f6]/30 font-mono text-[10px] font-bold text-[#93c5fd]">
                {refNumber}
              </span>
              <span className="truncate font-mono text-[11px] font-semibold text-[#93c5fd]">
                {hostname}
              </span>
            </span>
            <span className="shrink-0 flex items-center gap-1 rounded bg-[#3b82f6]/15 border border-[#3b82f6]/30 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-[#bfdbfe]">
              <Globe className="h-2.5 w-2.5 text-[#60a5fa]" />
              Grounding Ref
            </span>
          </span>

          {/* Dynamic "Cited in Turn" Attribution Chip */}
          <span className="mb-2.5 flex items-center justify-between gap-1.5 rounded-lg border border-[#3b82f6]/30 bg-[#1e3a8a]/25 px-2.5 py-1.5 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-[#bfdbfe]">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#60a5fa] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]"></span>
              </span>
              <span className="font-semibold text-white">Cited in Turn {calculatedTurn}</span>
            </span>
            {originInfo.firstTurn < calculatedTurn ? (
              <span className="rounded bg-[#d4af37]/20 border border-[#d4af37]/30 px-1.5 py-0.5 text-[9px] font-medium text-[#f3e7cb]">
                Originated Turn {originInfo.firstTurn}
              </span>
            ) : originInfo.allTurns.length > 1 ? (
              <span className="rounded bg-[#3b82f6]/20 px-1.5 py-0.5 text-[9px] text-[#93c5fd]">
                Turns: {originInfo.allTurns.join(', ')}
              </span>
            ) : (
              <span className="text-[9px] text-neutral-400">Inquiry {calculatedTurn}</span>
            )}
          </span>

          {/* Source Title */}
          <span className="block text-xs font-semibold text-neutral-100 hover:text-[#93c5fd] transition-colors leading-snug line-clamp-2">
            {title}
          </span>

          {/* Snippet / Evidentiary quotation */}
          {snippet ? (
            <span className="mt-2 block rounded-lg border border-white/5 bg-black/40 p-2 text-[11px] leading-relaxed text-neutral-300 italic font-normal">
              <Quote className="inline h-3 w-3 text-[#60a5fa] mr-1 opacity-70 -mt-0.5" />
              <span>{snippet}</span>
            </span>
          ) : (
            <span className="mt-1.5 block text-[11px] text-neutral-400 italic">
              Empirical grounding source citation synthesized in this answer.
            </span>
          )}

          {/* Click to open URL button */}
          {source?.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2.5 flex items-center justify-between rounded-lg bg-[#3b82f6]/15 border border-[#3b82f6]/30 px-2.5 py-1.5 text-[11px] font-mono text-[#93c5fd] hover:bg-[#3b82f6]/30 hover:text-white transition-all group/link"
            >
              <span className="truncate">Open Full Source</span>
              <ExternalLink className="h-3 w-3 shrink-0 ml-1.5 text-[#60a5fa] group-hover/link:text-white transition-colors" />
            </a>
          )}
        </span>
      )}
    </span>
  );
}
