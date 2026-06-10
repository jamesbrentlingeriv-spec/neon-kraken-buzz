export type Tone =
  | "professional"
  | "friendly"
  | "academic"
  | "concise"
  | "persuasive"
  | "warm"
  | "bold";

export type Intent =
  | "rewrite"
  | "clarify"
  | "tone"
  | "summarize"
  | "outline"
  | "continue"
  | "title"
  | "custom";

export type LengthPreference = "shorter" | "same" | "longer";

export type ApplyMode =
  | "replace-selection"
  | "insert-cursor"
  | "insert-below"
  | "insert-end";

export interface BaselineDocument {
  id: string;
  name: string;
  text: string;
  wordCount: number;
}

export interface AssistantRequest {
  intent: Intent;
  tone: Tone;
  length: LengthPreference;
  customPrompt: string;
  selectedText: string;
  documentText: string;
  baselineText: string;
  useBaseline: boolean;
}

export interface AssistantProposal {
  id: string;
  title: string;
  summary: string;
  output: string;
  sourceLabel: string;
  hasSelection: boolean;
  createdAt: string;
}

export interface EditorSelectionState {
  hasSelection: boolean;
  text: string;
  html: string;
}

export interface DocumentEditorHandle {
  runCommand: (command: string) => void;
  replaceSelection: (html: string) => void;
  insertAtCursor: (html: string) => void;
  insertBelowSelection: (html: string) => void;
  insertAtEnd: (html: string) => void;
  getHtml: () => string;
  focus: () => void;
}

/** Novelist workflow protocol phases */
export type NovelistPhase =
  | "idle"
  | "awaiting-premise"
  | "chapter-acknowledged"
  | "chapter-drafting"
  | "chapter-complete"
  | "awaiting-feedback";

/** Structured outline for a single chapter */
export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  beats: string[];
  povCharacter: string;
  setting: string;
  emotionalState: string;
}

/** Premise & genre configuration for the novelist persona */
export interface NovelistPremise {
  genre: string;
  tone: string;
  overarchingPremise: string;
  worldBuildingNotes: string;
  authorialVoiceNotes: string;
}

/** A complete novelist session state */
export interface NovelistSession {
  premise: NovelistPremise | null;
  phase: NovelistPhase;
  outlines: ChapterOutline[];
  currentChapterIndex: number;
  chapterHistory: string[];
  /** Uploaded PDF/EPUB files used as baseline context */
  uploadedFiles: BaselineDocument[];
  /** Total number of chapters planned for the book */
  totalChapters: number;
  /** Target total word count for the book */
  targetWordCount: number;
  /** Whether the user wants to expand existing chapters (vs writing new ones) */
  expandMode: boolean;
  /** The full document text from the word processor (used in expand mode) */
  editorDocumentText: string;
}
