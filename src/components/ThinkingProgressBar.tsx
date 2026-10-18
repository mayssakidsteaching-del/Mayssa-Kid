import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, BrainCircuit, Check, Layers, ChevronRight } from 'lucide-react';

interface ThinkingProgressBarProps {
  isStreaming: boolean;
  thinkingContent?: string;
  hasResponseContent?: boolean;
  modeName?: string;
  accentColor?: string;
}

interface ThinkingStep {
  id: number;
  label: string;
  shortLabel: string;
  minProgress: number;
  maxProgress: number;
}

const THINKING_STEPS: ThinkingStep[] = [
  {
    id: 1,
    label: 'Axiomatic Inquiry Deconstruction',
    shortLabel: 'Deconstructing Premise',
    minProgress: 5,
    maxProgress: 26,
  },
  {
    id: 2,
    label: 'Grounding Corpus Retrieval & Evidentiary Scrutiny',
    shortLabel: 'Grounding & Corpus Scrutiny',
    minProgress: 26,
    maxProgress: 58,
  },
  {
    id: 3,
    label: 'Dialectical Scrutiny & Invariant Bounds',
    shortLabel: 'Dialectical Invariants',
    minProgress: 58,
    maxProgress: 84,
  },
  {
    id: 4,
    label: 'Codifying Architectural Synthesis',
    shortLabel: 'Codifying Synthesis',
    minProgress: 84,
    maxProgress: 98,
  },
];

export function ThinkingProgressBar({
  isStreaming,
  thinkingContent = '',
  hasResponseContent = false,
  modeName = 'Cognitive',
  accentColor = '#d4af37',
}: ThinkingProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Approximate reasoning tokens from thinking content
  const reasoningTokens = thinkingContent
    ? Math.round(thinkingContent.trim().split(/\s+/).length * 1.3)
    : 0;

  useEffect(() => {
    if (isStreaming) {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      setIsVisible(true);
      setIsCompleted(false);
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      const ticker = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 500);

      return () => clearInterval(ticker);
    } else {
      if (isVisible && !isCompleted) {
        // Complete the progress to 100%
        setIsCompleted(true);
        setProgress(100);
        setActiveStepIndex(3);

        fadeTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
          setIsCompleted(false);
          setProgress(0);
          setActiveStepIndex(0);
          setElapsedSeconds(0);
          startTimeRef.current = null;
        }, 1800);
      }
    }
  }, [isStreaming, isVisible, isCompleted]);

  // Dynamically calculate progress based on elapsed time and streamed content
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        let target = prev;

        if (hasResponseContent) {
          // If response text has begun streaming, we are in the final step (85% - 98%)
          target = Math.min(98, Math.max(86, prev + 1.2));
        } else if (thinkingContent.length > 0) {
          // Progress based on thinking tokens accumulated
          const tokenScaled = Math.min(84, 25 + Math.sqrt(reasoningTokens) * 4.2);
          target = Math.max(prev, Math.min(84, tokenScaled));
        } else {
          // Early phase before first token
          target = Math.min(32, prev + 1.5);
        }

        // Determine active step from progress
        const stepIdx = THINKING_STEPS.findIndex(
          (s) => target >= s.minProgress && target <= s.maxProgress
        );
        if (stepIdx !== -1) {
          setActiveStepIndex(stepIdx);
        } else if (target > 84) {
          setActiveStepIndex(3);
        }

        return target;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [isStreaming, hasResponseContent, thinkingContent, reasoningTokens]);

  if (!isVisible) return null;

  const currentStep = THINKING_STEPS[activeStepIndex] || THINKING_STEPS[0];

  return (
    <div
      className={`relative z-25 w-full select-none transition-all duration-300 border-b border-[#d4af37]/20 bg-[#090b10]/95 backdrop-blur-md shadow-sm ${
        isCompleted ? 'opacity-90' : 'opacity-100'
      }`}
    >
      {/* Discreet 2.5px linear progress line */}
      <div className="relative h-[2.5px] w-full overflow-hidden bg-[#131620]">
        <div
          className="relative h-full transition-[width] duration-150 ease-out"
          style={{
            width: `${Math.min(100, Math.max(2, progress))}%`,
            background: isCompleted
              ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
              : `linear-gradient(90deg, #8a6e27 0%, ${accentColor} 50%, #fef3c7 100%)`,
            boxShadow: isCompleted
              ? '0 0 10px rgba(52, 211, 153, 0.6)'
              : `0 0 10px rgba(212, 175, 55, 0.5)`,
          }}
        >
          {/* Luminous beacon at the leading edge */}
          {!isCompleted && progress > 3 && progress < 99 && (
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-1 rounded-full bg-[#fffbeb] shadow-[0_0_8px_#fef08a]"
              style={{ opacity: 0.9 }}
            />
          )}
        </div>
      </div>

      {/* Editorial Step Telemetry Strip */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 text-[11px] font-mono">
        <div className="flex items-center gap-2 min-w-0">
          {/* Pulsing indicator */}
          <div className="relative flex h-3.5 w-3.5 items-center justify-center shrink-0">
            {isCompleted ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <>
                <span
                  className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full opacity-60"
                  style={{ backgroundColor: accentColor }}
                />
                <BrainCircuit
                  className="relative h-3 w-3 animate-pulse"
                  style={{ color: accentColor }}
                />
              </>
            )}
          </div>

          {/* Step Count & Name */}
          <div className="flex items-center gap-1.5 truncate">
            <span
              className="font-bold text-[10px] uppercase tracking-wider shrink-0"
              style={{ color: isCompleted ? '#34d399' : accentColor }}
            >
              {isCompleted ? 'Complete' : `Step ${currentStep.id}/4`}
            </span>
            <span className="text-neutral-500" aria-hidden="true">
              ·
            </span>
            <span className="text-[#f5ebd7] font-medium truncate">
              {isCompleted
                ? 'Cognitive Synthesis Completed'
                : currentStep.label}
            </span>
          </div>
        </div>

        {/* Right metrics: Token count & percentage */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-neutral-400 pl-2">
          {reasoningTokens > 0 && !isCompleted && (
            <span className="hidden md:inline text-[10px] text-neutral-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
              <span className="text-[#f5ebd7] font-semibold">{reasoningTokens.toLocaleString()}</span> tokens
            </span>
          )}

          {elapsedSeconds > 0 && (
            <span className="hidden sm:inline text-[10px] text-neutral-500">
              {elapsedSeconds}s
            </span>
          )}

          {/* Progress Percentage */}
          <span
            className="font-semibold text-[11px] font-mono"
            style={{ color: isCompleted ? '#34d399' : '#f5ebd7' }}
          >
            {Math.round(progress)}%
          </span>

          {/* Toggle Step Details */}
          <button
            onClick={() => setIsDetailsExpanded((prev) => !prev)}
            className="text-neutral-400 hover:text-white transition-colors p-0.5 rounded"
            title="Inspect cognitive steps overview"
          >
            <Layers className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Expanded Multi-Step Editorial Overview */}
      {isDetailsExpanded && (
        <div className="border-t border-white/10 bg-[#0d1017] px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {THINKING_STEPS.map((step, idx) => {
              const isPast = activeStepIndex > idx || isCompleted;
              const isCurrent = activeStepIndex === idx && !isCompleted;

              return (
                <div
                  key={step.id}
                  className={`rounded-lg border p-2 text-[10px] font-mono transition-all ${
                    isCurrent
                      ? 'border-[#d4af37]/50 bg-[#d4af37]/10 text-[#f5ebd7]'
                      : isPast
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-neutral-300'
                      : 'border-white/5 bg-white/[0.02] text-neutral-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase font-bold tracking-wider">
                      Step {step.id}
                    </span>
                    {isPast ? (
                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <Sparkles className="h-2.5 w-2.5 text-[#d4af37] animate-spin" />
                    ) : null}
                  </div>
                  <div className="font-sans text-[11px] font-medium line-clamp-1">
                    {step.shortLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
