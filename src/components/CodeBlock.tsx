import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Hash,
  WrapText,
  FoldVertical,
  UnfoldVertical,
} from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
  initialFolded?: boolean;
}

const EXTENSION_MAP: Record<string, string> = {
  typescript: 'ts',
  ts: 'ts',
  tsx: 'tsx',
  javascript: 'js',
  js: 'js',
  jsx: 'jsx',
  python: 'py',
  py: 'py',
  rust: 'rs',
  go: 'go',
  html: 'html',
  css: 'css',
  scss: 'scss',
  json: 'json',
  yaml: 'yaml',
  yml: 'yml',
  markdown: 'md',
  md: 'md',
  sql: 'sql',
  sh: 'sh',
  bash: 'sh',
  zsh: 'sh',
  dockerfile: 'dockerfile',
  graphql: 'gql',
  xml: 'xml',
  c: 'c',
  cpp: 'cpp',
  java: 'java',
  kotlin: 'kt',
  swift: 'swift',
  php: 'php',
  ruby: 'rb',
};

const DEFAULT_FOLD_THRESHOLD = 16;
const PREVIEW_LINES_COUNT = 7;

export function CodeBlock({ language, code, initialFolded }: CodeBlockProps) {
  const lines = code.split('\n');
  const totalLines = lines.length;
  const isCollapsible = totalLines > 6;

  // Auto-fold if code exceeds threshold unless explicitly overridden
  const [isFolded, setIsFolded] = useState<boolean>(() => {
    if (typeof initialFolded === 'boolean') return initialFolded;
    return totalLines > DEFAULT_FOLD_THRESHOLD;
  });

  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wrapText, setWrapText] = useState(false);

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  const handleDownload = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cleanLang = (language || 'text').toLowerCase().trim();
    const ext = EXTENSION_MAP[cleanLang] ? `.${EXTENSION_MAP[cleanLang]}` : '.txt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `berno-snippet${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleLines = isFolded ? lines.slice(0, PREVIEW_LINES_COUNT) : lines;
  const hiddenLinesCount = totalLines - PREVIEW_LINES_COUNT;
  const formattedLang = (language || 'TEXT').toUpperCase();

  return (
    <div
      className={`group/code my-4 overflow-hidden rounded-xl border border-white/10 bg-[#06080b] shadow-2xl transition-all duration-200 ${
        isFolded ? 'hover:border-[#d4af37]/30' : ''
      }`}
    >
      {/* Editorial Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0c0f16] px-3.5 py-2.5 text-xs text-neutral-400">
        {/* Language and Line Count Meta */}
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
          <span className="font-mono text-xs font-semibold tracking-wider text-[#d4af37]">
            {formattedLang}
          </span>
          <span className="font-mono text-[11px] text-neutral-500">
            {totalLines} {totalLines === 1 ? 'line' : 'lines'}
          </span>

          {isFolded && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded bg-[#d4af37]/10 border border-[#d4af37]/20 px-2 py-0.5 font-mono text-[10px] text-[#f3cf65]">
              Collapsed preview
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Fold / Unfold Button */}
          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsFolded(!isFolded)}
              title={isFolded ? 'Expand full code block' : 'Fold / Collapse code block'}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] transition-all ${
                isFolded
                  ? 'border border-[#d4af37]/30 bg-[#d4af37]/15 text-[#f3cf65] hover:bg-[#d4af37]/25'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {isFolded ? (
                <>
                  <UnfoldVertical className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>Expand</span>
                </>
              ) : (
                <>
                  <FoldVertical className="h-3.5 w-3.5" />
                  <span>Fold</span>
                </>
              )}
            </button>
          )}

          {/* Toggle Line Numbers */}
          <button
            type="button"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              showLineNumbers
                ? 'text-neutral-300 hover:bg-white/5 hover:text-white'
                : 'text-neutral-600 hover:bg-white/5 hover:text-neutral-400'
            }`}
          >
            <Hash className="h-3.5 w-3.5" />
          </button>

          {/* Toggle Wrap */}
          <button
            type="button"
            onClick={() => setWrapText(!wrapText)}
            title={wrapText ? 'Disable line wrap' : 'Enable line wrap'}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              wrapText
                ? 'text-[#d4af37] hover:bg-white/5'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <WrapText className="h-3.5 w-3.5" />
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            title="Download Code File"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline font-mono text-[11px]">Save</span>
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy full code to clipboard"
            className="flex items-center gap-1 rounded-md bg-white/5 px-2.5 py-1 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white font-mono text-[11px]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="relative overflow-hidden">
        <div className="overflow-x-auto p-4 font-mono text-[13.5px] leading-relaxed text-[#e3e8f0]">
          <div className="flex">
            {/* Gutter: Line Numbers */}
            {showLineNumbers && (
              <div
                className="select-none pr-3.5 mr-3.5 border-r border-white/10 text-right text-neutral-600 text-xs font-mono font-normal"
                aria-hidden="true"
              >
                {visibleLines.map((_, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {idx + 1}
                  </div>
                ))}
              </div>
            )}

            {/* Code Content */}
            <pre
              className={`!m-0 !p-0 !bg-transparent flex-1 font-mono text-[13.5px] leading-relaxed text-[#e3e8f0] ${
                wrapText ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
              }`}
            >
              <code>{visibleLines.join('\n')}</code>
            </pre>
          </div>
        </div>

        {/* Collapsed Gradient Overlay with Unfold Trigger */}
        {isFolded && hiddenLinesCount > 0 && (
          <div
            onClick={() => setIsFolded(false)}
            className="absolute inset-x-0 bottom-0 flex h-28 cursor-pointer flex-col items-center justify-end bg-gradient-to-t from-[#06080b] via-[#06080b]/90 to-transparent pb-3.5 transition-all group-hover/code:via-[#06080b]/95"
            title="Click to unfold entire code snippet"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFolded(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-[#d4af37]/40 bg-[#141822]/95 px-4 py-2 text-xs font-mono text-[#f3e7cb] shadow-2xl backdrop-blur-md transition-all hover:border-[#d4af37] hover:bg-[#d4af37]/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ChevronDown className="h-3.5 w-3.5 text-[#d4af37] animate-bounce" />
              <span>Expand {hiddenLinesCount} more lines</span>
              <span className="text-[10px] text-neutral-400 font-sans">(Click to unfold)</span>
            </button>
          </div>
        )}
      </div>

      {/* Expanded Bottom Bar for Long Code Blocks */}
      {!isFolded && isCollapsible && totalLines > 16 && (
        <div className="flex items-center justify-between border-t border-white/5 bg-[#090b10] px-4 py-2 text-xs text-neutral-400 font-mono">
          <span className="text-[11px] text-neutral-500">
            {totalLines} lines in {formattedLang}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] hover:bg-white/5 hover:text-white transition-colors"
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
            <button
              type="button"
              onClick={() => setIsFolded(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-neutral-300 hover:border-[#d4af37]/30 hover:bg-white/10 hover:text-white transition-all"
            >
              <ChevronUp className="h-3 w-3 text-[#d4af37]" />
              <span>Collapse code block ↑</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
