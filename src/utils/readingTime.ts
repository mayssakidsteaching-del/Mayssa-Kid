/**
 * Reading time calculation utility
 * Based on editorial reading standards:
 * - Average reading speed: 250 words per minute (WPM)
 * - Technical code comprehension: ~80–100 words/tokens per minute
 * - CJK (Chinese, Japanese, Korean) reading speed: ~350–400 characters per minute
 */

export interface ReadingTimeResult {
  minutes: number;
  seconds: number;
  wordCount: number;
  cjkCount: number;
  codeLines: number;
  display: string;
  tooltip: string;
}

export function calculateWordCount(text: string): number {
  if (!text || !text.trim()) return 0;
  const cleanText = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
  if (!cleanText) return 0;

  const cjkMatches = cleanText.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  const normalized = cleanText
    .replace(/```[a-zA-Z0-9_-]*\n?/g, ' ')
    .replace(/```/g, ' ')
    .replace(/[#*`_~>[\]()!+=|\\-]/g, ' ')
    .replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, ' ')
    .trim();

  const words = normalized ? normalized.split(/\s+/).filter(Boolean) : [];
  return words.length + cjkCount;
}

export function calculateReadingTime(text: string, averageWpm: number = 250): ReadingTimeResult {
  if (!text || !text.trim()) {
    return {
      minutes: 0,
      seconds: 0,
      wordCount: 0,
      cjkCount: 0,
      codeLines: 0,
      display: '< 1 min read',
      tooltip: '0 words • Instant read',
    };
  }

  // 1. Separate code blocks from regular prose
  let codeSnippetChars = 0;
  let codeLines = 0;
  const prose = text.replace(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_, codeContent) => {
    codeSnippetChars += codeContent.length;
    codeLines += (codeContent.match(/\n/g) || []).length + 1;
    return ' ';
  });

  // 2. Count CJK characters (Chinese, Japanese Kanji/Kana, Korean Hangul)
  const cjkMatches = prose.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  // 3. Count alphabetic / space-delimited words (Latin, Cyrillic, Arabic, Greek, etc.)
  // Remove markdown symbols and punctuation for clean word separation
  const cleanProse = prose
    .replace(/[#*`_~>[\]()!+=|\\-]/g, ' ')
    .replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, ' ')
    .trim();

  const words = cleanProse ? cleanProse.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  // 4. Calculate reading time across components:
  // - Words: wordCount / averageWpm (mins)
  // - CJK: cjkCount / 360 chars/min
  // - Code: codeLines * 2.5 seconds per line (technical evaluation)
  const proseMinutes = (wordCount / averageWpm) + (cjkCount / 360);
  const codeSeconds = codeLines * 2.5;

  const totalSeconds = Math.max(5, Math.round(proseMinutes * 60 + codeSeconds));
  const roundedMinutes = Math.max(1, Math.round(totalSeconds / 60));

  let display = '';
  if (totalSeconds < 45) {
    display = '< 1 min read';
  } else if (totalSeconds <= 75) {
    display = '1 min read';
  } else {
    display = `${roundedMinutes} min read`;
  }

  const totalEffectiveUnits = wordCount + cjkCount;
  const tooltipParts: string[] = [];
  if (totalEffectiveUnits > 0) {
    tooltipParts.push(`${totalEffectiveUnits.toLocaleString()} words`);
  }
  if (codeLines > 0) {
    tooltipParts.push(`${codeLines} code lines`);
  }
  tooltipParts.push(`~${Math.round(totalSeconds)}s estimated at ${averageWpm} WPM`);

  return {
    minutes: roundedMinutes,
    seconds: totalSeconds,
    wordCount: totalEffectiveUnits,
    cjkCount,
    codeLines,
    display,
    tooltip: tooltipParts.join(' • '),
  };
}

export interface MessageReadingStats {
  id: string;
  role: 'user' | 'assistant';
  wordCount: number;
  readingSeconds: number;
}

export interface ConversationReadingStats {
  totalWords: number;
  totalSeconds: number;
  assistantWords: number;
  assistantSeconds: number;
  formattedTotal: string;
  messageStats: MessageReadingStats[];
}

/**
 * Calculates aggregate reading metrics across all messages in a conversation
 * based on the 250 WPM benchmark.
 */
export function calculateConversationStats(
  messages: Array<{ id: string; role: string; content?: string; rawContent?: string }>,
  averageWpm: number = 250
): ConversationReadingStats {
  let totalWords = 0;
  let totalSeconds = 0;
  let assistantWords = 0;
  let assistantSeconds = 0;

  const messageStats: MessageReadingStats[] = messages.map((m) => {
    const text = m.content || m.rawContent || '';
    const words = calculateWordCount(text);
    const reading = calculateReadingTime(text, averageWpm);
    const seconds = reading.seconds || Math.max(2, Math.round((words / averageWpm) * 60));

    totalWords += words;
    totalSeconds += seconds;

    if (m.role === 'assistant') {
      assistantWords += words;
      assistantSeconds += seconds;
    }

    return {
      id: m.id,
      role: m.role as 'user' | 'assistant',
      wordCount: words,
      readingSeconds: seconds,
    };
  });

  const roundedMinutes = Math.max(1, Math.round(totalSeconds / 60));
  let formattedTotal = '';
  if (totalSeconds < 45) {
    formattedTotal = '< 1 min read';
  } else if (totalSeconds <= 75) {
    formattedTotal = '1 min read';
  } else {
    formattedTotal = `${roundedMinutes} min read`;
  }

  return {
    totalWords,
    totalSeconds,
    assistantWords,
    assistantSeconds,
    formattedTotal,
    messageStats,
  };
}
