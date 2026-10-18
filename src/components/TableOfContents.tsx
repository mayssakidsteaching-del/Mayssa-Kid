import React, { useState, useMemo } from 'react';
import { ListOrdered, X, ChevronRight, Hash, Bookmark } from 'lucide-react';
import { Message } from '../types';

interface HeadingItem {
  id: string;
  messageId: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateToHeading: (messageId: string, headingText: string) => void;
}

export function TableOfContents({
  messages,
  isOpen,
  onClose,
  onNavigateToHeading,
}: TableOfContentsProps) {
  // Extract headings from all assistant messages
  const headings = useMemo(() => {
    const list: HeadingItem[] = [];

    messages.forEach((msg) => {
      if (msg.role !== 'assistant' || !msg.content) return;

      const lines = msg.content.split('\n');
      lines.forEach((line, idx) => {
        const match = /^(#{1,4})\s+(.+)$/.exec(line.trim());
        if (match) {
          const level = match[1].length;
          const text = match[2].replace(/[*_`]/g, '').trim();
          if (text) {
            list.push({
              id: `${msg.id}-h-${idx}`,
              messageId: msg.id,
              text,
              level,
            });
          }
        }
      });
    });

    return list;
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-20 right-6 sm:right-10 z-40 w-80 max-h-[75vh] flex flex-col rounded-2xl border border-[#d4af37]/35 bg-[#0c0e14]/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-[#d4af37]" />
          <h3 className="font-serif text-sm font-semibold text-white tracking-wide">
            Table of Contents
          </h3>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-neutral-400 hover:text-white transition-colors"
          title="Close Table of Contents"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Headings List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-serif text-xs">
        {headings.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 font-mono text-[11px]">
            <p>No headings detected yet in this dialogue.</p>
            <p className="mt-1 text-[10px] text-neutral-600">
              Assistant Markdown headings will populate this outline automatically.
            </p>
          </div>
        ) : (
          headings.map((h) => {
            const indentClass =
              h.level === 1
                ? 'font-semibold text-white pl-1'
                : h.level === 2
                ? 'text-[#f3e7cb] pl-3'
                : h.level === 3
                ? 'text-neutral-300 pl-5 text-[11px]'
                : 'text-neutral-400 pl-7 text-[10.5px]';

            return (
              <button
                key={h.id}
                onClick={() => {
                  onNavigateToHeading(h.messageId, h.text);
                  if (window.innerWidth < 768) onClose();
                }}
                className={`group flex w-full items-center justify-between rounded-lg py-1.5 px-2 text-left transition-all hover:bg-[#d4af37]/15 hover:text-[#f3cf65] ${indentClass}`}
              >
                <span className="truncate pr-2">{h.text}</span>
                <ChevronRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 text-[#d4af37] transition-opacity" />
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      {headings.length > 0 && (
        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-neutral-500">
          <span>{headings.length} Editorial Sections</span>
          <span>Click to Jump</span>
        </div>
      )}
    </div>
  );
}
