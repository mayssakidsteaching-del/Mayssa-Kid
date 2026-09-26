import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ConversationProgressBarProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  hasMessages: boolean;
  isStreaming?: boolean;
}

export function ConversationProgressBar({
  scrollContainerRef,
  hasMessages,
  isStreaming = false,
}: ConversationProgressBarProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const calculateProgress = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) {
      setScrollProgress(0);
      setIsScrollable(false);
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 12) {
      setScrollProgress(0);
      setIsScrollable(false);
      return;
    }

    setIsScrollable(true);
    const progress = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
    setScrollProgress(progress);
  }, [scrollContainerRef]);

  // Attach passive scroll and resize listeners
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    calculateProgress();

    const onScroll = () => {
      calculateProgress();
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        calculateProgress();
      });
      resizeObserver.observe(el);
      if (el.firstElementChild) {
        resizeObserver.observe(el.firstElementChild);
      }
    }

    window.addEventListener('resize', calculateProgress);

    return () => {
      el.removeEventListener('scroll', onScroll);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', calculateProgress);
    };
  }, [scrollContainerRef, calculateProgress, hasMessages]);

  // Recalculate during streaming as content streams in
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(calculateProgress, 120);
      return () => clearInterval(interval);
    }
  }, [isStreaming, calculateProgress]);

  // Handle clicking / scrubbing along the progress bar to quickly jump through dialogue
  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || !isScrollable) return;
    const rect = barRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetPct = Math.min(1, Math.max(0, clickX / rect.width));

    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    el.scrollTo({
      top: targetPct * maxScroll,
      behavior: 'smooth',
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setHoverPosition(pct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoverPosition(null);
  };

  // Only show progress bar when there are messages and content is scrollable
  const isVisible = hasMessages && isScrollable;

  return (
    <div
      ref={barRef}
      onClick={handleBarClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative z-30 w-full cursor-pointer select-none transition-all duration-300 ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        height: isHovered ? '5px' : '2.5px',
      }}
      title={isVisible ? `Scroll depth: ${Math.round(scrollProgress)}% • Click to navigate` : undefined}
      role="progressbar"
      aria-valuenow={Math.round(scrollProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Background track */}
      <div className="absolute inset-0 bg-[#161a24]/90 backdrop-blur-sm transition-colors group-hover:bg-[#1a202d]" />

      {/* Dynamic Gold Reading Fill */}
      <div
        className="relative h-full bg-gradient-to-r from-[#9a7b1c] via-[#d4af37] to-[#f5d77f] transition-[width] duration-100 ease-out rounded-r-full shadow-[0_0_8px_rgba(212,175,55,0.45)]"
        style={{ width: `${scrollProgress}%` }}
      >
        {/* Subtle luminous beacon at leading edge */}
        {scrollProgress > 1 && scrollProgress < 99.5 && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-1.5 rounded-full bg-[#fdf3d6] shadow-[0_0_8px_#f5d77f] opacity-80" />
        )}
      </div>

      {/* Floating editorial depth indicator on hover */}
      {isHovered && hoverPosition !== null && (
        <div
          className="pointer-events-none absolute -bottom-7 -translate-x-1/2 rounded border border-[#d4af37]/30 bg-[#0e1118]/95 px-2 py-0.5 font-mono text-[10px] text-[#f3e7cb] shadow-xl backdrop-blur-md transition-transform duration-75 animate-in fade-in"
          style={{
            left: `${hoverPosition}%`,
          }}
        >
          <span>{Math.round(hoverPosition)}%</span>
        </div>
      )}
    </div>
  );
}
