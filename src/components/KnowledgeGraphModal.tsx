import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  X,
  Share2,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Layers,
  Filter,
  ExternalLink,
  BookOpen,
  Hash,
  Download,
  Info,
} from 'lucide-react';
import { Conversation, Message } from '../types';
import { THEMATIC_PHRASES } from '../utils/thematicHighlight';

interface KnowledgeGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onNavigateToTurn?: (turnNumber: number) => void;
}

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  category: string;
  frequency: number;
  radius: number;
  turns: number[];
  color: string;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
}

const CATEGORY_PALETTE: Record<string, string> = {
  'Epistemology & Philosophy': '#d4af37', // Gold
  'Empirical Grounding': '#06b6d4', // Cyan
  'Cognitive Architecture': '#a855f7', // Purple
  'Scientific Methodology': '#10b981', // Emerald
  'Core Discourse': '#f59e0b', // Amber
  'Entities & Topics': '#e2e8f0', // Silver
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'more', 'about',
  'what', 'when', 'which', 'their', 'there', 'would', 'could', 'should', 'been',
  'were', 'into', 'also', 'some', 'than', 'them', 'these', 'other', 'only', 'most',
  'over', 'such', 'then', 'very', 'even', 'does', 'through', 'where', 'after',
]);

function extractEntitiesAndConcepts(conversation: Conversation | null) {
  if (!conversation || conversation.messages.length === 0) {
    return { nodes: [] as GraphNode[], links: [] as GraphLink[] };
  }

  const conceptTurnOccurrences = new Map<string, { count: number; turns: Set<number>; category: string }>();
  const turnConcepts = new Map<number, Set<string>>();

  let currentTurn = 0;

  for (const msg of conversation.messages) {
    if (msg.role === 'user') {
      currentTurn++;
    }
    const turn = currentTurn || 1;
    if (!turnConcepts.has(turn)) {
      turnConcepts.set(turn, new Set());
    }

    const textToScan = `${msg.content || ''} ${msg.thinkingContent || ''}`;

    // 1. Match known thematic phrases
    for (const phrase of THEMATIC_PHRASES) {
      if (textToScan.toLowerCase().includes(phrase.toLowerCase())) {
        const canonical = phrase.trim();
        if (!conceptTurnOccurrences.has(canonical)) {
          conceptTurnOccurrences.set(canonical, {
            count: 0,
            turns: new Set(),
            category: 'Epistemology & Philosophy',
          });
        }
        const data = conceptTurnOccurrences.get(canonical)!;
        data.count++;
        data.turns.add(turn);
        turnConcepts.get(turn)!.add(canonical);
      }
    }

    // 2. Extract bolded terms: **Concept**
    const boldMatches = textToScan.matchAll(/\*\*([A-Za-z0-9\s\-–]{3,35})\*\*/g);
    for (const match of boldMatches) {
      const term = match[1].trim();
      if (term.length > 3 && !STOP_WORDS.has(term.toLowerCase())) {
        if (!conceptTurnOccurrences.has(term)) {
          conceptTurnOccurrences.set(term, {
            count: 0,
            turns: new Set(),
            category: 'Core Discourse',
          });
        }
        const data = conceptTurnOccurrences.get(term)!;
        data.count += 2;
        data.turns.add(turn);
        turnConcepts.get(turn)!.add(term);
      }
    }

    // 3. Extract Capitalized Named Concept Pairs (e.g., "Bayesian Inference", "Epistemic Rigor")
    const capitalizedMatches = textToScan.matchAll(/\b([A-Z][a-z]{3,}\s[A-Z][a-z]{3,})\b/g);
    for (const match of capitalizedMatches) {
      const pair = match[1].trim();
      if (!STOP_WORDS.has(pair.toLowerCase())) {
        let cat = 'Entities & Topics';
        if (pair.includes('Epistemic') || pair.includes('Philosophy') || pair.includes('Truth')) {
          cat = 'Epistemology & Philosophy';
        } else if (pair.includes('Grounding') || pair.includes('Empirical') || pair.includes('Data')) {
          cat = 'Empirical Grounding';
        } else if (pair.includes('Neural') || pair.includes('Model') || pair.includes('Architecture')) {
          cat = 'Cognitive Architecture';
        }

        if (!conceptTurnOccurrences.has(pair)) {
          conceptTurnOccurrences.set(pair, {
            count: 0,
            turns: new Set(),
            category: cat,
          });
        }
        const data = conceptTurnOccurrences.get(pair)!;
        data.count++;
        data.turns.add(turn);
        turnConcepts.get(turn)!.add(pair);
      }
    }

    // 4. Grounding source domains as entities
    if (msg.groundingSources && Array.isArray(msg.groundingSources)) {
      for (const s of msg.groundingSources) {
        if (s.hostname) {
          const hostName = s.hostname.replace(/^www\./, '');
          if (!conceptTurnOccurrences.has(hostName)) {
            conceptTurnOccurrences.set(hostName, {
              count: 0,
              turns: new Set(),
              category: 'Scientific Methodology',
            });
          }
          const data = conceptTurnOccurrences.get(hostName)!;
          data.count += 3;
          data.turns.add(turn);
          turnConcepts.get(turn)!.add(hostName);
        }
      }
    }
  }

  // Ensure title keywords are included if not present
  if (conversation.title) {
    const titleWords = conversation.title
      .replace(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4 && !STOP_WORDS.has(w.toLowerCase()));

    for (const w of titleWords) {
      const cap = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      if (!conceptTurnOccurrences.has(cap)) {
        conceptTurnOccurrences.set(cap, {
          count: 3,
          turns: new Set([1]),
          category: 'Core Discourse',
        });
        turnConcepts.get(1)?.add(cap);
      }
    }
  }

  // Filter top concepts (limit to max 38 for high clarity and performance)
  const sortedConcepts = Array.from(conceptTurnOccurrences.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 36);

  const topConceptNames = new Set(sortedConcepts.map(([name]) => name));

  // Build Nodes
  const nodes: GraphNode[] = sortedConcepts.map(([name, data]) => {
    const color = CATEGORY_PALETTE[data.category] || '#d4af37';
    const radius = Math.min(22, Math.max(9, 8 + Math.sqrt(data.count) * 3));
    return {
      id: name,
      label: name,
      category: data.category,
      frequency: data.count,
      turns: Array.from(data.turns).sort((a, b) => a - b),
      radius,
      color,
    };
  });

  // Build Links from Co-occurrences in turns
  const linkMap = new Map<string, number>();

  turnConcepts.forEach((conceptsInTurn) => {
    const conceptArr = Array.from(conceptsInTurn).filter((c) => topConceptNames.has(c));
    for (let i = 0; i < conceptArr.length; i++) {
      for (let j = i + 1; j < conceptArr.length; j++) {
        const u = conceptArr[i];
        const v = conceptArr[j];
        const key = u < v ? `${u}__${v}` : `${v}__${u}`;
        linkMap.set(key, (linkMap.get(key) || 0) + 1);
      }
    }
  });

  const links: GraphLink[] = [];
  linkMap.forEach((weight, key) => {
    const [source, target] = key.split('__');
    links.push({
      source,
      target,
      weight,
    });
  });

  return { nodes, links };
}

export function KnowledgeGraphModal({
  isOpen,
  onClose,
  conversation,
  onNavigateToTurn,
}: KnowledgeGraphModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [chargeStrength, setChargeStrength] = useState(-260);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Extract raw graph
  const rawGraph = useMemo(() => {
    return extractEntitiesAndConcepts(conversation);
  }, [conversation]);

  // Filtered graph
  const filteredData = useMemo(() => {
    let nodes = rawGraph.nodes;
    if (selectedCategory) {
      nodes = nodes.filter((n) => n.category === selectedCategory);
    }
    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = rawGraph.links.filter((l) => {
      const srcId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tgtId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      return nodeIds.has(srcId as string) && nodeIds.has(tgtId as string);
    });

    return { nodes, links };
  }, [rawGraph, selectedCategory]);

  // Related connections for selected node
  const connectedNodes = useMemo(() => {
    if (!selectedNode) return [];
    const neighbors: Array<{ node: GraphNode; weight: number }> = [];

    rawGraph.links.forEach((l) => {
      const srcId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tgtId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;

      if (srcId === selectedNode.id) {
        const targetNode = rawGraph.nodes.find((n) => n.id === tgtId);
        if (targetNode) neighbors.push({ node: targetNode, weight: l.weight });
      } else if (tgtId === selectedNode.id) {
        const sourceNode = rawGraph.nodes.find((n) => n.id === srcId);
        if (sourceNode) neighbors.push({ node: sourceNode, weight: l.weight });
      }
    });

    return neighbors.sort((a, b) => b.weight - a.weight);
  }, [selectedNode, rawGraph]);

  // Contextual text quotes mentioning the selected node
  const occurrenceQuotes = useMemo(() => {
    if (!selectedNode || !conversation) return [];
    const quotes: Array<{ turn: number; snippet: string }> = [];
    let turn = 0;

    for (const msg of conversation.messages) {
      if (msg.role === 'user') turn++;
      const currentTurn = turn || 1;
      const text = `${msg.content} ${msg.thinkingContent || ''}`;
      const idx = text.toLowerCase().indexOf(selectedNode.label.toLowerCase());
      if (idx !== -1) {
        const start = Math.max(0, idx - 45);
        const end = Math.min(text.length, idx + selectedNode.label.length + 55);
        const snippet = (start > 0 ? '…' : '') + text.substring(start, end).replace(/\n/g, ' ') + (end < text.length ? '…' : '');
        quotes.push({ turn: currentTurn, snippet });
        if (quotes.length >= 4) break;
      }
    }

    return quotes;
  }, [selectedNode, conversation]);

  // D3 Graph Render
  useEffect(() => {
    if (!isOpen || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = svgRef.current.parentElement?.clientWidth || 760;
    const containerHeight = svgRef.current.parentElement?.clientHeight || 560;
    const width = Math.max(680, containerWidth);
    const height = Math.max(480, containerHeight);

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('class', 'graph-container');

    // Setup Zoom Behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    if (filteredData.nodes.length === 0) {
      g.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '13px')
        .attr('font-family', 'ui-monospace, monospace')
        .text('No concept relationships found for this inquiry selection.');
      return;
    }

    // Clone data for simulation
    const nodesCopy: GraphNode[] = filteredData.nodes.map((d) => ({ ...d }));
    const linksCopy: GraphLink[] = filteredData.links.map((d) => ({
      source: typeof d.source === 'object' ? (d.source as GraphNode).id : d.source,
      target: typeof d.target === 'object' ? (d.target as GraphNode).id : d.target,
      weight: d.weight,
    }));

    // Setup Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodesCopy)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(linksCopy)
          .id((d) => d.id)
          .distance((d) => Math.max(50, 110 - (d.weight || 1) * 12))
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius((d) => d.radius + 12));

    simulationRef.current = simulation;

    // Draw Links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(linksCopy)
      .enter()
      .append('line')
      .attr('stroke', 'rgba(212, 175, 55, 0.25)')
      .attr('stroke-width', (d) => Math.min(4.5, Math.max(1, Math.sqrt(d.weight) * 1.5)))
      .attr('stroke-opacity', 0.6);

    // Draw Nodes Group
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodesCopy)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node Outer Ring
    node
      .append('circle')
      .attr('r', (d) => d.radius + 3)
      .attr('fill', 'transparent')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4);

    // Node Circle
    node
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.85)
      .attr('stroke', '#0c0e14')
      .attr('stroke-width', 2)
      .attr('filter', 'drop-shadow(0 0 5px rgba(212, 175, 55, 0.35))');

    // Node Labels
    if (showLabels) {
      node
        .append('text')
        .attr('dy', (d) => d.radius + 13)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f5ebd7')
        .attr('font-size', '10.5px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', '500')
        .attr('pointer-events', 'none')
        .text((d) => (d.label.length > 18 ? d.label.substring(0, 16) + '…' : d.label));
    }

    // Tooltip
    node.append('title').text((d) => `${d.label}\nCategory: ${d.category}\nMentions: ${d.frequency}`);

    // Node Click & Hover Interactions
    node
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      })
      .on('mouseenter', function (event, d) {
        // Highlight active node & links
        node.style('opacity', (o) => (o.id === d.id ? 1 : 0.3));
        link.style('opacity', (l: any) =>
          l.source.id === d.id || l.target.id === d.id ? 1 : 0.08
        );
        d3.select(this).style('opacity', 1);
      })
      .on('mouseleave', () => {
        node.style('opacity', 1);
        link.style('opacity', 0.6);
      });

    // Tick updates
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredData, isOpen, showLabels, chargeStrength]);

  if (!isOpen) return null;

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(400)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleExportGraphJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rawGraph, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `berno-knowledge-graph-${conversation?.id || 'session'}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-6xl h-[88vh] rounded-2xl border border-[#d4af37]/35 bg-[#0a0c12] shadow-2xl text-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#0f121a]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37] shadow-inner">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-white tracking-wide">
                  Knowledge Graph
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37] bg-[#d4af37]/15 border border-[#d4af37]/30 px-2 py-0.5 rounded">
                  D3 Force Network
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 font-sans">
                Interconnected conceptual taxonomy, extracted entities, and dialectical themes from the active dialogue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportGraphJson}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-mono text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
              title="Export complete graph structure as JSON"
            >
              <Download className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>Export Graph</span>
            </button>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Toolbar: Category Filters, Search, and Graph Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-b border-white/5 bg-[#0c0e15]">
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
              All Clusters ({rawGraph.nodes.length})
            </button>
            {Object.keys(CATEGORY_PALETTE).map((cat) => {
              const count = rawGraph.nodes.filter((n) => n.category === cat).length;
              if (count === 0) return null;
              const isSelected = selectedCategory === cat;
              const color = CATEGORY_PALETTE[cat];

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

          {/* Graph Simulation Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLabels((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${
                showLabels
                  ? 'border-[#d4af37]/40 bg-[#d4af37]/15 text-[#f3cf65]'
                  : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
              }`}
              title="Toggle node text labels"
            >
              Labels
            </button>

            <button
              onClick={handleResetZoom}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset View</span>
            </button>
          </div>
        </div>

        {/* Main Canvas & Detail Sidebar */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* D3 SVG Canvas */}
          <div className="flex-1 overflow-hidden bg-[#07080c] relative select-none">
            <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Subtle Canvas Hint */}
            <div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-1.5 font-mono text-[10px] text-neutral-500 bg-black/60 px-2.5 py-1 rounded border border-white/5 backdrop-blur-sm">
              <Info className="h-3 w-3 text-[#d4af37]" />
              <span>Scroll to zoom · Drag nodes to reposition · Click to inspect concept lineage</span>
            </div>
          </div>

          {/* Concept Inspector Sidebar */}
          {selectedNode ? (
            <div className="w-full md:w-88 border-t md:border-t-0 md:border-l border-white/10 bg-[#0e1119] p-4 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                  CONCEPT TELEMETRY
                </span>
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-mono font-medium"
                  style={{
                    backgroundColor: `${selectedNode.color}20`,
                    color: selectedNode.color,
                    border: `1px solid ${selectedNode.color}40`,
                  }}
                >
                  {selectedNode.category}
                </span>
              </div>

              {/* Title & Stats */}
              <h3 className="font-serif text-lg font-bold text-white leading-snug">
                {selectedNode.label}
              </h3>

              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                  <span className="text-[10px] text-neutral-400 block uppercase">
                    OCCURRENCES
                  </span>
                  <span className="text-base font-bold text-white mt-0.5 block">
                    {selectedNode.frequency}
                  </span>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                  <span className="text-[10px] text-neutral-400 block uppercase">
                    DIALOGUE TURNS
                  </span>
                  <span className="text-base font-bold text-[#d4af37] mt-0.5 block">
                    {selectedNode.turns.join(', ')}
                  </span>
                </div>
              </div>

              {/* Connected Relationships */}
              <div className="mt-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block mb-2">
                  CO-OCCURRING CONCEPTS ({connectedNodes.length})
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {connectedNodes.map(({ node, weight }) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2 hover:bg-white/5 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: node.color }}
                        />
                        <span className="font-medium text-neutral-200 truncate">
                          {node.label}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[#d4af37] shrink-0">
                        {weight}x co-turn
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dialogue Excerpts */}
              {occurrenceQuotes.length > 0 && (
                <div className="mt-4">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block mb-2">
                    CONTEXTUAL EXCERPTS
                  </span>
                  <div className="space-y-2">
                    {occurrenceQuotes.map((q, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-white/5 bg-black/40 p-2.5 text-[11.5px] leading-relaxed text-neutral-300 font-serif italic"
                      >
                        <div className="font-mono not-italic text-[10px] text-[#d4af37] mb-1">
                          Inquiry Turn {q.turn}
                        </div>
                        "{q.snippet}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex w-88 border-l border-white/10 bg-[#0e1119] p-6 flex-col items-center justify-center text-center">
              <Share2 className="h-10 w-10 text-neutral-600 mb-3" />
              <h4 className="font-serif text-sm font-semibold text-neutral-300">
                Inspect Epistemic Network
              </h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                Click any concept or entity node to inspect its conversational occurrences, turn history, and co-occurring cognitive connections.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
