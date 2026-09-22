import { X, BrainCircuit, ShieldAlert, Sparkles, Code2, Zap, Globe } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1016] p-6 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#161a24]">
            <span className="font-serif text-xl font-bold text-[#e5b974]">B</span>
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold tracking-wide text-neutral-100">
              The Architecture of Berno
            </h2>
            <p className="text-xs font-mono text-[#d4af37]">
              Cognitive Reasoning Beyond Superficial Conversationalists
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6 text-xs leading-relaxed text-neutral-300">
          <p className="text-sm text-neutral-300">
            Standard conversational chatbots are tuned for pleasant agreeableness and surface-level conversational flow. <span className="text-white font-medium">Berno is engineered as a cognitive intelligence engine</span> designed for deep structural deconstruction, intellectual rigor, and zero conversational filler.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#12151f] p-4">
              <div className="flex items-center gap-2 font-serif text-sm font-semibold text-[#e5b974]">
                <BrainCircuit className="h-4 w-4" />
                <span>Dual-Paced Cognitive Arc</span>
              </div>
              <p className="mt-2 text-neutral-400">
                Berno doesn't rush to generate token predictions. Every inquiry undergoes a formal <code className="text-neutral-300">&lt;thinking&gt;</code> phase where premises are challenged, edge cases identified, and logical arcs formulated.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#12151f] p-4">
              <div className="flex items-center gap-2 font-serif text-sm font-semibold text-sky-400">
                <Globe className="h-4 w-4" />
                <span>Research Mode & Search Grounding</span>
              </div>
              <p className="mt-2 text-neutral-400">
                Ground Berno in real-time verified Google Search results and live web intelligence. Access up-to-date events, statistics, and verifiable citations.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#12151f] p-4">
              <div className="flex items-center gap-2 font-serif text-sm font-semibold text-emerald-400">
                <Code2 className="h-4 w-4" />
                <span>Architectural Hardening</span>
              </div>
              <p className="mt-2 text-neutral-400">
                Technical queries are delivered with production invariants, concurrency caveats, and explicit failure-mode protections rather than naive snippets.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#12151f] p-4">
              <div className="flex items-center gap-2 font-serif text-sm font-semibold text-amber-500">
                <ShieldAlert className="h-4 w-4" />
                <span>Devil's Advocate Mode</span>
              </div>
              <p className="mt-2 text-neutral-400">
                Actively seeks counter-evidence, hidden blind spots, and cognitive biases to stress-test your plans before reality does.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4 space-y-2">
            <div>
              <div className="flex items-center gap-2 font-medium text-[#e5b974]">
                <Sparkles className="h-4 w-4" />
                <span>Prompt Sharpening & 3-Word Session Titles</span>
              </div>
              <p className="mt-1 text-neutral-400">
                Click <strong>Sharpen Inquiry</strong> on any draft prompt to reformulate your input into a high-yield analytical inquiry. After your first exchange, Berno's background synthesizer automatically crafts a concise 3-word Title Case descriptor for crystal-clear sidebar archives.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-[#d4af37] px-5 py-2 text-xs font-semibold text-neutral-950 transition-colors hover:bg-[#e2bd4e]"
          >
            Enter Berno
          </button>
        </div>
      </div>
    </div>
  );
}
