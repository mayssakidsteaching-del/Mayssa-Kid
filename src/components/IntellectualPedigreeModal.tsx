import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  X,
  Compass,
  Download,
  ExternalLink,
  BookOpen,
  Layers,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  Globe,
  Share2,
} from 'lucide-react';
import { Conversation, GroundingSource, Message } from '../types';
import { downloadCitationsCsv, CitationReference } from '../utils/csvExport';

interface IntellectualPedigreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onNavigateToTurn?: (turnNumber: number) => void;
}

interface PedigreeSource {
  id: string;
  title: string;
  url: string;
  hostname: string;
  snippet?: string;
  firstTurn: number;
  citedInTurns: number[];
  category: string;
  occurrences: Array<{
    turn: number;
    inquiryText: string;
  }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  Academic: '#d4af37', // Gold
  Philosophy: '#a855f7', // Purple
  'Science & Tech': '#06b6d4', // Cyan
  'News & Journals': '#10b981', // Emerald
  Reference: '#f59e0b', // Amber
  General: '#94a3b8', // Slate
};

function categorizeDomain(hostname: string, title: string): string {
  const h = hostname.toLowerCase();
  const t = title.toLowerCase();

  if (
    h.includes('arxiv') ||
    h.includes('nature') ||
    h.includes('science') ||
    h.includes('ieee') ||
    h.includes('acm') ||
    h.includes('springer') ||
    h.includes('jstor') ||
    h.includes('edu') ||
    h.includes('research')
  ) {
    return 'Academic';
  }
  if (
    t.includes('philosophy') ||
    t.includes('epistemic') ||
    t.includes('ethics') ||
    h.includes('stanford.edu') ||
    h.includes('philpapers')
  ) {
    return 'Philosophy';
  }
  if (
    h.includes('github') ||
    h.includes('openai') ||
    h.includes('google') ||
    h.includes('tech') ||
    h.includes('dev')
  ) {
    return 'Science & Tech';
  }
  if (
    h.includes('nytimes') ||
    h.includes('theatlantic') ||
    h.includes('economist') ||
    h.includes('bbc') ||
    h.includes('reuters')
  ) {
    return 'News & Journals';
  }
  if (
    h.includes('wikipedia') ||
    h.includes('britannica') ||
    h.includes('archive.org')
  ) {
    return 'Reference';
  }
  return 'General';
}

export function IntellectualPedigreeModal({
  isOpen,
  onClose,
  conversation,
  onNavigateToTurn,
}: IntellectualPedigreeModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<PedigreeSource | null>(null);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Extract turn-by-turn source occurrences and build pedigree dataset
  const { sources, turnsCount, turnInquiries } = useMemo(() => {
    if (!conversation) {
      return { sources: [] as PedigreeSource[], turnsCount: 0, turnInquiries: [] as string[] };
    }

    const sourceMap = new Map<string, PedigreeSource>();
    const inquiries: string[] = [];
    let currentTurn = 0;

    for (const msg of conversation.messages) {
      if (msg.role === 'user') {
        currentTurn++;
        inquiries.push(msg.content.trim());
      } else if (msg.role === 'assistant' && msg.groundingSources && Array.isArray(msg.groundingSources)) {
        const turn = currentTurn || 1;
        const currentInquiry = inquiries[turn - 1] || 'Initial Inquiry';

        for (const s of msg.groundingSources) {
          if (!s || !s.url) continue;
          const normUrl = s.url.trim().toLowerCase();
          const host = s.hostname || (s.url ? new URL(s.url).hostname : 'web');
          const category = categorizeDomain(host, s.title || '');

          if (sourceMap.has(normUrl)) {
            const existing = sourceMap.get(normUrl)!;
            if (!existing.citedInTurns.includes(turn)) {
              existing.citedInTurns.push(turn);
              existing.occurrences.push({ turn, inquiryText: currentInquiry });
            }
          } else {
            sourceMap.set(normUrl, {
              id: normUrl,
              title: (s.title || host).trim(),
              url: s.url,
              hostname: host,
              snippet: s.snippet,
              firstTurn: turn,
              citedInTurns: [turn],
              category,
              occurrences: [{ turn, inquiryText: currentInquiry }],
            });
          }
        }
      }
    }

    const list = Array.from(sourceMap.values()).sort((a, b) => {
      // Sort by first appearance, then frequency
      if (a.firstTurn !== b.firstTurn) return a.firstTurn - b.firstTurn;
      return b.citedInTurns.length - a.citedInTurns.length;
    });

    return {
      sources: list,
      turnsCount: Math.max(1, currentTurn),
      turnInquiries: inquiries,
    };
  }, [conversation]);

  // Filter sources
  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (selectedCategory && s.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchHost = s.hostname.toLowerCase().includes(q);
        const matchSnippet = s.snippet?.toLowerCase().includes(q);
        return matchTitle || matchHost || matchSnippet;
      }
      return true;
    });
  }, [sources, selectedCategory, searchQuery]);

  // Continuity metric: sources cited in more than 1 turn
  const multiTurnSourcesCount = sources.filter((s) => s.citedInTurns.length > 1).length;
  const continuityRate = sources.length > 0
    ? Math.round((multiTurnSourcesCount / sources.length) * 100)
    : 0;

  // D3 Timeline Chart Rendering
  useEffect(() => {
    if (!isOpen || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = svgRef.current.parentElement?.clientWidth || 760;
    const width = Math.max(680, containerWidth - 32);
    const rowHeight = 36;
    const margin = { top: 40, right: 40, bottom: 50, left: 160 };
    const height = Math.max(280, margin.top + margin.bottom + filteredSources.length * rowHeight);

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);

    if (filteredSources.length === 0) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '13px')
        .attr('font-family', 'ui-monospace, monospace')
        .text('No sources recorded in this inquiry sequence.');
      return;
    }

    // Scales
    const maxTurns = Math.max(1, turnsCount);
    const xScale = d3
      .scaleLinear()
      .domain([0.5, maxTurns + 0.5])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleBand()
      .domain(filteredSources.map((s) => s.id))
      .range([margin.top, height - margin.bottom])
      .padding(0.2);

    // Background Swimlanes
    filteredSources.forEach((s, idx) => {
      const y = yScale(s.id) || 0;
      const isAlt = idx % 2 === 1;

      svg
        .append('rect')
        .attr('x', margin.left)
        .attr('y', y)
        .attr('width', width - margin.left - margin.right)
        .attr('height', yScale.bandwidth())
        .attr('fill', isAlt ? 'rgba(255, 255, 255, 0.02)' : 'transparent')
        .attr('rx', 4);
    });

    // Vertical Turn Guides
    for (let t = 1; t <= maxTurns; t++) {
      const x = xScale(t);
      svg
        .append('line')
        .attr('x1', x)
        .attr('y1', margin.top - 10)
        .attr('x2', x)
        .attr('y2', height - margin.bottom + 10)
        .attr('stroke', 'rgba(255, 255, 255, 0.08)')
        .attr('stroke-dasharray', '2,3');

      // Top Turn Label
      svg
        .append('text')
        .attr('x', x)
        .attr('y', margin.top - 18)
        .attr('text-anchor', 'middle')
        .attr('fill', '#d4af37')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('font-family', 'ui-monospace, monospace')
        .text(`Turn ${t}`);
    }

    // Y Axis Source Labels
    filteredSources.forEach((s) => {
      const y = (yScale(s.id) || 0) + yScale.bandwidth() / 2;
      const truncatedTitle =
        s.title.length > 20 ? s.title.substring(0, 19) + '…' : s.title;

      const textNode = svg
        .append('text')
        .attr('x', margin.left - 12)
        .attr('y', y + 4)
        .attr('text-anchor', 'end')
        .attr('fill', selectedSource?.id === s.id ? '#f5ebd7' : '#cbd5e1')
        .attr('font-size', '11px')
        .attr('font-weight', selectedSource?.id === s.id ? 'bold' : 'normal')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('cursor', 'pointer')
        .text(truncatedTitle)
        .on('click', () => setSelectedSource(s));

      textNode.append('title').text(`${s.title} (${s.hostname})`);
    });

    // Draw Lineage Arcs for sources cited across multiple turns
    filteredSources.forEach((s) => {
      if (s.citedInTurns.length > 1) {
        const sortedTurns = [...s.citedInTurns].sort((a, b) => a - b);
        const y = (yScale(s.id) || 0) + yScale.bandwidth() / 2;
        const color = CATEGORY_COLORS[s.category] || '#d4af37';

        const lineGenerator = d3
          .line<number>()
          .x((t) => xScale(t))
          .y(() => y);

        svg
          .append('path')
          .datum(sortedTurns)
          .attr('d', lineGenerator)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2.5)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-dasharray', '4,2');
      }
    });

    // Draw Source Nodes (Circles at turn occurrences)
    filteredSources.forEach((s) => {
      const y = (yScale(s.id) || 0) + yScale.bandwidth() / 2;
      const color = CATEGORY_COLORS[s.category] || '#d4af37';
      const isSelected = selectedSource?.id === s.id;

      s.citedInTurns.forEach((turn) => {
        const x = xScale(turn);

        const nodeGroup = svg
          .append('g')
          .attr('cursor', 'pointer')
          .on('click', () => setSelectedSource(s));

        // Outer glow on selected
        if (isSelected) {
          nodeGroup
            .append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 11)
            .attr('fill', color)
            .attr('opacity', 0.25);
        }

        // Main Node
        nodeGroup
          .append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', isSelected ? 7 : 5.5)
          .attr('fill', color)
          .attr('stroke', '#0c0e14')
          .attr('stroke-width', 2)
          .attr('filter', 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.4))');

        // Tooltip
        nodeGroup
          .append('title')
          .text(
            `${s.title}\nDomain: ${s.hostname}\nCategory: ${s.category}\nCited in Turn ${turn}`
          );
      });
    });

    // X Axis Bottom Line
    svg
      .append('line')
      .attr('x1', margin.left)
      .attr('y1', height - margin.bottom + 12)
      .attr('x2', width - margin.right)
      .attr('y2', height - margin.bottom + 12)
      .attr('stroke', 'rgba(255, 255, 255, 0.15)');

    // Bottom Axis Title
    svg
      .append('text')
      .attr('x', (width + margin.left) / 2)
      .attr('y', height - margin.bottom + 36)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-family', 'ui-monospace, monospace')
      .text('Inquiry Dialogue Sequence (Temporal Depth)');
  }, [filteredSources, turnsCount, selectedSource, isOpen]);

  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    try {
      const exportReferences: CitationReference[] = sources.map((s, idx) => ({
        refNumber: idx + 1,
        title: s.title,
        url: s.url,
        hostname: s.hostname,
        snippet: s.snippet,
        citedInTurns: s.citedInTurns,
      }));
      downloadCitationsCsv(exportReferences, conversation?.title || 'Inquiry');
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleCopyCitation = async () => {
    if (!selectedSource) return;
    const citation = `[${selectedSource.title}](${selectedSource.url}) — ${selectedSource.hostname}. Verified in Inquiry Turns: ${selectedSource.citedInTurns.join(', ')}.`;
    await navigator.clipboard.writeText(citation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] rounded-2xl border border-[#d4af37]/30 bg-[#0c0e14] shadow-2xl text-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#10131b]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37] shadow-inner">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-white tracking-wide">
                  Intellectual Pedigree
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37] bg-[#d4af37]/15 border border-[#d4af37]/30 px-2 py-0.5 rounded">
                  D3 Evidentiary Timeline
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 font-sans">
                Correlating verified evidentiary sources with conversational depth and dialectical progression
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              disabled={sources.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/15 px-3 py-1.5 text-xs font-mono text-[#f3cf65] hover:bg-[#d4af37]/25 transition-all shadow-sm disabled:opacity-40"
              title="Download consolidated CSV file containing all source titles, URLs, and snippets"
            >
              <Download className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>Download Citations (CSV)</span>
            </button>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-5 py-3 border-b border-white/5 bg-[#0e1118]">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 font-mono">
            <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">
              TOTAL SOURCES
            </span>
            <span className="text-lg font-bold text-white mt-0.5 block">
              {sources.length}
            </span>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 font-mono">
            <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">
              INQUIRY DEPTH
            </span>
            <span className="text-lg font-bold text-[#d4af37] mt-0.5 block">
              {turnsCount} {turnsCount === 1 ? 'Turn' : 'Turns'}
            </span>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 font-mono">
            <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">
              PEDIGREE CONTINUITY
            </span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
              {continuityRate}%
            </span>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 font-mono">
            <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">
              MULTI-TURN ARCS
            </span>
            <span className="text-lg font-bold text-cyan-400 mt-0.5 block">
              {multiTurnSourcesCount} sources
            </span>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-b border-white/5 bg-[#0a0c12]">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-mono transition-all ${
                selectedCategory === null
                  ? 'bg-[#d4af37]/20 text-[#f3cf65] border border-[#d4af37]/50 font-semibold'
                  : 'bg-white/5 text-neutral-400 border border-white/5 hover:text-white'
              }`}
            >
              All Categories ({sources.length})
            </button>
            {Object.keys(CATEGORY_COLORS).map((cat) => {
              const count = sources.filter((s) => s.category === cat).length;
              if (count === 0) return null;
              const isSelected = selectedCategory === cat;
              const color = CATEGORY_COLORS[cat];

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isSelected ? null : cat)}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-mono transition-all border ${
                    isSelected
                      ? 'bg-white/10 text-white font-medium shadow-sm'
                      : 'bg-white/[0.02] text-neutral-400 border-white/5 hover:text-white'
                  }`}
                  style={{ borderColor: isSelected ? color : undefined }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span>{cat}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative flex items-center min-w-[200px]">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pedigree sources..."
              className="w-full rounded-lg border border-white/10 bg-[#12151d] py-1 pl-8 pr-3 text-xs text-neutral-200 placeholder:text-neutral-500 focus:border-[#d4af37] focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Main Content Area: Chart and Dossier side-by-side */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Timeline Chart Container */}
          <div className="flex-1 overflow-auto p-4 bg-[#08090d]">
            <div className="min-w-[640px]">
              <svg ref={svgRef} className="w-full" />
            </div>
          </div>

          {/* Dossier Sidebar / Inspection Panel */}
          {selectedSource ? (
            <div className="w-full md:w-84 border-t md:border-t-0 md:border-l border-white/10 bg-[#0f121a] p-4 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                  EVIDENTIARY DOSSIER
                </span>
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-mono font-medium"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[selectedSource.category]}20`,
                    color: CATEGORY_COLORS[selectedSource.category],
                    border: `1px solid ${CATEGORY_COLORS[selectedSource.category]}40`,
                  }}
                >
                  {selectedSource.category}
                </span>
              </div>

              {/* Title & Host */}
              <h3 className="font-serif text-sm font-semibold text-white leading-snug">
                {selectedSource.title}
              </h3>

              <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">
                <Globe className="h-3 w-3 text-[#d4af37]" />
                <span>{selectedSource.hostname}</span>
              </div>

              {/* URL */}
              <a
                href={selectedSource.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1 text-[11px] font-mono text-[#d4af37] hover:underline truncate"
                title={selectedSource.url}
              >
                <span className="truncate">{selectedSource.url}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>

              {/* Snippet */}
              {selectedSource.snippet && (
                <div className="mt-3 rounded-lg border border-white/5 bg-black/40 p-3 text-xs italic text-neutral-300 leading-relaxed font-serif">
                  "{selectedSource.snippet}"
                </div>
              )}

              {/* Inquiry Turns Occurrence Breakdown */}
              <div className="mt-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block mb-2">
                  DIALOGUE OCCURRENCES ({selectedSource.citedInTurns.length})
                </span>
                <div className="space-y-1.5">
                  {selectedSource.occurrences.map((occ) => (
                    <div
                      key={occ.turn}
                      className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                        <span className="text-[#d4af37] font-semibold">
                          Turn {occ.turn}
                        </span>
                        {onNavigateToTurn && (
                          <button
                            onClick={() => {
                              onNavigateToTurn(occ.turn);
                              onClose();
                            }}
                            className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition-colors"
                          >
                            <span>Jump</span>
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-2">
                        {occ.inquiryText}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Copy Citation Button */}
              <div className="mt-auto pt-4 border-t border-white/10">
                <button
                  onClick={handleCopyCitation}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 font-mono text-xs text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {copiedCitation ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Citation Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Citation Format</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex w-84 border-l border-white/10 bg-[#0f121a] p-6 flex-col items-center justify-center text-center">
              <Compass className="h-10 w-10 text-neutral-600 mb-3" />
              <h4 className="font-serif text-sm font-semibold text-neutral-300">
                Inspect Intellectual Pedigree
              </h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                Click any citation node or source title on the timeline to inspect its verified quotations, domains, and conversational depth context.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
