import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Conversation,
  Message,
  ThinkingMode,
  ChatbotRole,
  ReadingListItem,
  ReadingHistoryItem,
  GroundingSource,
  User,
  FontWeightVariant,
  WebsitePluginTheme,
} from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MessageItem } from './components/MessageItem';
import { ChatInput } from './components/ChatInput';
import { EmptyState } from './components/EmptyState';
import { AboutModal } from './components/AboutModal';
import { AuthModal } from './components/AuthModal';
import { PluginsModal } from './components/PluginsModal';
import { ConversationProgressBar } from './components/ConversationProgressBar';
import { VoiceConversationModal } from './components/VoiceConversationModal';
import { VeoVideoStudioModal, StudioTab } from './components/VeoVideoStudioModal';
import { ReaderDashboardModal } from './components/ReaderDashboardModal';
import { CreativeStudioPickerModal } from './components/CreativeStudioPickerModal';
import { SoftKeyboardOverlay } from './components/SoftKeyboardOverlay';
import { TableOfContents } from './components/TableOfContents';
import {
  subscribeToAuthState,
  saveConversationToCloud,
  loadConversationsFromCloud,
  deleteConversationFromCloud,
  saveUserSettingsToCloud,
  loadUserSettingsFromCloud,
  logOut,
  testConnection,
} from './lib/firebase';
import {
  loadConversations,
  saveConversations,
  loadActiveConversationId,
  saveActiveConversationId,
  loadSavedMode,
  saveSelectedMode,
  exportConversationAsJson,
  loadReadingList,
  saveReadingList,
  loadReadingHistory,
  saveReadingHistory,
  recordConversationView,
  clearReadingHistory,
} from './utils/storage';
import { calculateReadingTime, calculateWordCount } from './utils/readingTime';
import { exportConversationToPdf } from './utils/pdfExport';
import { fetchSessionExecutiveSummary } from './utils/executiveSummary';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useReadAloud } from './hooks/useReadAloud';
import { parseRawMessage } from './utils/parser';
import { generateThreeWordSummary } from './utils/titleSummarizer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { streamOfflineResponse } from './utils/offlineAI';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadConversations()
  );
  const [activeId, setActiveId] = useState<string | null>(() =>
    loadActiveConversationId()
  );
  const [selectedMode, setSelectedMode] = useState<ThinkingMode>(() =>
    loadSavedMode()
  );
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [chatbotRole, setChatbotRole] = useState<ChatbotRole>('epistemic_architect');
  const [researchMode, setResearchMode] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isVeoModalOpen, setIsVeoModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingMarkdown, setIsExportingMarkdown] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Authenticated Scholar User state
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('berno_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [readingList, setReadingList] = useState<ReadingListItem[]>(() => loadReadingList());
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>(() => loadReadingHistory());
  const [activeSidebarTab, setActiveSidebarTab] = useState<'inquiries' | 'reading_list' | 'history'>('inquiries');
  const [readabilityMode, setReadabilityMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('berno_readability_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Focus Session timer & Reader Dashboard state
  const [isReaderDashboardOpen, setIsReaderDashboardOpen] = useState(false);
  const [focusActiveSeconds, setFocusActiveSeconds] = useState(0);
  const [isFocusActive, setIsFocusActive] = useState(true);
  const [isFocusPaused, setIsFocusPaused] = useState(false);
  const [isIdlePaused, setIsIdlePaused] = useState(false);
  const [dailyReadingMinutes, setDailyReadingMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('berno_daily_reading_mins');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('berno_daily_goal_mins');
      return saved ? parseInt(saved, 10) || 30 : 30;
    } catch {
      return 30;
    }
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('berno_readability_font_size');
      return saved ? parseInt(saved, 10) || 18 : 18;
    } catch {
      return 18;
    }
  });

  // Editorial Serif Font Weight Variant ('light' | 'normal' | 'bold')
  const [fontWeight, setFontWeight] = useState<FontWeightVariant>(() => {
    try {
      const saved = localStorage.getItem('berno_readability_font_weight');
      return (saved as FontWeightVariant) || 'normal';
    } catch {
      return 'normal';
    }
  });

  // Website Style Plugins state
  const [activePlugin, setActivePlugin] = useState<WebsitePluginTheme | null>(() => {
    try {
      const saved = localStorage.getItem('berno_active_plugin');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isPluginsModalOpen, setIsPluginsModalOpen] = useState(false);

  const [isSoftKeyboardOpen, setIsSoftKeyboardOpen] = useState(false);
  const [isTableOfContentsOpen, setIsTableOfContentsOpen] = useState(false);
  const [isFocusZen, setIsFocusZen] = useState(false);

  // Creative Studio Picker Modal state (3 generative options)
  const [isStudioPickerOpen, setIsStudioPickerOpen] = useState(false);
  const [studioInitialTab, setStudioInitialTab] = useState<StudioTab>('create_image');

  const readAloud = useReadAloud();

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check Firebase connection on initial boot
  useEffect(() => {
    testConnection();
  }, []);

  // Subscribe to real Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (authenticatedUser) => {
      if (authenticatedUser) {
        setUser(authenticatedUser);
        try {
          localStorage.setItem('berno_auth_user', JSON.stringify(authenticatedUser));
        } catch {}

        // Hydrate cloud conversations
        try {
          const cloudConvs = await loadConversationsFromCloud(authenticatedUser.id);
          if (cloudConvs && cloudConvs.length > 0) {
            setConversations((localConvs) => {
              const localMap = new Map(localConvs.map((c) => [c.id, c]));
              for (const c of cloudConvs) {
                const existing = localMap.get(c.id);
                if (!existing || (c.updatedAt && c.updatedAt > (existing.updatedAt || 0))) {
                  localMap.set(c.id, c);
                }
              }
              return Array.from(localMap.values());
            });
          }
        } catch (e) {
          console.warn('Could not sync cloud conversations:', e);
        }

        // Hydrate cloud settings
        try {
          const cloudSettings = await loadUserSettingsFromCloud(authenticatedUser.id);
          if (cloudSettings) {
            if (cloudSettings.fontSize) setFontSize(cloudSettings.fontSize);
            if (cloudSettings.fontWeight) setFontWeight(cloudSettings.fontWeight);
            if (cloudSettings.dailyGoalMinutes) setDailyGoalMinutes(cloudSettings.dailyGoalMinutes);
            if (cloudSettings.activePlugin !== undefined) setActivePlugin(cloudSettings.activePlugin);
          }
        } catch (e) {
          console.warn('Could not sync cloud settings:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync state to local storage and Firebase Cloud if authenticated
  useEffect(() => {
    saveConversations(conversations);
    if (user && activeId) {
      const activeConv = conversations.find((c) => c.id === activeId);
      if (activeConv) {
        saveConversationToCloud(user.id, activeConv);
      }
    }
  }, [conversations, user, activeId]);

  useEffect(() => {
    saveReadingList(readingList);
  }, [readingList]);

  useEffect(() => {
    saveActiveConversationId(activeId);
  }, [activeId]);

  useEffect(() => {
    saveSelectedMode(selectedMode);
  }, [selectedMode]);

  // Sync font weight preference
  useEffect(() => {
    try {
      localStorage.setItem('berno_readability_font_weight', fontWeight);
    } catch {}
    if (user) {
      saveUserSettingsToCloud(user.id, { fontWeight });
    }
  }, [fontWeight, user]);

  // Sync website style plugin preference
  useEffect(() => {
    try {
      if (activePlugin) {
        localStorage.setItem('berno_active_plugin', JSON.stringify(activePlugin));
      } else {
        localStorage.removeItem('berno_active_plugin');
      }
    } catch {}
    if (user) {
      saveUserSettingsToCloud(user.id, { activePlugin });
    }
  }, [activePlugin, user]);

  // Focus Session active engagement listener: auto-pauses when scrolling away, idle (>10s), or tab blurred
  useEffect(() => {
    if (!readabilityMode) return;

    let idleTimeout: NodeJS.Timeout | null = null;
    const IDLE_THRESHOLD_MS = 10000; // 10s of inactivity pauses the focus session timer

    const handleUserActivity = () => {
      setIsIdlePaused(false);
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        setIsIdlePaused(true);
      }, IDLE_THRESHOLD_MS);
    };

    // Initialize idle timer
    idleTimeout = setTimeout(() => {
      setIsIdlePaused(true);
    }, IDLE_THRESHOLD_MS);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsIdlePaused(true);
      } else {
        handleUserActivity();
      }
    };

    const handleBlur = () => {
      setIsIdlePaused(true);
    };

    const handleFocus = () => {
      handleUserActivity();
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleUserActivity, { passive: true });
    }
    window.addEventListener('scroll', handleUserActivity, { passive: true });
    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('mousedown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (idleTimeout) clearTimeout(idleTimeout);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleUserActivity);
      }
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [readabilityMode]);

  // Focus Session Timer ticker (increments active seconds when active, reading, not paused, not idle)
  useEffect(() => {
    if (!readabilityMode || !isFocusActive || isFocusPaused || isIdlePaused) {
      return;
    }

    const timer = setInterval(() => {
      setFocusActiveSeconds((prev) => {
        const next = prev + 1;
        if (next > 0 && next % 60 === 0) {
          setDailyReadingMinutes((dailyPrev) => {
            const updated = dailyPrev + 1;
            try {
              localStorage.setItem('berno_daily_reading_mins', String(updated));
            } catch {}
            return updated;
          });
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [readabilityMode, isFocusActive, isFocusPaused, isIdlePaused]);

  // Current active conversation
  const currentConversation = conversations.find((c) => c.id === activeId) || null;
  const messages = currentConversation ? currentConversation.messages : [];

  // Toggle bookmark / Read Later status for a message
  const handleToggleBookmark = (message: Message) => {
    const isBookmarked = readingList.some((item) => item.messageId === message.id);
    if (isBookmarked) {
      const updated = readingList.filter((item) => item.messageId !== message.id);
      setReadingList(updated);
      saveReadingList(updated);
      setToastMessage('Removed from Reading List');
      setTimeout(() => setToastMessage(null), 2500);
    } else {
      const activeConv = conversations.find((c) => c.id === activeId);
      const rawText = message.content || message.rawContent || '';
      const clean = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
      const snippet = clean.length > 220 ? clean.slice(0, 217) + '...' : clean;
      const wordCount = calculateWordCount(clean);
      const readingTime = calculateReadingTime(clean, 250);

      const newItem: ReadingListItem = {
        id: `bm-${Date.now()}-${message.id.slice(-6)}`,
        messageId: message.id,
        conversationId: activeId || '',
        conversationTitle: activeConv?.title || 'Editorial Inquiry',
        role: message.role,
        snippet: snippet || 'Editorial Insight',
        fullContent: message.content,
        timestamp: message.timestamp,
        bookmarkedAt: Date.now(),
        wordCount,
        readingTimeDisplay: readingTime.display,
        mode: message.mode || activeConv?.mode,
        chatbotRole: message.chatbotRole || activeConv?.chatbotRole,
      };

      const updated = [newItem, ...readingList];
      setReadingList(updated);
      saveReadingList(updated);
      setToastMessage('Pinned to Reading List');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleRemoveFromReadingList = (messageId: string) => {
    const updated = readingList.filter((item) => item.messageId !== messageId);
    setReadingList(updated);
    saveReadingList(updated);
    setToastMessage('Removed from Reading List');
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleNavigateToBookmark = (item: ReadingListItem) => {
    if (activeId !== item.conversationId) {
      setActiveId(item.conversationId);
      saveActiveConversationId(item.conversationId);
    }

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }

    // Scroll to the message element and pulse it
    const delay = activeId !== item.conversationId ? 260 : 60;
    setTimeout(() => {
      const targetEl = document.getElementById(`message-card-${item.messageId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.remove('reading-list-highlight');
        // Trigger reflow for animation restart
        void targetEl.offsetWidth;
        targetEl.classList.add('reading-list-highlight');
        setTimeout(() => {
          targetEl.classList.remove('reading-list-highlight');
        }, 2800);
      }
    }, delay);
  };

  const handleOpenReadingList = () => {
    setActiveSidebarTab('reading_list');
    setIsSidebarOpen(true);
  };

  // Track recently viewed conversation in Reading History whenever activeId changes
  useEffect(() => {
    if (activeId) {
      const updated = recordConversationView(activeId);
      setReadingHistory(updated);
    }
  }, [activeId]);

  const handleRemoveFromReadingHistory = (convId: string) => {
    const updated = readingHistory.filter((item) => item.conversationId !== convId);
    setReadingHistory(updated);
    saveReadingHistory(updated);
    showToast('Removed from reading history.');
  };

  const handleClearReadingHistory = () => {
    clearReadingHistory();
    setReadingHistory([]);
    showToast('Reading history cleared.');
  };

  // Responsive sidebar initial state
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Smooth autoscroll on new message or stream chunk
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length]);

  const handleSelectMode = (mode: ThinkingMode) => {
    setSelectedMode(mode);
    if (activeId) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, mode } : c))
      );
    }
  };

  const createNewConversation = (
    firstMessageText: string,
    mode: ThinkingMode
  ): Conversation => {
    const title =
      firstMessageText.length > 36
        ? firstMessageText.substring(0, 36).trim() + '...'
        : firstMessageText;

    const newConv: Conversation = {
      id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      mode,
    };

    return newConv;
  };

  const handleSend = async (
    text: string,
    mode: ThinkingMode = selectedMode,
    attachedImage?: string
  ) => {
    if ((!text.trim() && !attachedImage) || isStreaming) return;

    let targetConv = currentConversation;
    let newConversations = [...conversations];

    const isFirstExchange = targetConv ? targetConv.messages.length === 0 : true;

    if (!targetConv) {
      targetConv = createNewConversation(text || 'Visual Inquiry', mode);
      newConversations = [targetConv, ...newConversations];
      setActiveId(targetConv.id);
    }

    const userMessage: Message = {
      id: 'msg_' + Date.now() + '_user',
      role: 'user',
      content: text,
      timestamp: Date.now(),
      mode,
      model: selectedModel,
      researchMode,
      attachedImage,
    };

    const assistantPlaceholderId = 'msg_' + (Date.now() + 1) + '_assistant';
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      rawContent: '',
      thinkingContent: '',
      timestamp: Date.now() + 1,
      mode,
      model: selectedModel,
      isStreaming: true,
      researchMode,
      groundingSources: [],
      searchQueries: [],
    };

    const updatedMessages = [...targetConv.messages, userMessage, assistantMessage];

    // Update conversation in state
    setConversations(
      newConversations.map((c) =>
        c.id === targetConv!.id
          ? { ...c, messages: updatedMessages, updatedAt: Date.now() }
          : c
      )
    );

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    const runOfflineEngine = async () => {
      let accumulatedRaw = '';
      try {
        const stream = streamOfflineResponse(
          text,
          updatedMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          mode,
          chatbotRole
        );

        for await (const chunk of stream) {
          if (abortControllerRef.current?.signal.aborted) break;
          accumulatedRaw += chunk;
          const parsed = parseRawMessage(accumulatedRaw);
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== targetConv!.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantPlaceholderId
                    ? {
                        ...m,
                        rawContent: accumulatedRaw,
                        thinkingContent: parsed.thinking,
                        content: parsed.response || '',
                        provider: 'offline',
                        providerNotice: 'Berno Offline Cognitive Reserve',
                        error: undefined,
                      }
                    : m
                ),
              };
            })
          );
          scrollToBottom('auto');
        }

        const finalParsed = parseRawMessage(accumulatedRaw);
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== targetConv!.id) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantPlaceholderId
                  ? {
                      ...m,
                      isStreaming: false,
                      rawContent: accumulatedRaw,
                      thinkingContent: finalParsed.thinking,
                      content: finalParsed.response || accumulatedRaw,
                      provider: 'offline',
                      providerNotice: 'Berno Offline Cognitive Reserve',
                    }
                  : m
              ),
            };
          })
        );
      } catch (offlineErr) {
        console.error('Offline execution error:', offlineErr);
      }
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await runOfflineEngine();
      setIsStreaming(false);
      abortControllerRef.current = null;
      return;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
            attachedImage: m.attachedImage,
          })),
          mode,
          model: selectedModel,
          chatbotRole,
          researchMode,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server status ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Readable stream not supported in this browser.');
      }

      const decoder = new TextDecoder('utf-8');
      let accumulatedRaw = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.grounding) {
                setConversations((prev) =>
                  prev.map((c) => {
                    if (c.id !== targetConv!.id) return c;
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantPlaceholderId
                          ? {
                              ...m,
                              groundingSources: parsed.grounding.sources || [],
                              searchQueries: parsed.grounding.queries || [],
                            }
                          : m
                      ),
                    };
                  })
                );
              } else if (parsed.provider) {
                setConversations((prev) =>
                  prev.map((c) => {
                    if (c.id !== targetConv!.id) return c;
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantPlaceholderId
                          ? {
                              ...m,
                              provider: parsed.provider,
                              providerNotice: parsed.notice || m.providerNotice,
                              error: undefined,
                            }
                          : m
                      ),
                    };
                  })
                );
              } else if (parsed.error) {
                // Attach error to assistant message
                setConversations((prev) =>
                  prev.map((c) => {
                    if (c.id !== targetConv!.id) return c;
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantPlaceholderId
                          ? { ...m, error: parsed.error, isStreaming: false }
                          : m
                      ),
                    };
                  })
                );
              } else if (parsed.content) {
                accumulatedRaw += parsed.content;
                const { thinking, response } = parseRawMessage(accumulatedRaw);

                setConversations((prev) =>
                  prev.map((c) => {
                    if (c.id !== targetConv!.id) return c;
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantPlaceholderId
                          ? {
                              ...m,
                              rawContent: accumulatedRaw,
                              thinkingContent: thinking,
                              content: response || '',
                              error: undefined,
                            }
                          : m
                      ),
                    };
                  })
                );
                scrollToBottom('auto');
              }
            } catch (jsonErr) {
              // Ignore partial JSON lines
            }
          }
        }
      }

      // Finalize message once stream completes
      const finalParsed = parseRawMessage(accumulatedRaw);
      const finalContent = finalParsed.response || accumulatedRaw;

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetConv!.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantPlaceholderId
                ? {
                    ...m,
                    isStreaming: false,
                    rawContent: accumulatedRaw,
                    thinkingContent: finalParsed.thinking,
                    content: finalContent,
                  }
                : m
            ),
          };
        })
      );

      // Automatic background utility: generate concise 3-word summary for conversation title after first exchange
      if (
        (isFirstExchange || !targetConv.titleSummarized) &&
        finalContent.trim().length > 0
      ) {
        const convId = targetConv.id;
        const promptText = text;
        const assistantText = finalContent;

        setSummarizingId(convId);
        generateThreeWordSummary(promptText, assistantText)
          .then((conciseTitle) => {
            if (conciseTitle) {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === convId
                    ? {
                        ...c,
                        title: conciseTitle,
                        titleSummarized: true,
                        updatedAt: Date.now(),
                      }
                    : c
                )
              );
            }
          })
          .catch((e) => {
            console.warn('Background title summary error:', e);
          })
          .finally(() => {
            setSummarizingId((curr) => (curr === convId ? null : curr));
          });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        const isOfflineError =
          (typeof navigator !== 'undefined' && !navigator.onLine) ||
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('NetworkError') ||
          err.message?.includes('net::ERR_') ||
          err.name === 'TypeError';

        if (isOfflineError) {
          console.warn('Network unavailable, engaging Berno offline cognitive engine...');
          await runOfflineEngine();
        } else {
          console.error('Fetch stream error:', err);
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== targetConv!.id) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantPlaceholderId
                    ? {
                        ...m,
                        isStreaming: false,
                        error:
                          err.message || 'An unexpected connection error occurred.',
                      }
                    : m
                ),
              };
            })
          );
        }
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleNewChat = () => {
    handleStop();
    readAloud.stop();
    setActiveId(null);
  };

  const handleDeleteConversation = (id: string) => {
    if (activeId === id) {
      readAloud.stop();
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
    }
    if (user) {
      deleteConversationFromCloud(user.id, id);
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, title: newTitle, titleSummarized: true, updatedAt: Date.now() }
          : c
      )
    );
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!currentConversation) return;
    if (readAloud.activeTextId === messageId) {
      readAloud.stop();
    }
    const updatedMessages = currentConversation.messages.filter((m) => m.id !== messageId);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversation.id
          ? { ...c, messages: updatedMessages, updatedAt: Date.now() }
          : c
      )
    );
    showToast('Message deleted.');
  };

  const handleAutoSummarize = async (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv || conv.messages.length === 0) return;

    const firstUserMsg = conv.messages.find((m) => m.role === 'user');
    const firstAssistantMsg = conv.messages.find((m) => m.role === 'assistant');
    if (!firstUserMsg) return;

    setSummarizingId(convId);
    try {
      const summaryTitle = await generateThreeWordSummary(
        firstUserMsg.content,
        firstAssistantMsg?.content
      );
      if (summaryTitle) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  title: summaryTitle,
                  titleSummarized: true,
                  updatedAt: Date.now(),
                }
              : c
          )
        );
      }
    } catch (e) {
      console.warn('Manual auto-summary error:', e);
    } finally {
      setSummarizingId((curr) => (curr === convId ? null : curr));
    }
  };

  const handleTogglePin = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const handleUpdateTags = (convId: string, tags: string[]) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, tags, updatedAt: Date.now() }
          : c
      )
    );
  };

  const handleFork = (messageId: string) => {
    if (!currentConversation) return;
    const msgIndex = currentConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const forkedMessages = currentConversation.messages.slice(0, msgIndex + 1);
    const forkedConv: Conversation = {
      id: 'conv_' + Date.now() + '_fork',
      title: `${currentConversation.title} (Branch)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: forkedMessages,
      mode: currentConversation.mode,
    };

    setConversations((prev) => [forkedConv, ...prev]);
    setActiveId(forkedConv.id);
  };

  const handleRegenerate = (assistantMessageId: string) => {
    if (!currentConversation || isStreaming) return;
    const msgIndex = currentConversation.messages.findIndex(
      (m) => m.id === assistantMessageId
    );
    if (msgIndex === -1) return;

    // The user message before this assistant message
    const previousUserMsg = currentConversation.messages[msgIndex - 1];
    if (!previousUserMsg || previousUserMsg.role !== 'user') return;

    // Prune the conversation to remove this assistant message
    const trimmed = currentConversation.messages.slice(0, msgIndex - 1);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversation.id ? { ...c, messages: trimmed } : c
      )
    );

    // Re-dispatch inquiry
    handleSend(previousUserMsg.content, selectedMode);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3200);
  };

  const handleSaveChat = () => {
    const success = saveConversations(conversations);
    if (success) {
      showToast('Conversation saved to offline local storage.');
    } else {
      showToast('Storage quota full; pruned cache to preserve messages.');
    }
  };

  const handleLoginSuccess = async (authenticatedUser: User) => {
    setUser(authenticatedUser);
    try {
      localStorage.setItem('berno_auth_user', JSON.stringify(authenticatedUser));
    } catch {}
    showToast(`Welcome back, ${authenticatedUser.name}.`);

    // Sync cloud conversations and settings
    try {
      const cloudConvs = await loadConversationsFromCloud(authenticatedUser.id);
      if (cloudConvs && cloudConvs.length > 0) {
        setConversations((localConvs) => {
          const map = new Map(localConvs.map((c) => [c.id, c]));
          for (const c of cloudConvs) {
            const existing = map.get(c.id);
            if (!existing || (c.updatedAt && c.updatedAt > (existing.updatedAt || 0))) {
              map.set(c.id, c);
            }
          }
          return Array.from(map.values());
        });
      }
      const cloudSettings = await loadUserSettingsFromCloud(authenticatedUser.id);
      if (cloudSettings) {
        if (cloudSettings.fontSize) setFontSize(cloudSettings.fontSize);
        if (cloudSettings.fontWeight) setFontWeight(cloudSettings.fontWeight);
        if (cloudSettings.dailyGoalMinutes) setDailyGoalMinutes(cloudSettings.dailyGoalMinutes);
        if (cloudSettings.activePlugin !== undefined) setActivePlugin(cloudSettings.activePlugin);
      }
    } catch (e) {
      console.warn('Error syncing cloud data on login:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch {}
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    try {
      localStorage.removeItem('berno_auth_user');
      localStorage.removeItem('berno_auth_token');
    } catch {}
    setUser(null);
    showToast('Signed out of Berno.');
  };

  const handleExportMarkdown = async () => {
    if (!currentConversation || currentConversation.messages.length === 0) {
      showToast('No messages in active conversation to export.');
      return;
    }
    setIsExportingMarkdown(true);
    setExportProgress(15);
    const progressInterval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) return prev;
        const inc = Math.floor(Math.random() * 12) + 5;
        return Math.min(92, prev + inc);
      });
    }, 240);

    try {
      showToast('Synthesizing Session Executive Summary with AI...');
      const summary = await fetchSessionExecutiveSummary(currentConversation);
      setExportProgress(95);
      if (summary && !currentConversation.executiveSummary) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConversation.id ? { ...c, executiveSummary: summary } : c
          )
        );
      }
      handleExport(summary);
      setExportProgress(100);
      showToast('Markdown document with Executive Summary & References exported.');
    } catch (err: any) {
      console.error('Markdown export error:', err);
      handleExport();
      showToast('Markdown document exported.');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsExportingMarkdown(false);
        setExportProgress(0);
      }, 500);
    }
  };

  const handleExportJson = () => {
    if (!currentConversation || currentConversation.messages.length === 0) return;
    exportConversationAsJson(currentConversation);
    showToast('Structured JSON backup exported.');
  };

  const handleExportPdf = async () => {
    if (!currentConversation || currentConversation.messages.length === 0) {
      showToast('No messages in active conversation to export.');
      return;
    }
    setIsExportingPdf(true);
    setExportProgress(15);
    const progressInterval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) return prev;
        const inc = Math.floor(Math.random() * 12) + 5;
        return Math.min(92, prev + inc);
      });
    }, 260);

    try {
      showToast('Synthesizing Session Executive Summary with AI...');
      const summary = await fetchSessionExecutiveSummary(currentConversation);
      setExportProgress(88);
      if (summary && !currentConversation.executiveSummary) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConversation.id ? { ...c, executiveSummary: summary } : c
          )
        );
      }
      await exportConversationToPdf(currentConversation, {
        theme: 'editorial_dark',
        includeThinking: true,
        executiveSummary: summary,
      });
      setExportProgress(100);
      showToast('Editorial Berno PDF document with Executive Summary downloaded.');
    } catch (err: any) {
      console.error('PDF export error:', err);
      showToast('Error exporting PDF: ' + (err?.message || 'Check console'));
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsExportingPdf(false);
        setExportProgress(0);
      }, 500);
    }
  };

  const handleCloseAllModals = () => {
    setIsAboutModalOpen(false);
    setIsAuthModalOpen(false);
    setIsVoiceModalOpen(false);
    setIsVeoModalOpen(false);
    setIsStudioPickerOpen(false);
    setIsReaderDashboardOpen(false);
    setIsSoftKeyboardOpen(false);
    setIsTableOfContentsOpen(false);
    setIsFocusZen(false);
  };

  const handleNavigateToHeading = (_messageId: string, headingText: string) => {
    setIsTableOfContentsOpen(false);
    if (!scrollContainerRef.current) return;
    const headings = scrollContainerRef.current.querySelectorAll('h1, h2, h3, h4');
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      if (h.textContent?.toLowerCase().includes(headingText.toLowerCase())) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  };

  const handleShareEmail = () => {
    if (!currentConversation) return;
    const title = encodeURIComponent(`Berno Inquiry: ${currentConversation.title}`);
    const summary = currentConversation.messages
      .slice(0, 4)
      .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 150)}...`)
      .join('\n\n');
    const appUrl = window.location.href;
    const body = encodeURIComponent(
      `Berno Inquiry Session Summary:\n\nTitle: ${currentConversation.title}\nStance: ${currentConversation.mode}\n\n${summary}\n\nExplore on Berno:\n${appUrl}`
    );
    window.location.href = `mailto:?subject=${title}&body=${body}`;
  };

  const handleToggleReadabilityMode = () => {
    setReadabilityMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('berno_readability_mode', String(next));
      } catch {}
      if (next) {
        setIsSidebarOpen(false);
        showToast('Readability Mode active: sidebar hidden & elegant serif typography enabled.');
      } else {
        showToast('Readability Mode disabled.');
      }
      return next;
    });
  };

  // Editorial global keyboard shortcuts (Ctrl+K, Ctrl+Shift+S, Esc, Ctrl+S, Alt+R)
  useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onToggleSidebar: () => setIsSidebarOpen((prev) => !prev),
    onCloseModals: handleCloseAllModals,
    onExportPdf: handleExportPdf,
    onSaveChat: handleSaveChat,
    onToggleReadabilityMode: handleToggleReadabilityMode,
  });

  // Consolidated grounding sources across the entire conversation for citation tooltips & cross-references
  const allConversationSources = useMemo(() => {
    if (!currentConversation) return [];
    const list: GroundingSource[] = [];
    const seenUrls = new Set<string>();
    for (const msg of currentConversation.messages) {
      if (msg.groundingSources && Array.isArray(msg.groundingSources)) {
        for (const s of msg.groundingSources) {
          if (!s || !s.url) continue;
          const norm = s.url.trim().toLowerCase();
          if (!seenUrls.has(norm)) {
            seenUrls.add(norm);
            list.push(s);
          }
        }
      }
    }
    return list;
  }, [currentConversation]);

  const handleExport = (executiveSummary?: string) => {
    if (!currentConversation || currentConversation.messages.length === 0) return;

    let md = `# ${currentConversation.title}\n\n`;
    md += `*Session Timestamp: ${new Date(currentConversation.createdAt).toLocaleString()}*\n`;
    md += `*Cognitive Stance: ${currentConversation.mode}*\n\n`;

    const summaryToInclude = executiveSummary || currentConversation.executiveSummary;
    if (summaryToInclude && summaryToInclude.trim()) {
      md += `## Session Executive Summary\n\n`;
      md += `> *AI-generated architectural synthesis based on the complete conversation thread.*\n\n`;
      md += `${summaryToInclude.trim()}\n\n`;
      md += `---\n\n`;
    } else {
      md += `---\n\n`;
    }

    // Collect and de-duplicate all grounding source citations across the entire conversation
    const collectedReferences: Array<GroundingSource & { citedInTurns: number[] }> = [];
    const urlToReferenceIndex = new Map<string, number>();

    let turnCounter = 0;
    for (const msg of currentConversation.messages) {
      if (msg.role === 'user') {
        turnCounter++;
      } else if (msg.groundingSources && Array.isArray(msg.groundingSources)) {
        const currentTurn = turnCounter || 1;
        for (const s of msg.groundingSources) {
          if (!s || !s.url) continue;
          const normalizedUrl = s.url.trim().toLowerCase();
          if (urlToReferenceIndex.has(normalizedUrl)) {
            const existingIdx = urlToReferenceIndex.get(normalizedUrl)!;
            if (!collectedReferences[existingIdx].citedInTurns.includes(currentTurn)) {
              collectedReferences[existingIdx].citedInTurns.push(currentTurn);
            }
          } else {
            const newIndex = collectedReferences.length;
            urlToReferenceIndex.set(normalizedUrl, newIndex);
            collectedReferences.push({
              ...s,
              citedInTurns: [currentTurn],
            });
          }
        }
      }
    }

    let currentTurnIndex = 0;
    for (const msg of currentConversation.messages) {
      if (msg.role === 'user') {
        currentTurnIndex++;
        md += `### Inquiry [${currentTurnIndex}]\n\n${msg.content}\n\n`;
      } else {
        md += `### Berno Cognitive Synthesis [${currentTurnIndex || 1}]\n\n`;
        if (msg.thinkingContent) {
          md += `<details><summary>Thought Arc</summary>\n\n${msg.thinkingContent}\n\n</details>\n\n`;
        }
        md += `${msg.content}\n\n`;

        if (msg.groundingSources && msg.groundingSources.length > 0) {
          md += `**Turn Citations:**\n`;
          msg.groundingSources.forEach((s) => {
            const normalizedUrl = s.url?.trim().toLowerCase();
            const refNum =
              normalizedUrl && urlToReferenceIndex.has(normalizedUrl)
                ? urlToReferenceIndex.get(normalizedUrl)! + 1
                : null;
            const refTag = refNum !== null ? ` [Ref ${refNum}]` : '';
            md += `- [${s.title || 'Citation'}](${s.url}) (${s.hostname || 'web'})${refTag}\n`;
          });
          md += `\n`;
        }

        md += `---\n\n`;
      }
    }

    // Consolidated 'References' section at the end of the markdown export
    if (collectedReferences.length > 0) {
      md += `## References\n\n`;
      md += `*The following grounding source citations were verified and synthesized throughout this inquiry session:*\n\n`;

      collectedReferences.forEach((ref, idx) => {
        const refNum = idx + 1;
        const title = (ref.title || ref.hostname || 'Source Citation').trim();
        const host = ref.hostname ? ` — *${ref.hostname}*` : '';
        const turns =
          ref.citedInTurns.length > 0
            ? ` *(Cited in ${
                ref.citedInTurns.length === 1
                  ? `Inquiry ${ref.citedInTurns[0]}`
                  : `Inquiries ${ref.citedInTurns.join(', ')}`
              })*`
            : '';

        md += `${refNum}. **[${title}](${ref.url})**${host}${turns}\n`;
        if (ref.snippet && ref.snippet.trim()) {
          const cleanSnippet = ref.snippet.trim().replace(/\s+/g, ' ');
          md += `   > "${cleanSnippet}"\n`;
        }
        md += `\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `berno-${currentConversation.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0c10] text-[#e2e6ed]">
      {/* Toast notification banner */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-[#d4af37]/30 bg-[#12151e]/95 px-4 py-2.5 text-xs font-mono text-[#e5b974] shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Navigation Archives Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={(id) => setActiveId(id)}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePin={handleTogglePin}
        onAutoSummarize={handleAutoSummarize}
        summarizingId={summarizingId}
        onUpdateTags={handleUpdateTags}
        readingList={readingList}
        onRemoveFromReadingList={handleRemoveFromReadingList}
        onNavigateToBookmark={handleNavigateToBookmark}
        activeSidebarTab={activeSidebarTab}
        onTabChange={setActiveSidebarTab}
        readingHistory={readingHistory}
        onRemoveFromReadingHistory={handleRemoveFromReadingHistory}
        onClearReadingHistory={handleClearReadingHistory}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Cognitive Stage */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNewChat={handleNewChat}
          onOpenAbout={() => setIsAboutModalOpen(true)}
          onExport={handleExportMarkdown}
          onExportMarkdown={handleExportMarkdown}
          onExportPdf={handleExportPdf}
          onExportJson={handleExportJson}
          onSaveChat={handleSaveChat}
          isExportingPdf={isExportingPdf}
          isExportingMarkdown={isExportingMarkdown}
          exportProgress={exportProgress}
          user={user}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          hasActiveConversation={Boolean(currentConversation && currentConversation.messages.length > 0)}
          onOpenVoice={() => setIsVoiceModalOpen(true)}
          currentMode={selectedMode}
          selectedModel={selectedModel}
          onChangeModel={setSelectedModel}
          chatbotRole={chatbotRole}
          onChangeChatbotRole={setChatbotRole}
          readabilityMode={readabilityMode}
          onToggleReadabilityMode={handleToggleReadabilityMode}
          readingListCount={readingList.length}
          onOpenReadingList={handleOpenReadingList}
          isFocusZen={isFocusZen}
          onToggleFocusZen={() => setIsFocusZen((prev) => !prev)}
          onOpenReaderDashboard={() => setIsReaderDashboardOpen(true)}
          onToggleTableOfContents={() => setIsTableOfContentsOpen((prev) => !prev)}
          isTableOfContentsOpen={isTableOfContentsOpen}
          onShareEmail={handleShareEmail}
          onOpenPlugins={() => setIsPluginsModalOpen(true)}
          activePlugin={activePlugin}
        />

        {/* Dynamic Scroll Progress Bar for Active Dialogue */}
        <ConversationProgressBar
          scrollContainerRef={scrollContainerRef}
          hasMessages={messages.length > 0}
          isStreaming={isStreaming}
          messages={messages}
        />

        {/* Focus Zen exit button when in distraction-free mode */}
        {isFocusZen && (
          <div className="absolute top-4 right-4 z-40 animate-in fade-in duration-200">
            <button
              onClick={() => setIsFocusZen(false)}
              className="flex items-center gap-1.5 rounded-full border border-[#d4af37]/40 bg-[#0c0e14]/90 px-3 py-1 font-mono text-xs text-[#f5ebd7] shadow-xl backdrop-blur-md hover:bg-[#d4af37]/20 transition-all"
            >
              <span>Exit Focus Zen</span>
              <span className="text-[10px] text-neutral-400 font-mono">(Esc)</span>
            </button>
          </div>
        )}

        {/* Message Stream Area */}
        <div
          ref={scrollContainerRef}
          data-weight={fontWeight}
          data-plugin-active={Boolean(activePlugin)}
          className={`flex-1 overflow-y-auto px-4 py-6 scroll-smooth transition-colors duration-300 ${
            readabilityMode ? 'bg-[#090b0e]' : ''
          }`}
          style={
            {
              '--readability-font-size': `${fontSize}px`,
              '--readability-font-weight': fontWeight === 'light' ? 300 : fontWeight === 'bold' ? 700 : 400,
              ...(activePlugin ? {
                '--plugin-primary': activePlugin.primaryColor,
                '--plugin-bg': activePlugin.backgroundColor,
                '--plugin-surface': activePlugin.surfaceColor,
                '--plugin-text': activePlugin.textColor,
                '--plugin-radius': activePlugin.borderRadius,
              } : {})
            } as React.CSSProperties
          }
        >
          {/* Active Website Style Plugin Pill Banner */}
          {activePlugin && (
            <div className="mx-auto max-w-4xl mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#12151f]/90 px-3.5 py-2 text-xs backdrop-blur-md shadow-md">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full animate-pulse shrink-0"
                    style={{ backgroundColor: activePlugin.primaryColor }}
                  />
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-300">
                    <span className="text-neutral-400">Website Style Plugin:</span>
                    <span className="text-white font-semibold font-serif">{activePlugin.name}</span>
                    <span className="text-[10px] text-neutral-400">({activePlugin.domain})</span>
                    {activePlugin.adoptTone && (
                      <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.2 text-[9px] text-[#e5b974]">
                        Tone Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPluginsModalOpen(true)}
                    className="font-mono text-[10px] text-[#d4af37] hover:underline"
                  >
                    Configure
                  </button>
                  <span className="text-neutral-600">•</span>
                  <button
                    onClick={() => setActivePlugin(null)}
                    className="font-mono text-[10px] text-red-400 hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <EmptyState
              onSelectPrompt={(prompt, mode) => {
                setSelectedMode(mode);
                handleSend(prompt, mode);
              }}
            />
          ) : (
            <div className={`mx-auto transition-all duration-300 ${
              readabilityMode ? 'max-w-5xl px-2 sm:px-6' : 'max-w-4xl'
            }`}>
              {messages.map((msg, index) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  messageIndex={index}
                  allMessages={messages}
                  allConversationSources={allConversationSources}
                  isLast={index === messages.length - 1}
                  onRegenerate={handleRegenerate}
                  onFork={handleFork}
                  onDeleteMessage={handleDeleteMessage}
                  readAloud={readAloud}
                  readabilityMode={readabilityMode}
                  isBookmarked={readingList.some((item) => item.messageId === msg.id)}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Dock (hidden in Focus Zen) */}
        {!isFocusZen && (
          <ChatInput
            onSend={(text, mode, image) => handleSend(text, mode, image)}
            onStop={handleStop}
            isStreaming={isStreaming}
            selectedMode={selectedMode}
            onSelectMode={handleSelectMode}
            researchMode={researchMode}
            onToggleResearchMode={setResearchMode}
            chatbotRole={chatbotRole}
            onChangeChatbotRole={setChatbotRole}
            onOpenVoice={() => setIsVoiceModalOpen(true)}
            selectedModel={selectedModel}
            readabilityMode={readabilityMode}
          />
        )}
      </div>

      {/* Architectural Intellect Explainer Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Epistemic Scholar Authentication Modal (Sign In / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Gemini Live Audio Voice Conversation Modal */}
      <VoiceConversationModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        initialRole={chatbotRole}
      />

      {/* Creative Media Studio 3-Option Picker Modal */}
      <CreativeStudioPickerModal
        isOpen={isStudioPickerOpen}
        onClose={() => setIsStudioPickerOpen(false)}
        onSelectOption={(tab) => {
          setStudioInitialTab(tab);
          setIsVeoModalOpen(true);
        }}
      />

      {/* Veo 3 Video & Image Studio Modal */}
      <VeoVideoStudioModal
        isOpen={isVeoModalOpen}
        onClose={() => setIsVeoModalOpen(false)}
        initialTab={studioInitialTab}
      />

      {/* Reader Dashboard Modal with Focus Session Timer & Daily Goal Ring */}
      <ReaderDashboardModal
        isOpen={isReaderDashboardOpen}
        onClose={() => setIsReaderDashboardOpen(false)}
        focusActiveSeconds={focusActiveSeconds}
        isFocusActive={isFocusActive}
        isFocusPaused={isFocusPaused}
        isIdlePaused={isIdlePaused}
        onToggleFocusTimer={() => setIsFocusPaused((prev) => !prev)}
        onResetFocusTimer={() => setFocusActiveSeconds(0)}
        dailyReadingMinutes={dailyReadingMinutes}
        dailyArticlesFinished={conversations.length}
        dailyWordsRead={messages.reduce(
          (acc, m) => acc + (m.content ? m.content.split(/\s+/).length : 0),
          0
        )}
        dailyGoalMinutes={dailyGoalMinutes}
        onChangeDailyGoal={(mins) => {
          setDailyGoalMinutes(mins);
          try {
            localStorage.setItem('berno_daily_goal_mins', String(mins));
          } catch {}
        }}
        fontSize={fontSize}
        onChangeFontSize={(size) => {
          setFontSize(size);
          try {
            localStorage.setItem('berno_readability_font_size', String(size));
          } catch {}
        }}
        fontWeight={fontWeight}
        onChangeFontWeight={(weight) => setFontWeight(weight)}
        onToggleSoftKeyboard={() => setIsSoftKeyboardOpen((prev) => !prev)}
        isSoftKeyboardOpen={isSoftKeyboardOpen}
        onExportStatsPdf={handleExportPdf}
        isExportingPdf={isExportingPdf}
      />

      {/* Soft Keyboard Overlay for Readability Note-Taking */}
      <SoftKeyboardOverlay
        isOpen={isSoftKeyboardOpen}
        onClose={() => setIsSoftKeyboardOpen(false)}
        onSendToChat={(text) => handleSend(text, selectedMode)}
      />

      {/* Table of Contents Section Navigator */}
      <TableOfContents
        isOpen={isTableOfContentsOpen}
        onClose={() => setIsTableOfContentsOpen(false)}
        messages={messages}
        onNavigateToHeading={handleNavigateToHeading}
      />

      {/* Website Style Plugins & API Keys Modal */}
      <PluginsModal
        isOpen={isPluginsModalOpen}
        onClose={() => setIsPluginsModalOpen(false)}
        activePlugin={activePlugin}
        onApplyPlugin={(plugin) => setActivePlugin(plugin)}
        conversations={conversations}
        readingList={readingList}
        user={user}
        dailyWordsRead={messages.reduce(
          (acc, m) => acc + (m.content ? m.content.split(/\s+/).length : 0),
          0
        )}
        dailyReadingMinutes={dailyReadingMinutes}
      />
    </div>
  );
}
