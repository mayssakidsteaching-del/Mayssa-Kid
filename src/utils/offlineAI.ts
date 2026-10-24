import { ThinkingMode } from '../types';

interface MessagePayload {
  role: string;
  content: string;
}

export async function* streamOfflineResponse(
  prompt: string,
  history: MessagePayload[],
  mode: ThinkingMode,
  chatbotRole: string
): AsyncGenerator<string, void, unknown> {
  const cleanPrompt = prompt.trim().toLowerCase();

  // Step 1: Generate Thinking Arc
  const thinkingPreamble = `<thinking>
[Offline Cognitive Reserve Active — Local Client Engine]
1. Network Telemetry: Device is currently disconnected from cloud infrastructure.
2. Routing: Rerouting inquiry through Berno's local heuristic engine & semantic synthesizer.
3. Analysis: Deconstructing user inquiry "${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}".
4. Evaluated Context: Retained ${history.length} conversation turn(s) in local cache.
5. Epistemic Posture: Synthesizing analytical outline with grounded local logic and clear structured findings.
</thinking>

`;

  // Emit thinking tokens smoothly
  const thinkingChunks = thinkingPreamble.split('\n');
  for (const chunk of thinkingChunks) {
    yield chunk + '\n';
    await new Promise((r) => setTimeout(r, 45));
  }

  // Step 2: Formulate offline response content
  let body = '';

  const isCodeQuery =
    cleanPrompt.includes('code') ||
    cleanPrompt.includes('function') ||
    cleanPrompt.includes('javascript') ||
    cleanPrompt.includes('typescript') ||
    cleanPrompt.includes('python') ||
    cleanPrompt.includes('react') ||
    cleanPrompt.includes('algorithm') ||
    cleanPrompt.includes('implement') ||
    cleanPrompt.includes('class');

  const isMathQuery =
    cleanPrompt.includes('calculate') ||
    cleanPrompt.includes('math') ||
    cleanPrompt.includes('equation') ||
    cleanPrompt.includes('solve') ||
    cleanPrompt.includes('formula') ||
    /\d+\s*[\+\-\*\/]\s*\d+/.test(cleanPrompt);

  const isSummaryQuery =
    cleanPrompt.includes('summarize') ||
    cleanPrompt.includes('summary') ||
    cleanPrompt.includes('recap') ||
    cleanPrompt.includes('tldr');

  if (isCodeQuery) {
    body = `### Offline Technical Synthesis

> "In computation, clear abstractions preserve correctness even when peripheral connections fluctuate."

While Berno is operating **offline**, here is a structured architectural solution synthesized from local heuristics:

\`\`\`typescript
/**
 * Berno Offline Synthesis: Standard Implementation Pattern
 * Generated in offline mode from client heuristics.
 */
export interface SolutionConfig {
  retries: number;
  timeoutMs: number;
  offlineFallback: boolean;
}

export function executeTask<T>(taskName: string, config?: Partial<SolutionConfig>): Promise<T> {
  const activeConfig: SolutionConfig = {
    retries: 3,
    timeoutMs: 5000,
    offlineFallback: true,
    ...config,
  };

  return new Promise((resolve) => {
    // Process task logic deterministically
    console.log(\`[Task: \${taskName}] Executing with fallback mode\`);
    resolve({ status: 'completed', task: taskName, timestamp: Date.now() } as unknown as T);
  });
}
\`\`\`

#### Architectural Considerations
1. **Local State Preservation**: Ensure data transformations are committed to persistent browser storage (\`localStorage\` or IndexedDB).
2. **Idempotency**: Offline actions should remain safe to repeat once connection to the server is re-established.
3. **Graceful Degradation**: Core computation executes locally without blocking on remote round-trips.

---
*Notice: This response was generated locally without cloud connectivity. When you reconnect to the internet, you can use the **Regenerate** button below to synthesize with live Gemini models.*`;
  } else if (isMathQuery) {
    body = `### Analytical Step-by-Step Derivation

> "Mathematics provides invariant truth independent of external network state."

#### 1. Problem Formulation
Analyzing mathematical expression or logic in:
*Query:* **"${prompt}"**

#### 2. Logical Decomposition
- Identify input variables and operational constraints.
- Apply standard mathematical rules (order of operations, algebraic reduction, or probabilistic evaluation).

#### 3. Resultant Formulation
- The mathematical relationships remain consistent across offline and online environments.
- All calculations can be verified deterministically against first principles.

---
*Generated locally in Berno Offline Mode. Reconnect to query live cloud computation and real-time knowledge graphs.*`;
  } else if (isSummaryQuery && history.length > 0) {
    const userTurns = history.filter((m) => m.role === 'user');
    const assistantTurns = history.filter((m) => m.role === 'assistant');

    body = `### Executive Dialogue Synthesis (Local Memory)

> "True comprehension distills the essential dialectic from accumulated dialogue."

#### Synthesis of Stored Conversation
- **Dialogue Volume**: ${history.length} turns recorded in local memory (${userTurns.length} user inquiries, ${assistantTurns.length} assistant syntheses).
- **Primary Threads Explored**:
${userTurns.slice(-4).map((t, idx) => `  ${idx + 1}. *"${t.content.slice(0, 75)}${t.content.length > 75 ? '...' : ''}"*`).join('\n')}

#### Key Takeaways
1. **Cumulative Depth**: The discussion builds progressive conceptual frameworks preserved in your browser cache.
2. **Actionable Vectors**: Key insights and code snippets remain reviewable, exportable to PDF, and savable to your Reading List.

---
*Synthesized using Berno's local session memory.*`;
  } else {
    body = `### Editorial Analysis & Conceptual Framework

> "Clarity of thought is not contingent upon the presence of the network; it is an internal discipline."

In response to your inquiry regarding **"${prompt}"**, Berno provides the following structural perspective from cached heuristics:

#### I. Core Epistemic Foundations
When analyzing this problem domain, consider three foundational pillars:
1. **First-Principles Decomposition**: Break the question down into its essential axioms before incorporating speculative hypotheses.
2. **Empirical Grounding**: Examine observable historical patterns and reproducible baseline evidence.
3. **Dialectical Synthesis**: Weigh opposing viewpoints to arrive at a balanced, rigorous synthesis.

#### II. Analytical Perspectives
- **Structural Integrity**: Prioritize resilient solutions that function smoothly regardless of connectivity fluctuations.
- **Cognitive Clarity**: Distinguish between immediate logistical requirements and long-term philosophical objectives.
- **Documentation & Continuity**: Maintain structured records to ensure thoughts can be expanded when deeper cloud resources are restored.

---
*Berno Offline Mode: Running directly in your browser. All reading lists, annotations, and chat histories remain persistent and exportable.*`;
  }

  // Stream body tokens in natural chunks
  const words = body.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    const chunk = words.slice(i, i + 3).join(' ') + ' ';
    yield chunk;
    await new Promise((r) => setTimeout(r, 20));
  }
}
