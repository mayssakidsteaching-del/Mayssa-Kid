import { ThinkingMode, ThinkingModeConfig } from '../types';

export const THINKING_MODES: ThinkingModeConfig[] = [
  {
    id: 'deep_reasoning',
    name: 'Deep Reasoning',
    tagline: 'Multi-layer deduction & formal analysis',
    description: 'Deconstructs underlying premises, edge conditions, systemic trade-offs, and second-order effects.',
    icon: 'BrainCircuit',
    accentColor: '#d4af37', // Smoked Gold
  },
  {
    id: 'executive_synthesis',
    name: 'Executive Synthesis',
    tagline: 'High-density, zero-fluff conclusions',
    description: 'Distills complex landscapes into clear executive summaries, risk matrices, and decisive action items.',
    icon: 'Zap',
    accentColor: '#38bdf8', // Ice Blue
  },
  {
    id: 'architectural_code',
    name: 'Architectural Proof',
    tagline: 'Strict correctness & hardened code',
    description: 'Constructs production-grade software patterns, invariant checks, concurrency models, and resilient systems.',
    icon: 'Code2',
    accentColor: '#34d399', // Emerald
  },
  {
    id: 'counter_perspective',
    name: 'Devil’s Advocate',
    tagline: 'Scrutinize biases & blind spots',
    description: 'Attacks prevailing dogmas, surfaces unseen failure modes, and rigorously challenges assumptions.',
    icon: 'ShieldAlert',
    accentColor: '#f97316', // Amber Amber
  },
];

export const CURATED_INQUIRIES = [
  {
    category: 'Systemic Architecture',
    prompt: 'Deconstruct why large-scale software systems inevitably accumulate entropy, and outline mathematical and organizational invariants to prevent structural rot.',
    mode: 'architectural_code' as ThinkingMode,
  },
  {
    category: 'Deep Deduction',
    prompt: 'Examine whether intelligence is inherently bounded by thermodynamic constraints, and what that implies for recursive self-improving artificial systems.',
    mode: 'deep_reasoning' as ThinkingMode,
  },
  {
    category: 'Devil’s Advocate',
    prompt: 'Challenge the widespread consensus that remote-first engineering teams are universally more productive long-term. Identify hidden systemic degradation.',
    mode: 'counter_perspective' as ThinkingMode,
  },
  {
    category: 'Executive Strategy',
    prompt: 'Deliver an uncompromising, density-maximized strategic blueprint for migrating a monolithic core banking database with zero allowable downtime.',
    mode: 'executive_synthesis' as ThinkingMode,
  },
];
