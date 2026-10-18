import { GroundingSource } from '../types';

export interface CitationReference extends GroundingSource {
  citedInTurns?: number[];
  refNumber?: number;
}

/**
 * Escapes a string cell value for RFC 4180 compliant CSV formatting.
 */
function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  // Replace internal quotes with double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Builds standard CSV content from a list of citation references.
 */
export function buildCitationsCsv(references: CitationReference[]): string {
  const headers = [
    'Reference ID',
    'Title',
    'Hostname',
    'URL',
    'Cited in Inquiry Turns',
    'Turn Count',
    'Evidentiary Snippet',
  ];

  const rows = references.map((ref, idx) => {
    const refId = ref.refNumber ?? idx + 1;
    const title = (ref.title || ref.hostname || 'Source Citation').trim();
    const hostname = ref.hostname || (ref.url ? new URL(ref.url).hostname : 'web');
    const url = ref.url || '';
    const turnsStr =
      ref.citedInTurns && ref.citedInTurns.length > 0
        ? ref.citedInTurns.join(', ')
        : '1';
    const turnCount = ref.citedInTurns ? ref.citedInTurns.length : 1;
    const snippet = ref.snippet ? ref.snippet.trim().replace(/\s+/g, ' ') : '';

    return [
      escapeCsvCell(refId),
      escapeCsvCell(title),
      escapeCsvCell(hostname),
      escapeCsvCell(url),
      escapeCsvCell(turnsStr),
      escapeCsvCell(turnCount),
      escapeCsvCell(snippet),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Triggers a browser download of a CSV file containing citation sources.
 */
export function downloadCitationsCsv(
  references: CitationReference[],
  conversationTitle: string = 'Inquiry'
): void {
  if (!references || references.length === 0) {
    throw new Error('No citation references available to export.');
  }

  const csvContent = buildCitationsCsv(references);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Sanitize filename
  const cleanTitle = conversationTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'citations';

  link.href = url;
  link.download = `berno-${cleanTitle}-citations.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Creates an inline data URI for markdown files or anchor elements.
 */
export function createCsvDataUri(references: CitationReference[]): string {
  const csvContent = buildCitationsCsv(references);
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}
