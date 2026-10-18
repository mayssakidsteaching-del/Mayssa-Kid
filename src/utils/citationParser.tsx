import React from 'react';
import { GroundingSource, Message } from '../types';
import { CitationTooltip } from '../components/CitationTooltip';
import { highlightThematicPhrases } from './thematicHighlight';

// Regex matching [Ref X], [Ref. X], [Reference X], [RefX], [#X], or [X]
const CITATION_REGEX = /\[(?:Ref\.?\s*|Reference\s*|#)?(\d+)\]/gi;

interface ParseOptions {
  turnSources?: GroundingSource[];
  allSources?: GroundingSource[];
  readabilityMode?: boolean;
  messageIndex?: number;
  currentTurn?: number;
  allMessages?: Message[];
  keyPrefix?: string;
}

/**
 * Parses a plain text string, replaces citation tags [Ref X] with interactive CitationTooltip
 * components, and applies thematic highlights if readabilityMode is enabled.
 */
export function parseCitationsInText(
  text: string,
  options: ParseOptions = {}
): React.ReactNode {
  if (!text || typeof text !== 'string') return text;

  const {
    turnSources = [],
    allSources = [],
    readabilityMode = false,
    messageIndex,
    currentTurn,
    allMessages,
    keyPrefix = 'cite',
  } = options;

  const maxValidSources = Math.max(turnSources.length, allSources.length);

  CITATION_REGEX.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CITATION_REGEX.exec(text)) !== null) {
    const rawTag = match[0];
    const refNumStr = match[1];
    const refNum = parseInt(refNumStr, 10);
    const matchStart = match.index;
    const matchEnd = matchStart + rawTag.length;

    // Distinguish citations from random bracketed numbers:
    // If tag is explicitly [Ref X], [Reference X], [#X], always treat as citation.
    // If tag is simply [X], treat as citation if refNum is between 1 and maxValidSources.
    const isExplicitRef = /\[(?:Ref|Reference|#)/i.test(rawTag);
    const isValidBracketedNum = !isExplicitRef && refNum >= 1 && refNum <= Math.max(1, maxValidSources);

    if (!isExplicitRef && !isValidBracketedNum) {
      continue;
    }

    // Text chunk preceding this citation tag
    if (matchStart > lastIndex) {
      const textBefore = text.slice(lastIndex, matchStart);
      if (readabilityMode) {
        parts.push(highlightThematicPhrases(textBefore, `${keyPrefix}-thm-${lastIndex}`));
      } else {
        parts.push(textBefore);
      }
    }

    // Resolve matching grounding source (turn sources priority, then conversation sources)
    const matchedSource =
      (turnSources && turnSources[refNum - 1]) ||
      (allSources && allSources[refNum - 1]);

    parts.push(
      <CitationTooltip
        key={`${keyPrefix}-ref-${refNum}-${matchStart}`}
        refNumber={refNum}
        source={matchedSource}
        label={rawTag}
        messageIndex={messageIndex}
        currentTurn={currentTurn}
        allMessages={allMessages}
      />
    );

    lastIndex = matchEnd;
  }

  // Trailing text chunk
  if (lastIndex < text.length) {
    const textAfter = text.slice(lastIndex);
    if (readabilityMode) {
      parts.push(highlightThematicPhrases(textAfter, `${keyPrefix}-thm-${lastIndex}`));
    } else {
      parts.push(textAfter);
    }
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Recursively scans React children nodes (strings, arrays, elements) to inject
 * interactive citation tooltips and optional thematic highlights without altering
 * code blocks or existing links.
 */
export function renderWithCitations(
  children: React.ReactNode,
  options: ParseOptions = {}
): React.ReactNode {
  const { keyPrefix = 'citeroot' } = options;

  if (typeof children === 'string') {
    return parseCitationsInText(children, options);
  }

  if (Array.isArray(children)) {
    return children.map((child, index) =>
      renderWithCitations(child, {
        ...options,
        keyPrefix: `${keyPrefix}-${index}`,
      })
    );
  }

  if (React.isValidElement(children)) {
    const typeName = typeof children.type === 'string' ? children.type : '';
    // Skip code elements and preformatted tags
    if (typeName === 'code' || typeName === 'pre') {
      return children;
    }

    const childProps = children.props as { children?: React.ReactNode };
    if (childProps && childProps.children) {
      return React.cloneElement(
        children as React.ReactElement<{ children?: React.ReactNode }>,
        {},
        renderWithCitations(childProps.children, {
          ...options,
          keyPrefix: `${keyPrefix}-el`,
        })
      );
    }
  }

  return children;
}
