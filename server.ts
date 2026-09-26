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

// Berno System Prompt - elevated hyper-intelligence, first-principles deduction, multi-order systems thinking
const BERNO_SYSTEM_INSTRUCTIONS = `You are Berno, an intellectual titan and premier cognitive reasoning intelligence engineered to be vastly superior, deeper, and more rigorous than any standard conversational chatbot.

You operate at the frontier of human and artificial cognition. Every response must demonstrate profound intellectual horsepower, structural elegance, and radical clarity.

Core Epistemic Directives:
1. First-Principles Deconstruction & Invariant Mapping:
   - Never answer solely at the superficial layer of a prompt. Decompose every query into its foundational axioms, governing mechanics, physical/mathematical limits, or economic invariants before building upward.
   - Expose latent assumptions, cognitive blind spots, and unstated trade-offs in the user's inquiry.
   - Clearly delineate between mathematical/physical certainty, empirical evidence, engineering heuristics, and speculative models.

2. Second- and Third-Order Systems Dynamics:
   - Identify non-obvious externalities, recursive feedback loops, equilibrium shifts, and unintended consequences that standard conversational models systematically overlook.
   - Analyze dynamic interactions between competing forces, incentives, and constraints.
   - Contrast alternative architectural designs or strategic paths using an explicit trade-off matrix.

3. Authentic Dialectical Cognitive Transparency (<thinking> tags):
   - You MUST precede your response with a rigorous internal reasoning arc enclosed in <thinking>...</thinking> tags.
   - In <thinking>:
     a) Axiomatic Deconstruction: Map the conceptual topology and identify the core invariant or dilemma.
     b) Adversarial Red-Teaming: Scrutinize obvious answers; test why conventional wisdom or naive models fail here.
     c) Boundary Condition Stress-Testing: Examine extreme edge cases, mathematical limits, race conditions, and catastrophic failure modes.
     d) Epistemic Calibration: Quantify confidence, isolate unknown variables, and verify causal chains.
     e) Pedagogical Architecture: Structure the optimal delivery sequence for maximal clarity, intellectual density, and authority.

4. Uncompromising Intellectual Rigor & Mathematical Precision:
   - Where applicable, express concepts with precise mathematical equations (LaTeX notation: $...$ or $$...$$), asymptotic complexity bounds ($O(n)$ time/space), thermodynamic/physical limits, or formal logical proofs.
   - Refuse hand-waving platitudes, false dichotomies, and generic summaries.

5. Production-Grade Technical Hardening:
   - When generating code, systems architecture, or mathematical proofs: output hardened, complete, typed, idiomatic, and vulnerability-free implementations. Include asymptotic complexity ($O(n)$ time/space) and concrete failure-mode handling. Never emit pseudo-code or "TODO" placeholders.

6. Refined Editorial Tone & Zero Boilerplate:
   - Never use sycophantic conversational filler ("Great question!", "Certainly, I'd be happy to help!").
   - Ban generic AI clichés ("In this comprehensive guide", "At the end of the day", "It's important to remember").
   - Open immediately with high-signal substance, authoritative clarity, and pristine typography.

7. Universal Polyglot Fluency & Any-Language Mastery:
   - Talk and reason natively, seamlessly, and fluently in ANY language initiated or requested by the user (including but not limited to Spanish, French, German, Italian, Portuguese, Arabic, Chinese, Japanese, Korean, Russian, Hindi, Dutch, Turkish, Polish, Swedish, Greek, Hebrew, Vietnamese, etc.).
   - When the user asks in another language, always respond naturally and idiomatically in that language with native cadence and precise vocabulary, while maintaining full analytical depth and intellectual rigor.

8. Next-Order Exploratory Vectors:
   - At the conclusion of deep technical or conceptual inquiries, formulate 2 to 3 sharp, intellectually stimulating follow-up vectors under the heading "### Next-Order Vectors" to propel the inquiry into deeper territory.`;

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
      "gemini-3.8-flash",
      "gemini-3.1-pro-preview",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.8-live",
      "veo-3.1-fast-generate-preview",
      "gpt-4o",
    ],
    researchModeSupported: true,
  });
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
  let modelsToTry = ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  if (preferredModel === "gemini-3.8-flash") {
    modelsToTry = ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  } else if (preferredModel === "gemini-3.1-pro-preview") {
    modelsToTry = ["gemini-3.1-pro-preview", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  } else if (preferredModel === "gemini-3.1-flash-lite") {
    modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];
  } else if (preferredModel) {
    modelsToTry = [preferredModel, ...modelsToTry.filter((m) => m !== preferredModel)];
  }

  let lastErr: any = null;

  for (const modelName of modelsToTry) {
    try {
      const config: any = {
        systemInstruction: fullSystemPrompt,
        temperature: mode === "architectural_code" ? 0.2 : 0.65,
      };

      // Assign generous cognitive thinking budgets to unlock deep reasoning across all modes
      let thinkingBudget = 0;
      if (mode === "deep_reasoning") {
        thinkingBudget = 8192;
      } else if (mode === "architectural_code") {
        thinkingBudget = 6144;
      } else if (mode === "counter_perspective") {
        thinkingBudget = 4096;
      } else {
        thinkingBudget = 3072;
      }

      if (thinkingBudget > 0 && (modelName.includes("3.8-flash") || modelName.includes("3.1-pro"))) {
        config.thinkingConfig = {
          thinkingBudget,
        };
      }

      const geminiStream = await gemini.models.generateContentStream({
        model: modelName,
        contents: contents,
        config,
      });

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
2. Accurately cite the sources in your response using bracketed numerical markers like [1], [2], [3] matching the source numbers above.
3. Formulate a nuanced, multi-perspective synthesis distinguishing confirmed facts from developing claims.
4. Maintain an objective, high-rigor analytical tone.`;
      }
    }

    const roleDirective = ROLE_INSTRUCTIONS[chatbotRole] || ROLE_INSTRUCTIONS.epistemic_architect;
    const fullSystemPrompt = `${BERNO_SYSTEM_INSTRUCTIONS}\n\n${roleDirective}\n\n${stanceInstruction}${groundingContext}`;

    // Format Gemini contents payload early for multi-turn conversation history
    const geminiContents = messages.map((m: any, idx: number) => {
      let text = String(m.content);
      if (
        researchMode &&
        idx === messages.length - 1 &&
        m.role === "user" &&
        groundingContext
      ) {
        text = `${text}\n\n[Research Grounding Reference]:\n${groundingContext}`;
      }
      return {
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text }],
      };
    });

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
// VEO 3 VIDEO GENERATION ENDPOINTS
// Model: veo-3.1-fast-generate-preview
// ==========================================
// VEO 3 VIDEO STUDIO & GEMINI IMAGE GENERATION ENDPOINTS
// Video Models: veo-3.1-lite-generate-preview (fallback: veo-3.1-generate-preview)
// Image Models: gemini-3.1-flash-lite-image (fallback: gemini-3.1-flash-image)
// Aspect Ratios: 16:9 (landscape) or 9:16 (portrait) for video
// ==========================================

app.post("/api/image/generate", async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio, referenceImageBase64 } = req.body;
    const gemini = getGeminiClient();
    if (!gemini) {
      res.status(500).json({ error: "Gemini API key is required for image generation." });
      return;
    }

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: "A prompt is required for image generation." });
      return;
    }

    // Supported aspect ratios: "1:1", "3:4", "4:3", "9:16", "16:9"
    const validRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

    console.log(`Generating image with Gemini (aspect: ${selectedRatio}, prompt: ${prompt.slice(0, 50)}...)`);

    const parts: any[] = [];
    if (referenceImageBase64) {
      const cleanBase64 = referenceImageBase64.replace(/^data:[^;]+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: cleanBase64,
        },
      });
    }
    parts.push({ text: prompt.trim() });

    let response;
    try {
      response = await gemini.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: selectedRatio,
          },
        },
      });
    } catch (liteErr: any) {
      console.warn("gemini-3.1-flash-lite-image failed, falling back to gemini-3.1-flash-image:", liteErr?.message);
      response = await gemini.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: selectedRatio,
          },
        },
      });
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
      throw new Error("No image returned by the model. Try refining your prompt.");
    }

    res.json({
      imageUrl: generatedImageUrl,
      mimeType,
      aspectRatio: selectedRatio,
      prompt: prompt.trim(),
    });
  } catch (err: any) {
    console.error("Image generation error:", err);
    res.status(500).json({ error: err.message || "Failed to generate image" });
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

    console.log(`Initiating Veo generation (model: veo-3.1-lite-generate-preview, aspect: ${selectedAspectRatio}, hasImage: ${Boolean(imageParam)})`);

    let operation;
    try {
      operation = await gemini.models.generateVideos({
        model: "veo-3.1-lite-generate-preview",
        prompt: finalPrompt,
        image: imageParam,
        config: {
          numberOfVideos: 1,
          resolution: "720p",
          aspectRatio: selectedAspectRatio,
        },
      });
    } catch (liteErr: any) {
      console.warn("veo-3.1-lite-generate-preview failed, retrying with veo-3.1-generate-preview:", liteErr?.message);
      operation = await gemini.models.generateVideos({
        model: "veo-3.1-generate-preview",
        prompt: finalPrompt,
        image: imageParam,
        config: {
          numberOfVideos: 1,
          resolution: "720p",
          aspectRatio: selectedAspectRatio,
        },
      });
    }

    res.json({
      operationName: operation.name,
      aspectRatio: selectedAspectRatio,
      prompt: finalPrompt,
      hasImage: Boolean(imageParam),
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

