"use client";

import * as React from "react";
import {
  Feather,
  Send,
  ChevronDown,
  BookOpen,
  User,
  Loader2,
  Settings,
  Key,
  Zap,
  FileText,
  X,
  Upload,
  Target,
  Hash,
  Maximize2,
  Edit3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showError, showSuccess } from "@/utils/toast";
import {
  createNovelistSession,
  NOVELIST_SYSTEM_PROMPT,
} from "./novelist-engine";
import {
  processChatMessage,
  getInitialGreeting,
  type ChatMessage,
} from "./novelist-chat-engine";
import { countWords } from "./editor-utils";
import {
  isSupportedTextFile,
  notifyUnsupportedFiles,
  readFileAsBaseline,
} from "./file-utils";
import {
  getStoredApiKey,
  setStoredApiKey,
  getStoredModel,
  setStoredModel,
  hasApiKey,
  callOpenRouter,
  AVAILABLE_MODELS,
  resolveModel,
  type ChatCompletionMessage,
} from "@/lib/openrouter";
import type { NovelistSession, NovelistPhase } from "./types";

interface NovelistChatProps {
  onChapterGenerated: (chapterText: string, chapterNumber: number) => void;
  /** Current full text from the word processor editor */
  editorDocumentText: string;
  /** Current chapter count in the editor (detected from # Chapter headings) */
  editorChapterCount: number;
  /** Current word count in the editor */
  editorWordCount: number;
}

const PHASE_BADGES: Record<
  NovelistPhase,
  { label: string; className: string }
> = {
  idle: {
    label: "Idle",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  },
  "awaiting-premise": {
    label: "Awaiting Premise",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  "chapter-acknowledged": {
    label: "Outline Ingested",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  "chapter-drafting": {
    label: "Drafting",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  "chapter-complete": {
    label: "Chapter Ready",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  "awaiting-feedback": {
    label: "Awaiting Feedback",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
};

const NovelistChat = ({
  onChapterGenerated,
  editorDocumentText,
  editorChapterCount,
  editorWordCount,
}: NovelistChatProps) => {
  const [session, setSession] = React.useState<NovelistSession>(
    createNovelistSession,
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [apiKey, setApiKey] = React.useState(getStoredApiKey);
  const [model, setModel] = React.useState(getStoredModel);
  const [apiKeyVisible, setApiKeyVisible] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [showSetup, setShowSetup] = React.useState(false);
  const [lastUsedModel, setLastUsedModel] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Setup form state
  const [chaptersInput, setChaptersInput] = React.useState("");
  const [wordsInput, setWordsInput] = React.useState("");

  React.useEffect(() => {
    const savedSession = localStorage.getItem("novelist-session-v1");
    const savedMessages = localStorage.getItem("novelist-chat-messages-v1");
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch {
        /* */
      }
    }
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch {
        /* */
      }
    } else {
      const init = savedSession
        ? (JSON.parse(savedSession) as NovelistSession)
        : createNovelistSession();
      const greeting: ChatMessage = {
        id: `greeting-${Date.now()}`,
        role: "persona",
        content: getInitialGreeting(init.phase),
        timestamp: new Date().toISOString(),
        meta: { type: "greeting" },
      };
      setMessages([greeting]);
    }
    // Show setup if no chapter/word targets set yet
    const s = savedSession
      ? (JSON.parse(savedSession) as NovelistSession)
      : null;
    if (!s || s.totalChapters === 0) setShowSetup(true);
  }, []);

  React.useEffect(() => {
    const updated = { ...session, editorDocumentText };
    localStorage.setItem("novelist-session-v1", JSON.stringify(updated));
    setSession(updated);
  }, [editorDocumentText]);

  React.useEffect(() => {
    localStorage.setItem("novelist-session-v1", JSON.stringify(session));
  }, [session]);
  React.useEffect(() => {
    if (messages.length)
      localStorage.setItem(
        "novelist-chat-messages-v1",
        JSON.stringify(messages),
      );
  }, [messages]);
  React.useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const addMsg = (msg: ChatMessage) => setMessages((p) => [...p, msg]);

  const targetChapterWords =
    session.totalChapters > 0 && session.targetWordCount > 0
      ? Math.round(session.targetWordCount / session.totalChapters)
      : 0;

  const buildFileContext = (): string => {
    if (!session.uploadedFiles.length) return "";
    return session.uploadedFiles
      .map(
        (f) =>
          `### Uploaded File: ${f.name} (${f.wordCount} words)\n${f.text.slice(0, 8000)}`,
      )
      .join("\n\n---\n\n");
  };

  const buildSystemContent = (): string => {
    const parts = [NOVELIST_SYSTEM_PROMPT];
    if (session.premise) {
      parts.push(
        `\nCurrent project:\nGenre: ${session.premise.genre}\nTone: ${session.premise.tone}\nPremise: ${session.premise.overarchingPremise}\nWorld-building: ${session.premise.worldBuildingNotes || "None"}\nVoice notes: ${session.premise.authorialVoiceNotes || "None"}\nChapters drafted: ${session.chapterHistory.length}/${session.totalChapters || "?"}`,
      );
    }
    if (session.totalChapters > 0 && session.targetWordCount > 0) {
      parts.push(
        `\n## Project Targets\nTotal chapters planned: ${session.totalChapters}\nTarget book word count: ${session.targetWordCount.toLocaleString()}\nAverage words per chapter: ~${targetChapterWords.toLocaleString()}\nPlease aim for approximately ${targetChapterWords.toLocaleString()} words per chapter.`,
      );
    }
    const fileContext = buildFileContext();
    if (fileContext) {
      parts.push(
        `\n## Uploaded Baseline Documents\nAnalyze the sentence structure, tone, vocabulary, pacing patterns, and narrative techniques in these documents. When writing, flawlessly mimic this authorial voice.\n\n${fileContext}`,
      );
    }
    if (session.expandMode && editorDocumentText) {
      parts.push(
        `\n## EXPAND MODE — Active\nThe user has existing chapters in the editor. They want each chapter EXPANDED and ENRICHED in the same style, voice, and manner of writing. Do NOT write new chapters from scratch. Instead, take the existing chapter text provided and expand it: add sensory details, deepen internal monologue, flesh out dialogue, extend action sequences, and enrich environmental description — all while preserving the original voice, plot beats, and character voices. The expanded version should be 1.5-2x the length of the original.`,
      );
      parts.push(
        `\n### Current editor content (for style reference):\n${editorDocumentText.slice(0, 3000)}`,
      );
    }
    return parts.join("\n");
  };

  const buildApiMessages = (): ChatCompletionMessage[] => [
    { role: "system", content: buildSystemContent() },
    ...messages.slice(-10).map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
  ];

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isProcessing) return;
    addMsg({
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    });
    setInputValue("");
    setIsProcessing(true);
    if (hasApiKey()) {
      try {
        const all = buildApiMessages();
        all.push({ role: "user", content: text });
        const response = await callOpenRouter(all, {
          model,
          temperature: 0.85,
          maxTokens: 2048,
        });
        setLastUsedModel(all.length > 0 ? resolveModel(all) : "");
        addMsg({
          id: `p-${Date.now()}`,
          role: "persona",
          content: response,
          timestamp: new Date().toISOString(),
          meta: { type: "response" },
        });
      } catch (error) {
        addMsg({
          id: `err-${Date.now()}`,
          role: "persona",
          content: `API error: ${error instanceof Error ? error.message : "Unknown"}. Check your key in Settings.`,
          timestamp: new Date().toISOString(),
          meta: { type: "error" },
        });
      }
    } else {
      await new Promise((r) => setTimeout(r, 600));
      const result = processChatMessage(text, session);
      setSession(result.updatedSession);
      addMsg({
        id: `p-${Date.now()}`,
        role: "persona",
        content: result.response,
        timestamp: new Date().toISOString(),
        meta: result.chapterDraft
          ? {
              type: "chapter-draft",
              chapterNumber: result.chapterDraft.chapterNumber,
              chapterTitle: result.chapterDraft.title,
            }
          : { type: "response" },
      });
      if (result.chapterDraft)
        onChapterGenerated(
          result.chapterDraft.text,
          result.chapterDraft.chapterNumber,
        );
    }
    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    if (!files.length) return;
    const supported = files.filter(isSupportedTextFile);
    if (!supported.length) {
      notifyUnsupportedFiles();
      e.currentTarget.value = "";
      return;
    }
    setIsUploading(true);
    try {
      const docs = await Promise.all(supported.map(readFileAsBaseline));
      setSession((prev) => ({
        ...prev,
        uploadedFiles: [...prev.uploadedFiles, ...docs],
      }));
      showSuccess(`${docs.length} file${docs.length > 1 ? "s" : ""} uploaded.`);
    } catch {
      showError("Failed to parse one or more files.");
    }
    setIsUploading(false);
    e.currentTarget.value = "";
  };

  const removeFile = (id: string) =>
    setSession((prev) => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((f) => f.id !== id),
    }));

  const handleSaveSetup = () => {
    const ch = parseInt(chaptersInput, 10) || 0;
    const wc = parseInt(wordsInput, 10) || 0;
    setSession((prev) => ({ ...prev, totalChapters: ch, targetWordCount: wc }));
    setShowSetup(false);
    if (ch > 0 && wc > 0) {
      const avg = Math.round(wc / ch);
      addMsg({
        id: `setup-${Date.now()}`,
        role: "persona",
        content: `Got it. ${ch} chapters, ~${wc.toLocaleString()} total words. That's about **${avg.toLocaleString()} words per chapter** — I'll keep that target in mind.\n\nNow: share your premise, or if you already have chapters in the editor, toggle **Expand Mode** below. I'm ready.`,
        timestamp: new Date().toISOString(),
        meta: { type: "response" },
      });
    }
  };

  const toggleExpandMode = (on: boolean) => {
    setSession((prev) => ({ ...prev, expandMode: on }));
    if (on && editorDocumentText) {
      const wordCount = countWords(editorDocumentText);
      addMsg({
        id: `expand-${Date.now()}`,
        role: "persona",
        content: `**Expand Mode activated.** I see ${editorChapterCount} chapter${editorChapterCount !== 1 ? "s" : ""} and ${wordCount.toLocaleString()} words in your editor. I'll analyze the voice, sentence structure, and style, then expand each chapter while preserving your original voice and plot beats.\n\nAsk me to expand a specific chapter by name or number, and I'll deliver.`,
        timestamp: new Date().toISOString(),
        meta: { type: "response" },
      });
    } else if (!on) {
      addMsg({
        id: `expand-off-${Date.now()}`,
        role: "persona",
        content:
          "Expand Mode deactivated. I'm back to writing fresh chapters from your outlines.",
        timestamp: new Date().toISOString(),
        meta: { type: "response" },
      });
    }
  };

  const phaseBadge = PHASE_BADGES[session.phase];

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
              <Feather className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Master Novelist
              </p>
              <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                {hasApiKey()
                  ? `Live · ${
                      model === "__auto__" && lastUsedModel
                        ? `Auto: ${AVAILABLE_MODELS.find((m) => m.value === lastUsedModel)?.label || lastUsedModel}`
                        : AVAILABLE_MODELS.find((m) => m.value === model)
                            ?.label || model
                    }`
                  : "Offline mock"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge className={`text-[10px] ${phaseBadge.className}`}>
              {phaseBadge.label}
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {hasApiKey() ? "API Connected" : "Set API Key"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Project targets bar */}
        {session.totalChapters > 0 && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-purple-100 bg-purple-50/50 px-2.5 py-1.5 dark:border-purple-900 dark:bg-purple-950/30">
            <Target className="h-3 w-3 text-purple-500" />
            <span className="text-[11px] text-purple-700 dark:text-purple-300">
              {session.chapterHistory.length}/{session.totalChapters} ch · ~
              {targetChapterWords.toLocaleString()} words/ch
            </span>
            {session.expandMode && (
              <Badge className="ml-auto bg-amber-100 text-amber-700 text-[9px] dark:bg-amber-950 dark:text-amber-300">
                <Maximize2 className="mr-0.5 h-2 w-2" />
                Expand Mode
              </Badge>
            )}
            <button
              type="button"
              className="ml-auto text-[10px] text-purple-400 hover:text-purple-600 underline"
              onClick={() => setShowSetup(true)}
            >
              Edit targets
            </button>
          </div>
        )}

        {/* Uploaded files */}
        {session.uploadedFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {session.uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-2.5 py-1.5 dark:border-indigo-900 dark:bg-indigo-950/30"
              >
                <FileText className="h-3 w-3 shrink-0 text-indigo-500" />
                <span className="truncate text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                  {file.name}
                </span>
                <span className="shrink-0 text-[10px] text-indigo-400">
                  {file.wordCount.toLocaleString()} words
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-5 w-5 shrink-0 rounded"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-3 w-3 text-indigo-400" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Setup onboarding card */}
        {showSetup && (
          <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-amber-600" />
              <Label className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                Project Targets
              </Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-amber-700 dark:text-amber-400">
                  Total Chapters
                </Label>
                <Input
                  value={chaptersInput}
                  onChange={(e) => setChaptersInput(e.target.value)}
                  placeholder="e.g. 24"
                  type="number"
                  className="mt-0.5 h-7 rounded-lg text-[11px]"
                />
              </div>
              <div>
                <Label className="text-[10px] text-amber-700 dark:text-amber-400">
                  Target Total Words
                </Label>
                <Input
                  value={wordsInput}
                  onChange={(e) => setWordsInput(e.target.value)}
                  placeholder="e.g. 80000"
                  type="number"
                  className="mt-0.5 h-7 rounded-lg text-[11px]"
                />
              </div>
            </div>
            {chaptersInput && wordsInput && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                ~
                {Math.round(
                  parseInt(wordsInput, 10) / parseInt(chaptersInput, 10),
                ).toLocaleString()}{" "}
                words per chapter
              </p>
            )}

            {/* Expand mode toggle */}
            {editorChapterCount > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-white/50 px-2.5 py-1.5 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-center gap-1.5">
                  <Edit3 className="h-3 w-3 text-amber-600" />
                  <Label className="text-[10px] text-amber-800 dark:text-amber-300">
                    Expand existing chapters
                  </Label>
                </div>
                <Switch
                  checked={session.expandMode}
                  onCheckedChange={toggleExpandMode}
                  className="scale-75"
                />
              </div>
            )}

            <Button
              type="button"
              size="sm"
              className="w-full h-7 rounded-lg bg-amber-600 text-[11px] hover:bg-amber-700"
              onClick={handleSaveSetup}
            >
              {chaptersInput && wordsInput ? "Save & Start" : "Skip for now"}
            </Button>
          </div>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Key className="h-3.5 w-3.5 text-purple-600" />
              <Label className="text-[11px] font-semibold">
                OpenRouter API (Free Models)
              </Label>
              {hasApiKey() && (
                <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-[9px] dark:bg-emerald-950 dark:text-emerald-300">
                  <Zap className="mr-0.5 h-2 w-2" />
                  Live
                </Badge>
              )}
            </div>
            <div className="flex gap-1.5">
              <Input
                type={apiKeyVisible ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="h-7 rounded-lg text-[11px]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-lg"
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
              >
                <span className="text-[10px]">
                  {apiKeyVisible ? "🙈" : "👁"}
                </span>
              </Button>
            </div>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-7 rounded-lg text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                className="flex-1 h-7 rounded-lg bg-purple-600 text-[11px] hover:bg-purple-700"
                onClick={() => {
                  setStoredApiKey(apiKey.trim());
                  setStoredModel(model);
                  setShowSettings(false);
                }}
                disabled={!apiKey.trim()}
              >
                Connect
              </Button>
              {hasApiKey() && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-lg text-[11px]"
                  onClick={() => {
                    setApiKey("");
                    setStoredApiKey("");
                  }}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-3 p-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "persona" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                  <Feather className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-purple-600 text-white"
                    : msg.meta?.type === "error"
                      ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                }`}
              >
                {msg.meta?.type === "chapter-draft" &&
                  msg.meta.chapterNumber && (
                    <Badge className="mb-1.5 bg-emerald-100 text-emerald-700 text-[10px] dark:bg-emerald-950 dark:text-emerald-300">
                      <BookOpen className="mr-1 h-2.5 w-2.5" />
                      Ch. {msg.meta.chapterNumber} drafted
                    </Badge>
                  )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`mt-1 text-[10px] ${msg.role === "user" ? "text-purple-200" : msg.meta?.type === "error" ? "text-red-400" : "text-gray-400 dark:text-gray-500"}`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
          ))}
          {isProcessing && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
              </div>
              <div className="rounded-2xl bg-gray-100 px-3.5 py-2.5 dark:bg-gray-700">
                <p className="flex items-center gap-1.5 text-sm text-gray-500">
                  {hasApiKey() ? "Calling API..." : "Thinking..."}
                  <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-purple-400" />
                  <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-purple-400 [animation-delay:0.1s]" />
                  <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-purple-400 [animation-delay:0.2s]" />
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── System prompt toggle ── */}
      <div className="shrink-0 px-4 pt-0.5">
        <button
          type="button"
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${showSystemPrompt ? "rotate-180" : ""}`}
          />
          {showSystemPrompt ? "Hide" : "Show"} persona instructions
        </button>
        {showSystemPrompt && (
          <div className="mt-1.5 max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-600 dark:bg-gray-900">
            <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
              {NOVELIST_SYSTEM_PROMPT}
            </p>
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 border-t border-gray-200 p-3 dark:border-gray-700">
        <div className="mb-2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg text-[11px] text-gray-500 hover:text-indigo-600"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Upload className="mr-1 h-3 w-3" />
            )}
            Upload PDF/EPUB/TXT
          </Button>
          <span className="text-[10px] text-gray-400">
            for voice & style context
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {editorChapterCount > 0 && (
              <>
                <Label className="text-[10px] text-gray-400">Expand</Label>
                <Switch
                  checked={session.expandMode}
                  onCheckedChange={toggleExpandMode}
                  className="scale-75"
                />
              </>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".epub,.pdf,.txt,application/epub+zip,application/pdf,text/plain"
          className="hidden"
          onChange={handleFileUpload}
        />
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything, or share an outline..."
            className="min-h-10 rounded-xl text-sm resize-none"
            rows={2}
            disabled={isProcessing}
          />
          <Button
            type="button"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl bg-purple-600 hover:bg-purple-700"
            onClick={handleSend}
            disabled={!inputValue.trim() || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1 text-center text-[10px] text-gray-400">
          Enter to send · Shift+Enter for new line
          {targetChapterWords > 0
            ? ` · Target: ~${targetChapterWords.toLocaleString()} words/ch`
            : ""}
        </p>
      </div>
    </div>
  );
};

export default NovelistChat;
