import React, { useState } from 'react';
import { Quote, Copy, Check } from 'lucide-react';

interface PullQuoteBlockProps {
  quote: string;
  author?: string;
}

export function PullQuoteBlock({
  quote,
  author = 'Berno Core Synthesis',
}: PullQuoteBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(quote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-6 overflow-hidden rounded-2xl border border-[#d4af37]/35 bg-gradient-to-r from-[#171b26]/90 via-[#0e111a]/85 to-[#171b26]/90 p-5 shadow-xl backdrop-blur-sm">
      {/* Decorative oversized background watermark quotation mark */}
      <div className="pointer-events-none absolute -top-4 -left-2 select-none font-serif text-8xl font-black text-[#d4af37]/10 leading-none">
        “
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        {/* Quote text */}
        <blockquote className="font-serif text-[17px] sm:text-[18.5px] italic font-normal leading-[1.75] text-[#fbf8f0] selection:bg-[#d4af37]/30">
          "{quote}"
        </blockquote>

        {/* Footer with author and copy */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-[#d4af37]/60" />
            <span className="font-serif text-xs font-semibold tracking-wider uppercase text-[#d4af37]">
              {author}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] text-neutral-400 opacity-60 group-hover:opacity-100 hover:bg-white/10 hover:text-white transition-all"
            title="Copy pull-quote"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy Quote</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
