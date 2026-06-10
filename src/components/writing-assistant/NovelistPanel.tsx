"use client";

import * as React from "react";
import {
  BookOpen,
  Feather,
  Lightbulb,
  RefreshCw,
  ScrollText,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  NOVELIST_SYSTEM_PROMPT,
  acknowledgeOutline,
  advancePhase,
  createNovelistSession,
  generateChapterDraft,
  generateInterstitialResponse,
  parseChapterOutline,
} from "./novelist-engine";
import type {
  ChapterOutline,
  NovelistPhase,
  NovelistPremise,
  NovelistSession,
} from "./types";

interface NovelistPanelProps {
  onChapterGenerated: (chapterText: string, chapterNumber: number) => void;
}

const GENRES = [
  "Literary Fiction",
  "Thriller",
  "Mystery",
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Horror",
  "Historical Fiction",
  "Adventure",
  "Dystopian",
  "Magical Realism",
  "Noir",
];

const TONES = [
  "Dark & Gritty",
  "Lyrical & Introspective",
  "Taut & Suspenseful",
  "Warm & Intimate",
  "Wry & Ironic",
  "Epic & Sweeping",
  "Sparse & Minimalist",
];

const WORKFLOW_STEPS: {
  phase: NovelistPhase;
  label: string;
  icon: React.ReactNode;
}[] = [
  { phase: "idle", label: "Initialize", icon: <Sparkles className="h-4 w-4" /> },
  {
    phase: "awaiting-premise",
    label: "Set Premise",
    icon: <Lightbulb className="h-4 w-4" />,
  },
  {
    phase: "chapter-acknowledged",
    label: "Outline Received",
    icon: <ScrollText className="h-4 w-4" />,
  },
  {
    phase: "chapter-drafting",
    label: "Drafting",
    icon: <Feather className="h-4 w-4" />,
  },
  {
    phase: "chapter-complete",
    label: "Chapter Ready",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    phase: "awaiting-feedback",
    label: "Review",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
];

const NovelistPanel = ({ onChapterGenerated }: NovelistPanelProps) => {
  const [session, setSession] = React.useState<NovelistSession>(
    createNovelistSession
  );

  const [genre, setGenre] = React.useState("Thriller");
  const [tone, setTone] = React.useState("Taut & Suspenseful");
  const [overarchingPremise, setOverarchingPremise] = React.useState("");
  const [worldBuildingNotes, setWorldBuildingNotes] = React.useState("");
  const [authorialVoiceNotes, setAuthorialVoiceNotes] = React.useState("");

  const [outlineText, setOutlineText] = React.useState("");
  const [chapterNumber, setChapterNumber] = React.useState(1);
  const [personaResponse, setPersonaResponse] = React.useState("");
  const [showSystemPrompt, setShowSystemPrompt] = React.useState(false);
  const [isDrafting, setIsDrafting] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("novelist-session-v1");
    if (saved) {
      try {
        const parsed: NovelistSession = JSON.parse(saved);
        setSession(parsed);
        if (parsed.premise) {
          setGenre(parsed.premise.genre);
          setTone(parsed.premise.tone);
          setOverarchingPremise(parsed.premise.overarchingPremise);
          setWorldBuildingNotes(parsed.premise.worldBuildingNotes);
          setAuthorialVoiceNotes(parsed.premise.authorialVoiceNotes);
        }
        if (parsed.outlines.length > 0) {
          setChapterNumber(parsed.outlines.length + 1);
        }
        setPersonaResponse(generateInterstitialResponse(parsed.phase));
      } catch {
        // corrupt state
      }
    } else {
      setPersonaResponse(generateInterstitialResponse("idle"));
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem("novelist-session-v1", JSON.stringify(session));
  }, [session]);

  const goToPhase = (action: Parameters<typeof advancePhase>[1]) => {
    setSession((prev) => {
      const nextPhase = advancePhase(prev.phase, action);
      return { ...prev, phase: nextPhase };
    });
    setPersonaResponse(
      generateInterstitialResponse(advancePhase(session.phase, action))
    );
  };

  const handleSetPremise = () => {
    if (!overarchingPremise.trim()) return;
    const premise: NovelistPremise = {
      genre,
      tone,
      overarchingPremise: overarchingPremise.trim(),
      worldBuildingNotes: worldBuildingNotes.trim(),
      authorialVoiceNotes: authorialVoiceNotes.trim(),
    };
    setSession((prev) => ({
      ...prev,
      premise,
      phase: advancePhase(prev.phase, "premise-provided"),
    }));
    setPersonaResponse(
      `Premise locked in. Genre: ${genre}. Tone: ${tone}.\n\nI've absorbed your world-building framework. I'm ready for the Chapter One outline whenever you are.`
    );
  };

  const handleSubmitOutline = () => {
    if (!outlineText.trim()) return;
    const outline = parseChapterOutline(outlineText.trim(), chapterNumber);
    setSession((prev) => {
      const nextPhase = advancePhase(prev.phase, "outline-provided");
      return {
        ...prev,
        phase: nextPhase,
        outlines: [...prev.outlines, outline],
        currentChapterIndex: prev.outlines.length,
      };
    });
    const prem = session.premise ?? {
      genre: "Fiction",
      tone: "Lyrical & Introspective",
      overarchingPremise: "A story unfolding.",
      worldBuildingNotes: "",
      authorialVoiceNotes: "",
    };
    setPersonaResponse(acknowledgeOutline(outline, prem));
  };

  const handleGenerateChapter = () => {
    const outline = session.outlines[session.currentChapterIndex];
    if (!outline) return;
    const prem = session.premise ?? {
      genre: "Fiction",
      tone: "Lyrical & Introspective",
      overarchingPremise: "A story unfolding.",
      worldBuildingNotes: "",
      authorialVoiceNotes: "",
    };
    setSession((prev) => ({
      ...prev,
      phase: advancePhase(prev.phase, "draft-requested"),
    }));
    setPersonaResponse("Drafting in progress... Executing the chapter now.");
    setIsDrafting(true);
    setTimeout(() => {
      const chapterText = generateChapterDraft(outline, prem);
      setSession((prev) => ({
        ...prev,
        phase: advancePhase(prev.phase, "chapter-generated"),
        chapterHistory: [...prev.chapterHistory, chapterText],
      }));
      onChapterGenerated(chapterText, outline.chapterNumber);
      setPersonaResponse(generateInterstitialResponse("chapter-complete"));
      setIsDrafting(false);
    }, 800);
  };

  const handleRequestFeedback = () => goToPhase("feedback-received");

  const handleNextChapter = () => {
    setChapterNumber((n) => n + 1);
    setOutlineText("");
    goToPhase("feedback-received");
  };

  const handleReset = () => {
    if (
      !window.confirm(
        "Reset the entire novelist session? All session state will be cleared."
      )
    )
      return;
    const fresh = createNovelistSession();
    setSession(fresh);
    setGenre("Thriller");
    setTone("Taut & Suspenseful");
    setOverarchingPremise("");
    setWorldBuildingNotes("");
    setAuthorialVoiceNotes("");
    setOutlineText("");
    setChapterNumber(1);
    setPersonaResponse(generateInterstitialResponse("idle"));
    localStorage.removeItem("novelist-session-v1");
  };

  const currentStepIndex = WORKFLOW_STEPS.findIndex(
    (s) => s.phase === session.phase
  );

  const canAcknowledgeOutline =
    outlineText.trim().length > 0 &&
    (session.phase === "idle" ||
      session.phase === "awaiting-premise" ||
      session.phase === "chapter-acknowledged" ||
      session.phase === "chapter-complete" ||
      session.phase === "awaiting-feedback");

  const canGenerate =
    session.outlines.length > 0 &&
    session.currentChapterIndex < session.outlines.length &&
    (session.phase === "chapter-acknowledged" ||
      session.phase === "awaiting-premise");

  const outlineCount = session.outlines.length;
  const chapterCount = session.chapterHistory.length;

  return (
    <Card className="overflow-hidden border-purple-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300">
              <Feather className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Master Novelist</CardTitle>
              <CardDescription>
                Chapter-by-chapter. Sensory prose. No moralizing.
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0"
          >
            Ch. {chapterCount}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Workflow Phase Bar ── */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Workflow Phase
          </Label>
          <div className="flex items-center gap-1">
            {WORKFLOW_STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              return (
                <React.Fragment key={step.phase}>
                  {index > 0 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        isCompleted
                          ? "bg-purple-500"
                          : isActive
                            ? "bg-purple-300"
                            : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex h-8 w-8 cursor-default items-center justify-center rounded-full border-2 text-xs ${
                          isCompleted
                            ? "border-purple-500 bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300"
                            : isActive
                              ? "border-purple-500 bg-purple-600 text-white"
                              : "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isActive ? (
                          step.icon
                        ) : (
                          <span className="text-[10px]">{index + 1}</span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">{step.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <Separator className="bg-slate-200 dark:bg-slate-800" />

        {/* ── Premise Setup ── */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Project Premise</Label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-500">Narrative Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-500">
              Overarching Premise
            </Label>
            <Textarea
              value={overarchingPremise}
              onChange={(e) => setOverarchingPremise(e.target.value)}
              placeholder="A disgraced intelligence officer discovers her memory has been selectively erased..."
              className="mt-1 min-h-20 rounded-xl"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-500">
              World-Building Notes
            </Label>
            <Textarea
              value={worldBuildingNotes}
              onChange={(e) => setWorldBuildingNotes(e.target.value)}
              placeholder="Magic systems, technology rules, political structures, geography..."
              className="mt-1 min-h-16 rounded-xl"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-500">
              Authorial Voice Notes
            </Label>
            <Textarea
              value={authorialVoiceNotes}
              onChange={(e) => setAuthorialVoiceNotes(e.target.value)}
              placeholder="Describe your preferred prose style, sentence rhythm, vocabulary range, POV depth..."
              className="mt-1 min-h-16 rounded-xl"
            />
          </div>

          <Button
            type="button"
            className="w-full rounded-2xl bg-purple-600 font-semibold text-white shadow-sm hover:bg-purple-700"
            onClick={handleSetPremise}
            disabled={!overarchingPremise.trim()}
          >
            Lock in Premise
          </Button>
        </div>

        <Separator className="bg-slate-200 dark:bg-slate-800" />

        {/* ── Chapter Outline Section ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Chapter Outline</Label>
            <Badge variant="outline" className="text-xs">
              Ch. {chapterNumber}
            </Badge>
          </div>

          <Textarea
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
            placeholder={`Chapter ${chapterNumber} outline beats:\n\nThe alley behind the Blue Orchid\ne.g., 1. Maya presses her back against the wet brick, listening for footsteps.\n2. She discovers the envelope in her coat pocket — not hers.\n3. A voice from the fire escape above: "You're early."`}
            className="min-h-32 rounded-2xl"
          />

          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1 rounded-2xl bg-purple-600 font-semibold text-white shadow-sm hover:bg-purple-700"
              onClick={handleSubmitOutline}
              disabled={!canAcknowledgeOutline}
            >
              Submit Outline
            </Button>

            <Button
              type="button"
              className="flex-1 rounded-2xl bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700"
              onClick={handleGenerateChapter}
              disabled={!canGenerate || isDrafting}
            >
              {isDrafting ? "Drafting..." : "Generate Chapter"}
            </Button>
          </div>

          {canGenerate && (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Submit your outline first, then generate. The persona will
              acknowledge before drafting.
            </p>
          )}
        </div>

        <Separator className="bg-slate-200 dark:bg-slate-800" />

        {/* ── Persona Response Display ── */}
        {personaResponse && (
          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 dark:border-purple-900 dark:bg-purple-950/30">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                Persona Response
              </span>
            </div>
            <ScrollArea className="max-h-48">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {personaResponse}
              </p>
            </ScrollArea>
          </div>
        )}

        {/* ── Chapter History Summary ── */}
        {session.chapterHistory.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Chapter History
            </Label>
            <div className="flex flex-wrap gap-2">
              {session.chapterHistory.map((_, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="rounded-full border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
                >
                  Ch. {i + 1}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* ── System Prompt Toggle ── */}
        <div>
          <button
            type="button"
            className="text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-300"
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          >
            {showSystemPrompt ? "Hide" : "Show"} persona system prompt
          </button>
          {showSystemPrompt && (
            <ScrollArea className="mt-2 max-h-64 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {NOVELIST_SYSTEM_PROMPT}
              </p>
            </ScrollArea>
          )}
        </div>

        {/* ── Actions Footer ── */}
        <div className="flex gap-2">
          {session.phase === "chapter-complete" && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={handleRequestFeedback}
            >
              Ready for Feedback
            </Button>
          )}
          {session.chapterHistory.length > 0 &&
            session.phase === "chapter-complete" && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={handleNextChapter}
              >
                Next Chapter
              </Button>
            )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            onClick={handleReset}
          >
            <RefreshCw className="h-4 w-4 text-slate-400" />
            <span className="sr-only">Reset session</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NovelistPanel;