import React from 'react';

/**
 * Editorial thematic phrases that carry analytical, structural, or conceptual weight.
 * In Readability Mode, these phrases receive a subtle, elegant golden underline
 * reminiscent of an editor's fine annotation.
 */
export const THEMATIC_PHRASES = [
  'from a first-principles perspective',
  'architectural thesis',
  'the central principle',
  'the primary implication',
  'empirical evidence suggests',
  'underlying philosophy',
  'the essential dynamic',
  'strategic advantage',
  'decisive advantage',
  'foundational premise',
  'the core insight',
  'first and foremost',
  'critical nuance',
  'paradigm shift',
  'the bottom line',
  'pivotal mechanism',
  'key distinction',
  'core trade-off',
  'systemic impact',
  'guiding principle',
  'pivotal concept',
  'critical finding',
  'core proposition',
  'central takeaway',
  'of particular note',
  'most significantly',
  'most importantly',
  'the definitive answer',
  'key takeaways',
  'key takeaway',
  'key insights',
  'key insight',
  'in essence',
  'at its core',
  'decisive factor',
  'primary objective',
  'fundamentally',
  'crucially',
  'in summary',
  'by contrast',
];

// Precompiled case-insensitive regex with word boundaries
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const THEMATIC_REGEX = new RegExp(
  `\\b(${THEMATIC_PHRASES.map(escapeRegex).join('|')})\\b`,
  'gi'
);

/**
 * Highlights thematic phrases within a string of text by wrapping matches
 * in a subtle golden underline span.
 */
export function highlightThematicPhrases(text: string, keyPrefix: string = 'thematic'): React.ReactNode {
  if (!text || typeof text !== 'string') return text;

  THEMATIC_REGEX.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = THEMATIC_REGEX.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    // Text before match
    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }

    // Matched thematic phrase
    const matchedText = match[0];
    parts.push(
      <span
        key={`${keyPrefix}-${matchStart}`}
        className="thematic-highlight"
        title="Key thematic phrase"
      >
        {matchedText}
      </span>
    );

    lastIndex = matchEnd;
  }

  // Trailing text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Recursively scans React children nodes (strings, arrays) to inject
 * thematic highlighting without altering code elements or links.
 */
export function renderWithThematicHighlights(children: React.ReactNode, keyPrefix: string = 'thm'): React.ReactNode {
  if (typeof children === 'string') {
    return highlightThematicPhrases(children, keyPrefix);
  }

  if (Array.isArray(children)) {
    return children.map((child, index) =>
      renderWithThematicHighlights(child, `${keyPrefix}-${index}`)
    );
  }

  if (React.isValidElement(children)) {
    // Do not alter code blocks, inline code, or preformatted text
    const typeName = typeof children.type === 'string' ? children.type : '';
    if (typeName === 'code' || typeName === 'pre' || typeName === 'a') {
      return children;
    }

    // Process children inside if element has children
    const childProps = children.props as { children?: React.ReactNode };
    if (childProps && childProps.children) {
      return React.cloneElement(
        children as React.ReactElement<{ children?: React.ReactNode }>,
        {},
        renderWithThematicHighlights(childProps.children, `${keyPrefix}-el`)
      );
    }
  }

  return children;
}
