import type { AssistantProposal, AssistantRequest, Intent, LengthPreference, Tone } from "./types";

const toneLabels: Record<Tone, string> = {
  professional: "professional",
  friendly: "friendly",
  academic: "academic",
  concise: "concise",
  persuasive: "persuasive",
  warm: "warm",
  bold: "bold",
};

const lengthLabels: Record<LengthPreference, string> = {
  shorter: "shorter",
  same: "similar",
  longer: "expanded",
};

const intentLabels: Record<Intent, string> = {
  rewrite: "Rewrite",
  clarify: "Clarify",
  tone: "Tone shift",
  summarize: "Summary",
  outline: "Outline",
  continue: "Continuation",
  title: "Titles",
  custom: "Custom",
};

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|\r\n\r\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function trimToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return text;
  }

  return `${words.slice(0, maxWords).join(" ")}…`;
}

function applyLengthPreference(text: string, length: LengthPreference, tone: Tone): string {
  const sentences = splitSentences(text);

  if (length === "shorter") {
    return trimToWords(
      sentences.slice(0, Math.max(1, Math.ceil(sentences.length * 0.6))).join(" "),
      80,
    );
  }

  if (length === "longer") {
    const additions: Record<Tone, string> = {
      professional: "This keeps the message direct while giving the reader enough context to act.",
      friendly: "The goal is to keep the tone approachable while still making the point clearly.",
      academic: "This added context supports the claim and gives the reader a clearer path through the argument.",
      concise: "It adds only the minimum context needed to make the idea complete.",
      persuasive: "This strengthens the value proposition and gives the reader a clearer reason to care.",
      warm: "The added line keeps the message supportive and human.",
      bold: "The added line gives the idea more momentum and a stronger point of view.",
    };

    return `${text} ${additions[tone]}`;
  }

  return text;
}

function rewriteText(text: string, tone: Tone, length: LengthPreference): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/\bvery\b/gi, "")
    .replace(/\breally\b/gi, "")
    .replace(/\bbasically\b/gi, "")
    .replace(/\bactually\b/gi, "")
    .trim();

  if (!cleaned) {
    return "Add some text first, then ask the assistant to rewrite it.";
  }

  let rewritten = cleaned;

  if (tone === "friendly") {
    rewritten = rewritten.replace(/\butilize\b/gi, "use");
  }

  if (tone === "professional") {
    rewritten = rewritten.replace(/\bstuff\b/gi, "material").replace(/\bthings\b/gi, "items");
  }

  if (tone === "concise") {
    rewritten = rewritten.replace(/\bin order to\b/gi, "to");
  }

  if (tone === "bold") {
    rewritten = rewritten.replace(/\bmight\b/gi, "will").replace(/\bcould\b/gi, "can");
  }

  return applyLengthPreference(rewritten, length, tone);
}

function clarifyText(text: string): string {
  const sentences = splitSentences(text);

  if (!sentences.length) {
    return "Add some text first, then ask the assistant to clarify it.";
  }

  const clarified = sentences
    .map((sentence) => {
      if (sentence.length < 130) {
        return sentence;
      }

      const midpoint = Math.floor(sentence.length * 0.58);
      return `${sentence.slice(0, midpoint).trim()}. ${sentence.slice(midpoint).trim()}`;
    })
    .join(" ");

  return clarified.replace(/\s+/g, " ").trim();
}

function summarizeText(text: string): string {
  const sentences = splitSentences(text);

  if (!sentences.length) {
    return "Upload previous work or add document text before asking for a summary.";
  }

  const keySentences = sentences.slice(0, Math.min(4, sentences.length));
  const themeWords = Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(
          (word) =>
            word.length > 5 &&
            !["about", "there", "their", "would", "could", "should", "because", "before"].includes(word),
        ),
    ),
  ).slice(0, 5);

  return [
    "Summary",
    "",
    keySentences.join(" "),
    "",
    `Key themes: ${themeWords.join(", ") || "core ideas from the source"}.`,
  ].join("\n");
}

function createOutline(text: string): string {
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(text);
  const sourcePoints = sentences.length ? sentences : paragraphs;

  if (!sourcePoints.length) {
    return "Add document text or upload previous work before generating an outline.";
  }

  const points = sourcePoints.slice(0, 6).map((point, index) => {
    const cleanPoint = trimToWords(point.replace(/^[-*]\s*/, ""), 24);
    return `${index + 1}. ${cleanPoint}`;
  });

  return ["Working outline", "", "1. Opening", ...points, `${points.length + 2}. Closing takeaway`].join("\n");
}

function createContinuation(text: string, tone: Tone): string {
  const paragraphs = splitParagraphs(text);
  const sentences = splitSentences(text);
  const lastUnit = paragraphs.at(-1) || sentences.slice(-2).join(" ");

  if (!lastUnit) {
    return "Start with a paragraph or upload previous work, then ask the assistant to continue.";
  }

  const leadIns: Record<Tone, string> = {
    professional: "The next section should build on that point with a clear, actionable direction.",
    friendly: "From here, the writing can stay approachable while moving the reader toward the next idea.",
    academic: "The next section should extend the argument with evidence, context, and a clear transition.",
    concise: "The next section should stay focused and move the reader quickly to the main takeaway.",
    persuasive: "The next section should strengthen the case by showing why the idea matters now.",
    warm: "The next section should keep the supportive tone while guiding the reader forward.",
    bold: "The next section should raise the stakes and make the central point impossible to ignore.",
  };

  return [
    "Continuation draft",
    "",
    leadIns[tone],
    "",
    `It should connect back to this idea: “${trimToWords(lastUnit, 42)}”`,
  ].join("\n");
}

function createTitles(text: string): string {
  const sentences = splitSentences(text);
  const firstSentence = sentences[0] || "your work";
  const shortSource = trimToWords(firstSentence, 12).replace(/[.!?]$/, "");

  if (!shortSource || shortSource === "your work") {
    return [
      "Title options",
      "",
      "1. A Clear Path Forward",
      "2. What Matters Next",
      "3. The Case for Better Writing",
    ].join("\n");
  }

  return [
    "Title options",
    "",
    `1. ${shortSource}: A Practical Guide`,
    `2. Rethinking ${shortSource.toLowerCase()}`,
    `3. The Future of ${shortSource.toLowerCase()}`,
    `4. Why ${shortSource.toLowerCase()} Matters`,
    `5. From ${shortSource.toLowerCase()} to Better Outcomes`,
  ].join("\n");
}

function handleCustomPrompt(request: AssistantRequest, sourceText: string): string {
  const prompt = request.customPrompt.toLowerCase();

  if (prompt.includes("outline")) {
    return createOutline(sourceText);
  }

  if (prompt.includes("summary") || prompt.includes("summar")) {
    return summarizeText(sourceText);
  }

  if (prompt.includes("title")) {
    return createTitles(sourceText);
  }

  if (prompt.includes("continue")) {
    return createContinuation(sourceText, request.tone);
  }

  return [
    "Custom writing proposal",
    "",
    rewriteText(sourceText, request.tone, request.length),
    "",
    `Instruction used: ${request.customPrompt}`,
  ].join("\n");
}

export function generateAssistantProposal(request: AssistantRequest): AssistantProposal {
  const sourceText =
    request.selectedText ||
    request.documentText ||
    (request.useBaseline ? request.baselineText : "") ||
    "Start writing to give the assistant something to work with.";

  let output = "";
  let title = "";
  let summary = "";

  if (request.intent === "summarize" && request.useBaseline && request.baselineText) {
    output = summarizeText(request.baselineText);
    title = "Baseline summary";
    summary = "I summarized the uploaded work so you can reuse its themes, structure, and voice.";
  } else {
    switch (request.intent) {
      case "clarify":
        output = clarifyText(sourceText);
        title = "Clearer version";
        summary = "I simplified the structure and reduced unnecessary complexity.";
        break;
      case "tone":
        output = rewriteText(sourceText, request.tone, request.length);
        title = `${toneLabels[request.tone]} rewrite`;
        summary = `I adapted the source into a ${toneLabels[request.tone]} voice.`;
        break;
      case "summarize":
        output = summarizeText(sourceText);
        title = "Summary";
        summary = "I extracted the main ideas from the available text.";
        break;
      case "outline":
        output = createOutline(sourceText);
        title = "Working outline";
        summary = "I turned the source into a structured outline you can insert or use as a plan.";
        break;
      case "continue":
        output = createContinuation(sourceText, request.tone);
        title = "Continuation draft";
        summary = "I drafted a next-step section that follows the current direction.";
        break;
      case "title":
        output = createTitles(sourceText);
        title = "Title options";
        summary = "I generated several title options based on the available text.";
        break;
      case "custom":
        output = handleCustomPrompt(request, sourceText);
        title = "Custom proposal";
        summary = "I created a proposal from your custom instruction.";
        break;
      case "rewrite":
      default:
        output = rewriteText(sourceText, request.tone, request.length);
        title = "Rewritten proposal";
        summary = `I rewrote the source with a ${toneLabels[request.tone]} tone and ${lengthLabels[request.length]} length.`;
        break;
    }
  }

  const sourceLabel = request.selectedText
    ? "Selected text"
    : request.useBaseline && request.baselineText
      ? "Document and baseline context"
      : "Current document";

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    summary,
    output,
    sourceLabel,
    hasSelection: request.selectedText.trim().length > 0,
    createdAt: new Date().toISOString(),
  };
}