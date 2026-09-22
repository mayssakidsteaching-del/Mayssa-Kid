// Background utility to generate concise 3-word titles for conversation sessions

export function sanitizeTitle(raw: string): string {
  if (!raw) return 'Inquiry Deep Synthesis';

  const clean = raw
    .replace(/^(title|summary|topic|subject):\s*/i, '')
    .replace(/^(\d+[\.\)]|\*|-)\s*/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[#*_\-–—:;,.!?()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'and', 'or', 'for', 'of', 'to',
    'with', 'about', 'is', 'are', 'was', 'were', 'into', 'by', 'from',
  ]);

  let words = clean.split(' ').filter((w) => w.length > 0 && !stopWords.has(w.toLowerCase()));
  if (words.length < 3) {
    words = clean.split(' ').filter((w) => w.length > 0);
  }

  const toTitle = (w: string) =>
    w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';

  words = words.map(toTitle).filter(Boolean);

  if (words.length === 0) return 'Inquiry Deep Synthesis';
  if (words.length === 1) return `${words[0]} Deep Analysis`;
  if (words.length === 2) return `${words[0]} ${words[1]} Synthesis`;

  return `${words[0]} ${words[1]} ${words[2]}`;
}

export function localHeuristicTitle(userPrompt: string): string {
  let clean = userPrompt.trim();
  clean = clean.replace(
    /^(can you|please|could you)?\s*(explain|tell me about|what is|what are|why does|why do|why is|how does|how do|how to|research|compare and contrast|overview of|analysis of|deep dive into)\s+/i,
    ''
  );
  clean = clean.replace(/[?!.]+$/, '').trim();
  return sanitizeTitle(clean || userPrompt);
}

/**
 * Dispatches a non-blocking background request to summarize the conversation into 3 words.
 * Triggers after the first exchange (1 user message + 1 assistant message).
 */
export async function generateThreeWordSummary(
  userPrompt: string,
  assistantResponse?: string
): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch('/api/summarize-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt,
        assistantResponse: assistantResponse?.slice(0, 450),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.title && typeof data.title === 'string') {
        return sanitizeTitle(data.title);
      }
    }
  } catch (err) {
    console.warn('Background title summary fetch failed, using local heuristic:', err);
  }

  return localHeuristicTitle(userPrompt);
}
