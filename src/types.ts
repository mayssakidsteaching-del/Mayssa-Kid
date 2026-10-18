export type ThinkingMode =
  | 'deep_reasoning'
  | 'executive_synthesis'
  | 'architectural_code'
  | 'counter_perspective';

export type ChatbotRole =
  | 'epistemic_architect'
  | 'technical_architect'
  | 'creative_visionary'
  | 'scientific_researcher';

export interface ChatbotRoleConfig {
  id: ChatbotRole;
  title: string;
  badge: string;
  description: string;
  instructionSnippet: string;
}

export interface ThinkingModeConfig {
  id: ThinkingMode;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  accentColor: string;
}

export interface GroundingSource {
  title: string;
  url: string;
  snippet?: string;
  hostname?: string;
  citedInTurns?: number[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  rawContent?: string;
  thinkingContent?: string;
  timestamp: number;
  mode?: ThinkingMode;
  model?: string;
  chatbotRole?: ChatbotRole;
  isStreaming?: boolean;
  error?: string;
  provider?: 'openai' | 'gemini_cognitive_reserve';
  providerNotice?: string;
  researchMode?: boolean;
  groundingSources?: GroundingSource[];
  searchQueries?: string[];
  attachedImage?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  pinned?: boolean;
  mode: ThinkingMode;
  model?: string;
  chatbotRole?: ChatbotRole;
  titleSummarized?: boolean;
  tags?: string[];
  executiveSummary?: string;
}

export interface ImageGenerationItem {
  id: string;
  prompt: string;
  imageUrl: string;
  sourceImageUrl?: string;
  isEdit?: boolean;
  aspectRatio: string;
  model?: string;
  createdAt: number;
}

export interface VeoGenerationItem {
  id: string;
  prompt?: string;
  hasImage?: boolean;
  imagePreview?: string;
  aspectRatio: '16:9' | '9:16';
  operationName: string;
  videoUrl?: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  statusMessage?: string;
  createdAt: number;
  error?: string;
}

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface ReadingListItem {
  id: string;
  messageId: string;
  conversationId: string;
  conversationTitle: string;
  role: 'user' | 'assistant';
  snippet: string;
  fullContent: string;
  timestamp: number;
  bookmarkedAt: number;
  wordCount: number;
  readingTimeDisplay: string;
  mode?: ThinkingMode;
  chatbotRole?: ChatbotRole;
}

export interface ReadingHistoryItem {
  id: string;
  conversationId: string;
  viewedAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  tier?: 'Scholar' | 'Titan' | 'Architect';
  createdAt: number;
}


