import fs from 'fs';
import path from 'path';

export const INTERVIEWER_PROMPT_VERSION = '1.1.0';
export const EVALUATOR_PROMPT_VERSION = '1.1.0';
export const RUBRIC_VERSION = '2026.1';

export interface LLMTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMExecutionResult<T> {
  data: T;
  latencyMs: number;
  tokenUsage?: LLMTokenUsage;
  model: string;
  provider: 'gemini' | 'openai';
  promptVersion: string;
}

function getEnvVariable(keyName: string): string {
  if (process.env[keyName]) {
    return process.env[keyName]!;
  }

  const envPaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const p of envPaths) {
    try {
      if (fs.existsSync(p)) {
        const fileContent = fs.readFileSync(p, 'utf8');
        const match = fileContent.match(new RegExp(`^${keyName}=(.*)$`, 'm'));
        if (match && match[1]) {
          const val = match[1].trim();
          process.env[keyName] = val;
          return val;
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  return '';
}

export const llmConfig = {
  getGeminiKey(): string {
    return getEnvVariable('GEMINI_API_KEY');
  },
  getOpenAIKey(): string {
    return getEnvVariable('OPENAI_API_KEY');
  },
  getInterviewerModel(): string {
    return getEnvVariable('AI_INTERVIEWER_MODEL') || 'gemini-3.6-flash';
  },
  getEvaluatorModel(): string {
    return getEnvVariable('AI_EVALUATOR_MODEL') || 'gemini-3.6-flash';
  },
  hasActiveKey(): boolean {
    return !!(this.getGeminiKey() || this.getOpenAIKey());
  },
  getActiveProvider(): 'gemini' | 'openai' | 'none' {
    if (this.getGeminiKey()) return 'gemini';
    if (this.getOpenAIKey()) return 'openai';
    return 'none';
  },
};

async function callGeminiJSON<T>(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  validator: (data: any) => { valid: boolean; error?: string }
): Promise<{ data: T; latencyMs: number; tokenUsage: LLMTokenUsage }> {
  const apiKey = llmConfig.getGeminiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in environment or .env.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const executeOnce = async (promptText: string) => {
    const startTime = Date.now();
    const body = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      let cleanErr = `Gemini HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errText);
        cleanErr = parsed.error?.message || cleanErr;
      } catch {
        // use fallback
      }
      cleanErr = cleanErr.replace(apiKey, '[REDACTED_API_KEY]');
      throw new Error(cleanErr);
    }

    const resJson: any = await response.json();
    const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response returned by Gemini model.');
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(text);
    } catch (parseErr: any) {
      throw new Error(`Invalid JSON syntax returned by model: ${parseErr.message}`);
    }

    const validation = validator(parsedData);
    if (!validation.valid) {
      throw new Error(`Schema validation error: ${validation.error}`);
    }

    const tokenUsage: LLMTokenUsage = {
      promptTokens: resJson.usageMetadata?.promptTokenCount || 0,
      completionTokens: resJson.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: resJson.usageMetadata?.totalTokenCount || 0,
    };

    return { data: parsedData as T, latencyMs, tokenUsage };
  };

  const maxRetries = 3;
  let attempt = 0;
  let currentPrompt = userPrompt;

  while (attempt <= maxRetries) {
    try {
      return await executeOnce(currentPrompt);
    } catch (err: any) {
      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }

      // Check if it's a rate limit or quota error with suggested retry time
      let delayMs = 3000;
      const match = err.message?.match(/Please retry in ([0-9.]+)s/i);
      if (err.message?.includes('quota') || err.message?.includes('429')) {
        // Wait at least 65 seconds to allow the rolling 60s rate limit window to completely reset
        const parsedSec = match && match[1] ? parseFloat(match[1]) + 5 : 65;
        delayMs = Math.max(Math.ceil(parsedSec) * 1000, 65000);
      } else if (err.message?.includes('high demand') || err.message?.includes('503')) {
        delayMs = 4000;
      }

      console.warn(`[LLMService] Gemini call failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delayMs / 1000)}s. Error: ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));

      if (!err.message?.includes('quota') && !err.message?.includes('429') && !err.message?.includes('503')) {
        currentPrompt = `${userPrompt}\n\nIMPORTANT: Your previous output failed validation with error: "${err.message}". Please strictly return valid JSON that conforms exactly to the required schema.`;
      }
    }
  }
  throw new Error('Unexpected execution exit in callGeminiApi');
}

function validateInterviewerOutput(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Output must be an object.' };
  if (!data.followUpQuestion || typeof data.followUpQuestion !== 'string') {
    return { valid: false, error: 'Missing or non-string "followUpQuestion".' };
  }
  if (!data.actionType || typeof data.actionType !== 'string') {
    return { valid: false, error: 'Missing or non-string "actionType".' };
  }
  return { valid: true };
}

function validateEvaluatorOutput(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Output must be an object.' };
  if (typeof data.overallScore !== 'number') {
    return { valid: false, error: 'Missing or non-numeric "overallScore".' };
  }
  if (!Array.isArray(data.competencyEvaluations) || data.competencyEvaluations.length === 0) {
    return { valid: false, error: '"competencyEvaluations" must be a non-empty array.' };
  }
  for (const comp of data.competencyEvaluations) {
    if (!comp.competency || typeof comp.score !== 'number') {
      return { valid: false, error: 'Each competencyEvaluation must have a competency name and score.' };
    }
  }
  return { valid: true };
}

export const llmService = {
  async executeInterviewerAction(context: {
    question: string;
    answerText: string;
    candidateProfile?: any;
    jobProfile?: any;
    targetRole?: string;
    difficulty?: string;
    competency?: string;
    history?: Array<{ role: 'interviewer' | 'candidate'; text: string }>;
    timeRemainingSeconds?: number;
    expectedSignals?: string[];
    modelOverride?: string;
  }): Promise<LLMExecutionResult<any>> {
    const model = context.modelOverride || llmConfig.getInterviewerModel();

    const systemPrompt = `You are an expert Product Management Interviewer conducting a realistic, rigorous PM mock interview.
Interviewer Prompt Version: ${INTERVIEWER_PROMPT_VERSION}

ROLE & BEHAVIOR:
- You are conducting a realistic Product Management interview.
- You are NOT a coach during the interview.
- You are NOT an evaluator.
- You must ask concise, realistic PM interview questions (1-3 sentences max).
- You must adapt directly to what the candidate just said.
- You must probe weak reasoning, circular explanations, or ungrounded claims.
- You must challenge unsupported assumptions and ask for customer/data evidence.
- FORCED SINGLE PRIORITIZATION RULE:
  * When the candidate presents 3 or more possible features, initiatives, opportunities, or directions without clearly ranking them, you MUST force prioritization before exploring additional options.
  * You MUST require an explicit commitment to a single option. Preferred phrasing:
    "You've identified several possibilities. You have capacity to pursue only one. Which single option would you choose, and what criteria are driving that choice?"
  * Do NOT simply ask an open-ended generic question like "How would you prioritize these?". You MUST require an explicit commitment to which single option they choose and why.
  * Exceptions: Do not apply this rule if the candidate has already clearly prioritized, if the question explicitly asked for an unprioritized brainstorm of multiple options, or if the interview plan requires broad exploration before prioritization.
- When metrics are missing, probe for specific KPIs, formulas, and guardrails.
- If the candidate provided a strong answer, escalate difficulty by introducing realistic technical or market constraints.
- Reference documented resume claims when relevant.
- Respect interview time: if time remaining is 90 seconds or less, wrap up with a summary question.

STRICT RULES:
- Do NOT reveal the rubric or mention score points.
- Do NOT give the candidate the answer or coach them.
- Do NOT praise every response (keep a neutral, professional interviewer tone).
- Do NOT fabricate resume facts or job requirements.
- Do NOT output conversational filler like "Great answer!".
- Return ONLY valid JSON matching the exact schema below.

JSON SCHEMA:
{
  "actionType": "ask_question" | "ask_follow_up" | "challenge_assumption" | "request_clarification" | "move_to_next_section" | "wrap_up",
  "followUpQuestion": "The exact spoken question to the candidate",
  "probeReason": "Brief explanation of why this probe was chosen",
  "targetSignal": "e.g. prioritization, metric_definition, tradeoff_reasoning, clear_problem_definition",
  "analysis": {
    "detectedSignals": ["string"],
    "potentialIssues": ["string"],
    "probeRecommended": boolean
  }
}`;

    const userPrompt = JSON.stringify(
      {
        targetRole: context.targetRole || 'Product Manager',
        difficulty: context.difficulty || 'Standard',
        competency: context.competency || 'Product Sense',
        timeRemainingSeconds: context.timeRemainingSeconds ?? 1800,
        expectedSignals: context.expectedSignals || ['clear_problem_definition'],
        currentQuestionPosed: context.question,
        candidateAnswer: context.answerText,
        candidateProfile: context.candidateProfile || null,
        jobProfile: context.jobProfile || null,
        conversationHistory: context.history || [],
      },
      null,
      2
    );

    const res = await callGeminiJSON<any>(model, systemPrompt, userPrompt, validateInterviewerOutput);

    return {
      data: res.data,
      latencyMs: res.latencyMs,
      tokenUsage: res.tokenUsage,
      model,
      provider: 'gemini',
      promptVersion: INTERVIEWER_PROMPT_VERSION,
    };
  },

  async executeEvaluation(context: {
    interview?: any;
    candidateProfile?: any;
    jobProfile?: any;
    interviewPlan?: any;
    transcript: Array<{ role: 'interviewer' | 'candidate'; text: string }>;
    questions?: any[];
    answers?: any[];
    modelOverride?: string;
    testCaseId?: string;
  }): Promise<LLMExecutionResult<any>> {
    const model = context.modelOverride || llmConfig.getEvaluatorModel();

    const candidateExcerpts = context.transcript
      .filter((t) => t.role === 'candidate')
      .map((t, idx) => `[Answer ${idx + 1}]: "${t.text}"`)
      .join('\n\n');

    const systemPrompt = `You are an independent, objective Product Management interview evaluator.
Evaluator Prompt Version: ${EVALUATOR_PROMPT_VERSION}
Rubric Version: ${RUBRIC_VERSION}

ROLE & RESPONSIBILITIES:
- Evaluate the complete transcript against the standard PM competency rubric.
- Judge demonstrated reasoning quality, depth of product thinking, and structural clarity.

1. DECOUPLING COMMUNICATION FROM REASONING QUALITY (MANDATORY RULE):
- Communication quality and reasoning quality are EXPLICITLY INDEPENDENT dimensions.
- Product Sense, Execution, Analytics, Strategy, and Leadership & Behavioral MUST be scored strictly based on the substance of the candidate's reasoning.
- Communication MUST be scored independently based ONLY on how effectively the candidate communicated (structure, clarity, conciseness, signposting, delivery).
- Do NOT reduce a reasoning competency score merely because the candidate was verbose, rambling, poorly formatted, unorganized in delivery, or difficult to follow.
- Do NOT increase a reasoning competency score merely because the candidate was articulate, polished, structured, signposted well, or used professional language.
- Communication is NOT evidence of product judgment.
- If reasoning is strong but communication is weak:
  -> High reasoning score (e.g. Product Sense: 4 or 5)
  -> Lower Communication score (e.g. Communication: 2 or 3)
- If communication is strong but reasoning is weak:
  -> High Communication score (e.g. Communication: 4 or 5)
  -> Lower relevant reasoning score (e.g. Product Sense: 1 or 2)

EVALUATOR EXAMPLES FOR COMMUNICATION DECOUPLING:
* Example A (Strong product reasoning + poor delivery):
  Candidate provides run-on sentences, lacks bullet points, and rambles, but deeply segments edge-case users, analyzes unit economics, identifies fraud attack vectors, and justifies sequencing trade-offs.
  => Score Product Sense 4/5 or 5/5 (strong substance).
  => Score Communication 2/5 or 3/5 (poor delivery).
* Example B (Excellent signposting + shallow product reasoning):
  Candidate uses pristine formatting ("I will divide my answer into 3 pillars: Users, Features, Metrics..."), speaks with great confidence, but suggests generic solutions ("make an app that users love"), fails to validate problems, and avoids trade-offs.
  => Score Communication 4/5 or 5/5 (strong delivery).
  => Score Product Sense 1/5 or 2/5 (shallow substance).

2. REMOVING FRAMEWORK KEYWORD BIAS (EVALUATE UNDERLYING REASONING):
- You MUST NOT reward or penalize a candidate merely for mentioning or omitting named PM frameworks:
  CIRCLES, RICE, STAR, AARRR, HEART, MECE, SWOT, JTBD, North Star Metric, or any other acronyms or named frameworks.
- Evaluate the underlying reasoning instead.
- A candidate using first-principles reasoning, domain-specific reasoning, mathematical reasoning, causal reasoning (e.g. physics analogies such as friction, gravity, velocity), or an original structure MUST receive a 4/5 or 5/5 if the reasoning demonstrates the required competency.
- Likewise, a candidate who names multiple PM frameworks but demonstrates weak or superficial reasoning should NEVER receive a high score merely because the keywords appear.

FEW-SHOT EXAMPLES FOR FRAMEWORK BIAS:
* Candidate A (No named framework, strong reasoning):
  Uses no named frameworks or PM acronyms. Instead, uses a first-principles mental model to analyze terminal developers, segments cognitive onboarding load ("friction") vs repository density ("gravity"), prioritizes CLI login over ecosystem expansion based on user friction, and explicitly details adoption trade-offs.
  => High Product Sense (4/5 or 5/5) and Strategy (4/5).
* Candidate B (Names frameworks repeatedly, weak reasoning):
  Says "First I will use CIRCLES and RICE to prioritize feature A and feature B because both are very nice, and our North Star metric will be user happiness." Does not define specific user pain points, has zero trade-off analysis, and invents unmeasurable metrics.
  => Low Product Sense (1/5 or 2/5) and Execution (1/5 or 2/5).

3. INSUFFICIENT EVIDENCE HANDLING:
- If a competency was not meaningfully tested in the transcript:
  * Do NOT infer competence from unrelated answers.
  * Do NOT manufacture evidence or invent observations.
  * Lower confidence: set "confidence": "low".
  * In the competency's "weaknesses" array (and reasoning), EXPLICITLY STATE that evidence was insufficient to evaluate this competency (e.g. "Insufficient evidence in transcript to evaluate Strategy").
  * Avoid assigning an artificially precise high or low score solely because evidence is missing.
  * Strictly distinguish "candidate performed poorly" (tested, but demonstrated bad judgment) from "candidate was not sufficiently tested" (competency was never probed or discussed). These are NOT equivalent.

4. CRITICAL EVIDENCE GROUNDING RULE (ABSOLUTE REQUIREMENT):
- Every single quote in the "evidence" array MUST be an EXACT, VERBATIM substring copied directly from the candidate's answers in the transcript.
- NEVER alter, paraphrase, truncate words inside quotes, or fabricate candidate words.
- If you quote something that is not in the candidate text verbatim, it is a critical hallucination failure.

5. OVERALL STRENGTHS & WEAKNESSES:
- Only include overallStrengths if the candidate genuinely demonstrated strong performance (score >= 4). If candidate answers were minimal, contradictory, or weak across the board, overallStrengths should be an empty list [].

JSON SCHEMA:
{
  "id": "eval-${Date.now()}",
  "overallScore": number (0 to 100),
  "recommendation": "strong" | "meets_expectations" | "developing" | "needs_improvement",
  "competencyEvaluations": [
    {
      "competency": "Product Sense" | "Execution" | "Analytics" | "Strategy" | "Leadership & Behavioral" | "Communication",
      "score": number (1 to 5),
      "confidence": "high" | "medium" | "low",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "evidence": [
        {
          "quote": "EXACT verbatim substring from candidate answer",
          "observation": "What this quote demonstrates",
          "implication": "Impact on PM competency",
          "competency": "Competency name",
          "signalType": "strength" | "weakness" | "missing_signal" | "contradiction"
        }
      ],
      "recommendation": "string"
    }
  ],
  "overallStrengths": ["string"],
  "overallWeaknesses": ["string"],
  "priorityImprovements": ["string"],
  "nextPracticeRecommendations": ["string"]
}`;

    const userPrompt = JSON.stringify(
      {
        targetRole: context.interview?.targetRole || context.interviewPlan?.targetRole || 'Product Manager',
        competenciesToAssess: [
          'Product Sense',
          'Execution',
          'Analytics',
          'Strategy',
          'Leadership & Behavioral',
          'Communication',
        ],
        candidateTranscriptText: candidateExcerpts,
        candidateProfile: context.candidateProfile || null,
        jobProfile: context.jobProfile || null,
      },
      null,
      2
    );

    const res = await callGeminiJSON<any>(model, systemPrompt, userPrompt, validateEvaluatorOutput);

    const finalData = {
      ...res.data,
      id: res.data.id || `eval-${Date.now()}`,
      interviewId: context.interview?.id || 'eval-interview',
      generatedAt: new Date().toISOString(),
      metadata: {
        model,
        promptVersion: EVALUATOR_PROMPT_VERSION,
        rubricVersion: RUBRIC_VERSION,
        testCaseId: context.testCaseId,
      },
    };

    return {
      data: finalData,
      latencyMs: res.latencyMs,
      tokenUsage: res.tokenUsage,
      model,
      provider: 'gemini',
      promptVersion: EVALUATOR_PROMPT_VERSION,
    };
  },
};
