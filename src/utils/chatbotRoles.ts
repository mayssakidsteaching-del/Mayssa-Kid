import { ChatbotRole, ChatbotRoleConfig } from '../types';

export const CHATBOT_ROLES: Record<ChatbotRole, ChatbotRoleConfig> = {
  epistemic_architect: {
    id: 'epistemic_architect',
    title: 'Epistemic Architect',
    badge: 'Deep Reasoning',
    description: 'Specialized in first-principles deduction, systemic root causes, and uncovering non-obvious cognitive trade-offs.',
    instructionSnippet: 'Act as Berno’s Lead Epistemic Architect. Dissect foundational assumptions, employ second-order deduction, and construct high-density frameworks.',
  },
  technical_architect: {
    id: 'technical_architect',
    title: 'Systems & Code Architect',
    badge: 'Engineering Rigor',
    description: 'Tailored for production software engineering, distributed systems, cryptographic proofs, and hardened code audits.',
    instructionSnippet: 'Act as a Senior Principal Systems Architect and Security Auditor. Write production-grade, hardened code with comprehensive edge-case handling.',
  },
  creative_visionary: {
    id: 'creative_visionary',
    title: 'Creative Strategist',
    badge: 'Lateral Synthesis',
    description: 'Excels at lateral metaphors, unexpected conceptual synthesis, innovative product vision, and rich narrative.',
    instructionSnippet: 'Act as an Avant-Garde Creative Strategist. Synthesize disparate domains, challenge conventional orthodoxy, and inspire lateral breakthroughs.',
  },
  scientific_researcher: {
    id: 'scientific_researcher',
    title: 'Scientific Methodologist',
    badge: 'Empirical Rigor',
    description: 'Dedicated to empirical verification, statistical validity, formal taxonomies, and counter-hypothesis elimination.',
    instructionSnippet: 'Act as a Scientific Methodologist and Research Fellow. Enforce strict empirical standards, quantify uncertainties, and evaluate hypothesis validity.',
  },
};

export interface ModelOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  useCase: string;
  tag: 'pro' | 'flash' | 'lite' | 'live' | 'gpt';
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    badge: 'Complex Tasks',
    description: 'State-of-the-art reasoning for particularly complex tasks, advanced mathematics, systems architecture, and deep analytical proofs.',
    useCase: 'Complex tasks, deep reasoning & architecture',
    tag: 'pro',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    badge: 'General Tasks',
    description: 'Versatile, high-intelligence model optimal for general everyday tasks, multi-turn conversational dialogue, and high-density synthesis.',
    useCase: 'General tasks, versatile reasoning & speed',
    tag: 'flash',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    badge: 'Fast Tasks',
    description: 'Lightweight execution engine engineered for tasks that should happen fast with near-zero latency and immediate feedback.',
    useCase: 'Tasks that should happen fast, ultra-responsive dialogue',
    tag: 'lite',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'Cognitive Flash',
    description: 'Flagship reasoning model with extended thinking budget (8k tokens) for axiomatic deconstruction and pedagogical architecture.',
    useCase: 'Cognitive thinking arc, axiomatic deduction',
    tag: 'flash',
  },
];
