const STORAGE_KEY = "openrouter-api-key-v1";
const MODEL_KEY = "openrouter-model-v1";

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
}

const DEFAULT_MODEL = "__auto__";

/** All models listed here are FREE on OpenRouter (no cost per token) */
export const AVAILABLE_MODELS = [
  { value: "__auto__", label: "Auto (Smart Pick)" },
  { value: "openrouter/owl-alpha:free", label: "Owl Alpha (2M context)" },
  { value: "poolside/poolside-laguna-m.1:free", label: "Poolside Laguna M.1 (Coding)" },
  { value: "nvidia/nemotron-3-ultra:free", label: "Nemotron 3 Ultra (Agentic)" },
  { value: "nvidia/nemotron-3-super:free", label: "Nemotron 3 Super (Creative/Roleplay)" },
  { value: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B (Reasoning)" },
  { value: "poolside/poolside-laguna-xs.2:free", label: "Poolside Laguna XS.2 (Coding, fast)" },
  { value: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B (Fast)" },
  { value: "nex-agi/nex-n2-pro:free", label: "Nex-N2-Pro (Agentic)" },
  { value: "google/gemma-4-31b:free", label: "Gemma 4 31B (Multimodal)" },
  { value: "nvidia/nemotron-3-nano-30b-a3b:free", label: "Nemotron 3 Nano 30B (Efficient)" },
];

/**
 * Smart model picker: routes to the best free model based on message content.
 * Returns the actual model ID to use (never returns "__auto__").
 */
export function pickSmartModel(messages: ChatCompletionMessage[]): string {
  const combined = messages
    .map((m) => m.content.toLowerCase())
    .join(" ");

  // Outline / premise / plot / structure → GPT-OSS 120B (best reasoning)
  const reasoningKeywords = [
    "outline", "premise", "plot", "structure", "character", "arc",
    "beat", "chapter outline", "story structure", "plan", "worldbuilding",
    "world-build", "act 1", "act 2", "act 3", "synopsis", "blurb",
    "backstory", "setting", "theme", "conflict", "resolution",
  ];
  if (reasoningKeywords.some((kw) => combined.includes(kw))) {
    return "openai/gpt-oss-120b:free";
  }

  // Creative writing / drafting / chapters → Nemotron 3 Super (creative/roleplay, uncensored)
  const creativeKeywords = [
    "write", "draft", "chapter", "scene", "dialogue", "prose",
    "describe", "narration", "expand", "continue", "next chapter",
    "story", "fiction", "narrative", "rewrite", "edit", "revise",
    "paragraph", "sentence", "creative",
  ];
  if (creativeKeywords.some((kw) => combined.includes(kw))) {
    return "nvidia/nemotron-3-super:free";
  }

  // Coding / agentic tasks → Poolside Laguna M.1
  const codingKeywords = [
    "code", "function", "api", "script", "debug", "refactor",
    "programming", "implement", "algorithm",
  ];
  if (codingKeywords.some((kw) => combined.includes(kw))) {
    return "poolside/poolside-laguna-m.1:free";
  }

  // General chat / questions → Nemotron 3 Nano (fast, efficient)
  const chatKeywords = [
    "hello", "hi", "hey", "help", "what", "how", "explain",
    "suggest", "idea", "think", "feedback", "review", "opinion",
  ];
  if (chatKeywords.some((kw) => combined.includes(kw))) {
    return "nvidia/nemotron-3-nano-30b-a3b:free";
  }

  // Default fallback → Gemma 4 31B (strong all-rounder, multimodal, 256K context)
  return "google/gemma-4-31b:free";
}

/**
 * Resolves the effective model: if "__auto__" is selected, picks smart;
 * otherwise returns the stored model as-is.
 */
export function resolveModel(messageContext?: ChatCompletionMessage[]): string {
  const stored = getStoredModel();
  if (stored === "__auto__" && messageContext && messageContext.length > 0) {
    return pickSmartModel(messageContext);
  }
  return stored;
}

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function setStoredApiKey(key: string): void {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getStoredModel(): string {
  return localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL;
}

export function setStoredModel(model: string): void {
  localStorage.setItem(MODEL_KEY, model);
}

export function hasApiKey(): boolean {
  return getStoredApiKey().length > 0;
}

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callOpenRouter(
  messages: ChatCompletionMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error("No OpenRouter API key configured. Add your key in Settings.");
  }

  const model = resolveModel(messages);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "AI Writing Assistant - Master Novelist",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `OpenRouter API error (${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.error?.message || parsed.message || errorMessage;
    } catch {
      // use raw text
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content returned from OpenRouter");
  }

  return content;
}