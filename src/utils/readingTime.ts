/**
 * Reading time calculation utility
 * Based on empirical human reading speed:
 * - Average adult silent reading speed: 200–230 words per minute (WPM)
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

export function calculateReadingTime(text: string, averageWpm: number = 210): ReadingTimeResult {
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
