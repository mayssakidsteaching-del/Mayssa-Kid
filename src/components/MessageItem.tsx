import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, ThinkingMode } from '../types';
import { ThinkingBlock } from './ThinkingBlock';
import { CodeBlock } from './CodeBlock';
import { parseRawMessage } from '../utils/parser';
import { calculateReadingTime } from '../utils/readingTime';
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
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  onRegenerate?: (messageId: string, newMode?: ThinkingMode) => void;
  onFork?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  readAloud?: ReturnType<typeof useReadAloud>;
  isLast?: boolean;
}

export function MessageItem({
  message,
  onRegenerate,
  onFork,
  onDeleteMessage,
  readAloud: readAloudProp,
  isLast = false,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [userCopied, setUserCopied] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(true);

  // Local fallback if not provided globally from App
  const fallbackReadAloud = useReadAloud();
  const readAloud = readAloudProp || fallbackReadAloud;

  // Parse thinking arc and final response
  const rawToParse = message.rawContent || message.content;
  const parsed = parseRawMessage(rawToParse);

  // If parsed thinking is available or message had thinkingContent stored
  const thinkingText = message.thinkingContent || parsed.thinking;
  const responseText = parsed.response || (parsed.isThinking ? '' : message.content);

  // Calculate estimated reading time based on human reading speed (~210 WPM)
  const readingEstimate = useMemo(() => {
    if (message.role !== 'assistant') return null;
    const textToAnalyze = responseText || message.content || '';
    return calculateReadingTime(textToAnalyze);
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
      <div className="group relative my-6 flex justify-end">
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

          <div className="text-[15px] leading-relaxed text-neutral-100 whitespace-pre-wrap">
            {message.content}
          </div>

          {/* User message action toolbar: Copy & Delete Inquiry */}
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/5 pt-2 text-xs opacity-75 group-hover:opacity-100 transition-opacity">
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
    <div className="group relative my-8 max-w-4xl">
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
          {/* Estimated Reading Time badge */}
          {readingEstimate && responseText && !message.isStreaming && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2.5 py-0.5 font-mono text-[11px] text-[#f3e7cb] shadow-sm transition-all hover:border-[#d4af37]/50 hover:bg-[#d4af37]/15 cursor-help"
              title={readingEstimate.tooltip}
            >
              <Clock className="h-3 w-3 text-[#d4af37]" />
              <span>{readingEstimate.display}</span>
            </span>
          )}

          {message.model && (
            <span className="hidden sm:inline font-mono text-[11px] text-neutral-500">
              {message.model}
            </span>
          )}
          <span className="font-mono text-[11px] text-neutral-500">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-white/10 bg-[#0e1117] p-6 shadow-xl transition-all">
        {/* Cognitive Reserve Notice if fallback is used */}
        {message.providerNotice && !message.error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d4af37]/25 bg-[#17140e] px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="font-medium text-[#f3e7cb]">Berno Cognitive Reserve Active</span>
              <span className="hidden sm:inline text-neutral-400">• Gemini Flash Engine</span>
            </div>
            <span className="rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-[#e5b974]">
              OpenAI billing 0-credit active
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
                  {message.error.includes('credits') || message.error.includes('429')
                    ? 'OpenAI Billing Credit Exhaustion'
                    : 'Berno Engine Notice'}
                </div>
                <div className="mt-1 text-neutral-300 leading-relaxed">
                  {message.error}
                </div>
                {(message.error.includes('credits') || message.error.includes('429')) && (
                  <div className="mt-2.5 rounded-lg border border-white/5 bg-black/40 p-2.5 text-[11px] text-neutral-400 font-mono">
                    Your OpenAI key is authenticated, but your account balance has 0 credits. Responses are automatically rerouted through Berno's Cognitive Reserve. You can also recharge credits at{' '}
                    <a
                      href="https://platform.openai.com/settings/organization/billing"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#d4af37] underline hover:text-[#f3e7cb]"
                    >
                      platform.openai.com/settings/organization/billing
                    </a>.
                  </div>
                )}
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
        <div className="berno-prose">
          {responseText ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre({ children }: any) {
                  // Direct child rendering prevents double <pre> nesting and ensures CodeBlock controls layout & folding
                  return <>{children}</>;
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
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[#60a5fa] hover:text-[#93c5fd] underline underline-offset-2 decoration-[#3b82f6]/50 transition-colors font-medium"
                      {...props}
                    >
                      {children}
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

              {/* Reading time metric */}
              {readingEstimate && (
                <div
                  className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-neutral-400 border-l border-white/10 pl-3 ml-0.5"
                  title={readingEstimate.tooltip}
                >
                  <BookOpen className="h-3 w-3 text-[#d4af37]" />
                  <span>{readingEstimate.display}</span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-neutral-500">{readingEstimate.wordCount} words</span>
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

              {/* Delete message */}
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
        )}
      </div>
    </div>
  );
}
