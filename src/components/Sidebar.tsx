import { useState, useMemo, useEffect } from 'react';
import { Conversation, ReadingListItem, ReadingHistoryItem, User } from '../types';
import {
  Plus,
  Search,
  MessageSquare,
  Pin,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  FileText,
  Tag as TagIcon,
  Bookmark,
  Clock,
  User as UserIcon,
  LogOut,
  LogIn,
} from 'lucide-react';
import { TagPicker } from './TagPicker';
import { getTagStyle, normalizeTag, PRESET_TAGS } from '../utils/tagUtils';
import { ReadingListView } from './ReadingListView';
import { ReadingHistoryView } from './ReadingHistoryView';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePin: (id: string) => void;
  onAutoSummarize?: (id: string) => void;
  summarizingId?: string | null;
  onUpdateTags?: (id: string, tags: string[]) => void;
  readingList?: ReadingListItem[];
  onRemoveFromReadingList?: (messageId: string) => void;
  onNavigateToBookmark?: (item: ReadingListItem) => void;
  activeSidebarTab?: 'inquiries' | 'reading_list' | 'history';
  onTabChange?: (tab: 'inquiries' | 'reading_list' | 'history') => void;
  readingHistory?: ReadingHistoryItem[];
  onRemoveFromReadingHistory?: (convId: string) => void;
  onClearReadingHistory?: () => void;
  user?: User | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onTogglePin,
  onAutoSummarize,
  summarizingId,
  onUpdateTags,
  readingList = [],
  onRemoveFromReadingList,
  onNavigateToBookmark,
  activeSidebarTab = 'inquiries',
  onTabChange,
  readingHistory = [],
  onRemoveFromReadingHistory,
  onClearReadingHistory,
  user = null,
  onOpenAuth,
  onLogout,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'inquiries' | 'reading_list' | 'history'>(activeSidebarTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeSidebarTab) {
      setActiveTab(activeSidebarTab);
    }
  }, [activeSidebarTab]);

  const handleTabChange = (tab: 'inquiries' | 'reading_list' | 'history') => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Compute all unique tags across conversations with their frequency count
  const allTagsWithCounts = useMemo(() => {
    const tagCounts = new Map<string, number>();
    for (const c of conversations) {
      if (c.tags && c.tags.length > 0) {
        for (const t of c.tags) {
          const norm = normalizeTag(t);
          tagCounts.set(norm, (tagCounts.get(norm) || 0) + 1);
        }
      }
    }
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [conversations]);

  // Filter conversations by tag first, then search query
  const searchResults = useMemo(() => {
    let list = conversations;
    if (selectedTagFilter) {
      list = list.filter((conv) => conv.tags && conv.tags.includes(selectedTagFilter));
    }

    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) {
      return list.map((conv) => ({
        conv,
        matchedSnippet: null as string | null,
        titleMatch: false,
      }));
    }

    const results: {
      conv: Conversation;
      matchedSnippet: string | null;
      titleMatch: boolean;
    }[] = [];

    for (const conv of list) {
      const titleMatch = conv.title.toLowerCase().includes(trimmed);
      let matchedSnippet: string | null = null;

      // Also match in tags
      const tagMatch = conv.tags?.some((t) => t.toLowerCase().includes(trimmed));

      // Search through message contents
      for (const msg of conv.messages) {
        if (msg.content && msg.content.toLowerCase().includes(trimmed)) {
          const idx = msg.content.toLowerCase().indexOf(trimmed);
          const start = Math.max(0, idx - 25);
          const end = Math.min(msg.content.length, idx + trimmed.length + 35);
          matchedSnippet = (start > 0 ? '...' : '') + msg.content.slice(start, end).replace(/\n/g, ' ') + (end < msg.content.length ? '...' : '');
          break;
        } else if (msg.thinkingContent && msg.thinkingContent.toLowerCase().includes(trimmed)) {
          const idx = msg.thinkingContent.toLowerCase().indexOf(trimmed);
          const start = Math.max(0, idx - 25);
          const end = Math.min(msg.thinkingContent.length, idx + trimmed.length + 35);
          matchedSnippet = '[Thought] ' + (start > 0 ? '...' : '') + msg.thinkingContent.slice(start, end).replace(/\n/g, ' ') + (end < msg.thinkingContent.length ? '...' : '');
          break;
        }
      }

      if (titleMatch || tagMatch || matchedSnippet) {
        results.push({
          conv,
          matchedSnippet: titleMatch || tagMatch ? null : matchedSnippet,
          titleMatch,
        });
      }
    }

    return results;
  }, [conversations, selectedTagFilter, searchQuery]);

  const pinnedItems = searchResults.filter((item) => item.conv.pinned);
  const recentItems = searchResults.filter((item) => !item.conv.pinned);

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setDeletingId(null);
  };

  const submitRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const confirmDelete = (id: string) => {
    onDeleteConversation(id);
    setDeletingId(null);
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#090b0f] text-neutral-300 shadow-2xl transition-all md:relative">
      {/* Top action header */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#d4af37]/40 bg-[#12151c]">
            <span className="font-serif text-xs font-bold text-[#e5b974]">B</span>
          </div>
          <span className="font-serif text-sm font-semibold tracking-wider text-white">
            Archives
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            ({conversations.length})
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white"
          title="Close Navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mode Tabs: Inquiries vs Reading History vs Reading List */}
      <div className="px-3 pt-2 pb-1">
        <div className="grid grid-cols-3 rounded-xl border border-white/10 bg-[#12151c] p-1 text-xs">
          <button
            onClick={() => handleTabChange('inquiries')}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-medium transition-all ${
              activeTab === 'inquiries'
                ? 'bg-[#1e2330] text-white shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="All Inquiries"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Inquiries</span>
            <span className="sm:hidden">All</span>
            <span className="font-mono text-[10px] text-neutral-500">
              ({conversations.length})
            </span>
          </button>

          <button
            onClick={() => handleTabChange('history')}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-blue-500/20 text-blue-300 shadow-sm border border-blue-500/40 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Reading History: Recently viewed conversations"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>History</span>
            {readingHistory.length > 0 && (
              <span className="rounded-full bg-blue-500/25 px-1.5 py-0.2 font-mono text-[10px] text-blue-300 font-semibold">
                {readingHistory.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('reading_list')}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-medium transition-all ${
              activeTab === 'reading_list'
                ? 'bg-[#d4af37]/20 text-[#f3cf65] shadow-sm border border-[#d4af37]/40 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Reading List (Saved bookmarks)"
          >
            <Bookmark className={`h-3.5 w-3.5 ${readingList.length > 0 ? 'fill-[#d4af37] text-[#d4af37]' : ''}`} />
            <span className="hidden sm:inline">Saved</span>
            <span className="sm:hidden">List</span>
            {readingList.length > 0 && (
              <span className="rounded-full bg-[#d4af37]/30 px-1.5 py-0.2 font-mono text-[10px] text-[#fef08a] font-bold">
                {readingList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'reading_list' ? (
        <ReadingListView
          items={readingList}
          onNavigateToBookmark={(item) => {
            if (onNavigateToBookmark) onNavigateToBookmark(item);
            if (window.innerWidth < 768) onClose();
          }}
          onRemoveFromReadingList={(msgId) => {
            if (onRemoveFromReadingList) onRemoveFromReadingList(msgId);
          }}
        />
      ) : activeTab === 'history' ? (
        <ReadingHistoryView
          history={readingHistory}
          conversations={conversations}
          activeId={activeId}
          onSelectConversation={(id) => {
            onSelectConversation(id);
            if (window.innerWidth < 768) onClose();
          }}
          onRemoveFromHistory={(convId) => {
            if (onRemoveFromReadingHistory) onRemoveFromReadingHistory(convId);
          }}
          onClearHistory={() => {
            if (onClearReadingHistory) onClearReadingHistory();
          }}
          onSwitchToInquiries={() => handleTabChange('inquiries')}
        />
      ) : (
        <>
          {/* New Inquiry Action */}
          <div className="p-3">
        <button
          onClick={() => {
            onNewChat();
            if (window.innerWidth < 768) onClose();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 py-2.5 text-xs font-medium text-[#e5b974] transition-all hover:bg-[#d4af37]/20 hover:shadow-lg"
          title="Start fresh inquiry (Ctrl+K)"
        >
          <Plus className="h-4 w-4" />
          <span>Initiate Inquiry</span>
        </button>
      </div>

      {/* Search Bar - Searches titles and message content */}
      <div className="px-3 pb-2">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles & messages..."
            className="w-full rounded-lg border border-white/10 bg-[#12151c] py-1.5 pl-8 pr-8 text-xs text-neutral-200 placeholder:text-neutral-500 focus:border-[#d4af37]/50 focus:bg-[#161a24] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-neutral-500 hover:text-white transition-colors"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {searchQuery.trim() && (
          <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] font-mono text-[#d4af37]">
            <span>Filtered results</span>
            <span>{searchResults.length} match{searchResults.length === 1 ? '' : 'es'}</span>
          </div>
        )}
      </div>

      {/* Category Tag Filter Bar */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setSelectedTagFilter(null)}
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-mono transition-all ${
              selectedTagFilter === null
                ? 'bg-[#d4af37]/20 text-[#f3cf65] border border-[#d4af37]/40 font-semibold'
                : 'bg-white/5 text-neutral-400 border border-white/5 hover:text-neutral-200'
            }`}
          >
            All ({conversations.length})
          </button>
          {allTagsWithCounts.map(({ tag, count }) => {
            const isSelected = selectedTagFilter === tag;
            const style = getTagStyle(tag);
            return (
              <button
                key={tag}
                onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono transition-all border"
                style={{
                  color: isSelected ? style.color : 'inherit',
                  backgroundColor: isSelected ? style.bgColor : 'rgba(255, 255, 255, 0.03)',
                  borderColor: isSelected ? style.borderColor : 'rgba(255, 255, 255, 0.08)',
                }}
              >
                <span>{tag}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {/* Pinned Section */}
        {pinnedItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              <span className="flex items-center gap-1">
                <Pin className="h-2.5 w-2.5 text-[#d4af37]" />
                Pinned
              </span>
              <span>{pinnedItems.length}</span>
            </div>
            <div className="space-y-1">
              {pinnedItems.map(({ conv, matchedSnippet }) => (
                <ConversationRow
                  key={conv.id}
                  conv={conv}
                  matchedSnippet={matchedSnippet}
                  isActive={activeId === conv.id}
                  isEditing={editingId === conv.id}
                  editTitle={editTitle}
                  setEditTitle={setEditTitle}
                  isDeleting={deletingId === conv.id}
                  setDeletingId={setDeletingId}
                  isSummarizing={summarizingId === conv.id}
                  onSelect={() => {
                    onSelectConversation(conv.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  onTogglePin={() => onTogglePin(conv.id)}
                  onStartRename={() => startRename(conv)}
                  onSubmitRename={() => submitRename(conv.id)}
                  onCancelRename={() => setEditingId(null)}
                  onConfirmDelete={() => confirmDelete(conv.id)}
                  onAutoSummarize={onAutoSummarize}
                  onUpdateTags={onUpdateTags}
                  onFilterByTag={(tag) => setSelectedTagFilter(tag)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Section */}
        <div>
          <div className="flex items-center justify-between px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
            <span>Recent Sessions</span>
            {recentItems.length > 0 && <span>{recentItems.length}</span>}
          </div>
          {recentItems.length === 0 && pinnedItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500 space-y-1">
              <p>No conversations found</p>
              {(searchQuery || selectedTagFilter) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTagFilter(null);
                  }}
                  className="text-[11px] text-[#d4af37] underline hover:text-[#f3e7cb]"
                >
                  Clear search & tag filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {recentItems.map(({ conv, matchedSnippet }) => (
                <ConversationRow
                  key={conv.id}
                  conv={conv}
                  matchedSnippet={matchedSnippet}
                  isActive={activeId === conv.id}
                  isEditing={editingId === conv.id}
                  editTitle={editTitle}
                  setEditTitle={setEditTitle}
                  isDeleting={deletingId === conv.id}
                  setDeletingId={setDeletingId}
                  isSummarizing={summarizingId === conv.id}
                  onSelect={() => {
                    onSelectConversation(conv.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  onTogglePin={() => onTogglePin(conv.id)}
                  onStartRename={() => startRename(conv)}
                  onSubmitRename={() => submitRename(conv.id)}
                  onCancelRename={() => setEditingId(null)}
                  onConfirmDelete={() => confirmDelete(conv.id)}
                  onAutoSummarize={onAutoSummarize}
                  onUpdateTags={onUpdateTags}
                  onFilterByTag={(tag) => setSelectedTagFilter(tag)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )}

  {/* User Account Status in Sidebar */}
  {user ? (
    <div className="border-t border-white/10 bg-[#0c0f16] p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d4af37] text-xs font-bold text-black font-mono shadow-sm shrink-0">
            {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-white truncate max-w-[125px]">{user.name}</div>
            <div className="text-[10px] font-mono text-[#d4af37]">{user.role || `${user.tier || 'Scholar'} Tier`}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="rounded p-1.5 text-neutral-400 hover:text-red-400 hover:bg-white/5 transition-colors"
          title="Sign Out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 pt-1 border-t border-white/5 text-[10px] font-mono text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Firebase Cloud Sync Active</span>
      </div>
    </div>
  ) : (
    <div className="border-t border-white/10 bg-[#0b0e14] p-3">
      <button
        onClick={onOpenAuth}
        className="w-full flex items-center justify-between rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-2.5 py-1.5 text-xs text-[#f3cf65] hover:bg-[#d4af37]/20 transition-all font-mono shadow-sm"
      >
        <span className="flex items-center gap-1.5">
          <UserIcon className="h-3.5 w-3.5 text-[#d4af37]" />
          <span>Sign In / Log In</span>
        </span>
        <LogIn className="h-3 w-3 text-[#d4af37]" />
      </button>
    </div>
  )}

  {/* Footer System Status */}
  <div className="border-t border-white/10 bg-[#07080b] p-3 text-xs">
    <div className="mb-2.5">
      <PWAInstallButton variant="sidebar" />
    </div>
    <div className="flex items-center gap-2 text-neutral-400">
      <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="font-mono text-[11px]">Berno Reasoning Engine</span>
    </div>
    <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-neutral-500">
      {activeTab === 'reading_list' ? (
        <>
          <span>{readingList.length} Pinned Insights</span>
          <span className="text-[#d4af37]">Reading List</span>
        </>
      ) : (
        <>
          <span>{conversations.length} Saved Inquiries</span>
          <span>Indexed & Searchable</span>
        </>
      )}
    </div>
  </div>
    </aside>
  );
}

function ConversationRow({
  conv,
  matchedSnippet,
  isActive,
  isEditing,
  editTitle,
  setEditTitle,
  isDeleting,
  setDeletingId,
  isSummarizing,
  onSelect,
  onTogglePin,
  onStartRename,
  onSubmitRename,
  onCancelRename,
  onConfirmDelete,
  onAutoSummarize,
  onUpdateTags,
  onFilterByTag,
}: {
  conv: Conversation;
  matchedSnippet: string | null;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (val: string) => void;
  isDeleting: boolean;
  setDeletingId: (id: string | null) => void;
  isSummarizing: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onStartRename: () => void;
  onSubmitRename: () => void;
  onCancelRename: () => void;
  onConfirmDelete: () => void;
  onAutoSummarize?: (id: string) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onFilterByTag?: (tag: string) => void;
}) {
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const hasTags = conv.tags && conv.tags.length > 0;

  return (
    <div
      className={`group relative flex flex-col rounded-lg px-2.5 py-2 text-xs transition-all ${
        isActive
          ? 'bg-[#151922] text-white font-medium border border-white/15 shadow-sm'
          : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200 border border-transparent'
      }`}
    >
      {/* Editing Title Mode */}
      {isEditing ? (
        <div className="flex w-full items-center gap-1.5 py-0.5">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmitRename();
              if (e.key === 'Escape') onCancelRename();
            }}
            autoFocus
            className="w-full rounded bg-black/60 px-2 py-1 text-xs text-white border border-[#d4af37] focus:outline-none"
            placeholder="Conversation title"
          />
          <button
            onClick={onSubmitRename}
            className="rounded p-1 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
            title="Save title"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onCancelRename}
            className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
            title="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : isDeleting ? (
        /* Delete Confirmation Inline */
        <div className="flex w-full items-center justify-between gap-1 py-0.5 animate-in fade-in duration-100">
          <span className="text-[11px] text-red-400 font-mono">Delete chat?</span>
          <div className="flex items-center gap-1">
            <button
              onClick={onConfirmDelete}
              className="rounded bg-red-500/20 px-2 py-0.5 text-[11px] font-medium text-red-300 border border-red-500/40 hover:bg-red-500/30"
              title="Confirm Delete"
            >
              Delete
            </button>
            <button
              onClick={() => setDeletingId(null)}
              className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-neutral-300 hover:bg-white/10 hover:text-white"
              title="Cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Standard Conversation Item */
        <div className="flex w-full items-center justify-between">
          <button
            onClick={onSelect}
            className="flex flex-1 items-center gap-2 truncate text-left"
            title={conv.title}
          >
            <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#d4af37]' : 'text-neutral-500'}`} />
            <span className="truncate">{conv.title || 'Untitled Inquiry'}</span>
            {conv.titleSummarized && (
              <span
                className="ml-auto mr-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af37]/60 group-hover:hidden"
                title="Summarized title active"
              />
            )}
          </button>

          {/* Quick Action Buttons: Summarize, Tag, Pin, Edit Title, Delete Chat */}
          <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {onAutoSummarize && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAutoSummarize(conv.id);
                }}
                disabled={isSummarizing}
                title={
                  conv.titleSummarized
                    ? 'Regenerate 3-word title'
                    : 'Generate 3-word title'
                }
                className="rounded p-1 text-neutral-400 hover:text-[#d4af37] transition-colors disabled:opacity-50"
              >
                <Sparkles
                  className={`h-3 w-3 ${
                    isSummarizing ? 'animate-spin text-[#d4af37]' : ''
                  }`}
                />
              </button>
            )}

            {/* Tag Picker Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsTagPickerOpen(!isTagPickerOpen);
              }}
              title="Add or edit tags"
              className={`rounded p-1 transition-colors ${
                hasTags ? 'text-[#d4af37]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <TagIcon className="h-3 w-3" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              title={conv.pinned ? 'Unpin' : 'Pin to top'}
              className="rounded p-1 text-neutral-400 hover:text-[#d4af37] transition-colors"
            >
              <Pin className={`h-3 w-3 ${conv.pinned ? 'fill-[#d4af37] text-[#d4af37]' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartRename();
              }}
              title="Edit chat title"
              className="rounded p-1 text-neutral-400 hover:text-white transition-colors"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(conv.id);
              }}
              title="Delete chat"
              className="rounded p-1 text-neutral-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Visual Tags Display on Conversation Item */}
      {hasTags && !isEditing && !isDeleting && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {conv.tags!.map((t) => {
            const style = getTagStyle(t);
            return (
              <span
                key={t}
                onClick={(e) => {
                  e.stopPropagation();
                  onFilterByTag?.(t);
                }}
                className="cursor-pointer rounded px-1.5 py-0.2 font-mono text-[10px] transition-all hover:scale-105"
                style={{
                  color: style.color,
                  backgroundColor: style.bgColor,
                  border: `1px solid ${style.borderColor}`,
                }}
                title={`Filter conversations by ${t}`}
              >
                {t}
              </span>
            );
          })}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsTagPickerOpen(true);
            }}
            className="rounded p-0.5 text-[10px] text-neutral-500 hover:text-neutral-300"
            title="Edit tags"
          >
            +
          </button>
        </div>
      )}

      {/* Tag Picker Popover */}
      {isTagPickerOpen && onUpdateTags && (
        <TagPicker
          currentTags={conv.tags || []}
          onUpdateTags={(newTags) => onUpdateTags(conv.id, newTags)}
          onClose={() => setIsTagPickerOpen(false)}
        />
      )}

      {/* Matching snippet preview when search matches message body */}
      {matchedSnippet && (
        <div className="mt-1 flex items-start gap-1 rounded bg-black/40 px-2 py-1 text-[11px] font-mono text-neutral-400 border border-white/5">
          <FileText className="h-3 w-3 shrink-0 text-[#d4af37] mt-0.5" />
          <span className="truncate italic">{matchedSnippet}</span>
        </div>
      )}
    </div>
  );
}
