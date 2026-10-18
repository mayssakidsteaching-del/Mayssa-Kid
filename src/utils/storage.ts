import { Conversation, ThinkingMode, ReadingListItem, ReadingHistoryItem } from '../types';

const CONVERSATIONS_KEY = 'berno_conversations_v1';
const ACTIVE_CONV_KEY = 'berno_active_conv_v1';
const THINKING_MODE_KEY = 'berno_selected_mode_v1';
const READING_LIST_KEY = 'berno_reading_list_v1';
const READING_HISTORY_KEY = 'berno_reading_history_v1';

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load conversations from storage', e);
    return [];
  }
}

export function saveConversations(convs: Conversation[]): boolean {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
    return true;
  } catch (e: any) {
    console.warn('Initial save failed, attempting sanitized save:', e?.message);
    try {
      // If storage is full, sanitize by pruning large rawContent and keeping clean content
      const sanitized = convs.map((c) => ({
        ...c,
        messages: c.messages.map((m) => ({
          ...m,
          rawContent: undefined, // free up raw unparsed buffers
        })),
      }));
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(sanitized));
      return true;
    } catch (fallbackError) {
      console.error('Critical storage quota exceeded:', fallbackError);
      return false;
    }
  }
}

export function exportConversationAsJson(conv: Conversation): void {
  try {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(conv, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const filename = `berno-${(conv.title || 'chat').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error('Failed to export conversation as JSON:', err);
  }
}

export function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CONV_KEY);
  } catch {
    return null;
  }
}

export function saveActiveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_CONV_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_CONV_KEY);
    }
  } catch (e) {
    console.error(e);
  }
}

export function loadSavedMode(): ThinkingMode {
  try {
    const mode = localStorage.getItem(THINKING_MODE_KEY);
    if (
      mode === 'deep_reasoning' ||
      mode === 'executive_synthesis' ||
      mode === 'architectural_code' ||
      mode === 'counter_perspective'
    ) {
      return mode;
    }
  } catch {}
  return 'deep_reasoning';
}

export function saveSelectedMode(mode: ThinkingMode): void {
  try {
    localStorage.setItem(THINKING_MODE_KEY, mode);
  } catch {}
}

export function loadReadingList(): ReadingListItem[] {
  try {
    const raw = localStorage.getItem(READING_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load reading list from storage', e);
    return [];
  }
}

export function saveReadingList(list: ReadingListItem[]): void {
  try {
    localStorage.setItem(READING_LIST_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save reading list', e);
  }
}

export function loadReadingHistory(): ReadingHistoryItem[] {
  try {
    const raw = localStorage.getItem(READING_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load reading history from storage', e);
    return [];
  }
}

export function saveReadingHistory(history: ReadingHistoryItem[]): void {
  try {
    localStorage.setItem(READING_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save reading history', e);
  }
}

export function recordConversationView(convId: string): ReadingHistoryItem[] {
  if (!convId) return loadReadingHistory();
  try {
    const current = loadReadingHistory();
    // Filter out previous occurrences of this conversation to move it to the top
    const filtered = current.filter((item) => item.conversationId !== convId);
    const updated: ReadingHistoryItem[] = [
      {
        id: `rh-${Date.now()}-${convId.slice(-6)}`,
        conversationId: convId,
        viewedAt: Date.now(),
      },
      ...filtered,
    ].slice(0, 100);
    saveReadingHistory(updated);
    return updated;
  } catch (e) {
    console.error('Failed to record conversation view', e);
    return [];
  }
}

export function clearReadingHistory(): void {
  try {
    localStorage.removeItem(READING_HISTORY_KEY);
  } catch {}
}

