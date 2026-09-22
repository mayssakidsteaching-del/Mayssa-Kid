import { useState, useEffect, useRef } from 'react';
import { Conversation, Message, ThinkingMode, ChatbotRole } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MessageItem } from './components/MessageItem';
import { ChatInput } from './components/ChatInput';
import { EmptyState } from './components/EmptyState';
import { AboutModal } from './components/AboutModal';
import { VoiceConversationModal } from './components/VoiceConversationModal';
import { VeoVideoStudioModal } from './components/VeoVideoStudioModal';
import {
  loadConversations,
  saveConversations,
  loadActiveConversationId,
  saveActiveConversationId,
  loadSavedMode,
  saveSelectedMode,
  exportConversationAsJson,
} from './utils/storage';
import { exportConversationToPdf } from './utils/pdfExport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useReadAloud } from './hooks/useReadAloud';
import { parseRawMessage } from './utils/parser';
import { generateThreeWordSummary } from './utils/titleSummarizer';

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
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [chatbotRole, setChatbotRole] = useState<ChatbotRole>('epistemic_architect');
  const [researchMode, setResearchMode] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isVeoModalOpen, setIsVeoModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const readAloud = useReadAloud();

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync state to local storage
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    saveActiveConversationId(activeId);
  }, [activeId]);

  useEffect(() => {
    saveSelectedMode(selectedMode);
  }, [selectedMode]);

  // Current active conversation
  const currentConversation = conversations.find((c) => c.id === activeId) || null;
  const messages = currentConversation ? currentConversation.messages : [];

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

  const handleSend = async (text: string, mode: ThinkingMode = selectedMode) => {
    if (!text.trim() || isStreaming) return;

    let targetConv = currentConversation;
    let newConversations = [...conversations];

    const isFirstExchange = targetConv ? targetConv.messages.length === 0 : true;

    if (!targetConv) {
      targetConv = createNewConversation(text, mode);
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
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

  const handleExportMarkdown = () => {
    handleExport();
    showToast('Markdown document exported.');
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
    try {
      await exportConversationToPdf(currentConversation, {
        theme: 'editorial_dark',
        includeThinking: true,
      });
      showToast('Editorial Berno PDF document downloaded.');
    } catch (err: any) {
      console.error('PDF export error:', err);
      showToast('Error exporting PDF: ' + (err?.message || 'Check console'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCloseAllModals = () => {
    setIsAboutModalOpen(false);
    setIsVoiceModalOpen(false);
    setIsVeoModalOpen(false);
  };

  // Editorial global keyboard shortcuts (Ctrl+K, Ctrl+Shift+S, Esc, Ctrl+S)
  useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onToggleSidebar: () => setIsSidebarOpen((prev) => !prev),
    onCloseModals: handleCloseAllModals,
    onExportPdf: handleExportPdf,
    onSaveChat: handleSaveChat,
  });

  const handleExport = () => {
    if (!currentConversation || currentConversation.messages.length === 0) return;

    let md = `# ${currentConversation.title}\n\n`;
    md += `*Session Timestamp: ${new Date(currentConversation.createdAt).toLocaleString()}*\n`;
    md += `*Cognitive Stance: ${currentConversation.mode}*\n\n---\n\n`;

    for (const msg of currentConversation.messages) {
      if (msg.role === 'user') {
        md += `### Inquiry\n\n${msg.content}\n\n`;
      } else {
        md += `### Berno Cognitive Synthesis\n\n`;
        if (msg.thinkingContent) {
          md += `<details><summary>Thought Arc</summary>\n\n${msg.thinkingContent}\n\n</details>\n\n`;
        }
        md += `${msg.content}\n\n`;

        if (msg.groundingSources && msg.groundingSources.length > 0) {
          md += `**Google Search & Real-Time Sources:**\n`;
          msg.groundingSources.forEach((s, idx) => {
            md += `- [${idx + 1}] [${s.title}](${s.url}) (${s.hostname || 'web'})\n`;
          });
          md += `\n`;
        }

        md += `---\n\n`;
      }
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
          hasActiveConversation={Boolean(currentConversation && currentConversation.messages.length > 0)}
          onOpenVoice={() => setIsVoiceModalOpen(true)}
          onOpenVeo={() => setIsVeoModalOpen(true)}
          currentMode={selectedMode}
          selectedModel={selectedModel}
          onChangeModel={setSelectedModel}
          chatbotRole={chatbotRole}
          onChangeChatbotRole={setChatbotRole}
        />

        {/* Message Stream Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
        >
          {messages.length === 0 ? (
            <EmptyState
              onSelectPrompt={(prompt, mode) => {
                setSelectedMode(mode);
                handleSend(prompt, mode);
              }}
            />
          ) : (
            <div className="mx-auto max-w-4xl">
              {messages.map((msg, index) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isLast={index === messages.length - 1}
                  onRegenerate={handleRegenerate}
                  onFork={handleFork}
                  onDeleteMessage={handleDeleteMessage}
                  readAloud={readAloud}
                />
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Dock */}
        <ChatInput
          onSend={(text, mode) => handleSend(text, mode)}
          onStop={handleStop}
          isStreaming={isStreaming}
          selectedMode={selectedMode}
          onSelectMode={handleSelectMode}
          researchMode={researchMode}
          onToggleResearchMode={setResearchMode}
          chatbotRole={chatbotRole}
          onChangeChatbotRole={setChatbotRole}
          onOpenVoice={() => setIsVoiceModalOpen(true)}
          onOpenVeo={() => setIsVeoModalOpen(true)}
          selectedModel={selectedModel}
        />
      </div>

      {/* Architectural Intellect Explainer Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Gemini Live Audio Voice Conversation Modal */}
      <VoiceConversationModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        initialRole={chatbotRole}
      />

      {/* Veo 3 Video Studio Modal */}
      <VeoVideoStudioModal
        isOpen={isVeoModalOpen}
        onClose={() => setIsVeoModalOpen(false)}
      />
    </div>
  );
}
