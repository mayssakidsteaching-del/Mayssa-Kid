import React, { useState, useMemo } from 'react';
import { Conversation, ReadingHistoryItem } from '../types';
import { THINKING_MODES } from '../utils/constants';
import { calculateReadingTime, calculateWordCount } from '../utils/readingTime';
import {
  Clock,
  Search,
  X,
  Trash2,
  BookOpen,
  ArrowRight,
  MessageSquare,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';

interface ReadingHistoryViewProps {
  history: ReadingHistoryItem[];
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onRemoveFromHistory: (conversationId: string) => void;
  onClearHistory: () => void;
  onSwitchToInquiries?: () => void;
}

export function ReadingHistoryView({
  history,
  conversations,
  activeId,
  onSelectConversation,
  onRemoveFromHistory,
  onClearHistory,
  onSwitchToInquiries,
}: ReadingHistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  // Map conversation lookup map
  const conversationMap = useMemo(() => {
    const map = new Map<string, Conversation>();
    for (const c of conversations) {
      map.set(c.id, c);
    }
    return map;
  }, [conversations]);

  // Merge history items with their respective conversation details
  const enrichedHistory = useMemo(() => {
    return history
      .map((item) => {
        const conv = conversationMap.get(item.conversationId);
        if (!conv) return null;

        // Compute words and reading time
        const allText = conv.messages
          .map((m) => m.content || '')
          .join(' ')
          .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
        const wordCount = calculateWordCount(allText);
        const readingTime = calculateReadingTime(allText, 250);

        return {
          ...item,
          conversation: conv,
          wordCount,
          readingTime,
          modeConfig:
            THINKING_MODES.find((m) => m.id === conv.mode) || THINKING_MODES[0],
        };
      })
      .filter(Boolean) as Array<
      ReadingHistoryItem & {
        conversation: Conversation;
        wordCount: number;
        readingTime: { minutes: number; display: string };
        modeConfig: (typeof THINKING_MODES)[0];
      }
    >;
  }, [history, conversationMap]);

  // Filter enriched items by search query and thinking mode
  const filteredHistory = useMemo(() => {
    let list = enrichedHistory;

    if (modeFilter !== 'all') {
      list = list.filter((item) => item.conversation.mode === modeFilter);
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;

    return list.filter((item) => {
      const titleMatch = item.conversation.title.toLowerCase().includes(query);
      const tagMatch =
        item.conversation.tags &&
        item.conversation.tags.some((t) => t.toLowerCase().includes(query));
      const messageMatch = item.conversation.messages.some((m) =>
        m.content.toLowerCase().includes(query)
      );
      return titleMatch || tagMatch || messageMatch;
    });
  }, [enrichedHistory, modeFilter, searchQuery]);

  // Helper to format relative time ago
  const formatTimeAgo = (timestamp: number) => {
    const elapsedMs = Date.now() - timestamp;
    const seconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 45) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3500);
    } else {
      onClearHistory();
      setConfirmClear(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header telemetry summary */}
      <div className="px-3 pt-1 pb-2 border-b border-white/5">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 text-blue-300 font-serif font-medium">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            <span>Reading History</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-neutral-400">
              {enrichedHistory.length} recently viewed
            </span>
            {enrichedHistory.length > 0 && (
              <button
                onClick={handleClear}
                className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
                  confirmClear
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title={confirmClear ? 'Click again to confirm clearing all history' : 'Clear reading history'}
              >
                {confirmClear ? 'Confirm Clear' : 'Clear'}
              </button>
            )}
          </div>
        </div>

        {/* Search input for history */}
        {enrichedHistory.length > 0 && (
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recently viewed..."
              className="w-full rounded-lg border border-white/10 bg-[#12151c] py-1.5 pl-8 pr-7 text-xs text-neutral-200 placeholder:text-neutral-500 focus:border-blue-500/50 focus:bg-[#161a24] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Mode filter pills */}
        {enrichedHistory.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[10px] font-mono">
            <button
              onClick={() => setModeFilter('all')}
              className={`rounded px-2 py-0.5 transition-colors shrink-0 ${
                modeFilter === 'all'
                  ? 'bg-white/15 text-white font-medium'
                  : 'bg-white/5 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All Modes
            </button>
            {THINKING_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setModeFilter(m.id)}
                className={`rounded px-2 py-0.5 transition-colors shrink-0 ${
                  modeFilter === m.id
                    ? 'bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30'
                    : 'bg-white/5 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* History Items Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#12151c] mb-3 text-neutral-500">
              <Clock className="h-6 w-6 text-neutral-400" />
            </div>
            <h4 className="font-serif text-sm font-semibold text-neutral-200 mb-1">
              {searchQuery || modeFilter !== 'all'
                ? 'No matching reading history'
                : 'No reading history recorded yet'}
            </h4>
            <p className="text-xs text-neutral-400 max-w-xs leading-relaxed mb-4">
              {searchQuery || modeFilter !== 'all'
                ? 'Try adjusting your search query or mode filter.'
                : 'Inquiries you open and explore will be automatically tracked here in chronological order.'}
            </p>
            {onSwitchToInquiries && (
              <button
                onClick={onSwitchToInquiries}
                className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-medium text-[#e5b974] hover:bg-[#d4af37]/20 transition-all shadow-sm"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Browse Inquiries</span>
              </button>
            )}
          </div>
        ) : (
          filteredHistory.map((item) => {
            const isCurrent = activeId === item.conversation.id;
            const msgCount = item.conversation.messages.length;
            const lastMsg = item.conversation.messages[msgCount - 1];
            const excerpt = lastMsg
              ? (lastMsg.content || lastMsg.rawContent || '')
                  .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
                  .slice(0, 110)
              : '';

            return (
              <div
                key={item.id}
                onClick={() => onSelectConversation(item.conversation.id)}
                className={`group relative flex flex-col rounded-xl border p-3 cursor-pointer transition-all duration-200 ${
                  isCurrent
                    ? 'border-[#d4af37]/50 bg-[#181d28] shadow-md shadow-black/40 ring-1 ring-[#d4af37]/25'
                    : 'border-white/10 bg-[#10131b]/90 hover:border-white/20 hover:bg-[#141824]'
                }`}
              >
                {/* Top row: Mode badge & relative viewed time */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded"
                      style={{
                        backgroundColor: `${item.modeConfig.accentColor}18`,
                        color: item.modeConfig.accentColor,
                        border: `1px solid ${item.modeConfig.accentColor}30`,
                      }}
                    >
                      {item.modeConfig.name}
                    </span>

                    {isCurrent && (
                      <span className="flex items-center gap-1 font-mono text-[9px] text-[#f3cf65] bg-[#d4af37]/15 border border-[#d4af37]/30 px-1.5 py-0.2 rounded">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                        Current
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400">
                    <Clock className="h-3 w-3 text-neutral-500" />
                    <span>{formatTimeAgo(item.viewedAt)}</span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="font-serif text-xs font-semibold text-neutral-100 group-hover:text-white line-clamp-2 leading-snug mb-1">
                  {item.conversation.title}
                </h4>

                {/* Excerpt preview if available */}
                {excerpt && (
                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed mb-2 font-sans">
                    {excerpt}...
                  </p>
                )}

                {/* Bottom metadata row & quick remove */}
                <div className="mt-auto flex items-center justify-between pt-1.5 border-t border-white/5 text-[10px] font-mono text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-neutral-500" />
                      {msgCount} {msgCount === 1 ? 'msg' : 'msgs'}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-[#f3e7cb]">
                      <BookOpen className="h-3 w-3 text-[#d4af37]" />
                      {item.readingTime.display}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromHistory(item.conversation.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 rounded p-1 text-neutral-500 hover:bg-white/10 hover:text-neutral-200 transition-all"
                      title="Remove from reading history"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>

                    <div className="flex items-center gap-0.5 text-[#d4af37] opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                      <span>Resume</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
