import type {
  AssistantProposal,
  AssistantRequest,
  Intent,
  LengthPreference,
  Tone,
} from "./types";

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
  book: "Book from outline",
};

const toneSentences: Record<Tone, string> = {
  professional: "The prose stays clear, purposeful, and grounded in consequence.",
  friendly: "The prose keeps a warm, readable rhythm while letting the characters feel human.",
  academic: "The prose gives the scene a reflective structure and clear cause and effect.",
  concise: "The prose stays lean and moves quickly from beat to beat.",
  persuasive: "The prose emphasizes stakes, desire, and why this moment matters.",
  warm: "The prose stays empathetic and intimate, with room for quiet emotion.",
  bold: "The prose raises the stakes and gives the scene a sharper edge.",
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
    rewritten = rewritten
      .replace(/\bstuff\b/gi, "material")
      .replace(/\bthings\b/gi, "items");
  }

  if (tone === "concise") {
    rewritten = rewritten.replace(/\bin order to\b/gi, "to");
  }

  if (tone === "bold") {
    rewritten = rewritten
      .replace(/\bmight\b/gi, "will")
      .replace(/\bcould\b/gi, "can");
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
      return `${sentence.slice(0, midpoint).trim()}. ${sentence
        .slice(midpoint)
        .trim()}`;
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
            ![
              "about",
              "there",
              "their",
              "would",
              "could",
              "should",
              "because",
              "before",
            ].includes(word),
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

  return [
    "Working outline",
    "",
    "1. Opening",
    ...points,
    `${points.length + 2}. Closing takeaway`,
  ].join("\n");
}

function createContinuation(text: string, tone: Tone): string {
  const paragraphs = splitParagraphs(text);
  const sentences = splitSentences(text);
  const lastUnit = paragraphs.at(-1) || sentences.slice(-2).join(" ");

  if (!lastUnit) {
    return "Start with a paragraph or upload previous work, then ask the assistant to continue.";
  }

  const leadIns: Record<Tone, string> = {
    professional:
      "The next section should build on that point with a clear, actionable direction.",
    friendly:
      "From here, the writing can stay approachable while moving the reader toward the next idea.",
    academic:
      "The next section should extend the argument with evidence, context, and a clear transition.",
    concise:
      "The next section should stay focused and move the reader quickly to the main takeaway.",
    persuasive:
      "The next section should strengthen the case by showing why the idea matters now.",
    warm:
      "The next section should keep the supportive tone while guiding the reader forward.",
    bold:
      "The next section should raise the stakes and make the central point impossible to ignore.",
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

function parseOutlineChapters(text: string): string[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const chapters: string[] = [];
  let current = "";

  for (const line of lines) {
    const isChapterHeading =
      /^(chapter|ch\.?)\s*\d+[\.: -]/i.test(line) ||
      /^#\s*\d+[\.: -]/i.test(line) ||
      /^\d+[\.: -]/i.test(line);

    if (isChapterHeading) {
      if (current) {
        chapters.push(current);
      }

      current = line;
      continue;
    }

    if (current) {
      current = `${current} ${line}`;
    }
  }

  if (current) {
    chapters.push(current);
  }

  if (chapters.length >= 2) {
    return chapters.slice(0, 60);
  }

  return splitParagraphs(text)
    .slice(0, 30)
    .map((paragraph, index) => `Chapter ${index + 1}: ${trimToWords(paragraph, 36)}`);
}

function extractChapterTitle(chapter: string, index: number): string {
  const title = chapter
    .replace(/^#\s*/, "")
    .replace(/^(chapter|ch\.?)\s*\d+[\.: -]*/i, "")
    .replace(/^\d+[\.: -]*/, "")
    .trim();

  return trimToWords(title || `Chapter ${index + 1}`, 14).replace(/[.!?]$/, "");
}

function extractChapterPremise(chapter: string): string {
  const premise = chapter
    .replace(/^#\s*/, "")
    .replace(/^(chapter|ch\.?)\s*\d+[\.: -]*/i, "")
    .replace(/^\d+[\.: -]*/, "")
    .trim();

  return premise || "Develop the next important scene in the story.";
}

function expandFictionIdea(
  idea: string,
  tone: Tone,
  chapterNumber: number,
  paragraphIndex: number,
): string {
  const beat =
    paragraphIndex === 0
      ? "Begin with a concrete image that places the reader inside the scene."
      : paragraphIndex % 4 === 0
        ? "Let the scene turn, revealing a complication that changes what the character thought they knew."
        : paragraphIndex % 3 === 0
          ? "Use a line of dialogue or a quiet action to reveal character instead of explaining it directly."
          : "Carry the pressure forward with a clear cause-and-effect movement.";

  return `${idea} ${beat} ${toneSentences[tone]} Keep Chapter ${chapterNumber} moving toward a choice, revelation, or consequence that makes the next chapter feel necessary.`;
}

function createFictionParagraphs(
  premise: string,
  tone: Tone,
  wordsPerChapter: number,
): string[] {
  const paragraphCount = Math.min(
    10,
    Math.max(4, Math.round(wordsPerChapter / 260)),
  );

  const starterIdeas = [
    `The chapter opens with ${premise}. The first image should put the reader inside the immediate pressure of the scene.`,
    `The protagonist reacts to that pressure in a way that reveals what they want most and what they are afraid to admit.`,
    `A second character, memory, or obstacle pushes against that desire and forces the scene to become more specific.`,
    `The middle of the chapter should deepen the conflict through action, dialogue, and small revealing details.`,
  ];

  const extraIdeas = [
    `The setting should reflect the emotional state of the scene without pausing the story for description.`,
    `A brief flashback or internal thought can clarify the stakes if it changes how the reader understands the present moment.`,
    `The chapter should include at least one moment where the character makes a choice instead of simply reacting.`,
    `Raise the cost of failure so the reader understands why this chapter matters to the larger book.`,
    `End the scene with a turn: new information, a betrayal, a promise, a loss, or a decision that cannot be undone.`,
    `Let the final image echo the opening image so the chapter feels shaped rather than merely summarized.`,
  ];

  return [...starterIdeas, ...extraIdeas, ...starterIdeas]
    .slice(0, paragraphCount)
    .map((idea, index) => expandFictionIdea(idea, tone, paragraphCount, index));
}

function generateChapterDraft(
  chapter: string,
  index: number,
  wordsPerChapter: number,
  tone: Tone,
): string {
  const title = extractChapterTitle(chapter, index);
  const premise = extractChapterPremise(chapter);
  const paragraphs = createFictionParagraphs(premise, tone, wordsPerChapter);

  return [
    `Chapter ${index}: ${title}`,
    "",
    ...paragraphs,
  ].join("\n\n");
}

function generateBookFromOutline(
  sourceText: string,
  tone: Tone,
  targetWordCount?: number,
): string {
  if (!sourceText.trim()) {
    return "Paste or upload a chapter-by-chapter outline before generating a book draft.";
  }

  const chapters = parseOutlineChapters(sourceText);
  const target = Math.max(1000, targetWordCount || 25000);
  const wordsPerChapter = Math.max(300, Math.round(target / Math.max(chapters.length, 1)));

  const header = [
    "Full fiction book draft",
    "",
    `Target word count: ${target.toLocaleString()} words`,
    `Chapters detected: ${chapters.length}`,
    `Tone: ${toneLabels[tone]}`,
    "",
    "This is a complete chapter-by-chapter draft generated from your outline. Review it, edit the voice, and export when ready.",
    "",
  ].join("\n");

  const body = chapters
    .map((chapter, index) =>
      generateChapterDraft(chapter, index + 1, wordsPerChapter, tone),
    )
    .join("\n\n");

  return `${header}${body}`;
}

function handleCustomPrompt(request: AssistantRequest, sourceText: string): string {
  const prompt = request.customPrompt.toLowerCase();

  if (prompt.includes("book") || prompt.includes("chapter")) {
    return generateBookFromOutline(sourceText, request.tone, request.targetWordCount);
  }

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
    request.intent === "book"
      ? request.selectedText ||
        request.documentText ||
        (request.useBaseline ? request.baselineText : "") ||
        ""
      : request.selectedText ||
        request.documentText ||
        (request.useBaseline ? request.baselineText : "") ||
        "Start writing to give the assistant something to work with.";

  let output = "";
  let title = "";
  let summary = "";

  if (request.intent === "book") {
    const chapterCount = parseOutlineChapters(sourceText).length;
    output = generateBookFromOutline(
      sourceText,
      request.tone,
      request.targetWordCount,
    );
    title = "Full book draft from outline";
    summary = `I detected ${chapterCount} chapter beats and generated a draft shaped around your target word count.`;
  } else if (
    request.intent === "summarize" &&
    request.useBaseline &&
    request.baselineText
  ) {
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

  const sourceLabel = request.intent === "book"
    ? "Chapter-by-chapter outline"
    : request.selectedText
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
    ...(request.intent === "book" ? { intentLabel: intentLabels.book } : {}),
  };
}