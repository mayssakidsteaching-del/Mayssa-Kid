import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, ThinkingMode, GroundingSource } from '../types';
import { ThinkingBlock } from './ThinkingBlock';
import { CodeBlock } from './CodeBlock';
import { PullQuoteBlock } from './PullQuoteBlock';
import { CitationTooltip } from './CitationTooltip';
import { parseRawMessage } from '../utils/parser';
import { calculateReadingTime, calculateWordCount } from '../utils/readingTime';
import { renderWithThematicHighlights } from '../utils/thematicHighlight';
import { renderWithCitations } from '../utils/citationParser';
import { THINKING_MODES } from '../utils/constants';
import { useReadAloud } from '../hooks/useReadAloud';
import { ReadAloudPlayer } from './ReadAloudPlayer';
import {
  Check,
  Copy,
  RotateCcw,
  Sparkles,
  GitFork,
  User,
  AlertTriangle,
  Globe,
  ExternalLink,
  Search,
  ChevronRight,
  ChevronDown,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  AudioLines,
  Trash2,
  Clock,
  BookOpen,
  Bookmark,
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  messageIndex?: number;
  allMessages?: Message[];
  allConversationSources?: GroundingSource[];
  onRegenerate?: (messageId: string, newMode?: ThinkingMode) => void;
  onFork?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  readAloud?: ReturnType<typeof useReadAloud>;
  isLast?: boolean;
  readabilityMode?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: (message: Message) => void;
}

export function MessageItem({
  message,
  messageIndex,
  allMessages,
  allConversationSources,
  onRegenerate,
  onFork,
  onDeleteMessage,
  readAloud: readAloudProp,
  isLast = false,
  readabilityMode = false,
  isBookmarked = false,
  onToggleBookmark,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [userCopied, setUserCopied] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const [cardScrollDepth, setCardScrollDepth] = useState(0);
  const [showReadingPopover, setShowReadingPopover] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const readingPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        readingPopoverRef.current &&
        !readingPopoverRef.current.contains(event.target as Node)
      ) {
        setShowReadingPopover(false);
      }
    }
    if (showReadingPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showReadingPopover]);

  useEffect(() => {
    const handleScroll = () => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const focalLine = viewportHeight * 0.45;

      const totalHeight = rect.height;
      if (totalHeight <= 0) return;

      const scrolled = focalLine - rect.top;
      const pct = Math.min(100, Math.max(0, (scrolled / totalHeight) * 100));
      setCardScrollDepth(pct);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const scrollContainer = cardRef.current?.closest('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Local fallback if not provided globally from App
  const fallbackReadAloud = useReadAloud();
  const readAloud = readAloudProp || fallbackReadAloud;

  // Parse thinking arc and final response
  const rawToParse = message.rawContent || message.content;
  const parsed = parseRawMessage(rawToParse);

  // If parsed thinking is available or message had thinkingContent stored
  const thinkingText = message.thinkingContent || parsed.thinking;
  const responseText = parsed.response || (parsed.isThinking ? '' : message.content);

  // Calculate estimated reading time based on human reading speed (250 WPM)
  const readingEstimate = useMemo(() => {
    if (message.role !== 'assistant') return null;
    const textToAnalyze = responseText || message.content || '';
    return calculateReadingTime(textToAnalyze, 250);
  }, [message.role, responseText, message.content]);

  // Calculate exact word count for the assistant response to support the long-form editorial aesthetic
  const wordCount = useMemo(() => {
    if (message.role !== 'assistant') return 0;
    const textToAnalyze = responseText || message.content || '';
    return calculateWordCount(textToAnalyze);
  }, [message.role, responseText, message.content]);

  const modeConfig = THINKING_MODES.find((m) => m.id === message.mode) || THINKING_MODES[0];

  const isThisMessageActive = readAloud.activeTextId === message.id && (readAloud.isSpeaking || readAloud.isPaused);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(responseText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleReadAloud = () => {
    if (!readAloud.supportsSpeech || !responseText) return;

    if (readAloud.activeTextId === message.id && readAloud.isSpeaking) {
      if (readAloud.isPaused) {
        readAloud.resume();
      } else {
        readAloud.pause();
      }
    } else {
      readAloud.startReadAloud(message.id, responseText);
    }
  };

  if (message.role === 'user') {
    return (
      <div
        id={`message-card-${message.id}`}
        data-message-card={message.id}
        data-role="user"
        className="group relative my-6 flex justify-end"
      >
        <div className="max-w-3xl rounded-2xl border border-white/10 bg-[#161a23] p-5 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-4 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-medium text-neutral-300">
                <User className="h-3.5 w-3.5 text-[#d4af37]" />
                Inquiry
              </span>
              {message.researchMode && (
                <span className="flex items-center gap-1 rounded bg-[#1e3a8a]/40 px-2 py-0.5 font-mono text-[10px] text-[#93c5fd] border border-[#3b82f6]/30">
                  <Globe className="h-3 w-3 text-[#60a5fa]" />
                  Research Mode
                </span>
              )}
            </div>
            <span className="font-mono text-[11px] text-neutral-500">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {message.attachedImage && (
            <div className="mb-3 max-w-sm overflow-hidden rounded-xl border border-[#d4af37]/30 shadow-md">
              <img
                src={message.attachedImage}
                alt="Attached visual inquiry"
                className="max-h-64 w-full object-cover"
              />
            </div>
          )}

          <div className={readabilityMode ? "font-serif text-[17px] leading-[1.82] text-neutral-100 whitespace-pre-wrap selection:bg-[#d4af37]/30" : "text-[15px] leading-relaxed text-neutral-100 whitespace-pre-wrap"}>
            {message.content}
          </div>

          {/* User message action toolbar: Copy, Bookmark & Delete Inquiry */}
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/5 pt-2 text-xs opacity-75 group-hover:opacity-100 transition-opacity">
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(message)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono transition-colors ${
                  isBookmarked
                    ? 'text-[#f3cf65] bg-[#d4af37]/20 border border-[#d4af37]/40'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                }`}
                title={isBookmarked ? 'Remove inquiry from Reading List' : 'Read Later: Bookmark inquiry to Reading List'}
              >
                <Bookmark className={`h-3 w-3 ${isBookmarked ? 'fill-[#d4af37] text-[#d4af37]' : ''}`} />
                <span>{isBookmarked ? 'Saved' : 'Read Later'}</span>
              </button>
            )}

            <button
              onClick={async () => {
                await navigator.clipboard.writeText(message.content);
                setUserCopied(true);
                setTimeout(() => setUserCopied(false), 2000);
              }}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
              title="Copy inquiry text"
            >
              {userCopied ? (
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

            {onDeleteMessage && (
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                title="Delete this inquiry"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      id={`message-card-${message.id}`}
      data-message-card={message.id}
      data-role="assistant"
      className="group relative my-8 max-w-4xl"
    >
      {/* Header with Berno identity and mode */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-gradient-to-b from-[#1c1f26] to-[#0c0e12] shadow-inner">
            <span className="font-serif text-sm font-bold text-[#e5b974]">B</span>
            {message.isStreaming && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]" />
              </span>
            )}
          </div>
          <span className="font-serif font-semibold tracking-wider text-[#f3f4f6]">
            Berno
          </span>

          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-mono font-medium tracking-wide uppercase"
            style={{
              backgroundColor: `${modeConfig.accentColor}15`,
              color: modeConfig.accentColor,
              border: `1px solid ${modeConfig.accentColor}30`,
            }}
          >
            {modeConfig.name}
          </span>

          {message.researchMode && (
            <span className="flex items-center gap-1.5 rounded-md border border-[#3b82f6]/30 bg-[#1e3a8a]/20 px-2 py-0.5 text-[11px] font-mono text-[#93c5fd]">
              <Globe className="h-3 w-3 text-[#60a5fa]" />
              <span>Google Search Grounded</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Subtle Word Count & Estimated Reading Time (250 WPM) */}
          {readingEstimate && responseText && !message.isStreaming && (
            <div
              className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400 select-none cursor-help"
              title={readingEstimate.tooltip}
            >
              <BookOpen className="h-3 w-3 text-neutral-500" />
              <span className="text-neutral-300 font-medium">{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
              <span className="text-neutral-600" aria-hidden="true">·</span>
              <Clock className="h-3 w-3 text-[#d4af37]" />
              <span>{readingEstimate.display}</span>
              {readabilityMode && (
                <>
                  <span className="text-neutral-600" aria-hidden="true">·</span>
                  <span
                    className="hidden sm:inline font-sans text-[11px] text-[#f3cf65] underline decoration-[#d4af37]/60 underline-offset-2 decoration-[1.5px] cursor-help"
                    title="Readability Mode: Key thematic phrases accented with subtle golden underlines"
                  >
                    Thematic Highlights
                  </span>
                </>
              )}
            </div>
          )}

          {message.model && (
            <span className="hidden sm:inline font-mono text-[11px] text-neutral-500">
              {message.model}
            </span>
          )}
          <span className="font-mono text-[11px] text-neutral-500">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Subtle Circular Progress Indicator for this card */}
          <div
            className="flex items-center gap-1 pl-1 cursor-help shrink-0"
            title={`Card reading depth: ${Math.round(cardScrollDepth)}%`}
          >
            <div className="relative flex h-3.5 w-3.5 items-center justify-center">
              <svg className="h-3.5 w-3.5 -rotate-90" viewBox="0 0 20 20">
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  className="stroke-white/10 fill-none"
                  strokeWidth="2.5"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  className="stroke-[#d4af37] fill-none transition-all duration-100 ease-out"
                  strokeWidth="2.5"
                  strokeDasharray={44}
                  strokeDashoffset={44 * (1 - Math.min(100, Math.max(0, cardScrollDepth)) / 100)}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className={`rounded-2xl border transition-all ${
        readabilityMode
          ? 'border-[#d4af37]/20 bg-[#0c0e14] p-6 sm:p-9 shadow-2xl ring-1 ring-[#d4af37]/10'
          : 'border-white/10 bg-[#0e1117] p-6 shadow-xl'
      }`}>
        {/* Cognitive Reserve Notice if fallback is used */}
        {message.providerNotice && !message.error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d4af37]/25 bg-[#17140e] px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="font-medium text-[#f3e7cb]">Berno Cognitive Reserve Active</span>
              <span className="hidden sm:inline text-neutral-400">• Gemini Flash Engine</span>
            </div>
            <span className="rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-[#e5b974]">
              Autonomous Routing
            </span>
          </div>
        )}

        {/* Error notification if unrecoverable error */}
        {message.error && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-[#16120b] p-4 text-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#e5b974] mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-[#e5b974]">
                  Berno Engine Notice
                </div>
                <div className="mt-1 text-neutral-300 leading-relaxed">
                  {message.error.toLowerCase().includes('credit') || message.error.includes('429')
                    ? 'Primary cognitive engine unavailable. Berno has rerouted processing through the Cognitive Reserve.'
                    : message.error}
                </div>
                {onRegenerate && (
                  <button
                    type="button"
                    onClick={() => onRegenerate(message.id)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-medium text-[#f3e7cb] hover:bg-[#d4af37]/20 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-[#d4af37]" />
                    Regenerate with Cognitive Reserve
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cognitive Thinking Trace Block */}
        {(thinkingText || (message.isStreaming && parsed.isThinking)) && (
          <ThinkingBlock
            thinking={thinkingText}
            isStreaming={Boolean(message.isStreaming && parsed.isThinking)}
            accentColor={modeConfig.accentColor}
          />
        )}

        {/* Real-time Google Search Grounding Sources */}
        {message.groundingSources && message.groundingSources.length > 0 && (
          <div className="mb-5 overflow-hidden rounded-xl border border-[#3b82f6]/30 bg-[#0c1427]/70 backdrop-blur-sm transition-all">
            <div className="flex items-center justify-between border-b border-[#3b82f6]/15 bg-[#121e38]/50 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2 font-medium text-[#93c5fd]">
                <Globe className="h-4 w-4 text-[#60a5fa]" />
                <span>Google Search & Live Sources</span>
                <span className="rounded-full bg-[#1e3a8a] px-2 py-0.5 text-[10px] font-mono text-[#bfdbfe]">
                  {message.groundingSources.length} sources
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 hover:text-white transition-colors"
              >
                <span>{sourcesExpanded ? 'Collapse' : 'Expand'}</span>
                {sourcesExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {sourcesExpanded && (
              <div className="p-3.5">
                {message.searchQueries && message.searchQueries.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-neutral-400">
                    <Search className="h-3 w-3 text-[#60a5fa]" />
                    <span className="text-neutral-500">Live Search Queries:</span>
                    {message.searchQueries.map((q, idx) => (
                      <span
                        key={idx}
                        className="rounded border border-white/5 bg-black/40 px-2 py-0.5 text-[#93c5fd]"
                      >
                        "{q}"
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {message.groundingSources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col justify-between rounded-lg border border-white/5 bg-black/20 p-2.5 transition-all hover:border-[#3b82f6]/40 hover:bg-[#1e3a8a]/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#3b82f6]/30 font-mono text-[10px] font-bold text-[#93c5fd]">
                            {idx + 1}
                          </span>
                          <span className="truncate font-mono text-[11px] text-[#93c5fd]">
                            {source.hostname || 'web'}
                          </span>
                        </div>
                        <ExternalLink className="h-3 w-3 shrink-0 text-neutral-500 transition-colors group-hover:text-[#93c5fd]" />
                      </div>
                      <div className="mt-1.5 line-clamp-2 text-xs font-medium text-neutral-200 group-hover:text-white leading-snug">
                        {source.title}
                      </div>
                      {source.snippet && (
                        <div className="mt-1 line-clamp-2 text-[11px] text-neutral-400 leading-relaxed">
                          {source.snippet}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live response / Markdown */}
        <div className={`berno-prose ${readabilityMode ? 'readability-serif' : ''}`}>
          {responseText ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre({ children }: any) {
                  // Direct child rendering prevents double <pre> nesting and ensures CodeBlock controls layout & folding
                  return <>{children}</>;
                },
                p({ children, ...props }: any) {
                  return (
                    <p {...props}>
                      {renderWithCitations(children, {
                        turnSources: message.groundingSources,
                        allSources: allConversationSources,
                        readabilityMode,
                        messageIndex,
                        allMessages,
                        keyPrefix: 'p',
                      })}
                    </p>
                  );
                },
                li({ children, ...props }: any) {
                  return (
                    <li {...props}>
                      {renderWithCitations(children, {
                        turnSources: message.groundingSources,
                        allSources: allConversationSources,
                        readabilityMode,
                        messageIndex,
                        allMessages,
                        keyPrefix: 'li',
                      })}
                    </li>
                  );
                },
                h1({ children, ...props }: any) {
                  return (
                    <h1 {...props}>
                      {renderWithCitations(children, {
                        turnSources: message.groundingSources,
                        allSources: allConversationSources,
                        readabilityMode,
                        messageIndex,
                        allMessages,
                        keyPrefix: 'h1',
                      })}
                    </h1>
                  );
                },
                h2({ children, ...props }: any) {
                  return (
                    <h2 {...props}>
                      {renderWithCitations(children, {
                        turnSources: message.groundingSources,
                        allSources: allConversationSources,
                        readabilityMode,
                        messageIndex,
                        allMessages,
                        keyPrefix: 'h2',
                      })}
                    </h2>
                  );
                },
                h3({ children, ...props }: any) {
                  return (
                    <h3 {...props}>
                      {renderWithCitations(children, {
                        turnSources: message.groundingSources,
                        allSources: allConversationSources,
                        readabilityMode,
                        messageIndex,
                        allMessages,
                        keyPrefix: 'h3',
                      })}
                    </h3>
                  );
                },
                h4({ children, ...props }: any) {
                  return (
                    <h4 {...props}>
                      {renderWithCitations(children, {
                        turnSources: message.groundingSources,
                        allSources: allConversationSources,
                        readabilityMode,
                        messageIndex,
                        allMessages,
                        keyPrefix: 'h4',
                      })}
                    </h4>
                  );
                },
                strong({ children, ...props }: any) {
                  return (
                    <strong
                      className={
                        readabilityMode
                          ? 'thematic-highlight font-semibold text-white'
                          : 'font-semibold text-white'
                      }
                      title={readabilityMode ? 'Thematic key phrase' : undefined}
                      {...props}
                    >
                      {children}
                    </strong>
                  );
                },
                em({ children, ...props }: any) {
                  return (
                    <em
                      className={
                        readabilityMode
                          ? 'thematic-emphasis italic text-[#fbf7ee]'
                          : 'italic text-neutral-200'
                      }
                      {...props}
                    >
                      {children}
                    </em>
                  );
                },
                blockquote({ children }: any) {
                  // Extract raw string text from children if possible
                  const quoteText = React.Children.toArray(children)
                    .map((c: any) => (typeof c === 'string' ? c : c?.props?.children || ''))
                    .join(' ')
                    .replace(/^["“”']|["“”']$/g, '')
                    .trim();

                  return <PullQuoteBlock quote={quoteText || 'Key editorial insight'} />;
                },
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && (match || codeString.includes('\n'))) {
                    return (
                      <CodeBlock
                        language={match ? match[1] : 'text'}
                        code={codeString}
                      />
                    );
                  }

                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                a({ href, children, ...props }: any) {
                  const childStr = typeof children === 'string' ? children : '';
                  const match = childStr.match(/\[?(?:Ref\.?\s*|Reference\s*|#)?(\d+)\]?/i);
                  const isCitationFormat =
                    match &&
                    (childStr.toLowerCase().includes('ref') ||
                      childStr.toLowerCase().includes('source') ||
                      childStr.trim().startsWith('['));

                  if (isCitationFormat) {
                    const num = parseInt(match[1], 10);
                    const matchedSource =
                      (message.groundingSources && message.groundingSources[num - 1]) ||
                      (allConversationSources && allConversationSources[num - 1]) ||
                      (href
                        ? {
                            url: href,
                            title: childStr,
                            hostname: (() => {
                              try {
                                return new URL(href).hostname.replace(/^www\./, '');
                              } catch {
                                return 'web';
                              }
                            })(),
                          }
                        : undefined);

                    return (
                      <CitationTooltip
                        refNumber={num}
                        source={matchedSource}
                        label={childStr.startsWith('[') ? childStr : `[Ref ${num}]`}
                        messageIndex={messageIndex}
                        allMessages={allMessages}
                      />
                    );
                  }

                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[#60a5fa] hover:text-[#93c5fd] underline underline-offset-2 decoration-[#3b82f6]/50 transition-colors font-medium"
                      {...props}
                    >
                      {renderWithCitations(children, {
                        turnSources: message.groundingSources,
                        allSources: allConversationSources,
                        readabilityMode,
                        messageIndex,
                        allMessages,
                        keyPrefix: 'a',
                      })}
                      <ExternalLink className="inline h-3 w-3 ml-0.5 opacity-70" />
                    </a>
                  );
                },
              }}
            >
              {responseText}
            </ReactMarkdown>
          ) : message.isStreaming && !parsed.isThinking ? (
            <div className="flex items-center gap-2 text-sm text-[#d4af37]">
              <Sparkles className="h-4 w-4 animate-spin" />
              <span>Crystallizing synthesized answer...</span>
            </div>
          ) : null}
        </div>

        {/* Editorial Read Aloud Synthesizer Player */}
        {isThisMessageActive && (
          <ReadAloudPlayer
            isSpeaking={readAloud.isSpeaking}
            isPaused={readAloud.isPaused}
            progress={readAloud.progress}
            currentChunkIndex={readAloud.currentChunkIndex}
            totalChunks={readAloud.totalChunks}
            rate={readAloud.rate}
            selectedVoice={readAloud.selectedVoice}
            availableVoices={readAloud.availableVoices}
            detectedLanguage={readAloud.detectedLanguage}
            onTogglePlay={handleToggleReadAloud}
            onStop={readAloud.stop}
            onSkipForward={readAloud.skipForward}
            onSkipBackward={readAloud.skipBackward}
            onChangeRate={readAloud.changeRate}
            onChangeVoice={readAloud.changeVoice}
          />
        )}

        {/* Assistant action toolbar */}
        {!message.isStreaming && responseText && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-xs text-neutral-400">
            <div className="flex flex-wrap items-center gap-2">
              {/* Copy synthesis button */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
                title="Copy Berno answer to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Copy Answer</span>
                  </>
                )}
              </button>

              {/* Read Later Bookmark button */}
              {onToggleBookmark && (
                <button
                  onClick={() => onToggleBookmark(message)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-mono transition-all ${
                    isBookmarked
                      ? 'bg-[#d4af37]/20 text-[#f3cf65] border border-[#d4af37]/45 shadow-sm font-medium'
                      : 'hover:bg-white/5 text-neutral-400 hover:text-white border border-transparent'
                  }`}
                  title={
                    isBookmarked
                      ? 'Remove this insight from your Reading List'
                      : 'Read Later: Pin this editorial insight to your persistent Reading List'
                  }
                >
                  <Bookmark
                    className={`h-3.5 w-3.5 transition-colors ${
                      isBookmarked ? 'fill-[#d4af37] text-[#d4af37]' : 'text-neutral-400'
                    }`}
                  />
                  <span>{isBookmarked ? 'Bookmarked' : 'Read Later'}</span>
                </button>
              )}

              {/* Read Aloud Button */}
              {readAloud.supportsSpeech && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleToggleReadAloud}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                      isThisMessageActive
                        ? 'bg-[#d4af37]/20 text-[#e5b974] border border-[#d4af37]/40 shadow-sm font-medium'
                        : 'hover:bg-white/5 text-neutral-300 hover:text-white border border-transparent'
                    }`}
                    title={
                      isThisMessageActive
                        ? readAloud.isPaused
                          ? 'Resume Read Aloud'
                          : 'Pause Read Aloud'
                        : `Read Aloud in synthesized voice (${readAloud.detectedLanguage?.nativeName || 'Universal'})`
                    }
                  >
                    {isThisMessageActive ? (
                      readAloud.isPaused ? (
                        <>
                          <Play className="h-3.5 w-3.5 text-[#d4af37]" />
                          <span className="font-mono text-[11px]">Resume</span>
                        </>
                      ) : (
                        <>
                          <AudioLines className="h-3.5 w-3.5 text-[#d4af37] animate-pulse" />
                          <span className="font-mono text-[11px] text-[#e5b974]">Narrating...</span>
                        </>
                      )
                    ) : (
                      <>
                        <Volume2 className="h-3.5 w-3.5 text-[#d4af37]" />
                        <span className="font-mono text-[11px]">Read Aloud</span>
                      </>
                    )}
                  </button>

                  {isThisMessageActive && (
                    <button
                      onClick={readAloud.stop}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Stop Read Aloud"
                    >
                      <Square className="h-3 w-3 fill-current" />
                    </button>
                  )}
                </div>
              )}

              {/* Fork / Branch conversation */}
              {onFork && (
                <button
                  onClick={() => onFork(message.id)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
                  title="Branch thread from here"
                >
                  <GitFork className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Branch</span>
                </button>
              )}

              {onDeleteMessage && (
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  title="Delete this answer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Interactive Reading Button Below the Response of Berno */}
            <div className="relative flex items-center gap-2" ref={readingPopoverRef}>
              {wordCount > 0 && !message.isStreaming && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowReadingPopover((prev) => !prev)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all shadow-sm ${
                      showReadingPopover
                        ? 'border-[#d4af37] bg-[#d4af37]/25 text-[#f3cf65] shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                        : 'border-[#d4af37]/30 bg-[#d4af37]/10 text-[#e5c46b] hover:bg-[#d4af37]/20 hover:border-[#d4af37]/50'
                    }`}
                    title="Reading Metrics: View estimated reading times and pace analysis"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span className="font-medium text-neutral-200">
                      {readingEstimate?.display || '< 1 min read'}
                    </span>
                    <span className="text-[#d4af37]/70 hidden sm:inline">
                      ({wordCount.toLocaleString()} words)
                    </span>
                    <Clock className="h-3 w-3 text-[#d4af37]/80 ml-0.5" />
                  </button>

                  {/* Reading Analytics Popover Card Below Berno's Response */}
                  {showReadingPopover && (
                    <div className="absolute right-0 bottom-full mb-2.5 w-72 sm:w-80 rounded-2xl border border-[#d4af37]/40 bg-[#0c0e14]/98 p-4 shadow-2xl backdrop-blur-xl z-50 text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#f5ebd7]">
                          <BookOpen className="h-4 w-4 text-[#d4af37]" />
                          <span className="font-serif">Reading Intelligence</span>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37] bg-[#d4af37]/15 border border-[#d4af37]/30 px-1.5 py-0.5 rounded">
                          Berno Telemetry
                        </span>
                      </div>

                      {/* Reading Stats Grid */}
                      <div className="grid grid-cols-2 gap-2 mb-3 text-[11px] font-mono">
                        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
                          <span className="text-neutral-400 block text-[10px]">TOTAL WORDS</span>
                          <span className="text-sm font-bold text-white mt-0.5 block">
                            {wordCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
                          <span className="text-neutral-400 block text-[10px]">CHARACTERS</span>
                          <span className="text-sm font-bold text-white mt-0.5 block">
                            {responseText.length.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Reading Speeds Breakdown */}
                      <div className="space-y-1.5 border-t border-white/5 pt-2.5 mb-3 text-xs">
                        <div className="flex items-center justify-between text-neutral-300 font-mono text-[11px]">
                          <span className="text-neutral-400">Standard Pace (250 WPM):</span>
                          <span className="font-semibold text-[#f3cf65]">
                            {readingEstimate?.display || '< 1 min'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-300 font-mono text-[11px]">
                          <span className="text-neutral-400">Deep Study (180 WPM):</span>
                          <span className="text-neutral-300">
                            ~{Math.max(1, Math.ceil(wordCount / 180))} min
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-300 font-mono text-[11px]">
                          <span className="text-neutral-400">Quick Skim (350 WPM):</span>
                          <span className="text-neutral-300">
                            ~{Math.max(1, Math.ceil(wordCount / 350))} min
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-300 font-mono text-[11px]">
                          <span className="text-neutral-400">Audio Speech (~150 WPM):</span>
                          <span className="text-neutral-300">
                            ~{Math.max(1, Math.ceil(wordCount / 150))} min
                          </span>
                        </div>
                      </div>

                      {/* Quick Read Aloud Action */}
                      {readAloud.supportsSpeech && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowReadingPopover(false);
                            handleToggleReadAloud();
                          }}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/15 py-1.5 font-mono text-xs font-semibold text-[#f5ebd7] transition-all hover:bg-[#d4af37]/25 shadow-sm"
                        >
                          <Volume2 className="h-3.5 w-3.5 text-[#d4af37]" />
                          <span>
                            {isThisMessageActive
                              ? readAloud.isPaused
                                ? 'Resume Narration'
                                : 'Pause Narration'
                              : 'Listen with Read Aloud'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {onRegenerate && isLast && (
                <button
                  onClick={() => onRegenerate(message.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-neutral-200 transition-colors hover:bg-white/10 hover:text-white"
                  title="Regenerate with elevated scrutiny"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>Re-Synthesize</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
