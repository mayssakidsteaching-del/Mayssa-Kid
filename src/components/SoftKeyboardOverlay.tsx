import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Send,
  Trash2,
  Minimize2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface SoftKeyboardOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (text: string) => void;
}

export function SoftKeyboardOverlay({
  isOpen,
  onClose,
  onSendToChat,
}: SoftKeyboardOverlayProps) {
  const [noteText, setNoteText] = useState('');
  const [isCaps, setIsCaps] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '?'],
  ];

  const handleKeyPress = (char: string) => {
    const finalChar = isCaps ? char.toUpperCase() : char.toLowerCase();
    setNoteText((prev) => prev + finalChar);
  };

  const handleBackspace = () => {
    setNoteText((prev) => prev.slice(0, -1));
  };

  const handleSpace = () => {
    setNoteText((prev) => prev + ' ');
  };

  const handleEnter = () => {
    setNoteText((prev) => prev + '\n');
  };

  const handleCopy = async () => {
    if (!noteText.trim()) return;
    await navigator.clipboard.writeText(noteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in slide-in-from-bottom-5 duration-200">
      <div className="rounded-2xl border border-[#d4af37]/40 bg-[#0d0f17]/95 p-3.5 shadow-2xl backdrop-blur-xl">
        {/* Top Bar with Scratchpad */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#d4af37] animate-pulse" />
            <span className="font-serif text-xs font-semibold text-[#f5ebd7]">
              Editorial Reading Scratchpad
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              disabled={!noteText.trim()}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono text-neutral-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
              title="Copy notes"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {onSendToChat && (
              <button
                onClick={() => {
                  if (noteText.trim()) {
                    onSendToChat(noteText.trim());
                    setNoteText('');
                  }
                }}
                disabled={!noteText.trim()}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono bg-[#d4af37]/20 text-[#f3cf65] border border-[#d4af37]/40 hover:bg-[#d4af37]/30 disabled:opacity-30 transition-colors"
                title="Send as prompt inquiry"
              >
                <Send className="h-3 w-3" />
                <span>To Inquiry</span>
              </button>
            )}

            <button
              onClick={() => setNoteText('')}
              disabled={!noteText.trim()}
              className="rounded p-1 text-neutral-400 hover:text-red-400 disabled:opacity-20 transition-colors"
              title="Clear notes"
            >
              <Trash2 className="h-3 w-3" />
            </button>

            <button
              onClick={onClose}
              className="rounded p-1 text-neutral-400 hover:text-white transition-colors"
              title="Close keyboard overlay"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Notes Textarea */}
        <textarea
          rows={2}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Jot down notes, marginalia, or thoughts while reading..."
          className="w-full resize-none rounded-lg border border-white/10 bg-[#07080c] px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-[#d4af37]/50 focus:outline-none font-serif leading-relaxed mb-2.5"
        />

        {/* Virtual Keyboard Keys */}
        <div className="space-y-1 select-none">
          {rows.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-center gap-1">
              {rIdx === 2 && (
                <button
                  type="button"
                  onClick={() => setIsCaps(!isCaps)}
                  className={`h-7 px-2.5 rounded font-mono text-[10px] font-bold border transition-colors ${
                    isCaps
                      ? 'bg-[#d4af37] text-black border-[#d4af37]'
                      : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Caps
                </button>
              )}

              {row.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => handleKeyPress(char)}
                  className="h-7 w-7 sm:w-8 rounded border border-white/10 bg-[#161a26] text-xs font-mono font-medium text-neutral-200 hover:bg-[#d4af37]/20 hover:border-[#d4af37]/50 hover:text-white active:scale-95 transition-all"
                >
                  {isCaps ? char.toUpperCase() : char}
                </button>
              ))}

              {rIdx === 0 && (
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-7 px-2.5 rounded border border-white/10 bg-white/5 text-[10px] font-mono text-neutral-300 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                  title="Backspace"
                >
                  ⌫
                </button>
              )}

              {rIdx === 1 && (
                <button
                  type="button"
                  onClick={handleEnter}
                  className="h-7 px-2.5 rounded border border-[#d4af37]/30 bg-[#d4af37]/15 text-[10px] font-mono font-semibold text-[#f3cf65] hover:bg-[#d4af37]/30 transition-colors"
                  title="Enter / Linebreak"
                >
                  ↵
                </button>
              )}
            </div>
          ))}

          {/* Bottom row: Spacebar */}
          <div className="flex justify-center gap-1 pt-0.5">
            <button
              type="button"
              onClick={handleSpace}
              className="h-7 w-64 sm:w-80 rounded border border-white/10 bg-[#161a26] text-[11px] font-mono text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              space
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
