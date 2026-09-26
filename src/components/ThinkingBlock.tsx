import { useState } from 'react';
import { ChevronDown, ChevronRight, BrainCircuit, Sparkles, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ThinkingBlockProps {
  thinking: string;
  isStreaming: boolean;
  accentColor?: string;
}

export function ThinkingBlock({ thinking, isStreaming, accentColor = '#d4af37' }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(isStreaming);
  const [copied, setCopied] = useState(false);

  // If streaming just started and thinking has content, keep open
  // If completed, user can toggle.
  if (!thinking && !isStreaming) return null;

  const wordCount = thinking ? thinking.split(/\s+/).filter(Boolean).length : 0;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!thinking) return;
    navigator.clipboard.writeText(thinking);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-[#101319] text-xs transition-all shadow-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <BrainCircuit className="h-4 w-4 text-[#d4af37]" />
            {isStreaming && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]" />
              </span>
            )}
          </div>
          <span className="font-mono font-medium tracking-wide text-neutral-300">
            {isStreaming ? (
              <span className="flex items-center gap-1.5 text-[#d4af37]">
                <Sparkles className="h-3 w-3 animate-spin" />
                Berno Cognitive Arc — Multi-Stage Deduction Active...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Berno Cognitive Arc</span>
                <span className="rounded bg-[#d4af37]/15 border border-[#d4af37]/30 px-1.5 py-0.5 text-[10px] text-[#f3e7cb]">
                  {wordCount.toLocaleString()} reasoning tokens
                </span>
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-neutral-400">
          {!isStreaming && thinking && (
            <span
              onClick={handleCopy}
              className="mr-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Copy internal cognitive reasoning trace"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy Arc</span>
                </>
              )}
            </span>
          )}

          <span className="text-[11px] font-mono uppercase tracking-wider">
            {isOpen ? 'Fold Reasoning' : 'Inspect Reasoning'}
          </span>
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/5 bg-[#0a0c10] px-4 py-3"
          >
            <div className="max-h-80 overflow-y-auto pr-2 font-mono text-[12.5px] leading-relaxed text-neutral-300/90 whitespace-pre-wrap selection:bg-[#d4af37]/20">
              {thinking || (
                <span className="italic text-neutral-500">
                  Formulating axiomatic hypothesis, evaluating invariants and boundary conditions...
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
