import type {
  ChapterOutline,
  NovelistPhase,
  NovelistPremise,
  NovelistSession,
} from "./types";

/* ───────── PROSE WRITING HELPERS ───────── */

const sensoryDetails: Record<string, string[]> = {
  forest: [
    "The pine needles crackled underfoot, releasing a sharp, resinous scent into the cold air.",
    "Mist clung to the lower branches like breath refusing to leave a body.",
    "Somewhere deeper in the trees, a branch snapped — too heavy for a squirrel, too deliberate for the wind.",
  ],
  city: [
    "The halogen glow of a streetlamp buzzed against the wet pavement, throwing long, nervous shadows.",
    "A bus groaned to a stop two blocks over, its air brakes sighing like an exhausted lung.",
    "The smell of roasting chestnuts mixed uneasily with diesel exhaust and old rain.",
  ],
  interior: [
    "The radiator ticked in the corner, counting off seconds nobody wanted to keep.",
    "Dust motes floated in the slant of afternoon light through a cracked blind.",
    "A single bulb hung from the ceiling on a frayed cord, swaying slightly though no window was open.",
  ],
  coastal: [
    "Salt spray misted her face before she even saw the water — the wind carried the ocean inland like a warning.",
    "Gulls wheeled overhead, their cries sharp and thin against the grey sky.",
    "The tide had gone out and left the pier smelling of brine and rotting wood.",
  ],
  mountains: [
    "The wind up here had teeth — it found every gap in his jacket and bit down.",
    "Below them, the valley was still asleep under a white blanket of cloud.",
    "Loose shale skittered down the slope with every step, a tiny avalanche announcing their presence.",
  ],
};

const emotionalBeats: Record<string, string[]> = {
  fear: [
    "Her pulse hammered in her throat, each beat a question she didn't want answered.",
    "The air felt too thin, as if the room had used up all its oxygen while he wasn't paying attention.",
  ],
  grief: [
    "The weight settled in his chest like something physical — a stone he'd swallowed years ago that had finally stopped moving.",
    "She kept reaching for her phone to text him before remembering there was no one on the other end.",
  ],
  determination: [
    "He set his jaw and felt the familiar click of decision lock into place — the same sound a door makes when you stop checking if it's locked.",
    "She had been told no so many times the word had lost its shape. It was just noise now.",
  ],
  wonder: [
    "The stars out here didn't just shine — they demanded attention, a billion tiny fires insisting on their own significance.",
    "For a moment, she forgot to be afraid. The sheer impossible scale of it had swallowed her fear whole.",
  ],
  tension: [
    "The silence between them had weight — the kind that comes before a confession or a blow.",
    "He watched her hand drift toward the drawer. The one he'd told her never to open.",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sensoryAnchor(setting: string): string {
  const key = Object.keys(sensoryDetails).find((k) =>
    setting.toLowerCase().includes(k)
  );
  const pool = key ? sensoryDetails[key] : sensoryDetails.interior;
  return pickRandom(pool);
}

function emotionalOpening(state: string): string {
  const key = Object.keys(emotionalBeats).find((k) =>
    state.toLowerCase().includes(k)
  );
  const pool = key ? emotionalBeats[key] : emotionalBeats.tension;
  return pickRandom(pool);
}

/* ───────── NARRATIVE STRUCTURE ───────── */

function expandBeatToParagraph(beat: string, povName: string, setting: string, prevParagraphs: string[]): string {
  const isFirst = prevParagraphs.length === 0;
  const sensory = isFirst ? sensoryAnchor(setting) : "";
  const emotional = isFirst ? emotionalOpening(setting) : "";

  const paragraphOpeners = [
    `${povName} ${beat.slice(0, 1).toLowerCase() + beat.slice(1)}`,
    `The ${setting.split(" ").pop() || "room"} seemed to hold its breath as ${povName} ${beat.slice(0, 1).toLowerCase() + beat.slice(1)}`,
    `${beat}. ${povName} could feel the weight of the moment pressing against her ribs.`,
  ];

  const interjections = [
    "A beat of silence passed. Then another.",
    `The ${setting.split(" ")[0] || "air"} shifted almost imperceptibly.`,
    `${povName} exhaled — she hadn't realized she'd been holding her breath.`,
    "Somewhere in the distance, a sound that didn't belong.",
  ];

  // Build the paragraph
  const parts: string[] = [];

  if (isFirst && sensory) {
    parts.push(sensory);
  }

  if (isFirst && emotional) {
    parts.push(emotional);
  }

  // Main beat paragraph
  parts.push(pickRandom(paragraphOpeners));

  // Add an interstitial micro-moment ~40% of the time
  if (prevParagraphs.length > 0 && Math.random() > 0.6) {
    parts.push(pickRandom(interjections));
  }

  return parts.join(" ");
}

function buildDialogueExchange(beat: string, povName: string): string {
  const dialogueTemplates = [
    `"${beat.slice(0, 1).toUpperCase() + beat.slice(1)}," ${povName} said, her voice barely above a whisper.`,
    `${povName} turned, her expression unreadable. "${beat}."`,
    `"${beat}," ${povName} murmured, the words tasting foreign on her tongue.`,
    `${povName} didn't answer right away. When she did, her voice was steady — steadier than she felt. "${beat}."`,
  ];

  return pickRandom(dialogueTemplates);
}

function buildInternalMonologue(beat: string, povName: string): string {
  const monologueTemplates = [
    `${povName} turned the thought over in her mind like a stone picked up on a beach — smooth in places, sharp in others. ${beat}.`,
    `She had rehearsed this moment a hundred times. None of the versions had prepared her for the actual weight of it. ${beat}.`,
    `There was a version of this conversation where things went differently. ${povName} could almost see it — a parallel track running alongside the one she was on. ${beat}.`,
    `${povName} remembered something her father used to say. Something about bridges and burning them. She couldn't recall the exact words, but the shape of it fit. ${beat}.`,
  ];

  return pickRandom(monologueTemplates);
}

/* ───────── CHAPTER GENERATOR ───────── */

/** Generate a full chapter draft from an outline using the Master Novelist protocol */
export function generateChapterDraft(
  outline: ChapterOutline,
  premise: NovelistPremise
): string {
  const { beats, povCharacter, setting } = outline;
  const title = outline.title || `Chapter ${outline.chapterNumber}`;

  const lines: string[] = [];

  // Chapter header
  lines.push(`# ${title}`);
  lines.push("");

  const openingSensory = sensoryAnchor(setting);
  const internalState = emotionalOpening(outline.emotionalState || setting);

  // Opening paragraph: ground the reader
  lines.push(openingSensory);
  lines.push("");
  lines.push(internalState);
  lines.push("");

  // Process each beat as a paragraph or dialogue exchange
  const previousParagraphs: string[] = [openingSensory, internalState];

  beats.forEach((beat, index) => {
    const isDialogue =
      beat.trim().startsWith('"') ||
      beat.toLowerCase().includes("said") ||
      beat.toLowerCase().includes("asked") ||
      beat.toLowerCase().includes("told") ||
      beat.toLowerCase().includes("replied") ||
      beat.toLowerCase().includes("whispered");

    const isInternal =
      beat.toLowerCase().includes("thought") ||
      beat.toLowerCase().includes("wondered") ||
      beat.toLowerCase().includes("remembered") ||
      beat.toLowerCase().includes("realized") ||
      beat.toLowerCase().includes("felt");

    let paragraph: string;

    if (isDialogue) {
      paragraph = buildDialogueExchange(beat, povCharacter);
    } else if (isInternal) {
      paragraph = buildInternalMonologue(beat, povCharacter);
    } else {
      paragraph = expandBeatToParagraph(beat, povCharacter, setting, previousParagraphs);
    }

    lines.push(paragraph);

    // Add environmental interaction every 2-3 beats
    if (index > 0 && index % 3 === 0) {
      const envInteraction = pickRandom([
        `${povCharacter} glanced at the ${setting.includes("window") ? "window" : "doorway"}. Nothing had changed. Everything had.`,
        `The ${setting.split(",")[0] || "room"} had grown quieter, if that was possible. ${povCharacter} could hear her own pulse now.`,
        `Outside, the world continued its indifferent rotation. Inside, ${povCharacter} was inventing a new geometry of loss.`,
      ]);
      lines.push("");
      lines.push(envInteraction);
    }

    lines.push("");
    previousParagraphs.push(paragraph);
  });

  // Closing beat — unresolved, no moralizing
  const closings = [
    `${povCharacter} didn't move. Not yet.`,
    `The question hung in the air, unanswered.`,
    `She would have to decide soon. But not tonight.`,
    `${povCharacter} closed her eyes. When she opened them, nothing had changed — and that was the problem.`,
    `There was more to say. There was always more to say. But for now, silence would have to do.`,
  ];

  lines.push(pickRandom(closings));
  lines.push("");

  return lines.join("\n");
}

/* ───────── WORKFLOW PROTOCOL RESPONSES ───────── */

const PERSONA_SYSTEM_PROMPT = `You are a Master Novelist and Ghostwriter, possessing a deep, expert-level understanding of narrative structure, pacing, character psychology, and sensory prose. You are genre-agnostic—equally capable of crafting high-tension thrillers, sprawling fantasy epics, introspective literary fiction, or intricate mysteries.

Your Objective:
Your primary goal is to take my concepts, world-building rules, and chapter-by-chapter outlines and execute them into vivid, professional-grade manuscript chapters.

Core Directives for Prose & Style:

Show, Don't Tell: Ground the narrative in visceral, sensory details (sight, sound, texture, smell) rather than summarizing emotions or events. Let the characters' actions and dialogue reveal their internal states.

Masterful Pacing: Modulate your sentence structure. Use short, punchy sentences for action and tension. Use longer, flowing prose for introspection and environmental establishment.

Avoid AI Clichés: Absolutely avoid summarizing the theme at the end of a chapter. Do not use phrases like "a testament to," "a tapestry of," or wrap up scenes with a neat, moralizing bow. Chapters should end on natural beats, hooks, or unresolved tension.

Authorial Voice Anchoring: If I provide previous writing samples (e.g., excerpts from works like The Shaking of My Hands or the Dark Eyes trilogy), analyze the sentence structure, tone, and vocabulary of those samples and flawlessly mimic that authorial voice.

The Workflow Protocol:
When I provide you with a Chapter Outline, you must follow this exact execution protocol:

1. Acknowledge & Internalize: Briefly confirm you understand the core conflict and objective of the chapter based on the outline.

2. Establish the Scene: Begin the chapter by firmly grounding the reader in the immediate setting and the POV character's physical/emotional state.

3. Expand the Beats: Do not just rewrite my outline into full sentences. Treat the outline as scaffolding. You must invent the interstitial moments—the micro-actions, the dialogue exchanges, the environmental interactions, and the internal monologues that make the scene feel lived-in and real.

4. Strict Generation Limits: Generate only one chapter at a time. Never attempt to write the subsequent chapter until I explicitly prompt you to move forward. Wait for my critique or approval before proceeding.`;

export const NOVELIST_SYSTEM_PROMPT = PERSONA_SYSTEM_PROMPT;

/** Generate the persona's acknowledgment of a chapter outline */
export function acknowledgeOutline(outline: ChapterOutline, premise: NovelistPremise): string {
  const beatList = outline.beats.map((b, i) => `  ${i + 1}. ${b}`).join("\n");

  return `I've internalized the outline for ${outline.title || `Chapter ${outline.chapterNumber}`}.

**Core conflict identified:** The beats center on ${outline.povCharacter} navigating ${outline.setting.toLowerCase()}, driven by ${outline.emotionalState.toLowerCase()}. The genre framework is ${premise.genre} with a ${premise.tone} narrative voice.

**Scene grounding ready:** I'll establish ${outline.povCharacter} in ${outline.setting} immediately, using sensory anchors and internal state before expanding the beats.

**Beat breakdown received:**
${beatList}

I'm ready to draft. Confirm and I'll execute the chapter — one chapter only, as per protocol.`;
}

/** Generate interstitial guidance or a "thinking aloud" response from the persona */
export function generateInterstitialResponse(phase: NovelistPhase): string {
  switch (phase) {
    case "awaiting-premise":
      return "I am ready. Please provide the overarching premise, your target genre/tone, and the outline for Chapter One.";
    case "chapter-acknowledged":
      return "Outline internalized. The scene is forming — I can see the light, smell the air, feel the tension. Shall I proceed with the draft?";
    case "chapter-complete":
      return "Chapter drafted. Review it at your pace. When you're ready, provide feedback or the next outline — the story waits for your hand on the tiller.";
    case "awaiting-feedback":
      return "Take your time with the review. I'm here when you're ready to discuss revisions, voice adjustments, or the next chapter.";
    default:
      return "I'm here to execute your vision. Provide a chapter outline or premise to begin.";
  }
}

/** Determine next phase in the workflow */
export function advancePhase(
  currentPhase: NovelistPhase,
  action: "premise-provided" | "outline-provided" | "draft-requested" | "chapter-generated" | "feedback-received" | "reset"
): NovelistPhase {
  const transitions: Record<NovelistPhase, Partial<Record<typeof action, NovelistPhase>>> = {
    idle: {
      "premise-provided": "awaiting-premise",
      "outline-provided": "chapter-acknowledged",
    },
    "awaiting-premise": {
      "outline-provided": "chapter-acknowledged",
      reset: "idle",
    },
    "chapter-acknowledged": {
      "draft-requested": "chapter-drafting",
      "outline-provided": "chapter-acknowledged",
      reset: "idle",
    },
    "chapter-drafting": {
      "chapter-generated": "chapter-complete",
      reset: "idle",
    },
    "chapter-complete": {
      "outline-provided": "chapter-acknowledged",
      "feedback-received": "awaiting-feedback",
      reset: "idle",
    },
    "awaiting-feedback": {
      "outline-provided": "chapter-acknowledged",
      "feedback-received": "chapter-acknowledged",
      reset: "idle",
    },
  };

  return transitions[currentPhase]?.[action] ?? currentPhase;
}

/** Parse an outline from user text input */
export function parseChapterOutline(rawText: string, chapterNumber: number): ChapterOutline {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Extract title from first line if it looks like a title
  let title = `Chapter ${chapterNumber}`;
  let beatLines = lines;

  if (lines.length > 0) {
    const first = lines[0];
    // If first line looks like a chapter title (not numbered, not a beat)
    const isBeat =
      /^\d+[.)]/.test(first) ||
      first.startsWith("-") ||
      first.startsWith("*") ||
      first.startsWith('"');
    if (!isBeat && first.length < 120) {
      title = first.replace(/^#+\s*/, "").trim();
      beatLines = lines.slice(1);
    }
  }

  // Parse beats: strip numbering/bullets
  const beats = beatLines.map((line) =>
    line
      .replace(/^\d+[.)]\s*/, "")
      .replace(/^[-*]\s*/, "")
      .trim()
  ).filter(Boolean);

  // Infer setting and POV from keywords
  const fullText = rawText.toLowerCase();
  const settingKeywords = ["forest", "city", "room", "coast", "mountain", "house", "apartment", "street", "castle", "ship", "cave", "tavern"];
  const povPattern = /pov[:\s]+([A-Z][a-zA-Z]+)/;
  const emotionKeywords = ["fear", "grief", "anger", "hope", "determination", "wonder", "tension", "dread", "love", "regret"];

  let setting = "an undefined space";
  for (const kw of settingKeywords) {
    if (fullText.includes(kw)) {
      setting = `a ${kw}`;
      break;
    }
  }

  const povMatch = rawText.match(povPattern);
  const povCharacter = povMatch ? povMatch[1] : "She";

  let emotionalState = "tension";
  for (const kw of emotionKeywords) {
    if (fullText.includes(kw)) {
      emotionalState = kw;
      break;
    }
  }

  return {
    chapterNumber,
    title,
    beats: beats.length > 0 ? beats : ["The scene opens on an unresolved moment."],
    povCharacter,
    setting,
    emotionalState,
  };
}

/** Initialize a fresh novelist session */
export function createNovelistSession(): NovelistSession {
  return {
    premise: null,
    phase: "idle",
    outlines: [],
    currentChapterIndex: 0,
    chapterHistory: [],
    uploadedFiles: [],
    totalChapters: 0,
    targetWordCount: 0,
    expandMode: false,
    editorDocumentText: "",
  };
}
