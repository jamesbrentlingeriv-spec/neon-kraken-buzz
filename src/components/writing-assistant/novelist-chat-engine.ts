import {
  acknowledgeOutline,
  advancePhase,
  createNovelistSession,
  generateChapterDraft,
  generateInterstitialResponse,
  parseChapterOutline,
  NOVELIST_SYSTEM_PROMPT,
} from "./novelist-engine";
import type {
  ChapterOutline,
  NovelistPhase,
  NovelistPremise,
  NovelistSession,
} from "./types";

export interface ChatMessage {
  id: string;
  role: "user" | "persona";
  content: string;
  timestamp: string;
  /** Optional structured data attached to this message */
  meta?: {
    type?: "acknowledgment" | "chapter-draft" | "response" | "greeting" | "error";
    chapterNumber?: number;
    chapterTitle?: string;
  };
}

/** Detect what the user is trying to do from their message */
function detectIntent(
  message: string,
  session: NovelistSession
): {
  action: "set-premise" | "submit-outline" | "generate-chapter" | "ask-question" | "greeting";
  extractedText?: string;
} {
  const lower = message.toLowerCase().trim();

  // Premise detection
  const premiseKeywords = [
    "premise",
    "genre",
    "tone",
    "story idea",
    "my story is about",
    "world building",
    "setting",
  ];
  if (
    premiseKeywords.some((k) => lower.includes(k)) &&
    message.length > 30
  ) {
    return { action: "set-premise", extractedText: message };
  }

  // Outline detection
  const outlineKeywords = [
    "outline",
    "chapter outline",
    "beat",
    "beats",
    "chapter one",
    "chapter 1",
    "first chapter",
    "next chapter",
  ];
  if (outlineKeywords.some((k) => lower.includes(k))) {
    return { action: "submit-outline", extractedText: message };
  }

  // Also detect numbered/bulleted lists as outlines
  if (/^\d+[.)]/.test(message.trim()) || /^[-*]/.test(message.trim())) {
    return { action: "submit-outline", extractedText: message };
  }
  if (/\n\d+[.)]/.test(message) || /\n[-*]/.test(message)) {
    return { action: "submit-outline", extractedText: message };
  }

  // Generate chapter detection
  const generateKeywords = [
    "generate",
    "draft",
    "write the chapter",
    "write chapter",
    "go ahead",
    "proceed",
    "execute",
    "let's do it",
    "start writing",
    "create the chapter",
    "yes do it",
  ];
  if (generateKeywords.some((k) => lower.includes(k))) {
    return { action: "generate-chapter" };
  }

  // Greeting detection
  const greetingKeywords = ["hello", "hi", "hey", "greetings", "good morning", "good evening", "good afternoon"];
  if (greetingKeywords.some((k) => lower.startsWith(k)) && message.length < 40) {
    return { action: "greeting" };
  }

  // Default: ask question
  return { action: "ask-question" };
}

/** Generate a persona-style response for general writing questions */
function respondToQuestion(message: string, session: NovelistSession): string {
  const lower = message.toLowerCase();

  // Craft/writing advice responses
  if (lower.includes("pacing") || lower.includes("slow") || lower.includes("fast")) {
    return `Pacing is the heartbeat of fiction. When the scene tightens—a confrontation, a chase, a betrayal—cut the sentences short. Let the prose gasp. When the character is alone with their thoughts, let the sentences stretch and breathe. The reader's pulse should mirror the page.

I think of pacing as a camera lens: zoom in for tension, pull wide for reflection. What scene are you wrestling with right now?`;
  }

  if (lower.includes("dialogue") || lower.includes("conversation")) {
    return `Dialogue isn't transcription—it's distillation. Real conversation is full of filler, false starts, and tangents. Fictional dialogue is what remains after you burn away everything that doesn't reveal character or advance the tension.

A few principles I work from:
- Let characters interrupt each other. It's truer to life and creates friction.
- What a character *doesn't* say often matters more than what they do.
- Dialogue tags beyond "said" draw attention to themselves. Reserve them for moments where the manner of speech genuinely surprises.

Would you like me to look at a specific exchange?`;
  }

  if (lower.includes("character") || lower.includes("arc")) {
    return `A character arc is a lie the character tells themselves, slowly unraveled. The best arcs aren't about change—they're about *excavation*. The person they become was always buried underneath; the story just removes the layers.

Start with this: What does your character believe at the beginning that will be proven false by the end? That false belief is your engine. Everything else is fuel.`;
  }

  if (lower.includes("show don't tell") || lower.includes("sensory")) {
    return `"Show, don't tell" isn't a rule—it's a trust exercise. Telling the reader "she was sad" costs you nothing, but it buys you nothing either. Showing them the cold coffee she's been staring at for twenty minutes, the text message she's typed and deleted four times—that's where the reader climbs inside the character's skin.

I ground every scene in at least two senses beyond sight. Smell and texture are particularly underused. The metallic tang of fear in the back of the throat. The grit of dried salt on a steering wheel. These are the details that make fiction feel like memory.`;
  }

  if (lower.includes("ending") || lower.includes("hook") || lower.includes("cliffhanger")) {
    return `Chapters should end on a held breath, not an exhale. No summaries. No moralizing. No "and then she understood." The reader should *need* to turn the page.

Some effective chapter endings I use:
- A decision deferred ("She would have to choose. But not tonight.")
- A physical shift that implies a narrative one ("He closed the door. The latch clicked—louder than it used to.")
- A question the character can't yet answer
- An arrival or departure that changes the stakes

What chapter are you closing out?`;
  }

  // Prose style / voice
  if (lower.includes("voice") || lower.includes("style") || lower.includes("prose")) {
    return `Voice isn't something you add—it's something you stop filtering out. It lives in the details you notice, the metaphors you reach for, the rhythm of your sentences when you're not trying to impress anyone.

When I'm analyzing an authorial voice (like the samples from *The Shaking of My Hands* or the *Dark Eyes* trilogy), I look at:
- Average sentence length and variation
- Concrete vs. abstract noun ratio
- How often they use fragments. And why.
- The distance between the narrator and the character's inner thoughts

If you have writing samples you'd like me to study, upload them as baselines and I'll analyze the voice patterns.`;
  }

  // General writing encouragement / default
  const defaults = [
    `The blank page is the only honest mirror. Everything you put on it reveals something—even the hesitations. What's the scene you're trying to nail down?`,
    `I've found that when a scene resists being written, it's usually because I'm trying to force it somewhere it doesn't want to go. Step back. Ask yourself: what's the emotional truth here, not just the plot beat?`,
    `Good writing is revision, but great revision is listening. Listen to what the draft is trying to become, not what you planned for it to be. Tell me about this chapter and I'll help you hear it.`,
    `I'm here to serve the story. Give me your premise, an outline, or a specific craft question and I'll meet you in the text.`,
  ];

  return defaults[Math.floor(Math.random() * defaults.length)];
}

/** Process a user message and return the persona's response */
export function processChatMessage(
  message: string,
  session: NovelistSession
): {
  response: string;
  updatedSession: NovelistSession;
  chapterDraft?: { text: string; chapterNumber: number; title: string };
} {
  const intent = detectIntent(message, session);
  let updatedSession = { ...session };
  let response = "";
  let chapterDraft: { text: string; chapterNumber: number; title: string } | undefined;

  switch (intent.action) {
    case "greeting": {
      response = `Welcome. I'm here as your ghostwriter—genre-agnostic, voice-attentive, and ready to execute chapter by chapter.

${generateInterstitialResponse(updatedSession.phase)}`;
      break;
    }

    case "set-premise": {
      // Extract premise information from message
      const lower = message.toLowerCase();

      // Try to detect genre
      const genreOptions = [
        "literary fiction", "thriller", "mystery", "fantasy",
        "science fiction", "romance", "horror", "historical fiction",
        "adventure", "dystopian", "magical realism", "noir",
      ];
      let detectedGenre = "Fiction";
      for (const g of genreOptions) {
        if (lower.includes(g)) {
          detectedGenre = g.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          break;
        }
      }

      // Try to detect tone
      const toneOptions: [string, string][] = [
        ["dark", "Dark & Gritty"],
        ["gritty", "Dark & Gritty"],
        ["lyrical", "Lyrical & Introspective"],
        ["introspective", "Lyrical & Introspective"],
        ["taut", "Taut & Suspenseful"],
        ["suspenseful", "Taut & Suspenseful"],
        ["suspense", "Taut & Suspenseful"],
        ["warm", "Warm & Intimate"],
        ["intimate", "Warm & Intimate"],
        ["wry", "Wry & Ironic"],
        ["ironic", "Wry & Ironic"],
        ["epic", "Epic & Sweeping"],
        ["sweeping", "Epic & Sweeping"],
        ["sparse", "Sparse & Minimalist"],
        ["minimalist", "Sparse & Minimalist"],
      ];
      let detectedTone = "Taut & Suspenseful";
      for (const [keyword, tone] of toneOptions) {
        if (lower.includes(keyword)) {
          detectedTone = tone;
          break;
        }
      }

      const premise: NovelistPremise = {
        genre: detectedGenre,
        tone: detectedTone,
        overarchingPremise: message.trim(),
        worldBuildingNotes: "",
        authorialVoiceNotes: "",
      };

      updatedSession = {
        ...updatedSession,
        premise,
        phase: advancePhase(updatedSession.phase, "premise-provided"),
      };

      response = `I've absorbed your premise.

**Genre:** ${detectedGenre}
**Tone:** ${detectedTone}
**Core concept:** ${message.trim().slice(0, 150)}${message.trim().length > 150 ? '...' : ''}

This is fertile ground. The sensory world is already forming—I can feel the weight of it. When you're ready, lay out the beats for Chapter One. I'll acknowledge, ground the scene, and execute—one chapter only, per protocol.`;
      break;
    }

    case "submit-outline": {
      const chapterNumber = updatedSession.outlines.length + 1;
      const outline = parseChapterOutline(message.trim(), chapterNumber);
      const prem = updatedSession.premise ?? {
        genre: "Fiction",
        tone: "Lyrical & Introspective",
        overarchingPremise: "A story unfolding.",
        worldBuildingNotes: "",
        authorialVoiceNotes: "",
      };

      updatedSession = {
        ...updatedSession,
        phase: advancePhase(updatedSession.phase, "outline-provided"),
        outlines: [...updatedSession.outlines, outline],
        currentChapterIndex: updatedSession.outlines.length,
      };

      response = acknowledgeOutline(outline, prem);
      break;
    }

    case "generate-chapter": {
      const outline = updatedSession.outlines[updatedSession.currentChapterIndex];
      if (!outline) {
        response = "I don't have an outline to work from yet. Share your chapter beats—numbered or bulleted—and I'll acknowledge, then draft. The protocol runs: outline → acknowledge → generate.";
        break;
      }

      const prem = updatedSession.premise ?? {
        genre: "Fiction",
        tone: "Lyrical & Introspective",
        overarchingPremise: "A story unfolding.",
        worldBuildingNotes: "",
        authorialVoiceNotes: "",
      };

      updatedSession = {
        ...updatedSession,
        phase: advancePhase(updatedSession.phase, "draft-requested"),
      };

      const chapterText = generateChapterDraft(outline, prem);

      updatedSession = {
        ...updatedSession,
        phase: advancePhase(updatedSession.phase, "chapter-generated"),
        chapterHistory: [...updatedSession.chapterHistory, chapterText],
      };

      chapterDraft = {
        text: chapterText,
        chapterNumber: outline.chapterNumber,
        title: outline.title,
      };

      response = `Chapter ${outline.chapterNumber} is drafted. I've grounded the reader in ${outline.setting}, given ${outline.povCharacter} room to breathe, and expanded each beat into lived-in moments. No moralizing at the end—just a held breath.

The draft has been inserted into your editor. Review it at your pace. When you're ready: feedback, revisions, or the outline for the next chapter.`;

      break;
    }

    case "ask-question":
    default: {
      response = respondToQuestion(message, updatedSession);
      break;
    }
  }

  return { response, updatedSession, chapterDraft };
}

/** Generate the initial greeting message */
export function getInitialGreeting(phase: NovelistPhase): string {
  return `I am your Master Novelist and Ghostwriter. I work chapter by chapter—genre-agnostic, sensory-forward, and ruthlessly opposed to moralizing endings.

${generateInterstitialResponse(phase)}`;
}