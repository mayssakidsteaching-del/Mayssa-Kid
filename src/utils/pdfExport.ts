import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Conversation } from '../types';

export interface PdfExportOptions {
  theme?: 'editorial_dark' | 'editorial_light';
  includeThinking?: boolean;
  executiveSummary?: string;
}

/**
 * Generates an editorial, publication-grade PDF document of a Berno conversation
 * using html2canvas and jsPDF, preserving the Berno typography, gold accents,
 * thought arcs, and high-contrast styling.
 */
export async function exportConversationToPdf(
  conversation: Conversation,
  options: PdfExportOptions = {}
): Promise<void> {
  const { theme = 'editorial_dark', includeThinking = true, executiveSummary } = options;

  if (!conversation || conversation.messages.length === 0) {
    throw new Error('Cannot export an empty conversation.');
  }

  // Create an off-screen render container with fixed A4 aspect width (794px at 96 DPI)
  const container = document.createElement('div');
  container.id = 'berno-pdf-export-container';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.minHeight = '1123px';
  container.style.zIndex = '-9999';
  container.style.padding = '48px 52px';
  container.style.fontFamily = 'Georgia, Cambria, "Times New Roman", Times, serif';
  container.style.boxSizing = 'border-box';

  const isDark = theme === 'editorial_dark';
  const bgColor = isDark ? '#0c0e14' : '#ffffff';
  const textColor = isDark ? '#e4e7ec' : '#1a1d24';
  const mutedColor = isDark ? '#9aa1b2' : '#5f6775';
  const borderColor = isDark ? '#232836' : '#e2e6ed';
  const accentGold = '#d4af37';
  const cardBgUser = isDark ? '#141722' : '#f4f6f9';
  const cardBgAssistant = isDark ? '#10131c' : '#ffffff';
  const thinkingBg = isDark ? '#0d1017' : '#f8f9fb';
  const codeBg = isDark ? '#07090e' : '#f1f3f7';

  container.style.backgroundColor = bgColor;
  container.style.color = textColor;

  // Build the HTML content
  const formattedDate = new Date(conversation.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let html = `
    <!-- Header Document Title -->
    <div style="border-bottom: 2px solid ${accentGold}; padding-bottom: 24px; margin-bottom: 32px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: ${accentGold}; margin-bottom: 8px;">
            Berno Cognitive Synthesis
          </div>
          <h1 style="font-size: 28px; font-weight: 700; line-height: 1.25; margin: 0 0 10px 0; color: ${textColor}; letter-spacing: -0.01em;">
            ${escapeHtml(conversation.title)}
          </h1>
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: ${mutedColor}; display: flex; gap: 16px;">
            <span><strong>Date:</strong> ${formattedDate}</span>
            <span>•</span>
            <span><strong>Mode:</strong> ${formatModeName(conversation.mode)}</span>
            <span>•</span>
            <span><strong>Exchanges:</strong> ${Math.ceil(conversation.messages.length / 2)}</span>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-family: Georgia, serif; font-size: 26px; font-weight: 800; color: ${accentGold};">
            BERNO
          </div>
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: ${mutedColor};">
            Intellectual Core
          </div>
        </div>
      </div>
    </div>

    ${
      executiveSummary
        ? `
    <!-- Session Executive Summary -->
    <div style="border: 1px solid ${accentGold}55; border-left: 4px solid ${accentGold}; background: ${
            isDark ? '#121622' : '#f9fafc'
          }; border-radius: 8px; padding: 22px 26px; margin-bottom: 34px; box-shadow: 0 4px 16px rgba(0,0,0,0.18);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid ${borderColor}; padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: ${accentGold}; background: ${accentGold}18; border: 1px solid ${accentGold}40; padding: 3px 8px; border-radius: 4px;">
            Executive Synthesis Arc
          </span>
          <h2 style="font-family: Georgia, Cambria, serif; font-size: 17px; font-weight: 700; color: ${textColor}; margin: 0; letter-spacing: -0.01em;">
            Session Executive Summary
          </h2>
        </div>
        <span style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10px; color: ${mutedColor}; font-style: italic;">
          AI-generated from full conversation thread
        </span>
      </div>
      <div style="font-family: Georgia, Cambria, serif; font-size: 13.5px; line-height: 1.75; color: ${textColor};">
        ${formatMarkdownForPdf(executiveSummary, codeBg, isDark)}
      </div>
    </div>
    `
        : ''
    }

    <!-- Messages Flow -->
    <div style="display: flex; flex-direction: column; gap: 28px;">
  `;

  conversation.messages.forEach((msg, idx) => {
    const isUser = msg.role === 'user';

    if (isUser) {
      html += `
        <div style="background-color: ${cardBgUser}; border: 1px solid ${borderColor}; border-radius: 10px; padding: 18px 22px; margin-bottom: 12px; break-inside: avoid;">
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${accentGold}; margin-bottom: 8px;">
            Inquiry [${Math.floor(idx / 2) + 1}]
          </div>
          <div style="font-size: 15px; line-height: 1.6; color: ${textColor}; white-space: pre-wrap;">
            ${escapeHtml(msg.content)}
          </div>
        </div>
      `;
    } else {
      html += `
        <div style="background-color: ${cardBgAssistant}; border: 1px solid ${borderColor}; border-radius: 10px; padding: 22px 24px; margin-bottom: 24px; break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid ${borderColor}; padding-bottom: 8px;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${accentGold};">
              Berno Synthesis
            </div>
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10px; color: ${mutedColor};">
              ${msg.model || 'Cognitive Reserve'}
            </div>
          </div>
      `;

      // Thought Arc
      if (includeThinking && msg.thinkingContent && msg.thinkingContent.trim().length > 0) {
        html += `
          <div style="background-color: ${thinkingBg}; border-left: 3px solid ${accentGold}; padding: 12px 16px; margin-bottom: 18px; border-radius: 0 6px 6px 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11.5px; line-height: 1.55; color: ${mutedColor}; white-space: pre-wrap;">
            <div style="font-weight: 700; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.1em; color: ${accentGold}; margin-bottom: 6px;">
              Cognitive Reasoning Arc
            </div>
            ${escapeHtml(msg.thinkingContent.trim())}
          </div>
        `;
      }

      // Synthesis Response Body
      html += `
          <div style="font-size: 14.5px; line-height: 1.7; color: ${textColor};">
            ${formatMarkdownForPdf(msg.content, codeBg, isDark)}
          </div>
      `;

      // Grounding Sources
      if (msg.groundingSources && msg.groundingSources.length > 0) {
        html += `
          <div style="margin-top: 18px; padding-top: 12px; border-top: 1px dashed ${borderColor}; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: ${mutedColor};">
            <div style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${accentGold}; margin-bottom: 6px;">
              Empirical Sources & References
            </div>
            <ul style="margin: 0; padding-left: 18px; line-height: 1.6;">
              ${msg.groundingSources
                .map(
                  (s, sIdx) => `
                <li>
                  <span style="color: ${textColor}; font-weight: 500;">${escapeHtml(s.title || 'Source')}</span>
                  <span style="color: ${mutedColor};">(${escapeHtml(s.hostname || 'Web')})</span>
                </li>
              `
                )
                .join('')}
            </ul>
          </div>
        `;
      }

      html += `</div>`;
    }
  });

  // Document Footer
  html += `
    </div>
    <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid ${borderColor}; text-align: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10px; color: ${mutedColor}; letter-spacing: 0.05em;">
      Generated by Berno Cognitive Core • Advanced Multidimensional Reasoning • Confidential Editorial Export
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Render using html2canvas at scale 2 for high crispness
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: bgColor,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Initialize jsPDF A4 in mm: 210mm wide x 297mm high
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;

    const imgProps = pdf.getImageProperties(imgData);
    const canvasRatio = imgProps.height / imgProps.width;
    const totalPdfHeight = pdfWidth * canvasRatio;

    let heightLeft = totalPdfHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalPdfHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    // Remaining pages if document overflows A4 height
    while (heightLeft > 0) {
      position = heightLeft - totalPdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalPdfHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    const sanitizedTitle = (conversation.title || 'conversation')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    pdf.save(`berno-${sanitizedTitle || 'document'}.pdf`);
  } finally {
    // Clean up offscreen element
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatModeName(mode?: string): string {
  switch (mode) {
    case 'deep_reasoning':
      return 'Deep Multilateral Reasoning';
    case 'executive_synthesis':
      return 'Executive Synthesis';
    case 'architectural_code':
      return 'Architectural Engineering';
    case 'counter_perspective':
      return 'Adversarial Counter-Perspective';
    default:
      return 'Cognitive Reasoning';
  }
}

function formatMarkdownForPdf(rawText: string, codeBg: string, isDark: boolean): string {
  if (!rawText) return '';

  let text = escapeHtml(rawText);

  // Format code blocks
  text = text.replace(/```([a-z0-9_+-]*)\n([\s\S]*?)```/gi, (_match, lang, code) => {
    return `<div style="background-color: ${codeBg}; border: 1px solid ${isDark ? '#262c3a' : '#d8dde6'}; border-radius: 6px; padding: 12px 14px; margin: 12px 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; font-size: 12px; line-height: 1.45; overflow-x: auto; white-space: pre-wrap;"><div style="font-size: 10px; color: #d4af37; text-transform: uppercase; margin-bottom: 4px;">${lang || 'code'}</div>${code}</div>`;
  });

  // Format inline code
  text = text.replace(/`([^`]+)`/g, (_match, code) => {
    return `<code style="background-color: ${codeBg}; border: 1px solid ${isDark ? '#262c3a' : '#d8dde6'}; padding: 1px 4px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;">${code}</code>`;
  });

  // Format bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Format italic
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Format headers
  text = text.replace(/^### (.*$)/gim, '<h3 style="font-size: 16px; font-weight: 700; margin: 16px 0 8px 0; color: #d4af37;">$1</h3>');
  text = text.replace(/^## (.*$)/gim, '<h2 style="font-size: 18px; font-weight: 700; margin: 20px 0 10px 0;">$1</h2>');
  text = text.replace(/^# (.*$)/gim, '<h1 style="font-size: 22px; font-weight: 800; margin: 24px 0 12px 0;">$1</h1>');

  // Format bullet lists
  text = text.replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-bottom: 4px;">$1</li>');

  // Format numbered lists
  text = text.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li style="margin-bottom: 4px;">$2</li>');

  // Convert double line breaks into paragraphs
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h1') ||
        trimmed.startsWith('<h2') ||
        trimmed.startsWith('<h3') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<li')
      ) {
        return trimmed;
      }
      return `<p style="margin: 0 0 12px 0; line-height: 1.7;">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');
}

export interface ReadingStatsReportData {
  focusSeconds: number;
  dailyMinutes: number;
  dailyArticlesFinished: number;
  dailyWords: number;
  goalMinutes: number;
  conversationTitle?: string;
}

/**
 * Generates an editorial PDF report of reading session statistics.
 */
export async function exportReadingStatsToPdf(data: ReadingStatsReportData): Promise<void> {
  const container = document.createElement('div');
  container.id = 'berno-reading-stats-pdf';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.minHeight = '600px';
  container.style.padding = '48px';
  container.style.backgroundColor = '#0c0e14';
  container.style.color = '#e4e7ec';
  container.style.fontFamily = 'Georgia, serif';

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const focusMins = Math.floor(data.focusSeconds / 60);
  const totalMins = data.dailyMinutes + focusMins;
  const goalPct = Math.min(100, Math.round((totalMins / Math.max(1, data.goalMinutes)) * 100));

  container.innerHTML = `
    <div style="border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="font-size: 26px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0; letter-spacing: 0.02em;">Berno Editorial Intelligence</h1>
        <p style="font-size: 13px; color: #d4af37; margin: 0; font-family: monospace;">Daily Reading & Cognitive Engagement Summary</p>
      </div>
      <div style="text-align: right; font-family: monospace; font-size: 11px; color: #9aa1b2;">
        ${dateStr}
      </div>
    </div>

    <div style="background: rgba(212, 175, 55, 0.05); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 28px;">
      <h2 style="font-size: 18px; margin: 0 0 16px 0; color: #f5ebd7;">Reading Telemetry Overview</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
        <div style="background: #141722; padding: 16px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 11px; color: #d4af37; font-family: monospace;">DAILY READING TIME</div>
          <div style="font-size: 28px; font-weight: bold; color: #ffffff; margin-top: 4px;">${totalMins} <span style="font-size: 14px; font-weight: normal; color: #9aa1b2;">min</span></div>
          <div style="font-size: 11px; color: #9aa1b2; margin-top: 4px;">Goal: ${data.goalMinutes} min (${goalPct}%)</div>
        </div>

        <div style="background: #141722; padding: 16px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 11px; color: #d4af37; font-family: monospace;">ARTICLES COMPLETED</div>
          <div style="font-size: 28px; font-weight: bold; color: #ffffff; margin-top: 4px;">${data.dailyArticlesFinished}</div>
          <div style="font-size: 11px; color: #9aa1b2; margin-top: 4px;">100% Scroll Depth</div>
        </div>

        <div style="background: #141722; padding: 16px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 11px; color: #d4af37; font-family: monospace;">WORDS EXPLORED</div>
          <div style="font-size: 28px; font-weight: bold; color: #ffffff; margin-top: 4px;">${data.dailyWords.toLocaleString()}</div>
          <div style="font-size: 11px; color: #9aa1b2; margin-top: 4px;">At ~250 WPM Benchmark</div>
        </div>
      </div>
    </div>

    <div style="background: #10131c; border-radius: 12px; padding: 20px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 24px;">
      <h3 style="font-size: 14px; color: #ffffff; margin: 0 0 10px 0;">Focus Session Engagement Details</h3>
      <p style="font-size: 12px; color: #9aa1b2; line-height: 1.6; margin: 0;">
        Active engagement tracked during this session: <strong>${focusMins} minutes ${data.focusSeconds % 60} seconds</strong>. 
        Focus timer automatically pauses during idle periods to ensure pure, uninflated metrics.
      </p>
    </div>

    <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 16px; display: flex; justify-content: space-between; font-size: 10px; font-family: monospace; color: #6b7280;">
      <span>Berno Cognitive Architecture • Infinite IQ Core</span>
      <span>Confidential & Certified Personal Telemetry</span>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0c0e14',
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`berno-reading-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

