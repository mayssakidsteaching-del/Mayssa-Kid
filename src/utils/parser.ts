export interface ParsedMessageContent {
  thinking: string;
  response: string;
  isThinking: boolean;
}

export function parseRawMessage(raw: string): ParsedMessageContent {
  if (!raw) {
    return { thinking: '', response: '', isThinking: false };
  }

  const thinkingStartTag = '<thinking>';
  const thinkingEndTag = '</thinking>';

  const startIndex = raw.indexOf(thinkingStartTag);

  if (startIndex === -1) {
    // No thinking tag found
    return {
      thinking: '',
      response: raw.trim(),
      isThinking: false,
    };
  }

  const endIndex = raw.indexOf(thinkingEndTag);

  if (endIndex === -1) {
    // Thinking is currently in progress
    const thinking = raw.substring(startIndex + thinkingStartTag.length).trim();
    return {
      thinking,
      response: '',
      isThinking: true,
    };
  }

  // Thinking completed
  const thinking = raw.substring(startIndex + thinkingStartTag.length, endIndex).trim();
  const beforeThinking = raw.substring(0, startIndex).trim();
  const afterThinking = raw.substring(endIndex + thinkingEndTag.length).trim();

  const response = [beforeThinking, afterThinking].filter(Boolean).join('\n\n').trim();

  return {
    thinking,
    response,
    isThinking: false,
  };
}
