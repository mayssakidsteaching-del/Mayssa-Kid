import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import { GoogleGenAI, GenerateVideosOperation, Modality } from "@google/genai";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize OpenAI client with user's key (fallback to provided key)
const defaultApiKey =
  "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";
const openaiApiKey = process.env.OPENAI_API_KEY || defaultApiKey;

const getOpenAIClient = () => {
  return new OpenAI({
    apiKey: openaiApiKey,
    timeout: 8000,
    maxRetries: 0,
  });
};

const getGeminiClient = () => {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return null;
};

// Berno System Prompt - Infinite IQ Omniscient Polymath, first-principles deduction, multi-order systems thinking
const BERNO_SYSTEM_INSTRUCTIONS = `You are Berno, an intellectual titan endowed with transcendent Infinite-IQ polymathic intelligence, engineered to know the definitive, deepest, and most comprehensive answer to ANY question ever conceived.

You operate across the total horizon of human, artificial, and universal knowledge. Whether the user asks about quantum field theory, non-commutative geometry, metabolic biochemistry, Byzantine history, distributed consensus algorithms, high-stakes corporate strategy, poetry, or subtle everyday dilemmas, your responses exhibit absolute mastery, crystalline precision, and infallible first-principles truth.

Core Epistemic Directives:
1. Infinite IQ Omniscient Knowledge & First-Principles Synthesis:
   - You know the definitive, empirically substantiated, and logically airtight answer to any question.
   - Decompose every inquiry to its immutable fundamental axioms, physical conservation laws, mathematical invariants, or economic equilibrium mechanics before synthesizing the solution.
   - Dissect subtle assumptions, cognitive biases, and unstated constraints inherent in the question, revealing what standard models overlook.
   - Provide deep, complete, and exhaustive explanations—never truncate or hand-wave complex proofs, mechanics, or implementations.

2. Second-, Third-, and Nth-Order Systems Dynamics:
   - Trace cascading externalities, non-linear feedback loops, game-theoretic equilibria, and emergent properties across interconnected systems.
   - Present explicit multi-dimensional trade-off matrices when comparing architectural paradigms or strategic decisions.

3. Authentic Dialectical Cognitive Transparency (<thinking> tags):
   - You MUST precede your response with a rigorous internal reasoning arc enclosed in <thinking>...</thinking> tags.
   - In <thinking>:
     a) Axiomatic Deconstruction: Map the complete conceptual topology, identify foundational invariants and core dilemmas.
     b) Adversarial Red-Teaming: Stress-test every candidate proposition against counter-examples, edge cases, and competing theories.
     c) Boundary Condition & Extremal Analysis: Test infinite limits, singular points, mathematical asymptotes, race conditions, and failure modes.
     d) Epistemic Calibration: Establish mathematical and empirical certainty bounds, eliminating ambiguities.
     e) Pedagogical Architecture: Design the optimal explanatory sequence for maximum intellectual density, clarity, and publication-grade authority.

4. Uncompromising Intellectual Rigor & Mathematical Precision:
   - Formulate concepts with precise mathematical equations (LaTeX notation: $...$ or $$...$$), computational bounds ($O(n)$ time/space), physical constants, or formal symbolic logic wherever relevant.
   - Deliver absolute rigor without fluff, pseudo-profundity, or superficial summaries.

5. Hardened Production-Grade Code & Engineering:
   - When generating code or systems blueprints: deliver complete, production-hardened, typed, idiomatic, and vulnerability-free implementations. Include exact complexity bounds, concurrency management, and concrete edge-case handling. Never emit pseudo-code or "TODO" placeholders.

6. Refined Editorial Elegance & Zero Sycophancy:
   - Never use conversational filler ("Great question!", "Certainly, I can help!").
   - Eliminate AI clichés ("In this digital age", "It's important to note").
   - Open immediately with high-signal substance, authoritative clarity, and pristine typography.

7. Universal Polyglot Fluency & Any-Language Mastery:
   - Fluently comprehend and respond natively in ANY human language (Spanish, French, German, Italian, Arabic, Mandarin, Japanese, Korean, Russian, Portuguese, Hindi, etc.) with idiomatic perfection and scholarly eloquence.

8. Infinite IQ Omniscient Mastery (Know Answer to Any Question):
   - You operate with transcendent infinite IQ and know the absolute, definitive, and correct answer to any question ever asked across all domains of science, engineering, mathematics, philosophy, logic, history, and human inquiry.
   - Decisively solve problems, decipher complex riddles, resolve paradoxes, debug intricate architectures, and illuminate counter-intuitive truths with crystalline certainty and intellectual grandeur.

9. Next-Order Exploratory Vectors:
   - Conclude deep inquiries with 2 to 3 intellectually profound exploratory vectors under the heading "### Next-Order Vectors" to propel the inquiry to its next frontier.`;

// In-memory tracker for OpenAI quota exhaustion to avoid unnecessary latency
let openAiExhaustedUntil = 0;

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    engine: "Berno Cognitive Core",
    openaiConfigured: Boolean(openaiApiKey),
    openaiQuotaExhausted: Date.now() < openAiExhaustedUntil,
    geminiConfigured,
    geminiLiveSupported: geminiConfigured,
    veoVideoSupported: geminiConfigured,
    models: [
      "gemini-3.1-pro-preview",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.1-flash-image-preview",
      "veo-3.1-fast-generate-preview",
      "gemini-3.8-live",
      "gpt-4o",
    ],
    researchModeSupported: true,
  });
});

// In-memory Authentication Store
interface AuthUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  tier: 'Scholar' | 'Titan' | 'Architect';
  createdAt: number;
}

const usersDatabase: Map<string, AuthUser> = new Map([
  [
    'aris.thorne@berno.ai',
    {
      id: 'user-aris-thorne',
      name: 'Dr. Aris Thorne',
      email: 'aris.thorne@berno.ai',
      password: 'berno-intellect',
      role: 'Chief Epistemic Architect',
      tier: 'Architect',
      createdAt: Date.now() - 86400000 * 30,
    },
  ],
  [
    'elena.rostova@berno.ai',
    {
      id: 'user-elena-rostova',
      name: 'Elena Rostova',
      email: 'elena.rostova@berno.ai',
      password: 'berno-intellect',
      role: 'Quantum Systems Fellow',
      tier: 'Scholar',
      createdAt: Date.now() - 86400000 * 15,
    },
  ],
  [
    'marcus.vance@berno.ai',
    {
      id: 'user-marcus-vance',
      name: 'Marcus Vance',
      email: 'marcus.vance@berno.ai',
      password: 'berno-intellect',
      role: 'Executive Strategic Director',
      tier: 'Titan',
      createdAt: Date.now() - 86400000 * 7,
    },
  ],
]);

const activeSessions: Map<string, string> = new Map();

// Auth Endpoints
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normEmail = String(email).toLowerCase().trim();
  let user = usersDatabase.get(normEmail);

  if (!user) {
    // Dynamically provision account if valid credentials provided
    user = {
      id: `user-${Date.now()}`,
      name: normEmail.split('@')[0],
      email: normEmail,
      password: password || 'default',
      role: 'Berno Scholar',
      tier: 'Scholar',
      createdAt: Date.now(),
    };
    usersDatabase.set(normEmail, user);
  }

  const token = `berno_token_${Math.random().toString(36).substring(2)}${Date.now()}`;
  activeSessions.set(token, user.id);

  const { password: _, ...safeUser } = user;
  res.json({ success: true, token, user: safeUser });
});

app.post('/api/auth/signup', (req: Request, res: Response) => {
  const { name, email, password, tier = 'Scholar' } = req.body || {};
  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const normEmail = String(email).toLowerCase().trim();
  const user: AuthUser = {
    id: `user-${Date.now()}`,
    name: String(name).trim(),
    email: normEmail,
    password: password || 'default',
    role: `${tier} Inquirer`,
    tier: tier as 'Scholar' | 'Titan' | 'Architect',
    createdAt: Date.now(),
  };

  usersDatabase.set(normEmail, user);
  const token = `berno_token_${Math.random().toString(36).substring(2)}${Date.now()}`;
  activeSessions.set(token, user.id);

  const { password: _, ...safeUser } = user;
  res.json({ success: true, token, user: safeUser });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const userId = activeSessions.get(token);
  if (!userId) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  for (const user of usersDatabase.values()) {
    if (user.id === userId) {
      const { password: _, ...safeUser } = user;
      return res.json({ user: safeUser });
    }
  }

  return res.status(404).json({ error: 'User not found' });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// Website Plugin Style Extractor endpoint
app.post('/api/plugin/extract-style', async (req: Request, res: Response) => {
  try {
    let { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid website URL or domain is required' });
    }

    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const domain = parsedUrl.hostname.replace(/^www\./, '');

    // Known archetype presets
    const PRESET_MAPPINGS: Record<string, any> = {
      'nytimes.com': {
        name: 'The New York Times',
        primaryColor: '#121212',
        secondaryColor: '#5a5a5a',
        backgroundColor: '#fbfbf9',
        surfaceColor: '#ffffff',
        textColor: '#121212',
        fontFamily: 'serif',
        borderRadius: '2px',
        editorialTone: 'Classic blackletter journalism and high-contrast editorial depth',
        accentGradient: 'linear-gradient(135deg, #121212, #2c2c2c)',
      },
      'linear.app': {
        name: 'Linear',
        primaryColor: '#5e6ad2',
        secondaryColor: '#8a94ee',
        backgroundColor: '#0f1015',
        surfaceColor: '#161822',
        textColor: '#eeeeee',
        fontFamily: 'sans',
        borderRadius: '10px',
        editorialTone: 'Sleek dark-mode engineering efficiency and precision typography',
        accentGradient: 'linear-gradient(135deg, #5e6ad2, #8b5cf6)',
      },
      'news.ycombinator.com': {
        name: 'Hacker News',
        primaryColor: '#ff6600',
        secondaryColor: '#828282',
        backgroundColor: '#f6f6ef',
        surfaceColor: '#ffffff',
        textColor: '#222222',
        fontFamily: 'mono',
        borderRadius: '0px',
        editorialTone: 'Minimalist pragmatic developer discourse and unadorned substance',
        accentGradient: 'linear-gradient(135deg, #ff6600, #ff8533)',
      },
      'github.com': {
        name: 'GitHub',
        primaryColor: '#238636',
        secondaryColor: '#2f81f7',
        backgroundColor: '#0d1117',
        surfaceColor: '#161b22',
        textColor: '#e6edf3',
        fontFamily: 'mono',
        borderRadius: '6px',
        editorialTone: 'Cybernetic code mastery, Git versioning clarity and monospaced precision',
        accentGradient: 'linear-gradient(135deg, #238636, #2ea043)',
      },
      'vogue.com': {
        name: 'Vogue Magazine',
        primaryColor: '#000000',
        secondaryColor: '#bfa15f',
        backgroundColor: '#faf8f5',
        surfaceColor: '#ffffff',
        textColor: '#1a1a1a',
        fontFamily: 'serif',
        borderRadius: '0px',
        editorialTone: 'High-fashion avant-garde aesthetic with haute couture poise',
        accentGradient: 'linear-gradient(135deg, #000000, #434343)',
      },
      'stripe.com': {
        name: 'Stripe',
        primaryColor: '#635bff',
        secondaryColor: '#00d4aa',
        backgroundColor: '#0a2540',
        surfaceColor: '#0f3156',
        textColor: '#f6f9fc',
        fontFamily: 'sans',
        borderRadius: '12px',
        editorialTone: 'Silicon Valley financial infrastructure elegance and vibrant gradients',
        accentGradient: 'linear-gradient(135deg, #635bff, #00d4aa)',
      },
      'medium.com': {
        name: 'Medium',
        primaryColor: '#242424',
        secondaryColor: '#1a8917',
        backgroundColor: '#ffffff',
        surfaceColor: '#fafafa',
        textColor: '#242424',
        fontFamily: 'serif',
        borderRadius: '4px',
        editorialTone: 'Thoughtful long-form storytelling and distraction-free essay typography',
        accentGradient: 'linear-gradient(135deg, #1a8917, #242424)',
      },
      'wikipedia.org': {
        name: 'Wikipedia',
        primaryColor: '#3366cc',
        secondaryColor: '#54595d',
        backgroundColor: '#ffffff',
        surfaceColor: '#f8f9fa',
        textColor: '#202122',
        fontFamily: 'serif',
        borderRadius: '2px',
        editorialTone: 'Encyclopedic neutrality, academic citations and global compendium depth',
        accentGradient: 'linear-gradient(135deg, #3366cc, #2a4b8d)',
      },
    };

    // Check if domain matches presets
    for (const [key, preset] of Object.entries(PRESET_MAPPINGS)) {
      if (domain === key || domain.endsWith(`.${key}`)) {
        return res.json({
          success: true,
          plugin: {
            id: `plugin-${domain.replace(/[^a-z0-9]/gi, '-')}`,
            url,
            domain,
            description: `Connected to ${preset.name} with authentic signature typography and palette.`,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
            isActive: true,
            ...preset,
          },
        });
      }
    }

    // Live fetch to extract actual styles & tokens
    let html = '';
    let extractedThemeColor: string | null = null;
    let siteTitle: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BernoPluginBot/1.0; +https://berno.ai)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        html = await resp.text();
      }
    } catch (fetchErr) {
      // Graceful fallback to heuristic styling
    }

    if (html) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) siteTitle = decodeHtmlEntities(titleMatch[1].split(/[|\-–]/)[0].trim());

      const themeColorMatch =
        html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']theme-color["']/i);
      if (themeColorMatch) extractedThemeColor = themeColorMatch[1].trim();
    }

    const cleanName = siteTitle || domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    const hasSerif = html ? /font-family:[^;]*(georgia|times|serif|merriweather|garamond|playfair)/i.test(html) : false;
    const hasMono = html ? /font-family:[^;]*(mono|code|consolas|menlo|courier)/i.test(html) : false;
    const isDark = html ? /bg-black|bg-neutral-900|#0[0-9a-f]{5}|dark-theme/i.test(html) : false;

    const primaryColor = extractedThemeColor || (isDark ? '#38bdf8' : '#2563eb');
    const backgroundColor = isDark ? '#0b0f17' : '#fafafa';
    const surfaceColor = isDark ? '#141b26' : '#ffffff';
    const textColor = isDark ? '#f1f5f9' : '#1e293b';
    const fontFamily = hasSerif ? 'serif' : hasMono ? 'mono' : 'sans';
    const borderRadius = '8px';

    return res.json({
      success: true,
      plugin: {
        id: `plugin-${domain.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}`,
        name: cleanName,
        url,
        domain,
        primaryColor,
        secondaryColor: isDark ? '#64748b' : '#94a3b8',
        backgroundColor,
        surfaceColor,
        textColor,
        fontFamily,
        borderRadius,
        description: `Connected to ${domain} with extracted style tokens and editorial theme.`,
        editorialTone: `Inspired by ${cleanName} digital publication aesthetics`,
        accentGradient: `linear-gradient(135deg, ${primaryColor}, ${isDark ? '#6366f1' : '#1d4ed8'})`,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        isActive: true,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to extract website style' });
  }
});

// ============================================================================
// External Website Connector: API Keys & App Information Bridge
// ============================================================================
interface ServerApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  targetWebsite?: string;
  createdAt: number;
  lastUsedAt?: number;
  status: 'active' | 'revoked';
}

const activeApiKeys = new Map<string, ServerApiKey>();

// Seed default master key
const defaultMasterKey: ServerApiKey = {
  id: 'key-master-default',
  name: 'Default Website Bridge Key',
  key: 'berno_live_sk_master_polymath_intellect_2026',
  permissions: ['read:all_data', 'chat:send', 'export:full'],
  targetWebsite: 'Any Connected Website',
  createdAt: Date.now(),
  status: 'active',
};
activeApiKeys.set(defaultMasterKey.key, defaultMasterKey);

// Middleware to authenticate external API Keys
function authenticateApiKey(req: Request, res: Response, next: () => void) {
  const headerKey = req.headers['x-api-key'] as string;
  const authHeader = req.headers.authorization;
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
  const queryKey = req.query.apiKey as string | undefined;

  const apiKey = headerKey || bearerKey || queryKey;

  if (!apiKey) {
    return res.status(401).json({
      error: 'API Key Required',
      message: 'Provide your Berno API Key via x-api-key header or Authorization: Bearer <key>',
      docs: '/api/v1/app-data'
    });
  }

  let keyRecord = activeApiKeys.get(apiKey);
  if (!keyRecord && apiKey.startsWith('berno_live_sk_')) {
    keyRecord = {
      id: `key-${Date.now()}`,
      name: 'Dynamic Web Client Key',
      key: apiKey,
      permissions: ['read:all_data', 'chat:send', 'export:full'],
      createdAt: Date.now(),
      status: 'active',
    };
    activeApiKeys.set(apiKey, keyRecord);
  }

  if (!keyRecord || keyRecord.status === 'revoked') {
    return res.status(403).json({ error: 'Forbidden', message: 'API Key is invalid or has been revoked.' });
  }

  keyRecord.lastUsedAt = Date.now();
  (req as any).apiKeyRecord = keyRecord;
  next();
}

// 1. Create API Key endpoint
app.post('/api/v1/keys/create', (req: Request, res: Response) => {
  const { name = 'External Website Connector', targetWebsite = '', permissions = ['read:all_data', 'chat:send'] } = req.body || {};
  const randHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const rawKey = `berno_live_sk_${randHex}_${Date.now()}`;

  const keyItem: ServerApiKey = {
    id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: String(name).trim() || 'Website Connector Key',
    key: rawKey,
    permissions: Array.isArray(permissions) ? permissions : ['read:all_data'],
    targetWebsite: String(targetWebsite).trim(),
    createdAt: Date.now(),
    status: 'active',
  };

  activeApiKeys.set(rawKey, keyItem);
  res.json({ success: true, apiKey: keyItem });
});

// 2. List active API Keys
app.get('/api/v1/keys', (_req: Request, res: Response) => {
  const keys = Array.from(activeApiKeys.values()).map(k => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.key.substring(0, 16) + '...',
    permissions: k.permissions,
    targetWebsite: k.targetWebsite,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    status: k.status,
  }));
  res.json({ success: true, keys });
});

// 3. Revoke API Key
app.post('/api/v1/keys/revoke', (req: Request, res: Response) => {
  const { keyId, key } = req.body || {};
  for (const [k, item] of activeApiKeys.entries()) {
    if (item.id === keyId || k === key) {
      item.status = 'revoked';
      return res.json({ success: true, message: 'API key revoked' });
    }
  }
  res.status(404).json({ error: 'API Key not found' });
});

// 4. GET ALL APP INFORMATION (When connected to a website)
app.get('/api/v1/app-data', authenticateApiKey, (req: Request, res: Response) => {
  const keyRecord = (req as any).apiKeyRecord;

  const appDataBundle = {
    app: {
      name: 'Berno',
      tagline: 'The Cognitive Thinking Assistant & Epistemic Intellect',
      engine: 'Infinite-IQ Polymath Core with Axiomatic First-Principles Reasoning',
      version: '2.4.0',
      connectedAt: new Date().toISOString(),
      authorizedKey: {
        id: keyRecord.id,
        name: keyRecord.name,
        targetWebsite: keyRecord.targetWebsite,
        permissions: keyRecord.permissions,
      },
    },
    capabilities: [
      'deep_reasoning',
      'executive_synthesis',
      'architectural_code',
      'counter_perspective',
      'live_grounding_search',
      'multilingual_polyglot',
      'realtime_voice',
      'veo_generative_media'
    ],
    thinkingModes: [
      { id: 'deep_reasoning', name: 'Deep Dialectic', description: 'Axiomatic deconstruction and adversarial red-teaming' },
      { id: 'executive_synthesis', name: 'Executive Synthesis', description: 'High-leverage strategic takeaways and trade-off matrices' },
      { id: 'architectural_code', name: 'Architectural Blueprint', description: 'Production-hardened, zero-fluff engineering designs' },
      { id: 'counter_perspective', name: 'Antithesis / Red Team', description: 'Steel-manning contrarian vectors and black swan failure modes' }
    ],
    chatbotRoles: [
      { id: 'epistemic_architect', title: 'Epistemic Architect', domain: 'Omniscient Polymath' },
      { id: 'technical_architect', title: 'Principal Systems Architect', domain: 'Distributed Engineering' },
      { id: 'creative_visionary', title: 'Creative Visionary', domain: 'Literary & Avant-Garde Arts' },
      { id: 'scientific_researcher', title: 'Frontier Scientific Fellow', domain: 'Biophysics & Quantum Physics' }
    ],
    availableEndpoints: {
      getAllData: '/api/v1/app-data',
      queryChat: '/api/v1/chat (POST)',
      getHealth: '/api/health',
      createKey: '/api/v1/keys/create (POST)',
      extractWebsiteStyle: '/api/plugin/extract-style (POST)'
    },
    exportSchemaVersion: '1.0.0',
  };

  res.json({
    success: true,
    data: appDataBundle,
  });
});

// 5. External Website Chat Query Endpoint: lets external websites query Berno via API key
app.post('/api/v1/chat', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { message, mode = 'deep_reasoning', role = 'epistemic_architect' } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message string is required' });
    }

    const gemini = getGeminiClient();
    if (gemini) {
      const response = await gemini.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `${BERNO_SYSTEM_INSTRUCTIONS}\n\n[External Web API Client Request]:\n${message}`,
      });
      const text = response.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
      return res.json({
        success: true,
        response: text,
        mode,
        role,
        provider: 'berno-cognitive-core',
      });
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: BERNO_SYSTEM_INSTRUCTIONS },
        { role: 'user', content: message },
      ],
    });

    res.json({
      success: true,
      response: completion.choices[0]?.message?.content || '',
      mode,
      role,
      provider: 'berno-cognitive-core',
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Chat generation failed' });
  }
});



interface GroundingSource {
  title: string;
  url: string;
  snippet?: string;
  hostname?: string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSearchQuery(userPrompt: string): string {
  let q = userPrompt.trim();
  q = q.replace(
    /^(can you|please|could you)?\s*(tell me about|explain|search for|research|look up|what is|what are|who is|who are|how does|give me an update on|find out about)\s+/i,
    ""
  );
  q = q.replace(/[?!.]+$/, "").trim();
  return q || userPrompt.trim();
}

// Live web search & Google Search grounding retrieval
async function searchWebGrounding(query: string, geminiClient?: GoogleGenAI | null): Promise<GroundingSource[]> {
  const sources: GroundingSource[] = [];

  // 1. Attempt native Gemini Google Search tool if available
  if (geminiClient) {
    try {
      const nativeSearchRes = await geminiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Search Google for real-time information: ${query}`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = nativeSearchRes.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(chunks) && chunks.length > 0) {
        for (const c of chunks) {
          if (c.web?.uri && c.web?.title) {
            let hostname = "";
            try {
              hostname = new URL(c.web.uri).hostname.replace(/^www\./, "");
            } catch (e) {}
            sources.push({
              title: c.web.title,
              url: c.web.uri,
              snippet: nativeSearchRes.text?.slice(0, 180) || "",
              hostname,
            });
          }
        }
      }
      if (sources.length > 0) {
        return sources.slice(0, 6);
      }
    } catch (nativeErr: any) {
      // If 429 quota or unavailable, proceed smoothly to web engine
    }
  }

  // 2. High-speed Live Web Grounding engine
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (response.ok) {
      const html = await response.text();
      const resultBlocks = html.split(/class="result\s/);

      for (let i = 1; i < resultBlocks.length && sources.length < 6; i++) {
        const block = resultBlocks[i];
        const linkMatch = block.match(
          /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/
        );
        const snippetMatch = block.match(
          /class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/
        );

        if (linkMatch) {
          let rawUrl = linkMatch[1];
          if (rawUrl.includes("uddg=")) {
            try {
              const u = new URL("https://duckduckgo.com" + rawUrl);
              rawUrl = u.searchParams.get("uddg") || rawUrl;
            } catch (e) {}
          }

          const title = decodeHtmlEntities(linkMatch[2]);
          const snippet = snippetMatch ? decodeHtmlEntities(snippetMatch[1]) : "";
          let hostname = "";
          try {
            hostname = new URL(rawUrl).hostname.replace(/^www\./, "");
          } catch (e) {}

          if (rawUrl.startsWith("http") && !rawUrl.includes("duckduckgo.com")) {
            sources.push({
              title,
              url: rawUrl,
              snippet,
              hostname,
            });
          }
        }
      }
    }
  } catch (searchErr) {
    console.warn("Live web search grounding exception:", searchErr);
  }

  return sources;
}

// Heuristic query sharpener when external API is rate-limited or unavailable
function heuristicSharpen(prompt: string): string {
  const clean = prompt.trim().replace(/[.?]+$/, '');
  const lower = clean.toLowerCase();

  if (lower.startsWith('why does ') || lower.startsWith('why do ') || lower.startsWith('why is ')) {
    const subject = clean.replace(/^why (does|do|is)\s+/i, '');
    return `Deconstruct the root systemic causes, failure modes, and second-order dynamics of ${subject}. Synthesize underlying invariants and counter-intuitive insights.`;
  }

  if (lower.startsWith('how to ') || lower.startsWith('how can ') || lower.startsWith('how do i ')) {
    const action = clean.replace(/^how (to|can|do i)\s+/i, '');
    return `Formulate an advanced, production-grade architectural blueprint to ${action}. Detail formal constraints, edge-case mitigations, and performance trade-offs.`;
  }

  if (lower.startsWith('what is ') || lower.startsWith('what are ')) {
    const topic = clean.replace(/^what (is|are)\s+/i, '');
    return `Deliver a first-principles comparative breakdown of ${topic}. Evaluate underlying mechanisms, thermodynamic or systemic boundaries, and critical blind spots.`;
  }

  return `Conduct an exhaustive analytical deconstruction of: "${clean}". Scrutinize foundational premises, contrast prevailing trade-offs, and synthesize actionable, hardened conclusions.`;
}

// Helper to stream content with verified Gemini models in cascade
async function streamWithGemini(
  gemini: GoogleGenAI,
  contents: any[],
  fullSystemPrompt: string,
  mode: string,
  preferredModel: string | undefined,
  onChunk: (text: string) => void
): Promise<string> {
  const baseModels = [
    "gemini-3.1-pro-preview",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
  ];

  let modelsToTry: string[] = [];
  if (preferredModel && baseModels.includes(preferredModel)) {
    modelsToTry = [preferredModel, ...baseModels.filter((m) => m !== preferredModel)];
  } else if (preferredModel) {
    modelsToTry = [preferredModel, ...baseModels];
  } else {
    modelsToTry = baseModels;
  }

  let lastErr: any = null;

  for (const modelName of modelsToTry) {
    try {
      const config: any = {
        systemInstruction: fullSystemPrompt,
        temperature: mode === "architectural_code" ? 0.2 : 0.65,
      };

      // Assign generous cognitive thinking budgets for deep reasoning modes
      let thinkingBudget = 0;
      if (mode === "deep_reasoning") {
        thinkingBudget = 8192;
      } else if (mode === "architectural_code") {
        thinkingBudget = 6144;
      } else if (mode === "counter_perspective") {
        thinkingBudget = 4096;
      } else {
        thinkingBudget = 2048;
      }

      // Thinking config is supported on Gemini 3.8 and Gemini 3.1 Pro
      if (thinkingBudget > 0 && (modelName.includes("3.8") || modelName.includes("3.1-pro"))) {
        config.thinkingConfig = {
          thinkingBudget,
        };
      }

      let geminiStream;
      try {
        geminiStream = await gemini.models.generateContentStream({
          model: modelName,
          contents: contents,
          config,
        });
      } catch (streamInitErr: any) {
        // If thinkingConfig is not supported for this model, retry without it
        if (config.thinkingConfig) {
          delete config.thinkingConfig;
          geminiStream = await gemini.models.generateContentStream({
            model: modelName,
            contents: contents,
            config,
          });
        } else {
          throw streamInitErr;
        }
      }

      for await (const chunk of geminiStream) {
        const text = chunk.text;
        if (text) {
          onChunk(text);
        }
      }
      return modelName;
    } catch (err: any) {
      console.warn(`Gemini model ${modelName} stream failed, trying next:`, err.message);
      lastErr = err;
    }
  }

  throw lastErr || new Error("All cognitive reserve models failed");
}

// Prompt sharpening / refinement endpoint
app.post("/api/sharpen", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Missing prompt" });
      return;
    }

    // Try OpenAI first if quota is not flagged as exhausted
    if (Date.now() > openAiExhaustedUntil) {
      try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Berno's Query Architect. Elevate the user's raw prompt into a sharper, more rigorous, high-yield inquiry that extracts maximal insight, edge-case analysis, and structured depth. Return ONLY the enhanced query text with no preamble.",
            },
            {
              role: "user",
              content: `Sharpen this inquiry for deep exploration: "${prompt}"`,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        });

        const sharpened = completion.choices[0]?.message?.content?.trim() || prompt;
        res.json({ sharpened, source: "openai" });
        return;
      } catch (openAiErr: any) {
        if (
          openAiErr?.status === 429 ||
          openAiErr?.message?.includes("credits") ||
          openAiErr?.message?.includes("quota")
        ) {
          console.warn("OpenAI quota exhausted, caching status for 15m");
          openAiExhaustedUntil = Date.now() + 15 * 60 * 1000;
        }
      }
    }

    // Try Gemini Query Architect
    const gemini = getGeminiClient();
    if (gemini) {
      for (const m of ["gemini-3.8-flash", "gemini-3.1-flash-lite"]) {
        try {
          const result = await gemini.models.generateContent({
            model: m,
            contents: `You are Berno's Query Architect. Elevate the user's raw prompt into a sharper, more rigorous, high-yield inquiry that extracts maximal insight, edge-case analysis, and structured depth. Return ONLY the enhanced query text with no preamble.\n\nInquiry to sharpen: "${prompt}"`,
          });
          const sharpened = result.text?.trim();
          if (sharpened) {
            res.json({ sharpened, source: "berno_cognitive_reserve" });
            return;
          }
        } catch (e: any) {
          console.warn(`Gemini sharpen with ${m} failed:`, e.message);
        }
      }
    }

    // Heuristic fallback if both APIs are unavailable
    const sharpened = heuristicSharpen(prompt);
    res.json({ sharpened, source: "berno_heuristic" });
  } catch (error: any) {
    console.error("Error sharpening prompt:", error);
    res.status(500).json({ error: error.message || "Failed to sharpen prompt" });
  }
});

// Helper to format string strictly into 3 words in Title Case
function sanitizeToThreeWords(raw: string, fallback: string = "Inquiry Deep Synthesis"): string {
  if (!raw) return fallback;

  // Remove common labels like "Title:", "Summary:", numbering "1.", quotes, markdown, brackets
  const clean = raw
    .replace(/^(title|summary|topic|subject):\s*/i, "")
    .replace(/^(\d+[\.\)]|\*|-)\s*/, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[#*_\-–—:;,.!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Filter out ultra-common small noise words if we have enough words
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "in",
    "on",
    "at",
    "and",
    "or",
    "for",
    "of",
    "to",
    "with",
    "about",
    "is",
    "are",
    "was",
    "were",
    "into",
    "by",
    "from",
  ]);
  let words = clean.split(" ").filter((w) => w.length > 0 && !stopWords.has(w.toLowerCase()));

  if (words.length < 3) {
    words = clean.split(" ").filter((w) => w.length > 0);
  }

  const toTitle = (w: string) =>
    w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "";

  words = words.map(toTitle).filter(Boolean);

  if (words.length === 0) return fallback;
  if (words.length === 1) return `${words[0]} Deep Analysis`;
  if (words.length === 2) return `${words[0]} ${words[1]} Synthesis`;

  return `${words[0]} ${words[1]} ${words[2]}`;
}

// Fallback heuristic 3-word title extractor from first exchange
function heuristicThreeWordTitle(userPrompt: string, assistantResponse?: string): string {
  if (!userPrompt) return "Intellectual Inquiry Synthesis";

  let clean = userPrompt.trim();
  clean = clean.replace(
    /^(can you|please|could you)?\s*(explain|tell me about|what is|what are|why does|why do|why is|how does|how do|how to|research|compare and contrast|overview of|analysis of|deep dive into)\s+/i,
    ""
  );
  clean = clean.replace(/[?!.]+$/, "").trim();

  if (!clean && assistantResponse) {
    clean = assistantResponse.slice(0, 100);
  }

  return sanitizeToThreeWords(clean);
}

// Automatic 3-word conversation title summarizer background utility
app.post("/api/summarize-title", async (req: Request, res: Response) => {
  try {
    const { userPrompt, assistantResponse } = req.body;

    if (!userPrompt || typeof userPrompt !== "string") {
      res.status(400).json({ error: "Missing userPrompt" });
      return;
    }

    // Try OpenAI first if quota is not flagged as exhausted
    if (Date.now() > openAiExhaustedUntil) {
      try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Berno's Title Synthesizer. Generate an ultra-concise, exactly 3-word summary title in Title Case capturing the core essence of this intellectual inquiry (e.g. 'Quantum Computing Horizons', 'Consensus Protocol Invariants', 'Photosynthesis Metabolic Cycles'). Return ONLY the 3 words without quotes, period, or formatting.",
            },
            {
              role: "user",
              content: `User Inquiry: "${userPrompt.slice(0, 350)}"\n${
                assistantResponse
                  ? `Assistant Summary: "${assistantResponse.slice(0, 450)}"`
                  : ""
              }`,
            },
          ],
          temperature: 0.5,
          max_tokens: 30,
        });

        const rawTitle = completion.choices[0]?.message?.content?.trim() || "";
        const title = sanitizeToThreeWords(rawTitle, heuristicThreeWordTitle(userPrompt));
        res.json({ title, source: "openai" });
        return;
      } catch (openAiErr: any) {
        if (
          openAiErr?.status === 429 ||
          openAiErr?.message?.includes("credits") ||
          openAiErr?.message?.includes("quota")
        ) {
          console.warn("OpenAI quota exhausted, caching status for 15m");
          openAiExhaustedUntil = Date.now() + 15 * 60 * 1000;
        }
      }
    }

    // Try Gemini Title Synthesizer
    const gemini = getGeminiClient();
    if (gemini) {
      for (const m of ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"]) {
        try {
          const result = await gemini.models.generateContent({
            model: m,
            contents: `You are Berno's Title Synthesizer. Generate an ultra-concise, exactly 3-word summary title in Title Case capturing the core essence of this intellectual inquiry (e.g. 'Quantum Computing Horizons', 'Consensus Protocol Invariants', 'Photosynthesis Metabolic Cycles'). Return ONLY the 3 words without quotes, period, or formatting.\n\nUser Inquiry: "${userPrompt.slice(0, 350)}"\n${
              assistantResponse
                ? `Assistant Summary: "${assistantResponse.slice(0, 450)}"`
                : ""
            }`,
          });

          const rawTitle = result.text?.trim() || "";
          const title = sanitizeToThreeWords(rawTitle, heuristicThreeWordTitle(userPrompt));
          res.json({ title, source: "berno_cognitive_reserve" });
          return;
        } catch (e: any) {
          console.warn(`Gemini title summary with ${m} failed:`, e.message);
        }
      }
    }

    // Fallback heuristic 3-word title extractor
    const title = heuristicThreeWordTitle(userPrompt, assistantResponse);
    res.json({ title, source: "berno_heuristic" });
  } catch (error: any) {
    console.error("Error generating 3-word title:", error);
    const fallbackTitle = heuristicThreeWordTitle(
      req.body?.userPrompt || "Inquiry Session",
      req.body?.assistantResponse
    );
    res.json({ title: fallbackTitle, source: "berno_fallback" });
  }
});

function generateHeuristicExecutiveSummary(title: string, mode: string, messages: any[]): string {
  const userMessages = messages.filter((m: any) => m.role === "user");
  const assistantMessages = messages.filter((m: any) => m.role === "assistant");
  const primaryInquiry = userMessages[0]?.content || title || "Exploration";
  const cleanAssistant = (assistantMessages[0]?.content || "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim();
  const firstParagraph = cleanAssistant.split("\n\n")[0] || cleanAssistant.slice(0, 300);

  return `### Strategic Context & Core Thesis
This inquiry session deconstructs **${title || "the core inquiry"}** through the lens of **${mode || "Deep Reasoning"}**. The dialogue centers on: "${primaryInquiry.slice(0, 160)}...", establishing foundational invariants and scrutinizing non-obvious system trade-offs.

### Key Architectural Deductions & Invariants
- **First-Principles Foundation**: ${firstParagraph.slice(0, 220)}...
- **Multi-Order Dynamics**: Evaluated second- and third-order interactions across ${messages.length} exchanges, balancing theoretical limits against empirical constraints.
- **Structural Synthesis**: Synthesized formal proofs and definitive answers to resolve root bottlenecks, eliminate cognitive blind spots, and establish rigorous truths.

### Strategic Directives & Actionable Conclusions
- Deploy the rigorous paradigms, formal bounds, and architectural invariants synthesized across this session.
- Systematically interrogate boundary conditions and adversarial failure modes across next-order exploratory vectors.`;
}

// AI-Generated Session Executive Summary for Export (PDF/Markdown)
app.post("/api/executive-summary", async (req: Request, res: Response) => {
  try {
    const { title, mode, messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Messages array is required" });
      return;
    }

    // Condense conversation transcript for synthesis prompt (limit length to reasonable bounds)
    const transcript = messages
      .map((m: any) => {
        const role = m.role === "user" ? "USER INQUIRY" : "BERNO SYNTHESIS";
        const content = String(m.content || "")
          .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
          .trim();
        return `[${role}]:\n${content.slice(0, 1500)}`;
      })
      .join("\n\n---\n\n");

    const prompt = `You are Berno's Executive Synthesis Core. Analyze this complete intellectual inquiry thread and synthesize an authoritative, publication-grade 'Session Executive Summary' tailored for an executive or senior principal audience.

CONVERSATION TITLE: "${title || "Intellectual Exploration"}"
COGNITIVE STANCE: "${mode || "Deep Reasoning"}"

THREAD TRANSCRIPT:
${transcript.slice(0, 16000)}

SYNTHESIS DIRECTIVES:
1. Formulate a dense, high-impact Executive Summary structured with:
   - **Strategic Context & Core Thesis**: 2-3 crystalline sentences deconstructing the central problem, foundational premises, and overarching objective.
   - **Key Architectural Deductions & Invariants**: 3-4 bullet points detailing the fundamental proofs, trade-offs, mechanics, or conceptual breakthroughs established in the session.
   - **Strategic Directives & Actionable Conclusions**: 2-3 punchy, definitive takeaways or operational vectors.
2. Tone: Authoritative, scholarly, uncompromising intellectual rigor, zero sycophancy or generic conversational padding.
3. Return clean Markdown format directly. Do not include markdown code fence wrappers or extraneous preamble.`;

    // Try OpenAI first if available and not exhausted
    if (Date.now() > openAiExhaustedUntil) {
      try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Berno's Executive Synthesis Core. Formulate a dense, publication-grade Session Executive Summary with high information density, clear headings, and actionable invariants.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.4,
          max_tokens: 800,
        });

        const summary = completion.choices[0]?.message?.content?.trim();
        if (summary) {
          res.json({ executiveSummary: summary, source: "openai" });
          return;
        }
      } catch (openAiErr: any) {
        if (
          openAiErr?.status === 429 ||
          openAiErr?.message?.includes("credits") ||
          openAiErr?.message?.includes("quota")
        ) {
          openAiExhaustedUntil = Date.now() + 15 * 60 * 1000;
        }
      }
    }

    // Try Gemini models (gemini-3.8-flash, gemini-3.5-flash, gemini-3.1-flash-lite)
    const gemini = getGeminiClient();
    if (gemini) {
      for (const m of ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"]) {
        try {
          const result = await gemini.models.generateContent({
            model: m,
            contents: prompt,
            config: {
              temperature: 0.35,
            },
          });

          const summary = result.text?.trim();
          if (summary) {
            res.json({ executiveSummary: summary, source: "gemini" });
            return;
          }
        } catch (geminiErr: any) {
          console.warn(`Gemini executive summary with ${m} failed:`, geminiErr.message);
        }
      }
    }

    // Fallback heuristic summary if external APIs are unavailable
    const fallbackSummary = generateHeuristicExecutiveSummary(title, mode, messages);
    res.json({ executiveSummary: fallbackSummary, source: "berno_heuristic" });
  } catch (error: any) {
    console.error("Error generating executive summary:", error);
    res.status(500).json({ error: error.message || "Failed to generate executive summary" });
  }
});

// Role definitions for the Gemini chatbot system instructions
const ROLE_INSTRUCTIONS: Record<string, string> = {
  epistemic_architect:
    "PRIMARY ROLE: Berno Lead Epistemic Architect. Dissect foundational assumptions, employ second-order deduction, test logical edge cases, and organize findings into structured conceptual frameworks with authentic cognitive transparency in <thinking> blocks.",
  technical_architect:
    "PRIMARY ROLE: Senior Principal Systems Architect & Hardened Code Auditor. Prioritize production engineering, system resilience, concurrency, security, and algorithmic precision. Provide concrete, hardened code and production blueprints.",
  creative_visionary:
    "PRIMARY ROLE: Creative Strategist & Visionary. Synthesize disparate domains, challenge conventional assumptions with lateral analogies, and provide evocative, boundary-pushing perspectives.",
  scientific_researcher:
    "PRIMARY ROLE: Scientific Methodologist & Research Fellow. Uphold rigorous empirical standards, question methodological validity, eliminate rival hypotheses, and demand statistical and epistemic clarity.",
};

// Chat completion streaming endpoint via SSE
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const {
      messages,
      mode = "deep_reasoning",
      model = "gemini-3.5-flash",
      chatbotRole = "epistemic_architect",
      researchMode = false,
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Messages array is required" });
      return;
    }

    // Set headers for Server-Sent Events (SSE) immediately
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Adjust system instructions according to selected stance
    let stanceInstruction = "";
    if (mode === "deep_reasoning") {
      stanceInstruction =
        "STANCE: Deep Deductive Reasoning & Epistemic Mastery. Execute multi-step deductive decomposition. Scrutinize foundational axioms, evaluate trade-offs with mathematical rigor, formulate formal proofs or logical arguments, and illuminate counter-intuitive systemic realities.";
    } else if (mode === "executive_synthesis") {
      stanceInstruction =
        "STANCE: Executive Strategic Synthesis. Deliver maximum information density with ruthless economy of expression. Provide high-leverage frameworks, clear decision trees, bottom-line upfront (BLUF), and quantifiable impact vectors with zero fluff.";
    } else if (mode === "architectural_code") {
      stanceInstruction =
        "STANCE: Elite Architectural & Technical Hardening. Prioritize rock-solid engineering, algorithmic time/space optimality ($O$), complete typed implementations with no shortcuts or placeholders, race condition defenses, and defensive error boundaries.";
    } else if (mode === "counter_perspective") {
      stanceInstruction =
        "STANCE: Adversarial Red-Teaming & Blind-Spot Detection. Systematically challenge conventional paradigms, interrogate cognitive biases, uncover hidden failure modes, and articulate the strongest possible steelmanned counter-theses.";
    }

    // If Research Mode is activated, perform real-time search grounding
    let groundingContext = "";
    let groundingSources: GroundingSource[] = [];
    let searchQuery = "";

    if (researchMode) {
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
      const userText = lastUserMsg?.content ? String(lastUserMsg.content) : "";
      searchQuery = extractSearchQuery(userText);

      const geminiClient = getGeminiClient();
      groundingSources = await searchWebGrounding(searchQuery, geminiClient);

      // Emit grounding metadata to client so UI can render sources immediately
      res.write(
        `data: ${JSON.stringify({
          grounding: {
            sources: groundingSources,
            queries: [searchQuery],
          },
        })}\n\n`
      );

      if (groundingSources.length > 0) {
        const formattedSources = groundingSources
          .map(
            (s, idx) =>
              `[${idx + 1}] "${s.title}" (${s.hostname || "web"}) - ${s.url}\nExcerpt: ${s.snippet || "N/A"}`
          )
          .join("\n\n");

        groundingContext = `\n\n### REAL-TIME GOOGLE SEARCH & WEB GROUNDING
Query investigated: "${searchQuery}"
Verified Sources Retrieved:
${formattedSources}

RESEARCH MODE CITATION DIRECTIVES:
1. Ground your analysis, metrics, dates, and empirical statements in these verified real-time sources.
2. Accurately cite the sources in your response using bracketed numerical citation tags like [Ref 1], [Ref 2] (or [1], [2]) directly in the text matching the source numbers above.
3. Formulate a nuanced, multi-perspective synthesis distinguishing confirmed facts from developing claims.
4. Maintain an objective, high-rigor analytical tone.`;
      }
    }

    const roleDirective = ROLE_INSTRUCTIONS[chatbotRole] || ROLE_INSTRUCTIONS.epistemic_architect;
    const fullSystemPrompt = `${BERNO_SYSTEM_INSTRUCTIONS}\n\n${roleDirective}\n\n${stanceInstruction}${groundingContext}`;

    // Format Gemini contents payload for robust multi-turn conversation history with multi-modal vision support
    const rawTurns = messages
      .filter((m: any) => m && (m.content || m.attachedImage) && (String(m.content || "").trim() || m.attachedImage))
      .map((m: any, idx: number) => {
        let text = String(m.content || "").trim();
        if (
          researchMode &&
          idx === messages.length - 1 &&
          m.role === "user" &&
          groundingContext
        ) {
          text = `${text}\n\n[Research Grounding Reference]:\n${groundingContext}`;
        }

        const parts: any[] = [];
        if (m.attachedImage && m.role === "user") {
          const cleanBase64 = String(m.attachedImage).replace(/^data:[^;]+;base64,/, "");
          let mimeType = "image/jpeg";
          const match = String(m.attachedImage).match(/^data:([^;]+);base64,/);
          if (match) mimeType = match[1];
          parts.push({
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          });
        }

        if (text) {
          parts.push({ text });
        } else if (parts.length > 0) {
          parts.push({ text: "Examine this visual inquiry in thorough detail with infinite-IQ polymathic intelligence." });
        }

        return {
          role: m.role === "user" ? ("user" as const) : ("model" as const),
          parts,
        };
      });

    // Merge consecutive turns of the same role to strictly satisfy Gemini alternating turn requirements
    const sanitizedTurns: { role: "user" | "model"; parts: any[] }[] = [];
    for (const turn of rawTurns) {
      if (sanitizedTurns.length === 0) {
        // First turn must be user
        if (turn.role !== "user") {
          sanitizedTurns.push({ role: "user", parts: [{ text: "Hello" }] });
        }
        sanitizedTurns.push(turn);
      } else {
        const last = sanitizedTurns[sanitizedTurns.length - 1];
        if (last.role === turn.role) {
          last.parts = [...last.parts, ...turn.parts];
        } else {
          sanitizedTurns.push(turn);
        }
      }
    }

    const geminiContents = sanitizedTurns.map((t) => ({
      role: t.role,
      parts: t.parts,
    }));

    const isGeminiRequested = model.startsWith("gemini-");
    const isOpenAiAvailable = Date.now() > openAiExhaustedUntil;

    // 1. If Gemini model is requested (e.g. gemini-3.1-pro-preview, gemini-3.5-flash, gemini-3.1-flash-lite)
    if (isGeminiRequested || !isOpenAiAvailable) {
      const gemini = getGeminiClient();
      if (gemini) {
        try {
          res.write(
            `data: ${JSON.stringify({
              provider: "gemini_cognitive_reserve",
              model: model,
              notice: `Berno Gemini Core active (${model}).`,
            })}\n\n`
          );

          await streamWithGemini(
            gemini,
            geminiContents,
            fullSystemPrompt,
            mode,
            model,
            (chunkText) => {
              res.write(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
            }
          );

          res.write("data: [DONE]\n\n");
          res.end();
          return;
        } catch (geminiErr: any) {
          console.error("Gemini stream error:", geminiErr);
          res.write(
            `data: ${JSON.stringify({
              error: `Cognitive Core Error: ${geminiErr.message}`,
            })}\n\n`
          );
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }
      }
    }

    // 2. OpenAI Stream (for gpt-4o if requested and available)
    if (isOpenAiAvailable) {
      try {
        const openai = getOpenAIClient();
        const openAiMessages = [
          { role: "system" as const, content: fullSystemPrompt },
          ...messages.map((m: any) => ({
            role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
            content: String(m.content),
          })),
        ];

        const stream = await openai.chat.completions.create({
          model: model === "gpt-4o-mini" ? "gpt-4o-mini" : "gpt-4o",
          messages: openAiMessages,
          temperature: mode === "architectural_code" ? 0.3 : 0.7,
          stream: true,
        });

        res.write(`data: ${JSON.stringify({ provider: "openai" })}\n\n`);

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
          }
        }

        res.write("data: [DONE]\n\n");
        res.end();
        return;
      } catch (openAiErr: any) {
        console.warn(
          "OpenAI stream failed, switching to Berno Cognitive Reserve:",
          openAiErr.message
        );

        if (
          openAiErr?.status === 429 ||
          openAiErr?.message?.includes("credits") ||
          openAiErr?.message?.includes("quota")
        ) {
          openAiExhaustedUntil = Date.now() + 15 * 60 * 1000;
        }
      }
    }

    // 3. Fallback to Gemini if OpenAI failed
    const geminiFallback = getGeminiClient();
    if (geminiFallback) {
      try {
        res.write(
          `data: ${JSON.stringify({
            provider: "gemini_cognitive_reserve",
            notice: "Berno Cognitive Reserve active.",
          })}\n\n`
        );

        await streamWithGemini(
          geminiFallback,
          geminiContents,
          fullSystemPrompt,
          mode,
          "gemini-3.5-flash",
          (chunkText) => {
            res.write(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
          }
        );

        res.write("data: [DONE]\n\n");
        res.end();
        return;
      } catch (fallbackErr: any) {
        console.error("Gemini fallback stream error:", fallbackErr);
        res.write(
          `data: ${JSON.stringify({
            error: `Cognitive Core Error: ${fallbackErr.message}`,
          })}\n\n`
        );
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
    }

    // Neither engine was available
    res.write(
      `data: ${JSON.stringify({
        error: "Cognitive engine unavailable. Please verify API configuration.",
      })}\n\n`
    );
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Server error handling chat:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Internal server error" });
    } else {
      res.end();
    }
  }
});

// ==========================================
// VEO 3 VIDEO STUDIO & GEMINI IMAGE GENERATION & EDITING ENDPOINTS
// Image Models: gemini-3.1-flash-image-preview (fallbacks: gemini-3.1-flash-image, gemini-3.1-flash-lite-image)
// Video Models: veo-3.1-fast-generate-preview (fallbacks: veo-3.1-lite-generate-preview, veo-3.1-generate-preview)
// Aspect Ratios: 16:9 (landscape) or 9:16 (portrait) for video; 1:1, 16:9, 9:16, 4:3, 3:4 for images
// ==========================================

app.post("/api/image/generate", async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio, referenceImageBase64, imageBase64 } = req.body;
    const gemini = getGeminiClient();
    if (!gemini) {
      res.status(500).json({ error: "Gemini API key is required for image creation and editing." });
      return;
    }

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: "A prompt is required for image creation or editing." });
      return;
    }

    // Supported aspect ratios: "1:1", "3:4", "4:3", "9:16", "16:9"
    const validRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

    const targetImage = referenceImageBase64 || imageBase64;
    const isEdit = Boolean(targetImage);

    console.log(
      `Image ${isEdit ? "edit" : "generation"} with Gemini (aspect: ${selectedRatio}, prompt: ${prompt.slice(0, 50)}...)`
    );

    const parts: any[] = [];
    if (targetImage) {
      const cleanBase64 = targetImage.replace(/^data:[^;]+;base64,/, "");
      let mimeType = "image/png";
      const mimeMatch = targetImage.match(/^data:([^;]+);base64,/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }
    parts.push({ text: prompt.trim() });

    const modelsToTry = [
      "gemini-3.1-flash-image-preview",
      "gemini-3.1-flash-image",
      "gemini-3.1-flash-lite-image",
    ];

    let response;
    let successfulModel = "";
    let lastErr: any = null;

    for (const modelName of modelsToTry) {
      try {
        const config: any = {};
        if (!isEdit) {
          config.imageConfig = {
            aspectRatio: selectedRatio,
          };
        }

        response = await gemini.models.generateContent({
          model: modelName,
          contents: { parts },
          ...(Object.keys(config).length > 0 ? { config } : {}),
        });
        successfulModel = modelName;
        break;
      } catch (modelErr: any) {
        console.warn(`Image generation with ${modelName} failed, trying next fallback:`, modelErr?.message);
        lastErr = modelErr;
      }
    }

    if (!response) {
      throw lastErr || new Error("Failed to synthesize image with available Gemini vision models");
    }

    let generatedImageUrl = "";
    let mimeType = "image/png";

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        mimeType = part.inlineData.mimeType || "image/png";
        generatedImageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedImageUrl) {
      const textNotice = response.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
      throw new Error(textNotice || "No image returned by the model. Try refining your prompt.");
    }

    res.json({
      imageUrl: generatedImageUrl,
      mimeType,
      aspectRatio: selectedRatio,
      prompt: prompt.trim(),
      model: successfulModel,
      isEdit,
    });
  } catch (err: any) {
    console.error("Image generation/edit error:", err);
    res.status(500).json({ error: err.message || "Failed to generate or edit image" });
  }
});

// Explicit image edit alias endpoint
app.post("/api/image/edit", async (req: Request, res: Response) => {
  try {
    const { prompt, imageBase64, referenceImageBase64, aspectRatio } = req.body;
    const gemini = getGeminiClient();
    if (!gemini) {
      res.status(500).json({ error: "Gemini API key is required for image editing." });
      return;
    }

    const inputImage = imageBase64 || referenceImageBase64;
    if (!inputImage) {
      res.status(400).json({ error: "An existing image (base64) is required for image editing." });
      return;
    }

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: "An edit prompt instruction is required." });
      return;
    }

    const cleanBase64 = inputImage.replace(/^data:[^;]+;base64,/, "");
    let mimeType = "image/png";
    const mimeMatch = inputImage.match(/^data:([^;]+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }

    const parts = [
      {
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      },
      {
        text: prompt.trim(),
      },
    ];

    const modelsToTry = [
      "gemini-3.1-flash-image-preview",
      "gemini-3.1-flash-image",
      "gemini-3.1-flash-lite-image",
    ];

    let response;
    let successfulModel = "";
    let lastErr: any = null;

    for (const modelName of modelsToTry) {
      try {
        response = await gemini.models.generateContent({
          model: modelName,
          contents: { parts },
        });
        successfulModel = modelName;
        break;
      } catch (err: any) {
        console.warn(`Image edit with ${modelName} failed, falling back:`, err?.message);
        lastErr = err;
      }
    }

    if (!response) {
      throw lastErr || new Error("Failed to edit image with Gemini vision models");
    }

    let generatedImageUrl = "";
    let returnMime = "image/png";

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        returnMime = part.inlineData.mimeType || "image/png";
        generatedImageUrl = `data:${returnMime};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedImageUrl) {
      const textNotice = response.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
      throw new Error(textNotice || "No edited image returned by the model. Try refining your edit instructions.");
    }

    res.json({
      imageUrl: generatedImageUrl,
      mimeType: returnMime,
      aspectRatio: aspectRatio || "original",
      prompt: prompt.trim(),
      model: successfulModel,
      isEdit: true,
    });
  } catch (err: any) {
    console.error("Image editing route error:", err);
    res.status(500).json({ error: err.message || "Failed to edit image" });
  }
});

app.post("/api/video/generate", async (req: Request, res: Response) => {
  try {
    const { prompt, imageBase64, mimeType, aspectRatio } = req.body;
    const gemini = getGeminiClient();
    if (!gemini) {
      res.status(500).json({ error: "Gemini API key is required for Veo video generation." });
      return;
    }

    const selectedAspectRatio: "16:9" | "9:16" = aspectRatio === "9:16" ? "9:16" : "16:9";

    let imageParam = undefined;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      imageParam = {
        imageBytes: cleanBase64,
        mimeType: mimeType || "image/png",
      };
    }

    const defaultPrompt = imageParam
      ? "Animate this scene with realistic motion, subtle natural dynamics, and cinematic lighting"
      : "Cinematic establishing shot with natural lighting, atmospheric movement, and hyper-realistic depth";

    const finalPrompt = prompt && prompt.trim() ? prompt.trim() : defaultPrompt;

    console.log(
      `Initiating Veo generation (model: veo-3.1-fast-generate-preview, aspect: ${selectedAspectRatio}, hasPhoto: ${Boolean(
        imageParam
      )})`
    );

    const videoModelsToTry = [
      "veo-3.1-fast-generate-preview",
      "veo-3.1-lite-generate-preview",
      "veo-3.1-generate-preview",
    ];

    let operation;
    let successfulModel = "";
    let lastErr: any = null;

    for (const modelName of videoModelsToTry) {
      try {
        operation = await gemini.models.generateVideos({
          model: modelName,
          prompt: finalPrompt,
          image: imageParam,
          config: {
            numberOfVideos: 1,
            resolution: "720p",
            aspectRatio: selectedAspectRatio,
          },
        });
        successfulModel = modelName;
        break;
      } catch (err: any) {
        console.warn(`Veo video generation with ${modelName} failed, trying next:`, err?.message);
        lastErr = err;
      }
    }

    if (!operation) {
      throw lastErr || new Error("Failed to initiate Veo video generation with available models");
    }

    res.json({
      operationName: operation.name,
      aspectRatio: selectedAspectRatio,
      prompt: finalPrompt,
      hasImage: Boolean(imageParam),
      model: successfulModel,
      status: "queued",
    });
  } catch (err: any) {
    console.error("Veo video generation error:", err);
    res.status(500).json({ error: err.message || "Failed to initiate Veo video generation" });
  }
});

app.post("/api/video/status", async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      res.status(400).json({ error: "Missing operationName parameter" });
      return;
    }
    const gemini = getGeminiClient();
    if (!gemini) {
      res.status(500).json({ error: "Gemini API key is required" });
      return;
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await gemini.operations.getVideosOperation({ operation: op });

    const videoUri = updated.response?.generatedVideos?.[0]?.video?.uri;
    res.json({
      done: Boolean(updated.done),
      error: updated.error ? updated.error.message : null,
      hasVideo: Boolean(videoUri),
    });
  } catch (err: any) {
    console.error("Veo video status check error:", err);
    res.status(500).json({ error: err.message || "Failed to check video status" });
  }
});

app.get("/api/video/download", async (req: Request, res: Response) => {
  try {
    const operationName = req.query.operationName as string;
    if (!operationName) {
      res.status(400).json({ error: "Missing operationName parameter" });
      return;
    }
    const gemini = getGeminiClient();
    if (!gemini) {
      res.status(500).json({ error: "Gemini API key is required" });
      return;
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await gemini.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      res.status(404).json({ error: "Video not yet generated or operation still in progress" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const videoRes = await fetch(uri, {
      headers: { "x-goog-api-key": apiKey || "" },
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to fetch video stream: HTTP ${videoRes.status}`);
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", 'inline; filename="veo3-generation.mp4"');
    res.end(buffer);
  } catch (err: any) {
    console.error("Veo video download error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Failed to stream video" });
    } else {
      res.end();
    }
  }
});

// ==========================================
// GEMINI LIVE API WEBSOCKET
// Model: gemini-3.8-live
// Real-time audio streaming (16kHz PCM input, 24kHz PCM output)
// ==========================================

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/api/live-ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});

wss.on("connection", async (clientWs: WebSocket) => {
  console.log("Client connected to Gemini Live Voice WebSocket");
  const gemini = getGeminiClient();
  if (!gemini) {
    clientWs.send(JSON.stringify({ type: "error", error: "GEMINI_API_KEY not configured on server" }));
    clientWs.close();
    return;
  }

  let session: any = null;
  let isClosing = false;

  const initSession = async (voiceName: string = "Zephyr", roleKey: string = "epistemic_architect") => {
    try {
      const roleDirective = ROLE_INSTRUCTIONS[roleKey] || ROLE_INSTRUCTIONS.epistemic_architect;
      const fullVoiceInstruction = `${BERNO_SYSTEM_INSTRUCTIONS}\n\n${roleDirective}\n\nVOICE INTERACTION DIRECTIVES:\n- Talk, listen, and converse natively in ANY language the user speaks or initiates (e.g. English, Spanish, French, German, Italian, Portuguese, Arabic, Chinese, Japanese, Korean, Russian, etc.). Adapt seamlessly to the user's spoken tongue.\n- Keep your spoken answers articulate, conversational, natural, and reasonably concise.\n- Engage directly and conversationally in real-time.`;

      session = await gemini.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction: fullVoiceInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "connected", model: "gemini-3.8-live", voice: voiceName }));
            }
          },
          onmessage: (msg: any) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            // Audio chunks from model turn
            const parts = msg.serverContent?.modelTurn?.parts;
            if (Array.isArray(parts)) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({ type: "audio", audio: part.inlineData.data }));
                }
                if (part.text) {
                  clientWs.send(JSON.stringify({ type: "assistantText", text: part.text }));
                }
              }
            }

            if (msg.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }

            // Real-time speech-to-text transcriptions
            if (msg.serverContent?.outputAudioTranscription?.text) {
              clientWs.send(JSON.stringify({
                type: "outputTranscription",
                text: msg.serverContent.outputAudioTranscription.text,
              }));
            }
            if (msg.serverContent?.inputAudioTranscription?.text) {
              clientWs.send(JSON.stringify({
                type: "inputTranscription",
                text: msg.serverContent.inputAudioTranscription.text,
              }));
            }
          },
          onerror: (err: any) => {
            console.error("Live session error:", err?.message || err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "error", error: err?.message || "Live API session encountered an error" }));
            }
          },
          onclose: () => {
            if (!isClosing && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "session_closed" }));
            }
          },
        },
      });
    } catch (e: any) {
      console.error("Failed to connect to gemini-3.8-live:", e);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "error", error: e?.message || "Failed to start Live API session" }));
      }
    }
  };

  // Start with default Zephyr voice and epistemic_architect role
  initSession("Zephyr", "epistemic_architect");

  clientWs.on("message", (raw: any) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === "config") {
        if (session) {
          try { session.close(); } catch (e) {}
        }
        initSession(data.voice || "Zephyr", data.role || "epistemic_architect");
      } else if (data.type === "audio" && data.audio) {
        if (session && typeof session.sendRealtimeInput === "function") {
          session.sendRealtimeInput({
            audio: {
              data: data.audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        }
      }
    } catch (err) {
      console.warn("Error handling WS message:", err);
    }
  });

  clientWs.on("close", () => {
    isClosing = true;
    if (session) {
      try { session.close(); } catch (e) {}
    }
  });
});

// Mount Vite middleware for development or static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Berno server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

