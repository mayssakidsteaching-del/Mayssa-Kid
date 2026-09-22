import { CURATED_INQUIRIES, THINKING_MODES } from '../utils/constants';
import { ThinkingMode } from '../types';
import { ArrowUpRight, ShieldCheck, Flame, Compass } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string, mode: ThinkingMode) => void;
}

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
      {/* Berno Architectural Sigil */}
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-gradient-to-b from-[#1b1f29] via-[#12151d] to-[#0a0b0e] p-4 shadow-2xl">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:8px_8px] opacity-20" />
        <span className="font-serif text-4xl font-bold tracking-tighter text-[#e5b974] drop-shadow-md">
          B
        </span>
      </div>

      <h1 className="font-serif text-3xl font-semibold tracking-wide text-neutral-100 sm:text-4xl">
        Berno
      </h1>

      <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-400 sm:text-base">
        A differentiated cognitive reasoning intelligence. Formulated for deliberate multi-step deduction, structural clarity, and zero conversational filler.
      </p>

      {/* Distinction Badges */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5 px-3 py-1 text-[#e5b974]">
          <Compass className="h-3.5 w-3.5" />
          Multi-Stage Thought Arc
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/5 px-3 py-1 text-sky-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Second-Order Scrutiny
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-emerald-400">
          <Flame className="h-3.5 w-3.5" />
          High Signal, Zero Fluff
        </span>
      </div>

      {/* Curated Prompt Grid */}
      <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 text-left">
        {CURATED_INQUIRIES.map((item, idx) => {
          const modeConfig =
            THINKING_MODES.find((m) => m.id === item.mode) || THINKING_MODES[0];

          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt, item.mode)}
              className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#10131a] p-4 transition-all hover:border-[#d4af37]/50 hover:bg-[#141822] hover:shadow-lg"
            >
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span
                    className="font-mono text-[11px] uppercase tracking-wider"
                    style={{ color: modeConfig.accentColor }}
                  >
                    {item.category}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#d4af37]" />
                </div>
                <p className="text-xs leading-relaxed text-neutral-300 group-hover:text-white">
                  "{item.prompt}"
                </p>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-neutral-500">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: modeConfig.accentColor }}
                />
                <span>Triggers {modeConfig.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
