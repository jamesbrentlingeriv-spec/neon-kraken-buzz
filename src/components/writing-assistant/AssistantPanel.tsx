import * as React from "react";
import { WandSparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { excerpt } from "./editor-utils";
import type {
  AssistantRequest,
  Intent,
  LengthPreference,
  Tone,
} from "./types";
import type { BaselineDocument } from "./types";

interface AssistantPanelProps {
  selectedText: string;
  documentText: string;
  baselines: BaselineDocument[];
  onCreateProposal: (request: AssistantRequest) => void;
}

const intentOptions: Array<{ value: Intent; label: string; description: string }> = [
  { value: "rewrite", label: "Rewrite selected text", description: "Refresh wording while preserving meaning." },
  { value: "clarify", label: "Make it clearer", description: "Simplify dense or confusing writing." },
  { value: "tone", label: "Change tone", description: "Adapt voice for a specific audience." },
  { value: "summarize", label: "Summarize baseline", description: "Extract themes and useful material from uploads." },
  { value: "outline", label: "Generate outline", description: "Turn the source into a structured plan." },
  { value: "continue", label: "Continue writing", description: "Draft the next section in the same direction." },
  { value: "title", label: "Create titles", description: "Generate strong title options." },
  { value: "custom", label: "Custom prompt", description: "Ask for a specific writing outcome." },
];

const toneOptions: Array<{ value: Tone; label: string }> = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "academic", label: "Academic" },
  { value: "concise", label: "Concise" },
  { value: "persuasive", label: "Persuasive" },
  { value: "warm", label: "Warm" },
  { value: "bold", label: "Bold" },
];

const lengthOptions: Array<{ value: LengthPreference; label: string }> = [
  { value: "shorter", label: "Shorter" },
  { value: "same", label: "Same length" },
  { value: "longer", label: "Longer" },
];

const AssistantPanel = ({
  selectedText,
  documentText,
  baselines,
  onCreateProposal,
}: AssistantPanelProps) => {
  const [intent, setIntent] = React.useState<Intent>("rewrite");
  const [tone, setTone] = React.useState<Tone>("professional");
  const [length, setLength] = React.useState<LengthPreference>("same");
  const [customPrompt, setCustomPrompt] = React.useState("");
  const [useBaseline, setUseBaseline] = React.useState(false);

  React.useEffect(() => {
    setUseBaseline(baselines.length > 0);
  }, [baselines.length]);

  const baselineText = baselines
    .map((document) => `### ${document.name}\n${document.text}`)
    .join("\n\n");

  const selectedWordCount = selectedText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const canGenerate = intent !== "custom" || customPrompt.trim().length > 0;

  const handleGenerate = () => {
    onCreateProposal({
      intent,
      tone,
      length,
      customPrompt: customPrompt.trim(),
      selectedText,
      documentText,
      baselineText,
      useBaseline: useBaseline && baselines.length > 0,
    });
  };

  const activeIntent = intentOptions.find((option) => option.value === intent);

  return (
    <Card className="overflow-hidden border-emerald-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <WandSparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Prompt-first assistant</CardTitle>
              <CardDescription>
                Choose the outcome, review a proposal, then approve where it goes.
              </CardDescription>
            </div>
          </div>
          <Badge className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Local
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900 dark:text-white">
            What do you want to do?
          </label>
          <Select value={intent} onValueChange={(value) => setIntent(value as Intent)}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {activeIntent?.description}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900 dark:text-white">
              Tone
            </label>
            <Select value={tone} onValueChange={(value) => setTone(value as Tone)}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900 dark:text-white">
              Length
            </label>
            <Select value={length} onValueChange={(value) => setLength(value as LengthPreference)}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lengthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Use previous work as context
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {baselines.length
                ? `${baselines.length} uploaded baseline ${baselines.length === 1 ? "document" : "documents"}`
                : "Upload a document to enable this"}
            </p>
          </div>
          <Switch
            checked={useBaseline && baselines.length > 0}
            disabled={!baselines.length}
            onCheckedChange={setUseBaseline}
          />
        </div>

        {intent === "custom" && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900 dark:text-white">
              Custom instruction
            </label>
            <Textarea
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              placeholder="Example: turn this into a sharper LinkedIn post with a stronger opening."
              className="min-h-28 rounded-2xl"
            />
          </div>
        )}

        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Current source
            </p>
            {selectedText ? (
              <Badge variant="secondary">{selectedWordCount} selected words</Badge>
            ) : (
              <Badge variant="outline">Document context</Badge>
            )}
          </div>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            {selectedText
              ? excerpt(selectedText)
              : excerpt(documentText) || "Start typing to give the assistant more context."}
          </p>
        </div>

        {useBaseline && !baselines.length && (
          <Alert className="rounded-2xl">
            <AlertDescription>
              Upload previous work before enabling baseline context.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <Button
          type="button"
          className="w-full rounded-2xl bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700"
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          Generate proposal for review
        </Button>

        <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          The assistant never applies changes directly. You review first.
        </p>
      </CardContent>
    </Card>
  );
};

export default AssistantPanel;