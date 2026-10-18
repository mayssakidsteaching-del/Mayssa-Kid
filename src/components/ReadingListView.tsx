import React, { useState, useMemo } from 'react';
import { ReadingListItem } from '../types';
import {
  Bookmark,
  Search,
  X,
  Trash2,
  Copy,
  Check,
  Clock,
  BookOpen,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface ReadingListViewProps {
  items: ReadingListItem[];
  onNavigateToBookmark: (item: ReadingListItem) => void;
  onRemoveFromReadingList: (messageId: string) => void;
}

export function ReadingListView({
  items,
  onNavigateToBookmark,
  onRemoveFromReadingList,
}: ReadingListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'assistant' | 'user'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute total reading time in minutes across saved insights
  const totalDurationMinutes = useMemo(() => {
    const totalWords = items.reduce((acc, curr) => acc + (curr.wordCount || 0), 0);
    return Math.max(1, Math.round(totalWords / 250));
  }, [items]);

  // Filter items by search query and role
  const filteredItems = useMemo(() => {
    let result = items;

    if (roleFilter !== 'all') {
      result = result.filter((it) => it.role === roleFilter);
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return result;

    return result.filter(
      (it) =>
        it.snippet.toLowerCase().includes(query) ||
        it.fullContent.toLowerCase().includes(query) ||
        it.conversationTitle.toLowerCase().includes(query)
    );
  }, [items, roleFilter, searchQuery]);

  const handleCopy = async (e: React.MouseEvent, item: ReadingListItem) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.fullContent);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy insight text', err);
    }
  };

  const handleRemove = (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    onRemoveFromReadingList(messageId);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header telemetry summary */}
      <div className="px-3 pt-1 pb-2 border-b border-white/5">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 text-[#f3e7cb] font-serif font-medium">
            <Bookmark className="h-3.5 w-3.5 fill-[#d4af37] text-[#d4af37]" />
            <span>Saved Insights</span>
          </div>
          <span className="font-mono text-[11px] text-neutral-400">
            {items.length} {items.length === 1 ? 'item' : 'items'}
            {items.length > 0 && ` · ~${totalDurationMinutes}m total`}
          </span>
        </div>

        {/* Search input for reading list */}
        {items.length > 0 && (
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved insights..."
              className="w-full rounded-lg border border-white/10 bg-[#12151c] py-1.5 pl-8 pr-7 text-xs text-neutral-200 placeholder:text-neutral-500 focus:border-[#d4af37]/50 focus:bg-[#161a24] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Role filter buttons */}
        {items.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRoleFilter('all')}
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono transition-colors ${
                roleFilter === 'all'
                  ? 'bg-[#d4af37]/20 text-[#f3cf65] border border-[#d4af37]/40 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setRoleFilter('assistant')}
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono transition-colors ${
                roleFilter === 'assistant'
                  ? 'bg-[#d4af37]/20 text-[#f3cf65] border border-[#d4af37]/40 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Syntheses ({items.filter((it) => it.role === 'assistant').length})
            </button>
            <button
              onClick={() => setRoleFilter('user')}
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono transition-colors ${
                roleFilter === 'user'
                  ? 'bg-[#d4af37]/20 text-[#f3cf65] border border-[#d4af37]/40 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Inquiries ({items.filter((it) => it.role === 'user').length})
            </button>
          </div>
        )}
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500">
            {items.length === 0 ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/10 mb-3 shadow-inner">
                  <Bookmark className="h-6 w-6 text-[#d4af37]" />
                </div>
                <p className="font-serif text-sm font-semibold text-neutral-300 mb-1">
                  Reading List is Empty
                </p>
                <p className="text-xs text-neutral-400 max-w-[220px] leading-relaxed">
                  Click <span className="font-mono text-[#f3cf65]">Read Later</span> on any message card to pin crucial insights for revisitation across sessions.
                </p>
              </>
            ) : (
              <>
                <Search className="h-8 w-8 text-neutral-600 mb-2" />
                <p className="text-xs text-neutral-400">
                  No saved insights match "{searchQuery}".
                </p>
              </>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onNavigateToBookmark(item)}
              className="group relative flex flex-col rounded-xl border border-white/10 bg-[#12151d] p-3 transition-all duration-200 hover:border-[#d4af37]/40 hover:bg-[#161a24] hover:shadow-lg cursor-pointer"
            >
              {/* Card Header: Conversation origin & metrics */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#d4af37]/15 text-[#f3cf65] font-serif text-[10px] font-bold">
                    {item.role === 'assistant' ? 'B' : 'Q'}
                  </span>
                  <span
                    className="truncate text-[11px] font-medium text-neutral-300 group-hover:text-white transition-colors"
                    title={item.conversationTitle}
                  >
                    {item.conversationTitle}
                  </span>
                </div>

                {/* Reading Duration Badge */}
                <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-neutral-400">
                  <Clock className="h-3 w-3 text-[#d4af37]" />
                  <span>{item.readingTimeDisplay}</span>
                </div>
              </div>

              {/* Excerpt / Snippet */}
              <div className="mb-2.5 rounded-lg border-l-2 border-[#d4af37]/60 bg-black/20 py-1.5 px-2.5">
                <p className="font-serif text-[12px] leading-relaxed text-neutral-200 line-clamp-3 italic">
                  "{item.snippet}"
                </p>
              </div>

              {/* Footer: Word count, timestamp & quick actions */}
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-1 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span>{item.wordCount.toLocaleString()} words</span>
                  <span>·</span>
                  <span>{new Date(item.bookmarkedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Copy snippet button */}
                  <button
                    onClick={(e) => handleCopy(e, item)}
                    className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                    title="Copy insight text"
                  >
                    {copiedId === item.id ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>

                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemove(e, item.messageId)}
                    className="rounded p-1 text-neutral-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title="Remove from Reading List"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>

                  {/* Read now action button */}
                  <span className="flex items-center gap-0.5 text-[#d4af37] font-medium pl-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Read</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
